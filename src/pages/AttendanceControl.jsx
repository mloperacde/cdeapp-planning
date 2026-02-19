import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Upload, Users, Clock, CheckCircle, AlertCircle, RefreshCw, Trash2, Search, LogIn, LogOut, FileWarning, Layers } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

function parseFecha(valor) {
  if (!valor && valor !== 0) return null;
  if (typeof valor === "number") {
    const d = XLSX.SSF.parse_date_code(valor);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(valor).trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) {
    const parts = s.split("/");
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${year}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  return null;
}

function parseHora(valor) {
  if (valor === null || valor === undefined || valor === "") return "";
  if (typeof valor === "number") {
    if (valor === 0) return "";
    const totalMinutes = Math.round(valor * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const s = String(valor).trim();
  // Formato HH:mm:ss o HH:mm
  const match = s.match(/^(\d{1,2}):(\d{2})/);
  if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
  return "";
}

export default function AttendanceControl() {
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  // Estado para el diálogo de conflicto
  const [conflictDialog, setConflictDialog] = useState(null); // { pendingRecords, date, existingBatches }
  const [shiftName, setShiftName] = useState("tarde");

  const { data: records = [], isLoading, refetch } = useQuery({
    queryKey: ["attendanceRecords", filterDate],
    queryFn: async () => {
      // Cargar todos los registros paginando (máximo 2000 por petición)
      const page1 = await base44.entities.AttendanceRecord.filter({ record_date: filterDate }, "record_time", 2000);
      return page1;
    },
    staleTime: 0,
  });

  // Batches únicos del día actual (para poder borrar por turno)
  const batches = [...new Set(records.map(r => r.import_batch).filter(Boolean))];

  // Nombre de batch legible
  const batchLabel = (batchId) => {
    if (!batchId) return "Sin lote";
    // Si tiene nombre de turno al final (ej: import_xxx_mañana)
    const parts = batchId.split("_");
    const last = parts[parts.length - 1];
    if (["mañana", "tarde", "noche", "turno1", "turno2"].includes(last.toLowerCase())) {
      return last.charAt(0).toUpperCase() + last.slice(1);
    }
    return `Lote ${batchId.slice(-6)}`;
  };

  // Agrupar registros por empleado
  const employeeSummary = Object.values(
    records.reduce((acc, r) => {
      const key = r.employee_id;
      if (!acc[key]) {
        acc[key] = {
          employee_id: r.employee_id,
          employee_name: r.employee_name,
          department: r.department,
          entries: [],
          exits: [],
        };
      }
      if (r.direction === "E") acc[key].entries.push(r.record_time);
      else acc[key].exits.push(r.record_time);
      return acc;
    }, {})
  ).filter((e) =>
    !searchTerm ||
    e.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: employeeSummary.length,
    present: employeeSummary.filter((e) => e.entries.length > 0).length,
    left: employeeSummary.filter((e) => e.exits.length > 0 && e.entries.length > 0).length,
    totalRecords: records.length,
  };

  // ── PARSEAR ARCHIVO ─────────────────────────────────────────────────────────
  const parseFile = async (file) => {
    const buffer = await file.arrayBuffer();
    let workbook;
    try {
      workbook = XLSX.read(buffer, { type: "array", cellDates: false, raw: false });
    } catch {
      throw new Error("No se pudo leer el archivo. Asegúrate de que es un Excel válido (.xlsx o .xls).");
    }
    if (!workbook.SheetNames?.length) throw new Error("El archivo Excel no contiene ninguna hoja.");

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });

    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      if (!row) continue;
      const cells = row.map((c) => String(c || "").trim().toUpperCase());
      if (cells.includes("ID") && (cells.includes("EMPLEADO") || cells.includes("NOMBRE"))) {
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx === -1) throw new Error('No se encontró la cabecera. El archivo debe tener columnas "ID" y "Empleado".');

    const headers = rows[headerRowIdx].map((h) => String(h || "").trim());
    const findCol = (names) => {
      for (const name of names) {
        const idx = headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const idxId = findCol(["ID"]);
    const idxEmpleado = findCol(["Empleado", "Nombre"]);
    const idxSentido = findCol(["Sentido", "Tipo", "Dirección", "Direccion"]);
    const idxIncidencia = findCol(["Incidencia"]);
    const idxCentro = findCol(["Centro"]);
    const idxDepartamento = findCol(["Departamento", "Depto"]);
    const idxDispositivo = findCol(["Dispositivo"]);
    const idxFecha = findCol(["Fecha", "Date"]);
    const idxHora = findCol(["Hora", "Hora marcaje", "Time"]);

    const missing = [];
    if (idxId === -1) missing.push("ID");
    if (idxEmpleado === -1) missing.push("Empleado");
    if (idxFecha === -1) missing.push("Fecha");
    if (idxHora === -1) missing.push("Hora");
    if (missing.length > 0) throw new Error(`Faltan columnas obligatorias: ${missing.join(", ")}`);

    // Filtrar filas vacías pero permitir ID=0 (número)
    const dataRows = rows.slice(headerRowIdx + 1).filter(
      (row) => row && (row[idxId] !== null && row[idxId] !== undefined && row[idxId] !== "") && row[idxEmpleado]
    );
    if (dataRows.length === 0) throw new Error("No se encontraron filas de datos en el archivo.");

    const toCreate = [];
    const errors = [];

    dataRows.forEach((row, rowNum) => {
      const rawId = row[idxId];
      const rawEmpleado = row[idxEmpleado];
      const rawFecha = idxFecha !== -1 ? row[idxFecha] : null;
      const rawHora = idxHora !== -1 ? row[idxHora] : null;
      const rawSentido = idxSentido !== -1 ? row[idxSentido] : null;

      const employeeId = (rawId !== null && rawId !== undefined) ? String(rawId).trim() : null;
      const employeeName = rawEmpleado ? String(rawEmpleado).trim() : null;
      const fechaStr = parseFecha(rawFecha);
      const horaStr = parseHora(rawHora);
      const sentido = rawSentido ? String(rawSentido).trim() : "";

      if (!employeeId || !employeeName) { errors.push(`Fila ${headerRowIdx + 2 + rowNum}: ID o nombre vacío.`); return; }
      if (!fechaStr) { errors.push(`Fila ${headerRowIdx + 2 + rowNum} (${employeeName}): Fecha inválida — "${rawFecha}".`); return; }
      if (!horaStr) { errors.push(`Fila ${headerRowIdx + 2 + rowNum} (${employeeName}): Hora inválida — "${rawHora}".`); return; }

      toCreate.push({
        employee_id: employeeId,
        employee_name: employeeName,
        direction: sentido,
        incident: idxIncidencia !== -1 && row[idxIncidencia] ? String(row[idxIncidencia]).trim() : "N/A",
        center: idxCentro !== -1 && row[idxCentro] ? String(row[idxCentro]).trim() : "",
        department: idxDepartamento !== -1 && row[idxDepartamento] ? String(row[idxDepartamento]).trim() : "",
        device: idxDispositivo !== -1 && row[idxDispositivo] ? String(row[idxDispositivo]).trim() : "",
        record_date: fechaStr,
        record_time: horaStr,
      });
    });

    return { toCreate, errors };
  };

  // ── GUARDAR REGISTROS ────────────────────────────────────────────────────────
  const saveRecords = async (toCreate, batchSuffix = "") => {
    const batchId = `import_${Date.now()}${batchSuffix ? "_" + batchSuffix : ""}`;
    const withBatch = toCreate.map(r => ({ ...r, import_batch: batchId }));
    const chunkSize = 50;
    for (let i = 0; i < withBatch.length; i += chunkSize) {
      await base44.entities.AttendanceRecord.bulkCreate(withBatch.slice(i, i + chunkSize));
    }
    return { count: withBatch.length, batchId };
  };

  // ── ELIMINAR POR BATCH ───────────────────────────────────────────────────────
  const deleteBatch = async (batchId) => {
    const result = await base44.functions.invoke('deleteAttendanceRecords', { import_batch: batchId });
    return result.data;
  };

  // ── HANDLER PRINCIPAL DE IMPORTACIÓN ────────────────────────────────────────
  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportErrors([]);

    try {
      const { toCreate, errors } = await parseFile(file);

      if (toCreate.length === 0) {
        setImportErrors(errors);
        toast.error(`No se importó ningún registro. ${errors.length} errores detectados.`);
        return;
      }

      // Detectar fecha principal del archivo
      const importedDate = toCreate[0]?.record_date;

      // Verificar si ya hay registros para esa fecha
      let existingForDate = [];
      if (importedDate) {
        existingForDate = await base44.entities.AttendanceRecord.filter({ record_date: importedDate }, "record_time", 10);
      }

      if (existingForDate.length > 0) {
        // Hay conflicto: preguntar al usuario
        const existingBatches = [...new Set(existingForDate.map(r => r.import_batch).filter(Boolean))];
        setImportErrors(errors);
        setConflictDialog({ pendingRecords: toCreate, date: importedDate, existingBatches, errors });
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Sin conflicto: importar directamente
      const { count } = await saveRecords(toCreate);
      if (errors.length > 0) {
        setImportErrors(errors);
        toast.warning(`${count} registros importados. ${errors.length} filas con errores.`);
      } else {
        toast.success(`${count} registros importados correctamente.`);
      }

      queryClient.invalidateQueries({ queryKey: ["attendanceRecords"] });
      if (importedDate) setFilterDate(importedDate);

    } catch (err) {
      console.error(err);
      toast.error("Error: " + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── RESOLVER CONFLICTO: SOBRESCRIBIR ────────────────────────────────────────
  const handleOverwrite = async () => {
    if (!conflictDialog) return;
    setImporting(true);
    try {
      // Eliminar todos los registros del día vía backend (evita rate limit y 404)
      await base44.functions.invoke('deleteAttendanceRecords', { record_date: conflictDialog.date });
      const { count } = await saveRecords(conflictDialog.pendingRecords);
      toast.success(`${count} registros importados (se sobreescribieron los anteriores).`);
      await queryClient.invalidateQueries({ queryKey: ["attendanceRecords"] });
      setFilterDate(conflictDialog.date);
      await refetch();
    } catch (err) {
      toast.error("Error al sobreescribir: " + err.message);
    } finally {
      setImporting(false);
      setConflictDialog(null);
      setShiftName("tarde");
    }
  };

  // ── RESOLVER CONFLICTO: CONSERVAR AMBOS ─────────────────────────────────────
  const handleKeepBoth = async () => {
    if (!conflictDialog) return;
    const name = shiftName.trim().toLowerCase().replace(/\s+/g, "_") || "tarde";
    setImporting(true);
    try {
      const { count } = await saveRecords(conflictDialog.pendingRecords, name);
      toast.success(`${count} registros importados como turno "${name}".`);
      queryClient.invalidateQueries({ queryKey: ["attendanceRecords"] });
      setFilterDate(conflictDialog.date);
    } catch (err) {
      toast.error("Error al importar: " + err.message);
    } finally {
      setImporting(false);
      setConflictDialog(null);
      setShiftName("tarde");
    }
  };

  // ── ELIMINAR DÍA COMPLETO ────────────────────────────────────────────────────
  const handleClearDay = async () => {
    if (!confirm(`¿Eliminar TODOS los registros del ${filterDate}? Esta acción no se puede deshacer.`)) return;
    try {
      const result = await base44.functions.invoke('deleteAttendanceRecords', { record_date: filterDate });
      toast.success(`${result.data?.deleted || 0} registros del día eliminados.`);
      await queryClient.invalidateQueries({ queryKey: ["attendanceRecords"] });
      await refetch();
    } catch (err) {
      toast.error("Error al eliminar: " + err.message);
    }
  };

  // ── ELIMINAR BATCH INDIVIDUAL ────────────────────────────────────────────────
  const handleDeleteBatch = async (batchId) => {
    const label = batchLabel(batchId);
    if (!confirm(`¿Eliminar los registros del turno "${label}"?`)) return;
    try {
      await deleteBatch(batchId);
      toast.success(`Registros del turno "${label}" eliminados.`);
      await queryClient.invalidateQueries({ queryKey: ["attendanceRecords"] });
      await refetch();
    } catch (err) {
      toast.error("Error al eliminar: " + err.message);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Control de Presencia</h1>
          <p className="text-sm text-slate-500">Importa y analiza los marcajes del sistema de control de acceso</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileImport} />
          <Button onClick={() => fileInputRef.current?.click()} disabled={importing} className="bg-blue-600 hover:bg-blue-700">
            {importing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {importing ? "Importando..." : "Importar Excel"}
          </Button>
          {records.length > 0 && (
            <Button variant="outline" onClick={handleClearDay} className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-1" />
              Borrar día
            </Button>
          )}
        </div>
      </div>

      {/* Lotes activos del día */}
      {batches.length > 1 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <Layers className="w-3 h-3" /> Turnos cargados:
          </span>
          {batches.map(b => (
            <div key={b} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{batchLabel(b)}</span>
              <button
                onClick={() => handleDeleteBatch(b)}
                className="ml-1 text-red-400 hover:text-red-600"
                title={`Eliminar turno ${batchLabel(b)}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Errores de importación */}
      {importErrors.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm text-orange-700 dark:text-orange-400 flex items-center gap-2">
              <FileWarning className="w-4 h-4" />
              {importErrors.length} fila(s) con errores (no importadas)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <ul className="text-xs text-orange-600 dark:text-orange-300 space-y-0.5 max-h-32 overflow-y-auto">
              {importErrors.slice(0, 10).map((err, i) => <li key={i}>• {err}</li>)}
              {importErrors.length > 10 && <li className="text-orange-400 italic">... y {importErrors.length - 10} más</li>}
            </ul>
            <Button variant="ghost" size="sm" className="mt-2 text-xs h-6 text-orange-600" onClick={() => setImportErrors([])}>Cerrar</Button>
          </CardContent>
        </Card>
      )}

      {/* Filtro */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Fecha:</label>
          <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-40" />
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar empleado o departamento..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Users className="w-5 h-5 text-blue-500" /><div><p className="text-xs text-slate-500">Empleados</p><p className="text-2xl font-bold">{stats.total}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /><div><p className="text-xs text-slate-500">Con entrada</p><p className="text-2xl font-bold">{stats.present}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-orange-500" /><div><p className="text-xs text-slate-500">Con salida</p><p className="text-2xl font-bold">{stats.left}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Clock className="w-5 h-5 text-purple-500" /><div><p className="text-xs text-slate-500">Total marcajes</p><p className="text-2xl font-bold">{stats.totalRecords}</p></div></div></CardContent></Card>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : employeeSummary.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <Upload className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No hay registros para la fecha seleccionada.</p>
            <p className="text-sm mt-1">Importa un archivo Excel para comenzar.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Registros del {filterDate} — {employeeSummary.length} empleados
              {batches.length > 1 && <span className="ml-2 text-sm font-normal text-slate-500">({batches.length} turnos)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-slate-600 dark:text-slate-300">ID</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-600 dark:text-slate-300">Empleado</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-600 dark:text-slate-300">Departamento</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-600 dark:text-slate-300">Entradas</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-600 dark:text-slate-300">Salidas</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-600 dark:text-slate-300">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {employeeSummary.map((emp) => (
                    <tr key={emp.employee_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-2 text-slate-500">{emp.employee_id}</td>
                      <td className="px-4 py-2 font-medium">{emp.employee_name}</td>
                      <td className="px-4 py-2 text-slate-500">{emp.department || "—"}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {emp.entries.sort().map((t, i) => (
                            <Badge key={i} className="bg-green-100 text-green-800 text-xs"><LogIn className="w-3 h-3 mr-1" />{t}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {emp.exits.sort().map((t, i) => (
                            <Badge key={i} className="bg-orange-100 text-orange-800 text-xs"><LogOut className="w-3 h-3 mr-1" />{t}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {emp.entries.length > 0 && emp.exits.length === 0 && <Badge className="bg-blue-100 text-blue-800">En planta</Badge>}
                        {emp.entries.length > 0 && emp.exits.length > 0 && <Badge className="bg-slate-100 text-slate-700">Salió</Badge>}
                        {emp.entries.length === 0 && <Badge className="bg-red-100 text-red-800">Sin entrada</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── DIÁLOGO DE CONFLICTO ──────────────────────────────────────────────── */}
      <Dialog open={!!conflictDialog} onOpenChange={() => setConflictDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ya existen registros para esta fecha</DialogTitle>
            <DialogDescription>
              Se detectaron registros existentes para el <strong>{conflictDialog?.date}</strong>.
              {conflictDialog?.existingBatches?.length > 0 && (
                <span className="block mt-1 text-xs text-slate-500">
                  Turnos actuales: {conflictDialog.existingBatches.map(b => batchLabel(b)).join(", ")}
                </span>
              )}
              <br />¿Qué deseas hacer con los <strong>{conflictDialog?.pendingRecords?.length}</strong> nuevos registros?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Nombre del turno (si conservas ambos):</label>
              <Input
                placeholder="ej: tarde, mañana, turno2..."
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
              />
              <p className="text-xs text-slate-500">Esto permite identificar cada importación por turno.</p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setConflictDialog(null)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleOverwrite} className="flex-1 bg-red-600 hover:bg-red-700">
              <Trash2 className="w-4 h-4 mr-1" />
              Sobreescribir
            </Button>
            <Button onClick={handleKeepBoth} className="flex-1 bg-blue-600 hover:bg-blue-700">
              <Layers className="w-4 h-4 mr-1" />
              Conservar ambos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}