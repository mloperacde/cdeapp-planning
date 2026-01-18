import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Calendar, AlertCircle, RefreshCw, BarChart3 } from "lucide-react";
import { startOfYear, endOfYear } from "date-fns";
import { calculateGlobalAbsenteeism } from "../absences/AbsenteeismCalculator";
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

  const { data: globalAbsenteeism, refetch: refetchAbsenteeism, isLoading: calculatingAbsenteeism } = useQuery({
    queryKey: ['globalAbsenteeism', employees.length, absences.length],
    queryFn: async () => {
      const now = new Date();
      const yearStart = startOfYear(now);
      // CRÍTICO: Pasar TODOS los datos precargados para evitar llamadas internas
      return calculateGlobalAbsenteeism(yearStart, now, {
        employees: employees,
        absences: absences,
        vacations: vacations,
        holidays: holidays
      });
    },
    enabled: employees.length > 0 && vacations.length >= 0 && holidays.length >= 0,
    staleTime: 60 * 60 * 1000, // 1 hora
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const byType = useMemo(() => {
    const typeCount = {};
    absences.forEach(abs => {
      const tipo = abs.tipo || "Sin especificar";
      typeCount[tipo] = (typeCount[tipo] || 0) + 1;
    });
    return Object.entries(typeCount).map(([name, value]) => ({ name, value }));
  }, [absences]);

  const byEmployee = useMemo(() => {
    const empCount = {};
    absences.forEach(abs => {
      const emp = employees.find(e => e.id === abs.employee_id);
      const name = emp?.nombre || "Desconocido";
      empCount[name] = (empCount[name] || 0) + 1;
    });
    return Object.entries(empCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [absences, employees]);

  const byDepartment = useMemo(() => {
    const deptCount = {};
    absences.forEach(abs => {
      const emp = employees.find(e => e.id === abs.employee_id);
      const dept = emp?.departamento || "Sin departamento";
      deptCount[dept] = (deptCount[dept] || 0) + 1;
    });
    return Object.entries(deptCount)
      .map(([department, value]) => ({ department, value }))
      .sort((a, b) => b.value - a.value);
  }, [absences, employees]);

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 font-medium">Total Ausencias</p>
                <p className="text-2xl font-bold text-blue-900">{absences.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 font-medium">Empleados Afectados</p>
                <p className="text-2xl font-bold text-purple-900">
                  {new Set(absences.map(a => a.employee_id)).size}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-700 font-medium">Tipos de Ausencia</p>
                <p className="text-2xl font-bold text-orange-900">{byType.length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br border-2 ${
          !globalAbsenteeism ? 'from-slate-50 to-slate-100 border-slate-200' :
          globalAbsenteeism.tasaAbsentismoGlobal <= 5 ? 'from-green-50 to-green-100 border-green-200' :
          globalAbsenteeism.tasaAbsentismoGlobal <= 10 ? 'from-yellow-50 to-yellow-100 border-yellow-200' :
          'from-red-50 to-red-100 border-red-200'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className={`text-xs font-medium ${
                  !globalAbsenteeism ? 'text-slate-700' :
                  globalAbsenteeism.tasaAbsentismoGlobal <= 5 ? 'text-green-700' :
                  globalAbsenteeism.tasaAbsentismoGlobal <= 10 ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  Tasa Absentismo Global
                </p>
                <p className={`text-2xl font-bold ${
                  !globalAbsenteeism ? 'text-slate-900' :
                  globalAbsenteeism.tasaAbsentismoGlobal <= 5 ? 'text-green-900' :
                  globalAbsenteeism.tasaAbsentismoGlobal <= 10 ? 'text-yellow-900' :
                  'text-red-900'
                }`}>
                  {globalAbsenteeism?.tasaAbsentismoGlobal?.toFixed(2) || '0.00'}%
                </p>
              </div>
              <TrendingUp className={`w-8 h-8 ${
                !globalAbsenteeism ? 'text-slate-600' :
                globalAbsenteeism.tasaAbsentismoGlobal <= 5 ? 'text-green-600' :
                globalAbsenteeism.tasaAbsentismoGlobal <= 10 ? 'text-yellow-600' :
                'text-red-600'
              }`} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshAbsenteeism}
              disabled={calculatingAbsenteeism}
              className="w-full mt-2"
            >
              <RefreshCw className={`w-3 h-3 mr-2 ${calculatingAbsenteeism ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Ausencias por Tipo</CardTitle>
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

      {globalAbsenteeism && (
        <Card className="shadow-lg border-2 border-blue-200">
          <CardHeader>
            <CardTitle>Datos de Absentismo Global</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Total Horas No Trabajadas</p>
                <p className="text-2xl font-bold text-slate-900">
                  {globalAbsenteeism.totalHorasNoTrabajadas.toLocaleString('es-ES')} h
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Total Horas Esperadas</p>
                <p className="text-2xl font-bold text-slate-900">
                  {globalAbsenteeism.totalHorasDeberianTrabajarse.toLocaleString('es-ES')} h
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <p className="text-sm text-blue-700 mb-1 font-semibold">Tasa Global</p>
                <p className="text-2xl font-bold text-blue-900">
                  {globalAbsenteeism.tasaAbsentismoGlobal.toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <AIDashboardSummary 
        data={{ absences, employees, byType, byEmployee }} 
        type="absences" 
      />
    </div>
  );
}
