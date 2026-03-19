import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const CUCO_BASE_URL = "https://cuco360.cucorent.com/api/ExtApi";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const API_KEY = Deno.env.get("CUCO360_API_KEY");
  const CLIENT_CODE = Deno.env.get("CUCO_CLIENT_CODE") || "380";

  // 1. Empleados activos en nuestra BD maestra (sujetos a control horario)
  const ourEmployees = await base44.asServiceRole.entities.EmployeeMasterDatabase.filter({
    estado_empleado: "Alta"
  });
  const ourActive = ourEmployees.filter(e => e.sujeto_a_control_horario !== false);
  const ourCodes = ourActive.map(e => String(e.codigo_empleado)).filter(Boolean);

  // 2. Obtener empleados de Cuco360
  const cucoRes = await fetch(`${CUCO_BASE_URL}/employees/list/${CLIENT_CODE}`, {
    headers: { "APIkey": API_KEY, "Accept": "application/json" }
  });

  if (!cucoRes.ok) {
    const err = await cucoRes.text();
    return Response.json({ error: `Error Cuco360: ${cucoRes.status} - ${err}` }, { status: 500 });
  }

  const cucoData = await cucoRes.json();
  // La API devuelve { response, empleados: [...] }
  const cucoList = cucoData.empleados || [];

  // cod_int_empleado es el código interno que coincide con nuestro codigo_empleado
  const cucoCodes = cucoList.map(e => String(e.cod_int_empleado || "").trim()).filter(Boolean);

  // 3. Comparar
  const onlyInOurs = ourCodes.filter(c => !cucoCodes.includes(c));
  const onlyInCuco = cucoCodes.filter(c => !ourCodes.includes(c));
  const inBoth = ourCodes.filter(c => cucoCodes.includes(c));

  const consistent = onlyInOurs.length === 0 && onlyInCuco.length === 0;

  // Enriquecer con nombres
  const onlyInOursDetail = onlyInOurs.map(code => {
    const emp = ourActive.find(e => String(e.codigo_empleado) === code);
    return { id: emp?.id, codigo: code, nombre: emp?.nombre || "Desconocido" };
  });

  const onlyInCucoDetail = onlyInCuco.map(code => {
    const emp = cucoList.find(e => String(e.cod_int_empleado).trim() === code);
    return {
      codigo: code,
      cod_empleado_cuco: emp?.cod_empleado,
      nombre: emp ? `${emp.nom_empleado || ''} ${emp.ape_empleado || ''}`.trim() : "Desconocido"
    };
  });

  return Response.json({
    consistent,
    summary: {
      total_our_active: ourActive.length,
      total_cuco_active: cucoList.length,
      in_both: inBoth.length,
      only_in_ours: onlyInOurs.length,
      only_in_cuco: onlyInCuco.length,
    },
    discrepancies: {
      only_in_ours: onlyInOursDetail,
      only_in_cuco: onlyInCucoDetail,
    },
    checked_at: new Date().toISOString()
  });
});