import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Obtener todas las órdenes de trabajo
    const allSchedules = await base44.asServiceRole.entities.MaintenanceSchedule.list(undefined, 500);
    
    const now = new Date();
    const toUpdate = [];

    // Identificar órdenes completadas cuya fecha aún no ha llegado
    for (const schedule of allSchedules) {
      if (schedule.estado === 'Completado' && schedule.fecha_programada) {
        const scheduledDate = new Date(schedule.fecha_programada);
        if (scheduledDate > now) {
          toUpdate.push({
            id: schedule.id,
            estado: 'Programado'
          });
        }
      }
    }

    console.log(`Cambiando estado de ${toUpdate.length} mantenimientos a "Programado"`);

    // Actualizar en lotes
    const batchSize = 50;
    let updated = 0;

    for (let i = 0; i < toUpdate.length; i += batchSize) {
      const batch = toUpdate.slice(i, i + batchSize);
      try {
        await base44.asServiceRole.entities.MaintenanceSchedule.bulkUpdate(batch);
        updated += batch.length;
        console.log(`Lote ${Math.floor(i / batchSize) + 1}: ${batch.length} estados corregidos`);
      } catch (err) {
        console.error(`Error en lote:`, err.message);
      }
    }

    return Response.json({
      success: true,
      corrected: updated
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});