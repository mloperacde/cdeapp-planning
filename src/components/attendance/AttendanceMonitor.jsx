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
  RefreshCw, Search, AlertTriangle, CheckCircle2, ShieldAlert, Info,
  Clock, X, UserX, Bell, BellOff, UserCheck
} from "lucide-react";
import { format } from "date-fns";

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMin(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatMin(min) {
  if (min == null || min <= 0) return "—";
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}

function getHorarioEsperado(master, turno) {
  if (!master) return { horaEntrada: null, horaFin: null, duracionMin: null };
  const tipo = master.tipo_turno;
  let horaEntrada = null, horaFin = null;

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

  const duracionMin = horaEntrada && horaFin ? toMin(horaFin) - toMin(horaEntrada) : null;
  return { horaEntrada, horaFin, duracionMin };
}

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

// Comprueba si una ausencia está activa en la fecha dada
function ausenciaActivaEnFecha(absence, fecha) {
  if (!absence?.fecha_inicio) return false;
  const inicio = new Date(absence.fecha_inicio);
  const fin = absence.fecha_fin_desconocida ? new Date("2099-12-31") : new Date(absence.fecha_fin);
  const d = new Date(fecha);
  return d >= new Date(inicio.toDateString()) && d <= new Date(fin.toDateString());
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function AttendanceMonitor() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [consulted, setConsulted] = useState(false);
  const [filterTab, setFilterTab] = useState("todos");
  const [searchEmp, setSearchEmp] = useState("");
  const [filterDpto, setFilterDpto] = useState("__all__");
  const [filterEquipo, setFilterEquipo] = useState("__all__");
  const [filterTurno, setFilterTurno] = useState("__all__");

  // Fichajes del día
  const { data: rawRecords = [], isLoading: loadingRecords, refetch } = useQuery({
    queryKey: ["attendanceMonitor", selectedDate],
    queryFn: () => base44.entities.AttendanceRecord.filter({ record_date: selectedDate }, "record_time", 2000),
    staleTime: 0,
    enabled: false,
  });

  // TODOS los empleados de la base maestra (Alta Y Baja, para cruzar con fichajes)
  const { data: masterEmployees = [], isLoading: loadingMaster } = useQuery({
    queryKey: ["masterEmployeesMonitorAll"],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list("nombre", 1000),
    staleTime: 60000,
  });

  // Ausencias activas (Aprobadas o Pendientes)
  const { data: ausencias = [], isLoading: loadingAusencias } = useQuery({
    queryKey: ["ausenciasMonitor"],
    queryFn: () => base44.entities.Absence.filter(
      { estado_aprobacion: { $in: ["Aprobada", "Pendiente"] } },
      "-fecha_inicio",
      500
    ),
    staleTime: 30000,
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

  // Mapa codigo_empleado → registro maestro (para cruzar con fichajes)
  const masterMapByCodigo = useMemo(() => {
    const map = {};
    for (const emp of masterEmployees) {
      if (emp.codigo_empleado) map[String(emp.codigo_empleado)] = emp;
    }
    return map;
  }, [masterEmployees]);

  // Mapa employee_id (ID de Employee entity) → ausencias activas en la fecha
  // Necesitamos este mapa para: codigo_empleado → ausencia
  // La relación es: Absence.employee_id → EmployeeMasterDatabase.employee_id → codigo_empleado
  const ausenciasMap = useMemo(() => {
    // Mapa: employee_id (del Employee record) → master record
    const masterByEmployeeId = {};
    for (const m of masterEmployees) {
      if (m.employee_id) masterByEmployeeId[m.employee_id] = m;
    }
    // Mapa: codigo_empleado → ausencia activa en selectedDate
    const map = {};
    for (const a of ausencias) {
      if (!ausenciaActivaEnFecha(a, selectedDate)) continue;
      const master = masterByEmployeeId[a.employee_id];
      if (master?.codigo_empleado) {
        map[String(master.codigo_empleado)] = a;
      }
    }
    return map;
  }, [ausencias, masterEmployees, selectedDate]);

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
    if (!consulted) return { rows: [], sinRegistro: [], noEnMaestra: [] };

    const turnoActivo = filterTurno !== "__all__" ? filterTurno : "Mañana";

    // Agrupar fichajes por employee_id
    const fichajesMap = {};
    for (const r of rawRecords) {
      const id = String(r.employee_id);
      if (!fichajesMap[id]) fichajesMap[id] = { employee_id: id, employee_name: r.employee_name, registros: [] };
      fichajesMap[id].registros.push(r);
    }

    // ── 1. Empleados CON fichaje ──────────────────────────────────────────────
    const rows = [];
    const noEnMaestra = []; // empleados del excel no encontrados en base maestra

    for (const emp of Object.values(fichajesMap)) {
      const sorted = [...emp.registros].sort((a, b) => a.record_time.localeCompare(b.record_time));
      const primerRegistro = sorted[0];
      const ultimoRegistro = sorted[sorted.length - 1];

      const master = masterMapByCodigo[emp.employee_id] || null;

      // Si no está en la base maestra → va a noEnMaestra
      if (!master) {
        noEnMaestra.push({ employee_id: emp.employee_id, employee_name: emp.employee_name, totalMarcajes: sorted.length });
        continue;
      }

      const departamento = master.departamento || "—";
      const equipo = master.equipo || "—";
      const tipoTurno = master.tipo_turno || "—";
      const { horaEntrada: horaEsperada, horaFin: horaFinEsperada, duracionMin } = getHorarioEsperado(master, turnoActivo);
      const tolerancia = departamentosEstrictos.includes(departamento) ? toleranciaReducida : toleranciaEntrada;

      // Retraso
      let retrasoMin = 0, esRetraso = false;
      if (horaEsperada) {
        retrasoMin = Math.max(0, toMin(primerRegistro.record_time) - toMin(horaEsperada) - tolerancia);
        esRetraso = retrasoMin > 0;
      }

      // Presencia TOTAL (primer → último marcaje)
      const presenciaMin = sorted.length >= 2
        ? toMin(ultimoRegistro.record_time) - toMin(primerRegistro.record_time)
        : 0;

      // Jornada incompleta
      let incidenciaJornada = null;
      if (duracionMin && presenciaMin > 0 && sorted.length >= 2) {
        const deficit = duracionMin - presenciaMin;
        if (deficit > tolerancia + 10) {
          incidenciaJornada = `Jornada incompleta: ${formatMin(presenciaMin)} de ${formatMin(duracionMin)} esperados (faltan ${deficit} min)`;
        }
      }

      // Incongruencias en fichajes intermedios
      const incongruencias = detectarIncongruencias(sorted);

      // Estado de ausencia
      const ausencia = ausenciasMap[emp.employee_id] || null;
      // ⚠️ Empleado con ausencia registrada pero HA fichado → alerta de presencia inesperada
      const alertaPresenciaConAusencia = !!ausencia;

      let estado = "ok";
      if (alertaPresenciaConAusencia) estado = "alerta_ausencia";
      else if (incongruencias.length > 0) estado = "incongruencia";
      else if (esRetraso) estado = "retraso";
      else if (incidenciaJornada) estado = "jornada_incompleta";

      rows.push({
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
        ausencia,
        alertaPresenciaConAusencia,
        estado,
      });
    }

    // ── 2. Empleados SIN fichaje (ausentes) ──────────────────────────────────
    const fichajesIds = new Set(Object.keys(fichajesMap));
    const sinRegistro = masterEmployees
      .filter(m => {
        if (!m.codigo_empleado || m.estado_empleado !== "Alta") return false;
        if (fichajesIds.has(String(m.codigo_empleado))) return false;
        const { horaEntrada } = getHorarioEsperado(m, turnoActivo);
        return !!horaEntrada;
      })
      .map(m => {
        const ausencia = ausenciasMap[String(m.codigo_empleado)] || null;
        return {
          ...m,
          ausencia,
          // Si tiene ausencia registrada → su estado está confirmado
          // Si NO tiene ausencia → hay que configurarle una
          alertaFaltaAusencia: !ausencia,
          ausenciaConfirmada: !!ausencia,
        };
      });

    return {
      rows: rows.sort((a, b) => a.employee_name.localeCompare(b.employee_name)),
      sinRegistro,
      noEnMaestra,
    };
  }, [rawRecords, masterMapByCodigo, ausenciasMap, filterTurno, consulted,
      toleranciaEntrada, toleranciaReducida, departamentosEstrictos, masterEmployees]);

  // ── Filtros ────────────────────────────────────────────────────────────────
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
      if (filterTab === "incongruencias" && emp.incongruencias.length === 0 && !emp.alertaPresenciaConAusencia) return false;
      if (filterTab === "jornada" && !emp.incidenciaJornada) return false;
      if (filterTab === "ok" && emp.estado !== "ok") return false;
      if (filterTab === "alerta_ausencia" && !emp.alertaPresenciaConAusencia) return false;
      return true;
    });
  }, [auditoria.rows, searchEmp, filterDpto, filterEquipo, filterTab]);

  const stats = useMemo(() => ({
    total: auditoria.rows.length,
    ausentes: auditoria.sinRegistro.length,
    ausenciasSinConfigurar: auditoria.sinRegistro.filter(e => e.alertaFaltaAusencia).length,
    ausenciasConfirmadas: auditoria.sinRegistro.filter(e => e.ausenciaConfirmada).length,
    alertaAusencia: auditoria.rows.filter(e => e.alertaPresenciaConAusencia).length,
    retrasos: auditoria.rows.filter(e => e.esRetraso).length,
    incongruencias: auditoria.rows.filter(e => e.incongruencias.length > 0).length,
    jornadaIncompleta: auditoria.rows.filter(e => e.incidenciaJornada).length,
    ok: auditoria.rows.filter(e => e.estado === "ok").length,
    noEnMaestra: auditoria.noEnMaestra.length,
  }), [auditoria]);

  const isLoading = loadingRecords || loadingMaster || loadingAusencias;
  const hayFiltrosActivos = searchEmp || filterDpto !== "__all__" || filterEquipo !== "__all__" || filterTurno !== "__all__";

  const clearFiltros = () => {
    setSearchEmp(""); setFilterDpto("__all__"); setFilterEquipo("__all__"); setFilterTurno("__all__");
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
            Cruza fichajes con la base maestra y el módulo de ausencias. Jornada: primer → último marcaje del día.
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

          <div className="flex gap-2 mb-4">
            <Button onClick={handleConsultar} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Analizando..." : "Consultar y Auditar"}
            </Button>
            {hayFiltrosActivos && (
              <Button variant="outline" onClick={clearFiltros} className="text-slate-500 gap-1 text-xs">
                <X className="w-3 h-3" /> Limpiar filtros
              </Button>
            )}
          </div>

          {/* Resultados */}
          {consulted && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
                {[
                  { label: "Con fichaje", val: stats.total, color: "blue", tab: "todos" },
                  { label: "⚠ Sin ausencia config.", val: stats.ausenciasSinConfigurar, color: "red", tab: "ausentes" },
                  { label: "✓ Ausencia confirmada", val: stats.ausenciasConfirmadas, color: "slate", tab: "ausentes" },
                  { label: "🔔 Ficha con ausencia", val: stats.alertaAusencia, color: "yellow", tab: "alerta_ausencia" },
                  { label: "Retrasos", val: stats.retrasos, color: "orange", tab: "retrasos" },
                  { label: "Incongruencias", val: stats.incongruencias, color: "purple", tab: "incongruencias" },
                  { label: "Jornada incompl.", val: stats.jornadaIncompleta, color: "amber", tab: "jornada" },
                  { label: "Sin incidencias", val: stats.ok, color: "green", tab: "ok" },
                ].map(({ label, val, color, tab }) => (
                  <Card key={`${tab}-${label}`}
                    className={`cursor-pointer transition-all border-${color}-200 bg-${color}-50 hover:shadow-md ${filterTab === tab ? `ring-2 ring-${color}-400` : ""}`}
                    onClick={() => setFilterTab(tab)}>
                    <CardContent className="p-2.5">
                      <p className={`text-[9px] text-${color}-700 font-semibold uppercase leading-tight mb-1`}>{label}</p>
                      <p className={`text-xl font-bold text-${color}-900`}>{val}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Tabs */}
              <Tabs value={filterTab} onValueChange={setFilterTab} className="mb-3">
                <TabsList className="h-auto flex-wrap gap-1">
                  <TabsTrigger value="todos" className="text-xs">Todos con fichaje ({stats.total})</TabsTrigger>
                  <TabsTrigger value="alerta_ausencia" className="text-xs text-yellow-700">🔔 Ficharon con ausencia ({stats.alertaAusencia})</TabsTrigger>
                  <TabsTrigger value="retrasos" className="text-xs">Retrasos ({stats.retrasos})</TabsTrigger>
                  <TabsTrigger value="incongruencias" className="text-xs">Incongruencias ({stats.incongruencias})</TabsTrigger>
                  <TabsTrigger value="jornada" className="text-xs">Jornada incompleta ({stats.jornadaIncompleta})</TabsTrigger>
                  <TabsTrigger value="ok" className="text-xs">Correctos ({stats.ok})</TabsTrigger>
                  <TabsTrigger value="ausentes" className="text-xs">Sin presencia ({stats.ausentes})</TabsTrigger>
                  {stats.noEnMaestra > 0 && (
                    <TabsTrigger value="no_maestra" className="text-xs text-amber-700">No en maestra ({stats.noEnMaestra})</TabsTrigger>
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
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Incidencias / Alertas</th>
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
                                {/* ALERTA: fichó pero tiene ausencia configurada */}
                                {emp.alertaPresenciaConAusencia && (
                                  <div className="flex items-start gap-1 bg-yellow-100 rounded p-1">
                                    <Bell className="w-3 h-3 text-yellow-600 mt-0.5 shrink-0" />
                                    <span className="text-yellow-800 text-[10px] leading-tight font-medium">
                                      ALERTA: Ha fichado pero tiene ausencia activa ({emp.ausencia?.tipo || "ausencia"}).
                                      Revisar en Gestión de Ausencias.
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

              {/* ── Tabla: sin presencia (ausentes) ── */}
              {filterTab === "ausentes" && (
                auditoria.sinRegistro.length === 0 ? (
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
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Tipo turno</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">H. esperada</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Estado ausencia</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Acción requerida</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {auditoria.sinRegistro.map(emp => {
                          const turnoActivo = filterTurno !== "__all__" ? filterTurno : "Mañana";
                          const { horaEntrada } = getHorarioEsperado(emp, turnoActivo);
                          return (
                            <tr key={emp.id}
                              className={`hover:bg-slate-50 ${emp.alertaFaltaAusencia ? "bg-red-50/40" : "bg-slate-50/30"}`}>
                              <td className="px-3 py-2 text-slate-500 font-mono">{emp.codigo_empleado}</td>
                              <td className="px-3 py-2 font-medium text-slate-800">{emp.nombre}</td>
                              <td className="px-3 py-2 text-slate-600">{emp.departamento || "—"}</td>
                              <td className="px-3 py-2 text-slate-500">{emp.equipo || "—"}</td>
                              <td className="px-3 py-2 text-slate-500">{emp.tipo_turno || "—"}</td>
                              <td className="px-3 py-2">
                                <Badge className="bg-slate-100 text-slate-600 font-mono">{horaEntrada || "—"}</Badge>
                              </td>
                              <td className="px-3 py-2">
                                {emp.ausenciaConfirmada ? (
                                  <div>
                                    <Badge className="bg-blue-100 text-blue-700">
                                      {emp.ausencia?.tipo || "Ausencia registrada"}
                                    </Badge>
                                    <div className="text-[9px] text-slate-400 mt-0.5">
                                      {emp.ausencia?.estado_aprobacion}
                                    </div>
                                  </div>
                                ) : (
                                  <Badge className="bg-red-100 text-red-700">Sin ausencia registrada</Badge>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {emp.ausenciaConfirmada ? (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-blue-500" />
                                    <span className="text-blue-700 text-[10px]">Ausencia confirmada en sistema</span>
                                  </div>
                                ) : (
                                  <div className="flex items-start gap-1">
                                    <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                                    <span className="text-red-700 text-[10px] leading-tight font-medium">
                                      Configurar ausencia en Gestión de Ausencias
                                    </span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* ── Tabla: no encontrados en base maestra ── */}
              {filterTab === "no_maestra" && (
                <div className="overflow-x-auto rounded-lg border border-amber-200">
                  <table className="w-full text-xs">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-amber-700">ID (fichaje)</th>
                        <th className="text-left px-3 py-2 font-medium text-amber-700">Nombre (fichaje)</th>
                        <th className="text-left px-3 py-2 font-medium text-amber-700">Marcajes</th>
                        <th className="text-left px-3 py-2 font-medium text-amber-700">Incidencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {auditoria.noEnMaestra.map(emp => (
                        <tr key={emp.employee_id} className="bg-amber-50/40 hover:bg-amber-50">
                          <td className="px-3 py-2 font-mono text-slate-600">{emp.employee_id}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{emp.employee_name}</td>
                          <td className="px-3 py-2 text-slate-500">{emp.totalMarcajes}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span className="text-amber-700 text-[10px]">
                                ID no encontrado en base maestra de empleados
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Nota metodología */}
              <div className="mt-3 flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  <strong>Metodología:</strong> Presencia = primer → último marcaje del día.
                  Datos de turno/dpto./equipo siempre de la <strong>base maestra</strong> (índice: ID empleado).
                  Tolerancia: <strong>{toleranciaEntrada} min</strong> general{departamentosEstrictos.length > 0 && <> · <strong>{toleranciaReducida} min</strong> en depts. estrictos</>}.
                  {" "}<strong>🔔 Ficha con ausencia:</strong> empleado con ausencia activa que ha fichado → revisar en Gestión de Ausencias.
                  {" "}<strong>⚠ Sin ausencia config.:</strong> empleado sin presencia y sin ausencia registrada → crear ausencia.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}