import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Download,
  Database,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";

/**
 * SOLUCIÓN SIMPLIFICADA Y ROBUSTA
 * Ejecuta consolidación directamente con verificación paso a paso
 */
export default function SimpleConsolidation() {
  const [state, setState] = useState({
    status: 'idle', // idle | running | success | error
    phase: '',
    progress: 0,
    result: null,
    error: null
  });

  const executeConsolidation = async () => {
    console.log("═══════════════════════════════════════");
    console.log("🚀 INICIO CONSOLIDACIÓN SIMPLIFICADA");
    console.log("═══════════════════════════════════════");
    
    setState({ status: 'running', phase: 'Verificando sistema', progress: 10, result: null, error: null });

    try {
      // VERIFICACIÓN PREVIA
      console.log("✓ Verificando SDK...");
      if (!base44?.functions?.invoke) {
        throw new Error("❌ SDK no disponible");
      }
      console.log("✓ SDK OK");

      setState(prev => ({ ...prev, phase: 'Cargando datos', progress: 20 }));

      // CARGAR DATOS PARA ANÁLISIS
      console.log("📊 Cargando Employee...");
      const legacyEmployees = await base44.entities.Employee.list('nombre', 1000);
      console.log(`✓ Employee: ${legacyEmployees.length} registros`);

      console.log("📊 Cargando EmployeeMasterDatabase...");
      const masterEmployees = await base44.entities.EmployeeMasterDatabase.list('nombre', 1000);
      console.log(`✓ EmployeeMasterDatabase: ${masterEmployees.length} registros`);

      if (legacyEmployees.length === 0) {
        throw new Error("No hay registros en Employee para migrar");
      }

      setState(prev => ({ ...prev, phase: 'Ejecutando consolidación', progress: 40 }));

      // EJECUTAR CONSOLIDACIÓN
      console.log("🔄 Llamando autoConsolidateEmployees...");
      toast.info("Ejecutando consolidación...");

      const response = await base44.functions.invoke('autoConsolidateEmployees', {});
      console.log("📦 Respuesta función:", response);

      const result = response?.data || response;
      console.log("📋 Datos procesados:", result);

      setState(prev => ({ ...prev, phase: 'Procesando resultados', progress: 80 }));

      if (!result.success) {
        throw new Error(result.error || "Error desconocido en la consolidación");
      }

      // ÉXITO
      console.log("═══════════════════════════════════════");
      console.log("✅ CONSOLIDACIÓN EXITOSA");
      console.log(`   Migrados: ${result.consolidation?.employeesMigrated || 0}`);
      console.log(`   Saltados: ${result.consolidation?.employeesSkipped || 0}`);
      console.log(`   Referencias: ${result.references?.totalUpdated || 0}`);
      console.log(`   Duración: ${result.duration}ms`);
      console.log("═══════════════════════════════════════");

      setState({
        status: 'success',
        phase: 'Completado',
        progress: 100,
        result: result,
        error: null
      });

      toast.success(`✅ Consolidación exitosa: ${result.consolidation?.employeesMigrated || 0} migrados`);

    } catch (error) {
      console.error("═══════════════════════════════════════");
      console.error("❌ ERROR EN CONSOLIDACIÓN");
      console.error("Mensaje:", error.message);
      console.error("Stack:", error.stack);
      console.error("═══════════════════════════════════════");

      setState({
        status: 'error',
        phase: 'Error',
        progress: 0,
        result: null,
        error: error.message
      });

      toast.error(`❌ Error: ${error.message}`);
    }
  };

  const downloadReport = () => {
    if (!state.result) return;

    const report = {
      timestamp: new Date().toISOString(),
      ...state.result
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consolidacion-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    if (a.parentNode) {
      a.parentNode.removeChild(a);
    }
    URL.revokeObjectURL(url);
    toast.success("Reporte descargado");
  };

  const reset = () => {
    setState({ status: 'idle', phase: '', progress: 0, result: null, error: null });
  };

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Database className="w-6 h-6" />
          Consolidación de Datos - Solución Simplificada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estado idle */}
        {state.status === 'idle' && (
          <>
            <Alert className="border-blue-200 bg-blue-50">
              <Database className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                <strong>Proceso automatizado:</strong> Consolida Employee → EmployeeMasterDatabase
                y actualiza todas las referencias en un solo paso.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-purple-600" />
                <span>Migra registros únicos por codigo_empleado</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-purple-600" />
                <span>Actualiza referencias en 9 entidades relacionadas</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-purple-600" />
                <span>Genera reporte detallado descargable</span>
              </div>
            </div>

            <Button 
              onClick={executeConsolidation}
              className="w-full bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              <Database className="w-5 h-5 mr-2" />
              Ejecutar Consolidación Ahora
            </Button>
          </>
        )}

        {/* Estado running */}
        {state.status === 'running' && (
          <div className="space-y-4">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-3" />
              <p className="font-medium text-slate-900">{state.phase}</p>
              <p className="text-sm text-slate-600 mt-1">No cierres esta ventana...</p>
            </div>
            <Progress value={state.progress} className="h-2" />
          </div>
        )}

        {/* Estado success */}
        {state.status === 'success' && state.result && (
          <div className="space-y-4">
            <Alert className="border-green-300 bg-green-50">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-2 text-green-900">
                  <p className="font-bold">✅ Consolidación Completada Exitosamente</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                    <div className="bg-white p-2 rounded">
                      <span className="text-slate-600">Empleados migrados:</span>
                      <p className="font-bold text-lg text-green-700">
                        {state.result.consolidation?.employeesMigrated || 0}
                      </p>
                    </div>
                    <div className="bg-white p-2 rounded">
                      <span className="text-slate-600">Ya existían:</span>
                      <p className="font-bold text-lg text-slate-700">
                        {state.result.consolidation?.employeesSkipped || 0}
                      </p>
                    </div>
                    <div className="bg-white p-2 rounded">
                      <span className="text-slate-600">Referencias actualizadas:</span>
                      <p className="font-bold text-lg text-blue-700">
                        {state.result.references?.totalUpdated || 0}
                      </p>
                    </div>
                    <div className="bg-white p-2 rounded">
                      <span className="text-slate-600">Duración:</span>
                      <p className="font-bold text-lg text-purple-700">
                        {state.result.duration ? `${(state.result.duration / 1000).toFixed(1)}s` : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {state.result.references?.entities && (
              <Card className="bg-slate-50">
                <CardHeader>
                  <CardTitle className="text-sm">Entidades Actualizadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(state.result.references.entities).map(([name, data]) => (
                      <div key={name} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{name}</span>
                        <Badge className={data.updated > 0 ? "bg-green-600" : "bg-slate-400"}>
                          {data.updated || 0}/{data.total || 0}
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
              <Button onClick={reset} variant="outline" className="flex-1">
                Nueva Consolidación
              </Button>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                <strong>Siguiente paso:</strong> Ahora puedes eliminar de forma segura la entidad 
                Employee.json ya que todos los datos están consolidados en EmployeeMasterDatabase.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Estado error */}
        {state.status === 'error' && (
          <div className="space-y-4">
            <Alert className="border-red-300 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription>
                <div className="space-y-2 text-red-900">
                  <p className="font-bold">❌ Error en la Consolidación</p>
                  <p className="text-sm bg-white p-2 rounded border border-red-200 font-mono">
                    {state.error}
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <Button onClick={reset} variant="outline" className="w-full">
              Reintentar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
