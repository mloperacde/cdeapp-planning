import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }

    // 1. Leer empleados con asignaciones legacy
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 500);
    
    // 2. Leer máquinas master para mapeo
    const machines = await base44.asServiceRole.entities.MachineMasterDatabase.list(undefined, 500);
    
    // 3. Crear mapeo legacy_id -> nuevo_id
    const legacyMap = {};
    machines.forEach(machine => {
      if (machine.machine_id_legacy) {
        legacyMap[machine.machine_id_legacy] = machine.id;
      }
    });

    // 4. Procesar asignaciones
    let processedEmployees = 0;
    let totalSkills = 0;
    let skippedEmployees = 0;
    const skillsToCreate = [];
    const errors = [];

    for (const emp of employees) {
      const machineFields = [
        emp.maquina_1, emp.maquina_2, emp.maquina_3, emp.maquina_4, emp.maquina_5,
        emp.maquina_6, emp.maquina_7, emp.maquina_8, emp.maquina_9, emp.maquina_10
      ].filter(m => m); // Filtrar nulos/undefined

      if (machineFields.length === 0) {
        skippedEmployees++;
        continue;
      }

      processedEmployees++;
      
      for (const legacyMachineId of machineFields) {
        const newMachineId = legacyMap[legacyMachineId];
        
        if (!newMachineId) {
          errors.push({
            employee: emp.nombre,
            legacyMachineId,
            issue: 'Machine not found in MachineMasterDatabase'
          });
          continue;
        }

        // Crear skill entry
        skillsToCreate.push({
          employee_id: emp.id,
          machine_id: newMachineId,
          nivel_habilidad: 'Experto', // Asumimos experto por asignación histórica
          certificado: true,
          fecha_certificacion: emp.fecha_alta || new Date().toISOString().split('T')[0],
          experiencia_anos: 1,
          observaciones: `Migrado desde maquina_X el ${new Date().toISOString().split('T')[0]}`
        });
        totalSkills++;
      }
    }

    // 5. Insertar en batch
    let createdCount = 0;
    if (skillsToCreate.length > 0) {
      try {
        // Crear en lotes de 50
        for (let i = 0; i < skillsToCreate.length; i += 50) {
          const batch = skillsToCreate.slice(i, i + 50);
          for (const skill of batch) {
            await base44.asServiceRole.entities.EmployeeSkill.create(skill);
            createdCount++;
          }
        }
      } catch (err) {
        errors.push({ issue: 'Batch insert error', error: err.message });
      }
    }

    return Response.json({
      status: 'success',
      summary: {
        totalEmployees: employees.length,
        employeesWithMachines: processedEmployees,
        employeesSkipped: skippedEmployees,
        totalSkillsIdentified: totalSkills,
        skillsCreated: createdCount,
        errors: errors.length
      },
      legacyMapSize: Object.keys(legacyMap).length,
      machinesInMaster: machines.length,
      errors: errors.slice(0, 10) // Primeros 10 errores
    });

  } catch (error) {
    return Response.json({ 
      status: 'error', 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});