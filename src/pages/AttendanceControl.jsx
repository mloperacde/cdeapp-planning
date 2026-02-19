import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Users, Clock, CheckCircle, AlertCircle, RefreshCw, Trash2, Search, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function AttendanceControl() {
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["attendanceRecords", filterDate],
    queryFn: () =>
      base44.entities.AttendanceRecord.filter({ record_date: filterDate }, "record_time", 500),
    staleTime: 2 * 60 * 1000,
  });

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
    e.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: employeeSummary.length,
    present: employeeSummary.filter((e) => e.entries.length > 0).length,
    left: employeeSummary.filter((e) => e.exits.length > 0 && e.entries.length > 0).length,
    totalRecords: records.length,
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

      // Buscar la fila de cabecera (ID, Empleado, Sentido...)
      let headerRowIdx = -1;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row && row.some((cell) => String(cell || "").trim() === "ID") &&
            row.some((cell) => String(cell || "").trim() === "Empleado")) {
          headerRowIdx = i;
          break;
        }
      }

      if (headerRowIdx === -1) {
        toast.error("No se encontró la cabecera del archivo. Verifica el formato.");
        return;
      }

      const headers = rows[headerRowIdx].map((h) => String(h || "").trim());
      const idxId = headers.indexOf("ID");
      const idxEmpleado = headers.findIndex(h => h === "Empleado");
      const idxSentido = headers.findIndex(h => h === "Sentido");
      const idxIncidencia = headers.findIndex(h => h === "Incidencia");
      const idxCentro = headers.findIndex(h => h === "Centro");
      const idxDepartamento = headers.findIndex(h => h === "Departamento");
      const idxDispositivo = headers.findIndex(h => h === "Dispositivo");
      const idxFecha = headers.findIndex(h => h === "Fecha");
      const idxHora = headers.findIndex(h => h === "Hora");

      const batchId = `import_${Date.now()}`;
      const dataRows = rows.slice(headerRowIdx + 1).filter(
        (row) => row && row[idxId] && row[idxEmpleado]
      );

      if (dataRows.length === 0) {
        toast.error("No se encontraron registros válidos en el archivo.");
        return;
      }

      const toCreate = dataRows.map((row) => {
        // Parsear fecha de Excel si es número
        let fechaStr = row[idxFecha];
        if (typeof fechaStr === "number") {
          const d = XLSX.SSF.parse_date_code(fechaStr);
          fechaStr = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
        } else if (typeof fechaStr === "string" && fechaStr.includes("/")) {
          const parts = fechaStr.split("/");
          fechaStr = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }

        return {
          employee_id: String(row[idxId]),
          employee_name: String(row[idxEmpleado] || "").trim(),
          direction: String(row[idxSentido] || "").trim(),
          incident: String(row[idxIncidencia] || "N/A").trim(),
          center: String(row[idxCentro] || "").trim(),
          department: String(row[idxDepartamento] || "").trim(),
          device: String(row[idxDispositivo] || "").trim(),
          record_date: fechaStr,
          record_time: String(row[idxHora] || "").trim(),
          import_batch: batchId,
        };
      });

      // Crear en lotes de 50
      const chunkSize = 50;
      for (let i = 0; i < toCreate.length; i += chunkSize) {
        await base44.entities.AttendanceRecord.bulkCreate(toCreate.slice(i, i + chunkSize));
      }

      toast.success(`${toCreate.length} registros importados correctamente.`);
      queryClient.invalidateQueries({ queryKey: ["attendanceRecords"] });

      // Auto-set filter date to imported date
      if (toCreate[0]?.record_date) setFilterDate(toCreate[0].record_date);
    } catch (err) {
      console.error(err);
      toast.error("Error al procesar el archivo: " + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClearDay = async () => {
    if (!confirm(`¿Eliminar todos los registros del ${filterDate}?`)) return;
    const toDelete = records;
    for (const r of toDelete) {
      await base44.entities.AttendanceRecord.delete(r.id);
    }
    toast.success("Registros eliminados.");
    queryClient.invalidateQueries({ queryKey: ["attendanceRecords"] });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Control de Presencia</h1>
          <p className="text-sm text-slate-500">Importa y analiza los marcajes del sistema de control de acceso</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileImport} />
          <Button onClick={() => fileInputRef.current?.click()} disabled={importing} className="bg-blue-600 hover:bg-blue-700">
            {importing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {importing ? "Importando..." : "Importar Excel"}
          </Button>
          {records.length > 0 && (
            <Button variant="outline" size="icon" onClick={handleClearDay} title="Eliminar registros del día">
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          )}
        </div>
      </div>

      {/* Filtro de fecha */}
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
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-slate-500">Empleados</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-slate-500">Con entrada</p>
                <p className="text-2xl font-bold">{stats.present}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-xs text-slate-500">Con salida</p>
                <p className="text-2xl font-bold">{stats.left}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-xs text-slate-500">Total marcajes</p>
                <p className="text-2xl font-bold">{stats.totalRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de empleados */}
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
            <CardTitle className="text-base">Registros del {filterDate} — {employeeSummary.length} empleados</CardTitle>
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
                            <Badge key={i} className="bg-green-100 text-green-800 text-xs">
                              <LogIn className="w-3 h-3 mr-1" />{t}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {emp.exits.sort().map((t, i) => (
                            <Badge key={i} className="bg-orange-100 text-orange-800 text-xs">
                              <LogOut className="w-3 h-3 mr-1" />{t}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {emp.entries.length > 0 && emp.exits.length === 0 && (
                          <Badge className="bg-blue-100 text-blue-800">En planta</Badge>
                        )}
                        {emp.entries.length > 0 && emp.exits.length > 0 && (
                          <Badge className="bg-slate-100 text-slate-700">Salió</Badge>
                        )}
                        {emp.entries.length === 0 && (
                          <Badge className="bg-red-100 text-red-800">Sin entrada</Badge>
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