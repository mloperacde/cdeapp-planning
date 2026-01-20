import { base44 } from "@/api/base44Client";
import { calculateVacationPendingBalance, removeAbsenceFromBalance } from "./VacationPendingCalculator";
import { updateEmployeeAbsenteeismDaily } from "./AbsenteeismCalculator";
import { notifyAbsenceRequestRealtime } from "../notifications/AdvancedNotificationService";
import { format } from "date-fns";
import { es } from "date-fns/locale";

async function getEmployeeVacationAbsences(employeeId, absenceTypes) {
  const vacationTypeIds = new Set(
    absenceTypes
      .filter(type => {
        const nombreLower = (type.nombre || "").toLowerCase();
        const catLower = (type.categoria_principal || "").toLowerCase();
        return nombreLower.includes("vacaciones") || catLower.includes("vacaciones");
      })
      .map(t => t.id)
  );

  if (vacationTypeIds.size === 0) return [];

  const allAbsences = await base44.entities.Absence.filter({ employee_id: employeeId });
  return allAbsences.filter(abs => vacationTypeIds.has(abs.absence_type_id));
}

/**
 * Updates the employee's availability status in the Employee entity.
 */
export const updateEmployeeAvailability = async (employeeId, disponibilidad, absenceData = {}) => {
  try {
    // Employee entity deprecada - solo usar EmployeeMasterDatabase
    await base44.entities.EmployeeMasterDatabase.update(employeeId, {
      disponibilidad,
      ausencia_inicio: absenceData.ausencia_inicio || null,
      ausencia_fin: absenceData.ausencia_fin || null,
      ausencia_motivo: absenceData.ausencia_motivo || null,
      incluir_en_planning: disponibilidad === "Disponible"
    });
  } catch (error) {
    console.error("Error updating employee availability:", error);
    // Don't throw here to avoid blocking the main flow if sync fails, but log it
  }
};

/**
 * Centralized function to create an absence.
 * Handles entity creation, availability update, vacation balance, and notifications.
 */
export const createAbsence = async (data, currentUser, employees, absenceTypes, vacations, holidays) => {
  const dataWithStatus = {
    ...data,
    estado_aprobacion: data.estado_aprobacion || 'Pendiente',
    solicitado_por: currentUser?.id || data.solicitado_por
  };

  // 1. Create Absence Record
  const result = await base44.entities.Absence.create(dataWithStatus);

  // 2. Update Employee Availability
  // Logic: If absence starts today or in the past and is not finished, mark as Ausente.
  // If it's a future absence, we don't mark as Ausente yet (usually a daily job handles this, but here we assume immediate effect if date matches)
  
  const now = new Date();
  const start = new Date(data.fecha_inicio);
  const end = data.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(data.fecha_fin);
  
  // Check if current moment is within the absence period
  if (now >= start && now <= end) {
      await updateEmployeeAvailability(data.employee_id, "Ausente", {
        ausencia_inicio: data.fecha_inicio,
        ausencia_fin: data.fecha_fin_desconocida ? null : data.fecha_fin,
        ausencia_motivo: data.motivo,
      });
  }

  // 3. Calculate Vacation Pending Balance if applicable
  const absenceType = absenceTypes.find(at => at.id === data.absence_type_id);
  if (absenceType) {
    const employeeVacations = await getEmployeeVacationAbsences(data.employee_id, absenceTypes);
    await calculateVacationPendingBalance(result, absenceType, vacations, holidays, employeeVacations);
  }

  // 4. Update Absenteeism Stats
  await updateEmployeeAbsenteeismDaily(data.employee_id);

  // 5. Send Notifications
  const employee = employees.find(e => e.id === data.employee_id);
  if (employee && absenceType) {
    try {
      await notifyAbsenceRequestRealtime(
        result.id, 
        employee.nombre, 
        absenceType, 
        format(new Date(data.fecha_inicio), "dd/MM/yyyy", { locale: es })
      );
    } catch (error) {
      console.error("Error sending notifications:", error);
    }
  }

  return result;
};

/**
 * Centralized function to update an absence.
 */
export const updateAbsence = async (id, data, currentUser, absenceTypes, vacations, holidays) => {
  // 1. Update Absence Record
  const result = await base44.entities.Absence.update(id, data);

  // 2. Update Employee Availability (Check if this update changes current status)
  const now = new Date();
  const start = new Date(data.fecha_inicio);
  const end = data.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(data.fecha_fin);

  if (now >= start && now <= end) {
      await updateEmployeeAvailability(data.employee_id, "Ausente", {
        ausencia_inicio: data.fecha_inicio,
        ausencia_fin: data.fecha_fin_desconocida ? null : data.fecha_fin,
        ausencia_motivo: data.motivo,
      });
  } else {
      // If the update moves the absence to the past or future, and the employee was marked absent due to this absence...
      // Ideally we should check if there are other overlapping absences, but for simplicity:
      // If we move it out of "now", we might want to set to "Disponible" IF this was the active absence.
      // This is complex to get right without querying all absences. 
      // For robustness: query all active absences for this employee.
      const activeAbsences = await base44.entities.Absence.filter({ 
          employee_id: data.employee_id,
          // Simple filter, ideally we filter in memory for date ranges
      });
      
      const isStillAbsent = activeAbsences.some(abs => {
          if (abs.id === id) return false; // Ignore self as we know self is not active
          const s = new Date(abs.fecha_inicio);
          const e = abs.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(abs.fecha_fin);
          return now >= s && now <= e;
      });

      if (!isStillAbsent) {
          await updateEmployeeAvailability(data.employee_id, "Disponible");
      }
  }

  // 3. Recalculate Vacation Balance (remove old and add new)
  await removeAbsenceFromBalance(id, data.employee_id, new Date(data.fecha_inicio).getFullYear());
  const absenceType = absenceTypes.find(at => at.id === data.absence_type_id);
  if (absenceType) {
    const employeeVacations = await getEmployeeVacationAbsences(data.employee_id, absenceTypes);
    await calculateVacationPendingBalance(result, absenceType, vacations, holidays, employeeVacations);
  }
  
  // 4. Update Absenteeism
  await updateEmployeeAbsenteeismDaily(data.employee_id);

  return result;
};

/**
 * Centralized function to delete an absence.
 */
export const deleteAbsence = async (absence, employees) => {
  // 1. Remove from balance
  const year = new Date(absence.fecha_inicio).getFullYear();
  await removeAbsenceFromBalance(absence.id, absence.employee_id, year);

  // 2. Delete Record
  await base44.entities.Absence.delete(absence.id);

  // 3. Update Availability
  // Check if there are other active absences
  const allAbsences = await base44.entities.Absence.list(); // Ideally filtered by employee
  const employeeAbsences = allAbsences.filter(a => a.employee_id === absence.employee_id && a.id !== absence.id);
  
  const now = new Date();
  const isStillAbsent = employeeAbsences.some(abs => {
      const s = new Date(abs.fecha_inicio);
      const e = abs.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(abs.fecha_fin);
      return now >= s && now <= e;
  });

  if (!isStillAbsent) {
    await updateEmployeeAvailability(absence.employee_id, "Disponible");
  }

  // 4. Update Absenteeism
  await updateEmployeeAbsenteeismDaily(absence.employee_id);
};