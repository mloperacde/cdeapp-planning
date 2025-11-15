import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight, Download, Edit2, Save, X } from "lucide-react";
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, 
  addYears, subYears, startOfYear, endOfYear, eachMonthOfInterval
} from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function WorkCalendar({ holidays = [], vacations = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingId, setEditingId] = useState(null);
  const [editingDesc, setEditingDesc] = useState("");
  const queryClient = useQueryClient();

  const updateHolidayMutation = useMutation({
    mutationFn: ({ id, descripcion }) => base44.entities.Holiday.update(id, { descripcion }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success("Descripción actualizada");
      setEditingId(null);
    }
  });

  const updateVacationMutation = useMutation({
    mutationFn: ({ id, descripcion }) => base44.entities.Vacation.update(id, { descripcion }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
      toast.success("Descripción actualizada");
      setEditingId(null);
    }
  });

  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  const getDayType = (date) => {
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

    const vacation = vacations.find(v => {
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

    return { 
      isHoliday: !!holiday, 
      isVacation: !!vacation, 
      isWeekend,
      holiday,
      vacation
    };
  };

  const getMonthDays = (monthDate) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  };

  const noLaborablesList = useMemo(() => {
    const list = [];
    
    // Agregar festivos
    holidays.forEach(h => {
      if (!h.fecha) return;
      try {
        const date = new Date(h.fecha);
        const year = date.getFullYear();
        const currentYear = currentDate.getFullYear();
        if (year === currentYear) {
          list.push({
            type: 'festivo',
            fecha: date,
            nombre: h.nombre,
            descripcion: h.descripcion,
            id: h.id,
            entity: 'Holiday'
          });
        }
      } catch {}
    });

    // Agregar vacaciones
    vacations.forEach(v => {
      if (!v.fecha_inicio || !v.fecha_fin) return;
      try {
        const start = new Date(v.fecha_inicio);
        const end = new Date(v.fecha_fin);
        const year = start.getFullYear();
        const currentYear = currentDate.getFullYear();
        if (year === currentYear) {
          list.push({
            type: 'vacaciones',
            fecha: start,
            nombre: v.nombre || `Vacaciones del ${format(start, 'dd/MM')} al ${format(end, 'dd/MM')}`,
            descripcion: v.descripcion,
            fecha_fin: end,
            id: v.id,
            entity: 'Vacation'
          });
        }
      } catch {}
    });

    return list.sort((a, b) => a.fecha - b.fecha);
  }, [holidays, vacations, currentDate]);

  const stats = useMemo(() => {
    let laborables = 0;
    let festivos = 0;
    let vacaciones = 0;
    let finesSemana = 0;

    months.forEach(monthDate => {
      const monthDays = getMonthDays(monthDate);
      
      monthDays.forEach(day => {
        const { isHoliday, isVacation, isWeekend } = getDayType(day);
        if (isHoliday) festivos++;
        else if (isVacation) vacaciones++;
        else if (isWeekend) finesSemana++;
        else laborables++;
      });
    });

    const totalNoHabiles = festivos + vacaciones + finesSemana;
    return { laborables, festivos, vacaciones, finesSemana, totalNoHabiles };
  }, [months, holidays, vacations]);

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleEditDescription = (item) => {
    setEditingId(item.id);
    setEditingDesc(item.descripcion || "");
  };

  const handleSaveDescription = (item) => {
    if (item.entity === 'Holiday') {
      updateHolidayMutation.mutate({ id: item.id, descripcion: editingDesc });
    } else {
      updateVacationMutation.mutate({ id: item.id, descripcion: editingDesc });
    }
  };

  return (
    <>
      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm" id="work-calendar">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Calendario Laboral - {format(currentDate, "yyyy", { locale: es })}
            </CardTitle>
            <div className="flex gap-2 print:hidden">
              <Button onClick={() => setCurrentDate(subYears(currentDate, 1))} variant="outline" size="sm">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button onClick={() => setCurrentDate(addYears(currentDate, 1))} variant="outline" size="sm">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button onClick={handleDownloadPDF} variant="default" size="sm" className="bg-blue-600">
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-900">{stats.laborables}</div>
                <div className="text-xs text-green-700">Días Hábiles</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-50 border-slate-300">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-slate-900">{stats.totalNoHabiles}</div>
                <div className="text-xs text-slate-700">No Hábiles</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-red-900">{stats.festivos}</div>
                <div className="text-xs text-red-700">Festivos</div>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-blue-900">{stats.vacaciones}</div>
                <div className="text-xs text-blue-700">Vacaciones</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-100 border-slate-200">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-slate-900">{stats.finesSemana}</div>
                <div className="text-xs text-slate-700">Fines Semana</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {months.map(monthDate => {
              const monthDays = getMonthDays(monthDate);
              
              return (
                <Card key={monthDate.toString()} className="border-2 border-slate-200">
                  <CardHeader className="pb-2 bg-slate-50 border-b">
                    <CardTitle className="text-sm font-bold text-center">
                      {format(monthDate, 'MMMM', { locale: es }).toUpperCase()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2">
                    <div className="grid grid-cols-7 gap-0.5 mb-1">
                      {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                        <div key={day} className="text-center text-[8px] font-semibold text-slate-500">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-0.5">
                      {Array.from({ length: getDay(monthDays[0]) === 0 ? 6 : getDay(monthDays[0]) - 1 }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square" />
                      ))}

                      {monthDays.map(day => {
                        const { isHoliday, isVacation, isWeekend, holiday, vacation } = getDayType(day);
                        const isToday = isSameDay(day, new Date());
                        const isNoHabil = isHoliday || isVacation || isWeekend;

                        return (
                          <div
                            key={day.toString()}
                            className={`aspect-square flex items-center justify-center text-[10px] font-semibold rounded ${
                              isToday ? 'ring-2 ring-blue-500' :
                              isHoliday ? 'bg-red-200 text-red-900' :
                              isVacation ? 'bg-blue-200 text-blue-900' :
                              isWeekend ? 'bg-slate-200 text-slate-600' :
                              'text-slate-700'
                            }`}
                            title={
                              holiday?.nombre || 
                              vacation?.nombre || 
                              (isWeekend ? 'Fin de semana' : '')
                            }
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

          <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t print:hidden">
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

      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm mt-6" id="no-laborables-list">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Relación de Días No Laborables {format(currentDate, "yyyy")} ({noLaborablesList.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {noLaborablesList.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No hay días no laborables configurados para este año
            </div>
          ) : (
            <div className="space-y-2">
              {noLaborablesList.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className={`border-2 rounded-lg p-4 ${
                  item.type === 'festivo' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={item.type === 'festivo' ? 'bg-red-600' : 'bg-blue-600'}>
                          {item.type === 'festivo' ? 'FESTIVO' : 'VACACIONES'}
                        </Badge>
                        <span className="font-bold text-slate-900">
                          {format(item.fecha, "dd/MM/yyyy - EEEE", { locale: es })}
                        </span>
                        {item.fecha_fin && (
                          <span className="text-sm text-slate-600">
                            al {format(item.fecha_fin, "dd/MM/yyyy", { locale: es })}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-slate-900 mb-1">{item.nombre}</div>
                      
                      {editingId === item.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingDesc}
                            onChange={(e) => setEditingDesc(e.target.value)}
                            rows={2}
                            className="text-sm"
                            placeholder="Añadir descripción..."
                          />
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleSaveDescription(item)}
                              disabled={updateHolidayMutation.isPending || updateVacationMutation.isPending}
                            >
                              <Save className="w-3 h-3 mr-1" />
                              Guardar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setEditingId(null)}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {item.descripcion && (
                            <p className="text-sm text-slate-600">{item.descripcion}</p>
                          )}
                          {!item.descripcion && (
                            <p className="text-sm text-slate-400 italic">Sin descripción</p>
                          )}
                        </>
                      )}
                    </div>
                    
                    {editingId !== item.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditDescription(item)}
                        className="print:hidden"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          
          body * {
            visibility: hidden;
          }
          
          #work-calendar,
          #work-calendar *,
          #no-laborables-list,
          #no-laborables-list * {
            visibility: visible;
          }
          
          #work-calendar {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            page-break-after: always;
          }
          
          #no-laborables-list {
            position: absolute;
            left: 0;
            top: 100%;
            width: 100%;
            margin-top: 20mm;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          @media print {
            .bg-red-200, .bg-blue-200, .bg-slate-200, .bg-red-50, .bg-blue-50, .bg-green-50, .bg-slate-50 {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        }
      `}</style>
    </>
  );
}