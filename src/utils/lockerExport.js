import * as XLSX from "xlsx";

/**
 * Exporta un array de objetos a un fichero .xlsx (Excel real).
 * @param {Array<Object>} rows - Filas a exportar
 * @param {string} filename - Nombre del archivo (sin extensión)
 * @param {string} sheetName - Nombre de la hoja
 */
export function exportToExcel(rows, filename, sheetName = "Datos") {
  if (!rows || rows.length === 0) {
    return;
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  // Ajustar ancho de columnas automáticamente
  const cols = Object.keys(rows[0]).map((key) => ({
    wch: Math.max(
      key.length,
      ...rows.map((r) => String(r[key] ?? "").length)
    ) + 2,
  }));
  ws["!cols"] = cols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Exporta la lista de asignaciones de taquillas.
 */
export function exportAssignments(employees, lockerAssignments, editingAssignments = {}) {
  const rows = employees.map((emp) => {
    const assignment = lockerAssignments.find(
      (la) => String(la.employee_id) === String(emp.id)
    );
    const edit = editingAssignments[emp.id] || {};
    const requiere =
      edit.requiere_taquilla !== undefined
        ? edit.requiere_taquilla
        : assignment?.requiere_taquilla !== false;
    const vestuario = edit.vestuario || assignment?.vestuario || "";
    const numeroActual =
      (edit.numero_taquilla_actual ||
        assignment?.numero_taquilla_actual ||
        "").replace(/['"''‚„]/g, "").trim();
    const numeroNuevo = (edit.numero_taquilla_nuevo || "").replace(/['"''‚„]/g, "").trim();

    return {
      Empleado: emp.nombre || "",
      Código: emp.codigo_empleado || "",
      Sexo: emp.sexo || "",
      Departamento: emp.departamento || "",
      Puesto: emp.puesto || "",
      Estado: emp.estado_empleado || "Alta",
      "Requiere Taquilla": requiere ? "Sí" : "No",
      Vestuario: requiere ? vestuario : "",
      "ID Taquilla Actual": requiere ? numeroActual : "",
      "Nueva Taquilla": numeroNuevo,
      "Notificación Enviada": assignment?.notificacion_enviada ? "Sí" : "No",
    };
  });
  exportToExcel(rows, "Asignaciones_Taquillas", "Asignaciones");
}

/**
 * Exporta la lista de empleados sin taquilla.
 */
export function exportEmployeesWithoutLocker(employees, lockerAssignments, config) {
  const rows = employees
    .filter((emp) => {
      if ((emp.estado_empleado || "Alta") !== "Alta") return false;
      const requiresLocker = (() => {
        if (!config || config.mode !== "config") return true;
        const deptConfig = config.departments?.[emp.departamento];
        if (!deptConfig || !deptConfig.enabled) return false;
        if (deptConfig.allPositions) return true;
        return (deptConfig.positions || []).includes(emp.puesto);
      })();
      if (!requiresLocker) return false;
      const assignment = lockerAssignments.find(
        (la) => String(la.employee_id) === String(emp.id)
      );
      if (!assignment) return true;
      if (assignment.requiere_taquilla === false) return true;
      const tieneTaquilla =
        assignment.numero_taquilla_actual &&
        String(assignment.numero_taquilla_actual).replace(/['"''‚„]/g, "").trim() !== "";
      return !tieneTaquilla;
    })
    .map((emp) => ({
      Empleado: emp.nombre || "",
      Código: emp.codigo_empleado || "",
      Departamento: emp.departamento || "",
      Puesto: emp.puesto || "",
      Sexo: emp.sexo || "",
    }));
  exportToExcel(rows, "Empleados_Sin_Taquilla", "Sin Taquilla");
}

/**
 * Exporta el mapa de taquillas de un vestuario concreto.
 */
export function exportLockerMap(vestuario, lockerData) {
  const rows = lockerData.map((l) => ({
    Vestuario: vestuario,
    "ID Taquilla": l.numero,
    Estado: l.ocupada ? "Ocupada" : "Libre",
    Empleado: l.employee?.nombre || "",
    Departamento: l.employee?.departamento || "",
    Código: l.employee?.codigo_empleado || "",
  }));
  const safeName = vestuario.replace(/[^A-Za-z0-9]/g, "_");
  exportToExcel(rows, `Mapa_${safeName}`, "Mapa");
}

/**
 * Exporta el registro de copias de llaves (duplicados).
 */
export function exportKeysRegistry(lockerAssignments, employees, localKeysRegistry) {
  const clean = (n) => (n ? String(n).replace(/['"''‚„]/g, "").trim() : "");
  const rows = (lockerAssignments || [])
    .filter((la) => la.vestuario && la.numero_taquilla_actual)
    .map((la) => {
      const lockerKey = `${la.vestuario}#${clean(la.numero_taquilla_actual)}`;
      const reg = localKeysRegistry[lockerKey] || {};
      const emp = employees.find((e) => String(e.id) === String(la.employee_id));
      return {
        Vestuario: la.vestuario,
        Taquilla: clean(la.numero_taquilla_actual),
        Empleado: emp?.nombre || "-",
        Departamento: emp?.departamento || "-",
        "Copia en Consigna": reg.hasCopy ? "Disponible" : "Falta",
        "Solicitud Duplicado": reg.request?.status || "Ninguna",
        "Préstamo Activo": reg.loan?.active ? "Sí" : "No",
      };
    });
  exportToExcel(rows, "Registro_Llaves_Duplicados", "Llaves");
}