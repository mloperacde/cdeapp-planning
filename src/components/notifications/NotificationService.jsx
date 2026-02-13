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

/**
 * NOTIFICACIONES DE SALARIOS Y NÓMINAS
 */

/**
 * Notifica nueva solicitud de cambio salarial
 */
export async function notifySalaryChangeRequest(requestId, employeeName, requestType) {
  try {
    const employees = await base44.entities.EmployeeMasterDatabase.list();
    const hrTeam = employees.filter(e => 
      e.departamento === 'RRHH' || 
      e.puesto?.toLowerCase().includes('recursos humanos')
    );

    for (const hr of hrTeam) {
      await sendPushNotification({
        destinatarioId: hr.id,
        tipo: 'salario',
        titulo: '💰 Nueva Solicitud de Cambio Salarial',
        mensaje: `${employeeName} - ${requestType} pendiente de aprobación`,
        prioridad: 'alta',
        referenciaTipo: 'SalaryChangeRequest',
        referenciaId: requestId,
        accionUrl: '/SalaryManagement?tab=approvals'
      });
    }
  } catch (error) {
    console.error("Error notificando solicitud de cambio salarial:", error);
  }
}

/**
 * Notifica cambio salarial aprobado
 */
export async function notifySalaryChangeApproved(employeeId, employeeName, changeDescription) {
  try {
    await sendPushNotification({
      destinatarioId: employeeId,
      tipo: 'salario',
      titulo: '✅ Cambio Salarial Aprobado',
      mensaje: `Tu solicitud de ${changeDescription} ha sido aprobada`,
      prioridad: 'alta',
      accionUrl: '/SalaryManagement'
    });
  } catch (error) {
    console.error("Error notificando aprobación:", error);
  }
}

/**
 * Notifica cambio salarial rechazado
 */
export async function notifySalaryChangeRejected(employeeId, employeeName, changeDescription, reason) {
  try {
    await sendPushNotification({
      destinatarioId: employeeId,
      tipo: 'salario',
      titulo: '❌ Cambio Salarial Rechazado',
      mensaje: `Tu solicitud de ${changeDescription} ha sido rechazada. ${reason ? 'Motivo: ' + reason : ''}`,
      prioridad: 'alta',
      accionUrl: '/SalaryManagement'
    });
  } catch (error) {
    console.error("Error notificando rechazo:", error);
  }
}

/**
 * Notifica nóminas calculadas listas para validación
 */
export async function notifyPayrollCalculated(period, employeeCount) {
  try {
    const employees = await base44.entities.EmployeeMasterDatabase.list();
    const hrTeam = employees.filter(e => 
      e.departamento === 'RRHH' || 
      e.puesto?.toLowerCase().includes('recursos humanos')
    );

    for (const hr of hrTeam) {
      await sendPushNotification({
        destinatarioId: hr.id,
        tipo: 'nomina',
        titulo: '📊 Nóminas Calculadas',
        mensaje: `${employeeCount} nóminas de ${period} listas para validación`,
        prioridad: 'alta',
        referenciaTipo: 'PayrollRecord',
        accionUrl: '/SalaryManagement?tab=payroll'
      });
    }
  } catch (error) {
    console.error("Error notificando nóminas calculadas:", error);
  }
}

/**
 * Notifica anomalías en ausencias
 */
export async function notifyAbsenceAnomaly(employeeName, anomalyDescription) {
  try {
    const employees = await base44.entities.EmployeeMasterDatabase.list();
    const hrTeam = employees.filter(e => 
      e.departamento === 'RRHH' || 
      e.puesto?.toLowerCase().includes('recursos humanos')
    );

    for (const hr of hrTeam) {
      await sendPushNotification({
        destinatarioId: hr.id,
        tipo: 'alerta',
        titulo: '⚠️ Anomalía Detectada en Ausencias',
        mensaje: `${employeeName}: ${anomalyDescription}`,
        prioridad: 'media',
        accionUrl: '/AbsenceManagement'
      });
    }
  } catch (error) {
    console.error("Error notificando anomalía:", error);
  }
}

/**
 * Notifica mantenimiento del sistema
 */
export async function notifySystemMaintenance(message, startTime) {
  try {
    const employees = await base44.entities.EmployeeMasterDatabase.list();
    const hrTeam = employees.filter(e => 
      e.departamento === 'RRHH' || 
      e.puesto?.toLowerCase().includes('recursos humanos')
    );

    for (const hr of hrTeam) {
      await sendPushNotification({
        destinatarioId: hr.id,
        tipo: 'sistema',
        titulo: '🔧 Mantenimiento del Sistema',
        mensaje: `${message} - Inicio: ${startTime}`,
        prioridad: 'media'
      });
    }
  } catch (error) {
    console.error("Error notificando mantenimiento:", error);
  }
}

/**
 * Obtiene notificaciones de RRHH no leídas
 */
export async function getHRNotifications(employeeId) {
  try {
    const notifications = await base44.entities.PushNotification.filter({
      destinatario_id: employeeId,
      leida: false
    }, '-created_date', 100);
    
    return notifications.filter(n => 
      ['salario', 'nomina', 'alerta', 'sistema', 'ausencia'].includes(n.tipo)
    );
  } catch (error) {
    console.error("Error obteniendo notificaciones de RRHH:", error);
    return [];
  }
}