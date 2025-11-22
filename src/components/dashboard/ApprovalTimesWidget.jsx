import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingDown, TrendingUp } from "lucide-react";
import { differenceInHours } from "date-fns";

export default function ApprovalTimesWidget({ size = "medium" }) {
  const { data: absences = [] } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: [],
  });

  const stats = useMemo(() => {
    const approvedAbsences = absences.filter(a => {
      if (a.estado !== 'Aprobada' || !a.fecha_aprobacion || !a.created_date) return false;
      try {
        const created = new Date(a.created_date);
        const approved = new Date(a.fecha_aprobacion);
        return !isNaN(created.getTime()) && !isNaN(approved.getTime());
      } catch {
        return false;
      }
    });

    if (approvedAbsences.length === 0) {
      return { avgHours: 0, minHours: 0, maxHours: 0, total: 0 };
    }

    const times = approvedAbsences.map(a => {
      const created = new Date(a.created_date);
      const approved = new Date(a.fecha_aprobacion);
      return differenceInHours(approved, created);
    });

    const avgHours = times.reduce((sum, t) => sum + t, 0) / times.length;
    const minHours = Math.min(...times);
    const maxHours = Math.max(...times);

    return {
      avgHours: Math.round(avgHours * 10) / 10,
      minHours,
      maxHours,
      total: approvedAbsences.length
    };
  }, [absences]);

  const formatHours = (hours) => {
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
      <CardHeader className="border-b border-purple-200 dark:border-purple-800">
        <CardTitle className="flex items-center gap-2 text-lg dark:text-slate-100">
          <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Tiempos de Aprobación
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border-2 border-purple-200 dark:border-purple-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">Tiempo Medio</span>
              <Badge className="bg-purple-600 dark:bg-purple-700">Principal</Badge>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {formatHours(stats.avgHours)}
              </span>
              {stats.avgHours < 48 && (
                <TrendingDown className="w-5 h-5 text-green-600 mb-1" />
              )}
              {stats.avgHours >= 72 && (
                <TrendingUp className="w-5 h-5 text-red-600 mb-1" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-purple-200 dark:border-purple-700">
              <span className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Más Rápido</span>
              <span className="text-xl font-bold text-green-700 dark:text-green-400">
                {formatHours(stats.minHours)}
              </span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-purple-200 dark:border-purple-700">
              <span className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Más Lento</span>
              <span className="text-xl font-bold text-red-700 dark:text-red-400">
                {formatHours(stats.maxHours)}
              </span>
            </div>
          </div>

          <div className="text-xs text-center text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 py-2 rounded-lg">
            Basado en {stats.total} ausencias aprobadas
          </div>
        </div>
      </CardContent>
    </Card>
  );
}