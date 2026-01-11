import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Download,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

/**
 * EJECUTOR DE CONSOLIDACIÓN DE EMPLOYEE → EMPLOYEEMASTERDATABASE
 */
export default function EmployeeConsolidationExecutor() {
  const [executing, setExecuting] = useState(false);
  const [step, setStep] = useState(0);
  const [results, setResults] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    // Verificar que el SDK está listo
    const checkSDK = async () => {
      try {
        // Verificar que base44 existe y tiene el método de autenticación
        if (base44 && typeof base44.functions?.invoke === 'function') {
          setSdkReady(true);
        } else {
          // El SDK aún no está listo, reintentar
          setTimeout(checkSDK, 200);
        }
      } catch (error) {
        console.error("Error verificando SDK:", error);
        setTimeout(checkSDK, 500);
      }
    };
    
    // Pequeño delay inicial para dar tiempo al SDK a inicializarse
    const timer = setTimeout(checkSDK, 100);
    return () => clearTimeout(timer);
  }, []);

  const executeConsolidation = async () => {
    console.log("🚀 INICIANDO CONSOLIDACIÓN");
    setExecuting(true);
    setStep(1);
    setResults(null);
    
    try {
      // Verificación final del SDK
      if (!base44?.functions?.invoke) {
        throw new Error("SDK no disponible");
      }

      // PASO 1: Consolidar Employee → EmployeeMasterDatabase
      console.log("📊 PASO 1: Llamando consolidateEmployees...");
      toast.info("🔄 Consolidando datos de Employee...");
      
      const consolidateResponse = await base44.functions.invoke('consolidateEmployees', {});
      console.log("✅ Respuesta consolidateEmployees:", consolidateResponse);
      
      const consolidateData = consolidateResponse?.data || consolidateResponse;
      
      if (!consolidateData || !consolidateData.success) {
        console.error("❌ Error en consolidación:", consolidateData);
        throw new Error("Error en consolidación: " + JSON.stringify(consolidateData?.errors || "unknown"));
      }

      console.log(`✅ PASO 1 COMPLETADO: ${consolidateData.employeesMigrated} migrados, ${consolidateData.employeesSkipped} saltados`);
      toast.success(`✅ ${consolidateData.employeesMigrated} migrados`);
      
      setStep(2);
      
      // PASO 2: Actualizar referencias
      console.log("📊 PASO 2: Llamando updateEmployeeReferences...");
      console.log("Mappings a enviar:", consolidateData.mappings?.length || 0);
      toast.info("🔄 Actualizando referencias...");
      
      const updateResponse = await base44.functions.invoke('updateEmployeeReferences', {
        mappings: consolidateData.mappings || []
      });
      console.log("✅ Respuesta updateEmployeeReferences:", updateResponse);
      
      const updateData = updateResponse?.data || updateResponse;
      
      if (!updateData || !updateData.success) {
        console.error("⚠️ Error parcial en referencias:", updateData);
        toast.warning(`⚠️ Algunas referencias no se actualizaron`);
      } else {
        console.log(`✅ PASO 2 COMPLETADO: ${updateData.totalUpdated} referencias actualizadas`);
        toast.success(`✅ ${updateData.totalUpdated} referencias actualizadas`);
      }

      setStep(3);
      console.log("✅ CONSOLIDACIÓN COMPLETA");
      
      setResults({
        consolidation: consolidateData,
        references: updateData,
        success: true
      });
      
      toast.success("🎉 Consolidación completada");

    } catch (error) {
      console.error("❌ ERROR EN CONSOLIDACIÓN:", error);
      console.error("Stack:", error.stack);
      toast.error(`Error: ${error.message}`);
      setResults({
        error: error.message,
        success: false
      });
    } finally {
      console.log("🏁 Finalizando consolidación");
      setExecuting(false);
      setStep(0);
    }
  };

  const downloadReport = () => {
    if (!results) return;
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consolidation-report-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-2 border-purple-300 bg-purple-50">
      <CardHeader>
        <CardTitle className="text-purple-900 flex items-center gap-2">
          <PlayCircle className="w-6 h-6" />
          Ejecutar Consolidación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!results && (
          <>
            <Alert className="border-amber-300 bg-amber-50">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-900">
                <strong>⚠️ Esta operación:</strong>
                <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
                  <li>Migrará todos los registros de Employee a EmployeeMasterDatabase</li>
                  <li>Actualizará referencias en 13 entidades relacionadas</li>
                  <li>No eliminará datos, solo los consolidará</li>
                  <li>Puede tardar varios minutos</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 1 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {step > 1 ? '✓' : '1'}
                </div>
                <span className="text-sm">Consolidar Employee → EmployeeMasterDatabase</span>
                {step === 1 && <Loader2 className="w-4 h-4 animate-spin text-blue-600 ml-auto" />}
              </div>

              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 2 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {step > 2 ? '✓' : '2'}
                </div>
                <span className="text-sm">Actualizar referencias en entidades</span>
                {step === 2 && <Loader2 className="w-4 h-4 animate-spin text-blue-600 ml-auto" />}
              </div>

              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 3 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {step > 3 ? '✓' : '3'}
                </div>
                <span className="text-sm">Listo para eliminar Employee.json</span>
              </div>
            </div>

            <Button 
              onClick={executeConsolidation} 
              disabled={executing || !sdkReady}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {!sdkReady ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Iniciando SDK...
                </>
              ) : executing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ejecutando...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Iniciar Consolidación
                </>
              )}
            </Button>
          </>
        )}

        {results && (
          <div className="space-y-4">
            {results.success ? (
              <Alert className="border-green-300 bg-green-50">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  <strong>✅ Consolidación Completada</strong>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>• Empleados migrados: <strong>{results.consolidation.employeesMigrated}</strong></p>
                    <p>• Empleados existentes: <strong>{results.consolidation.employeesSkipped}</strong></p>
                    <p>• Referencias actualizadas: <strong>{results.references.totalUpdated}</strong></p>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-red-300 bg-red-50">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  <strong>❌ Error en la consolidación</strong>
                  <p className="text-sm mt-2">{results.error}</p>
                </AlertDescription>
              </Alert>
            )}

            {results.success && results.references && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Referencias Actualizadas por Entidad</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(results.references.entities).map(([name, data]) => (
                      <div key={name} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                        <span>{name}</span>
                        <Badge className={data.updated > 0 ? "bg-green-600" : "bg-slate-600"}>
                          {data.updated}/{data.total}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button onClick={downloadReport} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Descargar Reporte
              </Button>
              <Button onClick={() => setResults(null)} variant="outline" className="flex-1">
                Ejecutar de Nuevo
              </Button>
            </div>

            {results.success && (
              <Alert className="border-blue-300 bg-blue-50">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Siguiente paso:</strong> Ahora puedes eliminar la entidad Employee.json de forma segura.
                  Los datos están consolidados y todas las referencias apuntan a EmployeeMasterDatabase.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}