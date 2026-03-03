// @ts-ignore
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Declaraciones para el linter local (no afectan a Deno Deploy)
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

Deno.serve(async (req: Request) => {
  try {
    const client = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    
    const { date, start_date, end_date, force, debug_mode } = body;

    // Minimal check
    if (debug_mode) {
       return Response.json({ 
          success: true, 
          message: "Function cucoSyncV2 is deployed and reachable.",
          has_key: !!Deno.env.get("CUCO360_API_KEY")
       });
    }

    // 1. Validate Configuration & API Key
    // API KEY MUST BE CONFIGURED IN BASE44 SECRETS
    const apiKeyEnv = Deno.env.get("CUCO360_API_KEY");
    if (!apiKeyEnv) {
      throw new Error("Secret 'CUCO360_API_KEY' is not configured in Base44 environment.");
    }

    // 2. Constants & Params
    const CLIENT_CODE = "380";
    // Base URL actualizada según documentación reciente (cuco360.cucorent.com/api)
    // El usuario nos indica que la documentación está en cuco360.cucorent.com/api/documentation
    // Por tanto, la API debe estar en cuco360.cucorent.com/api
    const DEFAULT_API_URL = "https://cuco360.cucorent.com/api"; 
    const baseUrl = Deno.env.get("CUCO_API_URL") || DEFAULT_API_URL;
    
    // Auth: 'apikey' header with raw value (no Bearer) for 'cliente_apikey' scheme
    const authHeaderValue = apiKeyEnv.replace("Bearer ", "").trim();
    
    // --- HEALTH CHECK ---
    // Verificar conectividad antes de intentar operaciones pesadas
    try {
        // Usamos un endpoint seguro para probar la conexión
        const healthUrl = `${baseUrl}/auxiliary/index/`;
        console.log(`[cucoSyncV2] Health Check: ${healthUrl}`);
        // Header name: 'apikey' (lowercase)
        const healthRes = await fetch(healthUrl, { 
            headers: { "apikey": authHeaderValue, "Accept": "application/json" } 
        });
        
        if (!healthRes.ok) {
            const text = await healthRes.text();
            console.warn(`[cucoSyncV2] Health Check Failed (${healthRes.status}): ${text}`);
        } else {
            console.log(`[cucoSyncV2] Health Check OK`);
        }
    } catch (e) {
        console.warn(`[cucoSyncV2] Health Check Connection Error:`, e);
    }
    // --------------------

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
        return Response.json({ success: true, message: "Skipped: Weekend", count: 0 });
      }
      
      const holidays = await client.entities.Holiday.filter({ fecha: from }, "id,nombre", 1);
      if (holidays && holidays.length > 0) {
        return Response.json({ success: true, message: `Skipped: Holiday (${holidays[0].nombre})`, count: 0 });
      }
    }

    console.log(`[cucoSyncV2] Syncing client ${CLIENT_CODE} from ${from} to ${to}`);

    // 4. Call CUCO360 API
    const formatDate = (d: string) => {
        try { return d.includes('T') ? d.split('T')[0] : d; } catch { return d; }
    };
    const safeFrom = formatDate(from);
    const safeTo = formatDate(to);
    
    // Endpoint legacy vs nuevo. Si el health check funcionó en /api/, asumimos estructura nueva.
    // Pero si getfullchecks es específico de legacy (ExtApi), puede que necesitemos mantener ExtApi para esa llamada.
    // Probaremos construir la URL con precaución.
    
    // Si baseUrl es .../api, y el endpoint antiguo era /ExtApi/checking..., quizás ahora sea /checking... directo?
    // Asumiremos que si cambiamos el base a /api, el endpoint debe ajustarse.
    // Doc antigua: /api/ExtApi/checking/getfullchecks
    // Doc nueva: /api/auxiliary/index
    
    // Intento 1: Ruta estándar
    let endpoint = `/checking/getfullchecks/${CLIENT_CODE}?start_date=${safeFrom}&end_date=${safeTo}`;
    
    // Si estamos usando la URL antigua (/ExtApi), la mantenemos. Si no, probamos con y sin ExtApi.
    if (!baseUrl.includes("ExtApi")) {
        // CONFIRMADO POR EL USUARIO (CURL CORRECTO):
        // URL: https://cuco360.cucorent.com/api/apiv2/checking/getfullchecks/380
        // Header: APIkey (case sensitive)
        // Params: start_date, end_date (encoded)
        
        const correctBaseUrl = "https://cuco360.cucorent.com/api/apiv2";
        
        const start = encodeURIComponent(`${safeFrom} 06:00:00`); // Usamos 06:00 como inicio seguro del día
        const end = encodeURIComponent(`${safeTo} 22:00:00`); // 22:00 como fin seguro
        
        endpoint = `/checking/getfullchecks/${CLIENT_CODE}?start_date=${start}&end_date=${end}`;
        
        url = `${correctBaseUrl}${endpoint}`;
    } else {
        url = `${baseUrl}${endpoint}`;
    }
    
    // Corrección para evitar doble // si baseUrl termina en /
    url = url.replace(/([^:]\/)\/+/g, "$1");

    console.log(`[cucoSyncV2] Fetching URL: ${url}`);
    
    // Header CONFIRMADO: 'APIkey' (con mayúsculas específicas)
    const headers = { 
        "Content-Type": "application/json", 
        "APIkey": authHeaderValue
    };

    let response;
    try {
        response = await fetch(url, { headers });
    } catch (netErr: any) {
        console.error(`[cucoSyncV2] Network Error:`, netErr);
        throw new Error(`Network Error calling CUCO360: ${netErr?.message || String(netErr)}`);
    }
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`[cucoSyncV2] API Error ${response.status}: ${text}`);
      throw new Error(`CUCO360 API Error (${response.status}): ${text}`);
    }

    let json;
    try {
        json = await response.json();
    } catch (parseErr) {
        console.error(`[cucoSyncV2] JSON Parse Error`);
        throw new Error(`Invalid JSON response from CUCO360`);
    }
    
    // Validación respuesta V2
    if (json.success === false) {
      throw new Error(`CUCO360 API returned error: ${json.message || JSON.stringify(json)}`);
    }

    // Mapping V2: json.checks es el array
    const checks = json.checks || json.data || json;
    
    if (!Array.isArray(checks)) {
      if (!checks) {
          return Response.json({ success: true, message: "No data returned from CUCO360", count: 0 });
      }
      throw new Error("Invalid data format from CUCO360: expected 'checks' array");
    }

    // 5. Process & Save (Mapping fields from V2 response)
    const recordsToCreate = checks.map((check: any) => {
      // V2 Fields: cod_empleado, fec_marcaje (YYYY-MM-DD HH:mm:ss), val_direccion (E/S), nom_dispositivo
      const employeeId = String(check.cod_empleado || check.employee_id || "");
      const fullDate = check.fec_marcaje || check.fecha; // "2026-03-03 09:04:19"
      
      if (!employeeId || !fullDate) return null;
      
      const dateStr = fullDate.split(' ')[0];
      const timeStr = fullDate.split(' ')[1];
      
      let direction = "E";
      const type = String(check.val_direccion || check.tipo || "").toUpperCase();
      if (type === "S" || type === "SALIDA" || type === "OUT" || type === "2") {
        direction = "S";
      }

      return {
        employee_id: employeeId,
        employee_name: check.nombre || `Empleado ${employeeId}`, // API V2 no devuelve nombre en este endpoint, usamos ID
        record_date: dateStr,
        record_time: timeStr.slice(0, 5),
        direction: direction,
        device: check.nom_dispositivo || "API",
        import_batch: `cuco_sync_${new Date().toISOString().replace(/[:.]/g, '-')}`,
        source: "cuco360_api"
      };
    }).filter((r: any) => r !== null);

    if (recordsToCreate.length === 0) {
      return Response.json({ success: true, message: "No new records found in CUCO360.", count: 0 });
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

    return Response.json({ 
      success: true, 
      message: `Synced ${recordsToCreate.length} records from CUCO360`,
      count: recordsToCreate.length
    });

  } catch (err: any) {
    console.error("Error:", err);
    return Response.json({ 
        success: false, 
        error: err.message 
    }, { status: 500 });
  }
});
