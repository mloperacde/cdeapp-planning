import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Fetch all employees and team configs
        const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list();
        const teamConfigs = await base44.asServiceRole.entities.TeamConfig.list();

        const issues = [];
        const fixes = [];

        // Create a map of team names to team_key
        const teamNameToKey = {};
        teamConfigs.forEach(tc => {
            if (tc.team_name) {
                teamNameToKey[tc.team_name.toLowerCase()] = tc.team_key;
            }
        });

        for (const emp of employees) {
            const employeeIssues = [];
            let needsUpdate = false;
            const updates = {};

            // Check 1: equipo field vs team_key consistency
            if (emp.equipo) {
                const expectedKey = teamNameToKey[emp.equipo.toLowerCase()];
                
                if (expectedKey && emp.team_key !== expectedKey) {
                    employeeIssues.push({
                        type: 'mismatch_equipo_team_key',
                        message: `equipo="${emp.equipo}" pero team_key="${emp.team_key || 'null'}" (debería ser "${expectedKey}")`
                    });
                    updates.team_key = expectedKey;
                    needsUpdate = true;
                }
            }

            // Check 2: team_key without equipo
            if (emp.team_key && !emp.equipo) {
                const teamConfig = teamConfigs.find(tc => tc.team_key === emp.team_key);
                if (teamConfig) {
                    employeeIssues.push({
                        type: 'missing_equipo',
                        message: `Tiene team_key="${emp.team_key}" pero no tiene campo "equipo" rellenado`
                    });
                    updates.equipo = teamConfig.team_name;
                    needsUpdate = true;
                }
            }

            // Check 3: equipo without team_key
            if (emp.equipo && !emp.team_key) {
                const expectedKey = teamNameToKey[emp.equipo.toLowerCase()];
                if (expectedKey) {
                    employeeIssues.push({
                        type: 'missing_team_key',
                        message: `Tiene equipo="${emp.equipo}" pero no tiene team_key asignado`
                    });
                    updates.team_key = expectedKey;
                    needsUpdate = true;
                }
            }

            // Check 4: Turno Rotativo sin equipo asignado
            if (emp.tipo_turno === "Rotativo" && !emp.team_key && !emp.team_fixed) {
                employeeIssues.push({
                    type: 'rotativo_sin_equipo',
                    message: 'Tipo turno "Rotativo" pero no tiene equipo asignado y no está marcado como equipo fijo'
                });
            }

            // Check 5: team_fixed pero con team_key asignado
            if (emp.team_fixed && emp.team_key) {
                employeeIssues.push({
                    type: 'fixed_with_team',
                    message: 'Marcado como equipo fijo pero tiene team_key asignado (debería ser null)'
                });
            }

            if (employeeIssues.length > 0) {
                issues.push({
                    employee_id: emp.id,
                    employee_name: emp.nombre,
                    employee_code: emp.codigo_empleado,
                    current_equipo: emp.equipo || null,
                    current_team_key: emp.team_key || null,
                    team_fixed: emp.team_fixed || false,
                    tipo_turno: emp.tipo_turno || null,
                    issues: employeeIssues,
                    suggested_updates: needsUpdate ? updates : null
                });

                if (needsUpdate) {
                    fixes.push({
                        employee_id: emp.id,
                        employee_name: emp.nombre,
                        updates: updates
                    });
                }
            }
        }

        // Check for employees without team_key or team_fixed (warning only)
        const employeesWithoutTeam = employees.filter(emp => 
            emp.estado_empleado === 'Alta' && 
            !emp.team_key && 
            !emp.team_fixed &&
            emp.tipo_turno !== "Fijo Mañana" &&
            emp.tipo_turno !== "Fijo Tarde"
        );

        return Response.json({
            success: true,
            summary: {
                total_employees: employees.length,
                issues_found: issues.length,
                auto_fixable: fixes.length,
                employees_without_team: employeesWithoutTeam.length
            },
            issues: issues,
            auto_fixes_available: fixes,
            employees_without_team: employeesWithoutTeam.map(emp => ({
                id: emp.id,
                name: emp.nombre,
                tipo_turno: emp.tipo_turno,
                departamento: emp.departamento
            }))
        });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({ 
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});