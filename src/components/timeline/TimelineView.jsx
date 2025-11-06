import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import TimeSlot from "./TimeSlot";
import { AlertCircle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TimelineView({ startDate, endDate, holidays, vacations }) {
  const { workingIntervals, excludedDays } = useMemo(() => {
    const allIntervals = [];
    const excluded = { weekends: 0, holidays: 0, vacations: 0 };
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    // Redondear al intervalo de 5 minutos más cercano
    current.setMinutes(Math.floor(current.getMinutes() / 5) * 5);
    current.setSeconds(0);
    current.setMilliseconds(0);
    
    // Crear conjunto de fechas festivas
    const holidayDates = new Set(
      holidays.map(h => format(new Date(h.date), "yyyy-MM-dd"))
    );
    
    // Crear conjunto de fechas de vacaciones
    const vacationDates = new Set();
    vacations.forEach(vacation => {
      const vStart = new Date(vacation.start_date);
      const vEnd = new Date(vacation.end_date);
      const vCurrent = new Date(vStart);
      
      while (vCurrent <= vEnd) {
        vacationDates.add(format(vCurrent, "yyyy-MM-dd"));
        vCurrent.setDate(vCurrent.getDate() + 1);
      }
    });
    
    // Rastrear días excluidos únicos
    const excludedDaysSet = new Set();
    
    let index = 0;
    while (current <= end && index < 500) {
      const currentDate = new Date(current);
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayDates.has(dateStr);
      const isVacation = vacationDates.has(dateStr);
      
      // Solo incluir intervalos de días laborables
      if (!isWeekend && !isHoliday && !isVacation) {
        allIntervals.push(currentDate);
      } else {
        // Contar días excluidos únicos por tipo
        if (!excludedDaysSet.has(dateStr)) {
          excludedDaysSet.add(dateStr);
          if (isWeekend) excluded.weekends++;
          if (isHoliday) excluded.holidays++;
          if (isVacation && !isWeekend) excluded.vacations++; // No contar vacaciones que caen en fin de semana
        }
      }
      
      current.setMinutes(current.getMinutes() + 5);
      index++;
    }
    
    return { workingIntervals: allIntervals, excludedDays: excluded };
  }, [startDate, endDate, holidays, vacations]);

  const isTooLarge = workingIntervals.length > 288;
  
  if (workingIntervals.length === 0) {
    return (
      <div className="p-12 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <p className="text-slate-600 mb-2">
          No hay intervalos laborables en el rango seleccionado
        </p>
        <p className="text-sm text-slate-500">
          Todos los días en el período son fines de semana, festivos o vacaciones
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          Visualización de Intervalos Laborables
        </h3>
        <p className="text-sm text-slate-600 mb-3">
          Cada segmento representa 5 minutos (excluyendo fines de semana, festivos y vacaciones)
        </p>
        
        {(excludedDays.weekends > 0 || excludedDays.holidays > 0 || excludedDays.vacations > 0) && (
          <div className="flex flex-wrap gap-2">
            {excludedDays.weekends > 0 && (
              <Badge variant="outline" className="bg-slate-50 text-slate-700">
                <Calendar className="w-3 h-3 mr-1" />
                {excludedDays.weekends} {excludedDays.weekends === 1 ? 'fin de semana excluido' : 'fines de semana excluidos'}
              </Badge>
            )}
            {excludedDays.holidays > 0 && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                <Calendar className="w-3 h-3 mr-1" />
                {excludedDays.holidays} {excludedDays.holidays === 1 ? 'festivo excluido' : 'festivos excluidos'}
              </Badge>
            )}
            {excludedDays.vacations > 0 && (
              <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                <Calendar className="w-3 h-3 mr-1" />
                {excludedDays.vacations} {excludedDays.vacations === 1 ? 'día de vacaciones excluido' : 'días de vacaciones excluidos'}
              </Badge>
            )}
          </div>
        )}
      </div>

      {isTooLarge && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800">
            El rango seleccionado es muy amplio. Para una mejor visualización, considera usar un período más corto.
          </p>
        </div>
      )}

      <div className="relative">
        {/* Línea principal */}
        <div className="absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200" />

        {/* Contenedor con scroll horizontal */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-0 min-w-max">
            {workingIntervals.map((interval, index) => (
              <TimeSlot
                key={index}
                time={interval}
                index={index}
                isFirst={index === 0}
                isLast={index === workingIntervals.length - 1}
                totalIntervals={workingIntervals.length}
              />
            ))}
          </div>
        </div>

        {/* Leyenda */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="flex flex-wrap gap-6 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600" />
              <span className="text-slate-600">Intervalo laborable (5 min)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600" />
              <span className="text-slate-600">Inicio del período</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600" />
              <span className="text-slate-600">Fin del período</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}