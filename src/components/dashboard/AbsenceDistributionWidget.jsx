import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function AbsenceDistributionWidget({ size = "medium" }) {
  const { data: absences = [] } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: [],
  });

  const { data: absenceTypes = [] } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.list(),
    initialData: [],
  });

  const chartData = useMemo(() => {
    const typeCount = {};
    
    absences.forEach(absence => {
      const typeId = absence.absence_type_id;
      typeCount[typeId] = (typeCount[typeId] || 0) + 1;
    });

    return Object.entries(typeCount)
      .map(([typeId, count]) => {
        const type = absenceTypes.find(t => t.id === typeId);
        return {
          name: type?.nombre || 'Sin tipo',
          value: count,
          percentage: Math.round((count / absences.length) * 100)
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [absences, absenceTypes]);

  const heightClass = size === "large" ? "h-96" : size === "full" ? "h-[500px]" : "h-80";

  return (
    <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="flex items-center gap-2 text-lg dark:text-slate-100">
          <PieChartIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Distribución por Tipo de Ausencia
        </CardTitle>
      </CardHeader>
      <CardContent className={`p-6 ${heightClass}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name} (${percentage}%)`}
              outerRadius={size === "large" ? 120 : 90}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name, props) => [`${value} (${props.payload.percentage}%)`, props.payload.name]}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              wrapperStyle={{ fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}