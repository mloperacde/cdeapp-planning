import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Solo administradores pueden sincronizar planes de mantenimiento' }, { status: 403 });
    }

    // Obtener todas las máquinas del inventario
    const machines = await base44.asServiceRole.entities.MachineMasterDatabase.list();
    
    // Obtener todos los planes de mantenimiento
    const plans = await base44.asServiceRole.entities.MaintenancePlan.list();

    // Sincronizar: actualizar máquinas en planes activos
    let syncCount = 0;
    const syncResults = [];

    for (const plan of plans) {
      if (!plan.activo) continue;

      // Validar que la máquina del plan existe en el inventario
      const machineExists = machines.some(m => m.id === plan.machine_id);
      
      if (!machineExists) {
        syncResults.push({
          plan_id: plan.id,
          plan_name: plan.nombre_plan,
          status: 'warning',
          message: 'Máquina no encontrada en inventario'
        });
        continue;
      }

      // Actualizar referencia de máquina en el plan si es necesario
      const machine = machines.find(m => m.id === plan.machine_id);
      if (machine && plan.machine_name !== machine.nombre) {
        await base44.asServiceRole.entities.MaintenancePlan.update(plan.id, {
          machine_name: machine.nombre
        });
        syncCount++;
      }

      syncResults.push({
        plan_id: plan.id,
        plan_name: plan.nombre_plan,
        machine_id: plan.machine_id,
        machine_name: machine?.nombre,
        status: 'synced'
      });
    }

    return Response.json({
      success: true,
      message: `Se sincronizaron ${syncCount} planes de mantenimiento`,
      syncedCount: syncCount,
      totalPlans: plans.filter(p => p.activo).length,
      details: syncResults
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});