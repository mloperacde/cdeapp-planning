import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Play,
  Search,
  FileText,
  Shield
} from "lucide-react";
import { toast } from "sonner";

export default function DataRecoveryDashboard() {
  const [diagnostic, setDiagnostic] = useState(null);
  const [integrityReport, setIntegrityReport] = useState(null);
  const [recoveryResult, setRecoveryResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [integrityLoading, setIntegrityLoading] = useState(false);

  const runDiagnostic = async () => {
    console.log('Función desactivada temporalmente');
    toast.info("Función temporalmente desactivada para mantenimiento");
    // setDiagLoading(true);
    // try {
    //   const response = await base44.functions.invoke('diagnosticMachineMigration', {});
    //   setDiagnostic(response.data);
    //   toast.success("Diagnóstico completado");
    // } catch (error) {
    //   console.error(error);
    //   toast.error("Error al ejecutar diagnóstico: " + (error.message || "Error desconocido"));
    // } finally {
    //   setDiagLoading(false);
    // }
  };

  const runIntegrityCheck = async () => {
    console.log('Función desactivada temporalmente');
    toast.info("Función temporalmente desactivada para mantenimiento");
    // setIntegrityLoading(true);
    // try {
    //   const response = await base44.functions.invoke('verifyDataIntegrity', {});
    //   setIntegrityReport(response.data);
    //   toast.success("Verificación de integridad completada");
    // } catch (error) {
    //   console.error(error);
    //   toast.error("Error al verificar integridad: " + (error.message || "Error desconocido"));
    // } finally {
    //   setIntegrityLoading(false);
    // }
  };

  const runRecovery = async () => {
    console.log('Función desactivada temporalmente');
    toast.info("Función temporalmente desactivada para mantenimiento");
    // if (!diagnostic) {
    //   toast.error("Ejecuta el diagnóstico primero");
    //   return;
    // }
    // if (diagnostic.diagnostico.unmappableAssignments > 0) {
    //   if (!window.confirm(
    //     `Hay ${diagnostic.diagnostico.unmappableAssignments} asignaciones que no se pueden mapear. ¿Continuar de todas formas?`
    //   )) {
    //     return;
    //   }
    // }
    // setLoading(true);
    // try {
    //   const response = await base44.functions.invoke('recoverEmployeeMachineAssignments', {});
    //   setRecoveryResult(response.data);
    //   if (response.data.status === 'success') {
    //     toast.success(`Migración completada: ${response.data.summary.skillsCreated} habilidades creadas`);
    //   } else {
    //     toast.error("La migración falló: " + response.data.error);
    //   }
    // } catch (error) {
    //   console.error(error);
    //   toast.error("Error al ejecutar recuperación: " + (error.message || "Error desconocido"));
    // } finally {
    //   setLoading(false);
    // }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600" />
            Panel de Recuperación de Datos
          </h1>
          <p className="text-slate-600 mt-1">
            Diagnóstico completo y migración de datos
          </p>
        </div>

        <Tabs defaultValue="migration" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="migration">
              <Database className="w-4 h-4 mr-2" />
              Migración Empleado-Máquina
            </TabsTrigger>
            <TabsTrigger value="integrity">
              <Shield className="w-4 h-4 mr-2" />
              Verificación de Integridad
            </TabsTrigger>
          </TabsList>

          <TabsContent value="migration" className="space-y-6">
          {/* Paso 1: Diagnóstico */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Paso 1: Ejecutar Diagnóstico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Analiza el estado actual de los datos y determina cuántas asignaciones pueden ser migradas.
              </p>
              <Button 
                onClick={runDiagnostic}
                disabled={diagLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {diagLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Ejecutando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Ejecutar Diagnóstico
                  </>
                )}
              </Button>

              {diagnostic && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="text-xs text-blue-700 font-medium">Máquinas Master</div>
                      <div className="text-2xl font-bold text-blue-900">
                        {diagnostic.diagnostico.totalMachinesInMaster}
                      </div>
                      <div className="text-xs text-blue-600">
                        {diagnostic.diagnostico.machinesWithLegacyId} con ID legacy
                      </div>
                    </div>

                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="text-xs text-green-700 font-medium">Empleados</div>
                      <div className="text-2xl font-bold text-green-900">
                        {diagnostic.diagnostico.employeesWithMachines}
                      </div>
                      <div className="text-xs text-green-600">
                        Con asignaciones de máquinas
                      </div>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <div className="text-xs text-purple-700 font-medium">Asignaciones</div>
                      <div className="text-2xl font-bold text-purple-900">
                        {diagnostic.diagnostico.totalAssignments}
                      </div>
                      <div className="text-xs text-purple-600">Total detectadas</div>
                    </div>

                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                      <div className="text-xs text-emerald-700 font-medium">Mapeables</div>
                      <div className="text-2xl font-bold text-emerald-900">
                        {diagnostic.diagnostico.mappableAssignments}
                      </div>
                      <div className="text-xs text-emerald-600">Se pueden migrar</div>
                    </div>

                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                      <div className="text-xs text-amber-700 font-medium">No mapeables</div>
                      <div className="text-2xl font-bold text-amber-900">
                        {diagnostic.diagnostico.unmappableAssignments}
                      </div>
                      <div className="text-xs text-amber-600">Sin mapeo</div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="text-xs text-slate-700 font-medium">Ya Migrados</div>
                      <div className="text-2xl font-bold text-slate-900">
                        {diagnostic.diagnostico.existingMigratedSkills}
                      </div>
                      <div className="text-xs text-slate-600">En EmployeeMachineSkill</div>
                    </div>
                  </div>

                  {diagnostic.diagnostico.unmappableAssignments > 0 && (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        Hay {diagnostic.diagnostico.unmappableAssignments} asignaciones que no pueden ser mapeadas.
                        Estos IDs legacy no existen en MachineMasterDatabase.
                      </AlertDescription>
                    </Alert>
                  )}

                  {diagnostic.employeeSample && diagnostic.employeeSample.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-lg border">
                      <h4 className="text-sm font-semibold mb-2">Muestra de Empleados con Asignaciones:</h4>
                      <div className="space-y-2 text-xs">
                        {diagnostic.employeeSample.map((emp, idx) => (
                          <div key={idx} className="bg-white p-2 rounded border">
                            <div className="font-medium">{emp.nombre}</div>
                            <div className="text-slate-600">{emp.puesto} - {emp.departamento}</div>
                            <div className="mt-1">
                              Máquinas: {emp.machineFields.map(m => `Slot ${m.slot} ${m.mapped ? '✓' : '✗'}`).join(', ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Paso 2: Ejecución */}
          {diagnostic && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Paso 2: Ejecutar Migración
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-slate-600">
                  <p><strong>¿Qué hace la migración?</strong></p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Lee todos los empleados de EmployeeMasterDatabase</li>
                    <li>Para cada campo maquina_1 a maquina_10, busca el nuevo ID en MachineMasterDatabase usando machine_id_legacy</li>
                    <li>Crea registros en EmployeeMachineSkill con nivel según preferencia</li>
                    <li>Asigna orden_preferencia basado en el slot original (1-10)</li>
                  </ul>
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-blue-800">
                    Se crearán aproximadamente <strong>{diagnostic.diagnostico.mappableAssignments}</strong> registros en 
                    <Badge variant="outline" className="ml-2">EmployeeMachineSkill</Badge>
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={runRecovery}
                  disabled={loading || diagnostic.diagnostico.mappableAssignments === 0}
                  className="bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Migrando...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Ejecutar Migración Ahora
                    </>
                  )}
                </Button>

                {recoveryResult && (
                  <div className="mt-4 space-y-3">
                    {recoveryResult.status === 'success' ? (
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          <strong>Migración completada exitosamente</strong>
                          <div className="mt-2 space-y-1 text-sm">
                            <div>✓ Empleados procesados: {recoveryResult.summary.employeesWithMachines}</div>
                            <div>✓ Habilidades creadas: {recoveryResult.summary.skillsCreated}</div>
                            <div>✓ Errores: {recoveryResult.summary.errors}</div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert className="bg-red-50 border-red-200">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          <strong>Error en la migración:</strong> {recoveryResult.error}
                        </AlertDescription>
                      </Alert>
                    )}

                    {recoveryResult.errors && recoveryResult.errors.length > 0 && (
                      <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <h4 className="text-sm font-semibold text-amber-900 mb-2">
                          Errores encontrados ({recoveryResult.errors.length}):
                        </h4>
                        <div className="space-y-1 text-xs text-amber-800">
                          {recoveryResult.errors.slice(0, 5).map((err, idx) => (
                            <div key={idx} className="bg-white p-2 rounded border border-amber-100">
                              {JSON.stringify(err)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Información Técnica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Información Técnica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-slate-600">
                <p><strong>Proceso de mapeo:</strong></p>
                <pre className="bg-slate-50 p-3 rounded border text-xs overflow-x-auto">
{`EmployeeMasterDatabase.maquina_X (legacy ID)
    ↓
MachineMasterDatabase.machine_id_legacy (buscar coincidencia)
    ↓
MachineMasterDatabase.id (nuevo ID)
    ↓
EmployeeMachineSkill.create(employee_id, machine_id, nivel, orden)`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Verificación de Integridad de Datos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Verifica que todas las relaciones entre entidades sean válidas y no haya referencias huérfanas.
              </p>
              <Button 
                onClick={runIntegrityCheck}
                disabled={integrityLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {integrityLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Verificar Integridad
                  </>
                )}
              </Button>

              {integrityReport && (
                <div className="mt-4 space-y-4">
                  {integrityReport.summary.allGood ? (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        ✓ Todos los datos tienen integridad correcta
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        <strong>Problemas detectados ({integrityReport.summary.totalIssues}):</strong>
                        <ul className="mt-2 space-y-1 text-xs">
                          {integrityReport.summary.criticalIssues.map((issue, idx) => (
                            <li key={idx}>• {issue}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">CommitteeMember</h4>
                      <div className="space-y-1 text-xs">
                        <div>Total: {integrityReport.report.committeeMembers.total}</div>
                        <div className="text-green-700">✓ Válidos: {integrityReport.report.committeeMembers.valid}</div>
                        {integrityReport.report.committeeMembers.orphaned > 0 && (
                          <div className="text-red-700">✗ Huérfanos: {integrityReport.report.committeeMembers.orphaned}</div>
                        )}
                      </div>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h4 className="text-sm font-semibold text-purple-900 mb-2">IncentivePlan</h4>
                      <div className="space-y-1 text-xs">
                        <div>Total: {integrityReport.report.incentivePlans.total}</div>
                        <div className="text-green-700">✓ Activos: {integrityReport.report.incentivePlans.active}</div>
                      </div>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                      <h4 className="text-sm font-semibold text-amber-900 mb-2">Asignaciones Máquinas</h4>
                      <div className="space-y-1 text-xs">
                        <div>Total: {integrityReport.report.employeeMachineLinks.total}</div>
                        <div className="text-green-700">✓ Válidos: {integrityReport.report.employeeMachineLinks.valid}</div>
                        {integrityReport.report.employeeMachineLinks.orphaned > 0 && (
                          <div className="text-red-700">✗ Huérfanos: {integrityReport.report.employeeMachineLinks.orphaned}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {integrityReport.report.committeeMembers.samples?.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <h4 className="text-sm font-semibold text-red-900 mb-2">
                        Ejemplos de CommitteeMember con referencias rotas:
                      </h4>
                      <div className="space-y-2 text-xs">
                        {integrityReport.report.committeeMembers.samples.map((sample, idx) => (
                          <div key={idx} className="bg-white p-2 rounded border">
                            <div>Empleado: {sample.employeeName}</div>
                            <div className="text-slate-600">Employee ID: {sample.employeeId}</div>
                            <div className="text-slate-600">Comités: {sample.tipos?.join(', ')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}