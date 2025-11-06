import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, RotateCcw, CalendarOff, Plane } from "lucide-react";
import { format } from "date-fns";
import HolidayManager from "./HolidayManager";
import VacationManager from "./VacationManager";

export default function TimelineControls({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  holidays,
  isLoadingHolidays,
  onHolidaysUpdate,
  vacations,
  isLoadingVacations,
  onVacationsUpdate
}) {
  const [showHolidayManager, setShowHolidayManager] = useState(false);
  const [showVacationManager, setShowVacationManager] = useState(false);

  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleReset = () => {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    onStartDateChange(now);
    onEndDateChange(twoHoursLater);
  };

  const handleStartChange = (e) => {
    const newStart = new Date(e.target.value);
    onStartDateChange(newStart);
    
    if (newStart >= endDate) {
      const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
      onEndDateChange(newEnd);
    }
  };

  const handleEndChange = (e) => {
    const newEnd = new Date(e.target.value);
    
    if (newEnd <= startDate) {
      const newStart = new Date(newEnd.getTime() - 60 * 60 * 1000);
      onStartDateChange(newStart);
    }
    onEndDateChange(newEnd);
  };

  const calculateWorkingMinutes = () => {
    const totalMinutes = Math.round((endDate - startDate) / (1000 * 60));
    
    // Contar días festivos en el rango
    const holidayDates = new Set(
      holidays.map(h => format(new Date(h.date), "yyyy-MM-dd"))
    );
    
    // Contar días de vacaciones en el rango
    const vacationDates = new Set();
    vacations.forEach(vacation => {
      const start = new Date(vacation.start_date);
      const end = new Date(vacation.end_date);
      const current = new Date(start);
      
      while (current <= end) {
        vacationDates.add(format(current, "yyyy-MM-dd"));
        current.setDate(current.getDate() + 1);
      }
    });
    
    let workingMinutes = 0;
    const current = new Date(startDate);
    
    while (current < endDate) {
      const dateStr = format(current, "yyyy-MM-dd");
      const isHoliday = holidayDates.has(dateStr);
      const isVacation = vacationDates.has(dateStr);
      const isWeekend = current.getDay() === 0 || current.getDay() === 6;
      
      if (!isHoliday && !isVacation && !isWeekend) {
        workingMinutes += 5;
      }
      
      current.setMinutes(current.getMinutes() + 5);
    }
    
    return { total: totalMinutes, working: workingMinutes };
  };

  const { total, working } = calculateWorkingMinutes();

  return (
    <>
      <div className="p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div className="space-y-3">
            <Label
              htmlFor="start-date"
              className="text-sm font-semibold text-slate-700 flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-blue-600" />
              Fecha y Hora de Inicio
            </Label>
            <Input
              id="start-date"
              type="datetime-local"
              value={formatDateTimeLocal(startDate)}
              onChange={handleStartChange}
              className="text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500">
              {format(startDate, "EEEE, d 'de' MMMM 'de' yyyy 'a las' HH:mm")}
            </p>
          </div>

          <div className="space-y-3">
            <Label
              htmlFor="end-date"
              className="text-sm font-semibold text-slate-700 flex items-center gap-2"
            >
              <Clock className="w-4 h-4 text-blue-600" />
              Fecha y Hora de Fin
            </Label>
            <Input
              id="end-date"
              type="datetime-local"
              value={formatDateTimeLocal(endDate)}
              onChange={handleEndChange}
              className="text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500">
              {format(endDate, "EEEE, d 'de' MMMM 'de' yyyy 'a las' HH:mm")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center pt-4 border-t border-slate-100 gap-4">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-blue-600">{total}</span> minutos totales •{" "}
            <span className="font-semibold text-green-600">{working}</span> minutos laborables •{" "}
            <span className="font-semibold text-slate-500">{total - working}</span> minutos no laborables
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHolidayManager(true)}
              className="gap-2 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300"
            >
              <CalendarOff className="w-4 h-4" />
              Festivos ({holidays.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVacationManager(true)}
              className="gap-2 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300"
            >
              <Plane className="w-4 h-4" />
              Vacaciones ({vacations.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
            >
              <RotateCcw className="w-4 h-4" />
              Restablecer
            </Button>
          </div>
        </div>
      </div>

      <HolidayManager
        open={showHolidayManager}
        onOpenChange={setShowHolidayManager}
        holidays={holidays}
        onUpdate={onHolidaysUpdate}
      />

      <VacationManager
        open={showVacationManager}
        onOpenChange={setShowVacationManager}
        vacations={vacations}
        onUpdate={onVacationsUpdate}
      />
    </>
  );
}