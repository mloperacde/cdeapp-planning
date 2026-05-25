import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, AlertCircle, Loader2, X, Clock, Plus, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Panel flotante de progreso para un SyncJob activo.
 * Props:
 *   jobId       - ID del SyncJob a monitorear
 *   onComplete  - callback(job) cuando finaliza
 *   onDismiss   - callback para cerrar
 *   job / setJob - estado del job
 */
export default function SyncProgressPanel({ jobId, onComplete, onDismiss, job, setJob }) {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const res = await base44.functions.invoke('syncComponentsQueue', {
          action: 'get-status',
          job_id: jobId
        });
        const updatedJob = res.data?.job;
        if (!updatedJob) return;
        setJob(updatedJob);

        if (updatedJob.status === 'completed' || updatedJob.status === 'error') {
          clearInterval(intervalRef.current);
          onComplete?.(updatedJob);
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 2000);
    return () => clearInterval(intervalRef.current);
  }, [jobId]);

  if (!job) return null;

  const pct = job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;
  const isRunning = job.status === 'running' || job.status === 'pending';
  const isCompleted = job.status === 'completed';
  const isError = job.status === 'error';
  const hasWarnings = isCompleted && job.error_message;

  const skipped = job.total - (job.created_count || 0) - (job.updated_count || 0);
  const elapsed = job.started_at
    ? Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000)
    : null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-84 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 animate-bounce-in" style={{ width: '22rem' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isRunning && <Loader2 className="h-4 w-4 text-violet-600 animate-spin" />}
          {isCompleted && !hasWarnings && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          {isCompleted && hasWarnings && <AlertTriangle className="h-4 w-4 text-amber-500" />}
          {isError && <AlertCircle className="h-4 w-4 text-red-600" />}
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
            {isRunning && (job.job_type === 'sync-articles' ? 'Sincronizando artículos...' : 'Sincronizando componentes...')}
            {isCompleted && !hasWarnings && 'Sincronización completada'}
            {isCompleted && hasWarnings && 'Completado con advertencias'}
            {isError && 'Error en sincronización'}
          </span>
        </div>
        {!isRunning && (
          <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={onDismiss}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 mb-3 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${
            isError ? 'bg-red-500'
            : hasWarnings ? 'bg-amber-400'
            : isCompleted ? 'bg-green-500'
            : 'bg-violet-500'
          }`}
          style={{ width: isRunning && job.total === 0 ? '5%' : `${pct}%` }}
        />
      </div>

      {/* Contadores */}
      <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mb-2">
        <span>
          {job.processed?.toLocaleString()} / {job.total?.toLocaleString()} registros
        </span>
        <div className="flex items-center gap-1.5">
          {isRunning && elapsed !== null && (
            <span className="flex items-center gap-0.5 text-slate-400">
              <Clock className="h-3 w-3" />
              {elapsed}s
            </span>
          )}
          <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
            {pct}%
          </span>
        </div>
      </div>

      {/* Stats detalladas */}
      {(isCompleted || isRunning) && (job.created_count > 0 || job.updated_count > 0) && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-xs flex gap-4 flex-wrap">
          {job.created_count > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <Plus className="h-3 w-3" />
              {job.created_count} nuevos
            </span>
          )}
          {job.updated_count > 0 && (
            <span className="flex items-center gap-1 text-blue-600">
              <RefreshCw className="h-3 w-3" />
              {job.updated_count} actualizados
            </span>
          )}
          {isCompleted && skipped > 0 && (
            <span className="text-slate-400">
              {skipped} sin cambios
            </span>
          )}
        </div>
      )}

      {/* Error message */}
      {(isError || hasWarnings) && job.error_message && (
        <p className={`mt-2 text-xs truncate ${isError ? 'text-red-600' : 'text-amber-600'}`} title={job.error_message}>
          {job.error_message}
        </p>
      )}
    </div>
  );
}