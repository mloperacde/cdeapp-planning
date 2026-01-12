import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function AuditDataDashboard() {
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('auditEntities');
      if (data.status === 'error') {
        toast.error('Error en auditoría: ' + data.error);
        return;
      }
      setAuditData(data);
      toast.success('Auditoría completada');
    } catch (err) {
      toast.error('Error ejecutando auditoría: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-600 text-white';
      case 'HIGH': return 'bg-orange-600 text-white';
      case 'MEDIUM': return 'bg-yellow-600 text-white';
      case 'LOW': return 'bg-blue-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              Auditoría de Datos - Tabla Verdad
            </h1>
            <p className="text-slate-600 mt-1">
              Diagnóstico completo de entidades y relaciones
            </p>
          </div>
          <Button 
            onClick={runAudit} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Auditando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Ejecutar Auditoría
              </>
            )}
          </Button>
        </div>

        {!auditData && !loading && (
          <Alert className="bg-blue-50 border-blue-300">
            <Database className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              Haz clic en "Ejecutar Auditoría" para obtener el estado real de las entidades en la base de datos.
            </AlertDescription>
          </Alert>
        )}

        {auditData && (
          <div className="space-y-6">
            {/* Recomendaciones */}
            {auditData.recommendations && auditData.recommendations.length > 0 && (
              <Card className="border-2 border-amber-300 bg-amber-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-900">
                    <AlertTriangle className="w-5 h-5" />
                    Recomendaciones Críticas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {auditData.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex gap-3 p-3 bg-white rounded-lg border border-amber-200">
                      <Badge className={getPriorityColor(rec.priority)}>
                        {rec.priority}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{rec.message}</p>
                        <p className="text-sm text-slate-600 mt-1">Acción: {rec.action}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Análisis Legacy */}
            {auditData.legacyAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle>Análisis de Relaciones Legacy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {auditData.legacyAnalysis.machine_assignments_found ? (
                    <Alert className="bg-green-50 border-green-300">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-900">
                        ✅ Se encontraron {auditData.legacyAnalysis.machine_assignments_count} asignaciones en MachineAssignment
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="bg-red-50 border-red-300">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-900">
                        ❌ No se encontraron asignaciones empleado-máquina en MachineAssignment
                      </AlertDescription>
                    </Alert>
                  )}

                  {auditData.legacyAnalysis.employee_machine_relations && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="font-semibold text-slate-900 mb-2">Campos en Employee legacy:</p>
                      <pre className="text-xs bg-slate-900 text-white p-3 rounded overflow-x-auto">
                        {JSON.stringify(auditData.legacyAnalysis.employee_machine_relations, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tabla de Entidades */}
            <Card>
              <CardHeader>
                <CardTitle>Tabla Verdad de Entidades</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Entidad</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">¿Existe?</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Registros (muestra)</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">¿Tiene Datos?</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">¿Fuente de Verdad?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {Object.entries(auditData.audit).map(([entityName, info]) => {
                        const isMaster = entityName.includes('Master') || entityName.includes('Database');
                        const hasData = info.hasData;
                        const isLegacy = (entityName === 'Employee' || entityName === 'Machine') && !isMaster;
                        
                        return (
                          <tr key={entityName} className={`hover:bg-slate-50 ${isMaster ? 'bg-blue-50' : ''}`}>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-900">{entityName}</span>
                              {isLegacy && <Badge variant="outline" className="ml-2 text-xs">Legacy</Badge>}
                              {isMaster && <Badge className="ml-2 bg-blue-600 text-xs">Master</Badge>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {info.exists ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant={hasData ? "default" : "outline"}>
                                {info.count} reg
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {hasData ? (
                                <Badge className="bg-green-600">Sí</Badge>
                              ) : (
                                <Badge variant="outline">No</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isMaster && hasData ? (
                                <Badge className="bg-blue-600">Probable</Badge>
                              ) : isLegacy && hasData ? (
                                <Badge className="bg-amber-600">Migrar</Badge>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Datos Raw */}
            <Card>
              <CardHeader>
                <CardTitle>Datos Completos (JSON)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-slate-900 text-white p-4 rounded overflow-x-auto max-h-96">
                  {JSON.stringify(auditData, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}