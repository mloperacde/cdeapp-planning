import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, List, Calendar, Clock, AlertTriangle, UserCheck, UserX, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, isWithinInterval, addDays } from "date-fns";
import { es } from "date-fns/locale";

export default function ShiftManagerEmployees() {
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

  const { data: shiftAssignments = [] } = useQuery({
    queryKey: ['shiftAssignments'],
    queryFn: () => base44.entities.ShiftAssignment.list(),
    initialData: [],
  });

  const kpis = useMemo(() => {
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

    return {
      total,
      activos,
      disponibles,
      ausenciasActivas
    };
  }, [masterEmployees, absences]);

  const recentAbsences = useMemo(() => {
    return absences
      .filter(a => {
        if (!a.fecha_inicio) return false;
        try {
          const inicio = new Date(a.fecha_inicio);
          if (isNaN(inicio.getTime())) return false;
          return true;
        } catch {
          return false;
        }
      })
      .slice(0, 5)
      .map(a => {
        const emp = masterEmployees.find(me => me.employee_id === a.employee_id);
        return { ...a, employeeName: emp?.nombre || 'Desconocido' };
      });
  }, [absences, masterEmployees]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Panel de Control - Jefes de Turno
          </h1>
          <p className="text-slate-600 mt-1">
            Gestión y consulta de información del personal
          </p>
        </div>

        {/* KPIs principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Total Empleados</p>
                  <p className="text-3xl font-bold text-blue-900">{kpis.total}</p>
                  <p className="text-xs text-blue-600 mt-1">{kpis.activos} activos</p>
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
                  <p className="text-3xl font-bold text-green-900">{kpis.disponibles}</p>
                  <p className="text-xs text-green-600 mt-1">En turno</p>
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
                  <p className="text-3xl font-bold text-amber-900">{kpis.ausenciasActivas}</p>
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
                  <p className="text-xs text-purple-700 font-medium">Turnos Planificados</p>
                  <p className="text-3xl font-bold text-purple-900">{shiftAssignments.length}</p>
                  <p className="text-xs text-purple-600 mt-1">Asignaciones</p>
                </div>
                <Clock className="w-10 h-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Módulo: Listado de Empleados */}
          <Card className="shadow-lg border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="border-b border-blue-200">
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <List className="w-6 h-6 text-blue-600" />
                Listado de Empleados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-slate-700 mb-4">
                Consulta el listado completo de empleados con filtros avanzados
              </p>
              <Link to={createPageUrl("ShiftManagerEmployeesList")}>
                <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                  <List className="w-5 h-5 mr-2" />
                  Ver Listado Completo
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Ausencias Recientes */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Ausencias Recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {recentAbsences.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-sm">
                  No hay ausencias recientes
                </p>
              ) : (
                <div className="space-y-3">
                  {recentAbsences.map((absence) => (
                    <div key={absence.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-semibold text-sm text-slate-900">
                          {absence.employeeName}
                        </span>
                        <Badge className="bg-amber-600">
                          Ausente
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">
                        {absence.motivo || 'Sin motivo'} • {' '}
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

        {/* Módulos de Gestión */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to={createPageUrl("Timeline")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Planning</h3>
                    <p className="text-xs text-slate-600">Línea de tiempo y asignaciones</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("DailyPlanning")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Activity className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Planning Diario</h3>
                    <p className="text-xs text-slate-600">Gestión del día a día</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("Machines")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-purple-600" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Máquinas</h3>
                    <p className="text-xs text-slate-600">Gestión de máquinas</p>
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