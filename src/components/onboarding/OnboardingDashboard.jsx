import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Clock, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { es } from "date-fns/locale";

export default function OnboardingDashboard({ onboardings, employees }) {
  const stats = useMemo(() => {
    const byStatus = {
      "En Proceso": onboardings.filter(o => o.estado === "En Proceso").length,
      "Completado": onboardings.filter(o => o.estado === "Completado").length,
      "Pendiente": onboardings.filter(o => o.estado === "Pendiente").length,
    };

    const avgDays = onboardings
      .filter(o => o.estado === "Completado" && o.fecha_completado)
      .map(o => differenceInDays(new Date(o.fecha_completado), new Date(o.fecha_inicio)))
      .reduce((sum, days, _, arr) => sum + days / arr.length, 0);

    const byDepartment = {};
    onboardings.forEach(ob => {
      const emp = employees.find(e => e.id === ob.employee_id);
      const dept = emp?.departamento || "Sin Departamento";
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;
    });

    const stepsCompletion = Array.from({ length: 6 }, (_, i) => {
      const stepKey = `paso_${i + 1}_${["bienvenida", "datos_personales", "documentos", "configuracion_cuenta", "asignacion_recursos", "formacion_inicial"][i]}`;
      const completed = onboardings.filter(o => o.pasos_completados?.[stepKey]).length;
      return {
        step: `Paso ${i + 1}`,
        completed,
        total: onboardings.length,
        percentage: onboardings.length > 0 ? Math.round((completed / onboardings.length) * 100) : 0,
      };
    });

    return {
      byStatus,
      avgDays: Math.round(avgDays) || 0,
      byDepartment,
      stepsCompletion,
    };
  }, [onboardings, employees]);

  const pieData = Object.entries(stats.byStatus).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = {
    "En Proceso": "#3B82F6",
    "Completado": "#10B981",
    "Pendiente": "#F59E0B",
  };

  const departmentData = Object.entries(stats.byDepartment).map(([name, value]) => ({
    name,
    value,
  }));

  const progressDistribution = useMemo(() => {
    const ranges = [
      { label: "0-20%", min: 0, max: 20 },
      { label: "21-40%", min: 21, max: 40 },
      { label: "41-60%", min: 41, max: 60 },
      { label: "61-80%", min: 61, max: 80 },
      { label: "81-100%", min: 81, max: 100 },
    ];

    return ranges.map(range => ({
      name: range.label,
      count: onboardings.filter(
        o => o.porcentaje_completado >= range.min && o.porcentaje_completado <= range.max
      ).length,
    }));
  }, [onboardings]);

  return (
    <div className="space-y-6">
      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 font-medium">Tiempo Promedio</p>
                <p className="text-2xl font-bold text-blue-900">{stats.avgDays} días</p>
                <p className="text-xs text-blue-600 mt-1">Onboarding completado</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 font-medium">Completados</p>
                <p className="text-2xl font-bold text-green-900">{stats.byStatus["Completado"]}</p>
                <p className="text-xs text-green-600 mt-1">Procesos finalizados</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 font-medium">En Proceso</p>
                <p className="text-2xl font-bold text-amber-900">{stats.byStatus["En Proceso"]}</p>
                <p className="text-xs text-amber-600 mt-1">Onboardings activos</p>
              </div>
              <TrendingUp className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 font-medium">Pendientes</p>
                <p className="text-2xl font-bold text-purple-900">{stats.byStatus["Pendiente"]}</p>
                <p className="text-xs text-purple-600 mt-1">Por iniciar</p>
              </div>
              <AlertCircle className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estado de Onboardings */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Estado de Onboardings</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Por Departamento */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Onboardings por Departamento</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Completitud de Pasos */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Completitud de Pasos del Proceso</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.stepsCompletion}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="step" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#10B981" name="Completados" />
              <Bar dataKey="total" fill="#E5E7EB" name="Total" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribución de Progreso */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Distribución de Progreso</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={progressDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8B5CF6" name="Empleados" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Resumen de Documentos */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Estado de Documentación</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(() => {
              let totalDocs = 0;
              let receivedDocs = 0;
              let pendingDocs = 0;

              onboardings.forEach(ob => {
                ob.documentos_pendientes?.forEach(doc => {
                  totalDocs++;
                  if (doc.recibido) {
                    receivedDocs++;
                  } else if (doc.requerido) {
                    pendingDocs++;
                  }
                });
              });

              return (
                <>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-900">{totalDocs}</div>
                    <div className="text-sm text-blue-700">Total Documentos</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-900">{receivedDocs}</div>
                    <div className="text-sm text-green-700">Recibidos</div>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <div className="text-3xl font-bold text-amber-900">{pendingDocs}</div>
                    <div className="text-sm text-amber-700">Pendientes (Obligatorios)</div>
                  </div>
                </>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}