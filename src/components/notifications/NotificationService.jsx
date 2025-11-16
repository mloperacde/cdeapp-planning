import { base44 } from "@/api/base44Client";

/**
 * Servicio centralizado de notificaciones push
 */

export async function sendPushNotification({
  destinatarioId,
  tipo,
  titulo,
  mensaje,
  prioridad = "media",
  referenciaTipo,
  referenciaId,
  accionUrl,
  datosAdicionales
}) {
  try {
    // Verificar preferencias del usuario
    const preferences = await base44.entities.NotificationPreference.filter({ user_id: destinatarioId });
    const pref = preferences[0];

    // Verificar si el usuario ha deshabilitado este tipo de notificación
    if (pref) {
      if (tipo === "mensaje" && !pref.mensajes_directos && !pref.mensajes_canales) return;
      if (tipo === "planificacion" && !pref.cambios_planificacion_maquinas) return;
      if (tipo === "ausencia" && !pref.ausencias_aprobadas && !pref.ausencias_rechazadas) return;
    }

    // Crear notificación
    await base44.entities.PushNotification.create({
      destinatario_id: destinatarioId,
      tipo,
      titulo,
      mensaje,
      prioridad,
      referencia_tipo: referenciaTipo,
      referencia_id: referenciaId,
      enviada_push: true,
      fecha_envio_push: new Date().toISOString(),
      accion_url: accionUrl,
      datos_adicionales: datosAdicionales
    });
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}

/**
 * Notificar cambio en planificación de máquinas
 */
export async function notifyMachinePlanningChange(machineId, teamKey, activated, employeeIds) {
  const machine = await base44.entities.Machine.filter({ id: machineId });
  if (!machine || machine.length === 0) return;

  const machineName = machine[0].nombre;
  
  for (const empId of employeeIds) {
    await sendPushNotification({
      destinatarioId: empId,
      tipo: "planificacion",
      titulo: activated ? "Máquina Activada" : "Máquina Desactivada",
      mensaje: `${machineName} ha sido ${activated ? 'activada' : 'desactivada'} en el planning`,
      prioridad: "alta",
      referenciaTipo: "MachinePlanning",
      referenciaId: machineId,
      accionUrl: "/machine-planning"
    });
  }
}

/**
 * Notificar aprobación/rechazo de ausencia
 */
export async function notifyAbsenceDecision(absenceId, employeeId, approved, comentario) {
  await sendPushNotification({
    destinatarioId: employeeId,
    tipo: "ausencia",
    titulo: approved ? "Ausencia Aprobada" : "Ausencia Rechazada",
    mensaje: comentario || `Tu solicitud de ausencia ha sido ${approved ? 'aprobada' : 'rechazada'}`,
    prioridad: approved ? "media" : "alta",
    referenciaTipo: "Absence",
    referenciaId: absenceId,
    accionUrl: "/absence-management"
  });
}

/**
 * Notificar nueva solicitud de ausencia a supervisores
 */
export async function notifySupervisorsAbsenceRequest(absenceId, employeeName) {
  // Obtener supervisores (usuarios con rol de supervisor/admin)
  const roleAssignments = await base44.entities.UserRoleAssignment.list();
  const roles = await base44.entities.UserRole.list();
  
  const supervisorRoles = roles.filter(r => 
    r.role_name === "Admin" || r.role_name === "Supervisor" || r.role_name === "Jefe de Turno"
  );
  
  const supervisorAssignments = roleAssignments.filter(assignment =>
    assignment.role_ids.some(roleId => 
      supervisorRoles.some(sr => sr.id === roleId)
    )
  );

  const employees = await base44.entities.Employee.list();
  
  for (const assignment of supervisorAssignments) {
    const employee = employees.find(e => e.email === assignment.user_email);
    if (employee) {
      await sendPushNotification({
        destinatarioId: employee.id,
        tipo: "ausencia",
        titulo: "Nueva Solicitud de Ausencia",
        mensaje: `${employeeName} ha solicitado una ausencia`,
        prioridad: "media",
        referenciaTipo: "Absence",
        referenciaId: absenceId,
        accionUrl: "/absence-management?tab=approval"
      });
    }
  }
}

/**
 * Notificar mensaje directo
 */
export async function notifyDirectMessage(senderId, recipientId, channelId, messagePreview) {
  const sender = await base44.entities.Employee.filter({ id: senderId });
  const senderName = sender[0]?.nombre || "Alguien";

  await sendPushNotification({
    destinatarioId: recipientId,
    tipo: "mensaje",
    titulo: `Mensaje de ${senderName}`,
    mensaje: messagePreview,
    prioridad: "media",
    referenciaTipo: "ChatMessage",
    referenciaId: channelId,
    accionUrl: `/messaging?channel=${channelId}`
  });
}