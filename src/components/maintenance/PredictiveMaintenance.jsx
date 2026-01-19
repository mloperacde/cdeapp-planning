import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, AlertTriangle, Activity, CheckCircle2, Calendar, Clock, TrendingUp, Wrench, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";

export default function PredictiveMaintenance() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list(),
    initialData: [],
  });

  const { data: maintenances } = useQuery({
    queryKey: ['maintenanceSchedules'],
    queryFn: () => base44.entities.MaintenanceSchedule.list(),
    initialData: [],
  });

  const { data: predictions } = useQuery({
    queryKey: ['machinePredictions'],
    queryFn: () => base44.entities.MachinePrediction.list('-fecha_prediccion'),
    initialData: [],
  });

  const createMaintenanceMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceSchedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
    },
  });

  const updatePredictionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MachinePrediction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machinePredictions'] });
    },
  });

  const runPredictiveAnalysisMutation = useMutation({
    mutationFn: async () => {
      // Simular análisis con IA
      const newPredictions = [];

      for (const machine of machines) {
        if (machine.estado !== "Disponible") continue;

        // Obtener histórico de mantenimientos
        const machineMaintenances = maintenances.filter(m => m.machine_id === machine.id);
        const lastMaintenance = machineMaintenances.sort((a, b) => 
          new Date(b.fecha_realizacion || b.created_date) - new Date(a.fecha_realizacion || a.created_date)
        )[0];

        const daysSinceLastMaintenance = lastMaintenance 
          ? Math.floor((new Date() - new Date(lastMaintenance.fecha_realizacion || lastMaintenance.created_date)) / (1000 * 60 * 60 * 24))
          : 999;

        // Simulación de métricas (en producción vendría de sensores IoT)
        const temperatura = 20 + Math.random() * 60;
        const vibracion = Math.random() * 10;
        const horasOperacion = Math.random() * 10000;

        // Algoritmo simplificado de predicción
        let riesgo = "Bajo";
        let probabilidad = 10;
        let tipoPredicion = "Mantenimiento Preventivo";
        let descripcion = "";
        let recomendaciones = [];

        if (daysSinceLastMaintenance > 90 || temperatura > 70 || vibracion > 7) {
          riesgo = "Alto";
          probabilidad = 75 + Math.random() * 20;
          tipoPredicion = "Fallo Inminente";
          descripcion = `Riesgo elevado detectado. ${daysSinceLastMaintenance} días desde último mantenimiento.`;
          recomendaciones = [
            "Realizar inspección inmediata",
            "Programar mantenimiento preventivo urgente",
            "Revisar niveles de lubricación",
            "Verificar sistema de enfriamiento"
          ];
        } else if (daysSinceLastMaintenance > 60 || temperatura > 60 || vibracion > 5) {
          riesgo = "Medio";
          probabilidad = 45 + Math.random() * 20;
          tipoPredicion = "Degradación";
          descripcion = `Síntomas de degradación detectados. Mantenimiento recomendado.`;
          recomendaciones = [
            "Programar mantenimiento preventivo en 7-14 días",
            "Monitorear temperatura y vibración",
            "Revisar componentes críticos"
          ];
        } else if (daysSinceLastMaintenance > 30) {
          riesgo = "Bajo";
          probabilidad = 20 + Math.random() * 20;
          tipoPredicion = "Mantenimiento Preventivo";
          descripcion = `Condiciones normales. Mantenimiento preventivo programado.`;
          recomendaciones = [
            "Mantenimiento preventivo según calendario",
            "Inspección visual de rutina"
          ];
        }

        if (probabilidad > 40) {
          newPredictions.push({
            machine_id: machine.id,
            tipo_prediccion: tipoPredicion,
            nivel_riesgo: riesgo,
            probabilidad: Math.round(probabilidad),
            fecha_prediccion: new Date().toISOString(),
            fecha_estimada_fallo: format(addDays(new Date(), riesgo === "Alto" ? 7 : riesgo === "Medio" ? 21 : 60), 'yyyy-MM-dd'),
            componente_afectado: "Sistema general",
            descripcion: descripcion,
            factores_contribuyentes: [
              `Temperatura: ${temperatura.toFixed(1)}°C`,
              `Vibración: ${vibracion.toFixed(1)} mm/s`,
              `Días desde mantenimiento: ${daysSinceLastMaintenance}`,
              `Horas operación: ${horasOperacion.toFixed(0)}h`
            ],
            recomendaciones: recomendaciones,
            tiempo_estimado_reparacion_horas: riesgo === "Alto" ? 4 : riesgo === "Medio" ? 2 : 1,
            impacto_produccion: riesgo === "Alto" ? "Alto" : riesgo === "Medio" ? "Medio" : "Bajo",
            estado: "Pendiente",
            metricas_modelo: {
              temperatura: temperatura,
              vibracion: vibracion,
              horas_operacion: horasOperacion,
              ultima_mantenimiento_dias: daysSinceLastMaintenance
            },
            confianza_modelo: 70 + Math.random() * 25
          });
        }
      }

      if (newPredictions.length > 0) {
        await base44.entities.MachinePrediction.bulkCreate(newPredictions);
      }

      return newPredictions.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['machinePredictions'] });
      toast.success(`Análisis completado. ${count} predicciones generadas.`);
      setIsAnalyzing(false);
    },
    onError: () => {
      toast.error("Error al ejecutar el análisis");
      setIsAnalyzing(false);
    }
  });

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    runPredictiveAnalysisMutation.mutate();
  };

  const handleCreateMaintenance = async (prediction) => {
    const machine = machines.find(m => m.id === prediction.machine_id);
    
    const maintenanceData = {
      machine_id: prediction.machine_id,
      tipo_mantenimiento: "Predictivo",
      descripcion: `Mantenimiento predictivo generado automáticamente: ${prediction.descripcion}`,
      fecha_programada: prediction.fecha_estimada_fallo,
      prioridad: prediction.nivel_riesgo === "Crítico" ? 1 : 
                 prediction.nivel_riesgo === "Alto" ? 2 : 
                 prediction.nivel_riesgo === "Medio" ? 3 : 4,
      tiempo_estimado: prediction.tiempo_estimado_reparacion_horas,
      estado: "Programado",
      notas: `Predicción IA - Probabilidad: ${prediction.probabilidad}%\nFactores: ${prediction.factores_contribuyentes.join(', ')}`
    };

    try {
      const maintenance = await createMaintenanceMutation.mutateAsync(maintenanceData);
      
      await updatePredictionMutation.mutateAsync({
        id: prediction.id,
        data: {
          estado: "Mantenimiento Programado",
          maintenance_id: maintenance.id
        }
      });

      toast.success("Mantenimiento creado y programado correctamente");
    } catch (error) {
      toast.error("Error al crear el mantenimiento");
    }
  };

  const handleMarkAsReviewed = (prediction) => {
    updatePredictionMutation.mutate({
      id: prediction.id,
      data: { 
        estado: "Revisada",
        fecha_revision: new Date().toISOString()
      }
    });
  };

  const handleMarkAsFalseAlarm = (prediction) => {
    updatePredictionMutation.mutate({
      id: prediction.id,
      data: { 
        estado: "Falsa Alarma",
        fecha_revision: new Date().toISOString()
      }
    });
  };

  const getMachineName = (machineId) => machines.find(m => m.id === machineId)?.nombre || "Desconocida";

  const getRiskBadge = (nivel) => {
    switch (nivel) {
      case "Crítico":
        return <Badge className="bg-red-700">Crítico</Badge>;
      case "Alto":
        return <Badge className="bg-red-600">Alto</Badge>;
      case "Medio":
        return <Badge className="bg-orange-600">Medio</Badge>;
      case "Bajo":
        return <Badge className="bg-green-600">Bajo</Badge>;
      default:
        return <Badge>{nivel}</Badge>;
    }
  };

  const pendingPredictions = predictions.filter(p => p.estado === "Pendiente");
  const reviewedPredictions = predictions.filter(p => p.estado === "Revisada");
  const scheduledPredictions = predictions.filter(p => p.estado === "Mantenimiento Programado");
  const criticalPredictions = predictions.filter(p => p.nivel_riesgo === "Crítico" || p.nivel_riesgo === "Alto");

  const avgConfidence = predictions.length > 0 
    ? predictions.reduce((acc, p) => acc + (p.confianza_modelo || 0), 0) / predictions.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header con análisis */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader className="border-b border-purple-100">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Brain className="w-6 h-6" />
              Mantenimiento Predictivo con IA
            </CardTitle>
            <Button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isAnalyzing ? "Analizando..." : "Ejecutar Análisis"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Activity className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold text-purple-900">{predictions.length}</div>
              <div className="text-xs text-purple-700">Total Predicciones</div>
            </div>
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
              <div className="text-2xl font-bold text-red-900">{criticalPredictions.length}</div>
              <div className="text-xs text-red-700">Alertas Críticas</div>
            </div>
            <div className="text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-blue-900">{scheduledPredictions.length}</div>
              <div className="text-xs text-blue-700">Mttos. Programados</div>
            </div>
            <div className="text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-green-900">{avgConfidence.toFixed(0)}%</div>
              <div className="text-xs text-green-700">Confianza Promedio</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">
            Pendientes ({pendingPredictions.length})
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            Programadas ({scheduledPredictions.length})
          </TabsTrigger>
          <TabsTrigger value="reviewed">
            Revisadas ({reviewedPredictions.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            Todas ({predictions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingPredictions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-slate-500">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-400" />
                <p>No hay predicciones pendientes</p>
                <p className="text-sm mt-2">Ejecuta un análisis para generar nuevas predicciones</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingPredictions.map((pred) => (
                <Card key={pred.id} className={`border-2 ${
                  pred.nivel_riesgo === "Crítico" ? "border-red-400 bg-red-50" :
                  pred.nivel_riesgo === "Alto" ? "border-orange-400 bg-orange-50" :
                  "border-slate-200"
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-lg">{getMachineName(pred.machine_id)}</h3>
                          {getRiskBadge(pred.nivel_riesgo)}
                          <Badge variant="outline">{pred.tipo_prediccion}</Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{pred.descripcion}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(pred.fecha_prediccion), "d MMM, HH:mm", { locale: es })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Fallo estimado: {format(new Date(pred.fecha_estimada_fallo), "d MMM yyyy", { locale: es })}
                          </span>
                          <span>Probabilidad: {pred.probabilidad}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-600 mb-1">Confianza del Modelo</div>
                        <div className="text-2xl font-bold text-purple-900">{pred.confianza_modelo?.toFixed(0)}%</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Factores Contribuyentes:</h4>
                        <ul className="space-y-1">
                          {pred.factores_contribuyentes?.map((factor, idx) => (
                            <li key={idx} className="text-xs text-slate-600 flex items-center gap-2">
                              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Recomendaciones:</h4>
                        <ul className="space-y-1">
                          {pred.recomendaciones?.map((rec, idx) => (
                            <li key={idx} className="text-xs text-slate-600 flex items-center gap-2">
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t">
                      <Button
                        onClick={() => handleCreateMaintenance(pred)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Wrench className="w-4 h-4 mr-2" />
                        Crear Mantenimiento
                      </Button>
                      <Button variant="outline" onClick={() => handleMarkAsReviewed(pred)}>
                        Marcar como Revisada
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleMarkAsFalseAlarm(pred)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        Falsa Alarma
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scheduled">
          <div className="space-y-4">
            {scheduledPredictions.map((pred) => (
              <Card key={pred.id} className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{getMachineName(pred.machine_id)}</h3>
                        <Badge className="bg-blue-600">Programado</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{pred.descripcion}</p>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            ))}
            {scheduledPredictions.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center text-slate-500">
                  <p>No hay mantenimientos programados desde predicciones</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reviewed">
          <div className="space-y-4">
            {reviewedPredictions.map((pred) => (
              <Card key={pred.id} className="bg-slate-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{getMachineName(pred.machine_id)}</h3>
                      <p className="text-sm text-slate-600">{pred.descripcion}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Revisada: {pred.fecha_revision ? format(new Date(pred.fecha_revision), "d MMM, HH:mm", { locale: es }) : 'N/A'}
                      </p>
                    </div>
                    {getRiskBadge(pred.nivel_riesgo)}
                  </div>
                </CardContent>
              </Card>
            ))}
            {reviewedPredictions.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center text-slate-500">
                  <p>No hay predicciones revisadas</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="all">
          <div className="space-y-4">
            {predictions.map((pred) => (
              <Card key={pred.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{getMachineName(pred.machine_id)}</h3>
                        {getRiskBadge(pred.nivel_riesgo)}
                        <Badge variant="outline">{pred.estado}</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{pred.descripcion}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {format(new Date(pred.fecha_prediccion), "d MMM yyyy, HH:mm", { locale: es })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{pred.probabilidad}%</div>
                      <div className="text-xs text-slate-500">Probabilidad</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}