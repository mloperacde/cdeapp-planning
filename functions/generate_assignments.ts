import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Validar autenticación
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { team_key, department } = await req.json();

        if (!team_key) {
            return Response.json({ error: 'team_key is required' }, { status: 400 });
        }

        // Obtener datos necesarios
        const machines = await base44.entities.Machine.list('orden');
        const employees = await base44.entities.Employee.list();
        const teams = await base44.entities.TeamConfig.list();
        
        const currentTeam = teams.find(t => t.team_key === team_key);
        if (!currentTeam) {
            return Response.json({ error: 'Team not found' }, { status: 404 });
        }

        // Filtrar empleados del equipo y turno fijo
        const availableEmployees = employees.filter(emp => {
            if (department && emp.departamento !== department) return false;
            if (emp.disponibilidad !== "Disponible") return false;
            if (emp.incluir_en_planning === false) return false;

            const isTurnoFijo = emp.tipo_turno === "Fijo Mañana" || emp.tipo_turno === "Fijo Tarde";
            if (isTurnoFijo) return true;
            
            return emp.equipo === currentTeam.team_name;
        }).map(e => ({
            id: e.id,
            nombre: e.nombre,
            puesto: e.puesto,
            experiencia: {
                maquina_1: e.maquina_1,
                maquina_2: e.maquina_2,
                maquina_3: e.maquina_3,
                // ... más si necesario
            }
        }));

        const machineList = machines.map(m => ({
            id: m.id,
            nombre: m.nombre,
            estado: m.estado
        }));

        // Construir prompt para el agente
        const prompt = `
Eres un agente experto en planificación de recursos humanos para empresas de fabricación.
Genera una asignación óptima de empleados a máquinas para el equipo "${currentTeam.team_name}".

DATOS:
Empleados Disponibles: ${JSON.stringify(availableEmployees)}
Máquinas: ${JSON.stringify(machineList)}

REGLAS:
1. Solo asigna a máquinas con estado "Disponible" o activo.
2. Cada máquina necesita:
   - 1 Responsable de línea (puesto contiene "responsable")
   - 1 Segunda de línea (puesto contiene "segunda")
   - Operarios (puesto contiene "operari"). Llena hasta cubrir necesidad o agotar empleados.
3. Prioriza experiencia (maquina_1 es mayor experiencia).
4. No repitas empleados.

Devuelve un JSON con formato:
{
  "asignaciones": {
    "machine_id": {
      "responsable_linea": ["id_empleado"],
      "segunda_linea": ["id_empleado"],
      "operador_1": "id",
      "operador_2": "id",
      ...
    }
  }
}
Solo devuelve el JSON, nada más.
        `;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    asignaciones: {
                        type: "object",
                        additionalProperties: {
                            type: "object",
                            properties: {
                                responsable_linea: { type: "array", items: { type: "string" } },
                                segunda_linea: { type: "array", items: { type: "string" } },
                                operador_1: { type: "string", nullable: true },
                                operador_2: { type: "string", nullable: true },
                                operador_3: { type: "string", nullable: true },
                                operador_4: { type: "string", nullable: true },
                                operador_5: { type: "string", nullable: true },
                                operador_6: { type: "string", nullable: true },
                                operador_7: { type: "string", nullable: true },
                                operador_8: { type: "string", nullable: true }
                            }
                        }
                    }
                }
            }
        });

        // Asegurarse de que response es un objeto (InvokeLLM devuelve dict si se usa schema)
        // El SDK devuelve el objeto parseado si se usa response_json_schema
        // Si no, devuelve string. Pero aquí usamos schema.
        
        // Nota: Si la integración devuelve string dentro de una propiedad, hay que parsear. 
        // Normalmente devuelve el objeto directo.
        
        return Response.json(response);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});