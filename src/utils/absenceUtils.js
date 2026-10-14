import { format } from "date-fns";

/**
 * Determina si una ausencia es auto-detectada por el sistema (Cuco360/shiftAudit).
 *
 * Solo se considera "auto-detectada" si está Pendiente (sin clasificar por RRHH).
 * Una vez aprobada/rechazada/cancelada, se trata como ausencia formal para
 * estadísticas, informes y exportación de nómina.
 *
 * Esto permite que las ausencias justificadas desde la bandeja de detección
 * cuenten en todas las estadísticas igual que las registradas manualmente.
 */
export const isAutoAbsence = (abs) => {
  if (!abs) return false;
  if (abs.estado_aprobacion !== 'Pendiente') return false;
  return abs.motivo === 'Ausencia no comunicada - detección automática' ||
    abs.motivo === 'Ausencia detectada automáticamente por análisis de presencia' ||
    (abs.notas && (
      abs.notas.startsWith('[SISTEMA]') ||
      abs.notas.startsWith('[shiftAudit]') ||
      abs.notas.startsWith('Creado automáticamente')
    ));
};

/**
 * Versión "cruda" — identifica ausencias auto-detectadas sin importar el estado.
 * Útil para marcar visualmente el origen (icono bot) en listados históricos.
 */
export const wasAutoDetected = (abs) => {
  if (!abs) return false;
  return abs.motivo === 'Ausencia no comunicada - detección automática' ||
    abs.motivo === 'Ausencia detectada automáticamente por análisis de presencia' ||
    (abs.notas && (
      abs.notas.startsWith('[SISTEMA]') ||
      abs.notas.startsWith('[shiftAudit]') ||
      abs.notas.startsWith('Creado automáticamente')
    ));
};

/**
 * Recorta una ausencia a una ventana de fechas (null si fuera de rango)
 */
export const clipInterval = (abs, winStart, winEnd) => {
  if (!abs.fecha_inicio) return null;
  const absStart = new Date(abs.fecha_inicio);
  const absEnd = (abs.fecha_fin_desconocida || !abs.fecha_fin) ? winEnd : new Date(abs.fecha_fin);
  const start = absStart < winStart ? winStart : absStart;
  const end = absEnd > winEnd ? winEnd : absEnd;
  if (end < start) return null;
  return [start, end];
};

/**
 * Fusiona intervalos solapados y cuenta días LABORABLES únicos (L-V, excluyendo festivos y vacaciones)
 */
export const countWorkingDays = (intervals, employeeId, holidaySet, globalVacationSet, employeeVacationMap) => {
  if (!intervals || intervals.length === 0) return 0;
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i][0] <= last[1]) {
      last[1] = last[1] > sorted[i][1] ? last[1] : sorted[i][1];
    } else {
      merged.push(sorted[i]);
    }
  }
  const empVac = employeeId ? employeeVacationMap?.[String(employeeId)] : null;
  let count = 0;
  for (const [s, e] of merged) {
    const cur = new Date(s);
    cur.setHours(0, 0, 0, 0);
    const endDay = new Date(e);
    endDay.setHours(0, 0, 0, 0);
    while (cur <= endDay) {
      const dow = cur.getDay();
      const dateStr = format(cur, "yyyy-MM-dd");
      if (dow >= 1 && dow <= 5 && !holidaySet?.has(dateStr) && !globalVacationSet?.has(dateStr) && !(empVac && empVac.has(dateStr))) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
  }
  return count;
};

/**
 * Meses completos transcurridos desde una fecha (yyyy-MM-dd o ISO)
 */
export const monthsSince = (fechaAlta, reference = new Date()) => {
  const ds = String(fechaAlta || '').slice(0, 10);
  if (!ds) return 0;
  const d = new Date(ds + 'T00:00:00');
  if (isNaN(d.getTime())) return 0;
  let months = (reference.getFullYear() - d.getFullYear()) * 12 + (reference.getMonth() - d.getMonth());
  if (reference.getDate() < d.getDate()) months -= 1;
  return Math.max(0, months);
};

/** Antigüedad mínima exigida para el reconocimiento "12 meses sin ausencias" */
export const MIN_MONTHS_NO_ABSENCE = 12;

/**
 * Logro: empleado que ha cumplido los últimos 12 meses sin ninguna ausencia
 * estando de alta durante todo el periodo (antigüedad mínima de 12 meses).
 */
export const isNoAbsenceYear = (emp) => {
  if (!emp) return false;
  if ((emp.days12 || 0) > 0) return false;
  // Debe existir actividad real registrada: sin días de presencia no hay logro que reconocer
  if ((emp.presenceDays12 ?? 0) <= 0) return false;
  return monthsSince(emp.fecha_alta) >= MIN_MONTHS_NO_ABSENCE;
};