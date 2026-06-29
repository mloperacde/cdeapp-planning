import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Genera TODAS las órdenes de trabajo necesarias para cada plan activo,
 * cubriendo desde la última ejecución hasta 1 año en el futuro según periodicidad.
 * Evita duplicar órdenes ya existentes para la misma fecha/plan.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (!isAuthenticated) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    // machine_id opcional: si se pasa, solo genera para esa máquina
    const { machine_id = null, horizon_days = 365 } = body;

    // Cargar planes activos
    const allPlans = await base44.asServiceRole.entities.MaintenancePlan.list(undefined, 500);
    const plans = allPlans.filter(p =>
      p.activo !== false &&
      p.proxima_fecha &&
      p.dias_intervalo > 0 &&
      (!machine_id || p.machine_id === machine_id)
    );

    // Cargar órdenes existentes (MaintenanceSchedule) para detectar duplicados
    const existingSchedules = await base44.asServiceRole.entities.MaintenanceSchedule.list(undefined, 1000);

    // Índice de órdenes existentes por plan_id + fecha (día)
    const existingIndex = new Set();
    for (const s of existingSchedules) {
      if (s.maintenance_plan_id && s.fecha_programada) {
        const day = new Date(s.fecha_programada).toISOString().split('T')[0];
        existingIndex.add(`${s.maintenance_plan_id}__${day}`);
      }
    }

    // Cargar tipos de mantenimiento para extraer tareas
    const maintenanceTypes = await base44.asServiceRole.entities.MaintenanceType.list();
    const typeMap = {};
    for (const mt of maintenanceTypes) typeMap[mt.id] = mt;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizonDate = addDays(today, horizon_days);

    const created = [];
    const skipped = [];
    const errors = [];

    for (const plan of plans) {
      const diasIntervalo = plan.dias_intervalo;

      // Punto de partida: proxima_fecha ya calculada → ajustar al sábado más próximo
      let cursor = nextSaturday(new Date(plan.proxima_fecha));
      cursor.setHours(8, 0, 0, 0); // hora de inicio estándar

      // Si la fecha de partida es muy en el pasado (más de 1 año): arrancar desde hoy (sábado próximo)
      const onYearAgo = addDays(today, -365);
      if (cursor < onYearAgo) cursor = nextSaturday(new Date(today));

      // Extraer tareas del tipo de mantenimiento
      let tareasOrden = [];
      if (plan.maintenance_type_id && typeMap[plan.maintenance_type_id]) {
        const mt = typeMap[plan.maintenance_type_id];
        for (let i = 1; i <= 6; i++) {
          const t = mt[`tarea_${i}`];
          if (t?.nombre) {
            const subtareas = [];
            for (let j = 1; j <= 8; j++) {
              const st = t[`subtarea_${j}`];
              if (st?.titulo) subtareas.push({ titulo: st.titulo, completada: false });
            }
            tareasOrden.push({ titulo: t.nombre, descripcion: t.observaciones || '', completada: false, subtareas });
          }
        }
      }

      // Generar órdenes desde cursor hasta horizonte
      let generatedCount = 0;
      while (cursor <= horizonDate) {
        const dayKey = cursor.toISOString().split('T')[0];
        const key = `${plan.id}__${dayKey}`;

        if (!existingIndex.has(key)) {
          const isPast = cursor < today;
          const estado = isPast ? 'Pendiente' : 'Programado';
          const prioridad = isPast ? 'Alta' : 'Media';

          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const rand = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
          const numeroOrden = `OT-${year}${month}-${rand}`;

          try {
            const scheduleData = {
              machine_id: plan.machine_id,
              maintenance_plan_id: plan.id,
              maintenance_type_id: plan.maintenance_type_id || null,
              tipo: plan.tipo || 'Preventivo',
              descripcion: `${plan.nombre_plan} - ${plan.periodicidad || ''}`,
              fecha_programada: cursor.toISOString(),
              estado,
              prioridad,
              numero_orden: numeroOrden,
              notas: `Plan: ${plan.nombre_plan}\nPeriodicidad: ${plan.periodicidad || ''}\nIntervalo: ${diasIntervalo} días`,
              tareas: tareasOrden,
              alerta_activa: true,
              dias_anticipacion_alerta: 7,
            };

            await base44.asServiceRole.entities.MaintenanceSchedule.create(scheduleData);
            existingIndex.add(key); // evitar duplicado en siguiente iteración del mismo plan
            generatedCount++;
            created.push({ plan: plan.nombre_plan, machine_id: plan.machine_id, fecha: dayKey, orden: numeroOrden });
          } catch (err) {
            errors.push({ plan: plan.nombre_plan, fecha: dayKey, error: err.message });
          }
        } else {
          skipped.push(`${plan.nombre_plan} @ ${dayKey}`);
        }

        // Avanzar según intervalo y fijar al sábado más cercano
        cursor = nextSaturday(addDays(cursor, diasIntervalo));
      }

      // Actualizar proxima_fecha del plan a la siguiente fecha tras hoy
      if (generatedCount > 0 || cursor > today) {
        let newProxima = nextSaturday(new Date(plan.proxima_fecha));
        newProxima.setHours(0, 0, 0, 0);
        while (newProxima <= today) {
          newProxima = nextSaturday(addDays(newProxima, diasIntervalo));
        }
        try {
          await base44.asServiceRole.entities.MaintenancePlan.update(plan.id, {
            proxima_fecha: newProxima.toISOString().split('T')[0],
          });
        } catch (_) {}
      }
    }

    return Response.json({
      success: true,
      total_plans_processed: plans.length,
      orders_created: created.length,
      orders_skipped: skipped.length,
      errors: errors.length,
      created,
      error_details: errors,
      message: `Generadas ${created.length} órdenes de trabajo en ${plans.length} plan(es). ${skipped.length} ya existían.`,
    });

  } catch (error) {
    console.error('bulkGenerateWorkOrders error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Desplaza la fecha al próximo sábado (día 6). Si ya es sábado, no mueve.
function nextSaturday(date) {
  const result = new Date(date);
  const day = result.getDay(); // 0=Dom, 6=Sab
  if (day !== 6) {
    result.setDate(result.getDate() + ((6 - day + 7) % 7));
  }
  return result;
}