import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogIn, LogOut, Clock, Search, ArrowRightLeft, Timer } from "lucide-react";

// Presencia total: diferencia entre primer y último marcaje
function calcularPresenciaTotal(registros) {
  if (registros.length < 2) return 0;
  const sorted = [...registros].sort((a, b) => a.record_time.localeCompare(b.record_time));
  const primera = sorted[0].record_time;
  const ultima = sorted[sorted.length - 1].record_time;
  const [hE, mE] = primera.split(":").map(Number);
  const [hS, mS] = ultima.split(":").map(Number);
  const diff = (hS * 60 + mS) - (hE * 60 + mE);
  return diff > 0 ? diff : 0;
}

// Presencia efectiva: suma de pares entrada/salida
function calcularPresenciaEfectiva(registros) {
  const sorted = [...registros].sort((a, b) => a.record_time.localeCompare(b.record_time));
  let minutos = 0;
  let entradaActual = null;

  for (const r of sorted) {
    if (r.direction === "E") {
      entradaActual = r.record_time;
    } else if (r.direction === "S" && entradaActual) {
      const [hE, mE] = entradaActual.split(":").map(Number);
      const [hS, mS] = r.record_time.split(":").map(Number);
      const diff = (hS * 60 + mS) - (hE * 60 + mE);
      if (diff > 0) minutos += diff;
      entradaActual = null;
    }
  }
  return minutos;
}

