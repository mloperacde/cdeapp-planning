import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PlanningConsolidation() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);

  const consolidate = async () => {
    setIsRunning(true);
    setResults(null);
    const summary = {
      machineplanningMigrated: 0,
      dailystaffingMigrated: 0,
      entityDeleted: [],
      errors: []
    };

    try {
      toast.loading('Migrando planificaciones...');

      // Obtener datos de entidades antiguas
      const [machineplan, dailystaff] = await Promise.all([
        base44.entities.MachinePlanning.list('', 500),
        base44.entities.DailyMachineStaffing.list('', 500)
      ]);

      toast.dismiss();
      toast.loading('Creando registros consolidados...');

      // Migrar MachinePlanning → DailyMachinePlanning
      for (const mp of machineplan) {
        try {
          await base44.entities.DailyMachinePlanning.create({
            date: mp.fecha_planificacion,
            shift: 'Mañana', // Default, se puede actualizar
            machine_id: mp.machine_id,
            team_key: mp.team_key,
            process_id: mp.process_id,
            activa: mp.activa_planning !== false,
            operadores_necesarios: mp.operadores_necesarios,
            status: 'Borrador',
            migration_from: 'MachinePlanning'
          });
          summary.machineplanningMigrated++;
        } catch (err) {
          summary.errors.push({ entity: 'MachinePlanning', id: mp.id, error: err.message });
        }
      }

      // Migrar DailyMachineStaffing → DailyMachinePlanning
      for (const ds of dailystaff) {
        try {
          await base44.entities.DailyMachinePlanning.create({
            date: ds.date,
            shift: ds.shift,
            machine_id: ds.machine_id,
            team_key: 'team_1', // Default
            process_id: null,
            activa: true,
            operadores_necesarios: 0,
            responsable_linea: ds.responsable_linea ? [ds.responsable_linea] : [],
            segunda_linea: ds.segunda_linea ? [ds.segunda_linea] : [],
            operador_1: ds.operador_1,
            operador_2: ds.operador_2,
            operador_3: ds.operador_3,
            operador_4: ds.operador_4,
            operador_5: ds.operador_5,
            operador_6: ds.operador_6,
            operador_7: ds.operador_7,
            operador_8: ds.operador_8,
            status: ds.status,
            notes: ds.notes,
            migration_from: 'DailyMachineStaffing'
          });
          summary.dailystaffingMigrated++;
        } catch (err) {
          summary.errors.push({ entity: 'DailyMachineStaffing', id: ds.id, error: err.message });
        }
      }

      toast.dismiss();
      toast.loading('Eliminando entidades redundantes...');

      // Eliminar registros de las entidades antiguas
      try {
        for (const mp of machineplan) {
          await base44.entities.MachinePlanning.delete(mp.id);
        }
        summary.entityDeleted.push('MachinePlanning');
      } catch (err) {
        summary.errors.push({ error: `Error eliminando MachinePlanning: ${err.message}` });
      }

      try {
        for (const ds of dailystaff) {
          await base44.entities.DailyMachineStaffing.delete(ds.id);
        }
        summary.entityDeleted.push('DailyMachineStaffing');
      } catch (err) {
        summary.errors.push({ error: `Error eliminando DailyMachineStaffing: ${err.message}` });
      }

      toast.dismiss();
      toast.success('✅ Consolidación completada');
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
    <Card className="border-2 border-purple-300">
      <CardHeader className="bg-purple-50">
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Loader2 className="w-5 h-5" />
          Consolidación de Planificación de Máquinas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-900 text-sm">
            Esto migrará <strong>MachinePlanning</strong> y <strong>DailyMachineStaffing</strong> a <strong>DailyMachinePlanning</strong>, eliminando las entidades redundantes.
          </AlertDescription>
        </Alert>

        {!results ? (
          <Button
            onClick={consolidate}
            disabled={isRunning}
            className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Consolidando...
              </>
            ) : (
              'Iniciar Consolidación'
            )}
          </Button>
        ) : null}

        {results && (
          <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-300">
            <div className="flex items-center gap-2 text-green-900 font-semibold">
              <CheckCircle2 className="w-5 h-5" />
              ✅ Consolidación Completada
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-white rounded border border-blue-200">
                <p className="text-slate-600 text-xs">MachinePlanning Migrados</p>
                <p className="text-2xl font-bold text-blue-700">{results.machineplanningMigrated}</p>
              </div>
              <div className="p-3 bg-white rounded border border-purple-200">
                <p className="text-slate-600 text-xs">DailyMachineStaffing Migrados</p>
                <p className="text-2xl font-bold text-purple-700">{results.dailystaffingMigrated}</p>
              </div>
            </div>

            {results.entityDeleted.length > 0 && (
              <Alert className="border-green-400 bg-green-100">
                <CheckCircle2 className="w-4 h-4 text-green-700" />
                <AlertDescription className="text-green-800 font-semibold">
                  ✅ Entidades eliminadas: {results.entityDeleted.join(', ')}
                </AlertDescription>
              </Alert>
            )}

            {results.errors.length > 0 && (
              <Alert className="border-red-300 bg-red-50">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-900 text-sm">
                  <strong>Errores encontrados ({results.errors.length}):</strong>
                  {results.errors.map((e, idx) => (
                    <p key={idx} className="mt-1 text-xs">{e.entity || 'Unknown'}: {e.error}</p>
                  ))}
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