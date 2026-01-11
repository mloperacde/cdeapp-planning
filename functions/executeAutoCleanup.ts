import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = {
      machineDeleted: 0,
      employeeDeleted: 0,
      machineProcessDeleted: 0,
      machineplanningDeleted: 0,
      dailystaffingMigrated: 0,
      machineplanningMigrated: 0,
      errors: []
    };

    // 1. Eliminar entidad Machine si existe
    try {
      const machines = await base44.asServiceRole.entities.Machine.list('', 500);
      for (const m of machines) {
        try {
          await base44.asServiceRole.entities.Machine.delete(m.id);
          results.machineDeleted++;
        } catch (e) {
          results.errors.push({ type: 'Machine delete', error: e.message });
        }
      }
    } catch (e) {
      if (!e.message.includes('404')) {
        results.errors.push({ type: 'Machine fetch', error: e.message });
      }
    }

    // 2. Eliminar entidad Employee si existe
    try {
      const employees = await base44.asServiceRole.entities.Employee.list('', 500);
      for (const emp of employees) {
        try {
          await base44.asServiceRole.entities.Employee.delete(emp.id);
          results.employeeDeleted++;
        } catch (e) {
          results.errors.push({ type: 'Employee delete', error: e.message });
        }
      }
    } catch (e) {
      if (!e.message.includes('404')) {
        results.errors.push({ type: 'Employee fetch', error: e.message });
      }
    }

    // 3. Limpiar referencias rotas en MachineProcess
    try {
      const masterMachines = await base44.asServiceRole.entities.MachineMasterDatabase.list('', 500);
      const validMachineIds = new Set(masterMachines.map(m => m.id));

      const allMachineProcess = await base44.asServiceRole.entities.MachineProcess.list('', 500);
      for (const mp of allMachineProcess) {
        if (!validMachineIds.has(mp.machine_id)) {
          try {
            await base44.asServiceRole.entities.MachineProcess.delete(mp.id);
            results.machineProcessDeleted++;
          } catch (e) {
            results.errors.push({ type: 'MachineProcess delete', id: mp.id, error: e.message });
          }
        }
      }
    } catch (e) {
      results.errors.push({ type: 'MachineProcess cleanup', error: e.message });
    }

    // 4. Migrar MachinePlanning y DailyMachineStaffing a DailyMachinePlanning
    try {
      const machineplan = await base44.asServiceRole.entities.MachinePlanning.list('', 500);
      const dailystaff = await base44.asServiceRole.entities.DailyMachineStaffing.list('', 500);

      // Migrar MachinePlanning
      for (const mp of machineplan) {
        try {
          await base44.asServiceRole.entities.DailyMachinePlanning.create({
            date: mp.fecha_planificacion,
            shift: 'Mañana',
            machine_id: mp.machine_id,
            team_key: mp.team_key,
            process_id: mp.process_id,
            activa: mp.activa_planning !== false,
            operadores_necesarios: mp.operadores_necesarios,
            status: 'Borrador',
            migration_from: 'MachinePlanning'
          });
          results.machineplanningMigrated++;
        } catch (e) {
          results.errors.push({ type: 'MachinePlanning migrate', id: mp.id, error: e.message });
        }
      }

      // Migrar DailyMachineStaffing
      for (const ds of dailystaff) {
        try {
          await base44.asServiceRole.entities.DailyMachinePlanning.create({
            date: ds.date,
            shift: ds.shift,
            machine_id: ds.machine_id,
            team_key: 'team_1',
            process_id: null,
            activa: true,
            operadores_necesarios: 0,
            responsable_linea: ds.responsable_linea ? [ds.responsable_linea] : [],
            segunda_linea: ds.segunda_linea ? [ds.segunda_linea] : [],
            operador_1: ds.operador_1,
            operador_2: ds.operador_2,
            operador_3: ds.operador_3,
            operador_4: ds.operador_4,
            operador_5: ds.operador_5,
            operador_6: ds.operador_6,
            operador_7: ds.operador_7,
            operador_8: ds.operador_8,
            status: ds.status,
            notes: ds.notes,
            migration_from: 'DailyMachineStaffing'
          });
          results.dailystaffingMigrated++;
        } catch (e) {
          results.errors.push({ type: 'DailyMachineStaffing migrate', id: ds.id, error: e.message });
        }
      }

      // Eliminar registros de entidades antiguas
      try {
        for (const mp of machineplan) {
          await base44.asServiceRole.entities.MachinePlanning.delete(mp.id);
        }
      } catch (e) {
        results.errors.push({ type: 'MachinePlanning delete', error: e.message });
      }

      try {
        for (const ds of dailystaff) {
          await base44.asServiceRole.entities.DailyMachineStaffing.delete(ds.id);
        }
      } catch (e) {
        results.errors.push({ type: 'DailyMachineStaffing delete', error: e.message });
      }
    } catch (e) {
      results.errors.push({ type: 'Planning consolidation', error: e.message });
    }

    return Response.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});