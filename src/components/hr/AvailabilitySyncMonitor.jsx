import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, AlertTriangle, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";

export default function AvailabilitySyncMonitor({ employees, absences }) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  // Calcular inconsistencias
  const inconsistencies = React.useMemo(() => {
    const now = new Date();
    const issues = [];

    employees.forEach(emp => {
      // Buscar ausencias activas
      const activeAbsences = absences.filter(abs => {
        if (abs.employee_id !== emp.id) return false;
        if (abs.estado_aprobacion !== 'Aprobada') return false; // Solo aprobadas
        
        const start = new Date(abs.fecha_inicio);
        const end = abs.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(abs.fecha_fin);
        
        return now >= start && now <= end;
      });

      const shouldBeAbsent = activeAbsences.length > 0;
      const markedAbsent = emp.disponibilidad === "Ausente";

      if (shouldBeAbsent && !markedAbsent) {
        issues.push({
          type: 'should_be_absent',
          employee: emp,
          message: `${emp.nombre} tiene ausencia activa pero está marcado como Disponible`
        });
      } else if (!shouldBeAbsent && markedAbsent) {
        issues.push({
          type: 'should_be_available',
          employee: emp,
          message: `${emp.nombre} está marcado como Ausente pero no tiene ausencias activas`
        });
      }
    });

    return issues;
  }, [employees, absences]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await base44.functions.invoke('syncEmployeeAvailability');
      
      if (response.data.status === 'success') {
        setLastSync({
          fecha: new Date().toISOString(),
          actualizados: response.data.empleados_actualizados,
          procesados: response.data.empleados_procesados
        });
        toast.success(`✅ Sincronización completada: ${response.data.empleados_actualizados} empleados actualizados`);
      } else {
        toast.error("Error en la sincronización");
      }
    } catch (error) {
      console.error("Error calling sync:", error);
      toast.error("Error al sincronizar: " + error.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="border-2 border-blue-300 bg-blue-50/50">
      <CardHeader className="border-b bg-blue-100/50">
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-blue-600" />
          Monitor de Sincronización de Disponibilidad
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-700">
              <strong>Estado:</strong> {inconsistencies.length === 0 ? "✅ Sincronizado" : `⚠️ ${inconsistencies.length} inconsistencia(s)`}
            </p>
            {lastSync && (
              <p className="text-xs text-slate-500 mt-1">
                Última sincronización: {new Date(lastSync.fecha).toLocaleString('es-ES')} 
                ({lastSync.actualizados}/{lastSync.procesados} actualizados)
              </p>
            )}
          </div>
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar Ahora
              </>
            )}
          </Button>
        </div>

        {inconsistencies.length > 0 && (
          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-semibold text-amber-800">
              Inconsistencias detectadas ({inconsistencies.length}):
            </p>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {inconsistencies.slice(0, 10).map((issue, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs p-2 bg-white dark:bg-slate-800 rounded border border-amber-200 dark:border-amber-800">
                  {issue.type === 'should_be_absent' ? (
                    <UserX className="w-4 h-4 text-red-500 flex-shrink-0" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                  <span className="flex-1 dark:text-slate-300">{issue.message}</span>
                </div>
              ))}
              {inconsistencies.length > 10 && (
                <p className="text-xs text-slate-500 text-center">
                  +{inconsistencies.length - 10} más...
                </p>
              )}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded p-3 border dark:border-slate-700 text-xs space-y-2">
          <p className="font-semibold text-slate-700 dark:text-slate-300">ℹ️ Funcionamiento:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
            <li>Sincroniza ausencias del calendario con disponibilidad de empleados.</li>
            <li>Actualiza automáticamente el campo `disponibilidad` en la ficha del empleado</li>
            <li>Se ejecuta automáticamente al crear/aprobar/eliminar ausencias</li>
            <li>Puedes ejecutar manualmente si detectas inconsistencias</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}