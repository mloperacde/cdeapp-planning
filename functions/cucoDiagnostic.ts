import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const CUCO_BASE_URL = "https://cuco360.cucorent.com/api/ExtApi";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const API_KEY = Deno.env.get("CUCO360_API_KEY");
  const CLIENT_CODE = Deno.env.get("CUCO_CLIENT_CODE") || "380";

  const cucoRes = await fetch(`${CUCO_BASE_URL}/employees/list/${CLIENT_CODE}`, {
    headers: { "APIkey": API_KEY, "Accept": "application/json" }
  });

  const rawText = await cucoRes.text();
  
  // Parsear si es posible
  let parsed = null;
  let parseError = null;
  try { parsed = JSON.parse(rawText); } catch(e) { parseError = e.message; }

  const firstRecord = Array.isArray(parsed) ? parsed[0] : (parsed?.data?.[0] || parsed?.employees?.[0] || parsed?.list?.[0] || null);

  return Response.json({
    http_status: cucoRes.status,
    raw_first_500_chars: rawText.substring(0, 500),
    parse_error: parseError,
    is_array: Array.isArray(parsed),
    top_level_keys: parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? Object.keys(parsed) : null,
    array_length: Array.isArray(parsed) ? parsed.length : null,
    first_record_keys: firstRecord ? Object.keys(firstRecord) : null,
    first_record: firstRecord,
  });
});