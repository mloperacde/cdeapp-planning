import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        console.log('Starting migration of legacy machine skills to EmployeeMachineSkill...');

        // Obtener todos los empleados maestros
        const masterEmployees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 1000);
        console.log(`Found ${masterEmployees.length} master employees`);

        // Obtener todos los skills existentes para evitar duplicados
        const existingSkills = await base44.asServiceRole.entities.EmployeeMachineSkill.list(undefined, 5000);
        console.log(`Found ${existingSkills.length} existing EmployeeMachineSkill records`);

        const skillsByEmployee = {};
        existingSkills.forEach(skill => {
            if (!skillsByEmployee[skill.employee_id]) {
                skillsByEmployee[skill.employee_id] = [];
            }
            skillsByEmployee[skill.employee_id].push(skill);
        });

        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (const employee of masterEmployees) {
            const employeeSkills = skillsByEmployee[employee.id] || [];
            
            // Procesar cada slot de máquina (1-10)
            for (let i = 1; i <= 10; i++) {
                const machineId = employee[`maquina_${i}`];
                
                if (!machineId) {
                    skipped++;
                    continue;
                }

                // Verificar si ya existe un skill para esta combinación
                const existingSkill = employeeSkills.find(s => 
                    s.orden_preferencia === i || s.machine_id === machineId
                );

                if (existingSkill) {
                    // Actualizar si es necesario
                    if (existingSkill.machine_id !== machineId || existingSkill.orden_preferencia !== i) {
                        await base44.asServiceRole.entities.EmployeeMachineSkill.update(existingSkill.id, {
                            machine_id: machineId,
                            orden_preferencia: i
                        });
                        updated++;
                        console.log(`Updated skill for employee ${employee.nombre}, slot ${i}`);
                    } else {
                        skipped++;
                    }
                } else {
                    // Crear nuevo skill
                    await base44.asServiceRole.entities.EmployeeMachineSkill.create({
                        employee_id: employee.id,
                        machine_id: machineId,
                        orden_preferencia: i,
                        nivel_habilidad: 'Intermedio',
                        certificado: false,
                        experiencia_anos: 1
                    });
                    created++;
                    console.log(`Created skill for employee ${employee.nombre}, slot ${i}`);
                }
            }
        }

        return Response.json({
            success: true,
            message: `Migración completada`,
            stats: {
                created,
                updated,
                skipped,
                totalEmployees: masterEmployees.length
            }
        });

    } catch (error) {
        console.error('Migration error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});