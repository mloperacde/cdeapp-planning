import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, FileWarning, Lightbulb } from "lucide-react";

export default function DuplicatesTab({ duplicates, entities }) {
  const getSeverityColor = (severity) => {
    return {
      high: "bg-red-100 text-red-800 border-red-200",
      medium: "bg-orange-100 text-orange-800 border-orange-200",
      low: "bg-yellow-100 text-yellow-800 border-yellow-200",
    }[severity];
  };

  const getEntityInfo = (entityName) => {
    return entities.find((e) => e.name === entityName);
  };

  return (
    <div className="space-y-6">
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <AlertDescription className="text-red-900">
          <strong>Atención:</strong> Se han identificado {duplicates.length} grupos de
          entidades potencialmente duplicadas. Revisa cada grupo antes de tomar acción.
        </AlertDescription>
      </Alert>

      {duplicates.map((group, idx) => (
        <Card key={idx} className={`border-2 ${getSeverityColor(group.severity)}`}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileWarning className="w-5 h-5" />
                  {group.group}
                </CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  {group.entities.length} entidades relacionadas
                </p>
              </div>
              <Badge
                className={
                  group.severity === "high"
                    ? "bg-red-600"
                    : group.severity === "medium"
                    ? "bg-orange-600"
                    : "bg-yellow-600"
                }
              >
                {group.severity === "high"
                  ? "Prioridad Alta"
                  : group.severity === "medium"
                  ? "Prioridad Media"
                  : "Prioridad Baja"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.entities.map((entityName) => {
                const info = getEntityInfo(entityName);
                return (
                  <div
                    key={entityName}
                    className="p-4 bg-white dark:bg-slate-800 rounded-lg border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{entityName}</span>
                      {info && (
                        <Badge variant="outline">{info.recordCount} registros</Badge>
                      )}
                    </div>
                    {info && (
                      <>
                        <p className="text-sm text-slate-600">
                          Categoría: {info.category}
                        </p>
                        {info.lastUpdate && (
                          <p className="text-xs text-slate-500 mt-1">
                            Última actualización:{" "}
                            {new Date(info.lastUpdate).toLocaleDateString("es-ES")}
                          </p>
                        )}
                      </>
                    )}
                    {!info?.hasRecords && (
                      <Badge className="mt-2 bg-orange-100 text-orange-800">
                        Sin registros
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 mb-1">Recomendación</p>
                  <p className="text-sm text-blue-800">{group.recommendation}</p>
                </div>
              </div>
            </div>

            {group.group === "Planificación de Máquinas" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-semibold text-green-900 mb-2">
                  Plan de Consolidación Sugerido:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-green-800">
                  <li>
                    <strong>DailyMachinePlanning</strong> → Entidad PRINCIPAL para
                    planificación diaria
                  </li>
                  <li>
                    <strong>MachineAssignment</strong> → Mantener para ejecución real
                    (asignación de empleados)
                  </li>
                  <li>
                    Eliminar: MachinePlanning, DailyMachineStaffing (redundantes)
                  </li>
                </ol>
              </div>
            )}

            {group.group === "Roles y Usuarios" && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="font-semibold text-amber-900 mb-2">Acción Requerida:</p>
                <p className="text-sm text-amber-800">
                  Migrar toda la gestión de roles al sistema nativo de Base44. Las
                  entidades Role y UserRole son redundantes con el sistema de seguridad
                  nativo.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}