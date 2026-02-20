import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw, Search, AlertTriangle, CheckCircle2, ShieldAlert, Info,
  Clock, X, Bell
} from "lucide-react";
import { format } from "date-fns";

function formatMin(min) {
  if (min == null || min <= 0) return "—";
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}

function toMin(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function isInCorte(emp, target) {
  if (!emp.horaEsperada || !emp.horaFinEsperada) return false;
  const targetMin = toMin(target);
  const start = toMin(emp.horaEsperada);
  const end = toMin(emp.horaFinEsperada);
  if (start == null || end == null) return false;
  if (targetMin < start || targetMin > end) return false;
  const first = toMin(emp.primerMarcaje);
  const last = toMin(emp.ultimoMarcaje);
  if (first == null || last == null) return false;
  return first <= targetMin && last >= targetMin;
}

export default function AttendanceMonitor() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [consulted, setConsulted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [filterTab, setFilterTab] = useState("todos");
  const [searchEmp, setSearchEmp] = useState("");
  const [filterDpto, setFilterDpto] = useState("__all__");
  const [filterEquipo, setFilterEquipo] = useState("__all__");
  const [filterTurno, setFilterTurno] = useState("__all__");
  const [activeCorte, setActiveCorte] = useState(null);

  const handleConsultar = async () => {
    setIsLoading(true);
    setConsulted(false);
    try {
      const res = await base44.functions.invoke("analyzeAttendance", {
        date: selectedDate,
      });
      setResult(res.data);
      setConsulted(true);
    } finally {
      setIsLoading(false);
    }
  };

  const dptos = useMemo(() => {
    if (!result) return [];
    const s = new Set(result.rows.map(r => r.departamento).filter(d => d && d !== "—"));
    return Array.from(s).sort();
  }, [result]);

  const equipos = useMemo(() => {
    if (!result) return [];
    const s = new Set(result.rows.map(r => r.equipo).filter(e => e && e !== "—"));
    return Array.from(s).sort();
  }, [result]);

  const baseFilteredRows = useMemo(() => {
    if (!result) return [];
    return result.rows.filter(emp => {
      if (searchEmp && !emp.employee_name.toLowerCase().includes(searchEmp.toLowerCase()) &&
          !emp.employee_id.includes(searchEmp)) return false;
      if (filterDpto !== "__all__" && emp.departamento !== filterDpto) return false;
      if (filterEquipo !== "__all__" && emp.equipo !== filterEquipo) return false;
      if (filterTurno !== "__all__" && emp.turnoReal !== filterTurno) return false;
      return true;
    });
  }, [result, searchEmp, filterDpto, filterEquipo, filterTurno]);

  const filteredRows = useMemo(() => {
    if (!result) return [];
    let base = baseFilteredRows;
    if (activeCorte) {
      base = base.filter(emp => isInCorte(emp, activeCorte));
    }
    return base.filter(emp => {
      if (filterTab === "retrasos" && !emp.esRetraso) return false;
      if (filterTab === "incongruencias" && emp.incongruencias.length === 0 && !emp.alertaPresenciaConAusencia) return false;
      if (filterTab === "jornada" && !emp.incidenciaJornada) return false;
      if (filterTab === "ok" && emp.estado !== "ok") return false;
      if (filterTab === "alerta_ausencia" && !emp.alertaPresenciaConAusencia) return false;
      return true;
    });
  }, [result, baseFilteredRows, filterTab, activeCorte]);

  const stats = useMemo(() => {
    if (!result) return {};
    return {
      total: result.rows.length,
      ausentes: result.sinRegistro.length,
      ausenciasSinConfigurar: result.sinRegistro.filter(e => e.alertaFaltaAusencia).length,
      ausenciasConfirmadas: result.sinRegistro.filter(e => e.ausenciaConfirmada).length,
      alertaAusencia: result.rows.filter(e => e.alertaPresenciaConAusencia).length,
      retrasos: result.rows.filter(e => e.esRetraso).length,
      incongruencias: result.rows.filter(e => e.incongruencias.length > 0).length,
      jornadaIncompleta: result.rows.filter(e => e.incidenciaJornada).length,
      ok: result.rows.filter(e => e.estado === "ok").length,
      noEnMaestra: result.noEnMaestra.length,
    };
  }, [result]);

  const deptCounts = useMemo(() => {
    if (!result) return [];
    const m = new Map();
    for (const e of filteredRows) {
      const k = e.departamento || "—";
      m.set(k, (m.get(k) || 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredRows]);

  const teamCounts = useMemo(() => {
    if (!result) return [];
    const m = new Map();
    for (const e of filteredRows) {
      const k = e.equipo || "—";
      m.set(k, (m.get(k) || 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredRows]);

  const hayFiltrosActivos = searchEmp || filterDpto !== "__all__" || filterEquipo !== "__all__" || filterTurno !== "__all__" || activeCorte;
  const clearFiltros = () => {
    setSearchEmp("");
    setFilterDpto("__all__");
    setFilterEquipo("__all__");
    setFilterTurno("__all__");
    setActiveCorte(null);
  };

  const cortes = useMemo(() => {
    if (!result) return { at07: 0, at14: 0, at15: 0 };
    const list = baseFilteredRows;
    const compute = (target) => {
      let count = 0;
      for (const emp of list) {
        if (isInCorte(emp, target)) count++;
      }
      return count;
    };
    return {
      at07: compute("07:00"),
      at14: compute("14:00"),
      at15: compute("15:00"),
    };
  }, [result, baseFilteredRows]);

  // helper para horario esperado en tabla sinRegistro
  function getHoraEsperada(emp) {
    const t = filterTurno === "__all__" ? "Mañana" : filterTurno;
    if (emp.tipo_turno === "Turno Partido") return emp.turno_partido_entrada1 || "—";
    if (emp.tipo_turno === "Fijo Mañana" || t === "Mañana") return emp.horario_manana_inicio || "—";
    if (emp.tipo_turno === "Fijo Tarde" || t === "Tarde") return emp.horario_tarde_inicio || "—";
    return "—";
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="w-5 h-5 text-blue-600" />
            Auditoría de Presencia
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Cruza fichajes con la base maestra y el módulo de ausencias. Procesamiento en backend para máximo rendimiento.
          </p>
        </CardHeader>
        <CardContent className="p-4">

          {/* Controles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Fecha</label>
              <Input type="date" value={selectedDate}
                onChange={e => { setSelectedDate(e.target.value); setConsulted(false); }} />
            </div>
            <div className="space-y-1 lg:col-span-2">
              <label className="text-xs font-medium text-slate-600">Buscar empleado</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input placeholder="Nombre o ID..." value={searchEmp}
                  onChange={e => setSearchEmp(e.target.value)} className="pl-8" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Departamento</label>
              <Select value={filterDpto} onValueChange={setFilterDpto}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {dptos.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Equipo</label>
              <Select value={filterEquipo} onValueChange={setFilterEquipo}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {equipos.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Filtrar turno</label>
              <Select value={filterTurno} onValueChange={setFilterTurno}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos los turnos</SelectItem>
                  <SelectItem value="Mañana">Mañana</SelectItem>
                  <SelectItem value="Tarde">Tarde</SelectItem>
                  <SelectItem value="Partido">Partido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <Button onClick={handleConsultar} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Analizando..." : "Consultar y Auditar"}
            </Button>
            {consulted && hayFiltrosActivos && (
              <Button variant="outline" onClick={clearFiltros} className="text-slate-500 gap-1 text-xs">
                <X className="w-3 h-3" /> Limpiar filtros
              </Button>
            )}
          </div>

          {consulted && result && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-xs text-slate-600">Con fichaje por departamento:</span>
                {deptCounts.map(([d, c]) => {
                  const active = filterDpto !== "__all__" && filterDpto === d;
                  return (
                    <Badge
                      key={d}
                      onClick={() => setFilterDpto(active ? "__all__" : d)}
                      className={`bg-slate-100 text-slate-700 cursor-pointer hover:bg-slate-200 ${active ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                    >
                      {d}: {c}
                    </Badge>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-xs text-slate-600">Con fichaje por equipo:</span>
                {teamCounts.map(([e, c]) => {
                  const active = filterEquipo !== "__all__" && filterEquipo === e;
                  return (
                    <Badge
                      key={e}
                      onClick={() => setFilterEquipo(active ? "__all__" : e)}
                      className={`bg-slate-100 text-slate-700 cursor-pointer hover:bg-slate-200 ${active ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                    >
                      {e}: {c}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resultados */}
          {consulted && result && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
                {[
                  { label: "Con fichaje", val: stats.total, color: "blue", tab: "todos" },
                  { label: "⚠ Sin ausencia", val: stats.ausenciasSinConfigurar, color: "red", tab: "ausentes" },
                  { label: "✓ Ausencia conf.", val: stats.ausenciasConfirmadas, color: "slate", tab: "ausentes" },
                  { label: "🔔 Ficha+ausencia", val: stats.alertaAusencia, color: "yellow", tab: "alerta_ausencia" },
                  { label: "Retrasos", val: stats.retrasos, color: "orange", tab: "retrasos" },
                  { label: "Incongruencias", val: stats.incongruencias, color: "purple", tab: "incongruencias" },
                  { label: "Jornada incompl.", val: stats.jornadaIncompleta, color: "amber", tab: "jornada" },
                  { label: "Sin incidencias", val: stats.ok, color: "green", tab: "ok" },
                ].map(({ label, val, color, tab }) => (
                  <Card key={`${tab}-${label}`}
                    className={`cursor-pointer transition-all hover:shadow-md ${filterTab === tab ? "ring-2 ring-offset-1" : ""}`}
                    onClick={() => setFilterTab(tab)}>
                    <CardContent className="p-2.5">
                      <p className="text-[9px] font-semibold uppercase leading-tight mb-1 text-slate-600">{label}</p>
                      <p className="text-xl font-bold text-slate-900">{val}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${activeCorte === "07:00" ? "ring-2 ring-offset-1" : ""}`}
                  onClick={() => setActiveCorte(activeCorte === "07:00" ? null : "07:00")}
                >
                  <CardContent className="p-2.5">
                    <p className="text-[9px] font-semibold uppercase leading-tight mb-1 text-slate-600">
                      Disponibles 07:00
                    </p>
                    <p className="text-xl font-bold text-slate-900">{cortes.at07}</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${activeCorte === "14:00" ? "ring-2 ring-offset-1" : ""}`}
                  onClick={() => setActiveCorte(activeCorte === "14:00" ? null : "14:00")}
                >
                  <CardContent className="p-2.5">
                    <p className="text-[9px] font-semibold uppercase leading-tight mb-1 text-slate-600">
                      Disponibles 14:00
                    </p>
                    <p className="text-xl font-bold text-slate-900">{cortes.at14}</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${activeCorte === "15:00" ? "ring-2 ring-offset-1" : ""}`}
                  onClick={() => setActiveCorte(activeCorte === "15:00" ? null : "15:00")}
                >
                  <CardContent className="p-2.5">
                    <p className="text-[9px] font-semibold uppercase leading-tight mb-1 text-slate-600">
                      Disponibles 15:00
                    </p>
                    <p className="text-xl font-bold text-slate-900">{cortes.at15}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs */}
              <Tabs value={filterTab} onValueChange={setFilterTab} className="mb-3">
                <TabsList className="h-auto flex-wrap gap-1">
                  <TabsTrigger value="todos" className="text-xs">Todos ({stats.total})</TabsTrigger>
                  <TabsTrigger value="alerta_ausencia" className="text-xs">🔔 Ficha+ausencia ({stats.alertaAusencia})</TabsTrigger>
                  <TabsTrigger value="retrasos" className="text-xs">Retrasos ({stats.retrasos})</TabsTrigger>
                  <TabsTrigger value="incongruencias" className="text-xs">Incongruencias ({stats.incongruencias})</TabsTrigger>
                  <TabsTrigger value="jornada" className="text-xs">Jornada incompleta ({stats.jornadaIncompleta})</TabsTrigger>
                  <TabsTrigger value="ok" className="text-xs">Correctos ({stats.ok})</TabsTrigger>
                  <TabsTrigger value="ausentes" className="text-xs">Sin presencia ({stats.ausentes})</TabsTrigger>
                  {stats.noEnMaestra > 0 && (
                    <TabsTrigger value="no_maestra" className="text-xs">No en maestra ({stats.noEnMaestra})</TabsTrigger>
                  )}
                </TabsList>
              </Tabs>

              {/* ── Tabla: empleados CON fichaje ── */}
              {!["ausentes", "no_maestra"].includes(filterTab) && (
                filteredRows.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No hay registros en esta categoría.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">ID</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Empleado</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Dpto.</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Equipo</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Turno</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">H. esp.</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">1er marcaje</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Últ. marcaje</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Retraso</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Presencia</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Incidencias</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredRows.map(emp => (
                          <tr key={emp.employee_id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                              emp.alertaPresenciaConAusencia ? "bg-yellow-50/50" :
                              emp.incongruencias.length > 0 ? "bg-purple-50/30" :
                              emp.esRetraso && emp.incidenciaJornada ? "bg-red-50/30" :
                              emp.esRetraso ? "bg-orange-50/30" :
                              emp.incidenciaJornada ? "bg-amber-50/30" : ""
                            }`}>
                            <td className="px-3 py-2 text-slate-400 font-mono">{emp.employee_id}</td>
                            <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{emp.employee_name}</td>
                            <td className="px-3 py-2 text-slate-600">{emp.departamento}</td>
                            <td className="px-3 py-2 text-slate-500">{emp.equipo}</td>
                            <td className="px-3 py-2 text-slate-500">{emp.turnoReal || emp.tipoTurno}</td>
                            <td className="px-3 py-2">
                              {emp.horaEsperada
                                ? <Badge className="bg-slate-100 text-slate-700 font-mono">{emp.horaEsperada}</Badge>
                                : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-3 py-2">
                              <Badge className={`font-mono ${emp.esRetraso ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}`}>
                                {emp.primerMarcaje}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              {emp.totalMarcajes > 1
                                ? <Badge className="bg-blue-100 text-blue-800 font-mono">{emp.ultimoMarcaje}</Badge>
                                : <span className="text-slate-400 italic">1 marcaje</span>}
                            </td>
                            <td className="px-3 py-2">
                              {emp.esRetraso
                                ? <Badge className="bg-orange-100 text-orange-700">+{emp.retrasoMin} min</Badge>
                                : emp.horaEsperada
                                  ? <Badge className="bg-green-100 text-green-700">A tiempo</Badge>
                                  : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`font-medium ${emp.incidenciaJornada ? "text-amber-700" : "text-slate-700"}`}>
                                {formatMin(emp.presenciaMin)}
                              </span>
                              {emp.duracionEsperadaMin && (
                                <div className="text-[9px] text-slate-400">de {formatMin(emp.duracionEsperadaMin)}</div>
                              )}
                            </td>
                            <td className="px-3 py-2 max-w-[260px]">
                              <div className="space-y-1">
                                {emp.alertaPresenciaConAusencia && (
                                  <div className="flex items-start gap-1 bg-yellow-100 rounded p-1">
                                    <Bell className="w-3 h-3 text-yellow-600 mt-0.5 shrink-0" />
                                    <span className="text-yellow-800 text-[10px] leading-tight font-medium">
                                      ALERTA: Ha fichado pero tiene ausencia activa ({emp.ausencia?.tipo || "ausencia"}).
                                    </span>
                                  </div>
                                )}
                                {emp.incongruencias.map((inc, i) => (
                                  <div key={i} className="flex items-start gap-1">
                                    <AlertTriangle className="w-3 h-3 text-purple-500 mt-0.5 shrink-0" />
                                    <span className="text-purple-700 text-[10px] leading-tight">{inc}</span>
                                  </div>
                                ))}
                                {emp.incidenciaJornada && (
                                  <div className="flex items-start gap-1">
                                    <Clock className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                                    <span className="text-amber-700 text-[10px] leading-tight">{emp.incidenciaJornada}</span>
                                  </div>
                                )}
                                {emp.estado === "ok" && (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                                    <span className="text-green-600 text-[10px]">Sin incidencias</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* ── Tabla: sin presencia ── */}
              {filterTab === "ausentes" && (
                result.sinRegistro.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>Todos los empleados con horario configurado han fichado.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">ID</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Empleado</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Departamento</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Equipo</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">H. esperada</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Estado ausencia</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {result.sinRegistro.map(emp => (
                          <tr key={emp.id} className={`hover:bg-slate-50 ${emp.alertaFaltaAusencia ? "bg-red-50/40" : "bg-slate-50/30"}`}>
                            <td className="px-3 py-2 text-slate-500 font-mono">{emp.codigo_empleado}</td>
                            <td className="px-3 py-2 font-medium text-slate-800">{emp.nombre}</td>
                            <td className="px-3 py-2 text-slate-600">{emp.departamento || "—"}</td>
                            <td className="px-3 py-2 text-slate-500">{emp.equipo || "—"}</td>
                            <td className="px-3 py-2">
                              <Badge className="bg-slate-100 text-slate-600 font-mono">{getHoraEsperada(emp)}</Badge>
                            </td>
                            <td className="px-3 py-2">
                              {emp.ausenciaConfirmada ? (
                                <Badge className="bg-blue-100 text-blue-700">{emp.ausencia?.tipo || "Registrada"}</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700">Sin ausencia</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {emp.ausenciaConfirmada ? (
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-blue-500" />
                                  <span className="text-blue-700 text-[10px]">Confirmada</span>
                                </div>
                              ) : (
                                <div className="flex items-start gap-1">
                                  <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                                  <span className="text-red-700 text-[10px] font-medium">Crear ausencia en RRHH</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* ── Tabla: no en maestra ── */}
              {filterTab === "no_maestra" && (
                <div className="overflow-x-auto rounded-lg border border-amber-200">
                  <table className="w-full text-xs">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-amber-700">ID</th>
                        <th className="text-left px-3 py-2 font-medium text-amber-700">Nombre</th>
                        <th className="text-left px-3 py-2 font-medium text-amber-700">Marcajes</th>
                        <th className="text-left px-3 py-2 font-medium text-amber-700">Incidencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {result.noEnMaestra.map(emp => (
                        <tr key={emp.employee_id} className="bg-amber-50/40">
                          <td className="px-3 py-2 font-mono text-slate-600">{emp.employee_id}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{emp.employee_name}</td>
                          <td className="px-3 py-2 text-slate-500">{emp.totalMarcajes}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span className="text-amber-700 text-[10px]">ID no encontrado en base maestra</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Info configuración semanal equipos */}
              {result.teamScheduleMap && Object.keys(result.teamScheduleMap).length > 0 && (
                <div className="mt-3 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    <strong>Semana {result.weekStart}:</strong>{" "}
                    {Object.entries(result.teamScheduleMap).map(([k, v]) => (
                      <span key={k} className="mr-3">
                        <strong>{k === "team_1" ? "Turno 1" : k === "team_2" ? "Turno 2" : k}</strong>: {v}
                      </span>
                    ))}
                    · Empleados rotativos de turno Tarde <strong>no se muestran como ausentes</strong>.
                  </p>
                </div>
              )}

              {/* Nota metodología */}
              <div className="mt-2 flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  <strong>Metodología:</strong> Presencia = primer → último marcaje del día.
                  Tolerancia: <strong>{result.toleranciaEntrada} min</strong> general
                  {result.departamentosEstrictos?.length > 0 && <> · <strong>{result.toleranciaReducida} min</strong> en depts. estrictos</>}.
                  {" "}<strong>🔔 Ficha+ausencia:</strong> empleado con ausencia activa que ha fichado → revisar.
                  {" "}<strong>⚠ Sin ausencia:</strong> sin presencia y sin ausencia → crear ausencia.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
