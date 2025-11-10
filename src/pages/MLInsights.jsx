import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Clock, 
  Target,
  Sparkles,
  BarChart3,
  Activity
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function MLInsightsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: predictions } = useQuery({
    queryKey: ['mlPredictions'],
    queryFn: () => base44.entities.MLPrediction.list('-fecha_prediccion'),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: shifts } = useQuery({
    queryKey: ['shiftAssignments'],
    queryFn: () => base44.entities.ShiftAssignment.list(),
    initialData: [],
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list(),
    initialData: [],
  });

  const handleGeneratePredictions = async () => {
    setIsGenerating(true);
    try {
      // Simulación de llamada al agente ML
      alert('Generando predicciones con Machine Learning...\n\nEl sistema analizará:\n• Datos históricos de empleados\n• Patrones de turnos\n• Rendimiento de máquinas\n• Ausencias y rotación');
      
      // En producción, esto llamaría al agente:
      // await base44.agents.mlInsightsAgent.analyze();
      
      queryClient.invalidateQueries({ queryKey: ['mlPredictions'] });
    } catch (error) {
      console.error('Error generando predicciones:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const turnoverPredictions = useMemo(() => {
    return predictions.filter(p => p.tipo_prediccion === "Rotación Empleado" && p.activo);
  }, [predictions]);

  const shiftOptimizations = useMemo(() => {
    return predictions.filter(p => p.tipo_prediccion === "Optimización Turnos" && p.activo);
  }, [predictions]);

  const bottleneckPredictions = useMemo(() => {
    return predictions.filter(p => p.tipo_prediccion === "Cuello Botella Máquina" && p.activo);
  }, [predictions]);

  const getEmployeeName = (id) => {
    return employees.find(e => e.id === id)?.nombre || "Empleado desconocido";
  };

  const getMachineName = (id) => {
    return machines.find(m => m.id === id)?.nombre || "Máquina desconocida";
  };

  const getRiskColor = (nivel) => {
    const colors = {
      "Bajo": "bg-green-100 text-green-800",
      "Medio": "bg-yellow-100 text-yellow-800",
      "Alto": "bg-orange-100 text-orange-800",
      "Crítico": "bg-red-100 text-red-800",
    };
    return colors[nivel] || "bg-slate-100 text-slate-800";
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Brain className="w-8 h-8 text-blue-600" />
              Análisis Predictivo ML
            </h1>
            <p className="text-slate-600 mt-1">
              Machine Learning para predicción de rotación, optimización de turnos y detección de cuellos de botella
            </p>
          </div>
          <Button
            onClick={handleGeneratePredictions}
            disabled={isGenerating}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isGenerating ? "Analizando..." : "Generar Análisis ML"}
          </Button>
        </div>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 font-medium">Riesgo Rotación Alto</p>
                  <p className="text-2xl font-bold text-red-900">
                    {turnoverPredictions.filter(p => p.nivel_riesgo === "Alto" || p.nivel_riesgo === "Crítico").length}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Optimizaciones Disponibles</p>
                  <p className="text-2xl font-bold text-blue-900">{shiftOptimizations.length}</p>
                </div>
                <Target className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-700 font-medium">Cuellos de Botella</p>
                  <p className="text-2xl font-bold text-orange-900">{bottleneckPredictions.length}</p>
                </div>
                <Activity className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="turnover" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="turnover">
              Predicción Rotación ({turnoverPredictions.length})
            </TabsTrigger>
            <TabsTrigger value="optimization">
              Optimización Turnos ({shiftOptimizations.length})
            </TabsTrigger>
            <TabsTrigger value="bottlenecks">
              Cuellos de Botella ({bottleneckPredictions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="turnover">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Predicción de Rotación de Empleados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {turnoverPredictions.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    No hay predicciones de rotación generadas
                  </div>
                ) : (
                  <div className="space-y-4">
                    {turnoverPredictions.map((pred) => (
                      <div
                        key={pred.id}
                        className="border rounded-lg p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg text-slate-900">
                              {getEmployeeName(pred.employee_id)}
                            </h3>
                            <p className="text-sm text-slate-600">
                              Predicción: {format(new Date(pred.fecha_prediccion), "dd/MM/yyyy", { locale: es })}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getRiskColor(pred.nivel_riesgo)}>
                              {pred.nivel_riesgo}
                            </Badge>
                            <Badge variant="outline">
                              {pred.probabilidad}% probabilidad
                            </Badge>
                          </div>
                        </div>

                        {pred.factores_contribuyentes && pred.factores_contribuyentes.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-semibold text-slate-700 mb-2">Factores Principales:</p>
                            <div className="flex flex-wrap gap-2">
                              {pred.factores_contribuyentes.map((factor, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {factor.factor} ({factor.impacto}%)
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {pred.recomendaciones && pred.recomendaciones.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-slate-700 mb-2">Recomendaciones:</p>
                            <ul className="text-sm text-slate-600 space-y-1">
                              {pred.recomendaciones.map((rec, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-blue-600">•</span>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="optimization">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Optimización de Turnos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {shiftOptimizations.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    No hay optimizaciones de turnos generadas
                  </div>
                ) : (
                  <div className="space-y-4">
                    {shiftOptimizations.map((pred) => (
                      <div
                        key={pred.id}
                        className="border rounded-lg p-4 bg-slate-50"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg text-slate-900">
                              Optimización de Programación
                            </h3>
                            <p className="text-sm text-slate-600">
                              Análisis: {format(new Date(pred.fecha_prediccion), "dd/MM/yyyy", { locale: es })}
                            </p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">
                            {pred.probabilidad}% mejora
                          </Badge>
                        </div>

                        {pred.optimizacion_turnos && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            <div className="bg-white rounded p-3 border border-blue-200">
                              <p className="text-xs text-slate-600">Horas Extra Predichas</p>
                              <p className="text-xl font-bold text-blue-900">
                                {pred.optimizacion_turnos.horas_extra_predichas}h
                              </p>
                            </div>
                            <div className="bg-white rounded p-3 border border-green-200">
                              <p className="text-xs text-slate-600">Cobertura Óptima</p>
                              <p className="text-xl font-bold text-green-900">
                                {pred.optimizacion_turnos.cobertura_optima}%
                              </p>
                            </div>
                            <div className="bg-white rounded p-3 border border-purple-200">
                              <p className="text-xs text-slate-600">Empleados Necesarios</p>
                              <p className="text-xl font-bold text-purple-900">
                                {pred.optimizacion_turnos.empleados_necesarios}
                              </p>
                            </div>
                            <div className="bg-white rounded p-3 border border-emerald-200">
                              <p className="text-xs text-slate-600">Ahorro Estimado</p>
                              <p className="text-xl font-bold text-emerald-900">
                                €{pred.optimizacion_turnos.ahorro_estimado}
                              </p>
                            </div>
                          </div>
                        )}

                        {pred.recomendaciones && pred.recomendaciones.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-slate-700 mb-2">Acciones Recomendadas:</p>
                            <ul className="text-sm text-slate-600 space-y-1">
                              {pred.recomendaciones.map((rec, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-blue-600">•</span>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bottlenecks">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Cuellos de Botella en Máquinas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bottleneckPredictions.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    No hay cuellos de botella detectados
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bottleneckPredictions.map((pred) => (
                      <div
                        key={pred.id}
                        className="border rounded-lg p-4 bg-slate-50"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg text-slate-900">
                              {getMachineName(pred.machine_id)}
                            </h3>
                            <p className="text-sm text-slate-600">
                              Detección: {format(new Date(pred.fecha_prediccion), "dd/MM/yyyy", { locale: es })}
                            </p>
                          </div>
                          <Badge className={getRiskColor(pred.nivel_riesgo)}>
                            {pred.nivel_riesgo}
                          </Badge>
                        </div>

                        {pred.cuello_botella && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            <div className="bg-white rounded p-3 border border-orange-200">
                              <p className="text-xs text-slate-600">Inactividad Promedio</p>
                              <p className="text-xl font-bold text-orange-900">
                                {pred.cuello_botella.tiempo_inactividad_promedio}h
                              </p>
                            </div>
                            <div className="bg-white rounded p-3 border border-red-200">
                              <p className="text-xs text-slate-600">Eficiencia Actual</p>
                              <p className="text-xl font-bold text-red-900">
                                {pred.cuello_botella.eficiencia_actual}%
                              </p>
                            </div>
                            <div className="bg-white rounded p-3 border border-green-200">
                              <p className="text-xs text-slate-600">Eficiencia Potencial</p>
                              <p className="text-xl font-bold text-green-900">
                                {pred.cuello_botella.eficiencia_potencial}%
                              </p>
                            </div>
                            <div className="bg-white rounded p-3 border border-blue-200">
                              <p className="text-xs text-slate-600">Causa Principal</p>
                              <p className="text-sm font-semibold text-blue-900 truncate">
                                {pred.cuello_botella.causa_principal}
                              </p>
                            </div>
                          </div>
                        )}

                        {pred.recomendaciones && pred.recomendaciones.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-slate-700 mb-2">Soluciones Propuestas:</p>
                            <ul className="text-sm text-slate-600 space-y-1">
                              {pred.recomendaciones.map((rec, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-blue-600">•</span>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Información del Sistema ML */}
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2">Acerca del Sistema de Machine Learning</h3>
          <div className="text-sm text-purple-800 space-y-1">
            <p>• <strong>Predicción de Rotación:</strong> Analiza antigüedad, rendimiento, patrones de turno, ausencias y evaluaciones</p>
            <p>• <strong>Optimización de Turnos:</strong> Minimiza horas extra, maximiza cobertura y predice carga de trabajo</p>
            <p>• <strong>Detección de Cuellos de Botella:</strong> Identifica máquinas con baja eficiencia y tiempos muertos</p>
            <p>• Los modelos se actualizan automáticamente con datos históricos para mejorar la precisión</p>
          </div>
        </div>
      </div>
    </div>
  );
}