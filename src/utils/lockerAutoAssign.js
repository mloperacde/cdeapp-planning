/**
 * Asignación automática de taquillas al dar de alta a un empleado.
 * Funciones puras: no acceden a la base de datos.
 */

export const VESTUARIO_FEMENINO_BAJA = "Vestuario Femenino Planta Baja";
export const VESTUARIO_FEMENINO_ALTA = "Vestuario Femenino Planta Alta";
export const VESTUARIO_MASCULINO = "Vestuario Masculino Planta Baja";

// Orden de preferencia: se llena primero la planta baja y después la planta alta
export const VESTUARIOS_POR_SEXO = {
  Femenino: [VESTUARIO_FEMENINO_BAJA, VESTUARIO_FEMENINO_ALTA],
  Masculino: [VESTUARIO_MASCULINO],
};

/** Nombre canónico del vestuario ("femenimo plantaAlta" → "Vestuario Femenino Planta Alta") */
export function canonicalVestuario(value) {
  const norm = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");

  if (!norm) return "";
  if (norm.includes("femenino") && norm.includes("alta")) return VESTUARIO_FEMENINO_ALTA;
  if (norm.includes("femenino")) return VESTUARIO_FEMENINO_BAJA;
  if (norm.includes("masculino")) return VESTUARIO_MASCULINO;
  return "";
}

/** Normaliza el identificador de una taquilla ("07" → "7") */
export function normalizeLockerNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return raw.toUpperCase();
  return String(parseInt(digits, 10));
}

/**
 * ¿El empleado pertenece al colectivo que requiere taquilla?
 * Réplica de la configuración de "Requisito de taquilla" (todos / por departamento-puesto).
 */
export function employeeRequiresLocker(emp, config) {
  if (!emp) return false;
  const estado = emp.estado_empleado || "Alta";
  if (estado !== "Alta" && estado !== "Alta Prevista") return false;

  const mode = config?.mode || "all";
  if (mode !== "config") return true;

  const deptConfig = config?.departments?.[emp.departamento];
  if (!deptConfig || !deptConfig.enabled) return false;
  if (deptConfig.allPositions) return true;
  return (deptConfig.positions || []).includes(emp.puesto);
}

/** Taquillas ocupadas en formato "vestuario|numero" */
export function buildOccupiedLockers(employees = [], assignments = []) {
  const ocupadas = new Set();

  (assignments || []).forEach((a) => {
    if (a.requiere_taquilla === false) return;
    const vestuario = canonicalVestuario(a.vestuario);
    const numero = normalizeLockerNumber(a.numero_taquilla_actual);
    if (vestuario && numero) ocupadas.add(`${vestuario}|${numero}`);
  });

  (employees || []).forEach((e) => {
    const vestuario = canonicalVestuario(e.taquilla_vestuario);
    const numero = normalizeLockerNumber(e.taquilla_numero);
    if (vestuario && numero) ocupadas.add(`${vestuario}|${numero}`);
  });

  return ocupadas;
}

/** Taquillas instaladas por vestuario según la configuración del vestuario */
export function buildRoomInventory(roomConfigs = []) {
  const inventario = {};

  (roomConfigs || []).forEach((cfg) => {
    const vestuario = canonicalVestuario(cfg.vestuario);
    if (!vestuario) return;
    const ids = (cfg.identificadores_taquillas || []).map(String).filter(Boolean);
    const total = Number(cfg.numero_taquillas_instaladas) || ids.length;
    const lista = ids.length > 0 ? ids : Array.from({ length: total }, (_, i) => String(i + 1));
    // Si hay varias configuraciones para el mismo vestuario, nos quedamos con la más completa
    if (!inventario[vestuario] || lista.length > inventario[vestuario].length) {
      inventario[vestuario] = lista;
    }
  });

  return inventario;
}

const sortLockerIds = (a, b) => {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
  return String(a).localeCompare(String(b));
};

/**
 * Devuelve la primera taquilla libre para el sexo indicado.
 * Femenino → vestuario femenino de planta baja y, si está lleno, el de planta alta.
 * Masculino → vestuario masculino.
 * Devuelve null si no hay ninguna libre o el sexo no determina vestuario.
 */
export function suggestLocker({ sexo, roomConfigs = [], employees = [], assignments = [] }) {
  const vestuarios = VESTUARIOS_POR_SEXO[sexo];
  if (!vestuarios) return null;

  const inventario = buildRoomInventory(roomConfigs);
  const ocupadas = buildOccupiedLockers(employees, assignments);

  for (const vestuario of vestuarios) {
    const instaladas = (inventario[vestuario] || []).slice().sort(sortLockerIds);
    const libre = instaladas.find((id) => !ocupadas.has(`${vestuario}|${normalizeLockerNumber(id)}`));
    if (libre) return { vestuario, numero: normalizeLockerNumber(libre) };
  }

  return null;
}