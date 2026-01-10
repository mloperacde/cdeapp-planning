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
    document.body.removeChild(a);
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

        {/* Fase 4: Entidades Obsoletas */}
        {results.obsolete && (
          <div className="p-4 bg-white rounded-lg border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-orange-900">
                Fase 4: Entidades Obsoletas Identificadas
              </h3>
              <Badge className="bg-orange-600">
                {results.obsolete.results?.obsoleteCount || 0} encontradas
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Total verificadas:</strong>{" "}
                {results.obsolete.results?.summary?.totalChecked || 0}
              </p>
              <p>
                <strong>Activas:</strong>{" "}
                {results.obsolete.results?.summary?.activeCount || 0}
              </p>
              <p>
                <strong>Sin uso:</strong>{" "}
                {results.obsolete.results?.summary?.obsoleteCount || 0}
              </p>
              {results.obsolete.results?.obsolete && (
                <div className="mt-3 max-h-32 overflow-y-auto">
                  <p className="font-medium text-xs text-orange-800 mb-2">
                    Candidatas para eliminación:
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {results.obsolete.results.obsolete.slice(0, 10).map((entity) => (
                      <Badge key={entity.name} variant="outline" className="text-xs">
                        {entity.name}
                      </Badge>
                    ))}
                  </div>
                  {results.obsolete.results.obsolete.length > 10 && (
                    <p className="text-xs text-slate-500 mt-2">
                      +{results.obsolete.results.obsolete.length - 10} más...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resumen General */}
        <Alert className="border-blue-200 bg-blue-50">
          <FileText className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            <strong>Estado del Plan:</strong> Fases 2-4 completadas. Revisa los resultados y
            procede manualmente con las siguientes fases según el plan de consolidación.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}