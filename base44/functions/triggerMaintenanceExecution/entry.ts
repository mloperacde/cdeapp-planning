import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Genera una MaintenanceSchedule (orden de trabajo) para un plan específico.
 * Si immediate=true → estado "En Proceso" (ejecución inmediata)
 * Si immediate=false → estado "Programado" (orden futura)
 * Parámetros: { plan_id, responsible_id, immediate }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { plan_id, responsible_id, immediate = false } = body;

    if (!plan_id) {
      return Response.json({ error: 'plan_id is required' }, { status: 400 });
    }

    // Obtener el plan
    const allPlans = await base44.entities.MaintenancePlan.filter({ id: plan_id });
    const plan = allPlans && allPlans[0];
    if (!plan) {
      return Response.json({ error: 'Plan not found' }, { status: 404 });
    }

    const now = new Date();
    const scheduledDate = immediate ? now : (plan.proxima_fecha ? new Date(plan.proxima_fecha) : now);
    const estado = immediate ? 'En Proceso' : 'Programado';

    // Crear MaintenanceSchedule (esto alimenta Kanban, Todos, Próximos, Alertas, Historial)
    const scheduleData = {
      machine_id: plan.machine_id,
      maintenance_plan_id: plan.id,
      tipo: plan.tipo || 'Preventivo',
      descripcion: `${plan.nombre_plan} - ${plan.periodicidad || ''}`,
      fecha_programada: scheduledDate.toISOString(),
      estado: estado,
      prioridad: immediate ? 'Alta' : 'Media',
      tecnico_asignado: responsible_id || null,
      notas: `Plan: ${plan.nombre_plan}\nPeriodicidad: ${plan.periodicidad || ''}\nIntervalo: ${plan.dias_intervalo || 30} días`,
    };

    if (immediate) {
      scheduleData.fecha_inicio = now.toISOString();
    }

    const created = await base44.entities.MaintenanceSchedule.create(scheduleData);

    // Actualizar fechas del plan
    const diasIntervalo = plan.dias_intervalo || 30;
    const nextDate = addDays(scheduledDate, diasIntervalo);
    const updateData = {
      proxima_fecha: nextDate.toISOString().split('T')[0],
    };
    if (immediate) {
      updateData.ultima_ejecucion = now.toISOString();
    }
    await base44.entities.MaintenancePlan.update(plan.id, updateData);

    return Response.json({
      success: true,
      schedule: created,
      next_date: nextDate.toISOString().split('T')[0],
      message: immediate
        ? 'Mantenimiento iniciado y orden de trabajo creada'
        : 'Orden de trabajo programada correctamente'
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