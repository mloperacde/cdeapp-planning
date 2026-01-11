import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, AlertTriangle, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AutomaticConsolidationRunner() {
  const [phase, setPhase] = useState('idle'); // idle, executing, verifying, complete
  const [log, setLog] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const addLog = (message, type = 'info') => {
    setLog(prev => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
  };

  const runFullConsolidation = async () => {
    setPhase('executing');
    setLog([]);
    setResults(null);
    setError(null);

    try {
      // PASO 1: Consolidar máquinas
      addLog('🔄 Iniciando consolidación de máquinas...', 'info');
      
      // Usar base44.asServiceRole.functions para invocar desde el cliente
      const consolidateRes = await base44.asServiceRole.functions.invoke('consolidateMachines', {});
      
      if (!consolidateRes?.data?.success) {
        throw new Error(consolidateRes?.data?.error || 'Error en consolidateMachines');
      }

      addLog(`✅ Consolidación completada: ${consolidateRes.data.summary?.migrated || 0} máquinas migradas`, 'success');
      addLog(`   Duplicados corregidos: ${consolidateRes.data.summary?.duplicates_fixed || 0}`, 'success');
      addLog(`   Procesos integrados: ${consolidateRes.data.summary?.processes_integrated || 0}`, 'success');

      // PASO 2: Actualizar referencias
      addLog('🔄 Actualizando referencias en entidades relacionadas...', 'info');
      const referencesRes = await base44.asServiceRole.functions.invoke('updateMachineReferences', {});
      
      if (!referencesRes?.data?.success) {
        throw new Error(referencesRes?.data?.error || 'Error en updateMachineReferences');
      }

      addLog(`✅ Referencias actualizadas:`, 'success');
      addLog(`   MaintenanceSchedule: ${referencesRes.data.results?.maintenanceUpdated || 0} actualizadas`, 'success');
      addLog(`   MachineAssignment: ${referencesRes.data.results?.assignmentsUpdated || 0} actualizadas`, 'success');
      addLog(`   MachinePlanning: ${referencesRes.data.results?.planningUpdated || 0} actualizadas`, 'success');
      addLog(`   Asignaciones huérfanas eliminadas: ${referencesRes.data.results?.orphanedRemoved || 0}`, 'success');

      // PASO 3: Verificación final
      setPhase('verifying');
      addLog('🔍 Realizando verificación final...', 'info');

      const [machines, masterMachines, assignments, planning, maintenance] = await Promise.all([
        base44.entities.Machine.list('', 500),
        base44.entities.MachineMasterDatabase.list('', 500),
        base44.entities.MachineAssignment.list('', 500),
        base44.entities.MachinePlanning.list('', 500),
        base44.entities.MaintenanceSchedule.list('', 500)
      ]);

      const masterIds = new Set(masterMachines.filter(m => !m.is_deleted).map(m => m.id));
      const brokenAssignments = assignments.filter(a => a.machine_id && !masterIds.has(a.machine_id)).length;
      const brokenPlanning = planning.filter(p => p.machine_id && !masterIds.has(p.machine_id)).length;
      const brokenMaintenance = maintenance.filter(m => m.machine_id && !masterIds.has(m.machine_id)).length;

      addLog(`📊 Resultados de Verificación:`, 'info');
      addLog(`   Máquinas Legacy restantes: ${machines.length}`, 'info');
      addLog(`   Máquinas Master consolidadas: ${masterMachines.filter(m => !m.is_deleted).length}`, 'info');
      addLog(`   Referencias rotas en Assignments: ${brokenAssignments}`, brokenAssignments > 0 ? 'warning' : 'success');
      addLog(`   Referencias rotas en Planning: ${brokenPlanning}`, brokenPlanning > 0 ? 'warning' : 'success');
      addLog(`   Referencias rotas en Maintenance: ${brokenMaintenance}`, brokenMaintenance > 0 ? 'warning' : 'success');

      const finalResults = {
        consolidation: consolidateRes.data.summary,
        references: referencesRes.data.results,
        verification: {
          legacyMachines: machines.length,
          masterMachines: masterMachines.filter(m => !m.is_deleted).length,
          brokenAssignments,
          brokenPlanning,
          brokenMaintenance,
          totalBroken: brokenAssignments + brokenPlanning + brokenMaintenance
        }
      };

      setResults(finalResults);
      setPhase('complete');

      if (finalResults.verification.totalBroken === 0) {
        addLog('✅ ¡CONSOLIDACIÓN EXITOSA! Todos los datos están correctos.', 'success');
      } else {
        addLog(`⚠️ Consolidación completada pero hay ${finalResults.verification.totalBroken} referencias rotas restantes`, 'warning');
      }

    } catch (err) {
      console.error('Error en consolidación:', err);
      addLog(`❌ ERROR: ${err.message}`, 'error');
      setError(err.message);
      setPhase('complete');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCw className="w-5 h-5" />
            Ejecución Automática de Consolidación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Botón de ejecución */}
          {phase === 'idle' && (
            <Button
              onClick={runFullConsolidation}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12"
            >
              <Loader2 className="w-5 h-5 mr-2" />
              Ejecutar Consolidación Completa Automática
            </Button>
          )}

          {/* Indicador de progreso */}
          {phase !== 'idle' && phase !== 'complete' && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-300">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="font-medium text-blue-900">
                {phase === 'executing' ? 'Ejecutando consolidación...' : 'Verificando resultados...'}
              </span>
            </div>
          )}

          {/* Log de ejecución */}
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900">Registro de Ejecución:</h3>
            <div className="max-h-96 overflow-y-auto bg-slate-50 rounded border border-slate-200 p-3 space-y-2 font-mono text-sm">
              {log.length === 0 ? (
                <p className="text-slate-500">Esperando ejecución...</p>
              ) : (
                log.map((entry, idx) => (
                  <div key={idx} className={`flex gap-2 ${
                    entry.type === 'success' ? 'text-green-700' :
                    entry.type === 'error' ? 'text-red-700' :
                    entry.type === 'warning' ? 'text-amber-700' :
                    'text-slate-700'
                  }`}>
                    <span className="text-slate-500 flex-shrink-0">{entry.time}</span>
                    <span>{entry.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Resultados */}
          {results && phase === 'complete' && !error && (
            <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-300">
              <div className="flex items-center gap-2 text-green-900 font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                Consolidación Completada
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="p-3 bg-white rounded border border-green-200">
                  <p className="text-slate-600">Máquinas Migradas</p>
                  <p className="text-2xl font-bold text-green-700">{results.consolidation?.migrated || 0}</p>
                </div>
                <div className="p-3 bg-white rounded border border-green-200">
                  <p className="text-slate-600">Duplicados Corregidos</p>
                  <p className="text-2xl font-bold text-blue-700">{results.consolidation?.duplicates_fixed || 0}</p>
                </div>
                <div className="p-3 bg-white rounded border border-green-200">
                  <p className="text-slate-600">Procesos Integrados</p>
                  <p className="text-2xl font-bold text-purple-700">{results.consolidation?.processes_integrated || 0}</p>
                </div>
                <div className="p-3 bg-white rounded border border-blue-200">
                  <p className="text-slate-600">Máquinas Master</p>
                  <p className="text-2xl font-bold text-blue-700">{results.verification?.masterMachines || 0}</p>
                </div>
                <div className="p-3 bg-white rounded border border-amber-200">
                  <p className="text-slate-600">Máquinas Legacy</p>
                  <p className="text-2xl font-bold text-amber-700">{results.verification?.legacyMachines || 0}</p>
                </div>
                <div className={`p-3 bg-white rounded border ${results.verification?.totalBroken === 0 ? 'border-green-200' : 'border-red-200'}`}>
                  <p className="text-slate-600">Referencias Rotas</p>
                  <p className={`text-2xl font-bold ${results.verification?.totalBroken === 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {results.verification?.totalBroken || 0}
                  </p>
                </div>
              </div>

              {results.verification?.totalBroken === 0 ? (
                <Alert className="border-green-300 bg-green-50">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    ✅ Sistema completamente consolidado y sin errores de referencia.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-300 bg-red-50">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-red-900">
                    ⚠️ Hay {results.verification?.totalBroken} referencias rotas restantes que requieren atención manual.
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={() => setPhase('idle')} className="w-full" variant="outline">
                Reiniciar
              </Button>
            </div>
          )}

          {/* Error */}
          {error && phase === 'complete' && (
            <Alert className="border-red-300 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <p className="font-semibold">Error en la consolidación:</p>
                <p className="text-sm mt-1">{error}</p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}