import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, TrendingDown } from "lucide-react";

export default function PaidLeaveBalance({ employees }) {
  const currentYear = new Date().getFullYear();

  const { data: balances } = useQuery({
    queryKey: ['absenceDaysBalance', currentYear],
    queryFn: () => base44.entities.AbsenceDaysBalance.filter({ anio: currentYear }),
    initialData: [],
  });

  const { data: absences } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: [],
  });

  const balanceSummary = useMemo(() => {
    const summary = {};
    
    employees.forEach(emp => {
      const empBalances = balances.filter(b => b.employee_id === emp.id);
      const totalDias = empBalances.reduce((sum, b) => sum + (b.dias_totales_derecho || 0), 0);
      const diasDisfrutados = empBalances.reduce((sum, b) => sum + (b.dias_disfrutados || 0), 0);
      
      summary[emp.id] = {
        employee: emp,
        totalDias,
        diasDisfrutados,
        diasPendientes: totalDias - diasDisfrutados,
        percentage: totalDias > 0 ? Math.round((diasDisfrutados / totalDias) * 100) : 0
      };
    });

    return Object.values(summary).filter(s => s.totalDias > 0);
  }, [employees, balances]);

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Balance de Permisos Remunerados {currentYear}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {balanceSummary.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No hay balances de permisos configurados
          </div>
        ) : (
          <div className="space-y-4">
            {balanceSummary.slice(0, 10).map(summary => (
              <div key={summary.employee.id} className="border rounded-lg p-4 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-900">{summary.employee.nombre}</span>
                  <Badge className={summary.diasPendientes < 5 ? "bg-red-600" : "bg-green-600"}>
                    {summary.diasPendientes} días pendientes
                  </Badge>
                </div>
                <Progress value={summary.percentage} className="h-2 mb-2" />
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Disfrutados: {summary.diasDisfrutados} / {summary.totalDias}</span>
                  <span>{summary.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}