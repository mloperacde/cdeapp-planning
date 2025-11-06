import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import TimeSlot from "./TimeSlot";
import { AlertCircle, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SHIFTS = {
  shift1: { name: 'Turno 1', start: 7 * 60, end: 15 * 60, color: 'amber' },
  shift2: { name: 'Turno 2', start: 15 * 60, end: 22 * 60, color: 'indigo' },
  shift3: { name: 'Turno 3', start: 14 * 60, end: 22 * 60, color: 'purple' },
};

const WORKING_DAY_START = 7 * 60; // 7:00 en minutos
const WORKING_DAY_END = 22 * 60; // 22:00 en minutos

export default function TimelineView({ startDate, endDate, holidays, vacations, selectedShifts }) {
  const { workingIntervals, excludedDays, shiftStats } = useMemo(() => {
    const allIntervals = [];
    const excluded = { weekends: 0, holidays: 0, vacations: 0, outOfShift: 0, outOfWorkingHours: 0 };
    const stats = { shift1: 0, shift2: 0, shift3: 0 };
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
    
    const isInWorkingHours = (date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const timeInMinutes = hours * 60 + minutes;
      return timeInMinutes >= WORKING_DAY_START && timeInMinutes < WORKING_DAY_END;
    };
    
    const isInSelectedShift = (date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const timeInMinutes = hours * 60 + minutes;
      
      let matchedShift = null;
      for (const shiftId of selectedShifts) {
        const shift = SHIFTS[shiftId];
        if (timeInMinutes >= shift.start && timeInMinutes < shift.end) {
          matchedShift = shiftId;
          break;
        }
      }
      
      return matchedShift;
    };
    
    let index = 0;
    while (current <= end && index < 1000) {
      const currentDate = new Date(current);
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayDates.has(dateStr);
      const isVacation = vacationDates.has(dateStr);
      const inWorkingHours = isInWorkingHours(currentDate);
      const matchedShift = isInSelectedShift(currentDate);
      
      // Solo incluir intervalos dentro del horario laboral (7:00-22:00)
      if (inWorkingHours && !isWeekend && !isHoliday && !isVacation && matchedShift) {
        allIntervals.push({ date: currentDate, shift: matchedShift });
        stats[matchedShift]++;
      } else {
        // Contar días excluidos únicos por tipo
        if (!excludedDaysSet.has(dateStr)) {
          excludedDaysSet.add(dateStr);
          if (isWeekend) excluded.weekends++;
          if (isHoliday) excluded.holidays++;
          if (isVacation && !isWeekend) excluded.vacations++;
        }
        if (!inWorkingHours && !isWeekend && !isHoliday && !isVacation) {
          excluded.outOfWorkingHours++;
        } else if (inWorkingHours && !isWeekend && !isHoliday && !isVacation && !matchedShift) {
          excluded.outOfShift++;
        }
      }
      
      current.setMinutes(current.getMinutes() + 5);
      index++;
    }
    
    return { workingIntervals: allIntervals, excludedDays: excluded, shiftStats: stats };
  }, [startDate, endDate, holidays, vacations, selectedShifts]);

  const isTooLarge = workingIntervals.length > 288;
  
  if (workingIntervals.length === 0) {
    return (
      <div className="p-12 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <p className="text-slate-600 mb-2">
          No hay intervalos laborables en el rango seleccionado
        </p>
        <p className="text-sm text-slate-500">
          Verifica las fechas, turnos seleccionados (horario laboral: 7:00-22:00)
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
          Cada segmento representa 5 minutos (horario laboral: 7:00 - 22:00)
        </p>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {shiftStats.shift1 > 0 && selectedShifts.includes('shift1') && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <Clock className="w-3 h-3 mr-1" />
              Turno 1: {shiftStats.shift1} intervalos (7:00-15:00)
            </Badge>
          )}
          {shiftStats.shift2 > 0 && selectedShifts.includes('shift2') && (
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              <Clock className="w-3 h-3 mr-1" />
              Turno 2: {shiftStats.shift2} intervalos (15:00-22:00)
            </Badge>
          )}
          {shiftStats.shift3 > 0 && selectedShifts.includes('shift3') && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              <Clock className="w-3 h-3 mr-1" />
              Turno 3: {shiftStats.shift3} intervalos (14:00-22:00)
            </Badge>
          )}
        </div>

        {(excludedDays.weekends > 0 || excludedDays.holidays > 0 || excludedDays.vacations > 0) && (
          <div className="flex flex-wrap gap-2">
            {excludedDays.weekends > 0 && (
              <Badge variant="outline" className="bg-slate-50 text-slate-700">
                <Calendar className="w-3 h-3 mr-1" />
                {excludedDays.weekends} {excludedDays.weekends === 1 ? 'fin de semana' : 'fines de semana'}
              </Badge>
            )}
            {excludedDays.holidays > 0 && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                <Calendar className="w-3 h-3 mr-1" />
                {excludedDays.holidays} {excludedDays.holidays === 1 ? 'festivo' : 'festivos'}
              </Badge>
            )}
            {excludedDays.vacations > 0 && (
              <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                <Calendar className="w-3 h-3 mr-1" />
                {excludedDays.vacations} {excludedDays.vacations === 1 ? 'día de vacaciones' : 'días de vacaciones'}
              </Badge>
            )}
            {excludedDays.outOfShift > 0 && (
              <Badge variant="outline" className="bg-slate-50 text-slate-600">
                <Clock className="w-3 h-3 mr-1" />
                {excludedDays.outOfShift} intervalos fuera de turno
              </Badge>
            )}
            {excludedDays.outOfWorkingHours > 0 && (
              <Badge variant="outline" className="bg-slate-50 text-slate-500">
                <Clock className="w-3 h-3 mr-1" />
                {excludedDays.outOfWorkingHours} intervalos fuera del horario laboral
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
                time={interval.date}
                shift={interval.shift}
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
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600" />
              <span className="text-slate-600">Turno 1 (7:00-15:00)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600" />
              <span className="text-slate-600">Turno 2 (15:00-22:00)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600" />
              <span className="text-slate-600">Turno 3 (14:00-22:00)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}