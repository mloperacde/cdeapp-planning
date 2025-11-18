import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Package, TrendingUp, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function ProductionMonitor({ machineId, compact = false }) {
  const { data: machineStatuses = [] } = useQuery({
    queryKey: ['machineStatuses'],
    queryFn: () => base44.entities.MachineStatus.list(),
    refetchInterval: 30000, // Actualizar cada 30 segundos
  });

  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list(),
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const status = useMemo(() => {
    if (machineId) {
      return machineStatuses.find(s => s.machine_id === machineId);
    }
    return null;
  }, [machineStatuses, machineId]);

  const alertMachines = useMemo(() => {
    return machineStatuses.filter(s => s.alerta_desviacion);
  }, [machineStatuses]);

  if (compact && status) {
    const article = articles.find(a => a.id === status.articulo_en_curso);
    const isAlert = status.alerta_desviacion;
    const cicloDesviacion = status.tiempo_ciclo_actual && status.tiempo_ciclo_estandar
      ? ((status.tiempo_ciclo_actual - status.tiempo_ciclo_estandar) / status.tiempo_ciclo_estandar * 100).toFixed(1)
      : null;

    return (
      <div className={`p-3 rounded-lg border-2 ${isAlert ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-200'}`}>
        {isAlert && (
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-semibold">Alerta de Desviación</span>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-slate-600">Artículo</p>
            <p className="font-semibold">{article?.nombre || 'N/A'}</p>
          </div>
          <div>
            <p className="text-slate-600">Lotes</p>
            <p className="font-semibold">{status.lotes_producidos || 0}</p>
          </div>
          <div>
            <p className="text-slate-600">Ciclo Actual</p>
            <p className={`font-semibold ${isAlert ? 'text-red-700' : ''}`}>
              {status.tiempo_ciclo_actual ? `${status.tiempo_ciclo_actual} min` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-slate-600">Ciclo Estándar</p>
            <p className="font-semibold">{status.tiempo_ciclo_estandar ? `${status.tiempo_ciclo_estandar} min` : 'N/A'}</p>
          </div>
        </div>

        {cicloDesviacion && (
          <div className="mt-2 pt-2 border-t">
            <Badge className={parseFloat(cicloDesviacion) > 20 ? "bg-red-600" : "bg-amber-600"}>
              Desviación: {cicloDesviacion > 0 ? '+' : ''}{cicloDesviacion}%
            </Badge>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Monitorización de Producción en Tiempo Real
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {alertMachines.length > 0 && (
          <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">{alertMachines.length} Alertas Activas</span>
            </div>
            <div className="space-y-2">
              {alertMachines.map(s => {
                const machine = machines.find(m => m.id === s.machine_id);
                return (
                  <div key={s.id} className="text-sm bg-white p-2 rounded border border-red-200">
                    <p className="font-semibold text-red-900">{machine?.nombre}</p>
                    <p className="text-red-700">{s.motivo_desviacion}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {machineStatuses
            .filter(s => s.estado_produccion !== "Sin orden")
            .map(s => {
              const machine = machines.find(m => m.id === s.machine_id);
              const article = articles.find(a => a.id === s.articulo_en_curso);
              const isAlert = s.alerta_desviacion;
              
              return (
                <Card key={s.id} className={isAlert ? "border-2 border-red-300" : ""}>
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <h4 className="font-bold text-slate-900">{machine?.nombre}</h4>
                      <p className="text-xs text-slate-500">{machine?.codigo}</p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Estado</span>
                        <Badge className={s.estado_produccion === "Orden en curso" ? "bg-blue-600" : "bg-purple-600"}>
                          {s.estado_produccion}
                        </Badge>
                      </div>

                      {article && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Artículo</span>
                          <span className="font-semibold">{article.nombre}</span>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span className="text-slate-600">Lotes</span>
                        <span className="font-semibold">{s.lotes_producidos || 0}</span>
                      </div>

                      {s.tiempo_ciclo_actual && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Ciclo</span>
                          <span className={`font-semibold ${isAlert ? 'text-red-700' : ''}`}>
                            {s.tiempo_ciclo_actual} min {s.tiempo_ciclo_estandar && `(std: ${s.tiempo_ciclo_estandar})`}
                          </span>
                        </div>
                      )}

                      {s.hora_inicio_produccion && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">Inicio</span>
                          <span>{formatDistanceToNow(new Date(s.hora_inicio_produccion), { addSuffix: true, locale: es })}</span>
                        </div>
                      )}

                      {isAlert && s.motivo_desviacion && (
                        <div className="mt-2 pt-2 border-t border-red-200">
                          <div className="flex items-start gap-2 text-red-700">
                            <AlertTriangle className="w-4 h-4 mt-0.5" />
                            <span className="text-xs">{s.motivo_desviacion}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        {machineStatuses.filter(s => s.estado_produccion !== "Sin orden").length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No hay máquinas en producción actualmente
          </div>
        )}
      </CardContent>
    </Card>
  );
}