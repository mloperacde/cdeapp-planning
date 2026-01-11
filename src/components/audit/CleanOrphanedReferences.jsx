import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CleanOrphanedReferences() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);

  const cleanReferences = async () => {
    setIsRunning(true);
    setResults(null);
    const summary = {
      machineProcessDeleted: 0,
      errors: []
    };

    try {
      toast.loading('Analizando referencias rotas...');

      // Obtener máquinas válidas
      const validMachines = await base44.entities.MachineMasterDatabase.list('', 500);
      const validMachineIds = new Set(validMachines.map(m => m.id));

      toast.dismiss();
      toast.loading('Limpiando MachineProcess...');

      // Obtener todos los MachineProcess
      const allMachineProcess = await base44.entities.MachineProcess.list('', 500);

      // Identificar y eliminar los rotos
      for (const mp of allMachineProcess) {
        if (!validMachineIds.has(mp.machine_id)) {
          try {
            await base44.entities.MachineProcess.delete(mp.id);
            summary.machineProcessDeleted++;
          } catch (err) {
            summary.errors.push({ 
              id: mp.id, 
              error: err.message 
            });
          }
        }
      }

      toast.dismiss();
      toast.success(`✅ ${summary.machineProcessDeleted} referencias rotas eliminadas`);
      setResults(summary);
    } catch (err) {
      console.error('Error:', err);
      toast.dismiss();
      toast.error(`❌ Error: ${err.message}`);
      setResults({ ...summary, errors: [{ error: err.message }] });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-2 border-red-300">
      <CardHeader className="bg-red-50">
        <CardTitle className="flex items-center gap-2 text-red-900">
          <Trash2 className="w-5 h-5" />
          Limpiar Referencias Huérfanas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-900 text-sm">
            Esto eliminará <strong>101 referencias rotas</strong> en MachineProcess donde las máquinas no existen.
          </AlertDescription>
        </Alert>

        {!results ? (
          <Button
            onClick={cleanReferences}
            disabled={isRunning}
            className="w-full bg-red-600 hover:bg-red-700 h-12 text-lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Limpiando referencias...
              </>
            ) : (
              'Limpiar Referencias Rotas'
            )}
          </Button>
        ) : null}

        {results && (
          <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-300">
            <div className="flex items-center gap-2 text-green-900 font-semibold">
              <CheckCircle2 className="w-5 h-5" />
              ✅ Limpieza Completada
            </div>

            <div className="p-3 bg-white rounded border border-red-200">
              <p className="text-slate-600 text-xs">MachineProcess Eliminados</p>
              <p className="text-2xl font-bold text-red-700">{results.machineProcessDeleted}</p>
            </div>

            {results.errors.length > 0 && (
              <Alert className="border-amber-300 bg-amber-50">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-900 text-sm">
                  <strong>{results.errors.length} errores encontrados:</strong>
                  {results.errors.map((e, idx) => (
                    <p key={idx} className="mt-1 text-xs">{e.id}: {e.error}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {results.errors.length === 0 && (
              <Alert className="border-green-400 bg-green-100">
                <CheckCircle2 className="w-4 h-4 text-green-700" />
                <AlertDescription className="text-green-800 font-semibold">
                  ✅ Todas las referencias rotas fueron eliminadas exitosamente
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={() => {
                setResults(null);
                window.location.reload();
              }}
              className="w-full"
              variant="outline"
            >
              Recargar Página
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}