import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Migra procesos de MachineProcess a Machine.procesos_ids
 * Ejecutar una vez para migrar datos existentes
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const machines = await base44.asServiceRole.entities.Machine.list();
    const machineProcesses = await base44.asServiceRole.entities.MachineProcess.list();

    let migrated = 0;
    
    for (const machine of machines) {
      const relevantProcesses = machineProcesses
        .filter(mp => mp.machine_id === machine.id && mp.activo)
        .map(mp => mp.process_id);

      if (relevantProcesses.length > 0 && (!machine.procesos_ids || machine.procesos_ids.length === 0)) {
        await base44.asServiceRole.entities.Machine.update(machine.id, {
          procesos_ids: relevantProcesses
        });
        migrated++;
      }
    }

    return Response.json({
      success: true,
      migrated: migrated,
      total_machines: machines.length
    });

  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});