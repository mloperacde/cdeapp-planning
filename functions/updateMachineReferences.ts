import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acceso denegado. Solo administradores.' }, { status: 403 });
    }

    const results = {
      maintenanceUpdated: 0,
      assignmentsUpdated: 0,
      planningUpdated: 0,
      statusUpdated: 0,
      orphanedRemoved: 0,
      errors: []
    };

    // 1. Obtener mapeo de machine_id legacy -> MachineMasterDatabase ID
    const machines = await base44.asServiceRole.entities.Machine.list('', 500);
    const masterMachines = await base44.asServiceRole.entities.MachineMasterDatabase.list('', 500);

    const legacyToMasterMap = {};
    masterMachines.forEach(master => {
      if (master.machine_id_legacy) {
        legacyToMasterMap[master.machine_id_legacy] = master.id;
      }
    });

    // Crear mapeo también por código para casos sin machine_id_legacy
    const codeToMasterMap = {};
    masterMachines.forEach(master => {
      if (master.codigo_maquina) {
        codeToMasterMap[master.codigo_maquina.toLowerCase()] = master.id;
      }
    });

    // Crear mapeo inverso para validación
    const validMasterIds = new Set(masterMachines.map(m => m.id));

    // 2. Actualizar MaintenanceSchedule
    try {
      const maintenanceRecords = await base44.asServiceRole.entities.MaintenanceSchedule.list('', 500);
      
      for (const record of maintenanceRecords) {
        if (record.machine_id && legacyToMasterMap[record.machine_id]) {
          await base44.asServiceRole.entities.MaintenanceSchedule.update(record.id, {
            machine_id: legacyToMasterMap[record.machine_id]
          });
          results.maintenanceUpdated++;
        } else if (record.machine_id && !validMasterIds.has(record.machine_id)) {
          // Referencia huérfana - intentar buscar por código
          const machine = machines.find(m => m.id === record.machine_id);
          if (machine && machine.codigo && codeToMasterMap[machine.codigo.toLowerCase()]) {
            await base44.asServiceRole.entities.MaintenanceSchedule.update(record.id, {
              machine_id: codeToMasterMap[machine.codigo.toLowerCase()]
            });
            results.maintenanceUpdated++;
          }
        }
      }
    } catch (error) {
      results.errors.push({ entity: 'MaintenanceSchedule', error: error.message });
    }

    // 3. Actualizar MachineAssignment (y eliminar huérfanas)
    try {
      const assignments = await base44.asServiceRole.entities.MachineAssignment.list('', 500);
      
      for (const record of assignments) {
        if (record.machine_id) {
          if (legacyToMasterMap[record.machine_id]) {
            await base44.asServiceRole.entities.MachineAssignment.update(record.id, {
              machine_id: legacyToMasterMap[record.machine_id]
            });
            results.assignmentsUpdated++;
          } else if (!validMasterIds.has(record.machine_id)) {
            // Intentar buscar por código
            const machine = machines.find(m => m.id === record.machine_id);
            if (machine && machine.codigo && codeToMasterMap[machine.codigo.toLowerCase()]) {
              await base44.asServiceRole.entities.MachineAssignment.update(record.id, {
                machine_id: codeToMasterMap[machine.codigo.toLowerCase()]
              });
              results.assignmentsUpdated++;
            } else {
              // No se puede resolver - eliminar asignación huérfana
              await base44.asServiceRole.entities.MachineAssignment.delete(record.id);
              results.orphanedRemoved++;
              console.log(`Asignación huérfana eliminada: ${record.id}`);
            }
          }
        }
      }
    } catch (error) {
      results.errors.push({ entity: 'MachineAssignment', error: error.message });
    }

    // 4. Actualizar MachinePlanning
    try {
      const plannings = await base44.asServiceRole.entities.MachinePlanning.list('', 500);
      
      for (const record of plannings) {
        if (record.machine_id && legacyToMasterMap[record.machine_id]) {
          await base44.asServiceRole.entities.MachinePlanning.update(record.id, {
            machine_id: legacyToMasterMap[record.machine_id]
          });
          results.planningUpdated++;
        } else if (record.machine_id && !validMasterIds.has(record.machine_id)) {
          const machine = machines.find(m => m.id === record.machine_id);
          if (machine && machine.codigo && codeToMasterMap[machine.codigo.toLowerCase()]) {
            await base44.asServiceRole.entities.MachinePlanning.update(record.id, {
              machine_id: codeToMasterMap[machine.codigo.toLowerCase()]
            });
            results.planningUpdated++;
          }
        }
      }
    } catch (error) {
      results.errors.push({ entity: 'MachinePlanning', error: error.message });
    }

    // 5. Actualizar MachineStatus
    try {
      const statusRecords = await base44.asServiceRole.entities.MachineStatus.list('', 500);
      
      for (const record of statusRecords) {
        if (record.machine_id && legacyToMasterMap[record.machine_id]) {
          await base44.asServiceRole.entities.MachineStatus.update(record.id, {
            machine_id: legacyToMasterMap[record.machine_id]
          });
          results.statusUpdated++;
        } else if (record.machine_id && !validMasterIds.has(record.machine_id)) {
          const machine = machines.find(m => m.id === record.machine_id);
          if (machine && machine.codigo && codeToMasterMap[machine.codigo.toLowerCase()]) {
            await base44.asServiceRole.entities.MachineStatus.update(record.id, {
              machine_id: codeToMasterMap[machine.codigo.toLowerCase()]
            });
            results.statusUpdated++;
          }
        }
      }
    } catch (error) {
      results.errors.push({ entity: 'MachineStatus', error: error.message });
    }

    return Response.json({
      success: true,
      results,
      summary: {
        total_updated: results.maintenanceUpdated + results.assignmentsUpdated + 
                       results.planningUpdated + results.statusUpdated,
        orphaned_removed: results.orphanedRemoved,
        errors: results.errors.length
      }
    });

  } catch (error) {
    console.error('Error actualizando referencias:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});