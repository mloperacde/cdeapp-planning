import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getMachineAlias } from "@/utils/machineAlias";

export default function DirectMachineConsolidation() {
  const [step, setStep] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const consolidate = async () => {
    setIsRunning(true);
    setResults(null);
    const summary = {
      brokenRemoved: 0,
      machinesMigrated: 0,
      referencesUpdated: 0,
      errors: []
    };

    try {
      // PASO 1: Eliminar referencias rotas
      setStep('Limpiando referencias rotas...');
      setProgress({ current: 1, total: 5 });

      const [assignments, plannings, maint] = await Promise.all([
        base44.entities.MachineAssignment.list('', 500),
        base44.entities.MachinePlanning.list('', 500),
        base44.entities.MaintenanceSchedule.list('', 500)
      ]);

      const masterMachines = await base44.entities.MachineMasterDatabase.list('', 500);
      const validMasterIds = new Set(masterMachines.map(m => m.id));

      let brokenCount = 0;
      for (const a of assignments) {
        if (a.machine_id && !validMasterIds.has(a.machine_id)) {
          await base44.entities.MachineAssignment.delete(a.id);
          brokenCount++;
        }
      }
      for (const p of plannings) {
        if (p.machine_id && !validMasterIds.has(p.machine_id)) {
          await base44.entities.MachinePlanning.delete(p.id);
          brokenCount++;
        }
      }
      for (const m of maint) {
        if (m.machine_id && !validMasterIds.has(m.machine_id)) {
          await base44.entities.MaintenanceSchedule.delete(m.id);
          brokenCount++;
        }
      }
      summary.brokenRemoved = brokenCount;
      toast.success(`✅ ${brokenCount} referencias rotas eliminadas`);

      // PASO 2: Obtener máquinas a migrar
      setStep('Preparando máquinas...');
      setProgress({ current: 2, total: 5 });

      const machines = await base44.entities.Machine.list('orden', 500);
      const processes = await base44.entities.Process.list('codigo', 200);
      const machineProcesses = await base44.entities.MachineProcess.list('', 300);

      const masterByCode = {};
      masterMachines.forEach(m => {
        if (m.codigo_maquina) masterByCode[m.codigo_maquina.toLowerCase()] = m;
      });

      const processMap = {};
      processes.forEach(p => {
        processMap[p.id] = {
          process_id: p.id,
          nombre_proceso: p.nombre,
          codigo_proceso: p.codigo,
          operadores_requeridos: p.operadores_requeridos || 1,
          activo: p.activo !== false
        };
      });

      // PASO 3: Migrar máquinas
      setStep('Migrando máquinas...');
      setProgress({ current: 3, total: 5 });

      const legacyToNewMap = {};
      let migratedCount = 0;

      for (const machine of machines) {
        const codigo = machine.codigo?.toLowerCase();
        
        // Si ya existe, mapear para actualizar referencias
        if (codigo && masterByCode[codigo]) {
          legacyToNewMap[machine.id] = masterByCode[codigo].id;
          continue;
        }

        // Construir procesos
        const machineProcessRecords = machineProcesses.filter(mp => mp.machine_id === machine.id);
        const procesosConfigurados = [];
        
        for (const mp of machineProcessRecords) {
          if (processMap[mp.process_id]) {
            procesosConfigurados.push({
              ...processMap[mp.process_id],
              operadores_requeridos: mp.operadores_requeridos || processMap[mp.process_id].operadores_requeridos,
              orden: mp.orden || 0,
              activo: mp.activo !== false
            });
          }
        }

        if (machine.procesos_ids && Array.isArray(machine.procesos_ids)) {
          machine.procesos_ids.forEach((pid) => {
            if (processMap[pid] && !procesosConfigurados.find(p => p.process_id === pid)) {
              procesosConfigurados.push({
                ...processMap[pid],
                orden: procesosConfigurados.length,
                activo: true
              });
            }
          });
        }

        // Crear en master
        try {
          // Campos mapeados
          const machinePayload = {
            // Usar ID original si es posible para mantener referencias, o dejar que DB genere uno
            // id: machine.id, 
            nombre_maquina: machine.nombre, // Nombre original corto
            nombre: getMachineAlias(machine), // Nombre canónico completo
            descripcion: getMachineAlias(machine),
            codigo_maquina: machine.codigo || `M${machine.id}`,
            marca: machine.marca,
            modelo: machine.modelo,
            numero_serie: machine.numero_serie,
            fecha_compra: machine.fecha_compra,
            tipo: machine.tipo,
            ubicacion: machine.ubicacion,
            // descripcion: machine.descripcion, // Usamos alias
            orden_visualizacion: machine.orden,
            estado_operativo: 'Operativa',
            parametros_sobres: machine.parametros_sobres,
            parametros_frascos: machine.parametros_frascos,
            procesos_configurados: procesosConfigurados,
            articulos_fabricables: machine.articulos_ids || [],
            programa_mantenimiento: machine.programa_mantenimiento,
            imagenes: machine.imagenes || [],
            archivos_adjuntos: machine.archivos_adjuntos || [],
            historico_produccion: machine.historico_articulos || [],
            machine_id_legacy: machine.id,
            ultimo_sincronizado: new Date().toISOString(),
            estado_sincronizacion: 'Sincronizado'
          };

          const created = await base44.entities.MachineMasterDatabase.create(machinePayload);
          legacyToNewMap[machine.id] = created.id;
          migratedCount++;
        } catch (err) {
          summary.errors.push({ machine: getMachineAlias(machine), error: err.message });
        }
      }
      summary.machinesMigrated = migratedCount;
      toast.success(`✅ ${migratedCount} máquinas migradas`);

      // PASO 4: Actualizar referencias
      setStep('Actualizando referencias...');
      setProgress({ current: 4, total: 5 });

      const newMaster = await base44.entities.MachineMasterDatabase.list('', 500);
      const finalValidIds = new Set(newMaster.map(m => m.id));

      let updatedCount = 0;

      // Actualizar asignaciones
      const finalAssignments = await base44.entities.MachineAssignment.list('', 500);
      for (const a of finalAssignments) {
        if (a.machine_id && legacyToNewMap[a.machine_id] && legacyToNewMap[a.machine_id] !== a.machine_id) {
          await base44.entities.MachineAssignment.update(a.id, {
            machine_id: legacyToNewMap[a.machine_id]
          });
          updatedCount++;
        }
      }

      // Actualizar planificaciones
      const finalPlannings = await base44.entities.MachinePlanning.list('', 500);
      for (const p of finalPlannings) {
        if (p.machine_id && legacyToNewMap[p.machine_id] && legacyToNewMap[p.machine_id] !== p.machine_id) {
          await base44.entities.MachinePlanning.update(p.id, {
            machine_id: legacyToNewMap[p.machine_id]
          });
          updatedCount++;
        }
      }

      // Actualizar mantenimientos
      const finalMaint = await base44.entities.MaintenanceSchedule.list('', 500);
      for (const m of finalMaint) {
        if (m.machine_id && legacyToNewMap[m.machine_id] && legacyToNewMap[m.machine_id] !== m.machine_id) {
          await base44.entities.MaintenanceSchedule.update(m.id, {
            machine_id: legacyToNewMap[m.machine_id]
          });
          updatedCount++;
        }
      }
      summary.referencesUpdated = updatedCount;
      toast.success(`✅ ${updatedCount} referencias actualizadas`);

      // PASO 5: Verificar integridad
      setStep('Verificando integridad...');
      setProgress({ current: 5, total: 5 });

      const verifyAssign = await base44.entities.MachineAssignment.list('', 500);
      const verifyPlan = await base44.entities.MachinePlanning.list('', 500);
      const verifyMaint = await base44.entities.MaintenanceSchedule.list('', 500);

      const brokenAssign = verifyAssign.filter(a => a.machine_id && !finalValidIds.has(a.machine_id)).length;
      const brokenPlan = verifyPlan.filter(p => p.machine_id && !finalValidIds.has(p.machine_id)).length;
      const brokenMaint = verifyMaint.filter(m => m.machine_id && !finalValidIds.has(m.machine_id)).length;

      setStep(null);
      setResults({
        ...summary,
        brokenRemaining: brokenAssign + brokenPlan + brokenMaint,
        timestamp: new Date().toLocaleString('es-ES')
      });

      toast.success('✅ Consolidación completada');
    } catch (err) {
      console.error('Error:', err);
      toast.error(`❌ Error: ${err.message}`);
      setResults({ ...summary, errors: [{ error: err.message }] });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-2 border-blue-300">
      <CardHeader className="bg-blue-50">
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Loader2 className="w-5 h-5" />
          Consolidación Directa de Máquinas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-900 text-sm">
            Esto eliminará referencias rotas y migrará TODAS las máquinas. Operación irreversible.
          </AlertDescription>
        </Alert>

        {!step && !results ? (
          <Button
            onClick={consolidate}
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

        {step && (
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-300">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-blue-900 font-semibold">{step}</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-sm text-blue-800">Paso {progress.current} de {progress.total}</p>
          </div>
        )}

        {results && (
          <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-300">
            <div className="flex items-center gap-2 text-green-900 font-semibold">
              <CheckCircle2 className="w-5 h-5" />
              ✅ Consolidación Completada
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-3 bg-white rounded border border-red-200">
                <p className="text-slate-600 text-xs">Referencias Rotas Eliminadas</p>
                <p className="text-xl font-bold text-red-700">{results.brokenRemoved}</p>
              </div>
              <div className="p-3 bg-white rounded border border-green-200">
                <p className="text-slate-600 text-xs">Máquinas Migradas</p>
                <p className="text-xl font-bold text-green-700">{results.machinesMigrated}</p>
              </div>
              <div className="p-3 bg-white rounded border border-purple-200">
                <p className="text-slate-600 text-xs">Referencias Actualizadas</p>
                <p className="text-xl font-bold text-purple-700">{results.referencesUpdated}</p>
              </div>
              <div className={`p-3 bg-white rounded border ${results.brokenRemaining === 0 ? 'border-green-200' : 'border-amber-200'}`}>
                <p className="text-slate-600 text-xs">Rotas Restantes</p>
                <p className={`text-xl font-bold ${results.brokenRemaining === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                  {results.brokenRemaining}
                </p>
              </div>
            </div>

            {results.brokenRemaining === 0 && (
              <Alert className="border-green-400 bg-green-100">
                <CheckCircle2 className="w-4 h-4 text-green-700" />
                <AlertDescription className="text-green-800 font-semibold">
                  ✅ Integridad verificada: Sin referencias rotas
                </AlertDescription>
              </Alert>
            )}

            {results.errors.length > 0 && (
              <Alert className="border-red-300 bg-red-50">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-900 text-sm">
                  {results.errors.map((e, idx) => (
                    <p key={idx}>{e.machine || e.error}: {e.error}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <p className="text-xs text-slate-500">{results.timestamp}</p>

            <Button
              onClick={() => {
                setResults(null);
                window.location.reload();
              }}
              className="w-full"
              variant="outline"
            >
              Recargar y Verificar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}