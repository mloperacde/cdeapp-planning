// @ts-ignore
// import { createClientFromRequest } from 'npm:@base44/sdk@0.8.5';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

Deno.serve(async (req) => {
  try {
    // const client = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    
    // Minimal "Hello World" check - PURE DENO
    if (body.debug_mode) {
      return new Response(JSON.stringify({ 
          success: true, 
          message: "PURE DENO Function is alive! SDK Removed.",
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

    // 3. Automation Logic (SKIPPED FOR NOW - REQUIRES SDK/DB TO CHECK HOLIDAYS)
    // We assume force=true or simple date range for this test

    console.log(`[cucoSyncV2] Syncing client ${CLIENT_CODE} from ${from} to ${to}`);

    // 4. Call CUCO360 API
    const formatDate = (d: string) => {
        try { return d.includes('T') ? d.split('T')[0] : d; } catch { return d; }
    };
    const safeFrom = formatDate(from);
    const safeTo = formatDate(to);
    
    const endpoint = `/checking/getfullchecks/${CLIENT_CODE}?start_date=${safeFrom}&end_date=${safeTo}`;
    const url = `${baseUrl}${endpoint}`;
    const authHeaderValue = apiKeyEnv.startsWith("Bearer ") ? apiKeyEnv : `Bearer ${apiKeyEnv}`;

    console.log(`[cucoSyncV2] Fetching URL: ${url}`);
    
    const headers = { "Content-Type": "application/json", "APIKey": authHeaderValue };

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
    
    if (json.response && json.response !== "ok" && json.response !== "OK") {
      throw new Error(`CUCO360 API returned error: ${JSON.stringify(json)}`);
    }

    const checks = json.data || json;
    if (!Array.isArray(checks)) {
      if (!checks) {
          return new Response(JSON.stringify({ success: true, message: "No data returned from CUCO360", count: 0 }), { headers: { "Content-Type": "application/json" } });
      }
      throw new Error("Invalid data format from CUCO360: expected array");
    }

    // Return the data directly to frontend (No DB Save yet)
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Fetched ${checks.length} records from CUCO360 (Not saved to DB yet)`,
      count: checks.length,
      // data: checks // Uncomment to see raw data if needed
    }), { headers: { "Content-Type": "application/json" } });

    /*
    // ... DB SAVING LOGIC COMMENTED OUT ...
    */

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
