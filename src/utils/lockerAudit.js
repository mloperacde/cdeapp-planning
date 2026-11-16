import { cleanLockerNumber } from "@/utils";

export const VESTUARIOS_CANONICOS = [
  "Vestuario Femenino Planta Baja",
  "Vestuario Femenino Planta Alta",
  "Vestuario Masculino Planta Baja",
];

/**
 * Devuelve el nombre canónico del vestuario a partir de cualquier variante
 * ("Femenino P. Alta", "vestuario femenino planta alta", etc.).
 * Devuelve "" si el valor no corresponde a ningún vestuario conocido.
 */
export function canonicalVestuario(value) {
  const norm = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");

  if (!norm) return "";
  if (norm.includes("femenino") && norm.includes("alta")) return VESTUARIOS_CANONICOS[1];
  if (norm.includes("femenino")) return VESTUARIOS_CANONICOS[0];
  if (norm.includes("masculino")) return VESTUARIOS_CANONICOS[2];
  return "";
}

const isActive = (emp) => (emp.estado_empleado || "Alta") === "Alta";

/**
 * Auditoría única de taquillas. Considera las dos fuentes donde se puede
 * configurar una taquilla: el módulo de Vestuarios (LockerAssignment) y la
 * ficha del empleado (EmployeeMasterDatabase.taquilla_vestuario / taquilla_numero).
 * La asignación efectiva es la del módulo; si no existe, la de la ficha.
 */
