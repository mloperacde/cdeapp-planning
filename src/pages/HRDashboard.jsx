import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Clock, AlertTriangle, FileText, Calendar, CheckSquare, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import AbsenceDistributionWidget from "../components/dashboard/AbsenceDistributionWidget";
import AbsenceTrendsWidget from "../components/dashboard/AbsenceTrendsWidget";
import ApprovalTimesWidget from "../components/dashboard/ApprovalTimesWidget";
import PendingTasksPanel from "../components/hr/PendingTasksPanel";

export default function HRDashboardPage() {
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre', 1000),
  });

  const { data: absences = [] } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-fecha_inicio', 1000),
  });

  // Calculate high-level stats
  const stats = useMemo(() => {
    const totalEmployees = employees.filter(e => e.estado_empleado === 'Alta').length;
    
    // Active absences today
    const today = new Date();
    const activeAbsences = absences.filter(abs => {
      const start = new Date(abs.fecha_inicio);
      const end = abs.fecha_fin ? new Date(abs.fecha_fin) : new Date('2099-12-31');
      return today >= start && today <= end;
    });

    const pendingApprovals = absences.filter(a => a.estado_aprobacion === 'Pendiente').length;

    // Turnover calculation (simplified: exits in last 30 days / total employees)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const exits = employees.filter(e => 
      e.estado_empleado === 'Baja' && 
      e.fecha_baja && 
      new Date(e.fecha_baja) >= thirtyDaysAgo
    ).length;

    const turnoverRate = totalEmployees > 0 ? ((exits / totalEmployees) * 100).toFixed(1) : 0;

    return {
      totalEmployees,
      activeAbsences: activeAbsences.length,
      pendingApprovals,
      turnoverRate
    };
  }, [employees, absences]);

  const StatCard = ({ title, value, icon: Icon, color, subtitle, link }) => (
    <Link to={link || "#"} className="block">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-full bg-${color}-100 text-${color}-600`}>
            <Icon className="w-6 h-6" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard de RRHH</h1>
          <p className="text-slate-500 mt-1">Visión general del estado de la plantilla y tareas pendientes</p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl("Reports")}>
            <button className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Informes
            </button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Plantilla Activa" 
          value={stats.totalEmployees} 
          icon={Users} 
          color="blue" 
          link={createPageUrl("Employees")}
        />
        <StatCard 
          title="Ausencias Hoy" 
          value={stats.activeAbsences} 
          icon={Clock} 
          color="orange" 
          link={createPageUrl("AbsenceManagement") + "?tab=dashboard"}
        />
        <StatCard 
          title="Aprobaciones Pendientes" 
          value={stats.pendingApprovals} 
          icon={CheckSquare} 
          color="purple" 
          subtitle="Solicitudes de ausencia"
          link={createPageUrl("AbsenceManagement") + "?tab=approval"}
        />
        <StatCard 
          title="Rotación Mensual" 
          value={`${stats.turnoverRate}%`} 
          icon={AlertTriangle} 
          color={stats.turnoverRate > 5 ? "red" : "green"} 
          subtitle="Últimos 30 días"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 space-y-6">
          <AbsenceTrendsWidget absences={absences} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AbsenceDistributionWidget absences={absences} />
            <ApprovalTimesWidget absences={absences} />
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          <PendingTasksPanel />
          
          <Card>
            <CardHeader>
              <CardTitle>Accesos Rápidos</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2">
              <Link to={createPageUrl("EmployeeOnboarding")}>
                <div className="p-3 border rounded-lg hover:bg-slate-50 flex items-center gap-3 cursor-pointer">
                  <div className="bg-emerald-100 p-2 rounded-md text-emerald-600">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-slate-700">Onboarding</span>
                </div>
              </Link>
              <Link to={createPageUrl("IncentiveManagement")}>
                <div className="p-3 border rounded-lg hover:bg-slate-50 flex items-center gap-3 cursor-pointer">
                  <div className="bg-indigo-100 p-2 rounded-md text-indigo-600">
                    <Award className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-slate-700">Incentivos</span>
                </div>
              </Link>
              <Link to={createPageUrl("WorkCalendarConfig")}>
                <div className="p-3 border rounded-lg hover:bg-slate-50 flex items-center gap-3 cursor-pointer">
                  <div className="bg-blue-100 p-2 rounded-md text-blue-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-slate-700">Calendario Laboral</span>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}