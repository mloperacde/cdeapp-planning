import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { team_key, department, current_assignments } = await req.json();

        // Fetch context data
        const [employees, machines, workOrders, absences] = await Promise.all([
            base44.entities.EmployeeMasterDatabase.list('nombre', 1000),
            base44.entities.Machine.list('nombre', 1000),
            base44.entities.WorkOrder.filter({ status: { $in: ['Pendiente', 'En Progreso'] } }, '-priority', 1000),
            base44.entities.Absence.filter({ fecha_fin_desconocida: true }, '-fecha_inicio', 1000) // Simplification for active absences
        ]);

        // Filter employees for the specific team and department
        const teamEmployees = employees.filter(e => {
            // Logic to match team (assuming team info is in employee record or implied)
            // For this specific module, we often filter by the user's team, but here we'll assume the LLM can handle the raw list 
            // and we provide the team_key filtering context if possible. 
            // Better to filter here if we know the team name mapping, but let's pass all available ones 
            // and let the prompt guide the selection based on 'equipo' field.
            return e.departamento === department && e.estado_empleado === 'Alta';
        });

        // Prepare context for LLM
        const context = {
            team_key,
            department,
            employees: teamEmployees.map(e => ({
                id: e.id,
                name: e.nombre,
                position: e.puesto,
                team: e.equipo,
                skills: [e.maquina_1, e.maquina_2, e.maquina_3].filter(Boolean), // Top 3 machines
                is_absent: absences.some(a => a.employee_id === e.id), // Basic check
                availability: e.disponibilidad
            })),
            machines: machines.map(m => ({
                id: m.id,
                name: m.nombre,
                location: m.ubicacion
            })),
            work_orders: workOrders.map(wo => ({
                machine_id: wo.machine_id,
                priority: wo.priority,
                status: wo.status,
                product: wo.product_name
            })),
            current_assignments // To know what's already set or to start from scratch
        };

        const prompt = `
        You are an expert Production Planner AI. Your goal is to optimize the machine staff assignments.
        
        Context:
        - Department: ${context.department}
        - Team: ${context.team_key}
        
        Rules:
        1. Assign a 'Responsable de Línea' (Line Lead) to each machine if possible. Must have 'RESPONSABLE' in position.
        2. Assign a 'Segunda de Línea' (Second Lead) to each machine if possible. Must have '2ª' or 'SEGUNDA' in position.
        3. Assign up to 5 'Operarios' (Operators) per machine. Must have 'OPERARIO' in position.
        4. PRIORITIZE machines with High Priority Work Orders.
        5. Match employees to machines they have skills/experience in (skills field contains machine IDs).
        6. DO NOT assign absent employees.
        7. DO NOT assign the same employee to multiple slots.
        8. Return a JSON object where keys are machine_ids and values are assignment objects.
        
        Input Data:
        ${JSON.stringify(context, null, 2)}
        
        Output Format (JSON only):
        {
            "suggestions": {
                "MACHINE_ID": {
                    "responsable_linea": "EMPLOYEE_ID" | null,
                    "segunda_linea": "EMPLOYEE_ID" | null,
                    "operador_1": "EMPLOYEE_ID" | null,
                    "operador_2": "EMPLOYEE_ID" | null,
                    ...
                    "reasoning": "Short explanation of why this team was chosen"
                },
                ...
            }
        }
        `;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    suggestions: {
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
                                reasoning: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        return Response.json(response);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});