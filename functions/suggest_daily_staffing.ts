import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { date, shift, team_key } = await req.json();

        // 1. Fetch Ideal Assignments (Templates)
        const idealAssignments = await base44.entities.MachineAssignment.filter({ team_key: team_key }, '-machine_id', 100);

        // 2. Fetch Active Employees & Absences for the date
        const [employees, absences, workOrders] = await Promise.all([
            base44.entities.EmployeeMasterDatabase.list('nombre', 1000),
            base44.entities.Absence.filter({  }, '-fecha_inicio', 1000), // We'll filter by date in memory for simplicity or strict query if possible
            base44.entities.WorkOrder.filter({ status: { $in: ['Pendiente', 'En Progreso'] } }, '-priority', 1000)
        ]);

        // Filter valid employees for the date (not absent)
        const targetDate = new Date(date);
        const absentEmployeeIds = absences
            .filter(a => {
                const start = new Date(a.fecha_inicio);
                const end = a.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(a.fecha_fin);
                return targetDate >= start && targetDate <= end;
            })
            .map(a => a.employee_id);

        const availableEmployees = employees.filter(e => 
            e.departamento === 'FABRICACION' && 
            !absentEmployeeIds.includes(e.id) &&
            e.estado_empleado === 'Alta'
        );

        // Prepare context for LLM
        const context = {
            date,
            shift,
            ideal_assignments: idealAssignments,
            available_employees: availableEmployees.map(e => ({
                id: e.id,
                name: e.nombre,
                position: e.puesto,
                skills: [e.maquina_1, e.maquina_2, e.maquina_3].filter(Boolean)
            })),
            work_orders: workOrders.map(wo => ({
                machine_id: wo.machine_id,
                priority: wo.priority,
                product: wo.product_name
            }))
        };

        const prompt = `
        You are a Shift Planning Assistant.
        Goal: Generate a Daily Staffing Plan for ${date} (Shift: ${shift}).

        Inputs:
        1. Ideal Assignments: The preferred staff for each machine.
        2. Available Employees: Who is actually here today (absent staff removed).
        3. Work Orders: Pending jobs (Prioritize machines with high priority orders).

        Rules:
        - Start with the Ideal Assignment for each machine.
        - If an "Ideal" employee is ABSENT (not in Available Employees list), FIND A REPLACEMENT from the available pool who has similar skills/position.
        - If a machine has NO Work Orders, you can leave it empty or minimal staff if policy allows, but usually we staff it if it's an active machine. Prioritize machines WITH Work Orders.
        - Return a JSON object with keys as 'machine_id' and value as the staffing object.
        
        Staffing Object Fields: responsable_linea, segunda_linea, operador_1...operador_8.
        Use NULL if no one is assigned.

        JSON Output Format:
        {
            "staffing": {
                "MACHINE_ID": { ...fields... },
                ...
            },
            "summary": "Brief explanation of changes made due to absences"
        }
        `;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            context_data: JSON.stringify(context).substring(0, 100000), // Limit context size if needed
            response_json_schema: {
                type: "object",
                properties: {
                    staffing: {
                        type: "object",
                        additionalProperties: {
                            type: "object",
                            properties: {
                                responsable_linea: { type: ["string", "null"] },
                                segunda_linea: { type: ["string", "null"] },
                                operador_1: { type: ["string", "null"] },
                                operador_2: { type: ["string", "null"] },
                                operador_3: { type: ["string", "null"] },
                                operador_4: { type: ["string", "null"] },
                                operador_5: { type: ["string", "null"] },
                                operador_6: { type: ["string", "null"] },
                                operador_7: { type: ["string", "null"] },
                                operador_8: { type: ["string", "null"] }
                            }
                        }
                    },
                    summary: { type: "string" }
                }
            }
        });

        return Response.json(response);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});