export function buildLockerAudit({
  employees = [],
  lockerAssignments = [],
  lockerRoomConfigs = [],
  requiresLocker,
}) {
  const requires = requiresLocker || ((emp) => isActive(emp));
  const employeeIds = new Set(employees.map((e) => String(e.id)));

  const efectivas = [];
  const desincronizadas = [];

  employees.forEach((emp) => {
    const assignment = lockerAssignments.find(
      (la) => String(la.employee_id) === String(emp.id)
    ) || null;

    const moduloRequiere = assignment ? assignment.requiere_taquilla !== false : false;
    const moduloVestuario = moduloRequiere ? assignment.vestuario || "" : "";
    const moduloNumero = moduloRequiere
      ? cleanLockerNumber(assignment.numero_taquilla_actual)
      : "";

    const fichaVestuario = emp.taquilla_vestuario || "";
    const fichaNumero = cleanLockerNumber(emp.taquilla_numero);

    let source = null;
    let vestuario = "";
    let numero = "";

    if (moduloNumero) {
      source = "modulo";
      vestuario = moduloVestuario;
      numero = moduloNumero;
    } else if (fichaNumero) {
      source = "ficha";
      vestuario = fichaVestuario;
      numero = fichaNumero;
    }

    const requiere = requires(emp);

    if (source) {
      efectivas.push({
        employeeId: emp.id,
        nombre: emp.nombre || "Sin nombre",
        codigo: emp.codigo_empleado || "",
        departamento: emp.departamento || "",
        activo: isActive(emp),
        requiere,
        source,
        vestuario,
        vestuarioCanonico: canonicalVestuario(vestuario),
        numero,
        assignment,
        fichaVestuario,
        fichaNumero,
      });
    }

    // Desincronización entre ficha y módulo (solo para quien requiere taquilla)
    if (requiere && (fichaNumero || moduloNumero)) {
      const fichaValida = Boolean(fichaNumero);
      const moduloValida = Boolean(moduloNumero);
      const misma =
        fichaValida &&
        moduloValida &&
        canonicalVestuario(moduloVestuario) === canonicalVestuario(fichaVestuario) &&
        moduloNumero === fichaNumero;

      if (!misma) {
        desincronizadas.push({
          employeeId: emp.id,
          nombre: emp.nombre || "Sin nombre",
          codigo: emp.codigo_empleado || "",
          activo: isActive(emp),
          tipo: fichaValida && moduloValida ? "discrepancia" : fichaValida ? "solo_ficha" : "solo_modulo",
          fichaVestuario,
          fichaNumero,
          moduloVestuario,
          moduloNumero,
        });
      }
    }
  });

  // Solo cuentan las taquillas de quien, según la configuración de requisito
  // (pestaña Sin Taquilla > Configuración), necesita taquilla.
  const efectivasActivas = efectivas.filter((e) => e.activo && e.requiere);
  const asignadasSinRequisito = efectivas.filter((e) => e.activo && !e.requiere);

  const sinTaquilla = employees.filter((emp) => {
    if (!requires(emp)) return false;
    return !efectivas.some((e) => String(e.employeeId) === String(emp.id));
  });

  const huerfanas = lockerAssignments.filter(
    (la) => !employeeIds.has(String(la.employee_id))
  );

  // Duplicados: misma taquilla del mismo vestuario ocupada por más de un empleado
  const grupos = new Map();
  efectivasActivas.forEach((e) => {
    if (!e.numero) return;
    const vestuario = e.vestuarioCanonico || e.vestuario;
    if (!vestuario) return;
    const key = `${vestuario}|${e.numero}`;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(e);
  });

  const duplicadas = [];
  grupos.forEach((lista, key) => {
    const empleadosUnicos = new Set(lista.map((e) => String(e.employeeId)));
    if (empleadosUnicos.size < 2) return;
    const [vestuario, numero] = key.split("|");
    duplicadas.push({ vestuario, numero, entries: lista });
  });
  duplicadas.sort((a, b) => {
    const na = parseInt(a.numero, 10);
    const nb = parseInt(b.numero, 10);
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
    return a.vestuario.localeCompare(b.vestuario);
  });

  // Taquillas que no existen en el catálogo del vestuario
  const fueraCatalogo = efectivasActivas.filter((e) => {
    if (!e.numero) return false;
    const cfg = lockerRoomConfigs.find((c) => c.vestuario === e.vestuarioCanonico);
    const ids = (cfg?.identificadores_taquillas || []).map(String);
    return ids.length > 0 && !ids.includes(e.numero);
  });

  // Vestuarios que no corresponden a ningún vestuario configurado
  const vestuariosInvalidosMap = new Map();
  efectivasActivas.forEach((e) => {
    const raw = (e.vestuario || "").trim();
    if (!raw || e.vestuarioCanonico) return;
    if (!vestuariosInvalidosMap.has(raw)) vestuariosInvalidosMap.set(raw, []);
    vestuariosInvalidosMap.get(raw).push(e.nombre);
  });
  const vestuariosInvalidos = Array.from(vestuariosInvalidosMap.entries()).map(
    ([vestuario, nombres]) => ({ vestuario, nombres })
  );

  // Taquillas libres por vestuario
  const libres = VESTUARIOS_CANONICOS.map((vestuario) => {
    const cfg = lockerRoomConfigs.find((c) => c.vestuario === vestuario);
    const identificadores = (cfg?.identificadores_taquillas || []).map(String);
    const total = cfg?.numero_taquillas_instaladas || identificadores.length || 0;
    const instaladas = identificadores.length > 0
      ? identificadores
      : Array.from({ length: total }, (_, i) => String(i + 1));

    const ocupados = new Set(
      efectivasActivas
        .filter((e) => e.vestuarioCanonico === vestuario && e.numero)
        .map((e) => e.numero)
    );

    const libresIds = instaladas.filter((id) => !ocupados.has(id));
    return {
      vestuario,
      totalInstaladas: instaladas.length,
      ocupadas: ocupados.size,
      libres: libresIds,
      libresCount: libresIds.length,
    };
  }).filter((v) => v.totalInstaladas > 0);

  return {
    stats: {
      totalActive: employees.filter(isActive).length,
      totalInactive: employees.length - employees.filter(isActive).length,
      totalRequireLocker: employees.filter((e) => isActive(e) && requires(e)).length,
      totalNoRequireLocker: employees.filter((e) => isActive(e) && !requires(e)).length,
      totalAssignments: lockerAssignments.length,
      conTaquillaModulo: efectivasActivas.filter((e) => e.source === "modulo").length,
      conTaquillaFicha: efectivasActivas.filter((e) => e.source === "ficha").length,
      asignadasSinRequisito: asignadasSinRequisito.length,
    },
    efectivas,
    asignadasSinRequisito,
    sinTaquilla,
    huerfanas,
    duplicadas,
    fueraCatalogo,
    vestuariosInvalidos,
    desincronizadas,
    libres,
  };
}