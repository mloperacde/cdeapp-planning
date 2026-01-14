import { base44 } from "@/api/base44Client";

/**
 * Crear notificación push avanzada
 */
export const createAdvancedNotification = async ({
  destinatarioId,
  tipo,
  titulo,
  mensaje,
  prioridad = "media",
  referenciaTipo = null,
  referenciaId = null,
  accionUrl = null,
  datosAdicionales = {}
}) => {
  try {
    const notification = await base44.entities.PushNotification.create({
      destinatario_id: destinatarioId,
      tipo,
      titulo,
      mensaje,
      prioridad,
      referencia_tipo: referenciaTipo,
      referencia_id: referenciaId,
      leida: false,
      enviada_push: false,
      accion_url: accionUrl,
      datos_adicionales: datosAdicionales
    });

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
};

/**
 * Notificar ausencia aprobada/rechazada (personalizada por tipo)
 */
export const notifyAbsenceDecisionAdvanced = async (absenceId, employeeId, approved, comentario, absenceType) => {
  try {
    const employees = await base44.entities.EmployeeMasterDatabase.list();
    const employee = employees.find(e => e.id === employeeId);
    
    if (!employee) return;

    const titulo = approved 
      ? `✅ ${absenceType?.nombre || 'Ausencia'} Aprobada`
      : `❌ ${absenceType?.nombre || 'Ausencia'} Rechazada`;

    let mensaje = approved
      ? `Tu solicitud de ${absenceType?.nombre || 'ausencia'} ha sido aprobada.`
      : `Tu solicitud de ${absenceType?.nombre || 'ausencia'} ha sido rechazada.`;
    
    if (comentario) {
      mensaje += ` Motivo: ${comentario}`;
    }

    // Prioridad basada en tipo
    let prioridad = "media";
    if (absenceType?.es_critica) prioridad = "urgente";
    if (!approved) prioridad = "alta";

    await createAdvancedNotification({
      destinatarioId: employeeId,
      tipo: "ausencia",
      titulo,
      mensaje,
      prioridad,
      referenciaTipo: "Absence",
      referenciaId: absenceId,
      accionUrl: "/absences",
      datosAdicionales: {
        absence_type: absenceType?.nombre,
        approved,
        comentario
      }
    });
  } catch (error) {
    console.error("Error notifying absence decision:", error);
  }
};

/**
 * Notificar vencimiento de contrato
 */
export const notifyContractExpiration = async (employeeId, daysUntilExpiration, expirationDate) => {
  try {
    const prioridad = daysUntilExpiration <= 15 ? "urgente" : daysUntilExpiration <= 30 ? "alta" : "media";
    
    await createAdvancedNotification({
      destinatarioId: employeeId,
      tipo: "sistema",
      titulo: "⚠️ Vencimiento de Contrato",
      mensaje: `Tu contrato vence en ${daysUntilExpiration} días (${expirationDate}). Por favor, contacta con RRHH.`,
      prioridad,
      referenciaTipo: "EmployeeMasterDatabase",
      referenciaId: employeeId,
      accionUrl: "/employee-profile",
      datosAdicionales: {
        days_until_expiration: daysUntilExpiration,
        expiration_date: expirationDate,
        notification_type: "contract_expiration"
      }
    });
  } catch (error) {
    console.error("Error notifying contract expiration:", error);
  }
};

/**
 * Notificar hito de antigüedad
 */
export const notifyEmployeeMilestone = async (employeeId, employeeName, years) => {
  try {
    const employees = await base44.entities.EmployeeMasterDatabase.list();
    const supervisors = employees.filter(e => 
      e.puesto?.toLowerCase().includes("supervisor") || 
      e.puesto?.toLowerCase().includes("gerente")
    );

    // Notificar al empleado
    await createAdvancedNotification({
      destinatarioId: employeeId,
      tipo: "sistema",
      titulo: "🎉 ¡Felicidades por tu Aniversario!",
      mensaje: `¡Felicidades ${employeeName}! Hoy cumples ${years} años trabajando con nosotros. ¡Gracias por tu dedicación!`,
      prioridad: "media",
      referenciaTipo: "EmployeeMasterDatabase",
      referenciaId: employeeId,
      datosAdicionales: {
        milestone_years: years,
        notification_type: "work_anniversary"
      }
    });

    // Notificar a supervisores
    for (const supervisor of supervisors) {
      await createAdvancedNotification({
        destinatarioId: supervisor.id,
        tipo: "sistema",
        titulo: `🎊 Aniversario Laboral - ${employeeName}`,
        mensaje: `${employeeName} cumple hoy ${years} años en la empresa.`,
        prioridad: "baja",
        referenciaTipo: "EmployeeMasterDatabase",
        referenciaId: employeeId,
        datosAdicionales: {
          employee_name: employeeName,
          milestone_years: years,
          notification_type: "work_anniversary_supervisor"
        }
      });
    }
  } catch (error) {
    console.error("Error notifying milestone:", error);
  }
};

/**
 * Notificar cambio de planificación
 */
export const notifyPlanningChange = async (employeeId, changeDescription, date) => {
  try {
    await createAdvancedNotification({
      destinatarioId: employeeId,
      tipo: "planificacion",
      titulo: "📅 Cambio en Planificación",
      mensaje: `${changeDescription} para el día ${date}.`,
      prioridad: "alta",
      accionUrl: "/planning",
      datosAdicionales: {
        change_date: date,
        notification_type: "planning_change"
      }
    });
  } catch (error) {
    console.error("Error notifying planning change:", error);
  }
};

/**
 * Notificar nuevo documento disponible
 */
export const notifyNewDocument = async (employeeIds, documentTitle, documentCategory) => {
  try {
    for (const employeeId of employeeIds) {
      await createAdvancedNotification({
        destinatarioId: employeeId,
        tipo: "documento",
        titulo: "📄 Nuevo Documento Disponible",
        mensaje: `Se ha publicado un nuevo documento: ${documentTitle} (${documentCategory})`,
        prioridad: "media",
        accionUrl: "/documents",
        datosAdicionales: {
          document_title: documentTitle,
          document_category: documentCategory,
          notification_type: "new_document"
        }
      });
    }
  } catch (error) {
    console.error("Error notifying new document:", error);
  }
};

/**
 * Notificar formación asignada
 */
export const notifyTrainingAssignment = async (employeeId, trainingTitle, dueDate) => {
  try {
    await createAdvancedNotification({
      destinatarioId: employeeId,
      tipo: "formacion",
      titulo: "📚 Formación Asignada",
      mensaje: `Se te ha asignado la formación: ${trainingTitle}. Fecha límite: ${dueDate}`,
      prioridad: "media",
      accionUrl: "/training",
      datosAdicionales: {
        training_title: trainingTitle,
        due_date: dueDate,
        notification_type: "training_assignment"
      }
    });
  } catch (error) {
    console.error("Error notifying training assignment:", error);
  }
};

/**
 * Notificar mantenimiento urgente
 */
export const notifyUrgentMaintenance = async (supervisorIds, machineName, maintenanceType) => {
  try {
    for (const supervisorId of supervisorIds) {
      await createAdvancedNotification({
        destinatarioId: supervisorId,
        tipo: "sistema",
        titulo: "🔧 Mantenimiento Urgente",
        mensaje: `La máquina ${machineName} requiere ${maintenanceType} de manera urgente.`,
        prioridad: "urgente",
        accionUrl: "/maintenance",
        datosAdicionales: {
          machine_name: machineName,
          maintenance_type: maintenanceType,
          notification_type: "urgent_maintenance"
        }
      });
    }
  } catch (error) {
    console.error("Error notifying urgent maintenance:", error);
  }
};

/**
 * Notificar solicitud de ausencia pendiente (en tiempo real)
 */
export const notifyAbsenceRequestRealtime = async (absenceId, employeeName, absenceType, startDate) => {
  try {
    // Obtener supervisores y admins
    const employees = await base44.entities.EmployeeMasterDatabase.list();
    const supervisors = employees.filter(e => 
      e.puesto?.toLowerCase().includes("supervisor") ||
      e.puesto?.toLowerCase().includes("jefe") ||
      e.puesto?.toLowerCase().includes("gerente")
    );

    for (const supervisor of supervisors) {
      await createAdvancedNotification({
        destinatarioId: supervisor.id,
        tipo: "ausencia",
        titulo: "🔔 Nueva Solicitud de Ausencia",
        mensaje: `${employeeName} ha solicitado ${absenceType?.nombre || 'una ausencia'} desde ${startDate}.`,
        prioridad: absenceType?.es_critica ? "urgente" : "alta",
        referenciaTipo: "Absence",
        referenciaId: absenceId,
        accionUrl: "/absence-management?tab=approval",
        datosAdicionales: {
          employee_name: employeeName,
          absence_type: absenceType?.nombre,
          start_date: startDate,
          requires_approval: absenceType?.requiere_aprobacion,
          notification_type: "absence_request"
        }
      });
    }
  } catch (error) {
    console.error("Error notifying absence request:", error);
  }
};

/**
 * Sistema automatizado de verificación de eventos
 */
export const checkAndNotifyEvents = async () => {
  try {
    const employees = await base44.entities.EmployeeMasterDatabase.list();
    const today = new Date();
    
    // Verificar contratos próximos a vencer
    for (const emp of employees) {
      if (emp.fecha_fin_contrato) {
        const expirationDate = new Date(emp.fecha_fin_contrato);
        const daysUntil = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
        
        if ([60, 30, 15, 7].includes(daysUntil)) {
          await notifyContractExpiration(
            emp.id, 
            daysUntil, 
            expirationDate.toLocaleDateString('es-ES')
          );
        }
      }

      // Verificar aniversarios laborales
      if (emp.fecha_alta) {
        const hireDate = new Date(emp.fecha_alta);
        const thisYearAnniversary = new Date(today.getFullYear(), hireDate.getMonth(), hireDate.getDate());
        
        if (today.toDateString() === thisYearAnniversary.toDateString()) {
          const years = today.getFullYear() - hireDate.getFullYear();
          if ([1, 5, 10, 15, 20, 25, 30].includes(years)) {
            await notifyEmployeeMilestone(emp.id, emp.nombre, years);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error checking events:", error);
  }
};

/**
 * Notificar discrepancia de asistencia (Alta Prioridad)
 */
export const notifyAttendanceDiscrepancy = async (incidentId, employeeName, issueType, severity) => {
  try {
    // Notify HR admins
    const employees = await base44.entities.EmployeeMasterDatabase.list();
    const hrAdmins = employees.filter(e => 
      e.departamento === 'RRHH'
    );

    for (const admin of hrAdmins) {
      await createAdvancedNotification({
        destinatarioId: admin.id,
        tipo: "alerta",
        titulo: "🚨 Discrepancia de Asistencia Detectada",
        mensaje: `Se ha detectado una discrepancia de severidad ${severity} para ${employeeName}: ${issueType}`,
        prioridad: "urgente",
        referenciaTipo: "AttendanceIncident",
        referenciaId: incidentId,
        accionUrl: "/attendance-management",
        datosAdicionales: {
          employee_name: employeeName,
          severity,
          issue_type: issueType,
          notification_type: "attendance_discrepancy"
        }
      });
    }
  } catch (error) {
    console.error("Error notifying attendance discrepancy:", error);
  }
};

export default {
  createAdvancedNotification,
  notifyAbsenceDecisionAdvanced,
  notifyContractExpiration,
  notifyEmployeeMilestone,
  notifyPlanningChange,
  notifyNewDocument,
  notifyTrainingAssignment,
  notifyUrgentMaintenance,
  notifyAbsenceRequestRealtime,
  notifyAttendanceDiscrepancy,
  checkAndNotifyEvents
};