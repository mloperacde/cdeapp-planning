import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, 
  Calendar, 
  AlertTriangle, 
  DollarSign,
  PieChart,
  Users,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { differenceInDays, differenceInHours, isWithinInterval } from "date-fns";

export default function AbsenceDashboard({ absences, employees }) {
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedShift, setSelectedShift] = useState("all");
  const [periodDays, setPeriodDays] = useState(30);

  // Obtener departamentos y turnos únicos
  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const shifts = useMemo(() => {
    const shiftTypes = new Set();
    employees.forEach(emp => {
      if (emp.tipo_turno) shiftTypes.add(emp.tipo_turno);
    });
    return Array.from(shiftTypes).sort();
  }, [employees]);

  // Filtrar ausencias según período
  const recentAbsences = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    
    return absences.filter(abs => {
      const absStart = new Date(abs.fecha_inicio);
      const absEnd = new Date(abs.fecha_fin);
      
      return absStart >= startDate || 
             (absStart < startDate && absEnd >= startDate);
    });
  }, [absences, periodDays]);

  // Aplicar filtros
  const filteredAbsences = useMemo(() => {
    return recentAbsences.filter(abs => {
      const employee = employees.find(e => e.id === abs.employee_id);
      if (!employee) return false;
      
      const matchesDept = selectedDepartment === "all" || employee.departamento === selectedDepartment;
      const matchesShift = selectedShift === "all" || employee.tipo_turno === selectedShift;
      
      return matchesDept && matchesShift;
    });
  }, [recentAbsences, selectedDepartment, selectedShift, employees]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    const totalAbsences = filteredAbsences.length;
    
    // Calcular días totales de ausencia
    const totalDays = filteredAbsences.reduce((sum, abs) => {
      const start = new Date(abs.fecha_inicio);
      const end = new Date(abs.fecha_fin);
      return sum + differenceInDays(end, start) + 1;
    }, 0);

    // Calcular horas totales
    const totalHours = filteredAbsences.reduce((sum, abs) => {
      const start = new Date(abs.fecha_inicio);
      const end = new Date(abs.fecha_fin);
      return sum + differenceInHours(end, start);
    }, 0);

    // Empleados únicos con ausencias
    const uniqueEmployees = new Set(filteredAbsences.map(a => a.employee_id));
    const employeesWithAbsences = uniqueEmployees.size;

    // Calcular empleados activos en el filtro
    let activeEmployees = employees.filter(emp => {
      const matchesDept = selectedDepartment === "all" || emp.departamento === selectedDepartment;
      const matchesShift = selectedShift === "all" || emp.tipo_turno === selectedShift;
      return matchesDept && matchesShift;
    }).length;

    // Tasa de absentismo = (días ausencia / (días periodo * empleados activos)) * 100
    const absenteeismRate = activeEmployees > 0 
      ? ((totalDays / (periodDays * activeEmployees)) * 100).toFixed(2)
      : 0;

    // Ausencias por tipo
    const byType = {};
    filteredAbsences.forEach(abs => {
      byType[abs.tipo] = (byType[abs.tipo] || 0) + 1;
    });

    // Remuneradas vs No remuneradas
    const paidCount = filteredAbsences.filter(a => a.remunerada).length;
    const unpaidCount = totalAbsences - paidCount;

    // Empleados con recurrencia (más de 2 ausencias)
    const employeeAbsenceCounts = {};
    filteredAbsences.forEach(abs => {
      employeeAbsenceCounts[abs.employee_id] = (employeeAbsenceCounts[abs.employee_id] || 0) + 1;
    });
    const recurringEmployees = Object.entries(employeeAbsenceCounts)
      .filter(([_, count]) => count >= 2)
      .map(([empId, count]) => ({
        employee: employees.find(e => e.id === empId),
        count
      }))
      .sort((a, b) => b.count - a.count);

    // Promedio días por ausencia
    const avgDaysPerAbsence = totalAbsences > 0 
      ? (totalDays / totalAbsences).toFixed(1)
      : 0;

    return {
      totalAbsences,
      totalDays,
      totalHours,
      employeesWithAbsences,
      activeEmployees,
      absenteeismRate,
      byType,
      paidCount,
      unpaidCount,
      recurringEmployees,
      avgDaysPerAbsence
    };
  }, [filteredAbsences, employees, selectedDepartment, selectedShift, periodDays]);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Dashboard de Estadísticas de Ausencias
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={periodDays.toString()} onValueChange={(value) => setPeriodDays(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 días</SelectItem>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                  <SelectItem value="90">Últimos 90 días</SelectItem>
                  <SelectItem value="180">Últimos 6 meses</SelectItem>
                  <SelectItem value="365">Último año</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Departamentos</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Turno</Label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Turnos</SelectItem>
                  {shifts.map(shift => (
                    <SelectItem key={shift} value={shift}>{shift}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-700 font-medium">Tasa Absentismo</p>
                <p className="text-3xl font-bold text-red-900">{stats.absenteeismRate}%</p>
                <p className="text-xs text-red-600 mt-1">Últimos {periodDays} días</p>
              </div>
              <TrendingUp className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 font-medium">Total Ausencias</p>
                <p className="text-3xl font-bold text-blue-900">{stats.totalAbsences}</p>
                <p className="text-xs text-blue-600 mt-1">{stats.totalDays} días totales</p>
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
                <p className="text-3xl font-bold text-purple-900">
                  {stats.employeesWithAbsences}
                </p>
                <p className="text-xs text-purple-600 mt-1">de {stats.activeEmployees} activos</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 font-medium">Promedio Días/Ausencia</p>
                <p className="text-3xl font-bold text-amber-900">{stats.avgDaysPerAbsence}</p>
                <p className="text-xs text-amber-600 mt-1">duración media</p>
              </div>
              <Calendar className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ausencias por Tipo y Remuneración */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              Ausencias por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {Object.entries(stats.byType).map(([tipo, count]) => {
                const percentage = ((count / stats.totalAbsences) * 100).toFixed(1);
                return (
                  <div key={tipo} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{tipo}</span>
                        <span className="text-sm text-slate-600">{count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Remuneradas vs No Remuneradas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <p className="text-sm font-medium text-green-900">Ausencias Remuneradas</p>
                  <p className="text-xs text-green-700 mt-1">Con pago de salario</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-900">{stats.paidCount}</p>
                  <p className="text-xs text-green-700">
                    {stats.totalAbsences > 0 ? ((stats.paidCount / stats.totalAbsences) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <p className="text-sm font-medium text-red-900">Ausencias No Remuneradas</p>
                  <p className="text-xs text-red-700 mt-1">Sin pago de salario</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-red-900">{stats.unpaidCount}</p>
                  <p className="text-xs text-red-700">
                    {stats.totalAbsences > 0 ? ((stats.unpaidCount / stats.totalAbsences) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empleados con Ausencias Recurrentes */}
      {stats.recurringEmployees.length > 0 && (
        <Card className="border-2 border-orange-300 bg-orange-50">
          <CardHeader className="border-b border-orange-200">
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="w-5 h-5" />
              Empleados con Ausencias Recurrentes (≥2 ausencias)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-sm text-orange-800 mb-4">
              <strong>Nota:</strong> La recurrencia de ausencias es un factor importante en la evaluación de rendimiento.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.recurringEmployees.map(({ employee, count }) => (
                <div
                  key={employee?.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-400 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{employee?.nombre || 'Desconocido'}</p>
                    <p className="text-xs text-slate-600">{employee?.departamento || 'Sin dept.'}</p>
                  </div>
                  <Badge className="bg-orange-600 text-white">
                    {count} ausencias
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Información sobre Métricas
        </h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• <strong>Tasa de Absentismo:</strong> Calculada como (días totales ausencia / días periodo × empleados) × 100</p>
          <p>• <strong>Recurrencia:</strong> Empleados con 2 o más ausencias en el período - indicador clave para evaluación</p>
          <p>• <strong>Duración:</strong> Promedio de días por ausencia - factor en evaluación de rendimiento</p>
          <p>• Los datos se filtran por departamento y turno para análisis específicos</p>
        </div>
      </div>
    </div>
  );
}