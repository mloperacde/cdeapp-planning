import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const apiKey = Deno.env.get("CUCO360_API_KEY");
    const CLIENT_CODE = Deno.env.get("CUCO_CLIENT_CODE") || "380";
    const authHeader = apiKey.replace("Bearer ", "").trim();

    const body = await req.json().catch(() => ({}));
    const { date } = body;
    const targetDate = date || new Date().toISOString().split('T')[0];

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

    // Buscar todos los registros que tienen cod_int_empleado, cod_interno o cod_empleado = "687"
    const related = checks.filter(c => {
      return String(c.cod_int_empleado || '').trim() === '687' ||
             String(c.cod_interno || '').trim() === '687' ||
             String(c.cod_empleado || '').trim() === '687';
    });

    // También mostrar los primeros 3 registros para ver la estructura de campos
    const sample = checks.slice(0, 3);

    // Mostrar todos los campos únicos disponibles
    const allKeys = checks.length > 0 ? Object.keys(checks[0]) : [];

    return Response.json({
      total_checks: checks.length,
      fields_available: allKeys,
      records_for_687: related,
      sample_records: sample,
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});