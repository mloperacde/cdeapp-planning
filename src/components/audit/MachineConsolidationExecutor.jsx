import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, Database, RefreshCw, Download } from "lucide-react";
import { useConsolidation } from "../hooks/useConsolidation";
import { toast } from "sonner";

export default function MachineConsolidationExecutor() {
  const { executing, currentStep, results, error, executeConsolidation } = useConsolidation();

  const steps = [
    { name: "Consolidar Máquinas", status: "pending" },
    { name: "Actualizar Referencias", status: "pending" },
    { name: "Verificación Final", status: "pending" }
  ];

  const handleExecute = async () => {
    try {
      await executeConsolidation();
      if (!error) {
        toast.success("¡Consolidación completada exitosamente!");
      } else {
        toast.error(`Error: ${error}`);
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const downloadReport = () => {
    const reportData = JSON.stringify(results, null, 2);
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consolidacion-maquinas-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStepStatus = (stepIndex) => {
    if (currentStep > stepIndex) return "completed";
    if (currentStep === stepIndex && executing) return "in-progress";
    return "pending";
  };

  return (
    <Card className="border-2 border-blue-300">
      <CardHeader className="bg-blue-50">
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Database className="w-5 h-5" />
          Ejecutor de Consolidación de Máquinas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Advertencia */}
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <p className="font-semibold mb-2">⚠️ Operación Crítica</p>
            <ul className="text-sm space-y-1 ml-4">
              <li>• Migrará todos los datos de Machine a MachineMasterDatabase</li>
              <li>• Corregirá códigos duplicados automáticamente</li>
              <li>• Integrará procesos en procesos_configurados</li>
              <li>• Actualizará referencias en 4+ entidades relacionadas</li>
              <li>• Eliminará asignaciones huérfanas irrecuperables</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Pasos de ejecución */}
        <div className="space-y-3">
          {steps.map((step, idx) => {
            const status = getStepStatus(idx);
            return (
              <div key={idx} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  status === 'completed' ? 'bg-green-100 text-green-700' :
                  status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> :
                   status === 'in-progress' ? <RefreshCw className="w-5 h-5 animate-spin" /> :
                   idx + 1}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${
                    status === 'pending' ? 'text-slate-500' : 'text-slate-900'
                  }`}>
                    {step.name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Barra de progreso */}
        {executing && (
          <div className="space-y-2">
            <Progress value={(currentStep / steps.length) * 100} className="h-2" />
            <p className="text-xs text-slate-600 text-center">
              Procesando paso {currentStep} de {steps.length}...
            </p>
          </div>
        )}

        {/* Resultados */}
        {results && !results.error && (
          <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-300">
            <div className="flex items-center gap-2 text-green-900 font-semibold">
              <CheckCircle2 className="w-5 h-5" />
              Consolidación Completada
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-white rounded border border-green-200">
                <p className="text-slate-600">Máquinas Migradas</p>
                <p className="text-2xl font-bold text-green-700">
                  {results.consolidation?.summary?.migrated || results.consolidation?.results?.migrated || 0}
                </p>
              </div>
              
              <div className="p-3 bg-white rounded border border-green-200">
                <p className="text-slate-600">Duplicados Corregidos</p>
                <p className="text-2xl font-bold text-blue-700">
                  {results.consolidation?.summary?.duplicates_fixed || results.consolidation?.results?.duplicatesFixed || 0}
                </p>
              </div>
              
              <div className="p-3 bg-white rounded border border-green-200">
                <p className="text-slate-600">Procesos Integrados</p>
                <p className="text-2xl font-bold text-purple-700">
                  {results.consolidation?.summary?.processes_integrated || results.consolidation?.results?.processesIntegrated || 0}
                </p>
              </div>
              
              <div className="p-3 bg-white rounded border border-green-200">
                <p className="text-slate-600">Referencias Actualizadas</p>
                <p className="text-2xl font-bold text-indigo-700">
                  {results.references?.summary?.total_updated || 0}
                </p>
              </div>
            </div>

            {(results.references?.results?.orphanedRemoved > 0 || results.references?.summary?.orphaned_removed > 0) && (
              <Alert className="border-amber-300 bg-amber-50">
                <AlertDescription className="text-amber-900 text-sm">
                  Se eliminaron {results.references?.results?.orphanedRemoved || results.references?.summary?.orphaned_removed || 0} asignaciones huérfanas irrecuperables
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Error */}
        {(results?.error || error) && (
          <Alert className="border-red-300 bg-red-50">
            <AlertDescription className="text-red-900">
              <p className="font-semibold">Error en la consolidación:</p>
              <p className="text-sm mt-1">{results?.error || error}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Botones de acción */}
        <div className="flex gap-3">
          <Button
            onClick={handleExecute}
            disabled={executing}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {executing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Ejecutando...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Iniciar Consolidación
              </>
            )}
          </Button>

          {results && !results.error && (
            <Button
              onClick={downloadReport}
              variant="outline"
              className="border-green-600 text-green-700 hover:bg-green-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar Reporte
            </Button>
          )}

          {results && (
            <Button
              onClick={() => {
                setResults(null);
                setCurrentStep(0);
              }}
              variant="outline"
            >
              Reiniciar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}