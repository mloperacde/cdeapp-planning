import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw, Users, UserCheck, UserX, Clock, Search,
  AlertTriangle, CheckCircle2, ShieldAlert, Info
} from "lucide-react";
import { format } from "date-fns";

// Convierte "HH:mm" a minutos desde medianoche
function toMin(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatMin(min) {
  if (min == null || min <= 0) return "—";
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}

// Para un empleado maestro, devuelve la hora esperada de entrada y fin de jornada según el turno indicado
function getHorarioEsperado(master, turno) {
  if (!master) return { horaEntrada: null, horaFin: null, duracionMin: null };

  let horaEntrada = null;
  let horaFin = null;

  if (master.tipo_turno === "Turno Partido") {
    horaEntrada = master.turno_partido_entrada1 || null;
    horaFin = master.turno_partido_salida2 || null;
  } else if (turno === "Mañana" || master.tipo_turno === "Fijo Mañana") {
    horaEntrada = master.horario_manana_inicio || null;
    horaFin = master.horario_manana_fin || null;
  } else if (turno === "Tarde" || master.tipo_turno === "Fijo Tarde") {
    horaEntrada = master.horario_tarde_inicio || null;
    horaFin = master.horario_tarde_fin || null;
  } else if (master.tipo_turno === "Rotativo") {
    // Para rotativos, usar el turno seleccionado en pantalla
    if (turno === "Tarde") {
      horaEntrada = master.horario_tarde_inicio || null;
      horaFin = master.horario_tarde_fin || null;
    } else {
      horaEntrada = master.horario_manana_inicio || null;
      horaFin = master.horario_manana_fin || null;
    }
  }

  const duracionMin =
    horaEntrada && horaFin
      ? toMin(horaFin) - toMin(horaEntrada)
      : master.num_horas_jornada
      ? master.num_horas_jornada * 60 / 5 // horas semanales → día aproximado
      : null;

  return { horaEntrada, horaFin, duracionMin };
}

// Detecta incongruencias en la secuencia de marcajes de un empleado
function detectarIncongruencias(registros) {
  const issues = [];
  const sorted = [...registros].sort((a, b) => a.record_time.localeCompare(b.record_time));

  // Verificar que no haya dos entradas seguidas o dos salidas seguidas
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].direction === sorted[i - 1].direction) {
      issues.push(
        `Dos marcajes consecutivos de ${sorted[i].direction === "E" ? "ENTRADA" : "SALIDA"} a las ${sorted[i - 1].record_time} y ${sorted[i].record_time}`
      );
    }
  }

  // Verificar que empiece con entrada
  if (sorted.length > 0 && sorted[0].direction === "S") {
    issues.push(`El primer marcaje del día es una SALIDA (${sorted[0].record_time}), falta marcaje de entrada`);
  }

  // Marcaje final sin salida registrada (solo si hay más de 1 marcaje y termina en E)
  if (sorted.length > 1 && sorted[sorted.length - 1].direction === "E") {
    issues.push(`El último marcaje es una ENTRADA (${sorted[sorted.length - 1].record_time}), falta marcaje de salida final`);
  }

  return issues;
}

