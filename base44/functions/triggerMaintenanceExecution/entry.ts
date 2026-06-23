import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { plan_id, responsible_id, immediate = false, complete = false, schedule_id, completion_data = {} } = body;

    // ── MODO COMPLETAR ──
    if (complete && schedule_id) {
      const schedule = await base44.asServiceRole.entities.MaintenanceSchedule.get(schedule_id);
      if (!schedule) return Response.json({ error: 'Schedule not found' }, { status: 404 });

      let machineName = completion_data.machine_name || '';
      let machineCodigo = completion_data.machine_codigo || '';
      if (schedule.machine_id) {
        try {
          const machine = await base44.asServiceRole.entities.MachineMasterDatabase.get(schedule.machine_id);
          if (machine) {
            machineName = machine.nombre || machineName;
            machineCodigo = machine.codigo_maquina || machineCodigo;
          }
        } catch (_) {}
      }

      const now = new Date();
      const inicio = schedule.fecha_inicio ? new Date(schedule.fecha_inicio) : now;
      const duracionMinutos = Math.round((now - inicio) / 60000);

      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const rand = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
      const numeroRegistro = `MR-${year}${month}-${rand}`;

      let tecnicoNombre = completion_data.tecnico_nombre || '';
      if (schedule.tecnico_asignado && !tecnicoNombre) {
        try {
          const emp = await base44.asServiceRole.entities.EmployeeMasterDatabase.get(schedule.tecnico_asignado);
          if (emp) tecnicoNombre = emp.nombre;
        } catch (_) {}
      }

      let proximaFechaCalculada = null;
      const pid = plan_id || schedule.maintenance_plan_id;
      if (pid) {
        try {
          const plan = await base44.asServiceRole.entities.MaintenancePlan.get(pid);
          if (plan) {
            const diasIntervalo = plan.dias_intervalo || 30;
            proximaFechaCalculada = addDays(now, diasIntervalo).toISOString().split('T')[0];
          }
        } catch (_) {}
      }

      const recordData = {
        numero_registro: numeroRegistro,
        machine_id: schedule.machine_id,
        machine_name: machineName,
        machine_codigo: machineCodigo,
        maintenance_plan_id: pid || null,
        maintenance_plan_nombre: completion_data.plan_nombre || schedule.descripcion || '',
        maintenance_schedule_id: schedule_id,
        tipo: schedule.tipo || 'Preventivo',
        periodicidad: completion_data.periodicidad || '',
        fecha_inicio: schedule.fecha_inicio || inicio.toISOString(),
        fecha_fin: now.toISOString(),
        duracion_minutos: duracionMinutos,
        tecnico_id: schedule.tecnico_asignado || null,
        tecnico_nombre: tecnicoNombre,
        ejecutado_por: user.email,
        tareas_realizadas: completion_data.tareas || [],
        observaciones: completion_data.observaciones || '',
        incidencias: completion_data.incidencias || '',
        materiales_usados: completion_data.materiales_usados || '',
        firma_tecnico: completion_data.firma_tecnico || '',
        firma_supervisor: completion_data.firma_supervisor || '',
        supervisor_nombre: completion_data.supervisor_nombre || '',
        estado: completion_data.incidencias ? 'Completado con incidencias' : 'Completado',
        proxima_fecha_calculada: proximaFechaCalculada,
        numero_orden: schedule.numero_orden || '',
      };

      const record = await base44.asServiceRole.entities.MaintenanceRecord.create(recordData);
      await base44.asServiceRole.entities.MaintenanceSchedule.update(schedule_id, {
        estado: 'Completado',
        fecha_fin: now.toISOString(),
      });

      return Response.json({ success: true, record, numero_registro: numeroRegistro, message: 'Mantenimiento completado y registrado' });
    }

    // ── MODO CREAR ORDEN ──
    if (!plan_id) return Response.json({ error: 'plan_id is required' }, { status: 400 });

    const plan = await base44.asServiceRole.entities.MaintenancePlan.get(plan_id);
    if (!plan) return Response.json({ error: 'Plan not found' }, { status: 404 });

    const now = new Date();
    const scheduledDate = immediate ? now : (plan.proxima_fecha ? new Date(plan.proxima_fecha) : now);
    const estado = immediate ? 'En Proceso' : 'Programado';

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

    if (immediate) scheduleData.fecha_inicio = now.toISOString();

    const created = await base44.asServiceRole.entities.MaintenanceSchedule.create(scheduleData);

    const diasIntervalo = plan.dias_intervalo || 30;
    const baseDate = immediate ? now : (plan.ultima_ejecucion ? new Date(plan.ultima_ejecucion) : now);
    const nextDate = addDays(baseDate, diasIntervalo);
    const updateData = { proxima_fecha: nextDate.toISOString().split('T')[0] };
    if (immediate) updateData.ultima_ejecucion = now.toISOString();

    await base44.asServiceRole.entities.MaintenancePlan.update(plan.id, updateData);

    return Response.json({
      success: true,
      schedule: created,
      next_date: nextDate.toISOString().split('T')[0],
      message: immediate ? 'Mantenimiento iniciado y orden de trabajo creada' : 'Orden de trabajo programada correctamente'
    });

  } catch (error) {
    console.error('Error en triggerMaintenanceExecution:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}