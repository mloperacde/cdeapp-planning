import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, LogOut, TrendingDown, CalendarDays, RefreshCw } from "lucide-react";
import { fmtHours } from "@/utils/workdayCompliance";

/**
 * Resumen del periodo con las dos magnitudes del informe, calculadas sobre el mismo
 * calendario laboral: ausencias (jornada completa sin acudir) y jornada parcial no cumplida.
 */
export default function AbsenceComplianceSummary({ stats, calendar, loading }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ausencias: jornada completa sin acudir */}
        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Ausencias · jornada completa
              <Badge className="bg-blue-100 text-blue-700 text-[10px] ml-1">no han acudido</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-[11px] text-slate-500">Días ausente</p>
                <p className="text-xl font-bold text-blue-700">{stats.totalDays || 0}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Empleados con ausencias</p>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{stats.withAbsences || 0}/{stats.total || 0}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Episodios</p>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{stats.totalEpisodes || 0}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Tasa de absentismo</p>
                <p className="text-xl font-bold text-red-600">{stats.absentismo || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jornada parcial no cumplida: han acudido pero no completan su turno */}
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Jornada no completada · parcial
              <Badge className="bg-amber-100 text-amber-700 text-[10px] ml-1">sí han acudido</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" />Días con retraso</p>
                <p className="text-xl font-bold text-amber-600">{stats.delayDays || 0}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1"><LogOut className="w-3 h-3 text-orange-500" />Días salida anticipada</p>
                <p className="text-xl font-bold text-orange-600">{stats.earlyDays || 0}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-500" />Horas no trabajadas</p>
                <p className="text-xl font-bold text-red-600">{fmtHours(stats.missingMinutes)}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Cumplimiento de jornada</p>
                <p className="text-xl font-bold text-green-700">{stats.complianceRate || 0}%</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-slate-500">
              <span>{stats.employeesNotCompliant || 0} empleados con jornada incompleta</span>
              <span>· {stats.incompleteDays || 0} días de jornada incompleta</span>
              <span>· {stats.noExitDays || 0} días sin salida registrada</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendario laboral aplicado (coherencia de ambos cálculos) */}
      {calendar && (
        <p className="text-xs text-slate-500 px-1 flex items-center gap-1.5 flex-wrap">
          <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
          Calendario laboral aplicado: <strong className="font-semibold text-slate-600 dark:text-slate-300">{calendar.workDaysInPeriod} días laborables</strong> analizados
          ({calendar.holidaysLoaded} festivos y {calendar.globalVacationDays} días de vacaciones excluidos, más fines de semana; no se espera presencia en días no laborables).
        </p>
      )}
    </div>
  );
}