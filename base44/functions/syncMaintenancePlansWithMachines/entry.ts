import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Load all MaintenanceTypes + both machine sources in parallel
    const [maintenanceTypes, legacyMachines, inventoryMachines] = await Promise.all([
      base44.asServiceRole.entities.MaintenanceType.list(),
      base44.asServiceRole.entities.MachineMasterDatabase.list(),
      base44.asServiceRole.entities.Machine.list(undefined, 1000),
    ]);

    const activeTypes = maintenanceTypes.filter(mt => mt.activo !== false);

    // Build unified machine map (Machine entity takes precedence on name)
    const machineMap = new Map();
    for (const m of legacyMachines) machineMap.set(m.id, m);
    for (const m of inventoryMachines) machineMap.set(m.id, m);

    // Existing plans index: "typeId|machineId" -> plan
    const existingPlans = await base44.asServiceRole.entities.MaintenancePlan.list(undefined, 2000);
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

    for (const type of activeTypes) {
      const assignedMachineIds = type.machine_ids || [];

      for (const machineId of assignedMachineIds) {
        const machine = machineMap.get(machineId);
        if (!machine) continue;

        const machineName = machine.nombre || machine.nombre_maquina || '';
        const key = `${type.id}|${machineId}`;
        const existingPlan = planIndex.get(key);

        if (existingPlan) {
          const needsUpdate =
            existingPlan.machine_name !== machineName ||
            existingPlan.nombre_plan !== type.nombre ||
            existingPlan.activo === false;

          if (needsUpdate) {
            await base44.asServiceRole.entities.MaintenancePlan.update(existingPlan.id, {
              machine_name: machineName,
              nombre_plan: type.nombre,
              activo: true,
            });
            updated++;
          }
          results.push({ type: type.nombre, machine: machineName, status: 'existing' });
        } else {
          // Build tareas array from the MaintenanceType structure
          const tareasCreadas = [];
          for (let i = 1; i <= 6; i++) {
            const t = type[`tarea_${i}`];
            if (t?.nombre) {
              const subtareas = [];
              for (let j = 1; j <= 8; j++) {
                const st = t[`subtarea_${j}`];
                if (st?.titulo) subtareas.push({ titulo: st.titulo, completada: false });
              }
              tareasCreadas.push({
                titulo: t.nombre,
                descripcion: t.observaciones || '',
                completada: false,
                subtareas,
              });
            }
          }

          await base44.asServiceRole.entities.MaintenancePlan.create({
            maintenance_type_id: type.id,
            machine_id: machineId,
            machine_name: machineName,
            nombre_plan: type.nombre,
            descripcion: type.descripcion || '',
            tipo: 'Preventivo',
            periodicidad: 'Mensual',
            dias_intervalo: 30,
            tareas: tareasCreadas,
            activo: true,
          });
          created++;
          results.push({ type: type.nombre, machine: machineName, status: 'created' });
        }
      }
    }

    // Deactivate plans whose type no longer has this machine assigned
    for (const plan of existingPlans) {
      if (!plan.maintenance_type_id || !plan.machine_id) continue;
      const type = activeTypes.find(t => t.id === plan.maintenance_type_id);
      if (!type) continue;
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