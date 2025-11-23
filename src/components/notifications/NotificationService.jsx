import { base44 } from "@/api/base44Client";

/**
 * Envía una notificación push general
 */
export async function sendPushNotification({
  destinatarioId,
  tipo,
  titulo,
  mensaje,
  prioridad = 'media',
  referenciaTipo = null,
  referenciaId = null,
  accionUrl = null,
  datosAdicionales = null
}) {
  try {
    await base44.entities.PushNotification.create({
      destinatario_id: destinatarioId,
      tipo,
      titulo,
      mensaje,
      prioridad,
      referencia_tipo: referenciaTipo,
      referencia_id: referenciaId,
      leida: false,
      enviada_push: true,
      fecha_envio_push: new Date().toISOString(),
      accion_url: accionUrl,
      datos_adicionales: datosAdicionales
    });
  } catch (error) {
    console.error("Error enviando push notification:", error);
  }
}

/**
 * Notifica cuando se recibe un mensaje directo
 */
export async function notifyDirectMessage(remitenteId, destinatarioId, channelId, mensajePreview) {
  const employees = await base44.entities.EmployeeMasterDatabase.list();
  const remitente = employees.find(e => e.id === remitenteId);
  
  await sendPushNotification({
    destinatarioId,
    tipo: 'mensaje',
    titulo: `Nuevo mensaje de ${remitente?.nombre || 'Usuario'}`,
    mensaje: mensajePreview,
    prioridad: 'media',
    referenciaTipo: 'ChatChannel',
    referenciaId: channelId,
    accionUrl: `/messaging?channel=${channelId}`
  });
}

/**
 * Notifica aprobación/rechazo de cambio de perfil
 */
export async function notifyProfileChangeResponse(employeeId, campo, estado, motivo = null) {
  const titulo = estado === 'Aprobado' 
    ? '✅ Cambio de Perfil Aprobado'
    : '❌ Cambio de Perfil Rechazado';
  
  const mensaje = estado === 'Aprobado'
    ? `Tu solicitud de cambio de ${campo} ha sido aprobada y aplicada.`
    : `Tu solicitud de cambio de ${campo} ha sido rechazada. ${motivo ? 'Motivo: ' + motivo : ''}`;

  await sendPushNotification({
    destinatarioId: employeeId,
    tipo: 'sistema',
    titulo,
    mensaje,
    prioridad: estado === 'Aprobado' ? 'media' : 'alta',
    referenciaTipo: 'ProfileChangeRequest',
    accionUrl: '/my-profile'
  });
}

/**
 * Notifica cumpleaños próximo
 */
export async function notifyUpcomingBirthday(employeeId, birthdayEmployeeName, date) {
  await sendPushNotification({
    destinatarioId: employeeId,
    tipo: 'calendario',
    titulo: '🎂 Próximo Cumpleaños',
    mensaje: `${birthdayEmployeeName} cumplirá años el ${date}`,
    prioridad: 'baja',
    accionUrl: '/employees'
  });
}

/**
 * Notifica aniversario laboral próximo
 */
export async function notifyUpcomingAnniversary(employeeId, anniversaryEmployeeName, years, date) {
  await sendPushNotification({
    destinatarioId: employeeId,
    tipo: 'calendario',
    titulo: '🎉 Próximo Aniversario',
    mensaje: `${anniversaryEmployeeName} cumplirá ${years} años en la empresa el ${date}`,
    prioridad: 'baja',
    accionUrl: '/employees'
  });
}

/**
 * Notifica nuevo documento disponible
 */
export async function notifyNewDocument(employeeId, documentName, documentId) {
  await sendPushNotification({
    destinatarioId: employeeId,
    tipo: 'documento',
    titulo: '📄 Nuevo Documento Disponible',
    mensaje: `Se ha publicado un nuevo documento: ${documentName}`,
    prioridad: 'media',
    referenciaTipo: 'Document',
    referenciaId: documentId,
    accionUrl: '/documents'
  });
}

/**
 * Notifica actualización en documento
 */
