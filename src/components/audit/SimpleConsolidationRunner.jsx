import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function SimpleConsolidationRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);

  const execute = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const response = await base44.functions.invoke('executeFullConsolidation', {});
      
      if (response?.data?.success) {
        setResult({
          success: true,
          data: response.data,
          summary: response.data.summary
        });
        toast.success('✅ Consolidación completada exitosamente');
      } else {
        setResult({
          success: false,
          error: response?.data?.error || 'Error desconocido'
        });
        toast.error(`❌ Error: ${response?.data?.error}`);
      }
    } catch (err) {
      console.error('Error:', err);
      setResult({
        success: false,
        error: err.message
      });
      toast.error(`❌ Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-2 border-blue-300">
      <CardHeader className="bg-blue-50">
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Loader2 className="w-5 h-5" />
          Consolidación de Máquinas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-900 text-sm">
            Esto consolidará TODAS las máquinas, procesos y referencias. Asegúrate de tener permisos de admin.
          </AlertDescription>
        </Alert>

        {!result ? (
          <Button
            onClick={execute}
            disabled={isRunning}
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Ejecutando...
              </>
            ) : (
              'Iniciar Consolidación'
            )}
          </Button>
        ) : null}

        {result?.success && (
          <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-300">
            <div className="flex items-center gap-2 text-green-900 font-semibold">
              <CheckCircle2 className="w-5 h-5" />
              ✅ Consolidación Exitosa
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-3 bg-white rounded border border-green-200">
                <p className="text-slate-600 text-xs">Máquinas Migradas</p>
                <p className="text-xl font-bold text-green-700">{result.summary?.machines_migrated || 0}</p>
              </div>
              <div className="p-3 bg-white rounded border border-blue-200">
                <p className="text-slate-600 text-xs">Duplicados Corregidos</p>
                <p className="text-xl font-bold text-blue-700">{result.summary?.duplicates_fixed || 0}</p>
              </div>
              <div className="p-3 bg-white rounded border border-purple-200">
                <p className="text-slate-600 text-xs">Referencias Actualizadas</p>
                <p className="text-xl font-bold text-purple-700">{result.summary?.references_updated || 0}</p>
              </div>
              <div className="p-3 bg-white rounded border border-red-200">
                <p className="text-slate-600 text-xs">Rotas Restantes</p>
                <p className="text-xl font-bold text-red-700">{result.summary?.broken_remaining || 0}</p>
              </div>
            </div>

            {result.data?.execution?.steps && (
              <div className="text-sm space-y-1 p-2 bg-slate-50 rounded border border-slate-200">
                {result.data.execution.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className={step.status === 'success' ? 'text-green-600' : 'text-blue-600'}>
                      {step.status === 'success' ? '✓' : '→'}
                    </span>
                    <span className="text-slate-700">{step.step}: {step.msg}</span>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={() => {
                setResult(null);
                window.location.reload();
              }}
              className="w-full"
              variant="outline"
            >
              Recargar y Verificar
            </Button>
          </div>
        )}

        {result?.success === false && (
          <Alert className="border-red-300 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-900">
              <p className="font-semibold">❌ Error:</p>
              <p className="text-sm mt-1">{result.error}</p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}