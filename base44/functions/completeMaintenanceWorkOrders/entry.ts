import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Obtener todos los empleados
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 500);
    
    const angelMolpeceres = employees.find(e => 
      e.nombre?.toUpperCase().includes('ANGEL') && e.nombre?.toUpperCase().includes('MOLPECERES')
    );
    const martinLopera = employees.find(e => 
      e.nombre?.toUpperCase().includes('MARTIN') && e.nombre?.toUpperCase().includes('LOPERA')
    );

    // Obtener todas las órdenes de trabajo
    const allSchedules = await base44.asServiceRole.entities.MaintenanceSchedule.list(undefined, 500);
    
    // Filtrar aquellas que necesitan completarse
    const schedulesToComplete = allSchedules.filter(s => 
      ['Pendiente', 'Programado', 'En Proceso'].includes(s.estado)
    );

    console.log(`Completando ${schedulesToComplete.length} órdenes de trabajo`);

    // Actualizar en lotes de 50
    const batchSize = 50;
    let completed = 0;

    for (let i = 0; i < schedulesToComplete.length; i += batchSize) {
      const batch = schedulesToComplete.slice(i, i + batchSize);
      
      const updates = batch.map(schedule => {
        const completedTareas = (schedule.tareas || []).map(tarea => ({
          ...tarea,
          completada: true,
          subtareas: (tarea.subtareas || []).map(st => ({
            ...st,
            completada: true
          }))
        }));

        return {
          id: schedule.id,
          estado: 'Completado',
          tareas: completedTareas,
          fecha_finalizacion: new Date().toISOString(),
          fecha_fin: new Date().toISOString(),
          revisado_por: angelMolpeceres?.id,
          verificado_por: martinLopera?.id
        };
      });

      // Usar bulkUpdate para actualizar el lote
      try {
        await base44.asServiceRole.entities.MaintenanceSchedule.bulkUpdate(updates);
        completed += updates.length;
        console.log(`Lote ${Math.floor(i / batchSize) + 1}: ${updates.length} órdenes completadas`);
      } catch (err) {
        console.error(`Error en lote ${Math.floor(i / batchSize) + 1}:`, err.message);
      }
    }

    return Response.json({
      success: true,
      completed,
      supervisedBy: angelMolpeceres?.nombre || 'No encontrado',
      validatedBy: martinLopera?.nombre || 'No encontrado'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});