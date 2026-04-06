import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Clock, AlertTriangle, UserX, UserCheck, RefreshCw,
  CheckCircle2, XCircle, Eye, Play, Activity, Timer
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const STATE_CONFIG = {
  'Potencialmente Ausente': { color: 'bg-amber-100 text-amber-700 border-amber-300', icon: AlertTriangle, dot: 'bg-amber-500' },
  'Ausente Auto':           { color: 'bg-red-100 text-red-700 border-red-300',       icon: UserX,         dot: 'bg-red-500' },
  'Retraso':                { color: 'bg-orange-100 text-orange-700 border-orange-300', icon: Clock,       dot: 'bg-orange-500' },
  'Presente':               { color: 'bg-green-100 text-green-700 border-green-300', icon: UserCheck,     dot: 'bg-green-500' },
  'Ausente':                { color: 'bg-red-100 text-red-700 border-red-300',        icon: UserX,        dot: 'bg-red-600' },
};

function PresenceStateBadge({ estado }) {
  const cfg = STATE_CONFIG[estado] || { color: 'bg-gray-100 text-gray-500 border-gray-200', icon: Activity };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {estado}
    </span>
  );
}

function CountdownTimer({ desde, limitMinutes }) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!desde) return;
    const calc = () => {
      const elapsed = (Date.now() - new Date(desde)) / 60000;
      const rem = Math.max(0, limitMinutes - elapsed);
      setRemaining(rem);
    };
    calc();
    const timer = setInterval(calc, 10000);
    return () => clearInterval(timer);
  }, [desde, limitMinutes]);

  if (remaining === null) return null;
  if (remaining === 0) return <span className="text-xs text-red-600 font-bold animate-pulse">¡Ausencia inmediata!</span>;

  const mins = Math.floor(remaining);
  const secs = Math.floor((remaining - mins) * 60);
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-mono bg-amber-50 px-1.5 py-0.5 rounded">
      <Timer className="w-3 h-3" />
      {mins}m {secs}s
    </span>
  );
}

