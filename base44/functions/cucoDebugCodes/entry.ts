import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const CUCO_BASE_URL = "https://cuco360.cucorent.com/api/ExtApi";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const API_KEY = Deno.env.get("CUCO360_API_KEY");
  const CLIENT_CODE = Deno.env.get("CUCO_CLIENT_CODE") || "380";

  // Códigos que aparecen como "solo en BD maestra"
  const body = await req.json().catch(() => ({}));
  const codesToFind = body.codes || ["200", "630", "629", "619", "617", "343", "27"];

  const cucoRes = await fetch(`${CUCO_BASE_URL}/employees/list/${CLIENT_CODE}`, {
    headers: { "APIkey": API_KEY, "Accept": "application/json" }
  });

  const cucoData = await cucoRes.json();
  const cucoList = cucoData.empleados || [];

  // Analizar cada código problemático
  const analysis = codesToFind.map(code => {
    const codeStr = String(code).trim();
    
    // Buscar por cod_int_empleado exacto
    const exactMatch = cucoList.find(e => String(e.cod_int_empleado || "").trim() === codeStr);
    
    // Buscar por cod_int_empleado sin trim (ver si hay espacios)
    const rawMatch = cucoList.find(e => String(e.cod_int_empleado || "") === codeStr);
    
    // Buscar variantes numéricas
    const numMatch = cucoList.find(e => Number(e.cod_int_empleado) === Number(codeStr));
    
    // Buscar por cod_empleado (el ID interno de Cuco)
    const cucoIdMatch = cucoList.find(e => String(e.cod_empleado) === codeStr);

    return {
      code,
      exactMatch: exactMatch ? { cod_int: exactMatch.cod_int_empleado, cod_cuco: exactMatch.cod_empleado, nombre: `${exactMatch.nom_empleado} ${exactMatch.ape_empleado}`.trim() } : null,
      rawMatch: rawMatch ? { cod_int: rawMatch.cod_int_empleado, cod_cuco: rawMatch.cod_empleado } : null,
      numMatch: numMatch ? { cod_int: numMatch.cod_int_empleado, cod_cuco: numMatch.cod_empleado, nombre: `${numMatch.nom_empleado} ${numMatch.ape_empleado}`.trim() } : null,
      cucoIdMatch: cucoIdMatch ? { cod_int: cucoIdMatch.cod_int_empleado, cod_cuco: cucoIdMatch.cod_empleado, nombre: `${cucoIdMatch.nom_empleado} ${cucoIdMatch.ape_empleado}`.trim() } : null,
      found: !!exactMatch,
    };
  });

  // También mostrar muestra de cod_int_empleado raw para ver formatos
  const sampleRaw = cucoList.slice(0, 20).map(e => ({
    cod_int_raw: e.cod_int_empleado,
    cod_int_type: typeof e.cod_int_empleado,
    cod_int_trimmed: String(e.cod_int_empleado || "").trim(),
    cod_empleado: e.cod_empleado,
    nombre: `${e.nom_empleado} ${e.ape_empleado}`.trim()
  }));

  // Códigos únicos en Cuco con formato raw
  const allCucoCodInt = cucoList.map(e => ({ raw: e.cod_int_empleado, trimmed: String(e.cod_int_empleado || "").trim() }));
  const hasDifferences = allCucoCodInt.some(c => c.raw !== c.trimmed || typeof c.raw !== 'string');

  return Response.json({
    codes_analyzed: analysis,
    cuco_total: cucoList.length,
    cod_int_has_whitespace_issues: hasDifferences,
    sample_raw_cuco: sampleRaw,
  });
});