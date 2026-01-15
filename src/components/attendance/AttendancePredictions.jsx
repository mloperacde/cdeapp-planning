import React, { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AttendancePredictions() {
  const queryClient = useQueryClient();

  const { data: predictions } = useQuery({
    queryKey: ['mlPredictions'],
    queryFn: () => base44.entities.MLPrediction.list('-fecha_prediccion'),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    initialData: [],
  });

  const { data: attendanceRecords } = useQuery({
    queryKey: ['attendanceRecords'],
    queryFn: () => base44.entities.AttendanceRecord.list(),
    initialData: [],
  });

  const generatePredictionsMutation = useMutation({
    mutationFn: async () => {
      const newPredictions = [];

      for (const employee of employees) {
        const empRecords = attendanceRecords.filter(r => r.employee_id === employee.id);
        
        // Últimos 30 días
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentRecords = empRecords.filter(r => new Date(r.fecha) >= thirtyDaysAgo);
        const retrasos = recentRecords.filter(r => r.estado === "Retraso").length;
        const ausencias = recentRecords.filter(r => r.estado === "Ausencia").length;

        // Solo crear predicción si hay patrón de riesgo
        if (retrasos >= 3 || ausencias >= 2) {
          const probabilidad = Math.min(95, (retrasos * 8) + (ausencias * 20) + 10);
          
          let nivelRiesgo = "Bajo";
          if (probabilidad >= 70) nivelRiesgo = "Crítico";
          else if (probabilidad >= 50) nivelRiesgo = "Alto";
          else if (probabilidad >= 30) nivelRiesgo = "Medio";

          const factores = [];
          if (retrasos > 0) factores.push({ 
            factor: `${retrasos} retrasos en últimos 30 días`, 
            impacto: retrasos * 8 
          });
          if (ausencias > 0) factores.push({ 
            factor: `${ausencias} ausencias en últimos 30 días`, 
            impacto: ausencias * 20 
          });

          const recomendaciones = [];
          if (ausencias >= 3) recomendaciones.push("Revisar causas de ausencias recurrentes");
          if (retrasos >= 5) recomendaciones.push("Evaluar problemas de transporte o situación personal");
          if (probabilidad >= 60) recomendaciones.push("Entrevista prioritaria con RRHH");

          newPredictions.push({
            tipo_prediccion: "Rotación Empleado",
            employee_id: employee.id,
            fecha_prediccion: new Date().toISOString(),
            probabilidad,
            nivel_riesgo: nivelRiesgo,
            factores_contribuyentes: factores,
            datos_analisis: {
              retrasos_30_dias: retrasos,
              ausencias_30_dias: ausencias,
              total_registros: recentRecords.length
            },
            recomendaciones,
            activo: true
          });
        }
      }

      if (newPredictions.length === 0) {
        throw new Error("No se detectaron patrones de riesgo significativos");
      }

      await base44.entities.MLPrediction.bulkCreate(newPredictions);
      return newPredictions.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['mlPredictions'] });
      toast.success(`${count} predicciones generadas`);
    },
    onError: (error) => {
      toast.error(error.message || "Error al generar predicciones");
    }
  });

  const rotationPredictions = useMemo(() => {
    return predictions.filter(p => p.tipo_prediccion === "Rotación Empleado" && p.activo);
  }, [predictions]);

  const highRiskEmployees = useMemo(() => {
    return rotationPredictions.filter(p => 
      p.nivel_riesgo === "Alto" || p.nivel_riesgo === "Crítico"
    );
  }, [rotationPredictions]);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-purple-900 mb-1">Sistema de Predicción ML</h3>
              <p className="text-sm text-purple-800">
                Analiza patrones de asistencia para predecir riesgo de rotación
              </p>
            </div>
            <Button
              onClick={() => generatePredictionsMutation.mutate()}
              disabled={generatePredictionsMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {generatePredictionsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Generar Análisis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {highRiskEmployees.length > 0 && (
        <Card className="bg-red-50 border-2 border-red-300">
          <CardHeader className="border-b border-red-200">
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Empleados de Alto Riesgo ({highRiskEmployees.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {highRiskEmployees.map(pred => {
              const employee = employees.find(e => e.id === pred.employee_id);
              if (!employee) return null;

              return (
                <div key={pred.id} className="bg-white border-2 border-red-300 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-slate-900">{employee.nombre}</h4>
                      <p className="text-sm text-slate-600">{employee.departamento} - {employee.puesto}</p>
                    </div>
                    <Badge className={
                      pred.nivel_riesgo === "Crítico" ? "bg-red-600" : "bg-orange-600"
                    }>
                      {pred.nivel_riesgo} - {pred.probabilidad}%
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-1">Factores:</p>
                      <div className="space-y-1">
                        {pred.factores_contribuyentes?.map((factor, i) => (
                          <p key={i} className="text-xs text-slate-600">
                            • {factor.factor} (impacto: {factor.impacto}%)
                          </p>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-1">Recomendaciones:</p>
                      <div className="space-y-1">
                        {pred.recomendaciones?.map((rec, i) => (
                          <p key={i} className="text-xs text-blue-700">
                            ✓ {rec}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Todas las Predicciones ({rotationPredictions.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {rotationPredictions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Brain className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>No hay predicciones generadas</p>
              <p className="text-sm mt-2">Haz clic en "Generar Análisis" para crear predicciones</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rotationPredictions.map(pred => {
                const employee = employees.find(e => e.id === pred.employee_id);
                if (!employee) return null;

                return (
                  <div key={pred.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <AlertCircle className={`w-5 h-5 ${
                        pred.nivel_riesgo === "Crítico" ? "text-red-600" :
                        pred.nivel_riesgo === "Alto" ? "text-orange-600" :
                        pred.nivel_riesgo === "Medio" ? "text-yellow-600" :
                        "text-green-600"
                      }`} />
                      <div>
                        <p className="font-semibold text-slate-900">{employee.nombre}</p>
                        <p className="text-xs text-slate-600">
                          {employee.departamento} - {pred.datos_analisis?.retrasos_30_dias} retrasos, {pred.datos_analisis?.ausencias_30_dias} ausencias (30d)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-3">
                        <p className="text-2xl font-bold text-slate-900">{pred.probabilidad}%</p>
                        <p className="text-xs text-slate-500">probabilidad</p>
                      </div>
                      <Badge className={
                        pred.nivel_riesgo === "Crítico" ? "bg-red-600" :
                        pred.nivel_riesgo === "Alto" ? "bg-orange-600" :
                        pred.nivel_riesgo === "Medio" ? "bg-yellow-600" :
                        "bg-green-600"
                      }>
                        {pred.nivel_riesgo}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
