import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Calendar, AlertCircle, RefreshCw, BarChart3 } from "lucide-react";
import { startOfYear, endOfYear, startOfMonth, differenceInCalendarDays } from "date-fns";
import { calculateGlobalAbsenteeism } from "../absences/AbsenteeismCalculator";
import LongAbsenceAlert from "../absences/LongAbsenceAlert";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import AIDashboardSummary from "../reports/AIDashboardSummary";
import { useAppData } from "../data/DataProvider";

export default function AbsenceDashboard({ absences: propsAbsences, employees: propsEmployees }) {
  // Usar datos del provider como fuente primaria
  const appData = useAppData();
  
  // Fallback a props si no hay provider (compatibilidad)
  const absences = propsAbsences || appData?.absences || [];
  const employees = propsEmployees || appData?.employees || [];
  const vacations = appData?.vacations || [];
  const holidays = appData?.holidays || [];

  const { data: absenteeismData, refetch: refetchAbsenteeism, isLoading: calculatingAbsenteeism } = useQuery({
    queryKey: ['absenteeismData', employees.length, absences.length],
    queryFn: async () => {
      const now = new Date();
      const yearStart = startOfYear(now);
      const monthStart = startOfMonth(now);
      
      // Datos compartidos para optimizar
      const sharedData = {
        employees,
        absences,
        vacations,
        holidays
      };

      const [yearStats, monthStats] = await Promise.all([
        calculateGlobalAbsenteeism(yearStart, now, sharedData),
        calculateGlobalAbsenteeism(monthStart, now, sharedData)
      ]);

      return { yearStats, monthStats };
    },
    enabled: employees.length > 0 && vacations.length >= 0 && holidays.length >= 0,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const yearAbsences = useMemo(() => {
    const now = new Date();
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);
    return absences.filter(abs => {
      const start = new Date(abs.fecha_inicio);
      const end = abs.fecha_fin_desconocida ? now : new Date(abs.fecha_fin);
      return start <= yearEnd && end >= yearStart;
    });
  }, [absences]);

  const byType = useMemo(() => {
    const typeCount = {};
    yearAbsences.forEach(abs => {
      const tipo = abs.tipo || "Sin especificar";
      typeCount[tipo] = (typeCount[tipo] || 0) + 1;
    });
    return Object.entries(typeCount).map(([name, value]) => ({ name, value }));
  }, [yearAbsences]);

  const byEmployee = useMemo(() => {
    const empCount = {};
    yearAbsences.forEach(abs => {
      const emp = employees.find(e => e.id === abs.employee_id);
      const name = emp?.nombre || "Desconocido";
      empCount[name] = (empCount[name] || 0) + 1;
    });
    return Object.entries(empCount)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 1)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [yearAbsences, employees]);

  const byDepartment = useMemo(() => {
    const now = new Date();
    const yearStart = startOfYear(now);
    const daysInRange = differenceInCalendarDays(now, yearStart) + 1;
    const deptDays = {};

    yearAbsences.forEach(abs => {
      const emp = employees.find(e => e.id === abs.employee_id);
      const dept = emp?.departamento || "Sin departamento";
      const absStart = new Date(abs.fecha_inicio);
      const absEnd = abs.fecha_fin_desconocida ? now : new Date(abs.fecha_fin);
      const start = absStart > yearStart ? absStart : yearStart;
      const end = absEnd < now ? absEnd : now;
      if (start > end) return;
      const days = differenceInCalendarDays(end, start) + 1;
      deptDays[dept] = (deptDays[dept] || 0) + days;
    });

    return Object.entries(deptDays)
      .map(([department, totalDays]) => ({
        department,
        value: daysInRange > 0 ? totalDays / daysInRange : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [yearAbsences, employees]);

  const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#6366F1', '#14B8A6'];

  const handleRefreshAbsenteeism = async () => {
    toast.promise(refetchAbsenteeism(), {
      loading: 'Calculando absentismo global...',
      success: 'Absentismo actualizado',
      error: 'Error al calcular absentismo'
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Ausencias por Tipo</CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Datos acumulados del año en curso.
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={byType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {byType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Ausencias por Departamento</CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Promedio diario de personas ausentes por departamento (año en curso).
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byDepartment}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" angle={-40} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Top 10 Empleados con Más Ausencias</CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Solo empleados con más de una ausencia (año en curso).
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byEmployee}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-40} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-2 border-blue-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Datos de Absentismo Global</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshAbsenteeism}
            disabled={calculatingAbsenteeism}
          >
            {calculatingAbsenteeism ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Actualizar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Horas Perdidas (Mes en curso)</p>
              <p className="text-2xl font-bold text-slate-900">
                {absenteeismData?.monthStats?.totalHorasNoTrabajadas?.toLocaleString('es-ES') ?? 0} h
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Horas Perdidas (Año en curso)</p>
              <p className="text-2xl font-bold text-slate-900">
                {absenteeismData?.yearStats?.totalHorasNoTrabajadas?.toLocaleString('es-ES') ?? 0} h
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <p className="text-sm text-blue-700 mb-1 font-semibold">Tasa Global (Año)</p>
              <p className="text-2xl font-bold text-blue-900">
                {absenteeismData?.yearStats?.tasaAbsentismoGlobal?.toFixed(2) ?? 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1">
        <LongAbsenceAlert employees={employees} absences={absences} />
      </div>

      <AIDashboardSummary 
        data={{ absences, employees, byType, byEmployee }} 
        type="absences" 
      />
    </div>
  );
}
