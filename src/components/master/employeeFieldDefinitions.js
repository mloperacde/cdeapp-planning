// Definición de campos de EmployeeMasterDatabase que pueden marcarse como obligatorios
// Agrupados por categoría para la UI de configuración

export const EMPLOYEE_FIELD_GROUPS = {
  'Datos Personales': [
    { key: 'codigo_empleado', label: 'Código de Empleado' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'dni', label: 'DNI' },
    { key: 'nuss', label: 'NUSS' },
    { key: 'sexo', label: 'Sexo' },
    { key: 'nacionalidad', label: 'Nacionalidad' },
    { key: 'fecha_nacimiento', label: 'Fecha de Nacimiento' },
    { key: 'email', label: 'Email' },
    { key: 'telefono_movil', label: 'Teléfono Móvil' },
    { key: 'direccion', label: 'Dirección' },
  ],
  'Organización': [
    { key: 'departamento', label: 'Departamento' },
    { key: 'puesto', label: 'Puesto' },
    { key: 'categoria', label: 'Categoría' },
    { key: 'equipo', label: 'Equipo/Turno' },
  ],
  'Jornada y Turno': [
    { key: 'tipo_jornada', label: 'Tipo de Jornada' },
    { key: 'num_horas_jornada', label: 'Horas de Jornada' },
    { key: 'tipo_turno', label: 'Tipo de Turno' },
  ],
  'Contrato': [
    { key: 'tipo_contrato', label: 'Tipo de Contrato' },
    { key: 'fecha_alta', label: 'Fecha de Alta' },
    { key: 'fecha_fin_contrato', label: 'Fecha Fin de Contrato' },
  ],
  'Contacto y Emergencia': [
    { key: 'contacto_emergencia_nombre', label: 'Contacto Emergencia (Nombre)' },
    { key: 'contacto_emergencia_telefono', label: 'Contacto Emergencia (Teléfono)' },
  ],
  'Control de Acceso': [
    { key: 'pin', label: 'PIN Cuco360' },
    { key: 'numero_tarjeta', label: 'Número de Tarjeta' },
    { key: 'taquilla_vestuario', label: 'Taquilla Vestuario' },
    { key: 'taquilla_numero', label: 'Taquilla Número' },
  ],
};

// Lista plana de todos los campos
export const ALL_EMPLOYEE_FIELDS = Object.values(EMPLOYEE_FIELD_GROUPS).flat();

// Mapa rápido key -> label
export const FIELD_LABEL_MAP = ALL_EMPLOYEE_FIELDS.reduce((acc, f) => {
  acc[f.key] = f.label;
  return acc;
}, {});

// Comprueba si un valor está vacío (null, undefined, string vacía, NaN)
export function isEmptyValue(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (typeof value === 'number' && isNaN(value)) return true;
  return false;
}