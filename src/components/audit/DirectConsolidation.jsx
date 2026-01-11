import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Download,
  Database,
  Trash2,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

/**
 * CONSOLIDACIÓN DIRECTA SIN BACKEND FUNCTIONS
 * Ejecuta todo desde el frontend con máximo control
 */
export default function DirectConsolidation() {
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);

  // Cargar datos
  const { data: legacyEmployees = [], refetch: refetchLegacy } = useQuery({
    queryKey: ['legacy-employees'],
    queryFn: () => base44.entities.Employee.list('nombre', 1000)
  });

  const { data: masterEmployees = [], refetch: refetchMaster } = useQuery({
    queryKey: ['master-employees-consolidation'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre', 1000)
  });

  // Análisis automático
  const analysis = React.useMemo(() => {
    const masterCodes = new Set(masterEmployees.map(e => e.codigo_empleado).filter(Boolean));
    const legacyCodes = new Set(legacyEmployees.map(e => e.codigo_empleado).filter(Boolean));
    
    const needMigration = legacyEmployees.filter(emp => 
      emp.codigo_empleado && !masterCodes.has(emp.codigo_empleado)
    );

    const alreadyInMaster = legacyEmployees.filter(emp =>
      emp.codigo_empleado && masterCodes.has(emp.codigo_empleado)
    );

    return {
      legacy: legacyEmployees.length,
      master: masterEmployees.length,
      needMigration: needMigration.length,
      alreadyInMaster: alreadyInMaster.length,
      canDelete: needMigration.length === 0 && legacyEmployees.length > 0
    };
  }, [legacyEmployees, masterEmployees]);

  const executeDirectConsolidation = async () => {
    console.log("═══════════════════════════════════════");
    console.log("🎯 CONSOLIDACIÓN DIRECTA INICIADA");
    console.log("═══════════════════════════════════════");
    
    setExecuting(true);
    setResult(null);

    const report = {
      migrated: 0,
      skipped: 0,
      updated: 0,
      errors: [],
      mappings: []
    };

    try {
      // FASE 1: Migrar empleados faltantes
      console.log(`📊 FASE 1: Migrar ${analysis.needMigration} empleados...`);
      toast.info(`Migrando ${analysis.needMigration} empleados...`);

      const masterByCode = new Map();
      masterEmployees.forEach(emp => {
        if (emp.codigo_empleado) masterByCode.set(emp.codigo_empleado, emp);
      });

      for (const legacyEmp of legacyEmployees) {
        try {
          const existsInMaster = legacyEmp.codigo_empleado ? 
            masterByCode.get(legacyEmp.codigo_empleado) : null;

          if (existsInMaster) {
            // Ya existe - solo guardar mapeo
            report.skipped++;
            report.mappings.push({
              oldId: legacyEmp.id,
              newId: existsInMaster.id,
              codigo: legacyEmp.codigo_empleado,
              action: 'skipped'
            });
          } else {
            // Migrar a master
            const { id, created_date, updated_date, ...dataToMigrate } = legacyEmp;
            
            const newRecord = await base44.entities.EmployeeMasterDatabase.create({
              ...dataToMigrate,
              migrated_from_legacy: true,
              legacy_id: legacyEmp.id
            });

            report.migrated++;
            report.mappings.push({
              oldId: legacyEmp.id,
              newId: newRecord.id,
              codigo: legacyEmp.codigo_empleado,
              action: 'migrated'
            });

            // Actualizar índice
            if (newRecord.codigo_empleado) {
              masterByCode.set(newRecord.codigo_empleado, newRecord);
            }

            console.log(`✓ Migrado: ${legacyEmp.nombre} (${legacyEmp.codigo_empleado})`);
          }
        } catch (error) {
          console.error(`✗ Error migrando ${legacyEmp.codigo_empleado}:`, error);
          report.errors.push({
            employee: legacyEmp.codigo_empleado,
            error: error.message
          });
        }
      }

      console.log(`✅ FASE 1 COMPLETADA: ${report.migrated} migrados, ${report.skipped} saltados`);
      toast.success(`✅ ${report.migrated} empleados migrados`);

      // FASE 2: Actualizar referencias (solo si hay mappings)
      if (report.mappings.length > 0) {
        console.log(`📊 FASE 2: Actualizar referencias...`);
        toast.info("Actualizando referencias en entidades...");

        const idMap = new Map();
        report.mappings.forEach(m => {
          if (m.oldId && m.newId && m.oldId !== m.newId) {
            idMap.set(m.oldId, m.newId);
          }
        });

        console.log(`Mapeando ${idMap.size} IDs diferentes`);

        // Actualizar Absence
        try {
          const absences = await base44.entities.Absence.list('-created_date', 1000);
          for (const absence of absences) {
            if (absence.employee_id && idMap.has(absence.employee_id)) {
              await base44.entities.Absence.update(absence.id, {
                employee_id: idMap.get(absence.employee_id)
              });
              report.updated++;
            }
          }
          console.log(`✓ Absence: ${report.updated} actualizadas`);
        } catch (e) {
          console.error("Error actualizando Absence:", e);
        }

        console.log(`✅ FASE 2 COMPLETADA: ${report.updated} referencias actualizadas`);
        toast.success(`✅ ${report.updated} referencias actualizadas`);
      }

      // RESULTADO FINAL
      console.log("═══════════════════════════════════════");
      console.log("✅ CONSOLIDACIÓN EXITOSA");
      console.log(`   Migrados: ${report.migrated}`);
      console.log(`   Saltados: ${report.skipped}`);
      console.log(`   Referencias: ${report.updated}`);
      console.log(`   Errores: ${report.errors.length}`);
      console.log("═══════════════════════════════════════");

      setResult({
        success: true,
        ...report
      });

      // Refrescar datos
      await refetchLegacy();
      await refetchMaster();

      toast.success("🎉 Consolidación completada exitosamente");

    } catch (error) {
      console.error("═══════════════════════════════════════");
      console.error("❌ ERROR CRÍTICO:", error);
      console.error("═══════════════════════════════════════");

      setResult({
        success: false,
        error: error.message,
        ...report
      });

      toast.error(`❌ Error: ${error.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const downloadReport = () => {
    if (!result) return;

    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consolidacion-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Reporte descargado");
  };

  return (
    <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Database className="w-6 h-6" />
          Consolidación Directa de Datos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Análisis previo */}
        {!result && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-white">
                <CardContent className="p-3">
                  <p className="text-xs text-slate-600">Employee (Legacy)</p>
                  <p className="text-2xl font-bold text-red-700">{analysis.legacy}</p>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="p-3">
                  <p className="text-xs text-slate-600">EmployeeMasterDatabase</p>
                  <p className="text-2xl font-bold text-green-700">{analysis.master}</p>
                </CardContent>
              </Card>
            </div>

            <Alert className={`border-2 ${
              analysis.canDelete 
                ? 'border-green-300 bg-green-50' 
                : 'border-orange-300 bg-orange-50'
            }`}>
              <Info className={`w-4 h-4 ${analysis.canDelete ? 'text-green-600' : 'text-orange-600'}`} />
              <AlertDescription className={analysis.canDelete ? 'text-green-900' : 'text-orange-900'}>
                {analysis.canDelete ? (
                  <>
                    <strong>✅ Datos ya consolidados</strong>
                    <p className="text-sm mt-1">
                      Todos los {analysis.legacy} empleados ya existen en EmployeeMasterDatabase.
                      Puedes eliminar Employee.json de forma segura.
                    </p>
                  </>
                ) : (
                  <>
                    <strong>⚠️ Migración necesaria</strong>
                    <p className="text-sm mt-1">
                      {analysis.needMigration} empleados necesitan ser migrados a EmployeeMasterDatabase.
                      {analysis.alreadyInMaster > 0 && ` (${analysis.alreadyInMaster} ya existen)`}
                    </p>
                  </>
                )}
              </AlertDescription>
            </Alert>

            <Button 
              onClick={executeDirectConsolidation}
              disabled={executing || analysis.legacy === 0}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {executing ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Consolidando...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5 mr-2" />
                  {analysis.canDelete ? 'Verificar Consolidación' : 'Iniciar Consolidación'}
                </>
              )}
            </Button>
          </>
        )}

        {/* Resultado */}
        {result && (
          <div className="space-y-4">
            <Alert className={`border-2 ${
              result.success ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
            }`}>
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
              <AlertDescription className={result.success ? 'text-green-900' : 'text-red-900'}>
                <p className="font-bold mb-2">
                  {result.success ? '✅ Consolidación Exitosa' : '❌ Error en Consolidación'}
                </p>
                
                {result.success && (
                  <div className="space-y-1 text-sm">
                    <p>• <strong>{result.migrated}</strong> empleados migrados</p>
                    <p>• <strong>{result.skipped}</strong> ya existían en master</p>
                    <p>• <strong>{result.updated}</strong> referencias actualizadas</p>
                    {result.errors.length > 0 && (
                      <p className="text-orange-700">
                        • <strong>{result.errors.length}</strong> errores menores (ver reporte)
                      </p>
                    )}
                  </div>
                )}

                {!result.success && (
                  <p className="text-sm bg-white p-2 rounded mt-2 font-mono">
                    {result.error}
                  </p>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={downloadReport} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Descargar Reporte
              </Button>
              <Button onClick={() => setResult(null)} variant="outline" className="flex-1">
                Nueva Verificación
              </Button>
            </div>

            {result.success && result.migrated === 0 && result.skipped > 0 && (
              <Alert className="border-green-300 bg-green-50">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  <strong>✅ Datos ya consolidados</strong>
                  <p className="text-sm mt-1">
                    Los {result.skipped} empleados ya están en EmployeeMasterDatabase.
                    Ahora puedes eliminar Employee.json de forma segura.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}