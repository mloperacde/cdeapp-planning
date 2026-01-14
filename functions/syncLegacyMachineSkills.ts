import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ 
        error: 'Forbidden: Admin access required' 
      }, { status: 403 });
    }

    console.log('🔧 Iniciando migración de skills legacy...');

    // Obtener todos los empleados maestros
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 1000);
    console.log(`📊 Empleados encontrados: ${employees.length}`);

    // Obtener todos los skills existentes
    const allSkills = await base44.asServiceRole.entities.EmployeeMachineSkill.list(undefined, 10000);
    console.log(`📊 Skills existentes: ${allSkills.length}`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const emp of employees) {
      try {
        // Obtener skills de este empleado
        const empSkills = allSkills.filter(s => s.employee_id === emp.id);

        // Procesar cada slot de máquina (1-10)
        for (let i = 1; i <= 10; i++) {
          const machineId = emp[`maquina_${i}`];
          const existingSkill = empSkills.find(s => s.orden_preferencia === i);

          if (machineId && !existingSkill) {
            // Crear nuevo skill
            await base44.asServiceRole.entities.EmployeeMachineSkill.create({
              employee_id: emp.id,
              machine_id: machineId,
              orden_preferencia: i,
              nivel_habilidad: 'Intermedio'
            });
            created++;
            console.log(`✅ Creado skill: ${emp.nombre} - Prioridad ${i}`);
          } else if (!machineId && existingSkill) {
            // Eliminar skill huérfano
            await base44.asServiceRole.entities.EmployeeMachineSkill.delete(existingSkill.id);
            updated++;
            console.log(`🗑️ Eliminado skill huérfano: ${emp.nombre} - Prioridad ${i}`);
          } else if (machineId && existingSkill && existingSkill.machine_id !== machineId) {
            // Actualizar skill con máquina diferente
            await base44.asServiceRole.entities.EmployeeMachineSkill.update(existingSkill.id, {
              machine_id: machineId
            });
            updated++;
            console.log(`🔄 Actualizado skill: ${emp.nombre} - Prioridad ${i}`);
          } else if (machineId && existingSkill) {
            skipped++;
          }
        }
      } catch (error) {
        console.error(`❌ Error procesando ${emp.nombre}:`, error);
        errors++;
      }
    }

    const results = {
      success: true,
      message: 'Migración de skills completada',
      stats: {
        employees_processed: employees.length,
        skills_created: created,
        skills_updated: updated,
        skills_skipped: skipped,
        errors: errors
      }
    };

    console.log('📈 Resultados:', results);

    return Response.json(results);
  } catch (error) {
    console.error('❌ Error crítico:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});