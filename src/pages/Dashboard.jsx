import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Users,
  UserX,
  Cog,
  AlertTriangle,
  Calendar,
  Wrench,
  Settings,
  TrendingUp,
  Cake,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { format, differenceInDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DashboardWidgetConfig from "../components/dashboard/DashboardWidgetConfig";
import WorkCalendar from "../components/absences/WorkCalendar";
import HolidayVacationPanel from "../components/absences/HolidayVacationPanel";
import ProductionMonitor from "../components/machines/ProductionMonitor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const EMPTY_ARRAY = [];

const AVAILABLE_WIDGETS = [
  { id: 'absence_kpis', name: 'KPIs de Ausencias', icon: UserX, color: 'red' },
  { id: 'daily_planning_summary', name: 'Resumen Planning Diario', icon: Calendar, color: 'blue' },
  { id: 'machine_status', name: 'Estado de Máquinas', icon: Cog, color: 'green' },
  { id: 'upcoming_birthdays', name: 'Próximos Cumpleaños', icon: Cake, color: 'purple' },
  { id: 'maintenance_alerts', name: 'Alertas de Mantenimiento', icon: Wrench, color: 'orange' },
  { id: 'team_summary', name: 'Resumen de Equipos', icon: Users, color: 'indigo' }
];

export default function DashboardPage() {
  const [showWidgetConfig, setShowWidgetConfig] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: absences = EMPTY_ARRAY } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: EMPTY_ARRAY,
  });

  const { data: employees = EMPTY_ARRAY } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: EMPTY_ARRAY,
  });

  const { data: machines = EMPTY_ARRAY } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list(),
    initialData: EMPTY_ARRAY,
  });

  const { data: maintenances = EMPTY_ARRAY } = useQuery({
    queryKey: ['maintenances'],
    queryFn: () => base44.entities.MaintenanceSchedule.list(),
    initialData: EMPTY_ARRAY,
  });

  const { data: productionPlannings = EMPTY_ARRAY } = useQuery({
    queryKey: ['dailyProductionPlannings'],
    queryFn: () => base44.entities.DailyProductionPlanning.list(),
    initialData: EMPTY_ARRAY,
  });

  const { data: widgetPreferences = EMPTY_ARRAY } = useQuery({
    queryKey: ['dashboardWidgets', user?.role],
    queryFn: async () => {
      if (!user?.role) return EMPTY_ARRAY;
      return base44.entities.DashboardWidget.filter({ role: user.role }, 'order');
    },
    initialData: EMPTY_ARRAY,
    enabled: !!user,
  });

  // Active absences
  const activeAbsences = useMemo(() => {
    if (!Array.isArray(absences)) return [];
    const now = new Date();
    return absences.filter(abs => {
      if (!abs?.fecha_inicio || !abs?.fecha_fin) return false;
      const start = new Date(abs.fecha_inicio);
      const end = new Date(abs.fecha_fin);
      return now >= start && now <= end;
    });
  }, [absences]);

  // Critical absences
  const criticalAbsences = useMemo(() => {
    if (!Array.isArray(activeAbsences)) return [];
    return activeAbsences.filter(abs => 
      abs?.tipo === "Baja médica" || abs?.tipo === "Ausencia injustificada"
    );
  }, [activeAbsences]);

  // Machine stats
  const machineStats = useMemo(() => {
    if (!Array.isArray(machines)) return { available: 0, unavailable: 0, total: 0 };
    const available = machines.filter(m => m?.estado === "Disponible").length;
    const unavailable = machines.length - available;
    return { available, unavailable, total: machines.length };
  }, [machines]);

  // Maintenance alerts
  const maintenanceAlerts = useMemo(() => {
    if (!Array.isArray(maintenances)) return [];
    const now = new Date();
    return maintenances.filter(m => {
      if (!m || m.estado !== "Pendiente" || !m.fecha_programada) return false;
      const scheduledDate = new Date(m.fecha_programada);
      const daysUntil = differenceInDays(scheduledDate, now);
      return daysUntil <= 7 && daysUntil >= 0;
    });
  }, [maintenances]);

  // Upcoming birthdays
  const upcomingBirthdays = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return employees.filter(emp => {
      if (!emp?.fecha_nacimiento) return false;
      const birthDate = new Date(emp.fecha_nacimiento);
      const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      
      if (isSameDay(thisYearBirthday, today)) return true;
      return thisYearBirthday >= today && thisYearBirthday <= nextWeek;
    }).slice(0, 5);
  }, [employees]);

  // Today's planning summary
  const todayPlanningSummary = useMemo(() => {
    if (!Array.isArray(productionPlannings)) return { total: 0, completed: 0, inProgress: 0, pending: 0 };
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayPlannings = productionPlannings.filter(p => p?.fecha === today);
    
    return {
      total: todayPlannings.length,
      completed: todayPlannings.filter(p => p?.estado === "Completado").length,
      inProgress: todayPlannings.filter(p => p?.estado === "En Curso").length,
      pending: todayPlannings.filter(p => p?.estado === "Planificado").length
    };
  }, [productionPlannings]);

  // Get enabled widgets based on role configuration
  const enabledWidgets = useMemo(() => {
    if (!user || !Array.isArray(widgetPreferences)) return AVAILABLE_WIDGETS;
    
    const rolePrefs = widgetPreferences.filter(w => w?.enabled);
      
    if (rolePrefs.length === 0) return AVAILABLE_WIDGETS;
    
    return AVAILABLE_WIDGETS.filter(w => 
      rolePrefs.some(p => p?.widget_id === w?.id)
    ).sort((a, b) => {
      const orderA = rolePrefs.find(p => p?.widget_id === a?.id)?.order || 0;
      const orderB = rolePrefs.find(p => p?.widget_id === b?.id)?.order || 0;
      return orderA - orderB;
    });
  }, [widgetPreferences, user]);

  const renderWidget = (widget) => {
    if (!widget) return null;
    
    const Icon = widget.icon;
    const colorClasses = {
      red: 'from-red-500 to-red-600',
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      purple: 'from-purple-500 to-purple-600',
      orange: 'from-orange-500 to-orange-600',
      indigo: 'from-indigo-500 to-indigo-600'
    };

    switch (widget.id) {
      case 'absence_kpis':
        return (
          <Card key={widget.id} className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-red-600" />
                KPIs de Ausencias
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-red-900 dark:text-red-100">{activeAbsences.length}</div>
                  <div className="text-sm text-red-700 dark:text-red-300">Ausencias Activas</div>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">{criticalAbsences.length}</div>
                  <div className="text-sm text-orange-700 dark:text-orange-300">Críticas</div>
                </div>
              </div>
              <Link to={createPageUrl("AbsenceManagement")}>
                <Button className="w-full mt-4" variant="outline">
                  Ver Detalles
                </Button>
              </Link>
            </CardContent>
          </Card>
        );

      case 'daily_planning_summary':
        return (
          <Card key={widget.id} className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Planning Diario (Hoy)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{todayPlanningSummary.total}</div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">Total</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">{todayPlanningSummary.completed}</div>
                  <div className="text-xs text-green-700 dark:text-green-300">Completados</div>
                </div>
                <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">{todayPlanningSummary.inProgress}</div>
                  <div className="text-xs text-amber-700 dark:text-amber-300">En Curso</div>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{todayPlanningSummary.pending}</div>
                  <div className="text-xs text-slate-700 dark:text-slate-300">Pendientes</div>
                </div>
              </div>
              <Link to={createPageUrl("DailyPlanning")}>
                <Button className="w-full mt-4" variant="outline">
                  Ir al Planning
                </Button>
              </Link>
            </CardContent>
          </Card>
        );

      case 'machine_status':
        return (
          <Card key={widget.id} className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2">
                <Cog className="w-5 h-5 text-green-600" />
                Estado de Máquinas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-sm font-medium text-green-900 dark:text-green-100">Disponibles</span>
                  <Badge className="bg-green-600 text-white text-lg px-3">
                    {machineStats.available}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="text-sm font-medium text-red-900 dark:text-red-100">No Disponibles</span>
                  <Badge className="bg-red-600 text-white text-lg px-3">
                    {machineStats.unavailable}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Total</span>
                  <Badge className="bg-blue-600 text-white text-lg px-3">
                    {machineStats.total}
                  </Badge>
                </div>
              </div>
              <Link to={createPageUrl("MachineManagement")}>
                <Button className="w-full mt-4" variant="outline">
                  Ver Máquinas
                </Button>
              </Link>
            </CardContent>
          </Card>
        );

      case 'upcoming_birthdays':
        return (
          <Card key={widget.id} className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2">
                <Cake className="w-5 h-5 text-purple-600" />
                Próximos Cumpleaños
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {upcomingBirthdays.length === 0 ? (
                <p className="text-center text-slate-500 dark:text-slate-400 py-4">No hay cumpleaños próximos</p>
              ) : (
                <div className="space-y-2">
                  {upcomingBirthdays.map(emp => {
                    const birthDate = new Date(emp.fecha_nacimiento);
                    const thisYearBirthday = new Date(new Date().getFullYear(), birthDate.getMonth(), birthDate.getDate());
                    const isToday = isSameDay(thisYearBirthday, new Date());
                    
                    return (
                      <div key={emp.id} className={`p-2 rounded-lg ${isToday ? 'bg-purple-100 border-2 border-purple-400' : 'bg-slate-50 dark:bg-slate-800'}`}>
                        <div className="font-semibold text-sm">{emp.nombre}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {format(thisYearBirthday, "d 'de' MMMM", { locale: es })}
                          {isToday && <span className="ml-2 font-bold text-purple-700 dark:text-purple-300">¡HOY!</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'maintenance_alerts':
        return (
          <Card key={widget.id} className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-600" />
                Alertas de Mantenimiento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {maintenanceAlerts.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">No hay alertas pendientes</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {maintenanceAlerts.slice(0, 5).map(maint => (
                    <div key={maint.id} className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200">
                      <div className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                        {machines.find(m => m?.id === maint?.machine_id)?.nombre || 'Máquina'}
                      </div>
                      <div className="text-xs text-orange-700 dark:text-orange-300">
                        {format(new Date(maint.fecha_programada), "d/MM/yyyy")} - {maint.tipo}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link to={createPageUrl("MaintenanceTracking")}>
                <Button className="w-full mt-4" variant="outline">
                  Ver Mantenimientos
                </Button>
              </Link>
            </CardContent>
          </Card>
        );

      case 'team_summary':
        const fabricacionEmployees = Array.isArray(employees) 
          ? employees.filter(e => e?.departamento === "FABRICACION") 
          : [];
        const availableFabricacion = fabricacionEmployees.filter(e => e?.disponibilidad === "Disponible").length;
        
        return (
          <Card key={widget.id} className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Resumen de Equipos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">Total Empleados</span>
                  <Badge className="bg-indigo-600 text-white text-lg px-3">
                    {employees.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-sm font-medium text-green-900 dark:text-green-100">Disponibles</span>
                  <Badge className="bg-green-600 text-white text-lg px-3">
                    {Array.isArray(employees) ? employees.filter(e => e?.disponibilidad === "Disponible").length : 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Fabricación Disponible</span>
                  <Badge className="bg-blue-600 text-white text-lg px-3">
                    {availableFabricacion}/{fabricacionEmployees.length}
                  </Badge>
                </div>
              </div>
              <Link to={createPageUrl("Employees")}>
                <Button className="w-full mt-4" variant="outline">
                  Ver Empleados
                </Button>
              </Link>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white dark:text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              Dashboard Principal
            </h1>
            <p className="text-slate-600 dark:text-slate-400 dark:text-slate-400 mt-1">
              Resumen de información clave del sistema
            </p>
          </div>
          <Button
            onClick={() => setShowWidgetConfig(true)}
            variant="outline"
            className="bg-white hover:bg-slate-50 dark:bg-slate-800"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurar Widgets
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {enabledWidgets.map(widget => renderWidget(widget))}
        </div>

        <ProductionMonitor />

        <div className="mt-8">
          <WorkCalendar year={calendarYear} onYearChange={setCalendarYear} />
        </div>

        <div className="mt-6">
          <HolidayVacationPanel year={calendarYear} />
        </div>


      </div>

      {showWidgetConfig && user && (
        <DashboardWidgetConfig 
          currentUser={user}
          onClose={() => setShowWidgetConfig(false)}
        />
      )}
    </div>
  );
}