export async function notifyDocumentUpdate(employeeId, documentName, documentId) {
  await sendPushNotification({
    destinatarioId: employeeId,
    tipo: 'documento',
    titulo: '📝 Documento Actualizado',
    mensaje: `El documento "${documentName}" ha sido actualizado`,
    prioridad: 'media',
    referenciaTipo: 'Document',
    referenciaId: documentId,
    accionUrl: '/documents'
  });
}

/**
 * Notifica ausencia aprobada/rechazada
 */
export async function notifyAbsenceResponse(employeeId, estado, fechaInicio, motivo = null) {
  const titulo = estado === 'Aprobada' 
    ? '✅ Ausencia Aprobada'
    : '❌ Ausencia Rechazada';
  
  const mensaje = estado === 'Aprobada'
    ? `Tu solicitud de ausencia para el ${fechaInicio} ha sido aprobada.`
    : `Tu solicitud de ausencia ha sido rechazada. ${motivo ? 'Motivo: ' + motivo : ''}`;

  await sendPushNotification({
    destinatarioId: employeeId,
    tipo: 'ausencia',
    titulo,
    mensaje,
    prioridad: 'alta',
    accionUrl: '/mobile-absences'
  });
}

/**
 * Marca notificaciones como leídas
 */
export async function markNotificationsAsRead(notificationIds) {
  try {
    const promises = notificationIds.map(id => 
      base44.entities.PushNotification.update(id, {
        leida: true,
        fecha_leida: new Date().toISOString()
      })
    );
    await Promise.all(promises);
  } catch (error) {
    console.error("Error marcando notificaciones como leídas:", error);
  }
}

/**
 * Obtiene notificaciones no leídas de un usuario
 */
export async function getUnreadNotifications(employeeId) {
  try {
    const notifications = await base44.entities.PushNotification.filter({
      destinatario_id: employeeId,
      leida: false
    }, '-created_date');
    
    return notifications;
  } catch (error) {
    console.error("Error obteniendo notificaciones:", error);
    return [];
  }
}

/**
 * Notifica cambio en planificación de máquinas
 */
export async function notifyMachinePlanningChange(machineId, teamKey, activated, employeeIds) {
  try {
    const machines = await base44.entities.Machine.list();
    const machine = machines.find(m => m.id === machineId);
    
    const titulo = activated 
      ? `🟢 Máquina Activada: ${machine?.nombre || 'Máquina'}`
      : `🔴 Máquina Desactivada: ${machine?.nombre || 'Máquina'}`;
    
    const mensaje = activated
      ? `La máquina ${machine?.nombre} ha sido activada en el planning.`
      : `La máquina ${machine?.nombre} ha sido desactivada del planning.`;

    for (const empId of employeeIds) {
      await sendPushNotification({
        destinatarioId: empId,
        tipo: 'planificacion',
        titulo,
        mensaje,
        prioridad: 'media',
        referenciaTipo: 'MachinePlanning',
        referenciaId: machineId,
        accionUrl: '/machine-planning'
      });
    }
  } catch (error) {
    console.error("Error notificando cambio de planificación:", error);
  }
}

/**
 * Notifica a supervisores sobre nueva solicitud de ausencia
 */
export async function notifySupervisorsAbsenceRequest(absenceId, employeeName) {
  try {
    const employees = await base44.entities.EmployeeMasterDatabase.list();
    const supervisors = employees.filter(e => 
      e.departamento === 'RRHH' || 
      e.puesto?.toLowerCase().includes('supervisor') ||
      e.puesto?.toLowerCase().includes('jefe')
    );

    for (const supervisor of supervisors) {
      await sendPushNotification({
        destinatarioId: supervisor.id,
        tipo: 'ausencia',
        titulo: '📋 Nueva Solicitud de Ausencia',
        mensaje: `${employeeName} ha solicitado una ausencia pendiente de aprobación`,
        prioridad: 'alta',
        referenciaTipo: 'Absence',
        referenciaId: absenceId,
        accionUrl: '/employees?tab=absences'
      });
    }
  } catch (error) {
    console.error("Error notificando a supervisores:", error);
  }
}