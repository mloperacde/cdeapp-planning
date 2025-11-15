
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";

export default function WorkCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: holidays } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
    initialData: [],
  });

  const { data: vacations } = useQuery({
    queryKey: ['vacations'],
    queryFn: () => base44.entities.Vacation.list(),
    initialData: [],
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getDayType = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const isHoliday = holidays.some(h => {
      if (!h.fecha) return false; // Added null/undefined check
      try {
        const hDate = format(new Date(h.fecha), 'yyyy-MM-dd');
        return hDate === dateStr;
      } catch {
        return false; // Handle invalid date format
      }
    });

    const isVacation = vacations.some(v => {
      if (!v.fecha_inicio || !v.fecha_fin) return false; // Added null/undefined checks
      try {
        const vStart = new Date(v.fecha_inicio);
        const vEnd = new Date(v.fecha_fin);
        return date >= vStart && date <= vEnd;
      } catch {
        return false; // Handle invalid date format
      }
    });

    const dayOfWeek = getDay(date);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return { isHoliday, isVacation, isWeekend };
  };

  const getHolidayName = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const holiday = holidays.find(h => {
      if (!h.fecha) return false; // Added null/undefined check
      try {
        const hDate = format(new Date(h.fecha), 'yyyy-MM-dd');
        return hDate === dateStr;
      } catch {
        return false; // Handle invalid date format
      }
    });
    return holiday?.nombre;
  };

  const stats = useMemo(() => {
    let laborables = 0;
    let festivos = 0;
    let vacaciones = 0;
    let finesSemana = 0;

    monthDays.forEach(day => {
      const { isHoliday, isVacation, isWeekend } = getDayType(day);
      if (isHoliday) festivos++;
      else if (isVacation) vacaciones++;
      else if (isWeekend) finesSemana++;
      else laborables++;
    });

    return { laborables, festivos, vacaciones, finesSemana };
  }, [monthDays, holidays, vacations]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} variant="outline">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-2xl font-bold text-slate-900">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </h2>
        <Button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} variant="outline">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-900">{stats.laborables}</div>
            <div className="text-xs text-green-700">Días Laborables</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-900">{stats.festivos}</div>
            <div className="text-xs text-red-700">Festivos</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-900">{stats.vacaciones}</div>
            <div className="text-xs text-blue-700">Vacaciones</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-100 border-slate-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{stats.finesSemana}</div>
            <div className="text-xs text-slate-700">Fines de Semana</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
              <div key={day} className="text-center font-semibold text-xs text-slate-600 p-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1 }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {monthDays.map(day => {
              const { isHoliday, isVacation, isWeekend } = getDayType(day);
              const isToday = isSameDay(day, new Date());
              const holidayName = getHolidayName(day);

              return (
                <div
                  key={day.toString()}
                  className={`aspect-square border-2 rounded-lg p-2 transition-all ${
                    isToday ? 'border-blue-500 ring-2 ring-blue-200' :
                    isHoliday ? 'bg-red-100 border-red-300' :
                    isVacation ? 'bg-blue-100 border-blue-300' :
                    isWeekend ? 'bg-slate-100 border-slate-200' :
                    'bg-white border-slate-200 hover:border-blue-300'
                  }`}
                  title={holidayName || ''}
                >
                  <div className={`text-sm font-semibold text-center ${
                    isHoliday ? 'text-red-900' :
                    isVacation ? 'text-blue-900' :
                    isWeekend ? 'text-slate-500' :
                    'text-slate-900'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  {isToday && (
                    <div className="text-center">
                      <Badge className="bg-blue-600 text-white text-xs mt-1">Hoy</Badge>
                    </div>
                  )}
                  {holidayName && (
                    <div className="text-[8px] text-center text-red-800 mt-1 line-clamp-2">
                      {holidayName}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded" />
              <span className="text-xs text-slate-600">Festivo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded" />
              <span className="text-xs text-slate-600">Vacaciones</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-100 border-2 border-slate-200 rounded" />
              <span className="text-xs text-slate-600">Fin de Semana</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
