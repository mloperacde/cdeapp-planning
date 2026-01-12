import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }

    // 1. Leer todas las máquinas master
    const machines = await base44.asServiceRole.entities.MachineMasterDatabase.list(undefined, 500);
    
    // 2. Crear mapeo legacy_id -> nuevo_id
    const legacyMap = {};
    machines.forEach(machine => {
      if (machine.machine_id_legacy) {
        legacyMap[machine.machine_id_legacy] = {
          newId: machine.id,
          nombre: machine.nombre,
          codigo: machine.codigo_maquina
        };
      }
    });

    // 3. Leer empleados con asignaciones
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 500);
    
    // 4. Analizar asignaciones
    const employeesWithMachines = [];
    const unmappedLegacyIds = new Set();
    let totalAssignments = 0;
    let mappableAssignments = 0;

    for (const emp of employees) {
      const machineFields = [];
      for (let i = 1; i <= 10; i++) {
        const machineId = emp[`maquina_${i}`];
        if (machineId) {
          machineFields.push({
            slot: i,
            legacyId: machineId,
            mapped: legacyMap[machineId] || null
          });
          totalAssignments++;
          
          if (legacyMap[machineId]) {
            mappableAssignments++;
          } else {
            unmappedLegacyIds.add(machineId);
          }
        }
      }

      if (machineFields.length > 0) {
        employeesWithMachines.push({
          employeeId: emp.id,
          nombre: emp.nombre,
          departamento: emp.departamento,
          puesto: emp.puesto,
          machineFields
        });
      }
    }

    // 5. Verificar si ya existen skills migrados
    const existingSkills = await base44.asServiceRole.entities.EmployeeMachineSkill.list(undefined, 100);

    return Response.json({
      status: 'success',
      diagnostico: {
        totalMachinesInMaster: machines.length,
        machinesWithLegacyId: Object.keys(legacyMap).length,
        totalEmployees: employees.length,
        employeesWithMachines: employeesWithMachines.length,
        totalAssignments,
        mappableAssignments,
        unmappableAssignments: totalAssignments - mappableAssignments,
        existingMigratedSkills: existingSkills.length
      },
      legacyMapSample: Object.entries(legacyMap).slice(0, 5).map(([old, info]) => ({
        oldId: old,
        newId: info.newId,
        machine: `${info.nombre} (${info.codigo})`
      })),
      unmappedLegacyIds: Array.from(unmappedLegacyIds).slice(0, 10),
      employeeSample: employeesWithMachines.slice(0, 3)
    });

  } catch (error) {
    return Response.json({ 
      status: 'error', 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});