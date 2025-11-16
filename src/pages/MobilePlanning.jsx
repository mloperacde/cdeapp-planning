import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, AlertCircle, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isToday } from "date-fns";
import { es } from "date-fns/locale";

export default function MobilePlanningPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("day");

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employee } = useQuery({
    queryKey: ['currentEmployee', currentUser?.email],
    queryFn: () => currentUser?.email 
      ? base44.entities.Employee.filter({ email: currentUser.email }).then(r => r[0])
      : null,
    enabled: !!currentUser?.email,
  });

  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);

  const { data: machineAssignments = [] } = useQuery({
    queryKey: ['myMachineAssignments', employee?.id, selectedDate],
    queryFn: () => {
      if (!employee?.id) return [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      return base44.entities.MachineAssignment.filter({
        employee_id: employee.id,
        fecha_asignacion: dateStr
      });
    },
    initialData: [],
    enabled: !!employee?.id,
  });

  const { data: teamSchedule } = useQuery({
    queryKey: ['myTeamSchedule', employee?.equipo],
    queryFn: () => employee?.equipo
      ? base44.entities.TeamWeekSchedule.filter({ team_name: employee.equipo }).then(r => r[0])
      : null,
    enabled: !!employee?.equipo,
  });

  const getDaySchedule = (date) => {
    const dayOfWeek = format(date, 'EEEE', { locale: es }).toLowerCase();
    
    if (employee?.tipo_turno === "Rotativo" && teamSchedule) {
      const daySchedule = teamSchedule[`${dayOfWeek}_shifts`];
      return daySchedule || [];
    }

    if (employee?.tipo_turno === "Fijo Mañana") {
      return [{
        shift_name: "Mañana",
        start_time: employee.horario_manana_inicio || "06:00",
        end_time: employee.horario_manana_fin || "14:00"
      }];
    }

    if (employee?.tipo_turno === "Fijo Tarde") {
      return [{
        shift_name: "Tarde",
        start_time: employee.horario_tarde_inicio || "14:00",
        end_time: employee.horario_tarde_fin || "22:00"
      }];
    }

    return [];
  };

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [weekStart]);

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <p className="text-slate-600">Cargando información...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 pb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Mi Planificación
        </h1>
        <p className="text-blue-100 text-sm mt-1">Consulta tus turnos y asignaciones</p>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(prev => addDays(prev, viewMode === "day" ? -1 : -7))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="text-center">
                <p className="font-bold text-slate-900">
                  {viewMode === "day" 
                    ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })
                    : `Semana ${format(weekStart, "d MMM", { locale: es })} - ${format(weekEnd, "d MMM", { locale: es })}`
                  }
                </p>
                {isToday(selectedDate) && viewMode === "day" && (
                  <Badge className="bg-emerald-600 text-white text-xs mt-1">Hoy</Badge>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(prev => addDays(prev, viewMode === "day" ? 1 : 7))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={viewMode === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("day")}
                className="flex-1"
              >
                Día
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("week")}
                className="flex-1"
              >
                Semana
              </Button>
            </div>
          </CardContent>
        </Card>

        {viewMode === "day" ? (
          <div className="space-y-3">
            <Card className="shadow-md border-2 border-blue-200">
              <CardContent className="p-4">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Turno Asignado
                </h3>

                {getDaySchedule(selectedDate).length === 0 ? (
                  <p className="text-sm text-slate-500">Día libre / No asignado</p>
                ) : (
                  <div className="space-y-2">
                    {getDaySchedule(selectedDate).map((shift, idx) => (
                      <div key={idx} className="bg-blue-50 p-3 rounded-lg">
                        <p className="font-semibold text-blue-900">{shift.shift_name}</p>
                        <p className="text-sm text-blue-700">
                          {shift.start_time} - {shift.end_time}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {machineAssignments.length > 0 && (
              <Card className="shadow-md">
                <CardContent className="p-4">
                  <h3 className="font-bold text-slate-900 mb-3">Máquinas Asignadas</h3>
                  <div className="space-y-2">
                    {machineAssignments.map(assignment => (
                      <div key={assignment.id} className="bg-slate-50 p-3 rounded-lg">
                        <p className="font-semibold text-slate-900">{assignment.machine_name}</p>
                        {assignment.turno && (
                          <Badge variant="outline" className="mt-1">{assignment.turno}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {weekDays.map(day => {
              const daySchedule = getDaySchedule(day);
              return (
                <Card key={day.toString()} className={`shadow-md ${isToday(day) ? 'border-2 border-emerald-400' : ''}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-bold text-slate-900">
                          {format(day, "EEEE", { locale: es })}
                        </p>
                        <p className="text-xs text-slate-600">
                          {format(day, "d 'de' MMMM", { locale: es })}
                        </p>
                      </div>
                      {isToday(day) && (
                        <Badge className="bg-emerald-600 text-white">Hoy</Badge>
                      )}
                    </div>

                    {daySchedule.length === 0 ? (
                      <p className="text-xs text-slate-500">Día libre</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {daySchedule.map((shift, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {shift.shift_name}: {shift.start_time}-{shift.end_time}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {employee.equipo && (
          <Card className="shadow-md bg-purple-50 border-2 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-bold text-purple-900">Tu Equipo</p>
                  <p className="text-sm text-purple-700">{employee.equipo}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}