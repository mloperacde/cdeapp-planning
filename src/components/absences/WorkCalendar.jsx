import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, 
  addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks,
  startOfYear, endOfYear, addYears, subYears, eachMonthOfInterval
} from "date-fns";
import { es } from "date-fns/locale";

export default function WorkCalendar({ holidays = [], vacations = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState('year');

  const getDateRange = () => {
    switch (viewType) {
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 })
        };
      case 'year':
        return {
          start: startOfYear(currentDate),
          end: endOfYear(currentDate)
        };
      default:
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        };
    }
  };

  const { start, end } = getDateRange();
  const days = viewType === 'year' 
    ? eachMonthOfInterval({ start, end })
    : eachDayOfInterval({ start, end });

  const handlePrevious = () => {
    if (viewType === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else if (viewType === 'month') setCurrentDate(subMonths(currentDate, 1));
    else setCurrentDate(subYears(currentDate, 1));
  };

  const handleNext = () => {
    if (viewType === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else if (viewType === 'month') setCurrentDate(addMonths(currentDate, 1));
    else setCurrentDate(addYears(currentDate, 1));
  };

  const getDayType = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const isHoliday = holidays.some(h => {
      if (!h.fecha) return false;
      try {
        const hDate = format(new Date(h.fecha), 'yyyy-MM-dd');
        return hDate === dateStr;
      } catch {
        return false;
      }
    });

    const isVacation = vacations.some(v => {
      if (!v.fecha_inicio || !v.fecha_fin) return false;
      try {
        const vStart = new Date(v.fecha_inicio);
        const vEnd = new Date(v.fecha_fin);
        return date >= vStart && date <= vEnd;
      } catch {
        return false;
      }
    });

    const dayOfWeek = getDay(date);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return { isHoliday, isVacation, isWeekend };
  };

  const getHolidayName = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const holiday = holidays.find(h => {
      if (!h.fecha) return false;
      try {
        const hDate = format(new Date(h.fecha), 'yyyy-MM-dd');
        return hDate === dateStr;
      } catch {
        return false;
      }
    });
    return holiday?.nombre;
  };

  const getMonthStats = (monthDate) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    let laborables = 0;
    let noHabiles = 0;

    monthDays.forEach(day => {
      const { isHoliday, isVacation, isWeekend } = getDayType(day);
      if (isHoliday || isVacation || isWeekend) noHabiles++;
      else laborables++;
    });

    return { laborables, noHabiles };
  };

  const stats = useMemo(() => {
    let laborables = 0;
    let festivos = 0;
    let vacaciones = 0;
    let finesSemana = 0;

    if (viewType === 'year') {
      days.forEach(monthDate => {
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
        
        monthDays.forEach(day => {
          const { isHoliday, isVacation, isWeekend } = getDayType(day);
          if (isHoliday) festivos++;
          else if (isVacation) vacaciones++;
          else if (isWeekend) finesSemana++;
          else laborables++;
        });
      });
    } else {
      days.forEach(day => {
        const { isHoliday, isVacation, isWeekend } = getDayType(day);
        if (isHoliday) festivos++;
        else if (isVacation) vacaciones++;
        else if (isWeekend) finesSemana++;
        else laborables++;
      });
    }

    const totalNoHabiles = festivos + vacaciones + finesSemana;
    return { laborables, festivos, vacaciones, finesSemana, totalNoHabiles };
  }, [days, holidays, vacations, viewType]);

  const getViewTitle = () => {
    if (viewType === 'week') return format(currentDate, "'Semana del' d 'de' MMMM yyyy", { locale: es });
    if (viewType === 'year') return format(currentDate, "yyyy", { locale: es });
    return format(currentDate, "MMMM yyyy", { locale: es });
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm" id="work-calendar">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Calendario Laboral
          </CardTitle>
          <div className="flex gap-2">
            <Select value={viewType} onValueChange={setViewType}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mes</SelectItem>
                <SelectItem value="year">Año</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="print:hidden">
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Button onClick={handlePrevious} variant="outline" className="print:hidden">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-bold text-slate-900">
            {getViewTitle()}
          </h2>
          <Button onClick={handleNext} variant="outline" className="print:hidden">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-green-900">{stats.laborables}</div>
              <div className="text-xs text-green-700">Hábiles</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-50 border-slate-300">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-slate-900">{stats.totalNoHabiles}</div>
              <div className="text-xs text-slate-700">No Hábiles</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-red-900">{stats.festivos}</div>
              <div className="text-xs text-red-700">Festivos</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-blue-900">{stats.vacaciones}</div>
              <div className="text-xs text-blue-700">Vacaciones</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-100 border-slate-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-slate-900">{stats.finesSemana}</div>
              <div className="text-xs text-slate-700">Fines Semana</div>
            </CardContent>
          </Card>
        </div>

        {viewType === 'year' ? (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
            {days.map(monthDate => {
              const { laborables, noHabiles } = getMonthStats(monthDate);
              return (
                <Card key={monthDate.toString()} className="hover:shadow-lg transition-all border-2 border-slate-200">
                  <CardContent className="p-4">
                    <div className="text-base font-bold text-center text-slate-900 mb-3">
                      {format(monthDate, 'MMMM', { locale: es })}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">✓ Hábiles:</span>
                        <span className="font-bold text-green-900">{laborables}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-red-700">✗ No hábiles:</span>
                        <span className="font-bold text-red-900">{noHabiles}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <>
            {viewType !== 'week' && (
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                  <div key={day} className="text-center font-semibold text-xs text-slate-600 p-2">
                    {day}
                  </div>
                ))}
              </div>
            )}

            <div className={`grid gap-2 ${viewType === 'week' ? 'grid-cols-7' : 'grid-cols-7'}`}>
              {viewType === 'month' && Array.from({ length: getDay(start) === 0 ? 6 : getDay(start) - 1 }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {days.map(day => {
                const { isHoliday, isVacation, isWeekend } = getDayType(day);
                const isToday = isSameDay(day, new Date());
                const holidayName = getHolidayName(day);
                const isNoHabil = isHoliday || isVacation || isWeekend;

                return (
                  <div
                    key={day.toString()}
                    className={`${viewType === 'week' ? 'p-4' : 'aspect-square p-2'} border-2 rounded-lg transition-all ${
                      isToday ? 'border-blue-500 ring-2 ring-blue-200' :
                      isHoliday ? 'bg-red-100 border-red-400' :
                      isVacation ? 'bg-blue-100 border-blue-400' :
                      isWeekend ? 'bg-slate-100 border-slate-300' :
                      'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                    title={holidayName || (isNoHabil ? 'Día no hábil' : 'Día hábil')}
                  >
                    {viewType === 'week' ? (
                      <div>
                        <div className="text-xs text-slate-500 font-semibold">
                          {format(day, 'EEEE', { locale: es })}
                        </div>
                        <div className={`text-2xl font-bold ${
                          isHoliday ? 'text-red-900' :
                          isVacation ? 'text-blue-900' :
                          isWeekend ? 'text-slate-500' :
                          'text-slate-900'
                        }`}>
                          {format(day, 'd')}
                        </div>
                        {isNoHabil && (
                          <Badge className={`mt-2 text-xs ${
                            isHoliday ? 'bg-red-600' :
                            isVacation ? 'bg-blue-600' :
                            'bg-slate-500'
                          }`}>
                            No hábil
                          </Badge>
                        )}
                        {holidayName && (
                          <div className="text-xs text-red-800 mt-1">
                            {holidayName}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-white border-2 border-slate-200 rounded" />
            <span className="text-sm text-slate-700 font-medium">Día Hábil</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-red-100 border-2 border-red-400 rounded" />
            <span className="text-sm text-slate-700">Festivo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-100 border-2 border-blue-400 rounded" />
            <span className="text-sm text-slate-700">Vacaciones</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-slate-100 border-2 border-slate-300 rounded" />
            <span className="text-sm text-slate-700">Fin de Semana</span>
          </div>
        </div>
      </CardContent>

      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          
          body * {
            visibility: hidden;
          }
          
          #work-calendar,
          #work-calendar * {
            visibility: visible;
          }
          
          #work-calendar {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </Card>
  );
}