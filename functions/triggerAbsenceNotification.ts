import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const payload = await req.json();
    const { absence_id, action } = payload;

    if (!absence_id || !action) {
      return Response.json({ error: 'Missing absence_id or action' }, { status: 400 });
    }

    // Get absence details
    const absence = await base44.asServiceRole.entities.Absence.filter({ id: absence_id });
    if (!absence[0]) {
      return Response.json({ error: 'Absence not found' }, { status: 404 });
    }

    const abs = absence[0];

    // Get employee
    const employee = await base44.asServiceRole.entities.EmployeeMasterDatabase.filter({ 
      id: abs.employee_id 
    });
    
    if (!employee[0]) {
      return Response.json({ error: 'Employee not found' }, { status: 404 });
    }

    const emp = employee[0];

    let tipo, titulo, mensaje, prioridad;

    switch (action) {
      case 'approved':
        tipo = 'Ausencia Aprobada';
        titulo = '✅ Ausencia Aprobada';
        mensaje = `Tu solicitud de ${abs.motivo} ha sido aprobada`;
        prioridad = 'Alta';
        break;
      
      case 'rejected':
        tipo = 'Ausencia Rechazada';
        titulo = '❌ Ausencia Rechazada';
        mensaje = `Tu solicitud de ${abs.motivo} ha sido rechazada`;
        prioridad = 'Alta';
        break;
      
      case 'requested':
        tipo = 'Ausencia Solicitada';
        titulo = '📋 Nueva Solicitud de Ausencia';
        mensaje = `${emp.nombre} ha solicitado ${abs.motivo}`;
        prioridad = 'Media';
        
        // Notify managers/approvers
        const managers = await base44.asServiceRole.entities.EmployeeMasterDatabase.filter({
          departamento: emp.departamento,
          puesto: { $in: ['Jefe de Turno', 'Supervisor', 'Responsable RRHH'] }
        });
        
        for (const manager of managers) {
          if (manager.email) {
            await base44.asServiceRole.entities.PushNotification.create({
              employee_id: manager.id,
              user_email: manager.email,
              tipo,
              prioridad,
              titulo,
              mensaje,
              enlace: '/AbsenceManagement',
              datos_relacionados: { absence_id: abs.id }
            });
          }
        }

        return Response.json({ success: true, notified: managers.length });

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Send to employee
    if (emp.email && (action === 'approved' || action === 'rejected')) {
      await base44.asServiceRole.entities.PushNotification.create({
        employee_id: emp.id,
        user_email: emp.email,
        tipo,
        prioridad,
        titulo,
        mensaje,
        enlace: '/AbsenceManagement',
        datos_relacionados: { absence_id: abs.id }
      });
    }

    return Response.json({ success: true });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});