import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, UserX, RefreshCw, Clock, CheckCircle2, BellRing, Eye, AlertTriangle, Info, Timer, Sun, Sunset, RotateCcw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function XCircle(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
}

const ACTION_META = {
  reactivacion_por_presencia: { label: 'Reactivado por presencia', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' },
  ausencia_confirmada:        { label: 'Ausencia confirmada',       icon: Info,          color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' },
  ausencia_auto_creada:       { label: 'Ausencia no justificada',   icon: AlertTriangle, color: 'text-orange-600',bg: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' },
  ausencia_cerrada_sistema:   { label: 'Ausencia cerrada',          icon: CheckCircle2,  color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' },
  ausencia_manual_creada:     { label: 'Ausencia manual',           icon: BellRing,      color: 'text-purple-600',bg: 'bg-purple-50 border-purple-200' },
  ausencia_manual_aprobada:   { label: 'Aprobada',                  icon: CheckCircle2,  color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  ausencia_manual_rechazada:  { label: 'Rechazada',                 icon: XCircle,       color: 'text-red-600',   bg: 'bg-red-50 border-red-200' },
  retraso_detectado:          { label: 'Retraso detectado',         icon: Timer,         color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' },
  turno_reset:                { label: 'Reset de turno',            icon: RotateCcw,     color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' },
  turno_iniciado:             { label: 'Turno iniciado',            icon: Sun,           color: 'text-blue-500',  bg: 'bg-blue-50 border-blue-200' },
};

function getPresenceStatus(emp) {
  const ep = emp.estado_presencia;
  if (ep === 'Presente') return 'presente';
  if (ep === 'Retraso')  return 'retraso';
  if (ep === 'Ausente Auto') return 'ausente_auto';
  if (ep === 'Ausente' || emp.disponibilidad === 'Ausente') return 'ausente';
  if (ep === 'Potencialmente Ausente') return 'pot_ausente';
  if (ep === 'No Aplica') return 'no_aplica';
  return 'presente';
}

const STATUS_CONFIG = {
  presente:     { label: 'Presente',               color: 'bg-green-100 text-green-700 border-green-200',   dot: 'bg-green-500' },
  retraso:      { label: 'Retraso',                color: 'bg-amber-100 text-amber-700 border-amber-200',   dot: 'bg-amber-500' },
  pot_ausente:  { label: 'Pot. Ausente',           color: 'bg-yellow-100 text-yellow-700 border-yellow-200',dot: 'bg-yellow-500' },
  ausente_auto: { label: 'Ausente (auto)',          color: 'bg-orange-100 text-orange-700 border-orange-200',dot: 'bg-orange-500' },
  ausente:      { label: 'Ausente',                color: 'bg-red-100 text-red-700 border-red-200',         dot: 'bg-red-500' },
  no_aplica:    { label: 'No aplica',              color: 'bg-slate-100 text-slate-500 border-slate-200',   dot: 'bg-slate-300' },
};

// Determina el turno de un empleado según su tipo y equipo
function getEmpTurno(emp, teamShiftMap) {
  if (emp.tipo_turno === 'Fijo Mañana') return 'Mañana';
  if (emp.tipo_turno === 'Fijo Tarde') return 'Tarde';
  if (emp.tipo_turno === 'Turno Partido') return 'Partido';
  if (emp.tipo_turno === 'Rotativo' && emp.team_key) return teamShiftMap[emp.team_key] || null;
  return null;
}

// Componente para una sección de turno
function TurnoSection({ turnoNombre, empleados, icon: Icon, color }) {
  const presentes    = empleados.filter(e => getPresenceStatus(e) === 'presente');
  const retrasos     = empleados.filter(e => getPresenceStatus(e) === 'retraso');
  const potAusentes  = empleados.filter(e => getPresenceStatus(e) === 'pot_ausente');
  const ausentesAuto = empleados.filter(e => getPresenceStatus(e) === 'ausente_auto');
  const ausentesConf = empleados.filter(e => getPresenceStatus(e) === 'ausente');
  const noAplica     = empleados.filter(e => getPresenceStatus(e) === 'no_aplica');
  const totalActivos = empleados.filter(e => getPresenceStatus(e) !== 'no_aplica').length;
  const pct = totalActivos > 0 ? ((presentes.length / totalActivos) * 100).toFixed(0) : '—';

  return (
    <Card className="overflow-hidden">
      <CardHeader className={`pb-2 pt-3 px-4 ${color}`}>
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
          <Icon className="w-4 h-4" />
          Turno {turnoNombre}
          <span className="ml-auto text-xs font-normal opacity-90">{empleados.length} empleados · {pct}% presentes</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {/* Barra de progreso */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-3 flex overflow-hidden">
          <div className="h-full bg-green-500" style={{ width: `${totalActivos > 0 ? (presentes.length / totalActivos) * 100 : 0}%` }} />
          <div className="h-full bg-amber-400" style={{ width: `${totalActivos > 0 ? (retrasos.length / totalActivos) * 100 : 0}%` }} />
          <div className="h-full bg-yellow-400" style={{ width: `${totalActivos > 0 ? (potAusentes.length / totalActivos) * 100 : 0}%` }} />
          <div className="h-full bg-orange-500" style={{ width: `${totalActivos > 0 ? (ausentesAuto.length / totalActivos) * 100 : 0}%` }} />
          <div className="h-full bg-red-500"    style={{ width: `${totalActivos > 0 ? (ausentesConf.length / totalActivos) * 100 : 0}%` }} />
        </div>
        {/* Contadores */}
        <div className="grid grid-cols-3 gap-1.5 text-center mb-3">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
            <p className="text-lg font-bold text-green-700 dark:text-green-300">{presentes.length}</p>
            <p className="text-[10px] text-green-600">Presentes</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
            <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{retrasos.length + potAusentes.length}</p>
            <p className="text-[10px] text-amber-600">Retrasos</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
            <p className="text-lg font-bold text-red-700 dark:text-red-300">{ausentesAuto.length + ausentesConf.length}</p>
            <p className="text-[10px] text-red-600">Ausentes</p>
          </div>
        </div>
        {/* Lista ausentes/retrasos destacados */}
        {(retrasos.length + potAusentes.length + ausentesAuto.length + ausentesConf.length) > 0 && (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {[...retrasos, ...potAusentes, ...ausentesAuto, ...ausentesConf].map(emp => {
              const status = getPresenceStatus(emp);
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={emp.id} className="flex items-center justify-between px-2 py-1 rounded border bg-white dark:bg-slate-900 dark:border-slate-700">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{emp.nombre}</p>
                    <p className="text-[10px] text-slate-400">{emp.departamento || '—'}</p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 shrink-0 ml-1 ${cfg.color}`}>{cfg.label}</Badge>
                </div>
              );
            })}
          </div>
        )}
        {(retrasos.length + potAusentes.length + ausentesAuto.length + ausentesConf.length) === 0 && (
          <div className="flex items-center justify-center gap-2 py-2 text-green-600 text-xs">
            <CheckCircle2 className="w-4 h-4" /> Todos presentes
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RealTimeAvailabilityPanel() {
  const [employees, setEmployees] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [teamShiftMap, setTeamShiftMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [markingId, setMarkingId] = useState(null);
  const [filterDept, setFilterDept] = useState('');
  const [filterTurno, setFilterTurno] = useState('');
  const [activeTab, setActiveTab] = useState('turnos'); // 'turnos' | 'eventos'

  const todayISO = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });

  // Lunes de esta semana
  const getMondayStr = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day === 0) ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  };

  const loadData = useCallback(async () => {
    const monday = getMondayStr();
    const [emps, logs, weekSchedules] = await Promise.all([
      base44.entities.EmployeeMasterDatabase.filter({ estado_empleado: 'Alta' }, undefined, 2000),
      base44.entities.AbsenceAuditLog.list('-created_date', 200),
      base44.entities.TeamWeekSchedule.filter({ fecha_inicio_semana: monday }),
    ]);

    const controlled = emps.filter(e =>
      e.sujeto_a_control_horario !== false && e.incluir_en_planning !== false
    );

    const shiftMap = {};
    for (const ws of weekSchedules) {
      if (ws.team_key && ws.turno) shiftMap[ws.team_key] = ws.turno;
    }

    setEmployees(controlled);
    setAuditLogs(logs);
    setTeamShiftMap(shiftMap);
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const unsubEmp = base44.entities.EmployeeMasterDatabase.subscribe((event) => {
      if (event.type === 'update' && event.data) {
        setEmployees(prev => prev.map(e => e.id === event.id ? { ...e, ...event.data } : e));
        setLastUpdate(new Date());
      }
    });
    const unsubLog = base44.entities.AbsenceAuditLog.subscribe((event) => {
      if (event.type === 'create' && event.data) {
        setAuditLogs(prev => [event.data, ...prev].slice(0, 200));
        setLastUpdate(new Date());
      }
    });
    return () => { unsubEmp(); unsubLog(); };
  }, [loadData]);

  const markAsRead = async (logId) => {
    setMarkingId(logId);
    await base44.entities.AbsenceAuditLog.update(logId, { leido_por_rrhh: true });
    setAuditLogs(prev => prev.map(l => l.id === logId ? { ...l, leido_por_rrhh: true } : l));
    setMarkingId(null);
  };

  const markAllRead = async () => {
    const unread = auditLogs.filter(l => !l.leido_por_rrhh);
    await Promise.all(unread.map(l => base44.entities.AbsenceAuditLog.update(l.id, { leido_por_rrhh: true })));
    setAuditLogs(prev => prev.map(l => ({ ...l, leido_por_rrhh: true })));
  };

  // Filtrar empleados
  const filtered = employees.filter(e => {
    if (filterDept && e.departamento !== filterDept) return false;
    if (filterTurno) {
      const turno = getEmpTurno(e, teamShiftMap);
      if (turno !== filterTurno) return false;
    }
    return true;
  });

  const departamentos = [...new Set(employees.map(e => e.departamento).filter(Boolean))].sort();

  // Empleados por turno
  const mañanaEmps = employees.filter(e => getEmpTurno(e, teamShiftMap) === 'Mañana');
  const tardeEmps  = employees.filter(e => getEmpTurno(e, teamShiftMap) === 'Tarde');
  const sinTurno   = employees.filter(e => !getEmpTurno(e, teamShiftMap));

  // Métricas globales
  const totalActivos   = filtered.filter(e => getPresenceStatus(e) !== 'no_aplica').length;
  const presentes      = filtered.filter(e => getPresenceStatus(e) === 'presente').length;
  const retrasos       = filtered.filter(e => ['retraso', 'pot_ausente'].includes(getPresenceStatus(e))).length;
  const ausentes       = filtered.filter(e => ['ausente_auto', 'ausente'].includes(getPresenceStatus(e))).length;
  const pct = totalActivos > 0 ? ((presentes / totalActivos) * 100).toFixed(1) : '0';

  // Logs de hoy
  const todayLogs = auditLogs.filter(l =>
    l.sync_date === todayISO || (l.created_date && l.created_date.slice(0, 10) === todayISO)
  );
  const filteredLogs = filterTurno
    ? todayLogs.filter(l => l.turno_afectado === filterTurno)
    : todayLogs;
  const unreadCount = auditLogs.filter(l => !l.leido_por_rrhh).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-500 mr-2" />
        <span className="text-sm text-slate-500">Cargando datos en tiempo real...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Monitor en tiempo real</span>
          <Badge variant="outline" className="text-[10px] py-0">Hoy · {todayISO}</Badge>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white text-[10px] py-0 animate-pulse">{unreadCount} sin leer</Badge>
          )}
          {/* Indicador de turnos activos */}
          {Object.entries(teamShiftMap).map(([key, turno]) => (
            <Badge key={key} variant="outline" className={`text-[10px] py-0 ${turno === 'Mañana' ? 'border-orange-300 text-orange-600' : 'border-indigo-300 text-indigo-600'}`}>
              {key === 'team_1' ? 'Eq.1' : 'Eq.2'}: {turno}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
          >
            <option value="">Todos los departamentos</option>
            {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            value={filterTurno}
            onChange={e => setFilterTurno(e.target.value)}
          >
            <option value="">Ambos turnos</option>
            <option value="Mañana">Turno Mañana</option>
            <option value="Tarde">Turno Tarde</option>
          </select>
          {lastUpdate && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />{format(lastUpdate, 'HH:mm:ss')}
            </span>
          )}
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={loadData}>
            <RefreshCw className="w-3 h-3" /> Actualizar
          </Button>
        </div>
      </div>

      {/* Métricas globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-800/40 rounded-xl">
              <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{presentes}</p>
              <p className="text-xs text-green-600 font-medium">Presentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-800/40 rounded-xl">
              <Timer className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{retrasos}</p>
              <p className="text-xs text-amber-600 font-medium">Con retraso</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-800/40 rounded-xl">
              <UserX className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{ausentes}</p>
              <p className="text-xs text-red-600 font-medium">Ausentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-800/40 rounded-xl">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{pct}%</p>
              <p className="text-xs text-blue-600 font-medium">Disponibilidad</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'turnos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('turnos')}
        >
          Por Turno
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'eventos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('eventos')}
        >
          Cronología de Eventos
          {unreadCount > 0 && <Badge className="ml-1 bg-red-500 text-white text-[9px] py-0">{unreadCount}</Badge>}
        </button>
      </div>

      {/* Tab: Por Turno */}
      {activeTab === 'turnos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TurnoSection
            turnoNombre="Mañana"
            empleados={filterDept ? mañanaEmps.filter(e => e.departamento === filterDept) : mañanaEmps}
            icon={Sun}
            color="bg-gradient-to-r from-orange-500 to-amber-500"
          />
          <TurnoSection
            turnoNombre="Tarde"
            empleados={filterDept ? tardeEmps.filter(e => e.departamento === filterDept) : tardeEmps}
            icon={Sunset}
            color="bg-gradient-to-r from-indigo-500 to-purple-600"
          />
        </div>
      )}

      {/* Tab: Cronología de Eventos */}
      {activeTab === 'eventos' && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BellRing className={`w-4 h-4 ${unreadCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
              Cronología de Eventos · Hoy ({todayISO})
              {unreadCount > 0 && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] ml-1">{unreadCount} sin leer</Badge>
              )}
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-[10px] ml-auto gap-1 text-slate-500" onClick={markAllRead}>
                  <Eye className="w-3 h-3" /> Marcar todos leídos
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {filteredLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Sin eventos hoy</p>
            ) : (
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                {filteredLogs.map(log => {
                  const meta = ACTION_META[log.action_type] || { label: log.action_type, icon: Info, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' };
                  const Icon = meta.icon;
                  const isUnread = !log.leido_por_rrhh;
                  const turnoColor = log.turno_afectado === 'Mañana' ? 'bg-orange-100 text-orange-700 border-orange-200' : log.turno_afectado === 'Tarde' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : '';
                  return (
                    <div key={log.id} className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs transition-opacity ${meta.bg} ${isUnread ? 'opacity-100' : 'opacity-60'}`}>
                      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${meta.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-100">{log.employee_name}</span>
                          {log.employee_dept && <span className="text-[10px] text-slate-400">· {log.employee_dept}</span>}
                          {log.turno_afectado && (
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${turnoColor}`}>
                              {log.turno_afectado}
                            </Badge>
                          )}
                          {log.turno_inicio_esperado && (
                            <span className="text-[10px] text-slate-400">{log.turno_inicio_esperado}{log.turno_fin_esperado ? `–${log.turno_fin_esperado}` : ''}</span>
                          )}
                          {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />}
                        </div>
                        <p className="text-[10px] text-slate-600 dark:text-slate-300">{meta.label}</p>
                        {log.motivo && <p className="text-[10px] text-slate-500 truncate">{log.motivo.slice(0, 120)}</p>}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400">{log.sync_date}</span>
                          {log.hora_evento && <span className="text-[10px] text-slate-400">{format(parseISO(log.hora_evento), 'HH:mm')}</span>}
                          {log.estado_anterior && log.estado_nuevo && (
                            <span className="text-[10px] text-slate-400">{log.estado_anterior} → {log.estado_nuevo}</span>
                          )}
                        </div>
                      </div>
                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 shrink-0 text-slate-400 hover:text-green-600"
                          onClick={() => markAsRead(log.id)}
                          disabled={markingId === log.id}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}