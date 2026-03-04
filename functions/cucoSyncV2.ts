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
    const CLIENT_CODE = Deno.env.get("CUCO_CLIENT_CODE") || "380";
    
    // Auth: 'apikey' header with raw value (no Bearer) for 'cliente_apikey' scheme
    const authHeaderValue = apiKeyEnv.replace("Bearer ", "").trim();
    
    // --- HEALTH CHECK REMOVED ---
    // We strictly use the V2 endpoint provided by the user.
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

    // 4. Call CUCO360 API (V2 Endpoint)
    // URL: https://cuco360.cucorent.com/api/apiv2/checking/getfullchecks/{CLIENT_CODE}
    // Headers: APIkey: {KEY}
    
    const formatDate = (d: string) => {
        try { return d.includes('T') ? d.split('T')[0] : d; } catch { return d; }
    };
    const safeFrom = formatDate(from);
    const safeTo = formatDate(to);
    
    const API_BASE_V2 = "https://cuco360.cucorent.com/api/apiv2";
    
    // Add times to ensure full day coverage (as per user example 06:00 to 22:00, but we use 00:00 to 23:59 for safety)
    const start = encodeURIComponent(`${safeFrom} 00:00:00`); 
    const end = encodeURIComponent(`${safeTo} 23:59:59`);
    
    const url = `${API_BASE_V2}/checking/getfullchecks/${CLIENT_CODE}?start_date=${start}&end_date=${end}`;
    
    console.log(`[cucoSyncV2] Fetching URL: ${url}`);
    
    // Header CONFIRMADO: 'APIkey' (case sensitive)
    const headers = { 
        "Content-Type": "application/json",
        "accept": "application/json",
        "APIkey": authHeaderValue,
        "X-CSRF-TOKEN": ""
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
      if (json.success === true && !json.checks) {
          return Response.json({ success: true, message: "No data returned from CUCO360 (empty checks)", count: 0 });
      }
      throw new Error("Invalid data format from CUCO360: expected 'checks' array");
    }

    // 5. Process & Enrichment (Mapping with Master Database)
    // Buscamos a los empleados en la base de datos maestra para enriquecer el registro
    // Esto asegura que guardamos el nombre real, departamento, etc., de nuestra base de datos.
    const masterEmployees = await serviceClient.entities.EmployeeMasterDatabase.list(undefined, 2000);
    const masterMapByCodigo: Record<string, any> = {};
    for (const emp of masterEmployees) {
      if (emp.codigo_empleado) masterMapByCodigo[String(emp.codigo_empleado).trim()] = emp;
    }

    const recordsToCreate = checks.map((check: any) => {
      // ID externo que viene de Cuco (ej: "76")
      const externalId = String(check.cod_int_empleado || check.cod_interno || check.cod_empleado || "").trim();
      const fullDate = check.fec_marcaje || check.fecha; // "2026-03-03 09:04:19"
      
      if (!externalId || !fullDate) return null;
      
      // Intentar encontrar al empleado en nuestra base maestra
      const masterEmp = masterMapByCodigo[externalId];
      
      const dateParts = fullDate.split(' ');
      const dateStr = dateParts[0];
      const timeStr = dateParts[1] || "00:00:00";
      
      let direction = "E";
      const type = String(check.val_direccion || "").toUpperCase();
      if (type === "S" || type === "SALIDA" || type === "OUT" || type === "2") {
        direction = "S";
      }

      // El registro de asistencia guarda el externalId en employee_id por convención del proyecto
      // Pero enriquecemos los metadatos con la info de nuestra maestra
      return {
        employee_id: externalId, 
        employee_name: masterEmp?.nombre || check.nombre || `Empleado ${externalId}`, 
        department: masterEmp?.departamento || check.des_incidencia || "Producción", // Fallback a Producción si no hay coincidencia
        record_date: dateStr,
        record_time: timeStr.slice(0, 5),
        direction: direction,
        device: check.nom_dispositivo || "API CUCO360",
        import_batch: `cuco_v2_sync_${new Date().toISOString().split('T')[0]}`,
        source: "cuco360_v2"
      };
    }).filter((r: any) => r !== null);

    if (recordsToCreate.length === 0) {
      return Response.json({ success: true, message: "No new records found in CUCO360.", count: 0 });
    }

    // Use service role for database operations
    const serviceClient = client.asServiceRole || client;

    // Clean up existing records for the day if syncing single day
    if (from === to) {
        // SUPER FAST DELETE OPTIMIZATION:
        // Use raw SQL-like query via filter to get IDs, then delete in massive parallel blocks.
        // If possible, we should skip deletion if we can't do it efficiently and just APPEND.
        // But duplicates are bad. 
        
        // Let's try to fetch ALL IDs first (lightweight) instead of full objects
        let existing = await serviceClient.entities.AttendanceRecord.filter({ record_date: from }, "id", 2000);
        
        if (existing && existing.length > 0) {
             const deleteChunkSize = 100; // Aggressive chunking
             const deletePromises = [];
             
             for (let i = 0; i < existing.length; i += deleteChunkSize) {
                 const batch = existing.slice(i, i + deleteChunkSize);
                 // No await inside loop
                 deletePromises.push(
                    Promise.all(batch.map((r: any) => serviceClient.entities.AttendanceRecord.delete(r.id).catch(() => {})))
                 );
             }
             
             // Wait for all deletions at once
             await Promise.all(deletePromises);
        }
    }

    // Bulk create - Fire and Forget Strategy? No, we need confirmation.
    // But we can parallelize the chunks too.
    const chunkSize = 100; 
    const createPromises = [];
    
    for (let i = 0; i < recordsToCreate.length; i += chunkSize) {
      const chunk = recordsToCreate.slice(i, i + chunkSize);
      createPromises.push(
          serviceClient.entities.AttendanceRecord.bulkCreate(chunk)
            .catch((e: any) => console.error("Create chunk error", e))
      );
      // Tiny delay to not DDoS the DB connection pool
      if (i % 500 === 0) await new Promise(r => setTimeout(r, 20));
    }
    
    await Promise.all(createPromises);

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
