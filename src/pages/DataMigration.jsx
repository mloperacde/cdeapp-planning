import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, Play, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import ProtectedPage from "../components/roles/ProtectedPage";

export default function DataMigrationPage() {
  return (
    <ProtectedPage module="configuration" action="manage_users">
      <DataMigrationContent />
    </ProtectedPage>
  );
}

function DataMigrationContent() {
  const [migrating, setMigrating] = useState(false);
  const [report, setReport] = useState(null);

  const runMigration = async () => {
    setMigrating(true);
    setReport(null);
    
    try {
      const response = await base44.functions.invoke('migrateEmployeeToMaster');
      setReport(response.data.report);
      
      if (response.data.success) {
        toast.success('Migración completada exitosamente');
      } else {
        toast.error('Migración completada con errores');
      }
    } catch (error) {
      toast.error('Error al ejecutar la migración: ' + error.message);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Configuración
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600" />
            Migración de Datos - FASE 2
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Consolidación de entidades legacy → base de datos maestra
          </p>
        </div>

        <Card className="shadow-xl mb-6 border-2 border-blue-200">
          <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Migración: Employee → EmployeeMasterDatabase
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-800 rounded-lg p-4">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5" />
                ⚠️ Antes de ejecutar
              </h3>
              <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 ml-6 list-disc">
                <li>Esta operación es segura y reversible</li>
                <li>Migra datos de Employee a EmployeeMasterDatabase</li>
                <li>Detecta y resuelve duplicados automáticamente</li>
                <li>La entidad Employee quedará marcada como deprecated</li>
                <li><strong>Solo administradores</strong> pueden ejecutar esta migración</li>
              </ul>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={runMigration}
                disabled={migrating}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-6 text-lg"
              >
                {migrating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Migrando...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Ejecutar Migración
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {report && (
          <Card className={`shadow-xl border-2 ${report.exito ? 'border-green-300' : 'border-red-300'}`}>
            <CardHeader className={report.exito ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}>
              <CardTitle className="flex items-center gap-2">
                {report.exito ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Migración Exitosa
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Migración con Errores
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <p className="text-2xl font-bold">{report.empleados_legacy}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Legacy (Employee)</p>
                </div>
                <div className="text-center p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-2xl font-bold">{report.empleados_master}</p>
                  <p className="text-xs text-blue-600">Master (Actuales)</p>
                </div>
                <div className="text-center p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <p className="text-2xl font-bold">{report.migrados}</p>
                  <p className="text-xs text-green-600">Migrados</p>
                </div>
                <div className="text-center p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-2xl font-bold">{report.actualizados}</p>
                  <p className="text-xs text-purple-600">Actualizados</p>
                </div>
              </div>

              {report.warnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">⚠️ Advertencias:</h4>
                  <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1 ml-4 list-disc">
                    {report.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              {report.errores.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">❌ Errores ({report.errores.length}):</h4>
                  <ul className="text-sm text-red-800 dark:text-red-200 space-y-1 ml-4 list-disc max-h-40 overflow-y-auto">
                    {report.errores.map((e, i) => (
                      <li key={i}><strong>{e.empleado}:</strong> {e.error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-xs text-slate-500 dark:text-slate-400 pt-4 border-t">
                <p>Inicio: {new Date(report.inicio).toLocaleString('es-ES')}</p>
                <p>Fin: {new Date(report.fin).toLocaleString('es-ES')}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}