function formatHoras(minutos) {
  if (!minutos || minutos <= 0) return "—";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export default function AttendanceList({ selectedDate, onDateChange }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("all");

  const { data: rawRecords = [], isLoading } = useQuery({
    queryKey: ["attendanceRecords", selectedDate],
    queryFn: () => base44.entities.AttendanceRecord.filter({ record_date: selectedDate }, "record_time", 2000),
    staleTime: 0,
    enabled: !!selectedDate,
  });

  // Departamentos únicos para filtro
  const departments = useMemo(() => {
    const depts = new Set(rawRecords.map(r => r.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [rawRecords]);

  // Agrupar registros por empleado
  const employeeRows = useMemo(() => {
    const map = {};
    for (const r of rawRecords) {
      const key = r.employee_id;
      if (!map[key]) {
        map[key] = {
          employee_id: r.employee_id,
          employee_name: r.employee_name,
          department: r.department || "—",
          registros: [],
        };
      }
      map[key].registros.push(r);
    }

    return Object.values(map).map(emp => {
      const sorted = [...emp.registros].sort((a, b) => a.record_time.localeCompare(b.record_time));
      const entrada = sorted[0]; // primer registro
      const salida = sorted.length > 1 ? sorted[sorted.length - 1] : null; // último registro
      const intermedios = sorted.slice(1, sorted.length - 1); // los del medio
      const minutosTotal = calcularPresenciaTotal(sorted);
      const minutosEfectiva = calcularPresenciaEfectiva(sorted);

      return {
        ...emp,
        entrada,
        salida,
        intermedios,
        minutosTotal,
        minutosEfectiva,
        totalMarcajes: sorted.length,
      };
    }).sort((a, b) => a.employee_name.localeCompare(b.employee_name));
  }, [rawRecords]);

  // Filtrar
  const filtered = useMemo(() => {
    return employeeRows.filter(emp => {
      const matchSearch = !searchTerm ||
        emp.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id.includes(searchTerm);
      const matchDept = filterDept === "all" || emp.department === filterDept;
      return matchSearch && matchDept;
    });
  }, [employeeRows, searchTerm, filterDept]);

  return (
    <div className="space-y-4 p-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Fecha:</label>
          <Input
            type="date"
            value={selectedDate}
            onChange={e => onDateChange(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar empleado o ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los departamentos</SelectItem>
            {departments.map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-slate-500">{filtered.length} empleados</span>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Registros del {selectedDate}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10 text-slate-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No hay registros para esta fecha.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-slate-600 dark:text-slate-300 w-16">ID</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-600 dark:text-slate-300">Empleado</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-600 dark:text-slate-300 w-32">
                      <div className="flex items-center gap-1"><LogIn className="w-3.5 h-3.5 text-green-600" /> Entrada</div>
                    </th>
                    <th className="text-left px-4 py-2 font-medium text-slate-600 dark:text-slate-300 w-32">
                      <div className="flex items-center gap-1"><LogOut className="w-3.5 h-3.5 text-red-500" /> Salida</div>
                    </th>
                    <th className="text-left px-4 py-2 font-medium text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1"><ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" /> Marcajes intermedios</div>
                    </th>
                    <th className="text-left px-4 py-2 font-medium text-slate-600 dark:text-slate-300 w-28">
                      <div className="flex items-center gap-1"><Timer className="w-3.5 h-3.5 text-purple-500" /> Presencia total</div>
                    </th>
                    <th className="text-left px-4 py-2 font-medium text-slate-600 dark:text-slate-300 w-28">
                      <div className="flex items-center gap-1"><Timer className="w-3.5 h-3.5 text-green-600" /> P. efectiva</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filtered.map(emp => (
                    <tr key={emp.employee_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      {/* ID */}
                      <td className="px-4 py-2 text-slate-400 text-xs">{emp.employee_id}</td>

                      {/* Nombre + Dept */}
                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-800 dark:text-slate-100">{emp.employee_name}</div>
                        <div className="text-xs text-slate-400">{emp.department}</div>
                      </td>

                      {/* Entrada */}
                      <td className="px-4 py-2">
                        {emp.entrada ? (
                          <div>
                            <Badge className="bg-green-100 text-green-800 text-xs font-semibold">
                              <LogIn className="w-3 h-3 mr-1" />{emp.entrada.record_time}
                            </Badge>
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                              {emp.entrada.direction === "E" ? "Entrada" : "Salida"} · {emp.entrada.device || "—"}
                            </div>
                          </div>
                        ) : <span className="text-slate-300">—</span>}
                      </td>

                      {/* Salida */}
                      <td className="px-4 py-2">
                        {emp.salida && emp.salida.record_time !== emp.entrada?.record_time ? (
                          <div>
                            <Badge className="bg-orange-100 text-orange-800 text-xs font-semibold">
                              <LogOut className="w-3 h-3 mr-1" />{emp.salida.record_time}
                            </Badge>
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                              {emp.salida.direction === "S" ? "Salida" : "Entrada"} · {emp.salida.device || "—"}
                            </div>
                          </div>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-700 text-xs">En planta</Badge>
                        )}
                      </td>

                      {/* Intermedios */}
                      <td className="px-4 py-2">
                        {emp.intermedios.length === 0 ? (
                          <span className="text-slate-300 text-xs">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {emp.intermedios.map((r, i) => (
                              <div key={i} className="flex items-center gap-0.5">
                                <Badge
                                  className={`text-[10px] px-1.5 py-0 ${
                                    r.direction === "E"
                                      ? "bg-green-50 text-green-700 border border-green-200"
                                      : "bg-red-50 text-red-700 border border-red-200"
                                  }`}
                                >
                                  {r.direction === "E" ? <LogIn className="w-2.5 h-2.5 mr-0.5 inline" /> : <LogOut className="w-2.5 h-2.5 mr-0.5 inline" />}
                                  {r.record_time}
                                </Badge>
                                {r.incident && r.incident !== "N/A" && (
                                  <span className="text-[9px] text-slate-400 italic max-w-[80px] truncate">
                                    {r.incident}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Presencia total */}
                      <td className="px-4 py-2">
                        <span className={`font-semibold text-sm ${
                          emp.minutosTotal >= 420 ? "text-purple-700"
                          : emp.minutosTotal > 0 ? "text-amber-600"
                          : "text-slate-400"
                        }`}>
                          {formatHoras(emp.minutosTotal)}
                        </span>
                        <div className="text-[10px] text-slate-400">{emp.totalMarcajes} marcajes</div>
                      </td>

                      {/* Presencia efectiva */}
                      <td className="px-4 py-2">
                        <span className={`font-semibold text-sm ${
                          emp.minutosEfectiva >= 420 ? "text-green-700"
                          : emp.minutosEfectiva > 0 ? "text-amber-600"
                          : "text-slate-400"
                        }`}>
                          {formatHoras(emp.minutosEfectiva)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}