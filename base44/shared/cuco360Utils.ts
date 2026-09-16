// Utilidades compartidas para sincronización con Cuco360

export const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

// Parsea la dirección de un fichaje de Cuco360 → 'E' (entrada) o 'S' (salida)
export const parseCheckDirection = (check: any): 'E' | 'S' => {
  const type = String(check.val_direccion || '').toUpperCase();
  return (type === 'S' || type === 'SALIDA' || type === 'OUT' || type === '2') ? 'S' : 'E';
};

// Extrae la hora (HH:MM) de una fecha completa de Cuco360
export const extractTimeStr = (fullDate: string): string => {
  const parts = fullDate.split(' ');
  return (parts[1] || '00:00').slice(0, 5);
};

// Extrae la fecha (yyyy-MM-dd) de una fecha completa de Cuco360
export const extractDateStr = (fullDate: string): string => {
  return fullDate.split(' ')[0];
};

// Obtiene el código del empleado de un fichaje de Cuco360
export const getCheckEmployeeCode = (check: any): string => {
  return String(check.cod_int_empleado || check.cod_interno || check.cod_empleado || '').trim();
};