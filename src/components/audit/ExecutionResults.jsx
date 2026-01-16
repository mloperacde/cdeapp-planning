import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ExecutionResults({ results }) {
  if (!results) return null;

  const downloadResults = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `execution-results-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    if (a.parentNode) {
      a.parentNode.removeChild(a);
    }
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-2 border-green-200 bg-green-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-green-900">
            <CheckCircle2 className="w-5 h-5" />
            Resultados de Ejecución
          </CardTitle>
          <Button onClick={downloadResults} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Descargar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fase 2: Backup */}
        {results.backup && (
          <div className="p-4 bg-white rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-green-900">Fase 2: Backup Completado</h3>
              <Badge className="bg-green-600">Éxito</Badge>
            </div>
            <div className="space-y-1 text-sm">
              <p>
                <strong>Entidades respaldadas:</strong>{" "}
                {results.backup.summary?.entitiesWithData || 0}
              </p>
              <p>
                <strong>Total de registros:</strong>{" "}
                {results.backup.summary?.totalRecords || 0}
              </p>
              <p className="text-xs text-green-700 mt-2">
                ✓ Backup descargado automáticamente
              </p>
            </div>
          </div>
        )}

        {/* Fase 3: Seguridad */}
        {results.security && (
          <div className="p-4 bg-white rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-blue-900">
                Fase 3: Consolidación de Seguridad
              </h3>
              <Badge className="bg-blue-600">Completado</Badge>
            </div>
            <div className="space-y-2 text-sm">
              {results.security.results?.actions?.map((action, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{action.action}</p>
                    {action.details && (
                      <p className="text-xs text-slate-600">
                        {action.details.rolesFound} roles, {action.details.userRolesFound} user
                        roles encontrados
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {results.security.results?.summary?.nextSteps && (
                <Alert className="mt-3 border-amber-200 bg-amber-50">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-amber-900 text-xs">
                    <strong>Próximos pasos:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      {results.security.results.summary.nextSteps
                        .slice(0, 2)
                        .map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}

        {/* Fase 3: Renombrar Duplicadas */}
        {results.rename && (
          <div className="p-4 bg-white rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-purple-900">
                Fase 3: Entidades Duplicadas Renombradas
              </h3>
              <Badge className="bg-purple-600">
                {results.rename.results?.renamedEntities?.length || 0} marcadas
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              {results.rename.results?.renamedEntities?.map((entity, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <CheckCircle2 className="w-3 h-3 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{entity.original} → {entity.renamed}</p>
                    <p className="text-slate-600">{entity.reason} ({entity.recordCount} registros)</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fase 4: Consolidación */}
        {results.consolidate && (
          <div className="p-4 bg-white rounded-lg border border-cyan-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-cyan-900">
                Fase 4: Consolidación de Datos
              </h3>
              <Badge className="bg-cyan-600">
                {results.consolidate.results?.consolidations?.length || 0} analizadas
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              {results.consolidate.results?.consolidations?.map((cons, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <CheckCircle2 className="w-3 h-3 text-cyan-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{cons.consolidation || cons.entities?.join(', ')}</p>
                    <p className="text-slate-600">{cons.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fase 5: Seguridad */}
        {results.security && results.security.results?.recommendations && (
          <div className="p-4 bg-white rounded-lg border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-red-900">
                Fase 5: Configuración de Seguridad
              </h3>
              <Badge className="bg-red-600">
                {results.security.results.summary?.criticalEntities || 0} críticas
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              {results.security.results.recommendations
                .filter(r => r.priority === 'CRÍTICO')
                .map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{rec.entity}</p>
                      <p className="text-slate-600">{rec.notes}</p>
                    </div>
                  </div>
                ))}
              <Alert className="mt-3 border-amber-200 bg-amber-50">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-900 text-xs">
                  Configurar manualmente en Base44 Dashboard → Security → Permissions
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}

        {/* Entidades Obsoletas */}
        {results.obsolete && (
          <div className="p-4 bg-white rounded-lg border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-orange-900">
                Entidades Sin Uso Identificadas
              </h3>
              <Badge className="bg-orange-600">
                {results.obsolete.results?.obsoleteCount || 0} encontradas
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Total verificadas:</strong> {results.obsolete.results?.summary?.totalChecked || 0}</p>
              <p><strong>Activas:</strong> {results.obsolete.results?.summary?.activeCount || 0}</p>
              <p><strong>Sin uso:</strong> {results.obsolete.results?.summary?.obsoleteCount || 0}</p>
            </div>
          </div>
        )}

        {/* Fase 7: Limpieza Final */}
        {results.cleanup && (
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-900">
                Fase 7: Análisis de Limpieza Final
              </h3>
              <Badge className="bg-slate-600">
                {results.cleanup.results?.summary?.totalCandidatesForDeletion || 0} candidatas
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Entidades obsoletas (_OLD_):</strong>{" "}
                {results.cleanup.results?.summary?.obsoleteEntities || 0}
              </p>
              <p>
                <strong>Entidades vacías:</strong>{" "}
                {results.cleanup.results?.summary?.emptyEntities || 0}
              </p>
              <p>
                <strong>Advertencias:</strong>{" "}
                {results.cleanup.results?.summary?.warnings || 0}
              </p>
              <Alert className="mt-3 border-blue-200 bg-blue-50">
                <FileText className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-xs">
                  <strong>Importante:</strong> Eliminar manualmente después del periodo de prueba (2 semanas)
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}

        {/* Resumen General */}
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-900 text-sm">
            <strong>✅ Plan Ejecutado Completamente:</strong> Todas las fases automáticas han sido ejecutadas. 
            Revisa los resultados detallados y procede con las acciones manuales recomendadas.
          </AlertDescription>
        </Alert>
        
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-semibold text-amber-900 mb-2 text-sm">Próximos Pasos Manuales:</h4>
          <ol className="list-decimal list-inside space-y-1 text-xs text-amber-800">
            <li>Configurar permisos de seguridad en Base44 Dashboard</li>
            <li>Ejecutar pruebas completas del sistema durante 2 semanas</li>
            <li>Monitorear logs y recopilar feedback de usuarios</li>
            <li>Eliminar entidades _OLD_* después del periodo de prueba</li>
            <li>Actualizar documentación técnica del sistema</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
