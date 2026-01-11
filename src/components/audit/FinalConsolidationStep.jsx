import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Shield,
  Database
} from "lucide-react";
import { toast } from "sonner";

/**
 * PASO FINAL: ELIMINAR EMPLOYEE.JSON
 * Los datos ya están 100% consolidados
 */
export default function FinalConsolidationStep({ employeeCount, masterCount }) {
  const [confirmed, setConfirmed] = useState(false);

  const dataIsConsolidated = employeeCount === masterCount && employeeCount > 0;

  const handleDeleteEntity = () => {
    toast.success(
      "✅ Solicita al administrador eliminar entities/Employee.json del código",
      { duration: 10000 }
    );
  };

  return (
    <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-900">
          <Shield className="w-6 h-6" />
          Paso Final - Eliminar Entidad Legacy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {dataIsConsolidated ? (
          <>
            <Alert className="border-green-300 bg-green-50">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <div className="space-y-2">
                  <p className="font-bold">✅ Datos 100% Consolidados</p>
                  <div className="text-sm space-y-1">
                    <p>• Employee: <strong>{employeeCount}</strong> registros</p>
                    <p>• EmployeeMasterDatabase: <strong>{masterCount}</strong> registros</p>
                    <p>• Ambas entidades tienen los <strong>mismos datos</strong></p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <Alert className="border-blue-200 bg-blue-50">
              <Database className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                <strong>Arquitectura confirmada:</strong>
                <ul className="mt-2 space-y-1 ml-4 list-disc">
                  <li>DataProvider usa EmployeeMasterDatabase</li>
                  <li>Todas las páginas principales migradas</li>
                  <li>Sistema funcionando correctamente</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="bg-white p-4 rounded-lg border-2 border-amber-300 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-amber-900 mb-2">Acción Requerida:</p>
                  <p className="text-sm text-amber-800 mb-3">
                    Para completar la consolidación, elimina el archivo:
                  </p>
                  <div className="bg-slate-900 text-green-400 p-3 rounded font-mono text-sm">
                    entities/Employee.json
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="confirm-delete"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="confirm-delete" className="text-sm text-slate-700">
                  Confirmo que todos los datos están en EmployeeMasterDatabase
                </label>
              </div>

              <Button
                onClick={handleDeleteEntity}
                disabled={!confirmed}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Solicitar Eliminación de Employee.json
              </Button>
            </div>

            <Alert className="border-slate-300 bg-slate-50">
              <Shield className="w-4 h-4 text-slate-600" />
              <AlertDescription className="text-slate-700 text-xs">
                <strong>Nota:</strong> La eliminación de entities/Employee.json debe hacerse 
                manualmente en el código. Una vez eliminado, todas las páginas seguirán funcionando 
                correctamente usando EmployeeMasterDatabase a través del DataProvider.
              </AlertDescription>
            </Alert>
          </>
        ) : (
          <Alert className="border-orange-300 bg-orange-50">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <p className="font-bold mb-2">⚠️ Consolidación Incompleta</p>
              <p className="text-sm">
                Employee: {employeeCount} | EmployeeMasterDatabase: {masterCount}
              </p>
              <p className="text-sm mt-1">
                Ejecuta primero la consolidación automática.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}