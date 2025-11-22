import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns";
import { es } from "date-fns/locale";

export default function AbsenceTrendsWidget({ size = "medium" }) {
  const { data: absences = [] } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: [],
  });

  const chartData = useMemo(() => {
    const monthsData = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthAbsences = absences.filter(absence => {
        if (!absence.fecha_inicio) return false;
        try {
          const absenceDate = new Date(absence.fecha_inicio);
          if (isNaN(absenceDate.getTime())) return false;
          return absenceDate >= monthStart && absenceDate <= monthEnd;
        } catch {
          return false;
        }
      });
      
      monthsData.push({
        month: format(date, 'MMM', { locale: es }),
        total: monthAbsences.length,
        aprobadas: monthAbsences.filter(a => a.estado === 'Aprobada').length,
        pendientes: monthAbsences.filter(a => a.estado === 'Pendiente').length,
        rechazadas: monthAbsences.filter(a => a.estado === 'Rechazada').length,
      });
    }
    
    return monthsData;
  }, [absences]);

  const heightClass = size === "large" ? "h-96" : size === "full" ? "h-[500px]" : "h-72";

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Tendencias de Ausencias (6 meses)
        </CardTitle>
      </CardHeader>
      <CardContent className={`p-6 ${heightClass}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#3b82f6" 
              strokeWidth={3}
              name="Total"
              dot={{ fill: '#3b82f6', r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="aprobadas" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Aprobadas"
              dot={{ fill: '#10b981', r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="pendientes" 
              stroke="#f59e0b" 
              strokeWidth={2}
              name="Pendientes"
              dot={{ fill: '#f59e0b', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}