import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileBarChart2, Users, UserCheck, AlertCircle, Clock, Repeat, Percent,
  Gauge, CalendarDays, XCircle, Baby, Award, RefreshCw,
} from "lucide-react";

/**
 * Cabecera del informe de ausencias: identificación del análisis (periodo, ámbito y fecha)
 * y panel de KPIs calculados sobre el periodo seleccionado.
 */
export default function AbsenceReportHeader({
  periodLabel,
  analysisDate,
  scopeLabel,
  stats = {},
  loading = false,
  onShowAchievers,
}) {
  const kpis = [
    { label: "Empleados evaluados", value: stats.total ?? 0, icon: Users, color: "text-slate-700", bg: "bg-slate-50" },
    { label: "Sin ausencias (periodo)", value: stats.withoutAbsences ?? 0, icon: UserCheck, color: "text-green-600", bg: "bg-green-50" },
    { label: "Con ausencias (periodo)", value: stats.withAbsences ?? 0, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Días ausentes (periodo)", value: stats.totalDays ?? 0, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Episodios (periodo)", value: stats.totalEpisodes ?? 0, icon: Repeat, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Tasa de absentismo", value: `${stats.absentismo ?? 0}%`, icon: Percent, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Media días / empleado", value: stats.avgDaysPerEmployee ?? 0, icon: Gauge, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Días mes en curso", value: stats.totalDaysMonth ?? 0, icon: CalendarDays, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Ausentes hoy", value: stats.absentToday ?? 0, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Maternidad/Patern.", value: stats.maternityCount ?? 0, icon: Baby, color: "text-pink-600", bg: "bg-pink-50" },
  ];

  return (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-700">
      {/* Cabecera del documento */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-4 md:px-5 py-4 text-white">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
          <div>
            <h2 className="text-sm md:text-base font-bold flex items-center gap-2">
              <FileBarChart2 className="w-4 h-4" />
              Informe de Ausencias
            </h2>
            <p className="text-[11px] md:text-xs text-blue-50 mt-1">
              Periodo analizado: <span className="font-semibold">{periodLabel}</span>
              {" · "}Ámbito: <span className="font-semibold">{scopeLabel}</span>
            </p>
          </div>
          <div className="text-[11px] md:text-xs text-blue-50 md:text-right">
            <p>Fecha de análisis: <span className="font-semibold">{analysisDate}</span></p>
            <p className="text-blue-100/90">Fuente: fichajes reales (DailyPresence)</p>
          </div>
        </div>
      </div>

      {/* Panel de KPIs del periodo */}
      <CardContent className="p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {kpis.map((k) => (
              <div key={k.label} className={`${k.bg} rounded-lg border-0 p-2.5`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500 truncate" title={k.label}>{k.label}</p>
                    <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                  </div>
                  <k.icon className={`w-4 h-4 ${k.color} opacity-40 flex-shrink-0`} />
                </div>
              </div>
            ))}

            {/* Logro: 12 meses sin ausencias */}
            <button
              type="button"
              onClick={onShowAchievers}
              title="Ver el personal con 12 meses sin ausencias"
              className="bg-emerald-50 rounded-lg border border-emerald-200 p-2.5 text-left hover:bg-emerald-100 hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] text-emerald-700 truncate">12 meses sin ausencias</p>
                  <p className="text-lg font-bold text-emerald-700">{stats.noAbsence12m ?? 0}</p>
                </div>
                <Award className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              </div>
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}