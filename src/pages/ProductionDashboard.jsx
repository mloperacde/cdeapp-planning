import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Factory, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Activity,
  Gauge,
  BarChart3,
  Package
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay, endOfDay, parseISO, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import ProtectedPage from "../components/roles/ProtectedPage";
import Breadcrumbs from "../components/common/Breadcrumbs";

export default function ProductionDashboardPage() {
  return (
    <ProtectedPage module="planning" action="view">
      <ProductionDashboardContent />
    </ProtectedPage>
  );
}

function ProductionDashboardContent() {
  const [dateRange, setDateRange] = useState("7days");
  const [selectedMachine, setSelectedMachine] = useState("all");

  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders'],
    queryFn: () => base44.entities.WorkOrder.list(),
  });

  const { data: machineStatuses = [] } = useQuery({
    queryKey: ['machineStatuses'],
    queryFn: () => base44.entities.MachineStatus.list(),
    refetchInterval: 30000,
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ['qualityInspections'],
    queryFn: () => base44.entities.QualityInspection.list('-inspection_date', 100),
  });

  const { data: processes = [] } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.filter({ activo: true }),
  });

  // Cálculos de KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const daysAgo = dateRange === "7days" ? 7 : dateRange === "30days" ? 30 : 1;
    const startDate = subDays(now, daysAgo);

    const filteredOrders = workOrders.filter(wo => {
      if (selectedMachine !== "all" && wo.machine_id !== selectedMachine) return false;
      if (!wo.created_date) return false;
      return new Date(wo.created_date) >= startDate;
    });

    const filteredInspections = inspections.filter(i => {
      if (selectedMachine !== "all" && i.machine_id !== selectedMachine) return false;
      if (!i.inspection_date) return false;
      return new Date(i.inspection_date) >= startDate;
    });

    // OEE Calculation (Simplified)
    const availableMachines = machineStatuses.filter(ms => ms.estado_disponibilidad === "Disponible");
    const totalMachines = machines.length || 1;
    const availability = (availableMachines.length / totalMachines) * 100;

    // Cycle Time Average
    const validCycleTimes = machineStatuses.filter(ms => ms.tiempo_ciclo_actual).map(ms => ms.tiempo_ciclo_actual);
    const avgCycleTime = validCycleTimes.length > 0 
      ? validCycleTimes.reduce((a, b) => a + b, 0) / validCycleTimes.length 
      : 0;

    // Quality Metrics
    const approvedCount = filteredInspections.filter(i => i.result === "Aprobado").length;
    const rejectedCount = filteredInspections.filter(i => i.result === "Rechazado").length;
    const totalInspected = filteredInspections.length || 1;
    const qualityRate = (approvedCount / totalInspected) * 100;

    // Order Status
    const completed = filteredOrders.filter(o => o.status === "Completada").length;
    const delayed = filteredOrders.filter(o => o.status === "Retrasada").length;
    const inProgress = filteredOrders.filter(o => o.status === "En Progreso").length;
    const pending = filteredOrders.filter(o => o.status === "Pendiente").length;

    // Performance (simplified OEE)
    const performance = validCycleTimes.length > 0 
      ? machineStatuses.filter(ms => ms.tiempo_ciclo_actual && ms.tiempo_ciclo_estandar)
          .map(ms => (ms.tiempo_ciclo_estandar / ms.tiempo_ciclo_actual) * 100)
          .reduce((a, b) => a + b, 0) / validCycleTimes.length
      : 100;

    const oee = (availability * (performance / 100) * (qualityRate / 100));

    return {
      oee,
      availability,
      performance,
      qualityRate,
      avgCycleTime,
      completed,
      delayed,
      inProgress,
      pending,
      approvedCount,
      rejectedCount,
      totalInspected
    };
  }, [workOrders, machineStatuses, inspections, machines, dateRange, selectedMachine]);

  // Production by Machine
  const productionByMachine = useMemo(() => {
    const data = machines.map(machine => {
      const machineOrders = workOrders.filter(wo => wo.machine_id === machine.id);
      return {
        name: machine.nombre,
        completadas: machineOrders.filter(o => o.status === "Completada").length,
        enProgreso: machineOrders.filter(o => o.status === "En Progreso").length,
        atrasadas: machineOrders.filter(o => o.status === "Retrasada").length,
      };
    }).filter(d => d.completadas + d.enProgreso + d.atrasadas > 0);
    
    return data.slice(0, 10);
  }, [machines, workOrders]);

  // Production by Process
  const productionByProcess = useMemo(() => {
    const data = processes.map(process => {
      const processOrders = workOrders.filter(wo => wo.process_id === process.id);
      return {
        name: process.nombre,
        value: processOrders.length,
      };
    }).filter(d => d.value > 0);
    
    return data;
  }, [processes, workOrders]);

  // Workload by Machine
  const workloadData = useMemo(() => {
    return machines.map(machine => {
      const pending = workOrders.filter(wo => 
        wo.machine_id === machine.id && 
        (wo.status === "Pendiente" || wo.status === "En Progreso")
      ).length;
      
      return {
        name: machine.nombre,
        carga: pending,
      };
    }).filter(d => d.carga > 0).sort((a, b) => b.carga - a.carga).slice(0, 8);
  }, [machines, workOrders]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-4 md:space-y-6">
      <Breadcrumbs items={[
        { label: "Producción", url: createPageUrl("ProductionDashboard") },
        { label: "Dashboard" }
      ]} />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <Factory className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
            Dashboard de Producción
          </h1>
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-1">
            Métricas clave y análisis de rendimiento en tiempo real
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full sm:w-auto">
          <Select value={selectedMachine} onValueChange={setSelectedMachine}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Todas las máquinas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las máquinas</SelectItem>
              {machines.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="7days">Últimos 7 días</SelectItem>
              <SelectItem value="30days">Últimos 30 días</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">OEE (Overall Equipment Effectiveness)</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">{kpis.oee.toFixed(1)}%</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {kpis.oee >= 85 ? "Excelente" : kpis.oee >= 70 ? "Bueno" : "Mejorable"}
                </p>
              </div>
              <Gauge className="w-8 h-8 md:w-12 md:h-12 text-blue-600 dark:text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 dark:text-green-300 font-medium">Disponibilidad</p>
                <p className="text-2xl md:text-3xl font-bold text-green-900 dark:text-green-100">{kpis.availability.toFixed(1)}%</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {machines.length} máquinas
                </p>
              </div>
              <Activity className="w-8 h-8 md:w-12 md:h-12 text-green-600 dark:text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">Tiempo Ciclo Promedio</p>
                <p className="text-2xl md:text-3xl font-bold text-purple-900 dark:text-purple-100">{kpis.avgCycleTime.toFixed(1)}</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">minutos</p>
              </div>
              <Clock className="w-8 h-8 md:w-12 md:h-12 text-purple-600 dark:text-purple-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">Tasa de Calidad</p>
                <p className="text-2xl md:text-3xl font-bold text-orange-900 dark:text-orange-100">{kpis.qualityRate.toFixed(1)}%</p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  {kpis.approvedCount}/{kpis.totalInspected} aprobadas
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 md:w-12 md:h-12 text-orange-600 dark:text-orange-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Órdenes de Trabajo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Completadas</p>
                <p className="text-2xl font-bold text-green-600">{kpis.completed}</p>
              </div>
              <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">En Progreso</p>
                <p className="text-2xl font-bold text-blue-600">{kpis.inProgress}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Atrasadas</p>
                <p className="text-2xl font-bold text-red-600">{kpis.delayed}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pendientes</p>
                <p className="text-2xl font-bold text-slate-600">{kpis.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-slate-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Production by Machine */}
        <Card className="dark:bg-card/80">
          <CardHeader>
            <CardTitle className="text-base md:text-lg dark:text-slate-100">Producción por Máquina</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={300} className="min-w-[300px]">
              <BarChart data={productionByMachine}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completadas" fill="#10b981" name="Completadas" />
                <Bar dataKey="enProgreso" fill="#3b82f6" name="En Progreso" />
                <Bar dataKey="atrasadas" fill="#ef4444" name="Atrasadas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Production by Process */}
        <Card className="dark:bg-card/80">
          <CardHeader>
            <CardTitle className="text-base md:text-lg dark:text-slate-100">Distribución por Proceso</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={300} className="min-w-[300px]">
              <PieChart>
                <Pie
                  data={productionByProcess}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {productionByProcess.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Workload Analysis */}
        <Card className="dark:bg-card/80">
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2 dark:text-slate-100">
              <Package className="w-5 h-5 text-purple-600" />
              Carga de Trabajo por Máquina
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {workloadData.length === 0 ? (
              <p className="text-center text-slate-400 dark:text-slate-500 py-8">Sin datos de carga</p>
            ) : (
              <ResponsiveContainer width="100%" height={300} className="min-w-[300px]">
                <BarChart data={workloadData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="carga" fill="#8b5cf6" name="Órdenes Pendientes" />
                </BarChart>
              </ResponsiveContainer>
            )}
            {workloadData.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-semibold text-amber-800">
                  ⚠️ Posibles Cuellos de Botella:
                </p>
                <ul className="text-xs text-amber-700 mt-2 space-y-1">
                  {workloadData.slice(0, 3).map((item, idx) => (
                    <li key={idx}>• {item.name}: {item.carga} órdenes pendientes</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quality Indicators */}
        <Card className="dark:bg-card/80">
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2 dark:text-slate-100">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Indicadores de Calidad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-2xl font-bold text-green-700">{kpis.approvedCount}</p>
                <p className="text-xs text-green-600">Aprobadas</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-2xl font-bold text-red-700">{kpis.rejectedCount}</p>
                <p className="text-xs text-red-600">Rechazadas</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-2xl font-bold text-slate-700">{kpis.totalInspected}</p>
                <p className="text-xs text-slate-600">Total</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Tasa de Aprobación</span>
                <span className="text-lg font-bold text-green-600">{kpis.qualityRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all"
                  style={{ width: `${kpis.qualityRate}%` }}
                />
              </div>
            </div>

            {kpis.rejectedCount > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  {inspections.filter(i => i.rework_required && !i.rework_completed).length} retrabajos pendientes
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Machine Performance Details */}
      <Card className="dark:bg-card/80">
        <CardHeader>
          <CardTitle className="text-base md:text-lg dark:text-slate-100">Rendimiento de Máquinas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {machines.map(machine => {
              const status = machineStatuses.find(ms => ms.machine_id === machine.id);
              const isAvailable = status?.estado_disponibilidad === "Disponible";
              const cycleDeviation = status?.tiempo_ciclo_actual && status?.tiempo_ciclo_estandar
                ? ((status.tiempo_ciclo_actual - status.tiempo_ciclo_estandar) / status.tiempo_ciclo_estandar) * 100
                : 0;
              
              return (
                <Card key={machine.id} className={`border-2 ${isAvailable ? 'border-green-300 dark:border-green-700' : 'border-red-300 dark:border-red-700'} dark:bg-card/60`}>
                  <CardContent className="p-3 md:p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-sm">{machine.nombre}</h4>
                        <p className="text-xs text-slate-500">{machine.codigo}</p>
                      </div>
                      <Badge className={isAvailable ? "bg-green-600" : "bg-red-600"}>
                        {isAvailable ? "Disponible" : "No disponible"}
                      </Badge>
                    </div>
                    
                    {status?.estado_produccion && status.estado_produccion !== "Sin orden" && (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Estado:</span>
                          <Badge variant="outline">{status.estado_produccion}</Badge>
                        </div>
                        
                        {status.lotes_producidos > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Lotes:</span>
                            <span className="font-semibold">{status.lotes_producidos}</span>
                          </div>
                        )}
                        
                        {status.tiempo_ciclo_actual && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Tiempo ciclo:</span>
                            <span className={`font-semibold ${cycleDeviation > 20 ? 'text-red-600' : 'text-green-600'}`}>
                              {status.tiempo_ciclo_actual.toFixed(1)} min
                              {cycleDeviation !== 0 && (
                                <span className="text-[10px] ml-1">
                                  ({cycleDeviation > 0 ? '+' : ''}{cycleDeviation.toFixed(0)}%)
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}