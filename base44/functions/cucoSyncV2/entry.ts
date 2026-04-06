import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function retryOp(fn, retries = 4, baseDelay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      const isRate = e?.message?.includes('Rate limit') || e?.message?.includes('429');
      if (isRate && i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`[cucoSyncV2] Rate limit, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      throw e;
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceClient = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const { date, start_date, end_date, force, debug_mode } = body;

    if (debug_mode) {
      return Response.json({
        success: true,
        message: "Function cucoSyncV2 is deployed and reachable.",
        has_key: !!Deno.env.get("CUCO360_API_KEY")
      });
    }

    const apiKey = Deno.env.get("CUCO360_API_KEY");
    if (!apiKey) throw new Error("Secret 'CUCO360_API_KEY' is not configured.");

    const CLIENT_CODE = Deno.env.get("CUCO_CLIENT_CODE") || "380";
    const authHeader = apiKey.replace("Bearer ", "").trim();

    let from = start_date;
    let to = end_date;
    if (date) { from = date; to = date; }
    if (!from || !to) {
      const today = new Date().toISOString().split('T')[0];
      from = today; to = today;
    }

    // Saltar fines de semana solo cuando es un único día y no forzado
    if (!force && from === to) {
      const targetDate = new Date(from + 'T12:00:00Z');
      const dayOfWeek = targetDate.getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return Response.json({ success: true, message: "Skipped: Weekend", count: 0 });
      }
      const holidays = await serviceClient.entities.Holiday.filter({ date: from }, "id", 1);
      if (holidays && holidays.length > 0) {
        return Response.json({ success: true, message: `Skipped: Holiday (${holidays[0].name})`, count: 0 });
      }
    }

    console.log(`[cucoSyncV2] Syncing ${CLIENT_CODE} from ${from} to ${to}`);

    // ── 1. Obtener marcajes de Cuco360 ──────────────────────────────────────
    const startEnc = encodeURIComponent(`${from} 00:00:00`);
    const endEnc = encodeURIComponent(`${to} 23:59:59`);
    const url = `https://cuco360.cucorent.com/api/apiv2/checking/getfullchecks/${CLIENT_CODE}?start_date=${startEnc}&end_date=${endEnc}`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json",
        "APIkey": authHeader,
        "X-CSRF-TOKEN": ""
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`CUCO360 API Error (${response.status}): ${text}`);
    }

    const json = await response.json();
    if (json.success === false) {
      throw new Error(`CUCO360 error: ${json.message || JSON.stringify(json)}`);
    }

    const checks = json.checks || json.data || json;
    if (!Array.isArray(checks)) {
      return Response.json({ success: true, message: "No data from CUCO360 (empty checks)", count: 0 });
    }

    // ── 2. Cargar base maestra de empleados ─────────────────────────────────
    const masterEmployees = await retryOp(() =>
      serviceClient.entities.EmployeeMasterDatabase.list(undefined, 2000)
    );

    const masterMapByCodigo = {};
    for (const emp of masterEmployees) {
      if (emp.codigo_empleado) {
        masterMapByCodigo[String(emp.codigo_empleado).trim()] = emp;
      }
    }

    // ── 3. Procesar registros de marcaje ────────────────────────────────────
    const todayBatch = `cuco_v2_sync_${new Date().toISOString().split('T')[0]}`;

    const recordsToCreate = checks.map((check) => {
      const externalId = String(check.cod_int_empleado || check.cod_interno || check.cod_empleado || "").trim();
      const fullDate = check.fec_marcaje || check.fecha;
      if (!externalId || !fullDate) return null;

      // Filtrar marcajes sintéticos/automáticos de Cuco360 (cod_marcaje negativo = no son fichajes físicos reales)
      if (check.cod_marcaje !== undefined && Number(check.cod_marcaje) < 0) return null;

      // Cuco360 ya envía la hora en tiempo local (Europe/Madrid)
      const dateParts = fullDate.split(' ');
      const dateStr = dateParts[0];
      const timeStr = (dateParts[1] || '00:00').slice(0, 5);

      const masterEmp = masterMapByCodigo[externalId];

      const type = String(check.val_direccion || "").toUpperCase();
      const direction = (type === "S" || type === "SALIDA" || type === "OUT" || type === "2") ? "S" : "E";

      return {
        employee_id: externalId,
        employee_name: masterEmp?.nombre || check.nombre || `Empleado ${externalId}`,
        department: masterEmp?.departamento || "Producción",
        record_date: dateStr,
        record_time: timeStr,
        direction,
        device: check.nom_dispositivo || "API CUCO360",
        import_batch: todayBatch
      };
    }).filter(r => r !== null);

    console.log(`[cucoSyncV2] ${recordsToCreate.length} registros obtenidos de Cuco360`);

    // ── 4. Limpiar registros previos por cada día (para evitar duplicados) ─
    const uniqueDates = [...new Set(recordsToCreate.map(r => r.record_date))];
    console.log(`[cucoSyncV2] Limpiando ${uniqueDates.length} días...`);

    for (const d of uniqueDates) {
      let page = await retryOp(() =>
        serviceClient.entities.AttendanceRecord.filter({ record_date: d }, "id", 500)
      );
      let totalDeleted = 0;
      while (page && page.length > 0) {
        for (let i = 0; i < page.length; i += 10) {
          const batch = page.slice(i, i + 10);
          await Promise.allSettled(
            batch.map(r => retryOp(() => serviceClient.entities.AttendanceRecord.delete(r.id), 3, 1500))
          );
          totalDeleted += batch.length;
          await sleep(800);
        }
        page = await retryOp(() =>
          serviceClient.entities.AttendanceRecord.filter({ record_date: d }, "id", 500)
        );
      }
      console.log(`[cucoSyncV2] Día ${d}: ${totalDeleted} registros eliminados`);
      await sleep(500);
    }

    // Pausa antes de insertar
    if (uniqueDates.length > 0) await sleep(2000);

    // ── 5. Insertar nuevos registros en chunks ────────────────────────────
    const BULK = 30;
    let inserted = 0;
    for (let i = 0; i < recordsToCreate.length; i += BULK) {
      const chunk = recordsToCreate.slice(i, i + BULK);
      await retryOp(() => serviceClient.entities.AttendanceRecord.bulkCreate(chunk));
      inserted += chunk.length;
      console.log(`[cucoSyncV2] Insertados ${inserted}/${recordsToCreate.length}`);
      await sleep(800);
    }

    // ── 6. Análisis de presencia (solo para sincronización de un único día) ─
    if (from === to) {
      const syncDate = from;
      const systemNow = new Date().toISOString();

      // Cargar ausencias activas (no rechazadas/canceladas) para cruzar con empleados
      const allAbsences = await retryOp(() =>
        serviceClient.entities.Absence.list("-fecha_inicio", 2000)
      );

      // Filtrar ausencias que cubran el día de sincronización
      const syncDateObj = new Date(syncDate + "T12:00:00Z");
      const activeAbsencesToday = allAbsences.filter(abs => {
        if (abs.estado_aprobacion === "Rechazada" || abs.estado_aprobacion === "Cancelada") return false;
        const start = new Date(abs.fecha_inicio);
        const end = abs.fecha_fin_desconocida ? new Date("2099-12-31") : new Date(abs.fecha_fin);
        return start <= syncDateObj && syncDateObj <= end;
      });

      // Mapa: employee_id → absence
      const absenceByEmployee = {};
      for (const abs of activeAbsencesToday) {
        if (!absenceByEmployee[abs.employee_id]) {
          absenceByEmployee[abs.employee_id] = abs;
        }
      }

      const controlledEmployees = masterEmployees.filter(emp =>
        emp.estado_empleado === "Alta" &&
        emp.sujeto_a_control_horario !== false
      );

      const ficharonHoy = new Set(recordsToCreate.map(r => r.employee_id));
      const reactivados = [];   // Ficharon pero estaban como Ausente → presencia PREVALECE
      const confirmados = [];   // No ficharon pero ya tienen ausencia configurada → confirmar sin cambiar
      const nuevasAusencias = []; // No ficharon y no tenían ausencia → ausencia automática

      for (const emp of controlledEmployees) {
        const code = String(emp.codigo_empleado || "").trim();
        if (!code) continue;
        const hasFichado = ficharonHoy.has(code);
        const absenceRecord = absenceByEmployee[emp.id];

        if (hasFichado && emp.disponibilidad === "Ausente") {
          // PRESENCIA PREVALECE: cerrar ausencia y marcar disponible
          reactivados.push({ emp, absence: absenceRecord });
        } else if (!hasFichado) {
          if (absenceRecord) {
            // Ausencia pre-configurada confirmada por ausencia de fichaje
            confirmados.push({ emp, absence: absenceRecord });
          } else if (emp.disponibilidad !== "Ausente") {
            // Sin fichaje y sin ausencia configurada → detección automática
            nuevasAusencias.push(emp);
          }
        }
      }

      // ── Reactivar: presencia física prevalece sobre cualquier ausencia ──
      for (const { emp, absence } of reactivados) {
        await retryOp(() => serviceClient.entities.EmployeeMasterDatabase.update(emp.id, {
          disponibilidad: "Disponible",
          ausencia_fin: systemNow,
          ausencia_motivo: null
        })).catch(e => console.warn(`[cucoSyncV2] Error reactivando ${emp.nombre}:`, e));

        if (absence) {
          await retryOp(() => serviceClient.entities.Absence.update(absence.id, {
            fecha_fin: systemNow,
            fecha_fin_desconocida: false,
            estado_aprobacion: "Cancelada",
            comentario_aprobacion: `[SISTEMA] Cerrada automáticamente el ${syncDate}: fichaje de entrada detectado en Cuco360. La presencia física prevalece sobre la ausencia registrada.`
          })).catch(e => console.warn(`[cucoSyncV2] Error cerrando ausencia de ${emp.nombre}:`, e));
        }
        console.log(`[cucoSyncV2] ✅ REACTIVADO (presencia detectada): ${emp.nombre}`);
      }

      // ── Confirmar ausencias pre-configuradas: sincronizar estado sin alterar el registro ──
      for (const { emp, absence } of confirmados) {
        if (emp.disponibilidad !== "Ausente") {
          await retryOp(() => serviceClient.entities.EmployeeMasterDatabase.update(emp.id, {
            disponibilidad: "Ausente",
            ausencia_inicio: absence.fecha_inicio,
            ausencia_fin: absence.fecha_fin_desconocida ? null : absence.fecha_fin,
            ausencia_motivo: `${absence.tipo || absence.motivo} (ausencia configurada)`
          })).catch(e => console.warn(`[cucoSyncV2] Error confirmando ${emp.nombre}:`, e));
        }
        console.log(`[cucoSyncV2] 🔵 CONFIRMADA (ausencia preexistente): ${emp.nombre} - ${absence.tipo || absence.motivo}`);
      }

      // ── Nuevas ausencias automáticas: sin fichaje y sin ausencia configurada ──
      for (const emp of nuevasAusencias) {
        await retryOp(() => serviceClient.entities.EmployeeMasterDatabase.update(emp.id, {
          disponibilidad: "Ausente",
          ausencia_inicio: `${syncDate}T00:00:00`,
          ausencia_motivo: "Ausencia no comunicada - detección automática por sistema"
        })).catch(e => console.warn(`[cucoSyncV2] Error marcando ausente ${emp.nombre}:`, e));

        // Crear registro de Absence automático para trazabilidad
        await retryOp(() => serviceClient.entities.Absence.create({
          employee_id: emp.id,
          fecha_inicio: `${syncDate}T00:00:00`,
          fecha_fin: `${syncDate}T23:59:59`,
          fecha_fin_desconocida: false,
          motivo: "Ausencia no comunicada - detección automática",
          tipo: "Ausencia No Justificada",
          estado_aprobacion: "Pendiente",
          remunerada: false,
          notas: `[SISTEMA] Generada automáticamente por cucoSyncV2 el ${systemNow}. Sin fichaje detectado en Cuco360 para el día ${syncDate}.`
        })).catch(e => console.warn(`[cucoSyncV2] Error creando ausencia auto ${emp.nombre}:`, e));

        console.log(`[cucoSyncV2] 🔴 NUEVA AUSENCIA AUTO: ${emp.nombre}`);
      }

      const summary = {
        employees_controlled: controlledEmployees.length,
        ficharon: ficharonHoy.size,
        reactivados: reactivados.length,
        ausencias_confirmadas: confirmados.length,
        nuevas_ausencias_auto: nuevasAusencias.length,
      };
      console.log(`[cucoSyncV2] Resumen: ${JSON.stringify(summary)}`);

      return Response.json({
        success: true,
        message: `Sync OK: ${inserted} fichajes. Reactivados: ${reactivados.length}, Confirmadas: ${confirmados.length}, Nuevas auto: ${nuevasAusencias.length}`,
        count: inserted,
        analysis: summary
      });
    }

    return Response.json({
      success: true,
      message: `Synced ${inserted} records from CUCO360 (${uniqueDates.length} días)`,
      count: inserted,
      days: uniqueDates.length
    });

  } catch (err) {
    console.error("[cucoSyncV2] Error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});