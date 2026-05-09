import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Genera automáticamente órdenes de trabajo basadas en planes de mantenimiento
 * Se ejecuta cuando hay planes próximos a ejecutarse
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Obtener todas las máquinas y planes activos
    const [machines, plans] = await Promise.all([
      base44.entities.MachineMasterDatabase.list(undefined, 500),
      base44.entities.MaintenancePlan.list()
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const workOrdersCreated = [];

    // Procesar cada plan
    for (const plan of plans) {
      if (!plan.activo || !plan.proxima_fecha) continue;

      const nextDate = new Date(plan.proxima_fecha);
      nextDate.setHours(0, 0, 0, 0);

      // Si la próxima fecha es hoy o ya pasó
      if (nextDate <= today) {
        // Verificar si ya existe una orden de trabajo pendiente para este plan
        const existingWorkOrder = await base44.entities.WorkOrder.filter?.({
          maintenance_plan_id: plan.id,
          status: { $in: ['Pendiente', 'En Progreso'] }
        }, '', 1) || [];

        if (!existingWorkOrder || existingWorkOrder.length === 0) {
          // Crear nueva orden de trabajo
          const workOrder = {
            order_number: `WO-${plan.id}-${Date.now()}`,
            machine_id: plan.machine_id,
            maintenance_plan_id: plan.id,
            priority: 2, // Prioridad media por defecto
            start_date: new Date().toISOString().split('T')[0],
            committed_delivery_date: addDays(new Date(), 1).toISOString().split('T')[0],
            status: 'Pendiente',
            notes: `Plan: ${plan.nombre_plan}. Descripción: ${plan.descripcion || 'Sin descripción'}`,
            product_name: plan.nombre_plan,
            client_name: 'Mantenimiento Interno'
          };

          try {
            const created = await base44.entities.WorkOrder.create(workOrder);
            workOrdersCreated.push({
              order_number: created.order_number,
              machine: plan.machine_name,
              plan: plan.nombre_plan
            });

            // Actualizar la próxima fecha del plan
            const daysInterval = plan.dias_intervalo || 30;
            const nextExecutionDate = addDays(new Date(plan.proxima_fecha), daysInterval);
            
            await base44.entities.MaintenancePlan.update(plan.id, {
              proxima_fecha: nextExecutionDate.toISOString().split('T')[0],
              ultima_ejecucion: new Date().toISOString()
            });
          } catch (err) {
            console.error(`Error creando orden para plan ${plan.id}:`, err.message);
          }
        }
      }
    }

    return Response.json({
      success: true,
      message: `Se generaron ${workOrdersCreated.length} órdenes de trabajo`,
      workOrders: workOrdersCreated,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en generateMaintenanceWorkOrders:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}