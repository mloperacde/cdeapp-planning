import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Genera una orden de trabajo para un plan específico
 * Parámetros: { plan_id, responsible_id }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { plan_id, responsible_id } = body;

    if (!plan_id) {
      return Response.json({ error: 'plan_id is required' }, { status: 400 });
    }

    // Obtener el plan
    const plan = await base44.entities.MaintenancePlan.get?.(plan_id);
    if (!plan) {
      return Response.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Crear orden de trabajo
    const workOrder = {
      order_number: `MWO-${plan.id}-${Date.now()}`,
      machine_id: plan.machine_id,
      maintenance_plan_id: plan.id,
      priority: 3,
      start_date: new Date().toISOString().split('T')[0],
      committed_delivery_date: addDays(new Date(), 1).toISOString().split('T')[0],
      status: 'Pendiente',
      notes: `
Plan: ${plan.nombre_plan}
Tipo: ${plan.tipo}
Periodicidad: ${plan.periodicidad}
Descripción: ${plan.descripcion || 'Sin descripción'}
      `.trim(),
      product_name: plan.nombre_plan,
      client_name: 'Mantenimiento',
      tecnico_asignado: responsible_id || user.id
    };

    const created = await base44.entities.WorkOrder.create(workOrder);

    // Actualizar próxima fecha del plan
    const nextDate = addDays(new Date(plan.proxima_fecha), plan.dias_intervalo || 30);
    await base44.entities.MaintenancePlan.update(plan.id, {
      proxima_fecha: nextDate.toISOString().split('T')[0],
      ultima_ejecucion: new Date().toISOString()
    });

    return Response.json({
      success: true,
      workOrder: created,
      message: 'Orden de trabajo creada exitosamente'
    });
  } catch (error) {
    console.error('Error en triggerMaintenanceExecution:', error);
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