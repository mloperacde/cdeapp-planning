import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, ChevronLeft, ChevronRight, Download, Edit2, Save, X, Plus } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay,
  addYears, subYears, startOfYear, endOfYear, eachMonthOfInterval
} from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import HolidayManager from "../timeline/HolidayManager";
import VacationManager from "../timeline/VacationManager";

export default function WorkCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingId, setEditingId] = useState(null);
  const [editingDesc, setEditingDesc] = useState("");
  const [showHolidayManager, setShowHolidayManager] = useState(false);
  const [showVacationManager, setShowVacationManager] = useState(false);
  const queryClient = useQueryClient();

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
    initialData: [],
  });

  const { data: vacations = [] } = useQuery({
    queryKey: ['vacations'],
    queryFn: () => base44.entities.Vacation.list(),
    initialData: [],
  });

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
    if (!date) return { isHoliday: false, isVacation: false, isWeekend: false, holiday: null, vacation: null };
    
    const dateStr = format(date, 'yyyy-MM-dd');

    const holiday = Array.isArray(holidays) ? holidays.find(h => {
      if (!h?.date) return false;
      try {
        const hDate = format(new Date(h.date), 'yyyy-MM-dd');
        return hDate === dateStr;
      } catch {
        return false;
      }
    }) : null;

    const vacation = Array.isArray(vacations) ? vacations.find(v => {
      if (!v?.start_date || !v?.end_date) return false;
      try {
        const vStart = new Date(v.start_date);
        const vEnd = new Date(v.end_date);
        vStart.setHours(0, 0, 0, 0);
        vEnd.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate >= vStart && checkDate <= vEnd;
      } catch {
        return false;
      }
    }) : null;

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
    if (!monthDate) return [];
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  };

  const { festivosList, vacacionesList } = useMemo(() => {
    const festivos = [];
    const vacaciones = [];

    if (Array.isArray(holidays)) {
      holidays.forEach(h => {
        if (!h?.date) return;
        try {
          const date = new Date(h.date);
          const year = date.getFullYear();
          const currentYear = currentDate.getFullYear();
          if (year === currentYear) {
            festivos.push({
              fecha: date,
              nombre: h.name,
              descripcion: h.description,
              id: h.id,
              entity: 'Holiday'
            });
          }
        } catch {}
      });
    }

    if (Array.isArray(vacations)) {
      vacations.forEach(v => {
        if (!v?.start_date || !v?.end_date) return;
        try {
          const start = new Date(v.start_date);
          const end = new Date(v.end_date);
          const year = start.getFullYear();
          const currentYear = currentDate.getFullYear();
          if (year === currentYear) {
            const allDays = eachDayOfInterval({ start, end });
            const dias = allDays.filter(d => {
              const dayOfWeek = getDay(d);
              return dayOfWeek !== 0 && dayOfWeek !== 6;
            }).length;
            
            vacaciones.push({
              fecha: start,
              nombre: v.name || `Vacaciones`,
              descripcion: v.notes,
              fecha_fin: end,
              dias: dias,
              id: v.id,
              entity: 'Vacation'
            });
          }
        } catch {}
      });
    }

    return {
      festivosList: festivos.sort((a, b) => a.fecha - b.fecha),
      vacacionesList: vacaciones.sort((a, b) => a.fecha - b.fecha)
    };
  }, [holidays, vacations, currentDate]);

  const stats = useMemo(() => {
    let laborables = 0;
    let festivos = 0;
    let vacaciones = 0;
    let finesSemana = 0;

    if (Array.isArray(months)) {
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
    }

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
              <Button onClick={() => setShowHolidayManager(true)} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Gestionar Festivos
              </Button>
              <Button onClick={() => setShowVacationManager(true)} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Gestionar Vacaciones
              </Button>
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
        <CardContent className="p-6 print:p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 print:mb-3 print:gap-2">
            <Card className="bg-green-50 border-green-200 print:border">
              <CardContent className="p-3 text-center print:p-2">
                <div className="text-2xl font-bold text-green-900 print:text-lg">{stats.laborables}</div>
                <div className="text-xs text-green-700 print:text-[10px]">Días Hábiles</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-50 border-slate-300 print:border">
              <CardContent className="p-3 text-center print:p-2">
                <div className="text-2xl font-bold text-slate-900 print:text-lg">{stats.totalNoHabiles}</div>
                <div className="text-xs text-slate-700 print:text-[10px]">No Hábiles</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200 print:border">
              <CardContent className="p-3 text-center print:p-2">
                <div className="text-2xl font-bold text-red-900 print:text-lg">{stats.festivos}</div>
                <div className="text-xs text-red-700 print:text-[10px]">Festivos</div>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200 print:border">
              <CardContent className="p-3 text-center print:p-2">
                <div className="text-2xl font-bold text-blue-900 print:text-lg">{stats.vacaciones}</div>
                <div className="text-xs text-blue-700 print:text-[10px]">Vacaciones</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-100 border-slate-200 print:border">
              <CardContent className="p-3 text-center print:p-2">
                <div className="text-2xl font-bold text-slate-900 print:text-lg">{stats.finesSemana}</div>
                <div className="text-xs text-slate-700 print:text-[10px]">Fines Semana</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 print:gap-1.5">
            {months.map(monthDate => {
              const monthDays = getMonthDays(monthDate);

              return (
                <Card key={monthDate.toString()} className="border border-slate-200 print:border-slate-400">
                  <CardHeader className="pb-1 bg-slate-50 border-b print:pb-0.5 print:bg-slate-100">
                    <CardTitle className="text-xs font-bold text-center print:text-[9px]">
                      {format(monthDate, 'MMMM', { locale: es }).toUpperCase()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-1.5 print:p-0.5">
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
                        const { isHoliday, isVacation, isWeekend, holiday, vacation } = getDayType(day);
                        const isToday = isSameDay(day, new Date());

                        return (
                          <div
                            key={day.toString()}
                            className={`aspect-square flex items-center justify-center text-[9px] font-semibold rounded print:text-[7px] ${
                              isToday ? 'ring-2 ring-blue-500' :
                              isHoliday ? 'bg-red-200 text-red-900' :
                              isVacation ? 'bg-blue-200 text-blue-900' :
                              isWeekend ? 'bg-slate-200 text-slate-600' :
                              'text-slate-700'
                            }`}
                            title={
                              holiday?.name ||
                              vacation?.name ||
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

          <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t print:hidden">
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

      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm mt-6 print:mt-2" id="no-laborables-list">
        <CardHeader className="border-b print:pb-1">
          <CardTitle className="flex items-center gap-2 print:text-sm">
            <Calendar className="w-5 h-5 text-blue-600 print:w-4 print:h-4" />
            Relación de Días No Laborables {format(currentDate, "yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 print:p-3">
          {festivosList.length === 0 && vacacionesList.length === 0 ? (
            <div className="text-center py-8 text-slate-500 print:py-4 print:text-xs">
              No hay días no laborables configurados para este año
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-bold text-red-900 mb-3 text-sm print:text-xs flex items-center gap-2">
                  <Badge className="bg-red-600 print:text-[8px]">FESTIVOS</Badge>
                  ({festivosList.length})
                </h3>
                <div className="space-y-2 print:space-y-1">
                  {festivosList.map((item, idx) => (
                    <div key={`festivo-${item.id}-${idx}`} className="border-2 rounded-lg p-3 print:p-1.5 print:border bg-red-50 border-red-200">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <span className="font-bold text-slate-900 text-sm print:text-[10px] block">
                            {format(item.fecha, "dd/MM/yyyy - EEEE", { locale: es })}
                          </span>
                          <div className="font-semibold text-red-900 mt-1 text-xs print:text-[9px]">{item.nombre}</div>

                          {editingId === item.id ? (
                            <div className="space-y-2 mt-2">
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
                                  disabled={updateHolidayMutation.isPending}
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
                                <p className="text-xs text-slate-600 print:text-[8px] mt-1">{item.descripcion}</p>
                              )}
                            </>
                          )}
                        </div>

                        {editingId !== item.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditDescription(item)}
                            className="print:hidden h-6 w-6 p-0"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {festivosList.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4">Sin festivos configurados</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-blue-900 mb-3 text-sm print:text-xs flex items-center gap-2">
                  <Badge className="bg-blue-600 print:text-[8px]">VACACIONES</Badge>
                  ({vacacionesList.length})
                </h3>
                <div className="space-y-2 print:space-y-1">
                  {vacacionesList.map((item, idx) => (
                    <div key={`vacacion-${item.id}-${idx}`} className="border-2 rounded-lg p-3 print:p-1.5 print:border bg-blue-50 border-blue-200">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <span className="font-bold text-slate-900 text-sm print:text-[10px] block">
                            {format(item.fecha, "dd/MM/yyyy", { locale: es })} - {format(item.fecha_fin, "dd/MM/yyyy", { locale: es })}
                          </span>
                          <div className="font-semibold text-blue-900 mt-1 text-xs print:text-[9px]">
                            {item.nombre} ({item.dias} días laborables)
                          </div>

                          {editingId === item.id ? (
                            <div className="space-y-2 mt-2">
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
                                  disabled={updateVacationMutation.isPending}
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
                                <p className="text-xs text-slate-600 print:text-[8px] mt-1">{item.descripcion}</p>
                              )}
                            </>
                          )}
                        </div>

                        {editingId !== item.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditDescription(item)}
                            className="print:hidden h-6 w-6 p-0"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {vacacionesList.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4">Sin vacaciones configuradas</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showHolidayManager && (
        <HolidayManager
          open={showHolidayManager}
          onOpenChange={setShowHolidayManager}
          holidays={holidays}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['holidays'] })}
        />
      )}

      {showVacationManager && (
        <VacationManager
          open={showVacationManager}
          onOpenChange={setShowVacationManager}
          vacations={vacations}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['vacations'] })}
        />
      )}

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
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
            top: 0;
            width: 100%;
          }

          .print\\:hidden {
            display: none !important;
          }

          .bg-red-200, .bg-blue-200, .bg-slate-200, .bg-red-50, .bg-blue-50, .bg-green-50, .bg-slate-50, .bg-slate-100 {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
}