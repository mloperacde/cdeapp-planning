import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Usuario no autenticado' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Obtener todos los tipos de mantenimiento activos
    const maintenanceTypes = await base44.asServiceRole.entities.MaintenanceType.list();
    const activeTypes = maintenanceTypes.filter(mt => mt.activo !== false);

    // Obtener todas las máquinas del inventario
    const machines = await base44.asServiceRole.entities.MachineMasterDatabase.list();
    const machineMap = new Map(machines.map(m => [m.id, m]));

    // Obtener todos los planes de mantenimiento existentes
    const existingPlans = await base44.asServiceRole.entities.MaintenancePlan.list(undefined, 2000);

    // Crear índice: "typeId|machineId" -> plan
    const planIndex = new Map();
    for (const plan of existingPlans) {
      if (plan.maintenance_type_id && plan.machine_id) {
        planIndex.set(`${plan.maintenance_type_id}|${plan.machine_id}`, plan);
      }
    }

    let created = 0;
    let updated = 0;
    let deactivated = 0;
    const results = [];

    // Para cada tipo de mantenimiento activo, asegurarse de que existe un plan por cada máquina asignada
    for (const type of activeTypes) {
      const assignedMachineIds = type.machine_ids || [];

      for (const machineId of assignedMachineIds) {
        const machine = machineMap.get(machineId);
        if (!machine) continue;

        const key = `${type.id}|${machineId}`;
        const existingPlan = planIndex.get(key);

        if (existingPlan) {
          // Actualizar nombre si cambió
          const needsUpdate = existingPlan.machine_name !== machine.nombre ||
            existingPlan.nombre_plan !== type.nombre ||
            existingPlan.activo === false;

          if (needsUpdate) {
            await base44.asServiceRole.entities.MaintenancePlan.update(existingPlan.id, {
              machine_name: machine.nombre,
              nombre_plan: type.nombre,
              activo: true,
            });
            updated++;
          }
          results.push({ type: type.nombre, machine: machine.nombre, status: 'existing' });
        } else {
          // Crear nuevo plan para esta combinación tipo × máquina
          await base44.asServiceRole.entities.MaintenancePlan.create({
            maintenance_type_id: type.id,
            machine_id: machineId,
            machine_name: machine.nombre,
            nombre_plan: type.nombre,
            descripcion: type.descripcion || '',
            tipo: 'Preventivo',
            periodicidad: 'Mensual',
            dias_intervalo: 30,
            tareas: [],
            activo: true,
          });
          created++;
          results.push({ type: type.nombre, machine: machine.nombre, status: 'created' });
        }
      }
    }

    // Desactivar planes cuyo tipo ya no tiene asignada esa máquina
    for (const plan of existingPlans) {
      if (!plan.maintenance_type_id || !plan.machine_id) continue;
      const type = activeTypes.find(t => t.id === plan.maintenance_type_id);
      if (!type) continue; // tipo ya no activo - no tocamos
      const stillAssigned = (type.machine_ids || []).includes(plan.machine_id);
      if (!stillAssigned && plan.activo !== false) {
        await base44.asServiceRole.entities.MaintenancePlan.update(plan.id, { activo: false });
        deactivated++;
        results.push({ type: plan.nombre_plan, machine: plan.machine_name, status: 'deactivated' });
      }
    }

    return Response.json({
      success: true,
      message: `Sincronización completada`,
      syncedCount: created + updated,
      created,
      updated,
      deactivated,
      totalPlans: existingPlans.filter(p => p.activo !== false).length + created,
      details: results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});