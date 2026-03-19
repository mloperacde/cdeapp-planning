import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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

    // Saltar fines de semana y festivos (si no es forzado)
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
    const start = encodeURIComponent(`${from} 00:00:00`);
    const end = encodeURIComponent(`${to} 23:59:59`);
    const url = `https://cuco360.cucorent.com/api/apiv2/checking/getfullchecks/${CLIENT_CODE}?start_date=${start}&end_date=${end}`;

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
    const masterEmployees = await serviceClient.entities.EmployeeMasterDatabase.list(undefined, 2000);

    // Mapa por codigo_empleado para cruce rápido
    const masterMapByCodigo = {};
    for (const emp of masterEmployees) {
      if (emp.codigo_empleado) {
        masterMapByCodigo[String(emp.codigo_empleado).trim()] = emp;
      }
    }

    // ── 3. Procesar registros de marcaje ────────────────────────────────────
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
        import_batch: `cuco_v2_sync_${new Date().toISOString().split('T')[0]}`
      };
    }).filter(r => r !== null);

    // ── 4. Limpiar registros previos del día (si es sincronización de un solo día) ─
    if (from === to) {
      let existing = await serviceClient.entities.AttendanceRecord.filter({ record_date: from }, "id", 1000);
      while (existing && existing.length > 0) {
        for (let i = 0; i < existing.length; i += 20) {
          const batch = existing.slice(i, i + 20);
          await Promise.all(batch.map(r => serviceClient.entities.AttendanceRecord.delete(r.id).catch(() => {})));
          await new Promise(r => setTimeout(r, 50));
        }
        existing = await serviceClient.entities.AttendanceRecord.filter({ record_date: from }, "id", 1000);
      }
    }

    // ── 5. Insertar nuevos registros ────────────────────────────────────────
    for (let i = 0; i < recordsToCreate.length; i += 20) {
      await serviceClient.entities.AttendanceRecord.bulkCreate(recordsToCreate.slice(i, i + 20)).catch(e => {
        console.error("Bulk create error chunk", i, e);
      });
      await new Promise(r => setTimeout(r, 200));
    }

    // ── 6. Análisis de presencia vs. ausencia ───────────────────────────────
    // Solo aplica cuando sincronizamos un solo día
    if (from === to) {
      const syncDate = from;

      // Empleados sujetos a control horario (Alta + sujeto_a_control_horario !== false)
      const controlledEmployees = masterEmployees.filter(emp =>
        emp.estado_empleado === "Alta" &&
        emp.sujeto_a_control_horario !== false
      );

      // Conjunto de códigos que ficharon hoy
      const ficharonHoy = new Set(recordsToCreate.map(r => r.employee_id));

      const ausentes = [];    // Esperados pero sin fichaje
      const reactivados = []; // Marcados como Ausente pero ficharon

      for (const emp of controlledEmployees) {
        const code = String(emp.codigo_empleado || "").trim();
        if (!code) continue;

        const hasFichado = ficharonHoy.has(code);

        if (!hasFichado && emp.disponibilidad !== "Ausente") {
          // Estaba disponible pero NO fichó → marcar como Ausente
          ausentes.push(emp);
        } else if (hasFichado && emp.disponibilidad === "Ausente") {
          // Estaba marcado como Ausente pero fichó → reactivar
          reactivados.push(emp);
        }
      }

      // Actualizar disponibilidad de ausentes
      for (const emp of ausentes) {
        await serviceClient.entities.EmployeeMasterDatabase.update(emp.id, {
          disponibilidad: "Ausente",
          ausencia_inicio: `${syncDate}T00:00:00`,
          ausencia_motivo: "Ausencia detectada automáticamente por sistema (sin fichaje)"
        }).catch(e => console.warn(`Error marcando ausente ${emp.nombre}:`, e));
      }

      // Reactivar empleados que ficharon estando marcados como ausentes
      for (const emp of reactivados) {
        await serviceClient.entities.EmployeeMasterDatabase.update(emp.id, {
          disponibilidad: "Disponible",
          ausencia_fin: new Date().toISOString(),
          ausencia_motivo: null
        }).catch(e => console.warn(`Error reactivando ${emp.nombre}:`, e));
      }

      console.log(`[cucoSyncV2] Análisis: ${ausentes.length} ausentes detectados, ${reactivados.length} reactivados`);

      return Response.json({
        success: true,
        message: `Sync OK: ${recordsToCreate.length} fichajes importados`,
        count: recordsToCreate.length,
        analysis: {
          employees_controlled: controlledEmployees.length,
          ficharon: ficharonHoy.size,
          ausentes_detectados: ausentes.length,
          ausentes_nombres: ausentes.map(e => e.nombre),
          reactivados: reactivados.length,
          reactivados_nombres: reactivados.map(e => e.nombre)
        }
      });
    }

    return Response.json({
      success: true,
      message: `Synced ${recordsToCreate.length} records from CUCO360`,
      count: recordsToCreate.length
    });

  } catch (err) {
    console.error("[cucoSyncV2] Error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});