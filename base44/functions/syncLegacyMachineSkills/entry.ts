import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role?.toLowerCase() !== 'admin') {
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
    console.log(`📊 Skills existentes ANTES: ${allSkills.length}`);

    // Obtener todas las máquinas para validación
    const allMachines = await base44.asServiceRole.entities.MachineMasterDatabase.list(undefined, 1000);
    const machineIds = new Set(allMachines.map(m => m.id));
    console.log(`📊 Máquinas disponibles: ${machineIds.size}`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let deleted = 0;
    let errors = 0;
    const errorDetails = [];

    for (const emp of employees) {
      try {
        // Obtener skills de este empleado
        const empSkills = allSkills.filter(s => s.employee_id === emp.id);

        // Procesar cada slot de máquina (1-10)
        for (let i = 1; i <= 10; i++) {
          const machineId = emp[`maquina_${i}`];
          const existingSkill = empSkills.find(s => s.orden_preferencia === i);

          // Validar que la máquina existe antes de crear/actualizar
          if (machineId && !machineIds.has(machineId)) {
            console.warn(`⚠️ Máquina ${machineId} no existe para ${emp.nombre} - slot ${i}`);
            errorDetails.push({
              employee: emp.nombre,
              slot: i,
              machineId,
              issue: 'machine_not_found'
            });
            continue;
          }

          if (machineId && !existingSkill) {
            // Crear nuevo skill
            await base44.asServiceRole.entities.EmployeeMachineSkill.create({
              employee_id: emp.id,
              machine_id: machineId,
              orden_preferencia: i,
              nivel_habilidad: 'Intermedio'
            });
            created++;
            console.log(`✅ Creado: ${emp.nombre} - Slot ${i} - Máquina ${machineId}`);
          } else if (!machineId && existingSkill) {
            // Eliminar skill huérfano (slot vacío en legacy pero existe en EmployeeMachineSkill)
            await base44.asServiceRole.entities.EmployeeMachineSkill.delete(existingSkill.id);
            deleted++;
            console.log(`🗑️ Eliminado huérfano: ${emp.nombre} - Slot ${i}`);
          } else if (machineId && existingSkill && existingSkill.machine_id !== machineId) {
            // Actualizar skill con máquina diferente
            await base44.asServiceRole.entities.EmployeeMachineSkill.update(existingSkill.id, {
              machine_id: machineId
            });
            updated++;
            console.log(`🔄 Actualizado: ${emp.nombre} - Slot ${i} - Nueva máquina ${machineId}`);
          } else if (machineId && existingSkill && existingSkill.machine_id === machineId) {
            // Ya sincronizado
            skipped++;
          }
        }
      } catch (error) {
        console.error(`❌ Error procesando ${emp.nombre}:`, error);
        errors++;
        errorDetails.push({
          employee: emp.nombre,
          error: error.message
        });
      }
    }

    const results = {
      success: errors === 0,
      message: errors === 0 ? 'Migración de skills completada exitosamente' : 'Migración completada con errores',
      stats: {
        employees_processed: employees.length,
        machines_available: machineIds.size,
        skills_created: created,
        skills_updated: updated,
        skills_deleted: deleted,
        skills_skipped: skipped,
        errors: errors
      },
      error_details: errorDetails.slice(0, 20)
    };

    console.log('📈 Resultados finales:', results);

    return Response.json(results);
  } catch (error) {
    console.error('❌ Error crítico:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});