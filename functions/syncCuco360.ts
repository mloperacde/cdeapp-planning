// @ts-ignore
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { fetchCuco, CLIENT_CODE } from './cuco360/client.ts';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
};

Deno.serve(async (req) => {
  const client = createClientFromRequest(req);
  
  try {
    const { date, start_date, end_date, force } = await req.json();

    // Determine date range
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

    // AUTOMATION LOGIC: Skip weekends and holidays unless forced
    if (!force && from === to) {
      const targetDate = new Date(from);
      const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 6 = Saturday

      // 1. Check Weekend
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        console.log(`Skipping sync for ${from}: It is a weekend.`);
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Skipped: Weekend",
          count: 0 
        }), { headers: { "Content-Type": "application/json" } });
      }

      // 2. Check Holiday
      const { data: holidays } = await client
        .from('holidays')
        .select('*')
        .eq('fecha', from);
      
      if (holidays && holidays.length > 0) {
        console.log(`Skipping sync for ${from}: It is a holiday (${holidays[0].nombre}).`);
        return new Response(JSON.stringify({ 
          success: true, 
          message: `Skipped: Holiday (${holidays[0].nombre})`,
          count: 0 
        }), { headers: { "Content-Type": "application/json" } });
      }
    }

    console.log(`Syncing CUCO360 for client ${CLIENT_CODE} from ${from} to ${to}`);

    // Endpoint: GET /checking/getfullchecks/{cod_cliente}
    // Params: start_date, end_date (assuming these are the correct params based on standard patterns)
    // Note: The user mentioned /checking/getfullchecks/{cod_cliente} is relevant.
    
    const endpoint = `/checking/getfullchecks/${CLIENT_CODE}?start_date=${from}&end_date=${to}`;
    
    // Call the API using our configured client
    const checks = await fetchCuco(endpoint);

    if (!Array.isArray(checks)) {
      throw new Error("Invalid data format from CUCO360: data is not an array");
    }

    console.log(`Fetched ${checks.length} checks from CUCO360`);

    const recordsToCreate = checks.map((check: any) => {
      // Mapping based on common Spanish API fields (needs verification with real response)
      // cod_empleado, fecha, hora, tipo/sentido
      const employeeId = String(check.cod_empleado || check.employee_id || "");
      const dateStr = check.fecha || check.date; 
      const timeStr = check.hora || check.time;
      
      let direction = "E";
      // Logic to determine direction
      const type = String(check.tipo || check.type || check.sentido || "").toUpperCase();
      // Adjust based on real values (e.g., '1' for Entry, '2' for Exit, or 'E'/'S')
      if (type.startsWith("S") || type === "2" || type === "SALIDA" || type === "OUT") {
        direction = "S";
      }

      if (!employeeId || !dateStr || !timeStr) return null;

      return {
        employee_id: employeeId,
        employee_name: check.nombre || check.employee_name || `Empleado ${employeeId}`,
        record_date: dateStr,
        record_time: timeStr.slice(0, 5), // Ensure HH:mm
        direction: direction,
        device: check.dispositivo || check.terminal || "API",
        import_batch: `cuco_sync_${new Date().toISOString().replace(/[:.]/g, '-')}`,
        source: "cuco360_api"
      };
    }).filter(r => r !== null);

    if (recordsToCreate.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No new records found in CUCO360 for this date range.",
        count: 0 
      }), { headers: { "Content-Type": "application/json" } });
    }

    // If syncing a single day, clear previous records for that day to avoid duplicates
    if (from === to) {
        await client.functions.invoke("deleteAttendanceRecords", { record_date: from });
    }

    // Bulk create in chunks
    const chunkSize = 100;
    for (let i = 0; i < recordsToCreate.length; i += chunkSize) {
      const chunk = recordsToCreate.slice(i, i + chunkSize);
      const { error } = await client
        .from("attendance_records")
        .upsert(chunk, { onConflict: 'employee_id, record_date, record_time' });
      
      if (error) {
         console.error("Error inserting chunk", error);
         throw error;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Synced ${recordsToCreate.length} records from CUCO360`,
      count: recordsToCreate.length
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("Sync failed:", err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
