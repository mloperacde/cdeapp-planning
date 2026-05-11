import React, { useState } from "react";
import { base44 } from "../../api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { RefreshCw, CheckCircle2, AlertTriangle, Clock, Zap, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function AutomationStatusPanel() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [syncError, setSyncError] = useState(null);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const result = await base44.functions.invoke("cucoSyncV2", {});
      const data = result.data;
      
      // Cuco360 devolvió error controlado (Cloudflare / rate limit)
      if (data?.success === false) {
        const msg = data.error || "Error desconocido en Cuco360";
        setSyncError(msg);
        toast.error(msg, { duration: 8000 });
        return;
      }

      setLastSync(new Date());
      setLastResult(data);
      toast.success(`Sincronización completada. ${data?.count || 0} marcajes.`);
    } catch (err) {
      const msg = err.message || "Error de conexión";
      setSyncError(msg);
      toast.error("Error al sincronizar: " + msg, { duration: 8000 });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleShiftAudit = async (mode) => {
    setIsSyncing(true);
    try {
      const result = await base44.functions.invoke("shiftAudit", { mode });
      toast.success(`Auditoría completada (${mode}).`);
    } catch (err) {
      toast.error("Error auditoría: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-500" />
            Sincronización Automática Cuco360
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Automatización activa</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Importación automática cada hora de <strong>07:00 a 23:00 h</strong>, de lunes a viernes.
                </p>
                <p className="text-xs text-emerald-500 mt-1">
                  Expresión cron: <code className="bg-emerald-100 dark:bg-emerald-900/40 px-1 rounded">0 5-21 * * 1-5</code> (UTC)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Cobertura horaria</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 17 }, (_, i) => i + 7).map(h => (
                  <Badge key={h} variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                    {String(h).padStart(2, "0")}:00
                  </Badge>
                ))}
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Días activos</p>
              </div>
              <div className="flex gap-1">
                {["Lun", "Mar", "Mié", "Jue", "Vie"].map(d => (
                  <Badge key={d} className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-200">{d}</Badge>
                ))}
                {["Sáb", "Dom"].map(d => (
                  <Badge key={d} variant="outline" className="text-[10px] px-2 py-0.5 text-slate-400">{d}</Badge>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Saltar fines de semana y festivos automáticamente</p>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Acciones manuales</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleManualSync} disabled={isSyncing} className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                Sincronizar ahora
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleShiftAudit("check_morning")} disabled={isSyncing} className="gap-1.5">
                Auditoría Mañana
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleShiftAudit("check_afternoon")} disabled={isSyncing} className="gap-1.5">
                Auditoría Tarde
              </Button>
            </div>
          </div>

          {syncError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-xs">
              <p className="font-semibold text-red-700 dark:text-red-300 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Error en la sincronización
              </p>
              <p className="text-red-600 dark:text-red-400">{syncError}</p>
              {syncError.toLowerCase().includes('cloudflare') && (
                <p className="text-red-500 dark:text-red-500 mt-1">
                  💡 Espera 2-3 minutos e inténtalo de nuevo. Si persiste, verifica que la API key de Cuco360 sea correcta.
                </p>
              )}
            </div>
          )}

          {lastResult && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-xs">
              <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">
                Última sync: {lastSync?.toLocaleTimeString("es-ES")}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-blue-600 dark:text-blue-400">
                <span>Marcajes: <strong>{lastResult.count || 0}</strong></span>
                {lastResult.analysis && (
                  <>
                    <span>Ficharon: <strong>{lastResult.analysis.ficharon || 0}</strong></span>
                    <span>Reactivados: <strong>{lastResult.analysis.reactivados || 0}</strong></span>
                    <span>Retrasos: <strong>{lastResult.analysis.nuevos_retrasos || 0}</strong></span>
                    <span>Ausencias auto: <strong>{lastResult.analysis.nuevas_ausencias_auto || 0}</strong></span>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Lógica de detección de ausencias</p>
              <ul className="text-xs text-amber-700 dark:text-amber-400 mt-1 space-y-1">
                <li>• <strong>0-4 min</strong> sin fichar tras inicio de turno → Sin acción (margen normal)</li>
                <li>• <strong>5-29 min</strong> sin fichar → Estado "Potencialmente Ausente" (alerta visual)</li>
                <li>• <strong>≥30 min</strong> sin fichar → Ausencia automática creada (pendiente revisión RRHH)</li>
                <li>• Si fiche después: ausencia auto cancelada, estado vuelve a "Presente" o "Retraso"</li>
                <li>• Empleados con ausencia formal registrada → Estado "Ausente" (no se genera ausencia auto)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}