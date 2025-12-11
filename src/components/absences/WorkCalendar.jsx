import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  startOfYear, endOfYear, eachMonthOfInterval
} from "date-fns";
import { es } from "date-fns/locale";

export default function WorkCalendar() {
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  const currentDate = new Date(selectedYear, 0, 1);

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
  });

  const { data: vacations = [] } = useQuery({
    queryKey: ['vacations'],
    queryFn: () => base44.entities.Vacation.list(),
  });

  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

  const getDayType = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const holiday = holidays.find(h => format(new Date(h.date), 'yyyy-MM-dd') === dateStr);
    const vacation = vacations.find(v => {
      const vStart = new Date(v.start_date);
      const vEnd = new Date(v.end_date);
      vStart.setHours(0, 0, 0, 0);
      vEnd.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      return checkDate >= vStart && checkDate <= vEnd;
    });
    const dayOfWeek = getDay(date);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return { isHoliday: !!holiday, isVacation: !!vacation, isWeekend, holiday, vacation };
  };

  const getMonthDays = (monthDate) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            Calendario Laboral {selectedYear}
          </CardTitle>
          <div className="flex gap-2">
            {years.map(year => (
              <Badge 
                key={year}
                variant={selectedYear === year ? "default" : "outline"}
                className={`cursor-pointer ${selectedYear === year ? "bg-blue-600" : "hover:bg-slate-100"}`}
                onClick={() => setSelectedYear(year)}
              >
                {year}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {months.map(monthDate => {
            const monthDays = getMonthDays(monthDate);
            return (
              <Card key={monthDate.toString()} className="border border-slate-200">
                <CardHeader className="pb-1 bg-slate-50 border-b">
                  <CardTitle className="text-xs font-bold text-center">
                    {format(monthDate, 'MMMM', { locale: es }).toUpperCase()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-1.5">
                  <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                      <div key={day} className="text-center text-[7px] font-semibold text-slate-500">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {Array.from({ length: getDay(monthDays[0]) === 0 ? 6 : getDay(monthDays[0]) - 1 }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}
                    {monthDays.map(day => {
                      const { isHoliday, isVacation, isWeekend } = getDayType(day);
                      return (
                        <div
                          key={day.toString()}
                          className={`aspect-square flex items-center justify-center text-[9px] font-semibold rounded ${
                            isHoliday ? 'bg-red-200 text-red-900' :
                            isVacation ? 'bg-blue-200 text-blue-900' :
                            isWeekend ? 'bg-slate-200 text-slate-600' :
                            'text-slate-700'
                          }`}
                        >
                          {format(day, 'd')}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-white border border-slate-300 rounded" />
            <span className="text-sm text-slate-700">Hábil</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-red-200 border border-red-400 rounded" />
            <span className="text-sm text-slate-700">Festivo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-200 border border-blue-400 rounded" />
            <span className="text-sm text-slate-700">Vacaciones</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-slate-200 border border-slate-300 rounded" />
            <span className="text-sm text-slate-700">Fin de Semana</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}