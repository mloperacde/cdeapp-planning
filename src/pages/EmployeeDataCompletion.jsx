import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Users, 
  Wand2,
  ArrowLeft,
  Info
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EmployeeDataCompletionPage() {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleComplete = async () => {
    if (!confirm('¿Completar automáticamente los campos vacíos de todos los empleados?\n\nSe asignarán: departamentos, puestos, equipos, vestuarios, taquillas, máquinas, horarios y se normalizarán fechas.')) {
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const { data } = await base44.functions.invoke('completeEmployeeData');
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error.message
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
            <Wand2 className="w-8 h-8 text-purple-600" />
            Completar Datos de Empleados
          </h1>
          <p className="text-slate-600 mt-1">
            Completa automáticamente campos vacíos en las fichas de empleados
          </p>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mb-6">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-purple-50 to-blue-50">
            <CardTitle className="flex items-center gap-3">
              <Info className="w-6 h-6 text-purple-600" />
              ¿Qué se completará automáticamente?
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Datos Organizativos
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Departamento (según categoría)</li>
                  <li>• Puesto (según categoría)</li>
                  <li>• Equipo (para turnos rotativos)</li>
                </ul>
              </div>

              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Taquillas y Vestuarios
                </h3>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Asignación de vestuario (según sexo)</li>
                  <li>• Número de taquilla disponible</li>
                  <li>• Distribución automática</li>
                </ul>
              </div>

              <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
                <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <Wand2 className="w-4 h-4" />
                  Máquinas y Horarios
                </h3>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Asignación de máquinas (Producción)</li>
                  <li>• Horarios estándar por jornada</li>
                  <li>• Normalización de datos</li>
                </ul>
              </div>

              <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Datos Personales
                </h3>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>• Normalización de fechas</li>
                  <li>• Nacionalidad (corrección de IDs)</li>
                  <li>• Datos desde Base Maestra</li>
                </ul>
              </div>
            </div>

            <Alert className="mt-6 border-slate-200 bg-slate-50">
              <Info className="w-4 h-4" />
              <AlertDescription className="text-sm text-slate-700">
                <p className="font-semibold mb-2">Proceso Inteligente:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Solo se completan campos que estén vacíos</li>
                  <li>Se respetan los datos existentes</li>
                  <li>Se utilizan datos de la Base Maestra cuando están disponibles</li>
                  <li>Las taquillas se asignan verificando disponibilidad</li>
                  <li>Los equipos se distribuyen equitativamente</li>
                  <li>Las fechas se normalizan al formato estándar</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Ejecutar Completado Automático</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Button
              onClick={handleComplete}
              disabled={processing}
              className="w-full bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Procesando empleados...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  Completar Datos de Empleados
                </>
              )}
            </Button>

            {result && (
              <Alert 
                className={`mt-6 ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
              >
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription className={result.success ? 'text-green-900' : 'text-red-900'}>
                      <p className="font-semibold mb-3">{result.message || result.error}</p>
                      
                      {result.success && (
                        <div className="flex gap-3 mb-4">
                          <Badge className="bg-blue-600">
                            Total: {result.total_employees}
                          </Badge>
                          <Badge className="bg-green-600">
                            Actualizados: {result.updated}
                          </Badge>
                          {result.errors > 0 && (
                            <Badge className="bg-red-600">
                              Errores: {result.errors}
                            </Badge>
                          )}
                        </div>
                      )}

                      {result.error_details && result.error_details.length > 0 && (
                        <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded max-h-60 overflow-y-auto">
                          <p className="text-xs font-semibold text-red-900 mb-2">
                            Detalles de errores:
                          </p>
                          <div className="text-xs text-red-800 space-y-1">
                            {result.error_details.map((err, i) => (
                              <div key={i} className="border-b border-red-200 pb-1">
                                <div className="font-semibold">{err.employee}</div>
                                <div className="text-red-700 ml-2">→ {err.error}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.success && (
                        <div className="mt-4">
                          <Link to={createPageUrl("Employees")}>
                            <Button variant="outline" size="sm">
                              Ver Empleados Actualizados
                            </Button>
                          </Link>
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