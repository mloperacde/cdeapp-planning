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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: absences = [] } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list(),
    initialData: [],
  });

  const { data: maintenances = [] } = useQuery({
    queryKey: ['maintenances'],
    queryFn: () => base44.entities.MaintenanceSchedule.list(),
    initialData: [],
  });

  const { data: productionPlannings = [] } = useQuery({
    queryKey: ['dailyProductionPlannings'],
    queryFn: () => base44.entities.DailyProductionPlanning.list(),
    initialData: [],
  });

  const { data: widgetPreferences = [] } = useQuery({
    queryKey: ['dashboardWidgets', user?.email],
    queryFn: () => base44.entities.DashboardWidget.list(),
    initialData: [],
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

  // Get enabled widgets
  const enabledWidgets = useMemo(() => {
    if (!user) return AVAILABLE_WIDGETS;
    
    const userPrefs = Array.isArray(widgetPreferences) 
      ? widgetPreferences.filter(w => w?.user_email === user.email && w?.enabled)
      : [];
      
    if (userPrefs.length === 0) return AVAILABLE_WIDGETS;
    
    return AVAILABLE_WIDGETS.filter(w => 
      userPrefs.some(p => p?.widget_id === w?.id)
    ).sort((a, b) => {
      const orderA = userPrefs.find(p => p?.widget_id === a?.id)?.order || 0;
      const orderB = userPrefs.find(p => p?.widget_id === b?.id)?.order || 0;
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
          <Card key={widget.id} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-red-600" />
                KPIs de Ausencias
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-3xl font-bold text-red-900">{activeAbsences.length}</div>
                  <div className="text-sm text-red-700">Ausencias Activas</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-3xl font-bold text-orange-900">{criticalAbsences.length}</div>
                  <div className="text-sm text-orange-700">Críticas</div>
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
          <Card key={widget.id} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Planning Diario (Hoy)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">{todayPlanningSummary.total}</div>
                  <div className="text-xs text-blue-700">Total</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">{todayPlanningSummary.completed}</div>
                  <div className="text-xs text-green-700">Completados</div>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <div className="text-2xl font-bold text-amber-900">{todayPlanningSummary.inProgress}</div>
                  <div className="text-xs text-amber-700">En Curso</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900">{todayPlanningSummary.pending}</div>
                  <div className="text-xs text-slate-700">Pendientes</div>
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
          <Card key={widget.id} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <Cog className="w-5 h-5 text-green-600" />
                Estado de Máquinas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-green-900">Disponibles</span>
                  <Badge className="bg-green-600 text-white text-lg px-3">
                    {machineStats.available}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium text-red-900">No Disponibles</span>
                  <Badge className="bg-red-600 text-white text-lg px-3">
                    {machineStats.unavailable}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-blue-900">Total</span>
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
          <Card key={widget.id} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <Cake className="w-5 h-5 text-purple-600" />
                Próximos Cumpleaños
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {upcomingBirthdays.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No hay cumpleaños próximos</p>
              ) : (
                <div className="space-y-2">
                  {upcomingBirthdays.map(emp => {
                    const birthDate = new Date(emp.fecha_nacimiento);
                    const thisYearBirthday = new Date(new Date().getFullYear(), birthDate.getMonth(), birthDate.getDate());
                    const isToday = isSameDay(thisYearBirthday, new Date());
                    
                    return (
                      <div key={emp.id} className={`p-2 rounded-lg ${isToday ? 'bg-purple-100 border-2 border-purple-400' : 'bg-slate-50'}`}>
                        <div className="font-semibold text-sm">{emp.nombre}</div>
                        <div className="text-xs text-slate-600">
                          {format(thisYearBirthday, "d 'de' MMMM", { locale: es })}
                          {isToday && <span className="ml-2 font-bold text-purple-700">¡HOY!</span>}
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
          <Card key={widget.id} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-600" />
                Alertas de Mantenimiento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {maintenanceAlerts.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No hay alertas pendientes</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {maintenanceAlerts.slice(0, 5).map(maint => (
                    <div key={maint.id} className="p-2 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="text-sm font-semibold text-orange-900">
                        {machines.find(m => m?.id === maint?.machine_id)?.nombre || 'Máquina'}
                      </div>
                      <div className="text-xs text-orange-700">
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
          <Card key={widget.id} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Resumen de Equipos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                  <span className="text-sm font-medium text-indigo-900">Total Empleados</span>
                  <Badge className="bg-indigo-600 text-white text-lg px-3">
                    {employees.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-green-900">Disponibles</span>
                  <Badge className="bg-green-600 text-white text-lg px-3">
                    {Array.isArray(employees) ? employees.filter(e => e?.disponibilidad === "Disponible").length : 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-blue-900">Fabricación Disponible</span>
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
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              Dashboard Principal
            </h1>
            <p className="text-slate-600 mt-1">
              Resumen de información clave del sistema
            </p>
          </div>
          <Button
            onClick={() => setShowWidgetConfig(true)}
            variant="outline"
            className="bg-white hover:bg-slate-50"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurar Widgets
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enabledWidgets.map(widget => renderWidget(widget))}
        </div>

        {enabledWidgets.length === 0 && (
          <Card className="bg-amber-50 border-2 border-amber-300">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
              <p className="text-amber-900 font-semibold mb-2">
                No hay widgets configurados
              </p>
              <p className="text-amber-800 text-sm mb-4">
                Haz clic en "Configurar Widgets" para seleccionar qué información quieres ver
              </p>
              <Button onClick={() => setShowWidgetConfig(true)}>
                Configurar Ahora
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {showWidgetConfig && (
        <Dialog open={true} onOpenChange={setShowWidgetConfig}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configurar Widgets del Dashboard</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {AVAILABLE_WIDGETS.map(widget => {
                const Icon = widget.icon;
                const isEnabled = enabledWidgets.some(w => w.id === widget.id);
                
                return (
                  <div key={widget.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                    <Checkbox
                      checked={isEnabled}
                      onCheckedChange={(checked) => {
                        // TODO: Save preference to database
                        console.log('Toggle widget:', widget.id, checked);
                      }}
                    />
                    <Icon className="w-5 h-5 text-slate-600" />
                    <Label className="flex-1 cursor-pointer">
                      {widget.name}
                    </Label>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowWidgetConfig(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setShowWidgetConfig(false)}>
                Guardar Configuración
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}