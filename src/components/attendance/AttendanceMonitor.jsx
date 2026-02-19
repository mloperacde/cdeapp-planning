import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw, Search, AlertTriangle, CheckCircle2, ShieldAlert, Info, Clock, X
} from "lucide-react";
import { format } from "date-fns";

// ── Helpers ──────────────────────────────────────────────────────────────────

function toMin(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatMin(min) {
  if (min == null || min <= 0) return "—";
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}

// Devuelve { horaEntrada, horaFin, duracionMin } del empleado maestro para el turno dado
function getHorarioEsperado(master, turno) {
  if (!master) return { horaEntrada: null, horaFin: null, duracionMin: null };

  let horaEntrada = null;
  let horaFin = null;

  const tipo = master.tipo_turno;

  if (tipo === "Turno Partido") {
    horaEntrada = master.turno_partido_entrada1 || null;
    horaFin = master.turno_partido_salida2 || null;
  } else if (tipo === "Fijo Mañana" || (tipo === "Rotativo" && turno === "Mañana") || (!tipo && turno === "Mañana")) {
    horaEntrada = master.horario_manana_inicio || null;
    horaFin = master.horario_manana_fin || null;
  } else if (tipo === "Fijo Tarde" || (tipo === "Rotativo" && turno === "Tarde") || (!tipo && turno === "Tarde")) {
    horaEntrada = master.horario_tarde_inicio || null;
    horaFin = master.horario_tarde_fin || null;
  }

  const duracionMin =
    horaEntrada && horaFin ? toMin(horaFin) - toMin(horaEntrada) : null;

  return { horaEntrada, horaFin, duracionMin };
}

// Detecta incongruencias en marcajes intermedios (no afecta al cálculo de jornada)
function detectarIncongruencias(sorted) {
  const issues = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].direction === sorted[i - 1].direction) {
      const tipo = sorted[i].direction === "E" ? "ENTRADA" : "SALIDA";
      issues.push(`Doble ${tipo} consecutiva: ${sorted[i - 1].record_time} y ${sorted[i].record_time}`);
    }
  }
  return issues;
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function AttendanceMonitor() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [consulted, setConsulted] = useState(false);
  const [filterTab, setFilterTab] = useState("todos");

  // Filtros encima de la tabla (sin valor por defecto = sin filtro activo)
  const [searchEmp, setSearchEmp] = useState("");
  const [filterDpto, setFilterDpto] = useState("__all__");
  const [filterEquipo, setFilterEquipo] = useState("__all__");
  const [filterTurno, setFilterTurno] = useState("__all__");

  // Fichajes del día
  const { data: rawRecords = [], isLoading: loadingRecords, refetch } = useQuery({
    queryKey: ["attendanceMonitor", selectedDate],
    queryFn: () =>
      base44.entities.AttendanceRecord.filter({ record_date: selectedDate }, "record_time", 2000),
    staleTime: 0,
    enabled: false,
  });

  // Base maestra de empleados activos
  const { data: masterEmployees = [], isLoading: loadingMaster } = useQuery({
    queryKey: ["masterEmployeesMonitor"],
    queryFn: () =>
      base44.entities.EmployeeMasterDatabase.filter({ estado_empleado: "Alta" }, "nombre", 1000),
    staleTime: 60000,
  });

  // Configuración de presencia
  const { data: configs = [] } = useQuery({
    queryKey: ["attendanceConfig"],
    queryFn: () => base44.entities.AttendanceConfig.list(),
    staleTime: 60000,
  });

  const config = configs.find(c => c.activo) || {};
  const toleranciaEntrada = config.tolerancia_entrada_minutos ?? 10;
  const departamentosEstrictos = config.departamentos_estrictos || [];
  const toleranciaReducida = config.tolerancia_reducida_minutos ?? 5;

  // Mapa codigo_empleado → registro maestro
  const masterMap = useMemo(() => {
    const map = {};
    for (const emp of masterEmployees) {
      if (emp.codigo_empleado) map[String(emp.codigo_empleado)] = emp;
    }
    return map;
  }, [masterEmployees]);

  // Valores únicos de turno disponibles en la base maestra (para el filtro)
  const tiposTurno = useMemo(() => {
    const set = new Set();
    masterEmployees.forEach(m => { if (m.tipo_turno) set.add(m.tipo_turno); });
    return Array.from(set).sort();
  }, [masterEmployees]);

  const handleConsultar = async () => {
    setConsulted(false);
    await refetch();
    setConsulted(true);
  };

  // ── Auditoría ──────────────────────────────────────────────────────────────
  const auditoria = useMemo(() => {
    if (!consulted || !rawRecords.length) return { rows: [], sinRegistro: [] };

    // Agrupar fichajes por employee_id
    const fichajesMap = {};
    for (const r of rawRecords) {
      const id = String(r.employee_id);
      if (!fichajesMap[id]) fichajesMap[id] = { employee_id: id, employee_name: r.employee_name, registros: [] };
      fichajesMap[id].registros.push(r);
    }

    const rows = Object.values(fichajesMap).map((emp) => {
      const sorted = [...emp.registros].sort((a, b) => a.record_time.localeCompare(b.record_time));

      // Primer y último registro = base del cálculo de presencia/jornada
      const primerRegistro = sorted[0];
      const ultimoRegistro = sorted[sorted.length - 1];

      // TODOS los datos del empleado vienen de la base maestra (no del fichaje)
      const master = masterMap[emp.employee_id] || null;
      const departamento = master?.departamento || "—";
      const equipo = master?.equipo || "—";
      const tipoTurno = master?.tipo_turno || "—";

      // Hora esperada de entrada (desde maestro) — el turno del selector sirve para rotativos
      const turnoActivo = filterTurno !== "__all__" ? filterTurno : "Mañana";
      const { horaEntrada: horaEsperada, horaFin: horaFinEsperada, duracionMin } = getHorarioEsperado(master, turnoActivo);

      // Tolerancia según departamento
      const tolerancia = departamentosEstrictos.includes(departamento) ? toleranciaReducida : toleranciaEntrada;

      // Retraso: basado en el PRIMER registro del empleado vs hora esperada de entrada
      let retrasoMin = 0;
      let esRetraso = false;
      if (horaEsperada) {
        const entradaMin = toMin(primerRegistro.record_time);
        const esperadoMin = toMin(horaEsperada);
        retrasoMin = Math.max(0, entradaMin - esperadoMin - tolerancia);
        esRetraso = retrasoMin > 0;
      }

      // Presencia TOTAL = diferencia entre primer y último registro (independiente del sentido E/S)
      const presenciaMin =
        sorted.length >= 2
          ? toMin(ultimoRegistro.record_time) - toMin(primerRegistro.record_time)
          : 0;

      // Jornada incompleta: usando PRESENCIA TOTAL vs duración esperada
      let incidenciaJornada = null;
      if (duracionMin && presenciaMin > 0 && sorted.length >= 2) {
        const deficit = duracionMin - presenciaMin;
        if (deficit > tolerancia + 10) {
          incidenciaJornada = `Jornada incompleta: ${formatMin(presenciaMin)} de ${formatMin(duracionMin)} esperados (faltan ${deficit} min)`;
        }
      }

      // Incongruencias en fichajes intermedios (informativo, NO afecta al cálculo)
      const incongruencias = detectarIncongruencias(sorted);

      // Estado global del empleado
      let estado = "ok";
      if (incongruencias.length > 0 && (esRetraso || incidenciaJornada)) estado = "multiple";
      else if (incongruencias.length > 0) estado = "incongruencia";
      else if (esRetraso && incidenciaJornada) estado = "multiple";
      else if (esRetraso) estado = "retraso";
      else if (incidenciaJornada) estado = "jornada_incompleta";

      return {
        employee_id: emp.employee_id,
        employee_name: emp.employee_name,
        departamento,
        equipo,
        tipoTurno,
        horaEsperada,
        horaFinEsperada,
        primerMarcaje: primerRegistro.record_time,
        ultimoMarcaje: ultimoRegistro.record_time,
        totalMarcajes: sorted.length,
        retrasoMin,
        esRetraso,
        presenciaMin,
        duracionEsperadaMin: duracionMin,
        incidenciaJornada,
        incongruencias,
        enMaestra: !!master,
        estado,
      };
    });

    // Ausentes: en base maestra activa, con horario para el turno activo, sin fichaje
    const fichajesIds = new Set(Object.keys(fichajesMap));
    const turnoActivo = filterTurno !== "__all__" ? filterTurno : "Mañana";
    const sinRegistro = masterEmployees.filter(m => {
      if (!m.codigo_empleado || m.estado_empleado !== "Alta") return false;
      if (fichajesIds.has(String(m.codigo_empleado))) return false;
      const { horaEntrada } = getHorarioEsperado(m, turnoActivo);
      return !!horaEntrada;
    });

    return {
      rows: rows.sort((a, b) => a.employee_name.localeCompare(b.employee_name)),
      sinRegistro,
    };
  }, [rawRecords, masterMap, filterTurno, consulted, toleranciaEntrada, toleranciaReducida, departamentosEstrictos]);

  // ── Filtros de tabla ───────────────────────────────────────────────────────
  const dptos = useMemo(() => {
    const s = new Set(auditoria.rows.map(r => r.departamento).filter(d => d && d !== "—"));
    return Array.from(s).sort();
  }, [auditoria.rows]);

  const equipos = useMemo(() => {
    const s = new Set(auditoria.rows.map(r => r.equipo).filter(e => e && e !== "—"));
    return Array.from(s).sort();
  }, [auditoria.rows]);

  const filteredRows = useMemo(() => {
    return auditoria.rows.filter(emp => {
      if (searchEmp && !emp.employee_name.toLowerCase().includes(searchEmp.toLowerCase()) &&
          !emp.employee_id.includes(searchEmp)) return false;
      if (filterDpto !== "__all__" && emp.departamento !== filterDpto) return false;
      if (filterEquipo !== "__all__" && emp.equipo !== filterEquipo) return false;
      if (filterTab === "retrasos" && !emp.esRetraso) return false;
      if (filterTab === "incongruencias" && emp.incongruencias.length === 0) return false;
      if (filterTab === "jornada" && !emp.incidenciaJornada) return false;
      if (filterTab === "ok" && emp.estado !== "ok") return false;
      return true;
    });
  }, [auditoria.rows, searchEmp, filterDpto, filterEquipo, filterTab]);

  // KPIs
  const stats = useMemo(() => ({
    total: auditoria.rows.length,
    ausentes: auditoria.sinRegistro.length,
    retrasos: auditoria.rows.filter(e => e.esRetraso).length,
    incongruencias: auditoria.rows.filter(e => e.incongruencias.length > 0).length,
    jornadaIncompleta: auditoria.rows.filter(e => e.incidenciaJornada).length,
    ok: auditoria.rows.filter(e => e.estado === "ok").length,
  }), [auditoria]);

  const isLoading = loadingRecords || loadingMaster;
  const hayFiltrosActivos = searchEmp || filterDpto !== "__all__" || filterEquipo !== "__all__" || filterTurno !== "__all__";

  const clearFiltros = () => {
    setSearchEmp("");
    setFilterDpto("__all__");
    setFilterEquipo("__all__");
    setFilterTurno("__all__");
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="w-5 h-5 text-blue-600" />
            Auditoría de Presencia
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Cruza los fichajes con la base maestra por ID de empleado. Jornada calculada con primer y último marcaje del día.
          </p>
        </CardHeader>
        <CardContent className="p-4">

          {/* ── Controles superiores ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-4 items-end">
            {/* Fecha */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Fecha</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setConsulted(false); }}
              />
            </div>

            {/* Buscador empleado */}
            <div className="space-y-1 lg:col-span-2">
              <label className="text-xs font-medium text-slate-600">Buscar empleado</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="Nombre o ID..."
                  value={searchEmp}
                  onChange={e => setSearchEmp(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Filtro departamento */}
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

            {/* Filtro equipo */}
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

            {/* Filtro turno (tipos configurados en maestro) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Tipo de turno</label>
              <Select value={filterTurno} onValueChange={v => { setFilterTurno(v); setConsulted(false); }}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="Mañana">Mañana</SelectItem>
                  <SelectItem value="Tarde">Tarde</SelectItem>
                  {tiposTurno.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botón consultar + limpiar filtros */}
          <div className="flex gap-2 mb-4">
            <Button onClick={handleConsultar} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Analizando..." : "Consultar y Auditar"}
            </Button>
            {hayFiltrosActivos && (
              <Button variant="outline" onClick={clearFiltros} className="text-slate-500 gap-1">
                <X className="w-3 h-3" /> Limpiar filtros
              </Button>
            )}
          </div>

          {/* ── Resultados ── */}
          {consulted && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                {[
                  { label: "Con fichaje", val: stats.total, color: "blue", tab: "todos" },
                  { label: "Ausentes", val: stats.ausentes, color: "red", tab: "ausentes" },
                  { label: "Retrasos", val: stats.retrasos, color: "orange", tab: "retrasos" },
                  { label: "Incongruencias", val: stats.incongruencias, color: "purple", tab: "incongruencias" },
                  { label: "Jornada incompl.", val: stats.jornadaIncompleta, color: "amber", tab: "jornada" },
                  { label: "Sin incidencias", val: stats.ok, color: "green", tab: "ok" },
                ].map(({ label, val, color, tab }) => (
                  <Card
                    key={tab}
                    className={`bg-${color}-50 border-${color}-200 cursor-pointer hover:ring-2 hover:ring-${color}-300 transition-all ${filterTab === tab ? `ring-2 ring-${color}-400` : ""}`}
                    onClick={() => setFilterTab(tab)}
                  >
                    <CardContent className="p-3">
                      <p className={`text-[9px] text-${color}-700 font-semibold uppercase leading-tight`}>{label}</p>
                      <p className={`text-xl font-bold text-${color}-900`}>{val}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Tabs de incidencias */}
              <Tabs value={filterTab} onValueChange={setFilterTab} className="mb-3">
                <TabsList className="h-auto flex-wrap">
                  <TabsTrigger value="todos" className="text-xs">Todos ({stats.total})</TabsTrigger>
                  <TabsTrigger value="retrasos" className="text-xs">Retrasos ({stats.retrasos})</TabsTrigger>
                  <TabsTrigger value="incongruencias" className="text-xs">Incongruencias ({stats.incongruencias})</TabsTrigger>
                  <TabsTrigger value="jornada" className="text-xs">Jornada incompleta ({stats.jornadaIncompleta})</TabsTrigger>
                  <TabsTrigger value="ok" className="text-xs">Correctos ({stats.ok})</TabsTrigger>
                  <TabsTrigger value="ausentes" className="text-xs">Ausentes ({stats.ausentes})</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* ── Tabla de fichajes auditados ── */}
              {filterTab !== "ausentes" && (
                filteredRows.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No hay registros en esta categoría con los filtros actuales.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">ID</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Empleado</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Dpto. (maestra)</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Equipo (maestra)</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Turno (maestra)</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">H. entrada esp.</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">1er marcaje</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Últ. marcaje</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Retraso</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Presencia</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Incidencias</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredRows.map((emp) => (
                          <tr
                            key={emp.employee_id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                              emp.incongruencias.length > 0 && (emp.esRetraso || emp.incidenciaJornada) ? "bg-purple-50/30" :
                              emp.incongruencias.length > 0 ? "bg-purple-50/30" :
                              emp.esRetraso && emp.incidenciaJornada ? "bg-red-50/30" :
                              emp.esRetraso ? "bg-orange-50/30" :
                              emp.incidenciaJornada ? "bg-amber-50/30" : ""
                            }`}
                          >
                            <td className="px-3 py-2 text-slate-400 font-mono">{emp.employee_id}</td>
                            <td className="px-3 py-2">
                              <div className="font-medium text-slate-800 dark:text-slate-100">{emp.employee_name}</div>
                              {!emp.enMaestra && (
                                <span className="text-[9px] text-amber-600 italic">No en base maestra</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-600">{emp.departamento}</td>
                            <td className="px-3 py-2 text-slate-500">{emp.equipo}</td>
                            <td className="px-3 py-2 text-slate-500">{emp.tipoTurno}</td>
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
                                : <span className="text-slate-300">Solo 1 marcaje</span>}
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
                            <td className="px-3 py-2 max-w-[240px]">
                              <div className="space-y-1">
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

              {/* ── Tabla ausentes ── */}
              {filterTab === "ausentes" && (
                auditoria.sinRegistro.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>Todos los empleados con horario configurado han fichado.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-red-200">
                    <table className="w-full text-xs">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-red-700">ID</th>
                          <th className="text-left px-3 py-2 font-medium text-red-700">Empleado</th>
                          <th className="text-left px-3 py-2 font-medium text-red-700">Departamento</th>
                          <th className="text-left px-3 py-2 font-medium text-red-700">Equipo</th>
                          <th className="text-left px-3 py-2 font-medium text-red-700">Tipo turno</th>
                          <th className="text-left px-3 py-2 font-medium text-red-700">H. esperada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {auditoria.sinRegistro.map((emp) => {
                          const turnoActivo = filterTurno !== "__all__" ? filterTurno : "Mañana";
                          const { horaEntrada } = getHorarioEsperado(emp, turnoActivo);
                          return (
                            <tr key={emp.id} className="bg-red-50/50 hover:bg-red-50">
                              <td className="px-3 py-2 text-slate-500 font-mono">{emp.codigo_empleado}</td>
                              <td className="px-3 py-2 font-medium text-slate-800">{emp.nombre}</td>
                              <td className="px-3 py-2 text-slate-600">{emp.departamento || "—"}</td>
                              <td className="px-3 py-2 text-slate-500">{emp.equipo || "—"}</td>
                              <td className="px-3 py-2 text-slate-500">{emp.tipo_turno || "—"}</td>
                              <td className="px-3 py-2">
                                <Badge className="bg-red-100 text-red-700 font-mono">{horaEntrada || "—"}</Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* Nota metodología */}
              <div className="mt-3 flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-500">
                  <strong>Metodología:</strong> Jornada calculada con el primer y último marcaje del día (presencia total).
                  Los datos de departamento, equipo y turno son siempre de la <strong>base maestra</strong>, indexados por ID de empleado.
                  Tolerancia: <strong>{toleranciaEntrada} min</strong> general
                  {departamentosEstrictos.length > 0 && <> · <strong>{toleranciaReducida} min</strong> en depts. estrictos ({departamentosEstrictos.join(", ")})</>}.
                  Las incongruencias de fichajes intermedios se muestran de forma informativa y no alteran el cálculo de jornada.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}