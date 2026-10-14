import * as XLSX from "xlsx";

// Estados de jornada que se evalúan (hay turno asignado y fichajes completos).
export const WORKDAY_EVALUATED_STATUSES = ["Completa", "Retraso", "Salida Anticipada", "Incompleta", "Sin Salida"];
// Estados que suponen un incumplimiento de la jornada del turno.
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

// KPIs de cumplimiento de jornada del periodo (a partir del recuento por estado, calculado en servidor).
export function buildComplianceStats(statusRows = []) {
  const rowFor = (status) => statusRows.find((r) => r.compliance_status === status);
  const countOf = (status) => rowFor(status)?.count || 0;
  const evaluatedDays = WORKDAY_EVALUATED_STATUSES.reduce((s, st) => s + countOf(st), 0);
  const completeDays = countOf("Completa");
  const missingMinutes = WORKDAY_EVALUATED_STATUSES.reduce((s, st) => s + (rowFor(st)?.sum_missing_minutes || 0), 0);
  return {
    evaluatedDays,
    completeDays,
    delayDays: countOf("Retraso"),
    earlyDays: countOf("Salida Anticipada"),
    incompleteDays: countOf("Incompleta"),
    noExitDays: countOf("Sin Salida"),
    incidentDays: WORKDAY_INCIDENT_STATUSES.reduce((s, st) => s + countOf(st), 0),
    missingMinutes,
    complianceRate: evaluatedDays > 0 ? Math.round((completeDays / evaluatedDays) * 100) : 0,
  };
}

// Resumen por empleado de los días que no cumplen la jornada del turno.
export function buildEmployeeSummary(incidents = [], empById = {}) {
  const map = {};
  for (const r of incidents) {
    const key = String(r.employee_id || r.employee_name);
    if (!map[key]) {
      const emp = empById[String(r.employee_id)];
      map[key] = {
        employee_id: r.employee_id,
        nombre: emp?.nombre || r.employee_name || "—",
        departamento: emp?.departamento || "",
        days: 0,
        delayDays: 0,
        earlyDays: 0,
        noExitDays: 0,
        missingMinutes: 0,
      };
    }
    const e = map[key];
    e.days++;
    if (r.compliance_status === "Retraso") e.delayDays++;
    if (r.compliance_status === "Salida Anticipada") e.earlyDays++;
    if (r.compliance_status === "Sin Salida") e.noExitDays++;
    e.missingMinutes += r.missing_minutes || 0;
  }
  return Object.values(map).sort((a, b) => b.missingMinutes - a.missingMinutes || b.days - a.days);
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

// Excel del control horario: resumen por empleado + detalle diario, con el periodo analizado en la cabecera.
export function exportComplianceExcel({ employeeRows = [], incidents = [], empById = {}, periodLabel = "", dateFrom = "", dateTo = "" }) {
  const cabecera = (titulo) => [[titulo], [`Periodo analizado: ${periodLabel}`], [`Generado el ${new Date().toLocaleString("es-ES")}`]];

  const resumen = employeeRows.map((e) => ({
    "Empleado": e.nombre,
    "Departamento": e.departamento,
    "Días sin cumplir jornada": e.days,
    "Días con retraso": e.delayDays,
    "Días con salida anticipada": e.earlyDays,
    "Días sin salida registrada": e.noExitDays,
    "Horas no trabajadas": (Math.round(((e.missingMinutes || 0) / 60) * 100) / 100),
    "Minutos no trabajados": e.missingMinutes || 0,
  }));

  const detalle = incidents.map((r) => ({
    "Fecha": r.record_date,
    "Empleado": empById[String(r.employee_id)]?.nombre || r.employee_name || "—",
    "Departamento": empById[String(r.employee_id)]?.departamento || "",
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