import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AutoCleanup() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState(null);
  const [executed, setExecuted] = useState(false);

  useEffect(() => {
    // Ejecutar automáticamente al montar
    if (!executed) {
      executeCleanup();
      setExecuted(true);
    }
  }, []);

  const executeCleanup = async () => {
    setIsExecuting(true);
    try {
      const response = await base44.functions.invoke('executeAutoCleanup');
      setResults(response.data?.results || response.data);
      
      if (response.data?.success !== false) {
        toast.success('✅ Limpieza automática completada');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(`❌ Error: ${error.message}`);
      setResults({ 
        errors: [{ error: error.message }] 
      });
    } finally {
      setIsExecuting(false);
    }
  };

  if (!results) {
    return (
      <Card className="border-2 border-blue-300">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Loader2 className="w-5 h-5 animate-spin" />
            Ejecutando Limpieza Automática...
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert className="border-blue-300 bg-blue-50">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            <AlertDescription className="text-blue-900">
              Eliminando entidades legacy, referencias rotas y consolidando planificaciones...
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-green-300">
      <CardHeader className="bg-green-50">
        <CardTitle className="flex items-center gap-2 text-green-900">
          <CheckCircle2 className="w-5 h-5" />
          Limpieza Automática Completada
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white rounded border border-red-200">
            <p className="text-slate-600 text-xs">Machine Eliminadas</p>
            <p className="text-xl font-bold text-red-700">{results.machineDeleted || 0}</p>
          </div>
          <div className="p-3 bg-white rounded border border-red-200">
            <p className="text-slate-600 text-xs">Employee Eliminadas</p>
            <p className="text-xl font-bold text-red-700">{results.employeeDeleted || 0}</p>
          </div>
          <div className="p-3 bg-white rounded border border-orange-200">
            <p className="text-slate-600 text-xs">Referencias Rotas Limpias</p>
            <p className="text-xl font-bold text-orange-700">{results.machineProcessDeleted || 0}</p>
          </div>
          <div className="p-3 bg-white rounded border border-purple-200">
            <p className="text-slate-600 text-xs">Planificaciones Migradas</p>
            <p className="text-xl font-bold text-purple-700">{(results.machineplanningMigrated || 0) + (results.dailystaffingMigrated || 0)}</p>
          </div>
        </div>

        {results.errors && results.errors.length > 0 && (
          <Alert className="border-amber-300 bg-amber-50">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-900 text-sm">
              <strong>{results.errors.length} errores encontrados</strong> (pero la operación fue completada)
            </AlertDescription>
          </Alert>
        )}

        {(!results.errors || results.errors.length === 0) && (
          <Alert className="border-green-400 bg-green-100">
            <CheckCircle2 className="w-4 h-4 text-green-700" />
            <AlertDescription className="text-green-800 font-semibold">
              ✅ Todas las operaciones se completaron exitosamente
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}