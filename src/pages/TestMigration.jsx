import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, PlayCircle, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigationHistory } from "../components/utils/useNavigationHistory";

export default function TestMigrationPage() {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState(null);
  const { goBack } = useNavigationHistory();

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  const runMigration = async () => {
    setMigrating(true);
    setResult(null);
    
    try {
      toast.info("Ejecutando migración de habilidades de máquinas...");
      
      // Obtener todos los empleados
      const employees = await base44.entities.EmployeeMasterDatabase.list();
      
      // Obtener skills existentes
      const existingSkills = await base44.entities.EmployeeMachineSkill.list();
      
      let created = 0;
      let updated = 0;
      let skipped = 0;
      
      // Preparar operaciones en lote
      const toCreate = [];
      const toUpdate = [];
      
      for (const emp of employees) {
        // Procesar maquina_1 a maquina_10
        for (let i = 1; i <= 10; i++) {
          const machineId = emp[`maquina_${i}`];
          if (!machineId) continue;
          
          // Buscar si ya existe
          const existing = existingSkills.find(
            s => s.employee_id === emp.id && s.machine_id === machineId
          );
          
          if (existing) {
            // Actualizar si cambió el orden
            if (existing.orden_preferencia !== i) {
              toUpdate.push({ id: existing.id, orden_preferencia: i });
            } else {
              skipped++;
            }
          } else {
            // Crear nuevo
            toCreate.push({
              employee_id: emp.id,
              machine_id: machineId,
              orden_preferencia: i,
              nivel_habilidad: "Intermedio"
            });
          }
        }
      }
      
      // Ejecutar actualizaciones en lotes de 10 con delays
      for (let i = 0; i < toUpdate.length; i += 10) {
        const batch = toUpdate.slice(i, i + 10);
        await Promise.all(
          batch.map(item => 
            base44.entities.EmployeeMachineSkill.update(item.id, { orden_preferencia: item.orden_preferencia })
          )
        );
        updated += batch.length;
        if (i + 10 < toUpdate.length) {
          await delay(500); // Pausa entre lotes
        }
      }
      
      // Ejecutar creaciones en lotes de 10 con delays
      for (let i = 0; i < toCreate.length; i += 10) {
        const batch = toCreate.slice(i, i + 10);
        await Promise.all(
          batch.map(item => base44.entities.EmployeeMachineSkill.create(item))
        );
        created += batch.length;
        if (i + 10 < toCreate.length) {
          await delay(500); // Pausa entre lotes
        }
      }
      
      const stats = {
        created,
        updated,
        skipped,
        totalEmployees: employees.length
      };
      
      setResult({
        success: true,
        message: `Migración completada: ${created} creados, ${updated} actualizados, ${skipped} omitidos`,
        stats
      });
      toast.success("Migración completada exitosamente");
      
    } catch (error) {
      console.error("Error en migración:", error);
      setResult({ success: false, error: error.message });
      toast.error("Error al ejecutar la migración");
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={goBack} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <PlayCircle className="w-6 h-6 text-blue-600" />
              Migración de Habilidades de Máquinas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">¿Qué hace esta migración?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Lee todos los empleados de EmployeeMasterDatabase</li>
                <li>• Transfiere asignaciones de maquina_1 a maquina_10 → EmployeeMachineSkill</li>
                <li>• Mantiene el orden de preferencia (orden_preferencia)</li>
                <li>• No duplica registros existentes</li>
                <li>• Actualiza registros si cambiaron de posición</li>
              </ul>
            </div>

            <Button
              onClick={runMigration}
              disabled={migrating}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {migrating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Ejecutando migración...
                </>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Ejecutar Migración
                </>
              )}
            </Button>

            {result && (
              <Card className={`${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    )}
                    <div className="flex-1">
                      <h4 className={`font-semibold mb-2 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                        {result.success ? 'Migración Exitosa' : 'Error en la Migración'}
                      </h4>
                      
                      {result.success ? (
                        <div className="space-y-2 text-sm text-green-800">
                          <p>{result.message}</p>
                          <div className="grid grid-cols-2 gap-4 mt-3 bg-white/50 p-3 rounded">
                            <div>
                              <p className="font-medium">Registros Creados:</p>
                              <p className="text-2xl font-bold">{result.stats.created}</p>
                            </div>
                            <div>
                              <p className="font-medium">Registros Actualizados:</p>
                              <p className="text-2xl font-bold">{result.stats.updated}</p>
                            </div>
                            <div>
                              <p className="font-medium">Omitidos:</p>
                              <p className="text-2xl font-bold">{result.stats.skipped}</p>
                            </div>
                            <div>
                              <p className="font-medium">Empleados Procesados:</p>
                              <p className="text-2xl font-bold">{result.stats.totalEmployees}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-red-800">{result.error}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}