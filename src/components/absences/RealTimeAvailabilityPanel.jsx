import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, UserX, RefreshCw, Clock, Bot, CheckCircle2, BellRing, Eye, ArrowUpCircle, AlertTriangle, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const ACTION_META = {
  reactivacion_por_presencia: { label: 'Reactivado por presencia', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' },
  ausencia_confirmada:        { label: 'Ausencia confirmada',       icon: Info,          color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' },
  ausencia_auto_creada:       { label: 'Ausencia no justificada',   icon: AlertTriangle, color: 'text-orange-600',bg: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' },
  ausencia_cerrada_sistema:   { label: 'Ausencia cerrada',          icon: CheckCircle2,  color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' },
  ausencia_manual_creada:     { label: 'Ausencia manual',           icon: BellRing,      color: 'text-purple-600',bg: 'bg-purple-50 border-purple-200' },
  ausencia_manual_aprobada:   { label: 'Aprobada',                  icon: CheckCircle2,  color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  ausencia_manual_rechazada:  { label: 'Rechazada',                 icon: XCircle,       color: 'text-red-600',   bg: 'bg-red-50 border-red-200' },
};

function XCircle(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
}

export default function RealTimeAvailabilityPanel() {
  const [employees, setEmployees] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [markingId, setMarkingId] = useState(null);

  const todayISO = new Date().toISOString().slice(0, 10);

  const loadData = useCallback(async () => {
    const [emps, logs] = await Promise.all([
      base44.entities.EmployeeMasterDatabase.filter({ estado_empleado: 'Alta' }, undefined, 2000),
      base44.entities.AbsenceAuditLog.list('-created_date', 50)
    ]);

    const controlled = emps.filter(e =>
      e.sujeto_a_control_horario !== false && e.incluir_en_planning !== false
    );
    setEmployees(controlled);
    setAuditLogs(logs);
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    // Suscripción en tiempo real
    const unsubEmp = base44.entities.EmployeeMasterDatabase.subscribe((event) => {
      if (event.type === 'update' && event.data) {
        setEmployees(prev => prev.map(e => e.id === event.id ? { ...e, ...event.data } : e));
        setLastUpdate(new Date());
      }
    });
    const unsubLog = base44.entities.AbsenceAuditLog.subscribe((event) => {
      if (event.type === 'create' && event.data) {
        setAuditLogs(prev => [event.data, ...prev].slice(0, 50));
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

  const disponibles = employees.filter(e => e.disponibilidad !== 'Ausente');
  const ausentes    = employees.filter(e => e.disponibilidad === 'Ausente');
  const total       = employees.length;
  const pct         = total > 0 ? ((disponibles.length / total) * 100).toFixed(1) : '0';
  const unreadCount = auditLogs.filter(l => !l.leido_por_rrhh).length;
  const todayLogs   = auditLogs.filter(l => l.sync_date === todayISO || (l.created_date && l.created_date.slice(0, 10) === todayISO));

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Panel en tiempo real</span>
          <Badge variant="outline" className="text-[10px] py-0">Hoy · {todayISO}</Badge>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white text-[10px] py-0 animate-pulse">{unreadCount} sin leer</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
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

      {/* Contadores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 bg-green-100 dark:bg-green-800/40 rounded-xl">
              <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-green-700 dark:text-green-300">{disponibles.length}</p>
              <p className="text-xs text-green-600 dark:text-green-500 font-medium">Disponibles ahora</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 bg-red-100 dark:bg-red-800/40 rounded-xl">
              <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-red-700 dark:text-red-300">{ausentes.length}</p>
              <p className="text-xs text-red-600 dark:text-red-500 font-medium">Ausentes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-800/40 rounded-xl">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{pct}%</p>
              <p className="text-xs text-blue-600 dark:text-blue-500 font-medium">Disponibilidad · {total} empleados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de disponibilidad */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>Disponibilidad global</span>
            <span>{disponibles.length} de {total} empleados</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444' }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span className="text-red-400">{ausentes.length} ausentes</span>
            <span className="text-green-400">{disponibles.length} disponibles</span>
          </div>
        </CardContent>
      </Card>

      {/* Panel inferior: ausentes + log de auditoría */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Empleados ausentes */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserX className="w-4 h-4 text-red-500" />
              Ausentes ahora
              <Badge variant="destructive" className="text-[10px] ml-auto">{ausentes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {ausentes.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
                <p className="text-sm text-slate-400">Todos disponibles</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {ausentes.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{emp.nombre}</p>
                      <p className="text-[10px] text-slate-500">{emp.departamento || '—'}</p>
                    </div>
                    <Badge
                      className={`ml-2 shrink-0 text-[9px] px-1.5 py-0 ${
                        emp.ausencia_motivo?.includes('autom') || emp.ausencia_motivo?.includes('[SISTEMA]')
                          ? 'bg-orange-100 text-orange-700 border-orange-200'
                          : 'bg-blue-100 text-blue-700 border-blue-200'
                      }`}
                      variant="outline"
                    >
                      {emp.ausencia_motivo?.includes('autom') ? 'Auto' : 'Comunicada'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registro de auditoría RRHH */}
        <Card className={unreadCount > 0 ? 'border-amber-300 dark:border-amber-700' : ''}>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BellRing className={`w-4 h-4 ${unreadCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
              Registro de eventos RRHH
              {unreadCount > 0 && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] ml-1">{unreadCount} nuevos</Badge>
              )}
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-[10px] ml-auto gap-1 text-slate-500" onClick={markAllRead}>
                  <Eye className="w-3 h-3" /> Marcar todos
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Sin eventos registrados</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {auditLogs.map(log => {
                  const meta = ACTION_META[log.action_type] || { label: log.action_type, icon: Info, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' };
                  const Icon = meta.icon;
                  const isUnread = !log.leido_por_rrhh;
                  return (
                    <div key={log.id} className={`flex items-start gap-2 p-2 rounded-lg border text-xs transition-opacity ${meta.bg} ${isUnread ? 'opacity-100' : 'opacity-60'}`}>
                      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${meta.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-semibold text-slate-800 dark:text-slate-100">{log.employee_name}</span>
                          {log.employee_dept && <span className="text-[10px] text-slate-400">· {log.employee_dept}</span>}
                          {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block ml-1" />}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">{meta.label}{log.motivo ? ` — ${log.motivo.slice(0, 80)}` : ''}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{log.sync_date} {log.created_date ? `· ${format(parseISO(log.created_date), 'HH:mm')}` : ''}</p>
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
      </div>
    </div>
  );
}