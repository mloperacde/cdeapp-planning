import React, { useState, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppData } from "../data/DataProvider";
import { base44 } from "../../api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  RefreshCw, Upload, Trash2, Search, LogIn, LogOut,
  Users, CheckCircle2, Clock, AlertCircle, Zap
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const CUCO_API_KEY = "k9fKmKcVCRc44Rf7dpkxhnfU9z9t0XsgrYgkGQSr9unWFZPOKsySznPHb7bUJzBc";
const CLIENT_CODE = "380";

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
  const match = s.match(/^(\d{1,2}):(\d{2})/);
  if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
  return "";
}

export default function DailyAttendanceView() {
  const queryClient = useQueryClient();
  const { employees = [] } = useAppData();
  const fileInputRef = useRef(null);

  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [importing, setImporting] = useState(false);

  const { data: records = [], isLoading, refetch } = useQuery({
    queryKey: ["attendanceRecords", filterDate],
    queryFn: () => base44.entities.AttendanceRecord.filter({ record_date: filterDate }, "record_time", 2000),
    staleTime: 10000,
  });

  const employeesByCodigo = useMemo(() => {
    const map = new Map();
    employees.forEach(e => {
      const code = e?.codigo_empleado != null ? String(e.codigo_empleado) : null;
      if (code) map.set(code, e);
    });
    return map;
  }, [employees]);

  const employeeSummary = useMemo(() => {
    const grouped = records.reduce((acc, r) => {
      const key = r.employee_id;
      if (!acc[key]) {
        const em = employeesByCodigo.get(String(r.employee_id));
        acc[key] = {
          employee_id: r.employee_id,
          employee_name: em?.nombre || r.employee_name || `Empleado ${r.employee_id}`,
          department: em?.departamento || r.department || "—",
          entries: [],
          exits: [],
        };
      }
      if (r.direction === "E") acc[key].entries.push(r.record_time);
      else acc[key].exits.push(r.record_time);
      return acc;
    }, {});

    return Object.values(grouped).filter(e =>
      !searchTerm ||
      e.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [records, employeesByCodigo, searchTerm]);

  const stats = {
    total: employeeSummary.length,
    inPlant: employeeSummary.filter(e => e.entries.length > 0 && e.exits.length === 0).length,
    left: employeeSummary.filter(e => e.entries.length > 0 && e.exits.length > 0).length,
    noEntry: employeeSummary.filter(e => e.entries.length === 0).length,
    totalRecords: records.length,
  };

  const handleSyncCuco = async () => {
    if (!confirm(`¿Sincronizar marcajes de Cuco360 para el ${filterDate}?`)) return;
    setIsSyncing(true);
    try {
      const result = await base44.functions.invoke("cucoSyncV2", { date: filterDate });
      toast.success(`${result.data?.count || 0} marcajes sincronizados.`);
      queryClient.invalidateQueries({ queryKey: ["attendanceRecords"] });
      refetch();
    } catch (err) {
      toast.error("Error al sincronizar: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: false, raw: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });

      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const cells = (rows[i] || []).map(c => String(c || "").trim().toUpperCase());
        if ((cells.includes("ID") && cells.includes("EMPLEADO")) || (cells.includes("FECHA") && cells.includes("HORA"))) {
          headerRowIdx = i; break;
        }
      }
      if (headerRowIdx === -1) throw new Error("No se encontró la cabecera (ID+Empleado o Fecha+Hora).");

      const headers = rows[headerRowIdx].map(h => String(h || "").trim());
      const findCol = (names) => {
        for (const n of names) {
          const idx = headers.findIndex(h => h.toLowerCase() === n.toLowerCase());
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const idxId = findCol(["ID","Codigo","Código"]);
      const idxEmpleado = findCol(["Empleado","Nombre","Trabajador"]);
      const idxFecha = findCol(["Fecha","Date","Día"]);
      const idxHora = findCol(["Hora","Hora marcaje","Time"]);
      const idxSentido = findCol(["Sentido","Tipo","Dirección","Direccion","E/S"]);
      const idxIncidencia = findCol(["Incidencia","Observaciones"]);
      const idxDepartamento = findCol(["Departamento","Depto","Sección"]);
      const idxDispositivo = findCol(["Dispositivo","Terminal"]);

      if (idxFecha === -1 || idxHora === -1) throw new Error("Faltan columnas: Fecha / Hora.");

      const toCreate = [];
      rows.slice(headerRowIdx + 1).forEach(row => {
        if (!row || !row[idxFecha]) return;
        const fechaStr = parseFecha(row[idxFecha]);
        const horaStr = parseHora(row[idxHora]);
        if (!fechaStr || !horaStr) return;
        const rawSentido = idxSentido !== -1 ? String(row[idxSentido] || "").trim() : "";
        const direction = (rawSentido.toUpperCase().includes("S") || rawSentido.toUpperCase().includes("SALIDA")) ? "S" : "E";
        toCreate.push({
          employee_id: idxId !== -1 ? String(row[idxId] ?? "").trim() : "UNKNOWN",
          employee_name: idxEmpleado !== -1 ? String(row[idxEmpleado] || "").trim() : "Desconocido",
          direction,
          incident: idxIncidencia !== -1 ? String(row[idxIncidencia] || "").trim() : "",
          department: idxDepartamento !== -1 ? String(row[idxDepartamento] || "").trim() : "",
          device: idxDispositivo !== -1 ? String(row[idxDispositivo] || "").trim() : "",
          record_date: fechaStr,
          record_time: horaStr,
          import_batch: `import_${Date.now()}`
        });
      });

      if (!toCreate.length) throw new Error("No se encontraron registros válidos.");

      const datesInFile = [...new Set(toCreate.map(r => r.record_date))];
      for (const date of datesInFile) {
        const existing = await base44.entities.AttendanceRecord.filter({ record_date: date }, "id", 2000);
        for (let i = 0; i < existing.length; i += 50)
          await Promise.all(existing.slice(i, i + 50).map(ex => base44.entities.AttendanceRecord.delete(ex.id).catch(() => {})));
      }
      for (let i = 0; i < toCreate.length; i += 50)
        await base44.entities.AttendanceRecord.bulkCreate(toCreate.slice(i, i + 50));

      toast.success(`${toCreate.length} registros importados correctamente.`);
      queryClient.invalidateQueries({ queryKey: ["attendanceRecords"] });
      if (datesInFile[0]) setFilterDate(datesInFile[0]);
    } catch (err) {
      toast.error("Error importación: " + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClearDay = async () => {
    if (!confirm(`¿Eliminar TODOS los registros del ${filterDate}?`)) return;
    const result = await base44.functions.invoke("deleteAttendanceRecords", { record_date: filterDate });
    toast.success(`${result.data?.deleted || 0} registros eliminados.`);
    queryClient.invalidateQueries({ queryKey: ["attendanceRecords"] });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={handleSyncCuco} disabled={isSyncing} className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
          <Zap className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Sincronizando..." : "Sync Cuco360"}
        </Button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileImport} />
        <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing} className="gap-1.5">
          {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {importing ? "Importando..." : "Importar Excel"}
        </Button>
        {records.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleClearDay} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" /> Borrar día
          </Button>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          <label className="text-xs text-slate-500 font-medium">Fecha:</label>
          <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-36 h-8 text-xs" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Con marcaje", value: stats.total, icon: Users, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
          { label: "En planta", value: stats.inPlant, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Han salido", value: stats.left, icon: LogOut, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
          { label: "Total marcajes", value: stats.totalRecords, icon: Clock, color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20" },
        ].map(s => (
          <Card key={s.label} className="border border-slate-200 dark:border-slate-700">
            <CardContent className="p-3 flex items-center gap-2">
              <div className={`p-2 rounded-lg ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input
          placeholder="Buscar empleado..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-9 h-8 text-sm"
        />
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : employeeSummary.length === 0 ? (
        <Card className="border border-dashed border-slate-200 dark:border-slate-700">
          <CardContent className="py-12 text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-500">No hay marcajes para el {filterDate}.</p>
            <p className="text-xs text-slate-400 mt-1">Sincroniza con Cuco360 o importa un Excel.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {filterDate} — {employeeSummary.length} empleados con marcajes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Empleado</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Departamento</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Entradas</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Salidas</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {employeeSummary.map(emp => (
                    <tr key={emp.employee_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{emp.employee_name}</p>
                        <p className="text-[11px] text-slate-400">ID: {emp.employee_id}</p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{emp.department}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {emp.entries.sort().map((t, i) => (
                            <Badge key={i} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-1.5 py-0.5 gap-1 font-mono">
                              <LogIn className="w-2.5 h-2.5" />{t}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {emp.exits.sort().map((t, i) => (
                            <Badge key={i} className="bg-orange-50 text-orange-700 border border-orange-200 text-xs px-1.5 py-0.5 gap-1 font-mono">
                              <LogOut className="w-2.5 h-2.5" />{t}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {emp.entries.length > 0 && emp.exits.length === 0 && (
                          <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs">En planta</Badge>
                        )}
                        {emp.entries.length > 0 && emp.exits.length > 0 && (
                          <Badge className="bg-slate-100 text-slate-600 border border-slate-200 text-xs">Salió</Badge>
                        )}
                        {emp.entries.length === 0 && (
                          <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs">Sin entrada</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}