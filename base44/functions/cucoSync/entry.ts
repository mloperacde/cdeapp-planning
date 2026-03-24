// @ts-ignore
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

Deno.serve(async (req) => {
  try {
    const client = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    
    // Minimal "Hello World" to verify deployment
    if (body.debug_mode) {
       return new Response(JSON.stringify({ 
          success: true, 
          message: "Function cucoSync is deployed and reachable (Minimal Version).",
          has_key: !!Deno.env.get("CUCO360_API_KEY")
        }), { headers: { "Content-Type": "application/json" } });
    }

    // 1. Validate Configuration & API Key
    const apiKeyEnv = Deno.env.get("CUCO360_API_KEY") || "k9fKmKcVCRc44Rf7dpkxhnfU9z9t0XsgrYgkGQSr9unWFZPOKsySznPHb7bUJzBc";
    if (!apiKeyEnv) {
      throw new Error("Secret 'CUCO360_API_KEY' is not configured.");
    }

    // 2. Constants & Params
    const CLIENT_CODE = "380";
    const DEFAULT_API_URL = "https://api.cuco360.com/api/ExtApi";
    const baseUrl = Deno.env.get("CUCO_API_URL") || DEFAULT_API_URL;
    
    const { date, start_date, end_date, force } = body;
    let from = start_date;
    let to = end_date;
    
    if (date) { from = date; to = date; }
    if (!from || !to) {
       const today = new Date().toISOString().split('T')[0];
       from = today; to = today;
    }

    // 3. Automation Logic (Skip weekends/holidays)
    if (!force && from === to) {
      const targetDate = new Date(from);
      const dayOfWeek = targetDate.getDay(); 
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return new Response(JSON.stringify({ success: true, message: "Skipped: Weekend", count: 0 }), { headers: { "Content-Type": "application/json" } });
      }
      // Check Holiday using Base44 SDK entities
      const holidays = await client.entities.Holiday.filter({ fecha: from }, "id,nombre", 1);
      if (holidays && holidays.length > 0) {
        return new Response(JSON.stringify({ success: true, message: `Skipped: Holiday (${holidays[0].nombre})`, count: 0 }), { headers: { "Content-Type": "application/json" } });
      }
    }

    console.log(`Syncing CUCO360 for client ${CLIENT_CODE} from ${from} to ${to}`);

    // 4. Call CUCO360 API
    // Ensure dates are YYYY-MM-DD
    const formatDate = (d: string) => {
        try { return d.includes('T') ? d.split('T')[0] : d; } catch { return d; }
    };
    const safeFrom = formatDate(from);
    const safeTo = formatDate(to);
    
    const endpoint = `/checking/getfullchecks/${CLIENT_CODE}?start_date=${safeFrom}&end_date=${safeTo}`;
    const url = `${baseUrl}${endpoint}`;
    const authHeaderValue = apiKeyEnv.startsWith("Bearer ") ? apiKeyEnv : `Bearer ${apiKeyEnv}`;

    console.log(`[cucoSync] Fetching URL: ${url}`);
    
    const headers = { "Content-Type": "application/json", "APIKey": authHeaderValue };

    let response;
    try {
        response = await fetch(url, { headers });
    } catch (netErr: any) {
        console.error(`[cucoSync] Network Error:`, netErr);
        throw new Error(`Network Error calling CUCO360: ${netErr?.message || String(netErr)}`);
    }
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`[cucoSync] API Error ${response.status}: ${text}`);
      throw new Error(`CUCO360 API Error (${response.status}): ${text}`);
    }

    let json;
    try {
        json = await response.json();
    } catch (parseErr) {
        console.error(`[cucoSync] JSON Parse Error`);
        throw new Error(`Invalid JSON response from CUCO360`);
    }
    
    console.log(`[cucoSync] Response OK. Records count: ${Array.isArray(json?.data) ? json.data.length : (Array.isArray(json) ? json.length : 'Unknown')}`);
    if (json.response && json.response !== "ok" && json.response !== "OK") {
      throw new Error(`CUCO360 API returned error: ${JSON.stringify(json)}`);
    }

    const checks = json.data || json;
    if (!Array.isArray(checks)) {
      // If empty or success but no data, might return empty array or null
      if (!checks) {
          return new Response(JSON.stringify({ success: true, message: "No data returned from CUCO360", count: 0 }), { headers: { "Content-Type": "application/json" } });
      }
      throw new Error("Invalid data format from CUCO360: expected array");
    }

    // 5. Process & Save
    const recordsToCreate = checks.map((check: any) => {
      const employeeId = String(check.cod_empleado || check.employee_id || "");
      const dateStr = check.fecha || check.date; 
      const timeStr = check.hora || check.time;
      
      let direction = "E";
      const type = String(check.tipo || check.type || check.sentido || "").toUpperCase();
      if (type.startsWith("S") || type === "2" || type === "SALIDA" || type === "OUT") {
        direction = "S";
      }

      if (!employeeId || !dateStr || !timeStr) return null;

      return {
        employee_id: employeeId,
        employee_name: check.nombre || check.employee_name || `Empleado ${employeeId}`,
        record_date: dateStr,
        record_time: timeStr.slice(0, 5),
        direction: direction,
        device: check.dispositivo || check.terminal || "API",
        import_batch: `cuco_sync_${new Date().toISOString().replace(/[:.]/g, '-')}`,
        source: "cuco360_api"
      };
    }).filter((r: any) => r !== null);

    if (recordsToCreate.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No new records found in CUCO360.", count: 0 }), { headers: { "Content-Type": "application/json" } });
    }

    // Use service role for database operations
    const serviceClient = client.asServiceRole || client;

    // Clean up existing records for the day if syncing single day
    if (from === to) {
        const existing = await serviceClient.entities.AttendanceRecord.filter({ record_date: from }, "id", 2000);
        if (existing && existing.length > 0) {
            const deletePromises = existing.map((r: any) => serviceClient.entities.AttendanceRecord.delete(r.id));
            await Promise.all(deletePromises);
        }
    }

    // Bulk create
    const chunkSize = 50; 
    for (let i = 0; i < recordsToCreate.length; i += chunkSize) {
      const chunk = recordsToCreate.slice(i, i + chunkSize);
      await serviceClient.entities.AttendanceRecord.bulkCreate(chunk);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Synced ${recordsToCreate.length} records from CUCO360`,
      count: recordsToCreate.length
    }), { headers: { "Content-Type": "application/json" } });


  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
