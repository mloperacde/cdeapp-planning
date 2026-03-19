import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAppData } from "../data/DataProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RefreshCw, Download, Users, AlertCircle, UserX, Clock, CalendarRange, ChevronDown, ChevronUp, LayoutList, Table2
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { format, eachDayOfInterval, parseISO, isWeekend } from "date-fns";
import { es } from "date-fns/locale";

const CUCO_API_KEY = "k9fKmKcVCRc44Rf7dpkxhnfU9z9t0XsgrYgkGQSr9unWFZPOKsySznPHb7bUJzBc";
const CLIENT_CODE = "380";
const CUCO_BASE_URL = "https://cuco360.cucorent.com/api/apiv2";

// Horas mínimas de jornada para considerar completa
const MIN_SHIFT_HOURS = 6;

function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function calcWorkedMinutes(entries, exits) {
  if (!entries.length || !exits.length) return null;
  const entry = Math.min(...entries.map(timeToMinutes).filter(x => x !== null));
  const exit = Math.max(...exits.map(timeToMinutes).filter(x => x !== null));
  if (exit <= entry) return null;
  return exit - entry;
}

export default function AbsenteeismReport() {
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentDate: "" });
  const [reportData, setReportData] = useState(null); // { days: Map<date, records[]>, employees: Map }
  const [expandedDays, setExpandedDays] = useState({});
  const [filterType, setFilterType] = useState("all"); // all | absent | incomplete
  const [viewMode, setViewMode] = useState("summary"); // summary | detail

  const { employees: employeesData } = useAppData();
  const employees = employeesData || [];

  const employeesByCodigo = useMemo(() => {
    const map = new Map();
    employees.forEach(e => {
      const code = e?.codigo_empleado != null ? String(e.codigo_empleado) : null;
      if (code) map.set(code, e);
    });
    return map;
  }, [employees]);

  // Empleados activos (Alta) para cruzar
  const activeEmployees = useMemo(
    () => employees.filter(e => e.estado_empleado === "Alta" && e.incluir_en_planning !== false),
    [employees]
  );

  const fetchDayFromCuco = async (date) => {
    const start = encodeURIComponent(`${date} 00:00:00`);
    const end = encodeURIComponent(`${date} 23:59:59`);
    const url = `${CUCO_BASE_URL}/checking/getfullchecks/${CLIENT_CODE}?start_date=${start}&end_date=${end}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        APIkey: CUCO_API_KEY,
      },
    });

    if (!response.ok) throw new Error(`Error HTTP ${response.status} para ${date}`);
    const json = await response.json();
    return json.checks || json.data || [];
  };

  const runReport = async () => {
    if (!startDate || !endDate || startDate > endDate) {
      toast.error("Selecciona un rango de fechas válido");
      return;
    }

    const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
      .filter(d => !isWeekend(d))
      .map(d => format(d, "yyyy-MM-dd"));

    if (days.length === 0) {
      toast.warning("No hay días laborables en el rango seleccionado");
      return;
    }

    if (days.length > 31) {
      toast.error("El rango no puede superar 31 días laborables");
      return;
    }

    setLoading(true);
    setReportData(null);
    setProgress({ current: 0, total: days.length, currentDate: "" });

    const dayRecordsMap = new Map(); // date -> array of raw checks

    for (let i = 0; i < days.length; i++) {
      const date = days[i];
      setProgress({ current: i + 1, total: days.length, currentDate: date });

      try {
        const checks = await fetchDayFromCuco(date);
        dayRecordsMap.set(date, checks);
      } catch (err) {
        console.warn(`Error obteniendo ${date}:`, err.message);
        dayRecordsMap.set(date, []);
      }

      // Pequeña pausa para no saturar la API
      if (i < days.length - 1) await new Promise(r => setTimeout(r, 300));
    }

    setReportData({ dayRecordsMap, days });
    setLoading(false);
    toast.success(`Informe generado para ${days.length} días`);
  };

  // Procesar datos para el informe
  const processedReport = useMemo(() => {
    if (!reportData) return null;
    const { dayRecordsMap, days } = reportData;

    const summary = []; // array de { date, absent: [], incomplete: [], present: [] }

    for (const date of days) {
      const checks = dayRecordsMap.get(date) || [];

      // Agrupar marcajes por empleado (codigo interno)
      const byEmployee = new Map();
      for (const c of checks) {
        const code = String(c.cod_int_empleado || c.cod_interno || c.cod_empleado || "").trim();
        if (!code) continue;
        if (!byEmployee.has(code)) byEmployee.set(code, { entries: [], exits: [] });
        const dir = String(c.val_direccion || "").toUpperCase();
        const time = c.fec_marcaje ? c.fec_marcaje.split(" ")[1]?.slice(0, 5) : c.hora || "";
        if (dir === "S" || dir === "SALIDA" || dir === "OUT") {
          byEmployee.get(code).exits.push(time);
        } else {
          byEmployee.get(code).entries.push(time);
        }
      }

      const absent = [];
      const incomplete = [];
      const present = [];

      for (const emp of activeEmployees) {
        const code = String(emp.codigo_empleado || "").trim();
        if (!code) continue;

        const marcajes = byEmployee.get(code);
        const empInfo = { code, nombre: emp.nombre, departamento: emp.departamento, puesto: emp.puesto };

        if (!marcajes || marcajes.entries.length === 0) {
          absent.push(empInfo);
        } else {
          const workedMin = calcWorkedMinutes(marcajes.entries, marcajes.exits);
          if (workedMin !== null && workedMin < MIN_SHIFT_HOURS * 60) {
            incomplete.push({
              ...empInfo,
              entrada: marcajes.entries.sort()[0],
              salida: marcajes.exits.length ? marcajes.exits.sort().at(-1) : null,
              workedMinutes: workedMin,
            });
          } else {
            present.push(empInfo);
          }
        }
      }

      summary.push({ date, absent, incomplete, present });
    }

    // Totales por empleado a lo largo del periodo
    const employeeAbsences = new Map(); // code -> { absent: number, incomplete: number }
    for (const { absent, incomplete } of summary) {
      for (const e of absent) {
        if (!employeeAbsences.has(e.code)) employeeAbsences.set(e.code, { ...e, absent: 0, incomplete: 0 });
        employeeAbsences.get(e.code).absent++;
      }
      for (const e of incomplete) {
        if (!employeeAbsences.has(e.code)) employeeAbsences.set(e.code, { ...e, absent: 0, incomplete: 0 });
        employeeAbsences.get(e.code).incomplete++;
      }
    }

    const rankingList = [...employeeAbsences.values()]
      .sort((a, b) => (b.absent + b.incomplete) - (a.absent + a.incomplete));

    return { summary, rankingList, totalDays: days.length };
  }, [reportData, activeEmployees]);

  const toggleDay = (date) => setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }));

  const exportExcel = () => {
    if (!processedReport) return;

    const rows = [];
    for (const { date, absent, incomplete } of processedReport.summary) {
      for (const e of absent) {
        rows.push({ Fecha: date, Empleado: e.nombre, Código: e.code, Departamento: e.departamento, Puesto: e.puesto, Tipo: "Ausente", Entrada: "", Salida: "", "Horas trabajadas": "" });
      }
      for (const e of incomplete) {
        rows.push({
          Fecha: date, Empleado: e.nombre, Código: e.code, Departamento: e.departamento, Puesto: e.puesto,
          Tipo: "Jornada incompleta",
          Entrada: e.entrada || "",
          Salida: e.salida || "",
          "Horas trabajadas": e.workedMinutes != null ? (e.workedMinutes / 60).toFixed(1) + "h" : "",
        });
      }
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Absentismo");
    XLSX.writeFile(wb, `Informe_Absentismo_${startDate}_${endDate}.xlsx`);
    toast.success("Exportado correctamente");
  };

  const filteredSummary = useMemo(() => {
    if (!processedReport) return [];
    return processedReport.summary.map(day => ({
      ...day,
      absent: filterType === "incomplete" ? [] : day.absent,
      incomplete: filterType === "absent" ? [] : day.incomplete,
    }));
  }, [processedReport, filterType]);

  return (
    <div className="space-y-4">
      {/* Config Panel */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Fecha inicio</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Fecha fin</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
            </div>
            <Button onClick={runReport} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 h-9">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {loading ? `Importando día ${progress.current}/${progress.total}...` : "Generar Informe"}
            </Button>
            {processedReport && (
              <Button variant="outline" onClick={exportExcel} className="h-9 text-green-700 border-green-200 hover:bg-green-50">
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>
            )}
          </div>
          {loading && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Importando marcajes de Cuco360...</span>
                <span>{progress.currentDate}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {processedReport && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card><CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-blue-500" />
                <div><p className="text-xs text-slate-500">Días analizados</p><p className="text-2xl font-bold">{processedReport.totalDays}</p></div>
              </div>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-500" />
                <div><p className="text-xs text-slate-500">Empleados activos</p><p className="text-2xl font-bold">{activeEmployees.length}</p></div>
              </div>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-xs text-slate-500">Ausencias totales</p>
                  <p className="text-2xl font-bold text-red-600">{processedReport.summary.reduce((s, d) => s + d.absent.length, 0)}</p>
                </div>
              </div>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-xs text-slate-500">Jornadas incompletas</p>
                  <p className="text-2xl font-bold text-orange-600">{processedReport.summary.reduce((s, d) => s + d.incomplete.length, 0)}</p>
                </div>
              </div>
            </CardContent></Card>
          </div>

          {/* Ranking empleados */}
          {processedReport.rankingList.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Empleados con más incidencias en el periodo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-slate-600">#</th>
                        <th className="text-left px-4 py-2 font-medium text-slate-600">Empleado</th>
                        <th className="text-left px-4 py-2 font-medium text-slate-600">Departamento</th>
                        <th className="text-left px-4 py-2 font-medium text-slate-600 text-center">Ausencias</th>
                        <th className="text-left px-4 py-2 font-medium text-slate-600 text-center">Inc. Jornada</th>
                        <th className="text-left px-4 py-2 font-medium text-slate-600 text-center">Total días</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {processedReport.rankingList.map((e, i) => (
                        <tr key={e.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-2 text-slate-400 font-mono">{i + 1}</td>
                          <td className="px-4 py-2 font-medium">{e.nombre}</td>
                          <td className="px-4 py-2 text-slate-500">{e.departamento || "—"}</td>
                          <td className="px-4 py-2 text-center">
                            {e.absent > 0 ? <Badge className="bg-red-100 text-red-800">{e.absent}</Badge> : <span className="text-slate-300">0</span>}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {e.incomplete > 0 ? <Badge className="bg-orange-100 text-orange-800">{e.incomplete}</Badge> : <span className="text-slate-300">0</span>}
                          </td>
                          <td className="px-4 py-2 text-center font-semibold">{e.absent + e.incomplete}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Controles de vista y filtro */}
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2">
              {[["all", "Todos"], ["absent", "Solo ausentes"], ["incomplete", "Solo inc. jornada"]].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFilterType(val)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filterType === val ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("summary")}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${viewMode === "summary" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Table2 className="w-3.5 h-3.5" /> Resumen
              </button>
              <button
                onClick={() => setViewMode("detail")}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${viewMode === "detail" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
              >
                <LayoutList className="w-3.5 h-3.5" /> Detalle
              </button>
            </div>
          </div>

          {/* MODO RESUMEN: tabla por día */}
          {viewMode === "summary" && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Fecha</th>
                        <th className="text-center px-4 py-3 font-medium text-slate-600">Deberían fichar</th>
                        <th className="text-center px-4 py-3 font-medium text-slate-600">Sin presencia</th>
                        <th className="text-center px-4 py-3 font-medium text-slate-600">Con incidencia</th>
                        <th className="text-center px-4 py-3 font-medium text-slate-600">% Ausencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {processedReport.summary.map(({ date, absent, incomplete, present }) => {
                        const total = activeEmployees.length;
                        const absentCount = absent.length;
                        const incompleteCount = incomplete.length;
                        const absentPct = total > 0 ? ((absentCount / total) * 100).toFixed(1) : "0.0";
                        const hasIssues = absentCount > 0 || incompleteCount > 0;
                        return (
                          <tr key={date} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${hasIssues ? "" : "opacity-60"}`}>
                            <td className="px-4 py-2.5 font-medium text-slate-700">
                              {format(parseISO(date), "EEE d MMM", { locale: es })}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="font-semibold text-slate-700">{total}</span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {absentCount > 0
                                ? <Badge className="bg-red-100 text-red-800">{absentCount}</Badge>
                                : <span className="text-green-600 font-semibold">0</span>
                              }
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {incompleteCount > 0
                                ? <Badge className="bg-orange-100 text-orange-800">{incompleteCount}</Badge>
                                : <span className="text-green-600 font-semibold">0</span>
                              }
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`font-bold text-sm ${parseFloat(absentPct) >= 10 ? "text-red-600" : parseFloat(absentPct) >= 5 ? "text-orange-500" : "text-green-600"}`}>
                                {absentPct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200">
                      <tr>
                        <td className="px-4 py-2.5 font-bold text-slate-700">TOTAL</td>
                        <td className="px-4 py-2.5 text-center text-slate-500 text-xs">—</td>
                        <td className="px-4 py-2.5 text-center font-bold text-red-700">
                          {processedReport.summary.reduce((s, d) => s + d.absent.length, 0)}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-orange-700">
                          {processedReport.summary.reduce((s, d) => s + d.incomplete.length, 0)}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-700">
                          {(() => {
                            const totalAbsences = processedReport.summary.reduce((s, d) => s + d.absent.length, 0);
                            const totalPossible = activeEmployees.length * processedReport.totalDays;
                            return totalPossible > 0 ? ((totalAbsences / totalPossible) * 100).toFixed(1) + "%" : "—";
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* MODO DETALLE: cards por día expandibles */}
          {viewMode === "detail" && (
          <div className="space-y-2">
            {filteredSummary.map(({ date, absent, incomplete, present }) => {
              const hasIssues = absent.length > 0 || incomplete.length > 0;
              if (!hasIssues && filterType !== "all") return null;
              const isOpen = expandedDays[date];

              return (
                <Card key={date} className={hasIssues ? "border-orange-200" : "border-green-200"}>
                  <button
                    className="w-full text-left"
                    onClick={() => toggleDay(date)}
                  >
                    <CardHeader className="pb-2 pt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm">
                            {format(parseISO(date), "EEEE d MMMM yyyy", { locale: es })}
                          </span>
                          {absent.length > 0 && (
                            <Badge className="bg-red-100 text-red-800 text-xs">
                              <UserX className="w-3 h-3 mr-1" />{absent.length} ausentes
                            </Badge>
                          )}
                          {incomplete.length > 0 && (
                            <Badge className="bg-orange-100 text-orange-800 text-xs">
                              <Clock className="w-3 h-3 mr-1" />{incomplete.length} inc.
                            </Badge>
                          )}
                          {!hasIssues && (
                            <Badge className="bg-green-100 text-green-800 text-xs">✓ Sin incidencias</Badge>
                          )}
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </CardHeader>
                  </button>

                  {isOpen && (
                    <CardContent className="pt-0 pb-3 space-y-3">
                      {absent.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-red-700 mb-1 uppercase tracking-wider">Sin marcaje (ausentes)</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                            {absent.map(e => (
                              <div key={e.code} className="flex items-center gap-2 bg-red-50 rounded px-2 py-1">
                                <UserX className="w-3 h-3 text-red-500 shrink-0" />
                                <span className="text-xs font-medium truncate">{e.nombre}</span>
                                <span className="text-xs text-slate-400 ml-auto shrink-0">{e.departamento?.slice(0, 10)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {incomplete.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-orange-700 mb-1 uppercase tracking-wider">Jornada incompleta (&lt;{MIN_SHIFT_HOURS}h)</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                            {incomplete.map(e => (
                              <div key={e.code} className="flex items-center gap-2 bg-orange-50 rounded px-2 py-1">
                                <Clock className="w-3 h-3 text-orange-500 shrink-0" />
                                <span className="text-xs font-medium truncate">{e.nombre}</span>
                                <span className="text-xs text-orange-600 ml-auto shrink-0 font-mono">
                                  {e.entrada}→{e.salida || "?"}
                                  {e.workedMinutes != null && ` (${(e.workedMinutes / 60).toFixed(1)}h)`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>}
        </>
      )}

      {!processedReport && !loading && (
        <Card>
          <CardContent className="py-16 text-center text-slate-400">
            <CalendarRange className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Selecciona un rango de fechas y genera el informe</p>
            <p className="text-sm mt-1">Se importarán los marcajes de Cuco360 para cada día laborable</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}