// @ts-ignore
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Declaraciones para el linter local
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

Deno.serve(async (req: Request) => {
  try {
    const client = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    
    // We can filter by specific employee ID or sync all
    const { employee_id, force_all } = body;

    // 1. Config & API Key
    const apiKeyEnv = Deno.env.get("CUCO360_API_KEY");
    if (!apiKeyEnv) {
      throw new Error("Secret 'CUCO360_API_KEY' is not configured.");
    }
    const authHeaderValue = apiKeyEnv.replace("Bearer ", "").trim();
    const API_BASE_V2 = "https://cuco360.cucorent.com/api/apiv2";
    const CLIENT_CODE = Deno.env.get("CUCO_CLIENT_CODE") || "380";

    const headers = { 
        "Content-Type": "application/json",
        "accept": "application/json",
        "APIkey": authHeaderValue,
        "X-CSRF-TOKEN": ""
    };

    // 2. Fetch Employees from Local Master DB
    const serviceClient = client.asServiceRole || client;
    let employeesToSync = [];

    if (employee_id) {
        const emp = await serviceClient.entities.EmployeeMasterDatabase.get(employee_id);
        if (emp) employeesToSync.push(emp);
    } else {
        employeesToSync = await serviceClient.entities.EmployeeMasterDatabase.filter({ estado_empleado: "Alta" }, undefined, 1000);
    }

    if (employeesToSync.length === 0) {
        return Response.json({ success: true, message: "No employees to sync.", count: 0 });
    }

    // --- PRE-FETCH CUCO EMPLOYEES MAP ---
    // We need to map 'codigo_empleado' (External) to 'cod_empleado' (Internal Cuco ID)
    // because UPDATE requires the Internal ID.
    const listUrl = `${API_BASE_V2}/employees/list/${CLIENT_CODE}`;
    console.log(`[Sync] Fetching employee list map from: ${listUrl}`);
    const listRes = await fetch(listUrl, { headers });
    
    const externalToInternalMap: Record<string, string> = {};
    
    if (listRes.ok) {
        const listData = await listRes.json();
        const employeesList = listData.data || listData; // Adjust based on response structure
        if (Array.isArray(employeesList)) {
            employeesList.forEach((e: any) => {
                // Map 'cod_int_empleado' (76) -> 'cod_empleado' (18738)
                // Also support mapping by NIF if needed
                const extCode = String(e.cod_int_empleado || e.cod_interno || "").trim();
                if (extCode) {
                    externalToInternalMap[extCode] = String(e.cod_empleado);
                }
            });
        }
        console.log(`[Sync] Mapped ${Object.keys(externalToInternalMap).length} existing employees.`);
    } else {
        console.warn(`[Sync] Failed to fetch employee list. Updates might fail if IDs don't match directly. Status: ${listRes.status}`);
    }
    // ------------------------------------

    // 3. Sync Loop
    const results = { created: 0, updated: 0, errors: 0, details: [] as any[] };

    for (const emp of employeesToSync) {
        const externalId = emp.codigo_empleado ? String(emp.codigo_empleado).trim() : null;
        if (!externalId) {
             results.details.push({ id: emp.id, name: emp.nombre, error: "Missing codigo_empleado" });
             continue;
        }

        // Determine Internal Cuco ID
        const internalCucoId = externalToInternalMap[externalId];
        
        // Payload for CREATE/UPDATE
        // Note: For CREATE, we might need to send 'cod_int_empleado' explicitly if API supports it.
        const payload = {
            cod_int_empleado: externalId, // Mapping our code to their 'Internal Code' field
            cod_interno: externalId,      // Redundant backup
            nom_empleado: emp.nombre,     // Mapped from 'nombre'
            num_dni: emp.dni_nie || "",
            dir_email: emp.email || "",
            // Add other fields as needed
        };

        try {
            let action = "skipped";
            
            if (internalCucoId) {
                // UPDATE (PUT /employees/{internal_id})
                const updateUrl = `${API_BASE_V2}/employees/${internalCucoId}`;
                const updateRes = await fetch(updateUrl, { 
                    method: "PUT", 
                    headers, 
                    body: JSON.stringify(payload) 
                });

                if (updateRes.ok) {
                    action = "updated";
                    results.updated++;
                } else {
                    const errText = await updateRes.text();
                    throw new Error(`Update failed (${updateRes.status}): ${errText}`);
                }
            } else {
                // CREATE (POST /employees)
                const createUrl = `${API_BASE_V2}/employees`;
                const createRes = await fetch(createUrl, { 
                    method: "POST", 
                    headers, 
                    body: JSON.stringify(payload) 
                });
                
                if (createRes.ok) {
                    action = "created";
                    results.created++;
                    // Optionally update map if we get ID back
                } else {
                    const errText = await createRes.text();
                    throw new Error(`Create failed (${createRes.status}): ${errText}`);
                }
            }

            results.details.push({ id: emp.id, name: emp.nombre, action });

        } catch (err: any) {
            console.error(`Error syncing employee ${emp.nombre}:`, err);
            results.errors++;
            results.details.push({ id: emp.id, name: emp.nombre, error: err.message });
        }
        
        // Throttle
        await new Promise(r => setTimeout(r, 100));
    }

  } catch (err: any) {
    console.error("Error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});
