import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MaintenanceSchedulingCalendar({ machine }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: plans = [] } = useQuery({
    queryKey: ['machine-plans-calendar', machine?.id],
    queryFn: () => base44.entities.MaintenancePlan.filter({ machine_id: machine?.id, activo: true }),
    enabled: !!machine,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['maintenance-schedules', machine?.id],
    queryFn: () => base44.entities.MaintenanceSchedule.filter({ machine_id: machine?.id }),
    enabled: !!machine,
  });

  if (!machine) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Selecciona una máquina para ver el calendario
      </div>
    );
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getSchedulesForDate = (date) => {
    return schedules.filter(s => {
      const scheduleDate = new Date(s.fecha_programada);
      return scheduleDate.toDateString() === date.toDateString();
    });
  };

  const getPlansForDate = (date) => {
    return plans.filter(p => {
      if (!p.proxima_fecha) return false;
      const planDate = new Date(p.proxima_fecha);
      return planDate.toDateString() === date.toDateString();
    });
  };

  const isOverdue = (date) => {
    const dateSchedules = getSchedulesForDate(date);
    return dateSchedules.some(s => s.estado === 'Pendiente' || s.estado === 'Programado');
  };

  const isToday = (date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-sm"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-sm"
            >
              Hoy
            </button>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-sm"
            >
              →
            </button>
          </div>
        </div>

        {/* Días de semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-slate-600 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendario */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, idx) => {
            const daySchedules = getSchedulesForDate(date);
            const dayPlans = getPlansForDate(date);
            const hasMaintenance = daySchedules.length > 0 || dayPlans.length > 0;

            return (
              <div
                key={idx}
                className={`min-h-16 p-1 rounded border text-xs ${
                  !isCurrentMonth(date)
                    ? 'bg-slate-50 dark:bg-slate-900/30 text-slate-400'
                    : isToday(date)
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300'
                    : hasMaintenance
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {format(date, 'd')}
                </div>
                <div className="space-y-0.5">
                  {daySchedules.map(s => (
                    <div
                      key={s.id}
                      className={`truncate px-1 py-0.5 rounded text-xs text-white font-medium ${
                        s.estado === 'Completado' ? 'bg-green-500' : 'bg-orange-500'
                      }`}
                    >
                      Programado
                    </div>
                  ))}
                  {dayPlans.map(p => (
                    <div
                      key={p.id}
                      className="truncate px-1 py-0.5 rounded text-xs bg-blue-500 text-white font-medium"
                    >
                      Plan
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Próximos mantenimientos */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Próximos Mantenimientos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-2">
          {plans.length === 0 ? (
            <p className="text-sm text-slate-500">Sin mantenimientos programados</p>
          ) : (
            plans.map(plan => {
              const daysUntil = Math.ceil((new Date(plan.proxima_fecha) - new Date()) / (1000 * 60 * 60 * 24));
              const isUrgent = daysUntil <= 7;

              return (
                <div key={plan.id} className={`p-2 rounded border text-sm ${
                  isUrgent ? 'bg-red-50 dark:bg-red-900/20 border-red-300' : 'bg-slate-50 dark:bg-slate-900/50'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium">{plan.nombre_plan}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {format(new Date(plan.proxima_fecha), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                    <Badge className={isUrgent ? 'bg-red-600' : 'bg-blue-600'}>
                      {daysUntil} días
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}