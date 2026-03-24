import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Se requieren permisos de administrador' }, { status: 403 });
    }

    // 1. Leer todos los registros
    const allSkills = await base44.asServiceRole.entities.EmployeeMachineSkill.list(undefined, 1000);
    
    let updatedCount = 0;
    let createdCount = 0;
    const errors = [];
    
    // 2. Para cada empleado, asegurar 10 slots en EmployeeMachineSkill
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 500);
    
    for (const employee of employees) {
      try {
        // Obtener skills actuales del empleado
        const currentSkills = allSkills.filter(s => s.employee_id === employee.id);
        
        // Para cada slot 1-10
        for (let slot = 1; slot <= 10; slot++) {
          const legacyMachineId = employee[`maquina_${slot}`];
          const existingSkill = currentSkills.find(s => s.orden_preferencia === slot);
          
          if (legacyMachineId && !existingSkill) {
            // Crear skill desde dato legacy
            await base44.asServiceRole.entities.EmployeeMachineSkill.create({
              employee_id: employee.id,
              machine_id: legacyMachineId,
              orden_preferencia: slot,
              nivel_competencia: 'Avanzado', // Valor por defecto
              experiencia_meses: 12 // Valor por defecto
            });
            createdCount++;
          }
          else if (existingSkill) {
            // Normalizar campos existentes
            const updateData = {};
            
            // Asegurar que tenga nivel_competencia
            if (!existingSkill.nivel_competencia) {
              updateData.nivel_competencia = 'Avanzado';
            }
            
            // Asegurar que tenga orden_preferencia
            if (!existingSkill.orden_preferencia) {
              updateData.orden_preferencia = slot;
            }
            
            if (Object.keys(updateData).length > 0) {
              await base44.asServiceRole.entities.EmployeeMachineSkill.update(existingSkill.id, updateData);
              updatedCount++;
            }
          }
        }
      } catch (err) {
        errors.push({ employeeId: employee.id, nombre: employee.nombre, error: err.message });
      }
    }
    
    return Response.json({
      status: 'normalización_completada',
      fecha: new Date().toISOString(),
      resumen: {
        empleados_procesados: employees.length,
        skills_creados: createdCount,
        skills_actualizados: updatedCount,
        errores: errors.length
      },
      detalles_errores: errors.slice(0, 10)
    });
    
  } catch (error) {
    return Response.json({ 
      status: 'error_normalización', 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});