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
    
    // We expect a specific employee_id to test
    const { employee_id } = body;

    // 1. Config & API Key
    const apiKeyEnv = Deno.env.get("CUCO360_API_KEY");
    if (!apiKeyEnv) {
      throw new Error("Secret 'CUCO360_API_KEY' is not configured.");
    }
    const authHeaderValue = apiKeyEnv.replace("Bearer ", "").trim();
    const API_BASE_V2 = "https://cuco360.cucorent.com/api/apiv2";

    const headers = { 
        "Content-Type": "application/json",
        "accept": "application/json",
        "APIkey": authHeaderValue,
        "X-CSRF-TOKEN": ""
    };

    // 2. Fetch Employee from Local Master DB
    const serviceClient = client.asServiceRole || client;
    
    let emp;
    if (employee_id) {
        emp = await serviceClient.entities.EmployeeMasterDatabase.get(employee_id);
    } else {
        // Auto-fetch the first active employee with a code
        const candidates = await serviceClient.entities.EmployeeMasterDatabase.filter({ estado_empleado: "Alta" }, undefined, 50);
        emp = candidates.find((e: any) => e.codigo_empleado);
        if (!emp) {
            return Response.json({ success: false, error: "No active employees with 'codigo_empleado' found to test." });
        }
        console.log(`[Test] Auto-selected employee: ${emp.nombre} (ID: ${emp.id})`);
    }

    if (!emp) {
        return Response.json({ success: false, error: `Employee not found.` });
    }

    const externalId = emp.codigo_empleado ? String(emp.codigo_empleado).trim() : null;
    if (!externalId) {
        return Response.json({ success: false, error: `Employee ${emp.nombre} has no 'codigo_empleado' assigned.` });
    }

    const payload = {
        cod_empleado: externalId, 
        nombre: emp.nombre,
        nif: emp.dni_nie || "",
        email: emp.email || "",
    };

    // 3. Perform READ-ONLY Check (Dry Run)
    // We will check if the employee exists in Cuco360 using GET /employees/{id}
    // This confirms connectivity and mapping without writing data.

    const checkUrl = `${API_BASE_V2}/employees/${externalId}`;
    console.log(`[Test] Checking existence at: ${checkUrl}`);

    const checkRes = await fetch(checkUrl, { 
        method: "GET", 
        headers
    });

    let exists = false;
    let cucoData = null;

    if (checkRes.ok) {
        exists = true;
        cucoData = await checkRes.json();
    } else if (checkRes.status === 404) {
        exists = false;
    } else {
        const errText = await checkRes.text();
        return Response.json({ 
            success: false, 
            error: `API Check Failed (${checkRes.status}): ${errText}`,
            payload_preview: payload 
        });
    }

    return Response.json({
        success: true,
        message: "Dry Run Completed Successfully",
        local_employee: {
            id: emp.id,
            name: emp.nombre,
            code: externalId,
            payload_to_send: payload
        },
        cuco_status: {
            exists_in_cuco: exists,
            cuco_data: cucoData,
            action_would_be: exists ? "UPDATE (PUT)" : "CREATE (POST)"
        }
    });

  } catch (err: any) {
    console.error("Error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});
