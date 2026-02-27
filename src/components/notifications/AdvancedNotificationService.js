
import { base44 } from "@/api/base44Client";

export const notifyAttendanceDiscrepancy = async (incidentId, employeeName, description, severity) => {
  console.log(`Notifying discrepancy: ${incidentId} - ${employeeName} - ${severity}`);
  try {
    /*
    await base44.integrations.Core.SendEmail({
      to: "rrhh@example.com",
      subject: `Incidencia de Asistencia: ${employeeName} (${severity})`,
      body: `Detalles: ${description}`
    });
    */
  } catch (e) {
    console.error("Failed to notify discrepancy", e);
  }
};

export const notifyAbsenceRequestRealtime = async (absenceId, employeeName, absenceType, startDate) => {
  console.log(`Notifying absence request: ${absenceId} - ${employeeName} - ${absenceType?.nombre} - ${startDate}`);
  try {
    /*
    await base44.integrations.Core.SendEmail({
      to: "rrhh@example.com",
      subject: `Nueva Solicitud de Ausencia: ${employeeName}`,
      body: `Tipo: ${absenceType?.nombre}\nFecha Inicio: ${startDate}`
    });
    */
  } catch (e) {
    console.error("Failed to notify absence request", e);
  }
};
