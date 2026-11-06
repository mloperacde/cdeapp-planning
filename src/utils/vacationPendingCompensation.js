import { base44 } from "@/api/base44Client";
import { eachDayOfInterval, format, isWeekend } from "date-fns";
import {
  consumeVacationPendingForAbsence,
  removeVacationPendingConsumptionForAbsence,
} from "@/components/absences/VacationPendingCalculator";

const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Días laborables de la ausencia (excluye fines de semana y festivos).
 */
export function countCompensationDays(startValue, endValue, holidays = []) {
  const start = toDate(startValue);
  const end = toDate(endValue);
  if (!start || !end || end < start) return 0;

  const holidaySet = new Set(
    (holidays || [])
      .map((h) => (h?.date ? format(new Date(h.date), "yyyy-MM-dd") : null))
      .filter(Boolean)
  );

  return eachDayOfInterval({ start, end }).filter((day) => {
    if (isWeekend(day)) return false;
    return !holidaySet.has(format(day, "yyyy-MM-dd"));
  }).length;
}

/**
 * Días disponibles sumando todos los saldos de vacaciones pendientes del empleado.
 */
export function sumPendingVacationDays(balances = []) {
  return (balances || []).reduce(
    (sum, b) => sum + ((b?.dias_pendientes || 0) - (b?.dias_consumidos || 0)),
    0
  );
}

export async function getVacationCompensationSummary(employeeId, startValue, endValue) {
  if (!employeeId) {
    return { dias_requeridos: 0, dias_disponibles: 0, suficiente: false, holidays: [] };
  }

  const [holidays, balances] = await Promise.all([
    base44.entities.Holiday.list(),
    base44.entities.VacationPendingBalance.filter({ employee_id: employeeId }),
  ]);

  const diasRequeridos = countCompensationDays(startValue, endValue, holidays);
  const diasDisponibles = sumPendingVacationDays(balances);

  return {
    dias_requeridos: diasRequeridos,
    dias_disponibles: diasDisponibles,
    suficiente: diasRequeridos > 0 && diasRequeridos <= diasDisponibles,
    holidays,
  };
}

/**
 * Descuenta del saldo de vacaciones pendientes los días de la ausencia y
 * guarda la trazabilidad en la propia ausencia. Devuelve el resumen aplicado.
 */
export async function applyVacationCompensation(absence, appliedBy) {
  if (!absence?.id || !absence?.employee_id) return null;

  // Si la fecha de fin es desconocida se compensa únicamente el día de inicio
  const absenceToConsume = {
    ...absence,
    fecha_fin: absence.fecha_fin_desconocida ? absence.fecha_inicio : absence.fecha_fin,
  };

  const holidays = await base44.entities.Holiday.list();

  // Idempotencia: si ya existía un consumo previo de esta ausencia, se recalcula
  await removeVacationPendingConsumptionForAbsence(absence.id, absence.employee_id);

  const antes = await base44.entities.VacationPendingBalance.filter({
    employee_id: absence.employee_id,
  });
  const disponiblesAntes = sumPendingVacationDays(antes);

  const consumo = await consumeVacationPendingForAbsence(absenceToConsume, holidays);
  const diasCompensados = consumo?.dias_consumidos || 0;

  const despues = await base44.entities.VacationPendingBalance.filter({
    employee_id: absence.employee_id,
  });
  const disponiblesDespues = sumPendingVacationDays(despues);

  const registro = {
    aplicada: true,
    dias_compensados: diasCompensados,
    dias_disponibles_antes: disponiblesAntes,
    dias_disponibles_despues: disponiblesDespues,
    fecha_aplicacion: new Date().toISOString(),
    aplicado_por: appliedBy || "",
  };

  await base44.entities.Absence.update(absence.id, {
    compensacion_vacaciones_pendientes: true,
    dias_vacaciones_compensados: diasCompensados,
    compensacion_vacaciones: registro,
  });

  return registro;
}