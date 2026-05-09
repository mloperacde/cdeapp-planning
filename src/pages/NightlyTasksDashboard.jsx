import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Play, RefreshCw, Clock, CheckCircle2, AlertTriangle, 
  XCircle, ChevronDown, ChevronRight, Bell, Activity,
  Calendar, Zap, Info
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  success: { label: 'Éxito', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800', icon: CheckCircle2 },
  warning: { label: 'Advertencia', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', icon: AlertTriangle },
  error:   { label: 'Error', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', icon: XCircle },
  running: { label: 'Ejecutando...', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', icon: RefreshCw },
};

const SEVERITY_COLORS = {
  high:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  low:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.success;
  const Icon = cfg.icon;
  const isRunning = log.status === 'running';

  return (
    <div className={`border rounded-lg overflow-hidden ${cfg.bg} mb-2`}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:opacity-80 transition-opacity"
        onClick={() => setExpanded(e => !e)}
      >
        <Icon className={`w-4 h-4 shrink-0 ${cfg.color} ${isRunning ? 'animate-spin' : ''}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
              {log.task_name}
            </span>
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {log.triggered_by === 'manual' ? '▶ Manual' : '⏰ Programado'}
            </Badge>
            {log.notification_sent && (
              <Badge variant="outline" className="text-[10px] h-4 px-1 border-amber-300 text-amber-600">
                <Bell className="w-2.5 h-2.5 mr-0.5" />Email enviado
              </Badge>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {log.started_at && format(new Date(log.started_at), "dd MMM yyyy · HH:mm", { locale: es })}
            {log.duration_seconds != null && ` · ${log.duration_seconds}s`}
            {log.anomalies?.length > 0 && ` · ${log.anomalies.length} anomalía(s)`}
          </div>
        </div>
        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-200/50 dark:border-slate-700/50 pt-3 space-y-3">
          {/* Pasos */}
          {log.steps?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pasos</p>
              <div className="space-y-1">
                {log.steps.map((s, i) => {
                  const sCfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.success;
                  const SIcon = sCfg.icon;
                  return (
                    <div key={i} className="flex items-start gap-2 text-[11px]">
                      <SIcon className={`w-3 h-3 mt-0.5 shrink-0 ${sCfg.color} ${s.status === 'running' ? 'animate-spin' : ''}`} />
                      <span className="font-medium text-slate-700 dark:text-slate-300 shrink-0">{s.step}:</span>
                      <span className="text-slate-600 dark:text-slate-400">{s.msg}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Anomalías */}
          {log.anomalies?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Anomalías detectadas</p>
              <div className="space-y-1">
                {log.anomalies.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.low}`}>
                      {a.severity?.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">{a.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errores */}
          {log.errors?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1.5">Errores</p>
              <div className="space-y-1">
                {log.errors.map((e, i) => (
                  <div key={i} className="text-[11px] text-red-600 dark:text-red-400 font-mono bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                    {e.task && <span className="font-bold">[{e.task}] </span>}{e.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NightlyTasksDashboard() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['consolidationLogs'],
    queryFn: () => base44.entities.ConsolidationLog.list('-started_at', 50),
    refetchInterval: running ? 3000 : false,
  });

  const runMutation = useMutation({
    mutationFn: () => base44.functions.invoke('nightlyConsolidationRunner', {}),
    onMutate: () => { setRunning(true); toast.info('Ejecutando consolidación nocturna...'); },
    onSuccess: (res) => {
      setRunning(false);
      const data = res?.data;
      if (data?.status === 'error') {
        toast.error('La tarea finalizó con errores. Revisa el historial.');
      } else if (data?.status === 'warning') {
        toast.warning(`Completado con ${data.anomalies_count} anomalía(s). ${data.notification_sent ? 'Notificación enviada.' : ''}`);
      } else {
        toast.success(`Consolidación completada en ${data?.duration_seconds}s`);
      }
      queryClient.invalidateQueries({ queryKey: ['consolidationLogs'] });
    },
    onError: (err) => {
      setRunning(false);
      toast.error(`Error: ${err.message}`);
      queryClient.invalidateQueries({ queryKey: ['consolidationLogs'] });
    }
  });

  // Stats
  const lastRun = logs[0];
  const totalRuns = logs.length;
  const successCount = logs.filter(l => l.status === 'success').length;
  const warningCount = logs.filter(l => l.status === 'warning').length;
  const errorCount = logs.filter(l => l.status === 'error').length;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Tareas Programadas Nocturnas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Consolidación automática diaria a las 02:00 (UTC)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['consolidationLogs'] })}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button
            size="sm"
            onClick={() => runMutation.mutate()}
            disabled={running || runMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Play className={`w-4 h-4 mr-2 ${running ? 'animate-pulse' : ''}`} />
            {running ? 'Ejecutando...' : 'Ejecutar ahora'}
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total ejecuciones', value: totalRuns, icon: Calendar, color: 'text-slate-600' },
          { label: 'Exitosas', value: successCount, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Advertencias', value: warningCount, icon: AlertTriangle, color: 'text-amber-600' },
          { label: 'Errores', value: errorCount, icon: XCircle, color: 'text-red-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-3 flex items-center gap-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <Icon className={`w-5 h-5 shrink-0 ${color}`} />
            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
              <div className="text-[10px] text-slate-500">{label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Schedule info */}
      <Card className="p-3 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300 space-y-0.5">
          <p><strong>Programación:</strong> Cada noche a las 02:00 UTC (04:00 hora Madrid)</p>
          <p><strong>Tareas:</strong> executeFullConsolidation → autoConsolidateEmployees → Verificación de integridad</p>
          <p><strong>Notificaciones:</strong> Se envían emails a admins si se detectan anomalías</p>
        </div>
      </Card>

      {/* Última ejecución destacada */}
      {lastRun && (
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />Última ejecución
          </p>
          <LogRow log={lastRun} />
        </div>
      )}

      {/* Historial completo */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />Historial ({logs.length > 1 ? logs.length - 1 : 0} anteriores)
        </p>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : logs.length === 0 ? (
          <Card className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm bg-white dark:bg-slate-900">
            No hay ejecuciones registradas. Haz clic en "Ejecutar ahora" para la primera prueba.
          </Card>
        ) : (
          <div>
            {(logs.length > 1 ? logs.slice(1) : []).map(log => (
              <LogRow key={log.id} log={log} />
            ))}
            {logs.length === 1 && (
              <p className="text-xs text-slate-400 text-center py-2">Solo hay una ejecución registrada.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}