export default function PresenceMonitorPanel() {
  const queryClient = useQueryClient();
  const [runningMonitor, setRunningMonitor] = useState(false);
  const [lastRun, setLastRun] = useState(null);

  // Empleados con estado de presencia relevante
  const { data: employees = [], isLoading: loadingEmp } = useQuery({
    queryKey: ['presence-monitor-employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.filter({ estado_empleado: 'Alta' }),
    refetchInterval: 30000,
  });

  // Ausencias auto-creadas pendientes de aprobación RRHH
  const { data: allAbsences = [], isLoading: loadingAbs } = useQuery({
    queryKey: ['presence-monitor-absences'],
    queryFn: () => base44.entities.Absence.list('-created_date', 200),
    refetchInterval: 30000,
  });

  // Audit log de hoy
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['presence-audit-logs'],
    queryFn: () => base44.entities.AbsenceAuditLog.list('-created_date', 50),
    refetchInterval: 30000,
  });

  const today = new Date().toISOString().slice(0, 10);

  const autoAbsencesHoy = allAbsences.filter(a =>
    a.motivo?.startsWith('AUTO:') &&
    a.fecha_inicio?.startsWith(today) &&
    a.estado_aprobacion === 'Pendiente'
  );

  const potencialmenteAusentes = employees.filter(e =>
    e.estado_presencia === 'Potencialmente Ausente' && e.sujeto_a_control_horario
  );

  const retrasados = employees.filter(e =>
    e.estado_presencia === 'Retraso' && e.sujeto_a_control_horario
  );

  const ausentesAuto = employees.filter(e =>
    e.estado_presencia === 'Ausente Auto' && e.sujeto_a_control_horario
  );

  const logsHoy = auditLogs.filter(l => l.sync_date === today);
  const logsNoLeidos = logsHoy.filter(l => !l.leido_por_rrhh);

  // Aprobar ausencia
  const approveMutation = useMutation({
    mutationFn: async ({ absenceId, empId }) => {
      await base44.entities.Absence.update(absenceId, { estado_aprobacion: 'Aprobada' });
      await base44.entities.EmployeeMasterDatabase.update(empId, { estado_presencia: 'Ausente' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presence-monitor-absences'] });
      queryClient.invalidateQueries({ queryKey: ['presence-monitor-employees'] });
      toast.success('Ausencia aprobada');
    },
  });

  // Rechazar ausencia
  const rejectMutation = useMutation({
    mutationFn: async ({ absenceId, empId }) => {
      await base44.entities.Absence.update(absenceId, {
        estado_aprobacion: 'Rechazada',
        notas: 'Rechazada por RRHH desde monitor de presencia',
      });
      await base44.entities.EmployeeMasterDatabase.update(empId, {
        estado_presencia: 'Presente',
        disponibilidad: 'Disponible',
        ausencia_motivo: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presence-monitor-absences'] });
      queryClient.invalidateQueries({ queryKey: ['presence-monitor-employees'] });
      toast.success('Ausencia rechazada — empleado marcado como presente');
    },
  });

  // Marcar logs como leídos
  const markReadMutation = useMutation({
    mutationFn: () =>
      Promise.all(logsNoLeidos.map(l => base44.entities.AbsenceAuditLog.update(l.id, { leido_por_rrhh: true }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presence-audit-logs'] });
      toast.success('Notificaciones marcadas como leídas');
    },
  });

  // Ejecutar monitor manualmente
  const runMonitor = async () => {
    setRunningMonitor(true);
    try {
      const res = await base44.functions.invoke('presenceMonitor', {});
      setLastRun(res.data);
      queryClient.invalidateQueries({ queryKey: ['presence-monitor-employees'] });
      queryClient.invalidateQueries({ queryKey: ['presence-monitor-absences'] });
      queryClient.invalidateQueries({ queryKey: ['presence-audit-logs'] });
      const s = res.data?.summary;
      toast.success(
        `Monitor ejecutado: ${s?.potencialmente_ausentes || 0} alertas, ${s?.ausencias_auto_creadas || 0} ausencias auto-creadas, ${s?.retrasados || 0} retrasos, ${s?.reactivaciones || 0} reactivaciones`
      );
    } catch (err) {
      toast.error('Error al ejecutar monitor: ' + err.message);
    } finally {
      setRunningMonitor(false);
    }
  };

  const isLoading = loadingEmp || loadingAbs;

  return (
    <div className="space-y-4">
      {/* Header del panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">Monitor de Presencia en Tiempo Real</p>
            <p className="text-xs text-slate-500">Se ejecuta automáticamente cada 5 min · +5min alerta · +35min ausencia auto</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {logsNoLeidos.length > 0 && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => markReadMutation.mutate()}>
              <Eye className="w-3 h-3" />
              Marcar leídas ({logsNoLeidos.length})
            </Button>
          )}
          <Button
            size="sm" className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700"
            onClick={runMonitor} disabled={runningMonitor}
          >
            <Play className={`w-3 h-3 ${runningMonitor ? 'animate-pulse' : ''}`} />
            {runningMonitor ? 'Ejecutando...' : 'Ejecutar ahora'}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['presence-monitor-employees'] });
            queryClient.invalidateQueries({ queryKey: ['presence-monitor-absences'] });
          }}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-amber-700 font-medium">Potenc. Ausentes</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{potencialmenteAusentes.length}</div>
          <p className="text-[10px] text-amber-600 mt-0.5">Esperando fichaje</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-red-700 font-medium">Ausencias Auto</span>
            <UserX className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-700">{autoAbsencesHoy.length}</div>
          <p className="text-[10px] text-red-600 mt-0.5">Pendientes de aprobar</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-orange-700 font-medium">Retrasos</span>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-orange-700">{retrasados.length}</div>
          <p className="text-[10px] text-orange-600 mt-0.5">Ficharon tarde hoy</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-blue-700 font-medium">Eventos hoy</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-700">{logsHoy.length}</div>
          <p className="text-[10px] text-blue-600 mt-0.5">{logsNoLeidos.length} sin leer</p>
        </div>
      </div>

      {/* ALERTA: Potencialmente ausentes */}
      {potencialmenteAusentes.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-amber-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">
              ⚠ Potencialmente Ausentes — Tiempo restante para auto-crear ausencia
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {potencialmenteAusentes.map(emp => (
              <div key={emp.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{emp.nombre}</p>
                  <p className="text-xs text-slate-500">{emp.departamento} · {emp.puesto}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {emp.potencialmente_ausente_desde && (
                    <CountdownTimer desde={emp.potencialmente_ausente_desde} limitMinutes={30} />
                  )}
                  <PresenceStateBadge estado={emp.estado_presencia} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ausencias auto-creadas pendientes de RRHH */}
      {autoAbsencesHoy.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-red-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-red-50 border-b border-red-200 flex items-center gap-2">
            <UserX className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700">
              🔴 Ausencias Auto-creadas — Requieren aprobación de RRHH
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {autoAbsencesHoy.map(absence => {
              const emp = employees.find(e => e.id === absence.employee_id);
              return (
                <div key={absence.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">
                      {emp?.nombre || absence.employee_id}
                    </p>
                    <p className="text-xs text-slate-500">{emp?.departamento} · {emp?.puesto}</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Sin fichaje desde: {absence.fecha_inicio ? format(new Date(absence.fecha_inicio), 'HH:mm', { locale: es }) : '—'}
                      {' '}· Creada {formatDistanceToNow(new Date(absence.created_date || Date.now()), { locale: es, addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate({ absenceId: absence.id, empId: absence.employee_id })}
                    >
                      <CheckCircle2 className="w-3 h-3" /> Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-red-700 border-red-300 hover:bg-red-50"
                      disabled={rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate({ absenceId: absence.id, empId: absence.employee_id })}
                    >
                      <XCircle className="w-3 h-3" /> Rechazar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Retrasos */}
      {retrasados.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-orange-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-orange-50 border-b border-orange-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-semibold text-orange-700">
              Retrasos registrados hoy
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {retrasados.map(emp => (
              <div key={emp.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{emp.nombre}</p>
                  <p className="text-xs text-slate-500">{emp.departamento} · {emp.puesto}</p>
                </div>
                <PresenceStateBadge estado="Retraso" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log de actividad de hoy */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Registro de actividad — Hoy</span>
          </div>
          {logsNoLeidos.length > 0 && (
            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">{logsNoLeidos.length} sin leer</Badge>
          )}
        </div>
        {logsHoy.length === 0 ? (
          <div className="px-4 py-6 text-center text-slate-400 text-sm">
            Sin actividad registrada hoy
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {logsHoy.map(log => {
              const isUnread = !log.leido_por_rrhh;
              return (
                <div key={log.id} className={`px-4 py-2.5 flex items-start gap-3 ${isUnread ? 'bg-blue-50/40 dark:bg-blue-950/10' : ''}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    log.action_type === 'ausencia_auto_creada' ? 'bg-red-500' :
                    log.action_type === 'reactivacion_por_presencia' ? 'bg-green-500' :
                    log.action_type === 'ausencia_confirmada' ? 'bg-blue-500' : 'bg-slate-300'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-medium">{log.employee_name}</span>
                      {' · '}{log.motivo}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {log.created_date ? formatDistanceToNow(new Date(log.created_date), { locale: es, addSuffix: true }) : log.sync_date}
                      {' · '}{log.origen}
                    </p>
                  </div>
                  {isUnread && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resultado de la última ejecución manual */}
      {lastRun && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-xs text-green-800">
            <strong>Última ejecución:</strong> {lastRun.summary?.empleados_procesados} empleados procesados ·
            {' '}{lastRun.summary?.potencialmente_ausentes} alertas ·
            {' '}{lastRun.summary?.ausencias_auto_creadas} ausencias ·
            {' '}{lastRun.summary?.retrasados} retrasos ·
            {' '}{lastRun.summary?.reactivaciones} reactivaciones
            {' · '}{lastRun.timestamp ? format(new Date(lastRun.timestamp), 'HH:mm:ss') : ''}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}