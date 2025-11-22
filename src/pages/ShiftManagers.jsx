import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock,
  Calendar,
  TrendingUp,
  Activity,
  List,
  KeyRound,
  Cog,
  Coffee
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { isWithinInterval, addDays } from "date-fns";

export default function ShiftManagersPage() {
  const { data: masterEmployees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
    initialData: [],
  });

  const { data: absences = [] } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-created_date'),
    initialData: [],
  });

  const stats = useMemo(() => {
    const total = masterEmployees.length;
    const activos = masterEmployees.filter(e => (e.estado_empleado || "Alta") === "Alta").length;
    
    const disponibles = masterEmployees.filter(e => {
      if ((e.estado_empleado || "Alta") !== "Alta") return false;
      return (e.disponibilidad || "Disponible") === "Disponible";
    }).length;

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

    return { total, activos, disponibles, ausenciasActivas };
  }, [masterEmployees, absences]);

  const departmentStats = useMemo(() => {
    const deptMap = new Map();
    masterEmployees.forEach(emp => {
      const dept = emp.departamento || 'Sin departamento';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { total: 0, disponibles: 0 });
      }
      const stat = deptMap.get(dept);
      stat.total++;
      if ((emp.estado_empleado || "Alta") === "Alta" && (emp.disponibilidad || "Disponible") === "Disponible") {
        stat.disponibles++;
      }
    });
    return Array.from(deptMap.entries()).map(([dept, stats]) => ({
      departamento: dept,
      ...stats
    })).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [masterEmployees]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            Panel de Control - Jefes de Turno
          </h1>
          <p className="text-slate-600 mt-1">
            Vista general del estado de la plantilla
          </p>
        </div>

        {/* KPIs principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Total Empleados</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
                  <p className="text-xs text-blue-600 mt-1">{stats.activos} activos</p>
                </div>
                <Users className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Disponibles</p>
                  <p className="text-3xl font-bold text-green-900">{stats.disponibles}</p>
                  <p className="text-xs text-green-600 mt-1">En plantilla ahora</p>
                </div>
                <UserCheck className="w-10 h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 font-medium">Ausencias Activas</p>
                  <p className="text-3xl font-bold text-amber-900">{stats.ausenciasActivas}</p>
                  <p className="text-xs text-amber-600 mt-1">En este momento</p>
                </div>
                <UserX className="w-10 h-10 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-700 font-medium">Tasa Disponibilidad</p>
                  <p className="text-3xl font-bold text-purple-900">
                    {stats.activos > 0 ? Math.round((stats.disponibles / stats.activos) * 100) : 0}%
                  </p>
                  <p className="text-xs text-purple-600 mt-1">Del total activo</p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Disponibilidad por departamento */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mb-8">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Disponibilidad por Departamento</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {departmentStats.map((dept) => (
                <div key={dept.departamento} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{dept.departamento}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${dept.total > 0 ? (dept.disponibles / dept.total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-700 min-w-[80px] text-right">
                        {dept.disponibles} / {dept.total}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Módulos de gestión */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <Link to={createPageUrl("ShiftManagerEmployees")}>
            <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-white/80 backdrop-blur-sm group">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <List className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      Listado de Empleados
                    </h3>
                    <p className="text-xs text-slate-600">Vista detallada del personal</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("Timeline")}>
            <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-white/80 backdrop-blur-sm group">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Clock className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-purple-600 transition-colors">
                      Planning y Turnos
                    </h3>
                    <p className="text-xs text-slate-600">Gestión de asignaciones</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("DailyPlanning")}>
            <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-white/80 backdrop-blur-sm group">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Calendar className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-green-600 transition-colors">
                      Planning Diario
                    </h3>
                    <p className="text-xs text-slate-600">Vista del día actual</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("LockerManagement")}>
            <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-white/80 backdrop-blur-sm group">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <KeyRound className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Gestión de Taquillas
                    </h3>
                    <p className="text-xs text-slate-600">Asignación de vestuarios</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("Breaks")}>
            <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-white/80 backdrop-blur-sm group">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Coffee className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">
                      Gestión de Descansos
                    </h3>
                    <p className="text-xs text-slate-600">Turnos de descanso</p>
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