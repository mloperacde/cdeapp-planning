
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AlertTriangle, TrendingUp, Wrench, Cpu, Activity, Calendar, ArrowLeft } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Label } from "@/components/ui/label";

export default function PredictiveMaintenancePage() {
  const [selectedMachine, setSelectedMachine] = useState(null);
  const queryClient = useQueryClient();

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('nombre'),
    initialData: [],
  });

  const { data: predictions } = useQuery({
    queryKey: ['maintenancePredictions'],
    queryFn: () => base44.entities.MaintenancePrediction.list('-fecha_prediccion'),
    initialData: [],
  });

  const createMaintenanceMutation = useMutation({
    mutationFn: async (prediction) => {
      // Crear orden de mantenimiento basada en la predicción
      const maintenanceData = {
        machine_id: prediction.machine_id,
        tipo: "Mantenimiento Planificado",
        prioridad: prediction.nivel_riesgo === "Crítico" || prediction.nivel_riesgo === "Alto" ? "Alta" : "Media",
        estado: "Pendiente",
        fecha_programada: prediction.fecha_fallo_estimada,
        descripcion: `Mantenimiento predictivo: ${prediction.recomendaciones}`,
        notas: `Predicción automática - Probabilidad de fallo: ${prediction.probabilidad_fallo}%`,
      };

      const maintenance = await base44.entities.MaintenanceSchedule.create(maintenanceData);

      // Actualizar la predicción para marcarla como procesada
      await base44.entities.MaintenancePrediction.update(prediction.id, {
        mantenimiento_creado: true,
        maintenance_schedule_id: maintenance.id,
      });

      return maintenance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenancePredictions'] });
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
    },
  });

  // Simulador de predicciones (en producción vendría de un modelo ML real)
  const generatePrediction = async (machineId) => {
    const now = new Date();
    const randomDays = Math.floor(Math.random() * 30) + 5;
    const failureDate = new Date(now);
    failureDate.setDate(failureDate.getDate() + randomDays);

    const probability = Math.floor(Math.random() * 60) + 30;
    let riskLevel = "Bajo";
    if (probability > 70) riskLevel = "Crítico";
    else if (probability > 55) riskLevel = "Alto";
    else if (probability > 40) riskLevel = "Medio";

    const predictionData = {
      machine_id: machineId,
      fecha_prediccion: now.toISOString(),
      fecha_fallo_estimada: failureDate.toISOString(),
      probabilidad_fallo: probability,
      nivel_riesgo: riskLevel,
      componentes_afectados: ["Motor", "Rodamientos", "Sistema hidráulico"],
      datos_sensores: {
        temperatura: 75 + Math.random() * 10,
        vibracion: 5 + Math.random() * 3,
        presion: 100 + Math.random() * 20,
        horas_operacion: 5000 + Math.random() * 2000,
        eficiencia: 85 - Math.random() * 15,
      },
      recomendaciones: "Revisión preventiva de componentes mecánicos y lubricación",
      mantenimiento_creado: false,
    };

    await base44.entities.MaintenancePrediction.create(predictionData);
    queryClient.invalidateQueries({ queryKey: ['maintenancePredictions'] });
  };

  const activePredictions = useMemo(() => {
    return predictions.filter(p => !p.mantenimiento_creado);
  }, [predictions]);

  const criticalPredictions = useMemo(() => {
    return activePredictions.filter(p => p.nivel_riesgo === "Crítico" || p.nivel_riesgo === "Alto");
  }, [activePredictions]);

  const getMachineName = (machineId) => {
    return machines.find(m => m.id === machineId)?.nombre || "Desconocida";
  };

  const getRiskColor = (nivel) => {
    switch (nivel) {
      case "Crítico": return "bg-red-100 text-red-800 border-red-300";
      case "Alto": return "bg-orange-100 text-orange-800 border-orange-300";
      case "Medio": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Bajo": return "bg-green-100 text-green-800 border-green-300";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("MachineMaintenance")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Mantenimiento Máquinas
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Cpu className="w-8 h-8 text-blue-600" />
            Mantenimiento Predictivo
          </h1>
          <p className="text-slate-600 mt-1">
            Predicciones basadas en ML para mantenimiento proactivo
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 font-medium">Predicciones Críticas</p>
                  <p className="text-2xl font-bold text-red-900">{criticalPredictions.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-700 font-medium">Total Predicciones Activas</p>
                  <p className="text-2xl font-bold text-orange-900">{activePredictions.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Mantenimientos Generados</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {predictions.filter(p => p.mantenimiento_creado).length}
                  </p>
                </div>
                <Wrench className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas Críticas */}
        {criticalPredictions.length > 0 && (
          <Card className="mb-6 bg-red-50 border-2 border-red-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="w-5 h-5" />
                Alertas Críticas de Mantenimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {criticalPredictions.map((pred) => (
                  <div key={pred.id} className="flex items-center justify-between bg-white p-3 rounded border border-red-200">
                    <div>
                      <p className="font-semibold text-slate-900">{getMachineName(pred.machine_id)}</p>
                      <p className="text-sm text-slate-600">
                        Fallo estimado: {format(new Date(pred.fecha_fallo_estimada), "dd/MM/yyyy")}
                        ({differenceInDays(new Date(pred.fecha_fallo_estimada), new Date())} días)
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getRiskColor(pred.nivel_riesgo)}>
                        {pred.probabilidad_fallo}% - {pred.nivel_riesgo}
                      </Badge>
                      {!pred.mantenimiento_creado && (
                        <Button
                          size="sm"
                          onClick={() => createMaintenanceMutation.mutate(pred)}
                          disabled={createMaintenanceMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Crear Mantenimiento
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Predicciones */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Predicciones Activas por Máquina</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {activePredictions.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No hay predicciones activas</p>
                <p className="text-sm mt-2">
                  El sistema de ML genera predicciones automáticamente basándose en datos de sensores
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activePredictions.map((pred) => (
                  <div key={pred.id} className={`border-2 rounded-lg p-4 ${getRiskColor(pred.nivel_riesgo)}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{getMachineName(pred.machine_id)}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getRiskColor(pred.nivel_riesgo)}>
                            Riesgo {pred.nivel_riesgo}
                          </Badge>
                          <span className="text-sm text-slate-600">
                            Predicción: {format(new Date(pred.fecha_prediccion), "dd/MM/yyyy HH:mm")}
                          </span>
                        </div>
                      </div>
                      {!pred.mantenimiento_creado && (
                        <Button
                          onClick={() => createMaintenanceMutation.mutate(pred)}
                          disabled={createMaintenanceMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Wrench className="w-4 h-4 mr-2" />
                          Programar Mantenimiento
                        </Button>
                      )}
                      {pred.mantenimiento_creado && (
                        <Badge className="bg-green-600 text-white">
                          Mantenimiento Programado
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Probabilidad de Fallo</Label>
                        <div className="flex items-center gap-3">
                          <Progress value={pred.probabilidad_fallo} className="flex-1" />
                          <span className="font-bold text-lg">{pred.probabilidad_fallo}%</span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Fecha Estimada de Fallo</Label>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(pred.fecha_fallo_estimada), "dd/MM/yyyy")}</span>
                          <Badge variant="outline">
                            {differenceInDays(new Date(pred.fecha_fallo_estimada), new Date())} días
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {pred.componentes_afectados && pred.componentes_afectados.length > 0 && (
                      <div className="mt-4">
                        <Label className="text-sm font-semibold mb-2 block">Componentes Afectados</Label>
                        <div className="flex flex-wrap gap-2">
                          {pred.componentes_afectados.map((comp, idx) => (
                            <Badge key={idx} variant="outline">{comp}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {pred.datos_sensores && (
                      <div className="mt-4">
                        <Label className="text-sm font-semibold mb-2 block">Datos de Sensores</Label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                          <div className="bg-white p-2 rounded">
                            <span className="text-slate-600">Temperatura:</span>
                            <span className="font-semibold ml-1">{pred.datos_sensores.temperatura?.toFixed(1)}°C</span>
                          </div>
                          <div className="bg-white p-2 rounded">
                            <span className="text-slate-600">Vibración:</span>
                            <span className="font-semibold ml-1">{pred.datos_sensores.vibracion?.toFixed(2)}</span>
                          </div>
                          <div className="bg-white p-2 rounded">
                            <span className="text-slate-600">Presión:</span>
                            <span className="font-semibold ml-1">{pred.datos_sensores.presion?.toFixed(0)} bar</span>
                          </div>
                          <div className="bg-white p-2 rounded">
                            <span className="text-slate-600">Horas Op:</span>
                            <span className="font-semibold ml-1">{pred.datos_sensores.horas_operacion?.toFixed(0)}h</span>
                          </div>
                          <div className="bg-white p-2 rounded">
                            <span className="text-slate-600">Eficiencia:</span>
                            <span className="font-semibold ml-1">{pred.datos_sensores.eficiencia?.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {pred.recomendaciones && (
                      <div className="mt-4 p-3 bg-white rounded border">
                        <Label className="text-sm font-semibold mb-1 block">Recomendaciones</Label>
                        <p className="text-sm text-slate-700">{pred.recomendaciones}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nota sobre ML */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Nota:</strong> El sistema de mantenimiento predictivo utiliza modelos de Machine Learning
            que analizan datos de sensores de las máquinas (temperatura, vibración, presión, etc.) para
            predecir fallos antes de que ocurran. Las predicciones se generan automáticamente y crean
            notificaciones para programar mantenimiento proactivo.
          </p>
        </div>
      </div>
    </div>
  );
}
