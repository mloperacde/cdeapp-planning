/**
 * Regla única de "alta efectiva" de empleados (lado servidor).
 *
 * Un empleado con estado "Alta" pero con fecha de alta futura no cuenta para
 * presencia, ausencias ni contadores hasta su fecha efectiva de incorporación.
 */

export const toDateOnly = (value: any): string => {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return "";
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${parsed.getUTCFullYear()}-${month}-${day}`;
};

/**
 * ¿El empleado ya ha alcanzado su fecha de alta en la fecha de referencia?
 * Sin fecha de alta se considera efectivo (datos heredados).
 */
export const isEmployeeEffectiveOn = (emp: any, dateReference?: any): boolean => {
  if (!emp) return false;
  const hireDate = toDateOnly(emp.fecha_alta);
  if (!hireDate) return true;
  const reference = toDateOnly(dateReference) || toDateOnly(new Date());
  if (!reference) return true;
  return hireDate <= reference;
};