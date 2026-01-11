import { base44 } from "@/api/base44Client";
import { differenceInHours, eachDayOfInterval, isWeekend, startOfYear, endOfYear } from "date-fns";

/**
 * Calcula la tasa de absentismo para un empleado
 * Fórmula: (Total horas no trabajadas / Total horas que se deberían haber trabajado) × 100
 * OPTIMIZADO: Recibe datos precargados para evitar llamadas repetidas
 */
export async function calculateEmployeeAbsenteeism(employeeId, startDate, endDate, preloadedData = {}) {
  const { employees, absences, vacations, holidays } = preloadedData;
  
  // Usar datos precargados si existen, sino cargar (fallback)
  const emp = employees 
    ? employees.find(e => e.id === employeeId)
    : (await base44.entities.EmployeeMasterDatabase.filter({ id: employeeId }))[0];
    
  if (!emp) return null;
  
  // Usar ausencias precargadas si existen
  const allAbsences = absences || await base44.entities.Absence.filter({ employee_id: employeeId });
  
  // Filtrar ausencias que caen en el rango y excluir vacaciones/festivos
  const relevantAbsences = allAbsences.filter(abs => {
    if (abs.employee_id !== employeeId) return false;
    const absStart = new Date(abs.fecha_inicio);
    const absEnd = abs.fecha_fin_desconocida ? endDate : new Date(abs.fecha_fin);
    return absEnd >= startDate && absStart <= endDate;
  });

  // Usar datos precargados de vacaciones y festivos
  const allVacations = vacations || await base44.entities.Vacation.list();
  const allHolidays = holidays || await base44.entities.Holiday.list();

  // Calcular horas no trabajadas (excluyendo vacaciones y festivos)
  let horasNoTrabajadas = 0;
  
  for (const absence of relevantAbsences) {
    const absStart = new Date(absence.fecha_inicio) < startDate ? startDate : new Date(absence.fecha_inicio);
    const absEnd = absence.fecha_fin_desconocida ? new Date() : (new Date(absence.fecha_fin) > endDate ? endDate : new Date(absence.fecha_fin));
    
    const days = eachDayOfInterval({ start: absStart, end: absEnd });
    
    for (const day of days) {
      // Skip weekends
      if (isWeekend(day)) continue;
      
      // Check if day is in vacation period
      const isVacationDay = allVacations.some(vac => {
        const vacStart = new Date(vac.start_date);
        const vacEnd = new Date(vac.end_date);
        return day >= vacStart && day <= vacEnd;
      });
      
      // Check if day is holiday
      const isHoliday = allHolidays.some(hol => {
        const holDate = new Date(hol.date);
        return day.toDateString() === holDate.toDateString();
      });
      
      // Only count if not vacation or holiday
      if (!isVacationDay && !isHoliday) {
        horasNoTrabajadas += (emp.num_horas_jornada || 40) / 5; // Dividir horas semanales entre 5 días laborables
      }
    }
  }

  // Calcular horas que deberían haberse trabajado
  const totalDays = eachDayOfInterval({ start: startDate, end: endDate });
  let horasDeberianTrabajarse = 0;

  for (const day of totalDays) {
    if (isWeekend(day)) continue;
    
    const isVacationDay = allVacations.some(vac => {
      const vacStart = new Date(vac.start_date);
      const vacEnd = new Date(vac.end_date);
      return day >= vacStart && day <= vacEnd;
    });
    
    const isHoliday = allHolidays.some(hol => {
      const holDate = new Date(hol.date);
      return day.toDateString() === holDate.toDateString();
    });
    
    if (!isVacationDay && !isHoliday) {
      horasDeberianTrabajarse += (emp.num_horas_jornada || 40) / 5;
    }
  }

  // Calcular tasa de absentismo
  const tasaAbsentismo = horasDeberianTrabajarse > 0 
    ? (horasNoTrabajadas / horasDeberianTrabajarse) * 100 
    : 0;

  return {
    tasaAbsentismo: Math.round(tasaAbsentismo * 100) / 100,
    horasNoTrabajadas: Math.round(horasNoTrabajadas * 100) / 100,
    horasDeberianTrabajarse: Math.round(horasDeberianTrabajarse * 100) / 100
  };
}

/**
 * Calcula la tasa de absentismo global de todos los empleados
 * OPTIMIZADO: Carga datos una sola vez y los reutiliza
 */
export async function calculateGlobalAbsenteeism(startDate, endDate, preloadedData = {}) {
  // Cargar TODOS los datos una sola vez
  const employees = preloadedData.employees || await base44.entities.EmployeeMasterDatabase.list();
  const absences = preloadedData.absences || await base44.entities.Absence.list();
  const vacations = preloadedData.vacations || await base44.entities.Vacation.list();
  const holidays = preloadedData.holidays || await base44.entities.Holiday.list();
  
  let totalHorasNoTrabajadas = 0;
  let totalHorasDeberianTrabajarse = 0;

  // Pasar datos precargados a cada cálculo individual
  const sharedData = { employees, absences, vacations, holidays };

  for (const emp of employees) {
    const result = await calculateEmployeeAbsenteeism(emp.id, startDate, endDate, sharedData);
    if (result) {
      totalHorasNoTrabajadas += result.horasNoTrabajadas;
      totalHorasDeberianTrabajarse += result.horasDeberianTrabajarse;
    }
  }

  const tasaAbsentismoGlobal = totalHorasDeberianTrabajarse > 0
    ? (totalHorasNoTrabajadas / totalHorasDeberianTrabajarse) * 100
    : 0;

  return {
    tasaAbsentismoGlobal: Math.round(tasaAbsentismoGlobal * 100) / 100,
    totalHorasNoTrabajadas: Math.round(totalHorasNoTrabajadas * 100) / 100,
    totalHorasDeberianTrabajarse: Math.round(totalHorasDeberianTrabajarse * 100) / 100
  };
}

/**
 * Actualiza diariamente el absentismo de un empleado
 * OPTIMIZADO: Usa datos precargados si están disponibles
 */
export async function updateEmployeeAbsenteeismDaily(employeeId, preloadedData = {}) {
  const now = new Date();
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);

  const result = await calculateEmployeeAbsenteeism(employeeId, yearStart, now, preloadedData);
  
  if (result) {
    await base44.entities.EmployeeMasterDatabase.update(employeeId, {
      tasa_absentismo: result.tasaAbsentismo,
      horas_no_trabajadas: result.horasNoTrabajadas,
      horas_deberian_trabajarse: result.horasDeberianTrabajarse,
      ultima_actualizacion_absentismo: now.toISOString().split('T')[0]
    });
  }

  return result;
}