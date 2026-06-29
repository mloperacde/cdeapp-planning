import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Lista de técnicos a asignar
    const technicianNames = [
      'ALEXEI MENENDEZ',
      'JORGE ANTONIO LOZANO CAEROLS',
      'MIGUEL ANGEL GONZALEZ RODRIGUEZ',
      'JUAN CARLOS HERRANZ SANZ',
      'JUAN JOSE PÉREZ JAIME',
      'JUAN JOSE RODRIGUEZ GARCIA',
      'TAMARA CEBALLOS ESTEVEZ'
    ];

    // Obtener todos los empleados
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 500);
    
    // Mapear técnicos por nombre
    const technicians = technicianNames
      .map(name => {
        const emp = employees.find(e => e.nombre?.toUpperCase().includes(name.toUpperCase()));
        return emp ? { id: emp.id, nombre: emp.nombre } : null;
      })
      .filter(t => t !== null);

    console.log(`Técnicos encontrados: ${technicians.length}`);
    technicians.forEach(t => console.log(`  - ${t.nombre}`));

    // Obtener todas las órdenes completadas sin técnico
    const allSchedules = await base44.asServiceRole.entities.MaintenanceSchedule.list(undefined, 500);
    const completedWithoutTechnician = allSchedules.filter(s => 
      s.estado === 'Completado' && !s.tecnico_asignado
    );

    console.log(`Órdenes completadas sin técnico: ${completedWithoutTechnician.length}`);

    // Función para seleccionar técnico aleatorio
    const getRandomTechnician = () => {
      return technicians[Math.floor(Math.random() * technicians.length)];
    };

    // Preparar actualizaciones
    const updates = completedWithoutTechnician.map(schedule => {
      const technician = getRandomTechnician();
      return {
        id: schedule.id,
        tecnico_asignado: technician.id
      };
    });

    // Actualizar en lotes
    const batchSize = 50;
    let assigned = 0;

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      try {
        await base44.asServiceRole.entities.MaintenanceSchedule.bulkUpdate(batch);
        assigned += batch.length;
        console.log(`Lote ${Math.floor(i / batchSize) + 1}: ${batch.length} técnicos asignados`);
      } catch (err) {
        console.error(`Error en lote:`, err.message);
      }
    }

    return Response.json({
      success: true,
      assigned,
      techniciansUsed: technicians.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});