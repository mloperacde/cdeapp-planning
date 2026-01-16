import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  Database,
  ArrowLeft,
  Info
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SystemResetPage() {
  const [confirmText, setConfirmText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleReset = async () => {
    if (confirmText !== 'BORRAR TODO') {
      alert('Por favor, escribe exactamente: BORRAR TODO');
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const { data } = await base44.functions.invoke('resetEmployeeSystem', {
        confirm_delete: 'DELETE_ALL_EMPLOYEES'
      });
      setResult(data);
      setConfirmText('');
    } catch {
      setResult({
        success: false,
        error: 'Error al reiniciar'
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Configuración
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Trash2 className="w-8 h-8 text-red-600" />
            Reiniciar Sistema de Empleados
          </h1>
          <p className="text-slate-600 mt-1">
            Elimina todos los datos y comienza desde cero con el archivo maestro
          </p>
        </div>

        <Alert className="mb-6 border-red-300 bg-red-50">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <AlertDescription className="text-red-900">
            <p className="font-bold text-lg mb-2">⚠️ ADVERTENCIA CRÍTICA</p>
            <p className="mb-2">
              Esta acción es <strong>IRREVERSIBLE</strong> y eliminará permanentemente:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm ml-4">
              <li>Todas las fichas de empleados (Employee)</li>
              <li>Todas las asignaciones de taquillas</li>
              <li>Todos los registros de onboarding</li>
              <li>Todas las ausencias registradas</li>
              <li>Todas las habilidades asignadas</li>
              <li>Todos los balances de vacaciones</li>
            </ul>
            <p className="mt-3 font-semibold">
              Los datos del Archivo Maestro (EmployeeMasterDatabase) NO se eliminarán.
            </p>
          </AlertDescription>
        </Alert>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mb-6">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-3">
              <Info className="w-6 h-6 text-blue-600" />
              Proceso de Reconstrucción
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Borrado Completo</h3>
                  <p className="text-sm text-slate-600">
                    Se eliminan todas las fichas operativas de empleados y datos relacionados
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Importar Archivo Maestro</h3>
                  <p className="text-sm text-slate-600">
                    Ve a Configuración → Base de Datos de Empleados y sube el CSV maestro
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Sincronización</h3>
                  <p className="text-sm text-slate-600">
                    El sistema sincronizará desde el maestro para crear las fichas operativas
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Completar Datos</h3>
                  <p className="text-sm text-slate-600">
                    Usa "Completar Datos de Empleados" para asignar taquillas, equipos, etc.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-2 border-red-300 bg-red-50/50">
          <CardHeader className="border-b border-red-200">
            <CardTitle className="text-red-900">Confirmar Eliminación</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-base font-semibold">
                  Escribe exactamente: <span className="text-red-600 font-mono">BORRAR TODO</span>
                </Label>
                <Input
                  id="confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="BORRAR TODO"
                  className="border-red-300 focus:border-red-500"
                  disabled={processing}
                />
              </div>

              <Button
                onClick={handleReset}
                disabled={confirmText !== 'BORRAR TODO' || processing}
                className="w-full bg-red-600 hover:bg-red-700"
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Eliminando datos...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5 mr-2" />
                    Eliminar Todo y Reiniciar
                  </>
                )}
              </Button>
            </div>

            {result && (
              <Alert 
                className={`mt-6 ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
              >
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription className={result.success ? 'text-green-900' : 'text-red-900'}>
                      <p className="font-semibold mb-3">{result.message || result.error}</p>
                      
                      {result.summary && (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <Badge className="bg-red-600">
                              Empleados: {result.summary.deleted_employees}
                            </Badge>
                            <Badge className="bg-orange-600">
                              Taquillas: {result.summary.deleted_locker_assignments}
                            </Badge>
                            <Badge className="bg-amber-600">
                              Onboarding: {result.summary.deleted_onboarding}
                            </Badge>
                            <Badge className="bg-purple-600">
                              Ausencias: {result.summary.deleted_absences}
                            </Badge>
                            <Badge className="bg-blue-600">
                              Habilidades: {result.summary.deleted_skills}
                            </Badge>
                            <Badge className="bg-green-600">
                              Vacaciones: {result.summary.deleted_vacation_balances}
                            </Badge>
                          </div>

                          <div className="p-4 bg-white border border-green-300 rounded-lg">
                            <p className="font-semibold text-green-900 mb-2">
                              ✅ Total eliminado: {result.summary.total_deleted} registros
                            </p>
                            {result.summary.errors > 0 && (
                              <p className="text-sm text-red-700">
                                ⚠️ Errores: {result.summary.errors}
                              </p>
                            )}
                          </div>

                          {result.next_steps && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="font-semibold text-blue-900 mb-2">📋 Siguientes pasos:</p>
                              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                                {result.next_steps.map((step, i) => (
                                  <li key={i}>{step}</li>
                                ))}
                              </ol>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Link to={createPageUrl("MasterEmployeeDatabase")}>
                              <Button className="bg-green-600 hover:bg-green-700">
                                <Database className="w-4 h-4 mr-2" />
                                Ir a Base de Datos Maestra
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}

                      {result.error_details && result.error_details.length > 0 && (
                        <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded max-h-60 overflow-y-auto">
                          <p className="text-xs font-semibold text-red-900 mb-2">
                            Detalles de errores ({result.error_details.length}):
                          </p>
                          <div className="text-xs text-red-800 space-y-1">
                            {result.error_details.map((err, i) => (
                              <div key={i} className="border-b border-red-200 pb-1">
                                <div className="font-semibold">{err.entity}: {err.id}</div>
                                <div className="text-red-700 ml-2">→ {err.error}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
