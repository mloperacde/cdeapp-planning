import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const apiKey = Deno.env.get("CUCO360_API_KEY");
    const CLIENT_CODE = Deno.env.get("CUCO_CLIENT_CODE") || "380";
    const authHeader = apiKey.replace("Bearer ", "").trim();

    const body = await req.json().catch(() => ({}));
    const { date, employee_code } = body;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const searchCode = String(employee_code || '275').trim();

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
      return Response.json({ error: "No array returned", raw: json });
    }

    // Buscar por cualquier campo de código
    const related = checks.filter(c => {
      return String(c.cod_int_empleado || '').trim() === searchCode ||
             String(c.cod_interno || '').trim() === searchCode ||
             String(c.cod_empleado || '').trim() === searchCode ||
             String(c.employee_code || '').trim() === searchCode ||
             String(c.id_empleado || '').trim() === searchCode;
    });

    // Buscar también por nombre parcial "ELENA" o "HITA"
    const byName = checks.filter(c => {
      const name = String(c.nombre || c.name || c.employee_name || '').toUpperCase();
      return name.includes('ELENA') || name.includes('HITA');
    });

    // Mostrar estructura de los primeros 3 registros
    const sample = checks.slice(0, 3);
    const allKeys = checks.length > 0 ? Object.keys(checks[0]) : [];

    return Response.json({
      total_checks: checks.length,
      fields_available: allKeys,
      search_code: searchCode,
      records_by_code: related,
      records_by_name_elena: byName,
      sample_records: sample,
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});