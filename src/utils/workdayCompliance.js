import * as XLSX from "xlsx";

// Estados de jornada que suponen un incumplimiento de la jornada del turno.
export const WORKDAY_INCIDENT_STATUSES = ["Retraso", "Salida Anticipada", "Incompleta", "Sin Salida"];

export const WORKDAY_STATUS_STYLES = {
  "Completa": "bg-green-100 text-green-700 border-green-300",
  "Retraso": "bg-amber-100 text-amber-700 border-amber-300",
  "Salida Anticipada": "bg-orange-100 text-orange-700 border-orange-300",
  "Incompleta": "bg-red-100 text-red-700 border-red-300",
  "Sin Salida": "bg-purple-100 text-purple-700 border-purple-300",
  "En Curso": "bg-blue-100 text-blue-700 border-blue-300",
  "Sin Turno": "bg-slate-100 text-slate-500 border-slate-300",
  "Sin Datos": "bg-slate-100 text-slate-400 border-slate-300",
};

export const WORKDAY_INCIDENT_FIELDS = [
  "employee_id", "employee_name", "record_date", "shift",
  "expected_start", "expected_end", "first_entry", "last_exit",
  "minutes_late", "minutes_early", "missing_minutes", "compliance_status",
];

export function fmtHours(minutes) {
  const m = Math.max(0, Math.round(minutes || 0));
  if (m === 0) return "0 h";
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return h > 0 ? `${h} h ${rest} min` : `${rest} min`;
}

// Día laborable según el calendario laboral: de lunes a viernes, sin festivos ni vacaciones
// (globales o del propio empleado). Es la misma regla que aplica el informe de ausencias.
export function isWorkday(dateStr, holidaySet, globalVacationSet, empVacationSet) {
  if (!dateStr) return false;
  const dow = new Date(dateStr + "T12:00:00").getDay();
  if (dow === 0 || dow === 6) return false;
  if (holidaySet?.has(dateStr)) return false;
  if (globalVacationSet?.has(dateStr)) return false;
  if (empVacationSet?.has(dateStr)) return false;
  return true;
}

// KPIs de jornada del periodo a partir de las filas del informe (mismos días laborables que las ausencias)
export function buildComplianceStatsFromEmployees(employees = []) {
  const acc = {
    employeesTotal: employees.length,
    employeesNotCompliant: 0,
    evaluatedDays: 0,
    completeDays: 0,
    delayDays: 0,
    earlyDays: 0,
    incompleteDays: 0,
    noExitDays: 0,
    daysNotCompliant: 0,
    missingMinutes: 0,
  };
  for (const e of employees) {
    const c = e.compliancePeriod;
    if (!c) continue;
    acc.evaluatedDays += c.evaluatedDays || 0;
    acc.completeDays += c.completeDays || 0;
    acc.delayDays += c.delayDays || 0;
    acc.earlyDays += c.earlyDays || 0;
    acc.incompleteDays += c.incompleteDays || 0;
    acc.noExitDays += c.noExitDays || 0;
    acc.daysNotCompliant += c.daysNotCompliant || 0;
    acc.missingMinutes += c.missingMinutes || 0;
    if ((c.daysNotCompliant || 0) > 0) acc.employeesNotCompliant++;
  }
  acc.complianceRate = acc.evaluatedDays > 0 ? Math.round((acc.completeDays / acc.evaluatedDays) * 100) : 0;
  return acc;
}

// Empleados con jornada no completada (acudieron pero no cubrieron su turno)
export function buildEmployeeComplianceRows(employees = []) {
  return employees
    .filter(e => (e.compliancePeriod?.daysNotCompliant || 0) > 0)
    .map(e => ({
      employee_id: e.empId,
      nombre: e.nombre,
      departamento: e.departamento,
      evaluatedDays: e.compliancePeriod?.evaluatedDays || 0,
      completeDays: e.compliancePeriod?.completeDays || 0,
      delayDays: e.compliancePeriod?.delayDays || 0,
      earlyDays: e.compliancePeriod?.earlyDays || 0,
      incompleteDays: e.compliancePeriod?.incompleteDays || 0,
      noExitDays: e.compliancePeriod?.noExitDays || 0,
      daysNotCompliant: e.compliancePeriod?.daysNotCompliant || 0,
      missingMinutes: e.compliancePeriod?.missingMinutes || 0,
      complianceRate: e.compliancePeriod?.complianceRate || 0,
    }))
    .sort((a, b) => b.missingMinutes - a.missingMinutes || b.daysNotCompliant - a.daysNotCompliant);
}

function buildSheet(rows, titleRows) {
  const ws = XLSX.utils.json_to_sheet(rows, { origin: `A${titleRows.length + 2}` });
  XLSX.utils.sheet_add_aoa(ws, titleRows, { origin: "A1" });
  const keys = Object.keys(rows[0] || {});
  ws["!cols"] = keys.map((k) => ({
    wch: Math.min(42, Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length)) + 2),
  }));
  return ws;
}

// Excel de jornada: resumen por empleado + detalle diario, con el periodo analizado en la cabecera
export function exportComplianceExcel({ employeeRows = [], incidents = [], periodLabel = "", dateFrom = "", dateTo = "" }) {
  const cabecera = (titulo) => [[titulo], [`Periodo analizado: ${periodLabel}`], [`Generado el ${new Date().toLocaleString("es-ES")}`]];

  const resumen = employeeRows.map((e) => ({
    "Empleado": e.nombre,
    "Departamento": e.departamento,
    "Días laborables evaluados": e.evaluatedDays,
    "Días completos": e.completeDays,
    "Días sin cumplir jornada": e.daysNotCompliant,
    "Días con retraso": e.delayDays,
    "Días con salida anticipada": e.earlyDays,
    "Días jornada incompleta": e.incompleteDays,
    "Días sin salida registrada": e.noExitDays,
    "Cumplimiento": `${e.complianceRate}%`,
    "Horas no trabajadas": Math.round(((e.missingMinutes || 0) / 60) * 100) / 100,
    "Minutos no trabajados": e.missingMinutes || 0,
  }));

  const detalle = incidents.map((r) => ({
    "Fecha": r.record_date,
    "Empleado": r.employee_name || "—",
    "Turno": r.shift || "",
    "Entrada esperada": r.expected_start || "",
    "Salida esperada": r.expected_end || "",
    "Primera entrada": r.first_entry || "",
    "Última salida": r.last_exit || "",
    "Min retraso": r.minutes_late || 0,
    "Min salida anticipada": r.minutes_early || 0,
    "Min no trabajados": r.missing_minutes || 0,
    "Estado jornada": r.compliance_status || "",
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildSheet(resumen, cabecera("Control horario · Resumen por empleado")), "Resumen por empleado");
  XLSX.utils.book_append_sheet(wb, buildSheet(detalle, cabecera("Control horario · Detalle diario")), "Detalle diario");
  XLSX.writeFile(wb, `cumplimiento_jornada_${dateFrom}_al_${dateTo}.xlsx`);
}