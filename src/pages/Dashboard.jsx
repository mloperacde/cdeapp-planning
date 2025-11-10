import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { 
  Users, 
  Cog, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Activity,
  Calendar,
  Wrench
} from "lucide-react";
import { format, differenceInDays, isPast, isFuture } from "date-fns";
import { es } from "date-fns/locale";

export default function DashboardPage() {
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list(),
    initialData: [],
  });

  const { data: plannings } = useQuery({
    queryKey: ['machinePlannings'],
    queryFn: () => base44.entities.MachinePlanning.list(),
    initialData: [],
  });

  const { data: maintenances } = useQuery({
    queryKey: ['maintenances'],
    queryFn: () => base44.entities.MaintenanceSchedule.list(),
    initialData: [],
  });

  const { data: absences } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  // KPIs
  const kpis = useMemo(() => {
    const availableEmployees = employees.filter(e => e.disponibilidad === "Disponible").length;
    const absentEmployees = employees.filter(e => e.disponibilidad === "Ausente").length;
    const availableMachines = machines.filter(m => m.estado === "Disponible").length;
    const unavailableMachines = machines.filter(m => m.estado === "No disponible").length;
    
    const pendingMaintenances = maintenances.filter(m => m.estado === "Pendiente").length;
    const upcomingMaintenances = maintenances.filter(m => {
      if (m.estado !== "Pendiente") return false;
      const daysUntil = differenceInDays(new Date(m.fecha_programada), new Date());
      return daysUntil <= 7 && daysUntil >= 0;
    }).length;

    const activeAbsences = absences.filter(a => {
      const now = new Date();
      return now >= new Date(a.fecha_inicio) && now <= new Date(a.fecha_fin);
    }).length;

    const todayPlannings = plannings.filter(p => 
      p.activa_planning && 
      p.fecha_planificacion === format(new Date(), 'yyyy-MM-dd')
    ).length;

    return {
      availableEmployees,
      absentEmployees,
      totalEmployees: employees.length,
      availableMachines,
      unavailableMachines,
      totalMachines: machines.length,
      pendingMaintenances,
      upcomingMaintenances,
      activeAbsences,
      todayPlannings,
      employeeAvailabilityRate: employees.length > 0 ? (availableEmployees / employees.length * 100).toFixed(1) : 0,
      machineAvailabilityRate: machines.length > 0 ? (availableMachines / machines.length * 100).toFixed(1) : 0,
    };
  }, [employees, machines, maintenances, absences, plannings]);

  // Datos para gráficos
  const employeesByTeam = useMemo(() => {
    return teams.map(team => ({
      name: team.team_name,
      disponibles: employees.filter(e => e.equipo === team.team_name && e.disponibilidad === "Disponible").length,
      ausentes: employees.filter(e => e.equipo === team.team_name && e.disponibilidad === "Ausente").length,
    }));
  }, [employees, teams]);

  const maintenanceByStatus = useMemo(() => {
    return [
      { name: "Pendiente", value: maintenances.filter(m => m.estado === "Pendiente").length, color: "#FCD34D" },
      { name: "En Progreso", value: maintenances.filter(m => m.estado === "En Progreso").length, color: "#60A5FA" },
      { name: "Completado", value: maintenances.filter(m => m.estado === "Completado").length, color: "#34D399" },
      { name: "Cancelado", value: maintenances.filter(m => m.estado === "Cancelado").length, color: "#94A3B8" },
    ].filter(item => item.value > 0);
  }, [maintenances]);

  const planningTrend = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = format(date, 'yyyy-MM-dd');
      const activeMachines = plannings.filter(p => 
        p.activa_planning && p.fecha_planificacion === dateStr
      ).length;
      
      return {
        fecha: format(date, 'dd/MM', { locale: es }),
        maquinas: activeMachines,
      };
    });
    return last7Days;
  }, [plannings]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            Panel de Control
          </h1>
          <p className="text-slate-600 mt-1">
            Resumen de métricas clave y estado general del sistema
          </p>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Empleados Disponibles</p>
                  <p className="text-2xl font-bold text-blue-900">{kpis.availableEmployees}</p>
                  <p className="text-xs text-blue-600 mt-1">{kpis.employeeAvailabilityRate}% disponibilidad</p>
                </div>
                <Users className="w-10 h-10 text-blue-600 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Máquinas Disponibles</p>
                  <p className="text-2xl font-bold text-green-900">{kpis.availableMachines}</p>
                  <p className="text-xs text-green-600 mt-1">{kpis.machineAvailabilityRate}% operativas</p>
                </div>
                <Cog className="w-10 h-10 text-green-600 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-700 font-medium">Mantenimientos Próximos</p>
                  <p className="text-2xl font-bold text-orange-900">{kpis.upcomingMaintenances}</p>
                  <p className="text-xs text-orange-600 mt-1">En los próximos 7 días</p>
                </div>
                <Wrench className="w-10 h-10 text-orange-600 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-700 font-medium">Máquinas Planificadas Hoy</p>
                  <p className="text-2xl font-bold text-purple-900">{kpis.todayPlannings}</p>
                  <p className="text-xs text-purple-600 mt-1">Activas en producción</p>
                </div>
                <Calendar className="w-10 h-10 text-purple-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas Críticas */}
        {(kpis.absentEmployees > 5 || kpis.upcomingMaintenances > 3 || kpis.unavailableMachines > 2) && (
          <Card className="mb-6 bg-red-50 border-2 border-red-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="w-5 h-5" />
                Alertas Críticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {kpis.absentEmployees > 5 && (
                  <div className="flex items-center gap-2 text-sm text-red-800">
                    <AlertTriangle className="w-4 h-4" />
                    Alto número de ausencias: {kpis.absentEmployees} empleados ausentes
                  </div>
                )}
                {kpis.upcomingMaintenances > 3 && (
                  <div className="flex items-center gap-2 text-sm text-red-800">
                    <Clock className="w-4 h-4" />
                    Múltiples mantenimientos próximos: {kpis.upcomingMaintenances} en los próximos 7 días
                  </div>
                )}
                {kpis.unavailableMachines > 2 && (
                  <div className="flex items-center gap-2 text-sm text-red-800">
                    <AlertTriangle className="w-4 h-4" />
                    Máquinas no disponibles: {kpis.unavailableMachines} fuera de servicio
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfico de Empleados por Equipo */}
          <Card>
            <CardHeader>
              <CardTitle>Disponibilidad por Equipo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={employeesByTeam}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="disponibles" fill="#10B981" name="Disponibles" />
                  <Bar dataKey="ausentes" fill="#EF4444" name="Ausentes" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Mantenimientos */}
          <Card>
            <CardHeader>
              <CardTitle>Estado de Mantenimientos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={maintenanceByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {maintenanceByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tendencia de Planificación */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Tendencia de Planificación (Últimos 7 Días)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={planningTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="maquinas" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Máquinas Activas"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Resumen de Estado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado de Empleados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total</span>
                  <Badge variant="outline">{kpis.totalEmployees}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Disponibles</span>
                  <Badge className="bg-green-100 text-green-800">{kpis.availableEmployees}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Ausentes</span>
                  <Badge className="bg-red-100 text-red-800">{kpis.absentEmployees}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Ausencias Activas</span>
                  <Badge className="bg-orange-100 text-orange-800">{kpis.activeAbsences}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado de Máquinas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total</span>
                  <Badge variant="outline">{kpis.totalMachines}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Disponibles</span>
                  <Badge className="bg-green-100 text-green-800">{kpis.availableMachines}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">No Disponibles</span>
                  <Badge className="bg-red-100 text-red-800">{kpis.unavailableMachines}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Planificadas Hoy</span>
                  <Badge className="bg-purple-100 text-purple-800">{kpis.todayPlannings}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado de Mantenimientos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Pendientes</span>
                  <Badge className="bg-yellow-100 text-yellow-800">{kpis.pendingMaintenances}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Próximos (7 días)</span>
                  <Badge className="bg-orange-100 text-orange-800">{kpis.upcomingMaintenances}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">En Progreso</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {maintenances.filter(m => m.estado === "En Progreso").length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Completados</span>
                  <Badge className="bg-green-100 text-green-800">
                    {maintenances.filter(m => m.estado === "Completado").length}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}