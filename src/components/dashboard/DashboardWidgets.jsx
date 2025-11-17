import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Cake, Calendar, Building2, FileText, UserPlus, Award } from "lucide-react";
import { format, isSameDay, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import TaskWidget from "../tasks/TaskWidget";

export default function DashboardWidgets({ dashboardConfig, employees }) {
  const { data: absences = [] } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: [],
  });

  const { data: vacationBalances = [] } = useQuery({
    queryKey: ['vacationBalances'],
    queryFn: () => base44.entities.AbsenceDaysBalance.list(),
    initialData: [],
  });

  const { data: onboardings = [] } = useQuery({
    queryKey: ['onboardings'],
    queryFn: () => base44.entities.EmployeeOnboarding.list(),
    initialData: [],
  });

  const isWidgetVisible = (widgetId) => {
    if (!dashboardConfig) return true;
    return dashboardConfig.widgets_visibles?.includes(widgetId);
  };

  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return employees.filter(emp => {
      if (!emp.fecha_nacimiento) return false;
      const birthDate = new Date(emp.fecha_nacimiento);
      const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      return isSameDay(thisYearBirthday, today) || (thisYearBirthday >= today && thisYearBirthday <= nextWeek);
    }).slice(0, 5);
  }, [employees]);

  const vacationSummary = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const thisYearBalances = vacationBalances.filter(v => v.anio === currentYear && v.tipo_permiso === "Vacaciones");
    return {
      totalDays: thisYearBalances.reduce((sum, v) => sum + (v.dias_totales_derecho || 0), 0),
      consumedDays: thisYearBalances.reduce((sum, v) => sum + (v.dias_disfrutados || 0), 0),
      pendingDays: thisYearBalances.reduce((sum, v) => sum + (v.dias_pendientes || 0), 0)
    };
  }, [vacationBalances]);

  const employeesByDepartment = useMemo(() => {
    const byDept = {};
    employees.forEach(emp => {
      const dept = emp.departamento || 'Sin Departamento';
      if (!byDept[dept]) byDept[dept] = { total: 0, available: 0 };
      byDept[dept].total++;
      if (emp.disponibilidad === "Disponible") byDept[dept].available++;
    });
    return Object.entries(byDept).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
  }, [employees]);

  const pendingAbsences = useMemo(() => {
    return absences.filter(abs => abs.estado_aprobacion === "Pendiente");
  }, [absences]);

  const activeOnboardings = useMemo(() => {
    return onboardings.filter(o => o.estado !== "Completado");
  }, [onboardings]);

  const expiringContracts = useMemo(() => {
    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(now.getMonth() + 3);
    
    return employees.filter(emp => {
      if (!emp.fecha_fin_contrato) return false;
      const endDate = new Date(emp.fecha_fin_contrato);
      return endDate >= now && endDate <= threeMonthsFromNow;
    }).sort((a, b) => new Date(a.fecha_fin_contrato) - new Date(b.fecha_fin_contrato));
  }, [employees]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {isWidgetVisible("tareas") && <TaskWidget />}

      {isWidgetVisible("cumpleanos") && (
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Cake className="w-5 h-5 text-purple-600" />
              Próximos Cumpleaños
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {upcomingBirthdays.length === 0 ? (
              <p className="text-center text-slate-500 py-4">No hay cumpleaños esta semana</p>
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
                        {isToday && <Badge className="ml-2 bg-purple-600">¡HOY!</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isWidgetVisible("vacaciones") && (
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Resumen de Vacaciones {new Date().getFullYear()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-900">Días Totales</span>
                <Badge className="bg-blue-600 text-white text-lg px-3">
                  {vacationSummary.totalDays}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-red-900">Días Consumidos</span>
                <Badge className="bg-red-600 text-white text-lg px-3">
                  {vacationSummary.consumedDays}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-900">Días Pendientes</span>
                <Badge className="bg-green-600 text-white text-lg px-3">
                  {vacationSummary.pendingDays}
                </Badge>
              </div>
            </div>
            <Link to={createPageUrl("AbsenceManagement")}>
              <Button className="w-full" variant="outline">Ver Detalles</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {isWidgetVisible("departamentos") && (
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Distribución por Departamento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-2">
              {employeesByDepartment.map(([dept, stats], index) => (
                <div key={dept} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-blue-${(index + 1) * 100}`} />
                    <span className="text-sm font-medium text-slate-700">{dept}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{stats.total}</Badge>
                    <Badge className="bg-green-600 text-white text-xs">{stats.available} disp.</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isWidgetVisible("onboarding") && (
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              Estado de Onboarding
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-3xl font-bold text-emerald-900">{activeOnboardings.length}</div>
              <div className="text-sm text-emerald-700">En Proceso</div>
            </div>
            <Link to={createPageUrl("EmployeeOnboarding")}>
              <Button className="w-full" variant="outline">Ver Onboarding</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {isWidgetVisible("solicitudes_ausencia") && (
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              Solicitudes Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {pendingAbsences.length === 0 ? (
              <p className="text-center text-slate-500 py-4">No hay solicitudes pendientes</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pendingAbsences.slice(0, 3).map(abs => {
                  const emp = employees.find(e => e.id === abs.employee_id);
                  return (
                    <div key={abs.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="font-semibold text-sm text-amber-900">{emp?.nombre || 'Empleado'}</p>
                      <p className="text-xs text-amber-700">
                        {abs.motivo} • {format(new Date(abs.fecha_inicio), "d MMM", { locale: es })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
            <Link to={createPageUrl("AbsenceManagement")}>
              <Button className="w-full mt-4" variant="outline">Gestionar Ausencias</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {isWidgetVisible("contratos_vencer") && (
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-red-600" />
              Contratos por Vencer
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {expiringContracts.length === 0 ? (
              <p className="text-center text-slate-500 py-4">No hay contratos próximos a vencer</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {expiringContracts.slice(0, 3).map(emp => {
                  const daysUntil = differenceInDays(new Date(emp.fecha_fin_contrato), new Date());
                  return (
                    <div key={emp.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="font-semibold text-sm text-red-900">{emp.nombre}</p>
                      <p className="text-xs text-red-700">
                        {format(new Date(emp.fecha_fin_contrato), "d MMM yyyy", { locale: es })} ({daysUntil} días)
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isWidgetVisible("aniversarios") && (
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" />
              Aniversarios Laborales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-center text-slate-500 py-4">Widget en construcción</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}