export default function AttendanceMonitor() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedShift, setSelectedShift] = useState("Mañana");
  const [consulted, setConsulted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState("todos");

  // Registros de fichajes del día
  const { data: rawRecords = [], isLoading: loadingRecords, refetch } = useQuery({
    queryKey: ["attendanceMonitor", selectedDate],
    queryFn: () =>
      base44.entities.AttendanceRecord.filter({ record_date: selectedDate }, "record_time", 2000),
    staleTime: 0,
    enabled: false,
  });

  // Base de datos maestra de empleados (todos activos)
  const { data: masterEmployees = [], isLoading: loadingMaster } = useQuery({
    queryKey: ["masterEmployeesMonitor"],
    queryFn: () => base44.entities.EmployeeMasterDatabase.filter({ estado_empleado: "Alta" }, "nombre", 500),
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

  const handleConsultar = async () => {
    setConsulted(false);
    await refetch();
    setConsulted(true);
  };

  // Mapa ID de empleado → datos maestros
  const masterMap = useMemo(() => {
    const map = {};
    for (const emp of masterEmployees) {
      if (emp.codigo_empleado) map[emp.codigo_empleado] = emp;
    }
    return map;
  }, [masterEmployees]);

  // Análisis principal: cruzar fichajes con base maestra
  const auditoria = useMemo(() => {
    if (!consulted || !rawRecords.length) return { rows: [], sinRegistro: [] };

    // Agrupar fichajes por empleado
    const fichajesMap = {};
    for (const r of rawRecords) {
      if (!fichajesMap[r.employee_id]) {
        fichajesMap[r.employee_id] = {
          employee_id: r.employee_id,
          employee_name: r.employee_name,
          department: r.department || "—",
          registros: [],
        };
      }
      fichajesMap[r.employee_id].registros.push(r);
    }

    const rows = Object.values(fichajesMap).map((emp) => {
      const sorted = [...emp.registros].sort((a, b) => a.record_time.localeCompare(b.record_time));
      const primeraEntrada = sorted.find(r => r.direction === "E");
      const ultimaSalida = [...sorted].reverse().find(r => r.direction === "S");

      // Cruzar con base maestra
      const master = masterMap[emp.employee_id] || null;
      const { horaEntrada: horaEsperada, horaFin: horaFinEsperada, duracionMin } = getHorarioEsperado(master, selectedShift);

      const departamento = master?.departamento || emp.department;
      const equipo = master?.equipo || "—";
      const jornada = master?.num_horas_jornada ? `${master.num_horas_jornada}h/semana` : "—";

      // Calcular retraso
      const tolerancia = departamentosEstrictos.includes(departamento) ? toleranciaReducida : toleranciaEntrada;
      let retrasoMin = 0;
      let esRetraso = false;
      if (primeraEntrada && horaEsperada) {
        const entradaMin = toMin(primeraEntrada.record_time);
        const esperadoMin = toMin(horaEsperada);
        retrasoMin = Math.max(0, entradaMin - esperadoMin - tolerancia);
        esRetraso = retrasoMin > 0;
      }

      // Calcular presencia efectiva (suma pares E/S)
      let presenciaEfectivaMin = 0;
      let entradaActual = null;
      for (const r of sorted) {
        if (r.direction === "E") entradaActual = r.record_time;
        else if (r.direction === "S" && entradaActual) {
          const diff = toMin(r.record_time) - toMin(entradaActual);
          if (diff > 0) presenciaEfectivaMin += diff;
          entradaActual = null;
        }
      }

      // Comparar jornada real vs esperada
      let incidenciaJornada = null;
      if (duracionMin && presenciaEfectivaMin > 0) {
        const deficit = duracionMin - presenciaEfectivaMin;
        if (deficit > tolerancia + 10) {
          incidenciaJornada = `Jornada incompleta: faltan ${deficit} min (esperados ${formatMin(duracionMin)}, realizados ${formatMin(presenciaEfectivaMin)})`;
        }
      }

      // Incongruencias en secuencia de marcajes
      const incongruencias = detectarIncongruencias(sorted);

      // Estado general
      let estado = "ok";
      if (incongruencias.length > 0) estado = "incongruencia";
      else if (esRetraso) estado = "retraso";
      else if (incidenciaJornada) estado = "jornada_incompleta";

      return {
        employee_id: emp.employee_id,
        employee_name: emp.employee_name,
        departamento,
        equipo,
        jornada,
        horaEsperada,
        horaFinEsperada,
        entrada: primeraEntrada?.record_time || null,
        salida: ultimaSalida?.record_time || null,
        totalMarcajes: sorted.length,
        retrasoMin,
        esRetraso,
        presenciaEfectivaMin,
        duracionEsperadaMin: duracionMin,
        incidenciaJornada,
        incongruencias,
        enMaestra: !!master,
        estado,
      };
    });

    // Empleados en maestra del turno que NO ficharon (ausentes)
    const fichajesIds = new Set(Object.keys(fichajesMap));
    const sinRegistro = masterEmployees.filter(m => {
      if (!m.codigo_empleado || m.estado_empleado !== "Alta") return false;
      if (fichajesIds.has(m.codigo_empleado)) return false;
      // Filtrar por turno si tiene horario configurado
      const { horaEntrada } = getHorarioEsperado(m, selectedShift);
      if (!horaEntrada) return false; // Sin horario configurado para este turno
      return true;
    });

    return { rows: rows.sort((a, b) => a.employee_name.localeCompare(b.employee_name)), sinRegistro };
  }, [rawRecords, masterMap, selectedShift, consulted, toleranciaEntrada, toleranciaReducida, departamentosEstrictos]);

  // Filtrar por búsqueda y pestaña
  const filteredRows = useMemo(() => {
    return auditoria.rows.filter(emp => {
      const matchSearch = !searchTerm ||
        emp.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id.includes(searchTerm) ||
        emp.departamento.toLowerCase().includes(searchTerm.toLowerCase());

      const matchTab =
        filterTab === "todos" ||
        (filterTab === "retrasos" && emp.esRetraso) ||
        (filterTab === "incongruencias" && emp.incongruencias.length > 0) ||
        (filterTab === "jornada" && emp.incidenciaJornada) ||
        (filterTab === "ok" && emp.estado === "ok");

      return matchSearch && matchTab;
    });
  }, [auditoria.rows, searchTerm, filterTab]);

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

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="w-5 h-5 text-blue-600" />
            Auditoría de Presencia
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Cruza los fichajes del día con la base maestra de empleados para detectar retrasos, ausencias e incongruencias.
          </p>
        </CardHeader>
        <CardContent className="p-4">
          {/* Controles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Fecha a analizar</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setConsulted(false); }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Turno</label>
              <Select value={selectedShift} onValueChange={(v) => { setSelectedShift(v); setConsulted(false); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mañana">Mañana</SelectItem>
                  <SelectItem value="Tarde">Tarde</SelectItem>
                  <SelectItem value="Noche">Noche</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleConsultar}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "Analizando..." : "Consultar y Auditar"}
              </Button>
            </div>
          </div>

          {/* Resultados */}
          {consulted && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
                <Card className="bg-blue-50 border-blue-200 cursor-pointer" onClick={() => setFilterTab("todos")}>
                  <CardContent className="p-3">
                    <p className="text-[10px] text-blue-700 font-medium uppercase">Con fichaje</p>
                    <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200 cursor-pointer" onClick={() => setFilterTab("todos")}>
                  <CardContent className="p-3">
                    <p className="text-[10px] text-red-700 font-medium uppercase">Ausentes</p>
                    <p className="text-2xl font-bold text-red-900">{stats.ausentes}</p>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-200 cursor-pointer" onClick={() => setFilterTab("retrasos")}>
                  <CardContent className="p-3">
                    <p className="text-[10px] text-orange-700 font-medium uppercase">Retrasos</p>
                    <p className="text-2xl font-bold text-orange-900">{stats.retrasos}</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200 cursor-pointer" onClick={() => setFilterTab("incongruencias")}>
                  <CardContent className="p-3">
                    <p className="text-[10px] text-purple-700 font-medium uppercase">Incongruencias</p>
                    <p className="text-2xl font-bold text-purple-900">{stats.incongruencias}</p>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-200 cursor-pointer" onClick={() => setFilterTab("jornada")}>
                  <CardContent className="p-3">
                    <p className="text-[10px] text-amber-700 font-medium uppercase">Jornada incompleta</p>
                    <p className="text-2xl font-bold text-amber-900">{stats.jornadaIncompleta}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200 cursor-pointer" onClick={() => setFilterTab("ok")}>
                  <CardContent className="p-3">
                    <p className="text-[10px] text-green-700 font-medium uppercase">Sin incidencias</p>
                    <p className="text-2xl font-bold text-green-900">{stats.ok}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Buscador */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre, ID o departamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Tabs value={filterTab} onValueChange={setFilterTab}>
                <TabsList className="mb-3 h-auto flex-wrap">
                  <TabsTrigger value="todos" className="text-xs">Todos ({stats.total})</TabsTrigger>
                  <TabsTrigger value="retrasos" className="text-xs text-orange-700">Retrasos ({stats.retrasos})</TabsTrigger>
                  <TabsTrigger value="incongruencias" className="text-xs text-purple-700">Incongruencias ({stats.incongruencias})</TabsTrigger>
                  <TabsTrigger value="jornada" className="text-xs text-amber-700">Jornada incompleta ({stats.jornadaIncompleta})</TabsTrigger>
                  <TabsTrigger value="ok" className="text-xs text-green-700">Correctos ({stats.ok})</TabsTrigger>
                  <TabsTrigger value="ausentes" className="text-xs text-red-700">Ausentes ({stats.ausentes})</TabsTrigger>
                </TabsList>

                {/* Tabla de fichajes auditados */}
                <TabsContent value={filterTab === "ausentes" ? "__never__" : filterTab} forceMount className={filterTab === "ausentes" ? "hidden" : ""}>
                  {filteredRows.length === 0 ? (
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
                            <th className="text-left px-3 py-2 font-medium text-slate-600">Departamento</th>
                            <th className="text-left px-3 py-2 font-medium text-slate-600">Equipo</th>
                            <th className="text-left px-3 py-2 font-medium text-slate-600">H. esperada</th>
                            <th className="text-left px-3 py-2 font-medium text-slate-600">Entrada real</th>
                            <th className="text-left px-3 py-2 font-medium text-slate-600">Salida real</th>
                            <th className="text-left px-3 py-2 font-medium text-slate-600">Retraso</th>
                            <th className="text-left px-3 py-2 font-medium text-slate-600">Presencia ef.</th>
                            <th className="text-left px-3 py-2 font-medium text-slate-600">Incidencias</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {filteredRows.map((emp) => (
                            <tr
                              key={emp.employee_id}
                              className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                                emp.incongruencias.length > 0 ? "bg-purple-50/40" :
                                emp.esRetraso ? "bg-orange-50/40" :
                                emp.incidenciaJornada ? "bg-amber-50/40" : ""
                              }`}
                            >
                              <td className="px-3 py-2 text-slate-400">{emp.employee_id}</td>
                              <td className="px-3 py-2">
                                <div className="font-medium text-slate-800 dark:text-slate-100">{emp.employee_name}</div>
                                {!emp.enMaestra && (
                                  <span className="text-[9px] text-amber-600 italic">No en base maestra</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-600">{emp.departamento}</td>
                              <td className="px-3 py-2 text-slate-500">{emp.equipo}</td>
                              <td className="px-3 py-2">
                                {emp.horaEsperada
                                  ? <Badge className="bg-slate-100 text-slate-700">{emp.horaEsperada}</Badge>
                                  : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="px-3 py-2">
                                {emp.entrada
                                  ? <Badge className={`${emp.esRetraso ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}`}>{emp.entrada}</Badge>
                                  : <Badge className="bg-red-100 text-red-700">Sin entrada</Badge>}
                              </td>
                              <td className="px-3 py-2">
                                {emp.salida
                                  ? <Badge className="bg-blue-100 text-blue-800">{emp.salida}</Badge>
                                  : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="px-3 py-2">
                                {emp.esRetraso
                                  ? <Badge className="bg-orange-100 text-orange-700">+{emp.retrasoMin} min</Badge>
                                  : emp.entrada
                                    ? <Badge className="bg-green-100 text-green-700">A tiempo</Badge>
                                    : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`font-medium ${
                                  emp.incidenciaJornada ? "text-amber-700" : "text-slate-700"
                                }`}>
                                  {formatMin(emp.presenciaEfectivaMin)}
                                </span>
                                {emp.duracionEsperadaMin && (
                                  <div className="text-[9px] text-slate-400">de {formatMin(emp.duracionEsperadaMin)}</div>
                                )}
                              </td>
                              <td className="px-3 py-2 max-w-[220px]">
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
                  )}
                </TabsContent>

                {/* Pestaña ausentes */}
                {filterTab === "ausentes" && (
                  <div>
                    {auditoria.sinRegistro.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>Todos los empleados con horario en este turno han fichado.</p>
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
                              <th className="text-left px-3 py-2 font-medium text-red-700">Turno</th>
                              <th className="text-left px-3 py-2 font-medium text-red-700">H. esperada</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-red-100">
                            {auditoria.sinRegistro.map((emp) => {
                              const { horaEntrada } = getHorarioEsperado(emp, selectedShift);
                              return (
                                <tr key={emp.id} className="bg-red-50/50 hover:bg-red-50">
                                  <td className="px-3 py-2 text-slate-500">{emp.codigo_empleado}</td>
                                  <td className="px-3 py-2 font-medium text-slate-800">{emp.nombre}</td>
                                  <td className="px-3 py-2 text-slate-600">{emp.departamento || "—"}</td>
                                  <td className="px-3 py-2 text-slate-500">{emp.equipo || "—"}</td>
                                  <td className="px-3 py-2 text-slate-500">{emp.tipo_turno || "—"}</td>
                                  <td className="px-3 py-2">
                                    <Badge className="bg-red-100 text-red-700">{horaEntrada || "—"}</Badge>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </Tabs>

              {/* Nota sobre tolerancia aplicada */}
              <div className="mt-3 flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-500">
                  Tolerancia de entrada: <strong>{toleranciaEntrada} min</strong> general
                  {departamentosEstrictos.length > 0 && (
                    <> · <strong>{toleranciaReducida} min</strong> para depts. estrictos ({departamentosEstrictos.join(", ")})</>
                  )}
                  {" "}· Los ausentes son empleados en base maestra activa con horario configurado para este turno que no han fichado.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}