
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";

export default function AttendanceDashboard() {
  const { data: attendanceRecords } = useQuery({
    queryKey: ['attendanceRecords'],
    queryFn: () => base44.entities.AttendanceRecord.list('-fecha'),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  // Últimos 30 días
  const last30DaysData = useMemo(() => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const records = attendanceRecords.filter(r => r.fecha === date);
      
      data.push({
        fecha: format(subDays(new Date(), i), 'd MMM', { locale: es }),
        presente: records.filter(r => r.estado === "A tiempo" || r.estado === "Presente").length,
        retrasos: records.filter(r => r.estado === "Retraso").length,
        ausencias: records.filter(r => r.estado === "Ausencia").length,
        total: records.length
      });
    }
    return data;
  }, [attendanceRecords]);

  // Estadísticas por departamento
  const departmentStats = useMemo(() => {
    const stats = {};
    
    attendanceRecords.forEach(record => {
      const employee = employees.find(e => e.id === record.employee_id);
      const dept = employee?.departamento || "Sin Departamento";
      
      if (!stats[dept]) {
        stats[dept] = { total: 0, presente: 0, retrasos: 0, ausencias: 0 };
      }
      
      stats[dept].total++;
      if (record.estado === "A tiempo" || record.estado === "Presente") stats[dept].presente++;
      if (record.estado === "Retraso") stats[dept].retrasos++;
      if (record.estado === "Ausencia") stats[dept].ausencias++;
    });

    return Object.entries(stats).map(([nombre, data]) => ({
      nombre,
      ...data,
      porcentaje: data.total > 0 ? Math.round((data.presente / data.total) * 100) : 0
    }));
  }, [attendanceRecords, employees]);

  // Empleados con más retrasos
  const employeesWithMostDelays = useMemo(() => {
    const delayCount = {};
    
    attendanceRecords.forEach(record => {
      if (record.estado === "Retraso") {
        delayCount[record.employee_id] = (delayCount[record.employee_id] || 0) + 1;
      }
    });

    return Object.entries(delayCount)
      .map(([empId, count]) => ({
        employee: employees.find(e => e.id === empId),
        count
      }))
      .filter(item => item.employee)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [attendanceRecords, employees]);

  // Tendencia general
  const overallTrend = useMemo(() => {
    const last7 = last30DaysData.slice(-7);
    const prev7 = last30DaysData.slice(-14, -7);

    const last7Avg = last7.reduce((sum, day) => {
      return sum + (day.total > 0 ? (day.presente / day.total) * 100 : 0);
    }, 0) / 7;

    const prev7Avg = prev7.reduce((sum, day) => {
      return sum + (day.total > 0 ? (day.presente / day.total) * 100 : 0);
    }, 0) / 7;

    return {
      current: Math.round(last7Avg),
      previous: Math.round(prev7Avg),
      trend: last7Avg > prev7Avg ? "up" : "down",
      diff: Math.abs(Math.round(last7Avg - prev7Avg))
    };
  }, [last30DaysData]);

  const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6">
      {/* Tendencia General */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800 font-medium">Tendencia Últimos 7 Días</p>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-4xl font-bold text-blue-900">{overallTrend.current}%</p>
                <div className="flex items-center gap-1">
                  {overallTrend.trend === "up" ? (
                    <>
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-700 font-semibold">+{overallTrend.diff}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-5 h-5 text-red-600" />
                      <span className="text-sm text-red-700 font-semibold">-{overallTrend.diff}%</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-700">vs. semana anterior</p>
              <Badge className={overallTrend.trend === "up" ? "bg-green-600 mt-2" : "bg-red-600 mt-2"}>
                {overallTrend.trend === "up" ? "Mejorando" : "Empeorando"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfica de Tendencia */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Evolución Últimos 30 Días</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={last30DaysData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="presente" stroke="#10B981" name="Presentes" strokeWidth={2} />
              <Line type="monotone" dataKey="retrasos" stroke="#F59E0B" name="Retrasos" strokeWidth={2} />
              <Line type="monotone" dataKey="ausencias" stroke="#EF4444" name="Ausencias" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Estadísticas por Departamento */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Presencia por Departamento</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="presente" fill="#10B981" name="Presentes" />
              <Bar dataKey="retrasos" fill="#F59E0B" name="Retrasos" />
              <Bar dataKey="ausencias" fill="#EF4444" name="Ausencias" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Empleados con Más Retrasos */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            Empleados con Más Retrasos (Histórico)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {employeesWithMostDelays.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
              No hay retrasos registrados
            </div>
          ) : (
            <div className="space-y-3">
              {employeesWithMostDelays.map((item, index) => (
                <div key={item.employee.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-amber-600">{index + 1}</Badge>
                    <div>
                      <p className="font-semibold text-slate-900">{item.employee.nombre}</p>
                      <p className="text-xs text-slate-600">{item.employee.departamento} - {item.employee.puesto}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                    {item.count} retrasos
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
