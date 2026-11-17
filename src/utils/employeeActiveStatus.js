/**
 * Regla única de "alta efectiva" de empleados.
 *
 * Un empleado registrado en la base maestra con estado "Alta" pero con una
 * fecha de alta futura NO es efectivo hasta esa fecha: no debe aparecer en
 * listados ni contadores de presencia, ausencias, absentismo ni planificación
 * de disponibilidad.
 */

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
 * Devuelve solo los empleados con alta efectiva en la fecha indicada.
 */
export const filterEffectiveEmployees = (employees = [], dateISO = localDateOnly()) =>
  (employees || []).filter((emp) => isEmployeeEffectiveOn(emp, dateISO));

/**
 * Alta prevista: estado "Alta" pero con fecha de incorporación futura.
 */
export const isFutureHire = (emp, dateISO = localDateOnly()) => {
  if (!emp) return false;
  const hireDate = toDateOnly(emp.fecha_alta);
  if (!hireDate) return false;
  const reference = toDateOnly(dateISO);
  if (!reference) return false;
  return hireDate > reference && (emp.estado_empleado || "Alta") === "Alta";
};