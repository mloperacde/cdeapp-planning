/**
 * Regla única de estado efectivo de empleados.
 *
 * Un empleado con fecha de alta futura NO está de alta todavía: su estado
 * almacenado es "Alta Prevista" y no debe aparecer en presencia, ausencias,
 * absentismo, taquillas, planificación ni contadores de operarios.
 * El paso a "Alta" lo hace syncScheduledHireStatus cada día a las 00:10.
 */

export const UPCOMING_HIRE_STATUS = "Alta Prevista";

export const localDateOnly = (date = new Date()) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

/**
 * Normaliza una fecha (date, date-time o string) a "YYYY-MM-DD".
 */
export const toDateOnly = (value) => {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return "";
  return localDateOnly(parsed);
};

/**
 * ¿El empleado ya ha alcanzado su fecha de alta en la fecha indicada?
 * Sin fecha de alta se considera efectivo (datos heredados).
 */
export const isEmployeeEffectiveOn = (emp, dateISO = localDateOnly()) => {
  if (!emp) return false;
  const hireDate = toDateOnly(emp.fecha_alta);
  if (!hireDate) return true;
  const reference = toDateOnly(dateISO);
  if (!reference) return true;
  return hireDate <= reference;
};

/**
 * Estado que debe quedar guardado para el empleado: "Alta" si su fecha de
 * alta ya ha llegado, "Alta Prevista" si aún no. Baja/Excedencia se respetan.
 */
export const resolveEmployeeStatus = (emp, dateISO = localDateOnly()) => {
  if (!emp) return "";
  const current = emp.estado_empleado || "Alta";
  if (current !== "Alta" && current !== UPCOMING_HIRE_STATUS) return current;
  return isEmployeeEffectiveOn(emp, dateISO) ? "Alta" : UPCOMING_HIRE_STATUS;
};

/**
 * Alta prevista: empleado con fecha de incorporación futura.
 */
export const isUpcomingHire = (emp, dateISO = localDateOnly()) =>
  resolveEmployeeStatus(emp, dateISO) === UPCOMING_HIRE_STATUS;

/**
 * Empleado en alta efectiva (ni baja, ni excedencia, ni alta prevista).
 */
export const isActiveEmployee = (emp, dateISO = localDateOnly()) =>
  resolveEmployeeStatus(emp, dateISO) === "Alta";

/**
 * Devuelve solo los empleados con alta efectiva en la fecha indicada.
 */
export const filterEffectiveEmployees = (employees = [], dateISO = localDateOnly()) =>
  (employees || []).filter((emp) => isEmployeeEffectiveOn(emp, dateISO));