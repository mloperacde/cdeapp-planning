/**
 * Parsea una fecha en formato español "DD/MM/YYYY HH:mm" o "DD/MM/YYYY"
 * También acepta ISO strings ("2026-04-07T17:00:00", "2026-04-07").
 * Devuelve un Date válido o null si no puede parsear.
 */
export function parseDateES(str) {
  if (!str) return null;
  const s = String(str).trim();

  // Formato español con hora: "07/04/2026 17:00" o "07/04/2026 17:00:00"
  const spanishFull = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (spanishFull) {
    const [, dd, mm, yyyy, hh = '0', min = '0', ss = '0'] = spanishFull;
    const d = new Date(
      parseInt(yyyy), parseInt(mm) - 1, parseInt(dd),
      parseInt(hh), parseInt(min), parseInt(ss)
    );
    return isNaN(d.getTime()) ? null : d;
  }

  // ISO o cualquier otro formato reconocido por Date
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}