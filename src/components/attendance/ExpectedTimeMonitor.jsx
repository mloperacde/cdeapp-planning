import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Search, RefreshCw, Clock, AlertTriangle, CheckCircle2, HelpCircle, Users, ExternalLink, Settings } from "lucide-react";
import MasterEmployeeEditDialog from "@/components/master/MasterEmployeeEditDialog";

// Obtiene el lunes de la semana de una fecha dada
function getMondayOfWeek(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

// Calcula la hora esperada de entrada para un empleado en una fecha concreta
function calcExpectedTime(emp, teamScheduleMap, dateStr) {
  const tipo = emp.tipo_turno;

  if (tipo === "Fijo Mañana") {
    return { hora: emp.horario_manana_inicio || null, turno: "Mañana", fuente: "Fijo" };
  }
  if (tipo === "Fijo Tarde") {
    return { hora: emp.horario_tarde_inicio || null, turno: "Tarde", fuente: "Fijo" };
  }
  if (tipo === "Turno Partido") {
    return { hora: emp.turno_partido_entrada1 || null, turno: "Partido", fuente: "Fijo" };
  }
  if (tipo === "Rotativo") {
    const monday = getMondayOfWeek(dateStr);
    const key = `${emp.team_key}_${monday}`;
    const schedule = teamScheduleMap.get(key);
    if (!schedule) {
      return { hora: null, turno: "?", fuente: "Sin horario de equipo", warning: true };
    }
    const turno = schedule.turno;
    const hora = turno === "Mañana" ? emp.horario_manana_inicio : emp.horario_tarde_inicio;
    return { hora: hora || null, turno, fuente: `Equipo ${emp.team_key} semana ${monday}` };
  }

  return { hora: null, turno: "N/D", fuente: "Sin tipo de turno", warning: true };
}

// Calcula diferencia de minutos entre dos HH:mm strings
function diffMinutes(esperada, real) {
  if (!esperada || !real) return null;
  const [h1, m1] = esperada.split(":").map(Number);
  const [h2, m2] = real.split(":").map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

const STATUS_CONFIG = {
  ok: { label: "A tiempo", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  retraso: { label: "Retraso", color: "bg-orange-100 text-orange-800", icon: Clock },
  ausente: { label: "Sin fichaje", color: "bg-red-100 text-red-800", icon: AlertTriangle },
  sin_turno: { label: "Sin turno", color: "bg-slate-100 text-slate-600", icon: HelpCircle },
  fuera_ventana: { label: "Fuera de ventana", color: "bg-blue-100 text-blue-700", icon: HelpCircle },
};

export default function ExpectedTimeMonitor() {
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterEquipo, setFilterEquipo] = useState("");
  const [editingEmployee, setEditingEmployee] = useState(null);
  const queryClient = useQueryClient();

  // Empleados sujetos a control horario
  const { data: employees = [], isLoading: loadingEmp } = useQuery({
    queryKey: ["emp_control_horario"],
    queryFn: () => base44.entities.EmployeeMasterDatabase.filter({
      estado_empleado: "Alta",
      sujeto_a_control_horario: true,
    }, "nombre", 500),
    staleTime: 30000,
  });

  // TeamConfig — para resolver team_key desde nombre de equipo
  const { data: teamConfigs = [] } = useQuery({
    queryKey: ["teamConfig"],
    queryFn: () => base44.entities.TeamConfig.list(),
    staleTime: 60000,
  });

  // TeamWeekSchedule — cargar todos
  const { data: schedules = [], isLoading: loadingSched } = useQuery({
    queryKey: ["teamWeekSchedule"],
    queryFn: () => base44.entities.TeamWeekSchedule.list("-fecha_inicio_semana", 200),
    staleTime: 30000,
  });

  // Fichajes del día seleccionado
  const { data: attendanceRecs = [], isLoading: loadingAtt, refetch } = useQuery({
    queryKey: ["att_expected", filterDate],
    queryFn: () => base44.entities.AttendanceRecord.filter({ record_date: filterDate }, "record_time", 2000),
    staleTime: 10000,
  });

  // Al cerrar el diálogo de edición, refrescar datos del monitor
  const handleEditClose = () => {
    setEditingEmployee(null);
    queryClient.invalidateQueries({ queryKey: ["emp_control_horario"] });
    queryClient.invalidateQueries({ queryKey: ["att_expected", filterDate] });
    refetch();
  };

  // Map team_name → team_key (para empleados que tienen equipo pero no team_key)
  const teamNameToKey = useMemo(() => {
    const map = new Map();
    teamConfigs.forEach(tc => {
      if (tc.team_name && tc.team_key) map.set(tc.team_name.trim().toLowerCase(), tc.team_key);
    });
    return map;
  }, [teamConfigs]);

  // Map team_key + semana → schedule
  const teamScheduleMap = useMemo(() => {
    const map = new Map();
    schedules.forEach(s => {
      if (s.team_key && s.fecha_inicio_semana) {
        map.set(`${s.team_key}_${s.fecha_inicio_semana}`, s);
      }
    });
    return map;
  }, [schedules]);

  // ── BUG FIX: el AttendanceRecord.employee_id guarda el codigo_empleado (ej "476"),
  // NO el id de EmployeeMasterDatabase. El lookup debe hacerse por codigo_empleado.
  const firstEntryMap = useMemo(() => {
    const map = new Map();
    attendanceRecs
      .filter(r => r.direction === "E")
      .sort((a, b) => (r => r)(a.record_time.localeCompare(b.record_time)))
      .forEach(r => {
        const key = String(r.employee_id).trim();
        if (!map.has(key)) map.set(key, r.record_time);
      });
    return map;
  }, [attendanceRecs]);

  const deptOptions = useMemo(() => [...new Set(employees.map(e => e.departamento).filter(Boolean))].sort(), [employees]);
  const equipoOptions = useMemo(() => [...new Set(employees.map(e => e.equipo || e.team_key).filter(Boolean))].sort(), [employees]);

  // Calcular filas: buscar primera entrada usando codigo_empleado (coincide con AttendanceRecord.employee_id)
  const rows = useMemo(() => {
    return employees.map(emp => {
      // Resolver team_key si falta: buscar por nombre de equipo en TeamConfig
      const resolvedTeamKey = emp.team_key ||
        (emp.equipo ? teamNameToKey.get(emp.equipo.trim().toLowerCase()) : null);
      const empWithKey = resolvedTeamKey !== emp.team_key ? { ...emp, team_key: resolvedTeamKey } : emp;
      const expected = calcExpectedTime(empWithKey, teamScheduleMap, filterDate);
      const codigoKey = emp.codigo_empleado ? String(emp.codigo_empleado).trim() : null;
      const firstEntry = codigoKey ? (firstEntryMap.get(codigoKey) || null) : null;
      const diff = diffMinutes(expected.hora, firstEntry);

      let status;
      if (expected.warning || !expected.hora) {
        status = "sin_turno";
      } else if (!firstEntry) {
        status = "ausente";
      } else if (diff <= 5) {
        status = "ok";
      } else {
        status = "retraso";
      }

      return { emp, expected, firstEntry, diff, status };
    }).filter(row => {
      if (search && !row.emp.nombre?.toLowerCase().includes(search.toLowerCase()) &&
          !row.emp.departamento?.toLowerCase().includes(search.toLowerCase()) &&
          !(row.emp.equipo || row.emp.team_key)?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterDept && row.emp.departamento !== filterDept) return false;
      if (filterEquipo && (row.emp.equipo || row.emp.team_key) !== filterEquipo) return false;
      return true;
    });
  }, [employees, teamScheduleMap, firstEntryMap, filterDate, search, filterDept, filterEquipo]);

  const loading = loadingEmp || loadingSched || loadingAtt;

  const stats = useMemo(() => ({
    total: rows.length,
    ok: rows.filter(r => r.status === "ok").length,
    retraso: rows.filter(r => r.status === "retraso").length,
    ausente: rows.filter(r => r.status === "ausente").length,
    sin_turno: rows.filter(r => r.status === "sin_turno").length,
  }), [rows]);

  const monday = getMondayOfWeek(filterDate);
  const rotativosSinHorario = rows.filter(r => r.emp.tipo_turno === "Rotativo" && r.expected.warning);
  const sinTurnoConfigured = rows.filter(r => !r.emp.tipo_turno);

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Fecha análisis:</label>
            <Input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar nombre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 w-52"
            />
          </div>
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="text-sm border border-input rounded-md px-3 py-1.5 bg-background text-foreground"
          >
            <option value="">Todos los dptos.</option>
            {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            value={filterEquipo}
            onChange={e => setFilterEquipo(e.target.value)}
            className="text-sm border border-input rounded-md px-3 py-1.5 bg-background text-foreground"
          >
            <option value="">Todos los equipos</option>
            {equipoOptions.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {/* Alerta: rotativos sin horario */}
      {rotativosSinHorario.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-3 px-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                {rotativosSinHorario.length} empleado(s) rotativo(s) sin horario de equipo para la semana del {monday}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                Sin TeamWeekSchedule configurado, no se puede determinar la hora esperada.
                Equipos afectados: {[...new Set(rotativosSinHorario.map(r => r.emp.team_key))].join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerta: sin tipo de turno */}
      {sinTurnoConfigured.length > 0 && (
        <Card className="border-slate-300 bg-slate-50 dark:bg-slate-900/40">
          <CardContent className="py-3 px-4 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-semibold">{sinTurnoConfigured.length} empleado(s)</span> sin tipo de turno configurado — usa el botón <em>Configurar</em> en su fila para completar los datos.
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" />
            <div><p className="text-xs text-slate-500">Total analizados</p><p className="text-2xl font-bold">{stats.total}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div><p className="text-xs text-slate-500">A tiempo</p><p className="text-2xl font-bold text-green-600">{stats.ok}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <div><p className="text-xs text-slate-500">Con retraso</p><p className="text-2xl font-bold text-orange-600">{stats.retraso}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div><p className="text-xs text-slate-500">Sin fichaje</p><p className="text-2xl font-bold text-red-600">{stats.ausente}</p></div>
          </div>
        </CardContent></Card>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Hora esperada por empleado — {filterDate}
              <span className="ml-2 text-sm font-normal text-slate-500">(semana del {monday})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Empleado</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Dpto / Equipo</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Tipo turno</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Turno del día</th>
                    <th className="text-center px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Hora esperada</th>
                    <th className="text-center px-3 py-2 font-medium text-slate-600 dark:text-slate-300">1ª entrada</th>
                    <th className="text-center px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Diferencia</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Fuente cálculo</th>
                    <th className="text-center px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Estado</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {rows.map(({ emp, expected, firstEntry, diff, status }) => {
                    const cfg = STATUS_CONFIG[status];
                    const Icon = cfg.icon;
                    const needsConfig = status === "sin_turno" || !expected.hora;
                    return (
                      <tr key={emp.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${needsConfig ? "bg-amber-50/30 dark:bg-amber-950/10" : ""}`}>
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-2">
                            <span>{emp.nombre}</span>
                            <Link
                              to={`/MasterEmployeeDatabase?empleado=${emp.id}`}
                              title="Abrir ficha del empleado"
                              className="text-blue-500 hover:text-blue-700 flex-shrink-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                          <div className="text-xs text-slate-400">{emp.codigo_empleado}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          <div>{emp.departamento || "—"}</div>
                          <div className="text-xs text-slate-400">{emp.equipo || emp.team_key || "—"}</div>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={`text-xs ${!emp.tipo_turno ? "border-amber-400 text-amber-700" : ""}`}>
                            {emp.tipo_turno || "⚠ Sin configurar"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          {expected.warning ? (
                            <span className="text-amber-600 text-xs flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> {expected.turno}
                            </span>
                          ) : (
                            <span className="text-slate-700 dark:text-slate-300 font-medium">{expected.turno}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {expected.hora ? (
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{expected.hora}</span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {firstEntry ? (
                            <span className="font-mono text-green-700 dark:text-green-400 font-semibold">{firstEntry}</span>
                          ) : (
                            <span className="text-red-400 text-xs">Sin fichaje</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {diff !== null ? (
                            <span className={`font-mono text-sm font-semibold ${diff > 5 ? "text-orange-600" : diff < -10 ? "text-blue-600" : "text-green-600"}`}>
                              {diff > 0 ? `+${diff}` : diff} min
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-400 max-w-[160px]">
                          <span title={expected.fuente} className="truncate block">{expected.fuente}</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge className={`${cfg.color} text-xs flex items-center gap-1 w-fit mx-auto`}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {needsConfig && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                              onClick={() => setEditingEmployee(emp)}
                              title="Configurar horario del empleado"
                            >
                              <Settings className="w-3 h-3 mr-1" />
                              Configurar
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rows.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No se encontraron empleados con los filtros actuales.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diálogo de edición: abre ficha del empleado en tab Horarios */}
      {editingEmployee && (
        <MasterEmployeeEditDialog
          employee={editingEmployee}
          open={true}
          onClose={handleEditClose}
        />
      )}
    </div>
  );
}