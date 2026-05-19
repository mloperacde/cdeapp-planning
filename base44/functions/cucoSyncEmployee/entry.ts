import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Sync de un empleado específico desde Cuco360
 * Uso: { employee_code: "275", date: "2026-05-19" }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceClient = base44.asServiceRole;

    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { employee_code, date } = body;

    if (!employee_code) {
      return Response.json({ error: 'employee_code is required' }, { status: 400 });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const apiKey = Deno.env.get("CUCO360_API_KEY");
    const CLIENT_CODE = Deno.env.get("CUCO_CLIENT_CODE") || "380";
    const authHeader = apiKey.replace("Bearer ", "").trim();

    // Obtener marcajes del día
    const startEnc = encodeURIComponent(`${targetDate} 00:00:00`);
    const endEnc = encodeURIComponent(`${targetDate} 23:59:59`);
    const url = `https://cuco360.cucorent.com/api/apiv2/checking/getfullchecks/${CLIENT_CODE}?start_date=${startEnc}&end_date=${endEnc}`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json",
        "APIkey": authHeader,
        "X-CSRF-TOKEN": ""
      }
    });

    const json = await response.json();
    const checks = json.checks || json.data || json;

    if (!Array.isArray(checks)) {
      return Response.json({ error: "No array returned from Cuco360", raw: json });
    }

    const searchCode = String(employee_code).trim();

    // Filtrar solo los marcajes del empleado
    const employeeChecks = checks.filter(c => {
      return String(c.cod_int_empleado || '').trim() === searchCode ||
             String(c.cod_interno || '').trim() === searchCode;
    });

    if (employeeChecks.length === 0) {
      return Response.json({
        success: false,
        message: `No se encontraron marcajes para el empleado ${searchCode} el ${targetDate}`,
        total_checks_fetched: checks.length
      });
    }

    // Buscar empleado en la base maestra
    const masterEmps = await serviceClient.entities.EmployeeMasterDatabase.filter(
      { codigo_empleado: searchCode }, "id", 2
    ).catch(() => []);
    const masterEmp = masterEmps[0] || null;

    // Borrar registros existentes de este empleado para este día
    const existingRecords = await serviceClient.entities.AttendanceRecord.filter(
      { record_date: targetDate, employee_id: searchCode }, "id", 200
    ).catch(() => []);

    for (const r of existingRecords) {
      await serviceClient.entities.AttendanceRecord.delete(r.id).catch(() => {});
    }

    // Crear nuevos registros
    const todayBatch = `cuco_v2_sync_${targetDate}`;
    const recordsToCreate = employeeChecks.map(check => {
      const fullDate = check.fec_marcaje || check.fecha;
      if (!fullDate) return null;
      const dateParts = fullDate.split(' ');
      const dateStr = dateParts[0];
      const timeStr = (dateParts[1] || '00:00').slice(0, 5);
      const type = String(check.val_direccion || "").toUpperCase();
      const direction = (type === "S" || type === "SALIDA" || type === "OUT" || type === "2") ? "S" : "E";

      return {
        employee_id: searchCode,
        employee_name: masterEmp?.nombre || `Empleado ${searchCode}`,
        department: masterEmp?.departamento || "Producción",
        record_date: dateStr,
        record_time: timeStr,
        direction,
        device: check.nom_dispositivo || "API CUCO360",
        import_batch: todayBatch
      };
    }).filter(r => r !== null);

    if (recordsToCreate.length > 0) {
      await serviceClient.entities.AttendanceRecord.bulkCreate(recordsToCreate);
    }

    return Response.json({
      success: true,
      employee: masterEmp?.nombre || searchCode,
      date: targetDate,
      deleted: existingRecords.length,
      inserted: recordsToCreate.length,
      records: recordsToCreate
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});