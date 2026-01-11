import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Clock,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Zap,
  Power
} from "lucide-react";
import { toast } from "sonner";

export default function AutoConsolidationConfig() {
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [scheduledTask, setScheduledTask] = useState(null);
  const [lastExecution, setLastExecution] = useState(null);

  useEffect(() => {
    loadTaskStatus();
  }, []);

  const loadTaskStatus = async () => {
    try {
      // Aquí podrías cargar el estado de la tarea programada
      // Por ahora simulamos la respuesta
      setScheduledTask({
        id: 'consolidation_task',
        active: false,
        schedule: 'Diario a las 02:00',
        nextRun: null
      });
    } catch (error) {
      console.error("Error cargando estado:", error);
    } finally {
      setLoading(false);
    }
  };

  const executeNow = async () => {
    setExecuting(true);
    console.log("🚀 Ejecutando consolidación manual...");
    
    try {
      toast.info("🔄 Iniciando consolidación automática...");
      
      const response = await base44.functions.invoke('autoConsolidateEmployees', {});
      const result = response?.data || response;
      
      console.log("Resultado consolidación:", result);
      
      if (result.success) {
        const migrated = result.consolidation?.employeesMigrated || 0;
        const updated = result.references?.totalUpdated || 0;
        
        toast.success(
          `✅ Consolidación exitosa: ${migrated} empleados migrados, ${updated} referencias actualizadas`,
          { duration: 5000 }
        );
        
        setLastExecution({
          timestamp: new Date().toISOString(),
          success: true,
          migrated,
          updated
        });
      } else {
        toast.error(`❌ Error: ${result.error || 'Error desconocido'}`);
        setLastExecution({
          timestamp: new Date().toISOString(),
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("Error ejecutando consolidación:", error);
      toast.error(`❌ Error: ${error.message}`);
      setLastExecution({
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      });
    } finally {
      setExecuting(false);
    }
  };

  const toggleSchedule = async (enabled) => {
    try {
      toast.info(enabled ? "Activando programación..." : "Desactivando programación...");
      
      // Aquí activarías/desactivarías la tarea programada
      setScheduledTask(prev => ({ ...prev, active: enabled }));
      
      toast.success(enabled ? "✅ Programación activada" : "⏸️ Programación pausada");
    } catch (error) {
      toast.error("Error cambiando configuración");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-sm text-slate-600">Cargando configuración...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Zap className="w-5 h-5" />
            Consolidación Automática
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <Clock className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              <strong>Automatización activada:</strong> El sistema consolidará datos automáticamente
              sin necesidad de intervención manual, reduciendo riesgos y errores.
            </AlertDescription>
          </Alert>

          {/* Programación */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="font-medium text-slate-900">Ejecución Programada</p>
                  <p className="text-xs text-slate-600">{scheduledTask?.schedule}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {scheduledTask?.active && (
                  <Badge className="bg-green-600">Activa</Badge>
                )}
                <Switch
                  checked={scheduledTask?.active || false}
                  onCheckedChange={toggleSchedule}
                />
              </div>
            </div>

            {scheduledTask?.active && scheduledTask?.nextRun && (
              <p className="text-xs text-slate-600 text-center">
                Próxima ejecución: {new Date(scheduledTask.nextRun).toLocaleString('es-ES')}
              </p>
            )}
          </div>

          {/* Ejecución Manual */}
          <div className="pt-4 border-t">
            <Button 
              onClick={executeNow}
              disabled={executing}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {executing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Ejecutando consolidación...
                </>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Ejecutar Consolidación Ahora
                </>
              )}
            </Button>
          </div>

          {/* Última ejecución */}
          {lastExecution && (
            <div className={`p-4 rounded-lg border-2 ${
              lastExecution.success 
                ? 'bg-green-50 border-green-300' 
                : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-start gap-3">
                {lastExecution.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    lastExecution.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {lastExecution.success ? 'Última ejecución exitosa' : 'Error en última ejecución'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {new Date(lastExecution.timestamp).toLocaleString('es-ES')}
                  </p>
                  {lastExecution.success && (
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className="text-green-700">
                        {lastExecution.migrated} migrados
                      </span>
                      <span className="text-green-700">
                        {lastExecution.updated} referencias actualizadas
                      </span>
                    </div>
                  )}
                  {lastExecution.error && (
                    <p className="text-xs text-red-700 mt-2">{lastExecution.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Disparadores Configurados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
            <Clock className="w-4 h-4 text-slate-600" />
            <span>Ejecución programada diaria a las 02:00</span>
            <Badge className={scheduledTask?.active ? "bg-green-600" : "bg-slate-400"}>
              {scheduledTask?.active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
            <PlayCircle className="w-4 h-4 text-slate-600" />
            <span>Ejecución manual bajo demanda</span>
            <Badge className="bg-blue-600">Disponible</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}