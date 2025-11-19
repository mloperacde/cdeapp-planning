import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Factory, 
  Power, 
  PowerOff, 
  Wrench, 
  AlertTriangle, 
  TrendingUp, 
  Calendar as CalendarIcon,
  Activity,
  Package,
  Clock,
  Zap
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import ProductionMonitor from "../components/machines/ProductionMonitor";

export default function ProductionDashboard() {
  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60000,
  });

  const { data: machineStatuses = [] } = useQuery({
    queryKey: ['machineStatuses'],
    queryFn: () => base44.entities.MachineStatus.list(),
    staleTime: 1 * 60 * 1000,
    refetchInterval: 30000,
  });

  const { data: plannings = [] } = useQuery({
    queryKey: ['todayPlannings'],
    queryFn: () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return base44.entities.MachinePlanning.filter({ fecha_planificacion: today });
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60000,
  });

  const { data: maintenanceSchedules = [] } = useQuery({
    queryKey: ['maintenanceSchedules'],
    queryFn: () => base44.entities.MaintenanceSchedule.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
    staleTime: 10 * 60 * 1000,
  });

  // KPIs de Máquinas
  const machineKPIs = useMemo(() => {
    const disponibles = machines.filter(m => {
      const status = machineStatuses.find(ms => ms.machine_id === m.id);
      return status?.estado_disponibilidad === "Disponible";
    }).length;

    const noDisponibles = machines.filter(m => {
      const status = machineStatuses.find(ms => ms.machine_id === m.id);
      return status?.estado_disponibilidad === "No disponible";
    }).length;

    const enProduccion = machineStatuses.filter(ms => 
      ms.estado_produccion === "Orden en curso"
    ).length;

    const conAlertas = machineStatuses.filter(ms => ms.alerta_desviacion).length;

    const enMantenimiento = maintenanceSchedules.filter(m => 
      m.estado === "En Proceso" || m.estado === "Programado"
    ).length;

    return {
      total: machines.length,
      disponibles,
      noDisponibles,
      enProduccion,
      conAlertas,
      enMantenimiento,
      disponibilidadPorcentaje: machines.length > 0 ? (disponibles / machines.length * 100).toFixed(1) : 0,
      produccionPorcentaje: machines.length > 0 ? (enProduccion / machines.length * 100).toFixed(1) : 0,
    };
  }, [machines, machineStatuses, maintenanceSchedules]);

  // KPIs de Producción
  const productionKPIs = useMemo(() => {
    const lotesProducidos = machineStatuses.reduce((sum, ms) => sum + (ms.lotes_producidos || 0), 0);
    
    const articulosUnicos = new Set(
      machineStatuses
        .filter(ms => ms.articulo_en_curso)
        .map(ms => ms.articulo_en_curso)
    ).size;

    // Calcular OEE simplificado
    const maquinasConDatos = machineStatuses.filter(ms => 
      ms.tiempo_ciclo_actual && ms.tiempo_ciclo_estandar && ms.estado_produccion === "Orden en curso"
    );

    let oeePromedio = 0;
    if (maquinasConDatos.length > 0) {
      const oees = maquinasConDatos.map(ms => {
        const performance = (ms.tiempo_ciclo_estandar / ms.tiempo_ciclo_actual) * 100;
        return Math.min(performance, 100);
      });
      oeePromedio = oees.reduce((sum, oee) => sum + oee, 0) / oees.length;
    }

    return {
      lotesProducidos,
      articulosUnicos,
      oee: oeePromedio.toFixed(1),
      maquinasActivas: machineKPIs.enProduccion
    };
  }, [machineStatuses, machineKPIs.enProduccion]);

  // Planificación del día
  const todayPlanning = useMemo(() => {
    const activePlannings = plannings.filter(p => p.activa_planning);
    const totalOperadores = activePlannings.reduce((sum, p) => sum + (p.operadores_necesarios || 0), 0);
    
    return {
      maquinasPlanificadas: activePlannings.length,
      operadoresNecesarios: totalOperadores,
      plannings: activePlannings
    };
  }, [plannings]);

  // Alertas recientes
  const recentAlerts = useMemo(() => {
    const alerts = [];
    
    machineStatuses.forEach(ms => {
      if (ms.alerta_desviacion) {
        const machine = machines.find(m => m.id === ms.machine_id);
        alerts.push({
          tipo: 'desviacion',
          machine: machine?.nombre || 'Máquina desconocida',
          mensaje: ms.motivo_desviacion || 'Desviación de tiempo de ciclo',
          fecha: ms.fecha_actualizacion || new Date().toISOString()
        });
      }
    });

    maintenanceSchedules
      .filter(m => m.estado === "Programado" && m.alerta_activa)
      .forEach(m => {
        const machine = machines.find(maq => maq.id === m.machine_id);
        alerts.push({
          tipo: 'mantenimiento',
          machine: machine?.nombre || 'Máquina desconocida',
          mensaje: `Mantenimiento ${m.tipo} programado`,
          fecha: m.fecha_programada
        });
      });

    return alerts.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 10);
  }, [machineStatuses, maintenanceSchedules, machines]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Factory className="w-8 h-8 text-blue-600" />
            Dashboard de Producción
          </h1>
          <p className="text-slate-600 mt-1">
            Visión general del estado operativo en tiempo real
          </p>
        </div>

        {/* KPIs Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-blue-700 font-medium">OEE Promedio</p>
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-900">{productionKPIs.oee}%</p>
              <Progress value={parseFloat(productionKPIs.oee)} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-green-700 font-medium">Disponibilidad</p>
                <Power className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-900">{machineKPIs.disponibilidadPorcentaje}%</p>
              <p className="text-xs text-green-700 mt-1">
                {machineKPIs.disponibles} de {machineKPIs.total} máquinas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-purple-700 font-medium">Lotes Producidos</p>
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-900">{productionKPIs.lotesProducidos}</p>
              <p className="text-xs text-purple-700 mt-1">
                {productionKPIs.articulosUnicos} artículos diferentes
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-orange-700 font-medium">En Producción</p>
                <Zap className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-orange-900">{machineKPIs.enProduccion}</p>
              <p className="text-xs text-orange-700 mt-1">
                {machineKPIs.produccionPorcentaje}% de capacidad
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Estado de Máquinas */}
          <Card className="lg:col-span-2 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <Power className="w-5 h-5 text-blue-600" />
                Estado de Máquinas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <p className="text-sm text-green-700 font-medium mb-1">Disponibles</p>
                  <p className="text-3xl font-bold text-green-900">{machineKPIs.disponibles}</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <p className="text-sm text-blue-700 font-medium mb-1">En Producción</p>
                  <p className="text-3xl font-bold text-blue-900">{machineKPIs.enProduccion}</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-200">
                  <p className="text-sm text-red-700 font-medium mb-1">No Disponibles</p>
                  <p className="text-3xl font-bold text-red-900">{machineKPIs.noDisponibles}</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                  <p className="text-sm text-yellow-700 font-medium mb-1">En Mantenimiento</p>
                  <p className="text-3xl font-bold text-yellow-900">{machineKPIs.enMantenimiento}</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                  <p className="text-sm text-orange-700 font-medium mb-1">Con Alertas</p>
                  <p className="text-3xl font-bold text-orange-900">{machineKPIs.conAlertas}</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
                  <p className="text-sm text-slate-700 font-medium mb-1">Total</p>
                  <p className="text-3xl font-bold text-slate-900">{machineKPIs.total}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tasa de Disponibilidad</span>
                  <span className="font-bold text-green-900">{machineKPIs.disponibilidadPorcentaje}%</span>
                </div>
                <Progress value={parseFloat(machineKPIs.disponibilidadPorcentaje)} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Planificación del Día */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                Planning de Hoy
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <p className="text-sm text-blue-700 font-medium mb-1">Máquinas Planificadas</p>
                  <p className="text-4xl font-bold text-blue-900">{todayPlanning.maquinasPlanificadas}</p>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                  <p className="text-sm text-purple-700 font-medium mb-1">Operadores Necesarios</p>
                  <p className="text-4xl font-bold text-purple-900">{todayPlanning.operadoresNecesarios}</p>
                </div>

                {todayPlanning.plannings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600 uppercase">Máquinas Activas:</p>
                    {todayPlanning.plannings.slice(0, 5).map((planning, idx) => {
                      const machine = machines.find(m => m.id === planning.machine_id);
                      return (
                        <div key={idx} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                          <span className="font-medium text-slate-700">{machine?.nombre}</span>
                          <Badge className="bg-purple-600 text-xs">
                            {planning.operadores_necesarios} op.
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monitor de Producción en Tiempo Real */}
        <div className="mb-6">
          <ProductionMonitor />
        </div>

        {/* Alertas y Notificaciones */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Alertas y Notificaciones Recientes ({recentAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentAlerts.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No hay alertas activas
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentAlerts.map((alert, idx) => (
                  <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      {alert.tipo === 'desviacion' ? (
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Wrench className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{alert.machine}</p>
                            <p className="text-sm text-slate-600 mt-1">{alert.mensaje}</p>
                          </div>
                          <Badge className={alert.tipo === 'desviacion' ? 'bg-red-600' : 'bg-orange-600'}>
                            {alert.tipo === 'desviacion' ? 'Desviación' : 'Mantenimiento'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(alert.fecha), "d MMM yyyy, HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}