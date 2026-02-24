// @ts-ignore
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const CLIENT_CODE = "380";
const DEFAULT_API_URL = "https://api.cuco360.com/api/ExtApi"; 

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const client = createClientFromRequest(req);
  
  try {
    const body = await req.json().catch(() => ({}));
    const { date, start_date, end_date, force, debug_mode } = body;

    if (debug_mode) {
       return new Response(JSON.stringify({ 
          success: true, 
          message: "Function is deployed and reachable.",
          env_check: {
             has_key: !!Deno.env.get("CUCO360_API_KEY"),
             base_url: Deno.env.get("CUCO_API_URL") || DEFAULT_API_URL
          }
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. Validate Configuration
    const apiKeyEnv = Deno.env.get("CUCO360_API_KEY");
    if (!apiKeyEnv) {
      throw new Error("Secret 'CUCO360_API_KEY' is not configured in Base44.");
    }
    
    const baseUrl = Deno.env.get("CUCO_API_URL") || DEFAULT_API_URL;

    // 2. Determine date range
    let from = start_date;
    let to = end_date;
    
    if (date) {
      from = date;
      to = date;
    }
    
    if (!from || !to) {
       const today = new Date().toISOString().split('T')[0];
       from = today;
       to = today;
    }

    // 3. Automation Logic (Skip weekends/holidays)
    if (!force && from === to) {
      const targetDate = new Date(from);
      const dayOfWeek = targetDate.getDay(); 

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Skipped: Weekend",
          count: 0 
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Check Holiday using Base44 SDK entities
      const holidays = await client.entities.Holiday.filter({ fecha: from }, "id,nombre", 1);
      if (holidays && holidays.length > 0) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: `Skipped: Holiday (${holidays[0].nombre})`,
          count: 0 
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    console.log(`Syncing CUCO360 for client ${CLIENT_CODE} from ${from} to ${to}`);

    // 4. Call CUCO360 API
    // Ensure dates are in correct format YYYY-MM-DD
    const formatDate = (d: string) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        try {
            return new Date(d).toISOString().split('T')[0];
        } catch {
            return d;
        }
    };
    
    const safeFrom = formatDate(from);
    const safeTo = formatDate(to);
    
    const endpoint = `/checking/getfullchecks/${CLIENT_CODE}?start_date=${safeFrom}&end_date=${safeTo}`;
    const url = `${baseUrl}${endpoint}`;
    
    // Auth configuration
    const authHeaderValue = apiKeyEnv.startsWith("Bearer ") ? apiKeyEnv : `Bearer ${apiKeyEnv}`;

    console.log(`[DEBUG] Fetching CUCO360: ${url}`);
    
    const headers = {
      "Content-Type": "application/json",
      "APIKey": authHeaderValue,
    };

    let response;
    try {
        response = await fetch(url, { headers });
    } catch (netErr: any) {
        console.error(`[DEBUG] Network Error calling CUCO360:`, netErr);
        throw new Error(`Network Error calling CUCO360: ${netErr?.message || String(netErr)}`);
    }
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`[DEBUG] CUCO360 Error ${response.status}: ${text}`);
      throw new Error(`CUCO360 API Error (${response.status}) at ${url}: ${text}`);
    }

    let json;
    try {
        json = await response.json();
    } catch (parseErr) {
        console.error(`[DEBUG] Error parsing JSON from CUCO360`);
        throw new Error(`Invalid JSON response from CUCO360`);
    }
    
    if (json.response && json.response !== "ok" && json.response !== "OK") {
      throw new Error(`CUCO360 API returned error: ${JSON.stringify(json)}`);
    }

    const checks = json.data || json;
    if (!Array.isArray(checks)) {
      throw new Error("Invalid data format from CUCO360: expected array in 'data' field");
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
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No new records found in CUCO360 for this date range.",
        count: 0 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use service role for database operations
    const serviceClient = client.asServiceRole || client;

    if (from === to) {
        // Fetch existing records for this day
        const existing = await serviceClient.entities.AttendanceRecord.filter({ record_date: from }, "id", 2000);
        if (existing && existing.length > 0) {
            console.log(`Deleting ${existing.length} existing records for ${from}`);
            const deletePromises = existing.map((r: any) => serviceClient.entities.AttendanceRecord.delete(r.id));
            await Promise.all(deletePromises);
        }
    }

    // Bulk create
    const chunkSize = 50; 
    for (let i = 0; i < recordsToCreate.length; i += chunkSize) {
      const chunk = recordsToCreate.slice(i, i + chunkSize);
      try {
        await serviceClient.entities.AttendanceRecord.bulkCreate(chunk);
      } catch (err) {
         console.error("Error inserting chunk", err);
         throw err;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Synced ${recordsToCreate.length} records from CUCO360`,
      count: recordsToCreate.length
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("Sync failed:", err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
