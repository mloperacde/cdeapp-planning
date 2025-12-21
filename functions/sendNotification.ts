import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { 
      employee_ids, 
      user_emails,
      tipo, 
      prioridad = 'Media',
      titulo, 
      mensaje, 
      enlace,
      icono,
      datos_relacionados,
      check_preferences = true
    } = payload;

    if (!tipo || !titulo || !mensaje) {
      return Response.json({ 
        error: 'Missing required fields: tipo, titulo, mensaje' 
      }, { status: 400 });
    }

    if (!employee_ids && !user_emails) {
      return Response.json({ 
        error: 'Must provide either employee_ids or user_emails' 
      }, { status: 400 });
    }

    // Get employees
    let employees = [];
    if (employee_ids) {
      employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.filter({
        id: { $in: employee_ids }
      });
    } else if (user_emails) {
      employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.filter({
        email: { $in: user_emails }
      });
    }

    // Check quiet hours and preferences
    const categoryMap = {
      'Ausencia': 'absences',
      'Planning': 'planning',
      'Mantenimiento': 'maintenance',
      'Máquina': 'machines',
      'Empleado': 'employees',
      'Sistema': 'system',
      'Alerta': 'system'
    };

    const category = Object.keys(categoryMap).find(key => tipo.includes(key)) || 'system';
    const categoryKey = categoryMap[category];

    const notifications = [];
    const currentHour = new Date().getHours();
    const currentMinutes = new Date().getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinutes;

    for (const emp of employees) {
      let shouldSend = true;

      if (check_preferences && emp.email) {
        // Check user preferences
        const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
          user_email: emp.email
        });

        if (prefs[0]) {
          const pref = prefs[0];
          
          // Check if category is enabled
          if (!pref.notification_types?.[categoryKey]?.enabled) {
            shouldSend = false;
          }

          // Check quiet hours (unless critical)
          if (shouldSend && prioridad !== 'Crítica' && pref.quiet_hours?.enabled) {
            const [startH, startM] = pref.quiet_hours.start.split(':').map(Number);
            const [endH, endM] = pref.quiet_hours.end.split(':').map(Number);
            const startInMinutes = startH * 60 + startM;
            const endInMinutes = endH * 60 + endM;

            if (startInMinutes > endInMinutes) {
              // Crosses midnight
              if (currentTimeInMinutes >= startInMinutes || currentTimeInMinutes < endInMinutes) {
                shouldSend = false;
              }
            } else {
              if (currentTimeInMinutes >= startInMinutes && currentTimeInMinutes < endInMinutes) {
                shouldSend = false;
              }
            }
          }
        }
      }

      if (shouldSend) {
        const notification = await base44.asServiceRole.entities.PushNotification.create({
          employee_id: emp.id,
          user_email: emp.email,
          tipo,
          prioridad,
          titulo,
          mensaje,
          enlace: enlace || null,
          icono: icono || null,
          datos_relacionados: datos_relacionados || null,
          enviado_por: user.email,
          leida: false
        });

        notifications.push(notification);
      }
    }

    return Response.json({ 
      success: true, 
      sent: notifications.length,
      notifications 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});