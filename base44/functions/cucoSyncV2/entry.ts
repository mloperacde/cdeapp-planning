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
      const holidays = await serviceClient.entities.Holiday.filter({ date: from }, "id,name", 1);
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

      const masterEmp = masterMapByCodigo[externalId];
      const dateParts = fullDate.split(' ');
      const dateStr = dateParts[0];
      const timeStr = (dateParts[1] || "00:00:00").slice(0, 5);

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

      const controlledEmployees = masterEmployees.filter(emp =>
        emp.estado_empleado === "Alta" &&
        emp.sujeto_a_control_horario !== false
      );

      const ficharonHoy = new Set(recordsToCreate.map(r => r.employee_id));
      const ausentes = [];
      const reactivados = [];

      for (const emp of controlledEmployees) {
        const code = String(emp.codigo_empleado || "").trim();
        if (!code) continue;
        const hasFichado = ficharonHoy.has(code);
        if (!hasFichado && emp.disponibilidad !== "Ausente") ausentes.push(emp);
        else if (hasFichado && emp.disponibilidad === "Ausente") reactivados.push(emp);
      }

      for (const emp of ausentes) {
        await retryOp(() => serviceClient.entities.EmployeeMasterDatabase.update(emp.id, {
          disponibilidad: "Ausente",
          ausencia_inicio: `${syncDate}T00:00:00`,
          ausencia_motivo: "Ausencia detectada automáticamente por sistema (sin fichaje)"
        })).catch(e => console.warn(`Error marcando ausente ${emp.nombre}:`, e));
      }

      for (const emp of reactivados) {
        await retryOp(() => serviceClient.entities.EmployeeMasterDatabase.update(emp.id, {
          disponibilidad: "Disponible",
          ausencia_fin: new Date().toISOString(),
          ausencia_motivo: null
        })).catch(e => console.warn(`Error reactivando ${emp.nombre}:`, e));
      }

      console.log(`[cucoSyncV2] Análisis: ${ausentes.length} ausentes, ${reactivados.length} reactivados`);

      return Response.json({
        success: true,
        message: `Sync OK: ${inserted} fichajes importados`,
        count: inserted,
        analysis: {
          employees_controlled: controlledEmployees.length,
          ficharon: ficharonHoy.size,
          ausentes_detectados: ausentes.length,
          reactivados: reactivados.length,
        }
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