import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserCheck, 
  UserX, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  FileText,
  Bell,
  UserPlus
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, differenceInDays, isWithinInterval, addDays } from "date-fns";
import { es } from "date-fns/locale";
import PendingTasksPanel from "../components/hr/PendingTasksPanel";
import ThemeToggle from "../components/common/ThemeToggle";

export default function HRDashboard() {
  const { data: masterEmployees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('-created_date'),
    initialData: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: absences = [] } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-created_date'),
    initialData: [],
  });

  const { data: vacationBalances = [] } = useQuery({
    queryKey: ['vacationPendingBalances'],
    queryFn: () => base44.entities.VacationPendingBalance.list(),
    initialData: [],
  });

  const { data: onboardingProcesses = [] } = useQuery({
    queryKey: ['employeeOnboarding'],
    queryFn: () => base44.entities.EmployeeOnboarding.list(),
    initialData: [],
  });

  // KPIs calculation
  const kpis = useMemo(() => {
    const total = masterEmployees.length;
    const activos = masterEmployees.filter(e => (e.estado_empleado || "Alta") === "Alta").length;
    
    // Disponibles (activos sin ausencia actual)
    const disponibles = masterEmployees.filter(e => {
      if ((e.estado_empleado || "Alta") !== "Alta") return false;
      return (e.disponibilidad || "Disponible") === "Disponible";
    }).length;

    // Ausencias activas
    const today = new Date();
    const ausenciasActivas = absences.filter(a => {
      if (!a.fecha_inicio) return false;
      try {
        const inicio = new Date(a.fecha_inicio);
        if (isNaN(inicio.getTime())) return false;
        const fin = a.fecha_fin ? new Date(a.fecha_fin) : addDays(today, 365);
        if (isNaN(fin.getTime())) return false;
        return isWithinInterval(today, { start: inicio, end: fin });
      } catch {
        return false;
      }
    }).length;

    // Pendientes de aprobación
    const pendientesAprobacion = absences.filter(a => a.estado === 'Pendiente').length;

    // Saldo vacaciones pendientes
    const totalDiasPendientes = vacationBalances.reduce((sum, vb) => sum + (vb.dias_pendientes || 0), 0);

    // Empleados con días fuerza mayor consumidos
    const empleadosConFuerzaMayor = masterEmployees.filter(e => 
      (e.horas_causa_mayor_consumidas || 0) > 0
    ).length;

    // Procesos onboarding pendientes
    const onboardingPendientes = onboardingProcesses.filter(p => 
      p.estado !== 'Completado' && p.estado !== 'Cancelado'
    ).length;

    return {
      total,
      activos,
      disponibles,
      ausenciasActivas,
      pendientesAprobacion,
      totalDiasPendientes,
      empleadosConFuerzaMayor,
      onboardingPendientes
    };
  }, [masterEmployees, absences, vacationBalances, onboardingProcesses]);

  // Ausencias recientes (últimas 5)
  const recentAbsences = useMemo(() => {
    return absences
      .filter(a => a.estado === 'Pendiente' || a.estado === 'Aprobada')
      .slice(0, 5)
      .map(a => {
        const emp = employees.find(e => e.id === a.employee_id) || 
                    masterEmployees.find(me => me.employee_id === a.employee_id);
        return { ...a, employeeName: emp?.nombre || 'Desconocido' };
      });
  }, [absences, employees, masterEmployees]);

  // Alertas fuerza mayor
  const fuerzaMayorAlerts = useMemo(() => {
    return masterEmployees
      .filter(e => {
        const limite = e.horas_causa_mayor_limite || 0;
        const consumidas = e.horas_causa_mayor_consumidas || 0;
        return limite > 0 && consumidas >= limite * 0.8;
      })
      .slice(0, 5);
  }, [masterEmployees]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Panel de Recursos Humanos
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Resumen ejecutivo y métricas clave
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* KPIs principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all cursor-pointer">
            <Link to={createPageUrl("MasterEmployeeDatabase")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Total Empleados</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{kpis.total}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{kpis.activos} activos</p>
                  </div>
                  <Users className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800 hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 dark:text-green-300 font-medium">Disponibles</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">{kpis.disponibles}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">En plantilla ahora</p>
                </div>
                <UserCheck className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800 hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Ausencias Activas</p>
                  <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">{kpis.ausenciasActivas}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">En este momento</p>
                </div>
                <UserX className="w-10 h-10 text-amber-600 dark:text-amber-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all cursor-pointer">
            <Link to={createPageUrl("AbsenceManagement")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">Pendientes Aprobación</p>
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{kpis.pendientesAprobacion}</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Requieren atención</p>
                  </div>
                  <Clock className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* KPIs secundarios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Días Vacaciones Pendientes</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.totalDiasPendientes}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Alertas Fuerza Mayor</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.empleadosConFuerzaMayor}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500 dark:text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow cursor-pointer">
            <Link to={createPageUrl("EmployeeOnboarding")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Onboarding Pendientes</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.onboardingPendientes}</p>
                  </div>
                  <UserPlus className="w-8 h-8 text-green-500 dark:text-green-400" />
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gestión de Ausencias - Destacado */}
          <Card className="shadow-lg border-2 border-blue-300 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-slate-900">
            <CardHeader className="border-b border-blue-200 dark:border-blue-800">
              <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <UserX className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                Gestión de Ausencias
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-slate-700 mb-4">
                Gestiona y aprueba solicitudes de ausencias, permisos y bajas laborales
              </p>
              <Link to={createPageUrl("AbsenceManagement")}>
                <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                  <FileText className="w-5 h-5 mr-2" />
                  Ir a Gestión de Ausencias
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Últimas Ausencias Solicitadas */}
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 dark:text-slate-100">
                  <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  Últimas Solicitudes
                </CardTitle>
                <Link to={createPageUrl("AbsenceManagement")}>
                  <Button variant="ghost" size="sm">Ver todas</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {recentAbsences.length === 0 ? (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm">
                  No hay solicitudes recientes
                </p>
              ) : (
                <div className="space-y-3">
                  {recentAbsences.map((absence) => (
                    <div key={absence.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {absence.employeeName}
                        </span>
                        <Badge className={
                          absence.estado === 'Pendiente' ? 'bg-amber-600 dark:bg-amber-700' :
                          absence.estado === 'Aprobada' ? 'bg-green-600 dark:bg-green-700' :
                          'bg-slate-600 dark:bg-slate-700'
                        }>
                          {absence.estado}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {absence.tipo_ausencia || 'Sin tipo'} • {' '}
                        {(() => {
                          try {
                            if (!absence.fecha_inicio) return 'Sin fecha';
                            const date = new Date(absence.fecha_inicio);
                            if (isNaN(date.getTime())) return 'Sin fecha';
                            return format(date, "d MMM", { locale: es });
                          } catch {
                            return 'Sin fecha';
                          }
                        })()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Módulo de Procesos Pendientes */}
        <div className="mb-6">
          <PendingTasksPanel 
            masterEmployees={masterEmployees}
            onboardingProcesses={onboardingProcesses}
            absences={absences}
          />
        </div>

        {/* Alertas Fuerza Mayor */}
        {fuerzaMayorAlerts.length > 0 && (
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm mb-6">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-orange-50 dark:bg-orange-950/50">
              <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-200">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                Recordatorio: Control de Días por Fuerza Mayor
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-slate-700 mb-3">
                Los siguientes empleados han consumido más del 80% de su límite anual
              </p>
              <div className="space-y-2">
                {fuerzaMayorAlerts.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-200">
                    <span className="text-sm font-medium text-slate-900">{emp.nombre}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-orange-100 text-orange-800">
                        {emp.horas_causa_mayor_consumidas || 0}h / {emp.horas_causa_mayor_limite || 0}h
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Accesos rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to={createPageUrl("MasterEmployeeDatabase")}>
            <Card className="hover:shadow-lg transition-all cursor-pointer border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Base de Datos Maestra</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Gestión completa de empleados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("AdvancedHRDashboard")}>
            <Card className="hover:shadow-lg transition-all cursor-pointer border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Dashboard Avanzado</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Análisis y tendencias</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("EmployeeOnboarding")}>
            <Card className="hover:shadow-lg transition-all cursor-pointer border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-8 h-8 text-green-600 dark:text-green-400" />
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Onboarding</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Procesos de incorporación</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}