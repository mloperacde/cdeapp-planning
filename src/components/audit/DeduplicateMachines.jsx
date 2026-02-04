import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { getMachineAlias } from '@/utils/machineAlias';

export default function DeduplicateMachines() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);

  const deduplicate = async () => {
    setIsRunning(true);
    setResults(null);
    const summary = {
      legacyDeleted: 0,
      duplicatesFound: 0,
      errors: []
    };

    try {
      toast.loading('Analizando máquinas...');

      // Obtener todas las máquinas de ambas entidades
      const [legacyMachines, masterMachines] = await Promise.all([
        base44.entities.Machine.list('', 500),
        base44.entities.MachineMasterDatabase.list('', 500)
      ]);

      // Mapear máquinas master por código
      const masterByCode = {};
      masterMachines.forEach(m => {
        const code = m.codigo_maquina?.toLowerCase();
        if (code) {
          if (!masterByCode[code]) masterByCode[code] = [];
          masterByCode[code].push(m);
        }
      });

      // Identificar duplicados y máquinas legacy a eliminar
      const toDelete = [];
      legacyMachines.forEach(legacy => {
        const legacyCode = legacy.codigo?.toLowerCase();
        if (legacyCode && masterByCode[legacyCode]) {
          toDelete.push(legacy);
          summary.duplicatesFound++;
        }
      });

      toast.dismiss();
      toast.loading(`Eliminando ${toDelete.length} máquinas legacy...`);

      // Eliminar máquinas legacy que tienen duplicado en master
      for (const machine of toDelete) {
        try {
          await base44.entities.Machine.delete(machine.id);
          summary.legacyDeleted++;
        } catch (err) {
          summary.errors.push({ machine: getMachineAlias(machine), error: err.message });
        }
      }

      toast.dismiss();
      toast.success(`✅ ${summary.legacyDeleted} máquinas legacy eliminadas`);

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
          <AlertTriangle className="w-5 h-5" />
          Eliminar Máquinas Duplicadas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-900 text-sm">
            Esto eliminará máquinas legacy de Machine que ya existen en MachineMasterDatabase. <strong>Operación irreversible.</strong>
          </AlertDescription>
        </Alert>

        {!results ? (
          <Button
            onClick={deduplicate}
            disabled={isRunning}
            className="w-full bg-red-600 hover:bg-red-700 h-12 text-lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Eliminando duplicados...
              </>
            ) : (
              'Eliminar Máquinas Duplicadas'
            )}
          </Button>
        ) : null}

        {results && (
          <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-300">
            <div className="flex items-center gap-2 text-green-900 font-semibold">
              <CheckCircle2 className="w-5 h-5" />
              ✅ Deduplicación Completada
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-white rounded border border-red-200">
                <p className="text-slate-600 text-xs">Duplicados Encontrados</p>
                <p className="text-2xl font-bold text-red-700">{results.duplicatesFound}</p>
              </div>
              <div className="p-3 bg-white rounded border border-green-200">
                <p className="text-slate-600 text-xs">Eliminados</p>
                <p className="text-2xl font-bold text-green-700">{results.legacyDeleted}</p>
              </div>
            </div>

            {results.errors.length > 0 && (
              <Alert className="border-red-300 bg-red-50">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-900 text-sm">
                  <strong>Errores encontrados:</strong>
                  {results.errors.map((e, idx) => (
                    <p key={idx} className="mt-1">{e.machine || 'Unknown'}: {e.error}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {results.errors.length === 0 && results.legacyDeleted > 0 && (
              <Alert className="border-green-400 bg-green-100">
                <CheckCircle2 className="w-4 h-4 text-green-700" />
                <AlertDescription className="text-green-800 font-semibold">
                  ✅ Todas las máquinas duplicadas fueron eliminadas exitosamente
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