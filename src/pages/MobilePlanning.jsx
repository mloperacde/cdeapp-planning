import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, Cog, Users, WifiOff } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isToday } from "date-fns";
import { es } from "date-fns/locale";

const STORAGE_KEYS = {
  EMPLOYEES: 'offline_employees',
  PLANNING: 'offline_planning',
  TEAM_SCHEDULES: 'offline_team_schedules',
};

const offlineStorage = {
  saveEmployees: (employees) => localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees)),
  getEmployees: () => {
    const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    return data ? JSON.parse(data) : [];
  },
  savePlanning: (planning) => localStorage.setItem(STORAGE_KEYS.PLANNING, JSON.stringify(planning)),
  getPlanning: () => {
    const data = localStorage.getItem(STORAGE_KEYS.PLANNING);
    return data ? JSON.parse(data) : [];
  },
  saveTeamSchedules: (schedules) => localStorage.setItem(STORAGE_KEYS.TEAM_SCHEDULES, JSON.stringify(schedules)),
  getTeamSchedules: () => {
    const data = localStorage.getItem(STORAGE_KEYS.TEAM_SCHEDULES);
    return data ? JSON.parse(data) : [];
  },
};

export default function MobilePlanningPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day');
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: online,
  });

  const { data: employee } = useQuery({
    queryKey: ['employee', user?.id],
    queryFn: async () => {
      if (online) {
        const employees = await base44.entities.Employee.list();
        const emp = employees.find(e => e.email === user?.email);
        if (emp) {
          offlineStorage.saveEmployees([emp]);
        }
        return emp;
      }
      const cached = offlineStorage.getEmployees();
      return cached[0] || null;
    },
    enabled: !!user,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['machineAssignments', employee?.id],
    queryFn: async () => {
      if (online) {
        const data = await base44.entities.MachineAssignment.filter({
          employee_id: employee.id,
          fecha: format(selectedDate, 'yyyy-MM-dd')
        });
        offlineStorage.savePlanning(data);
        return data;
      }
      return offlineStorage.getPlanning();
    },
    enabled: !!employee?.id,
  });

  const { data: teamSchedules = [] } = useQuery({
    queryKey: ['teamWeekSchedules'],
    queryFn: async () => {
      if (online) {
        const data = await base44.entities.TeamWeekSchedule.list();
        offlineStorage.saveTeamSchedules(data);
        return data;
      }
      return offlineStorage.getTeamSchedules();
    },
    enabled: online,
  });

  const getTodayShift = () => {
    if (!employee) return null;

    if (employee.tipo_turno === "Fijo Mañana") {
      return {
        type: "Mañana",
        start: employee.horario_manana_inicio || "07:00",
        end: employee.horario_manana_fin || "15:00"
      };
    }

    if (employee.tipo_turno === "Fijo Tarde") {
      return {
        type: "Tarde",
        start: employee.horario_tarde_inicio || "14:00",
        end: employee.horario_tarde_fin || "22:00"
      };
    }

    if (employee.tipo_turno === "Rotativo" && employee.equipo) {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      
      const schedule = teamSchedules.find(s => 
        s.team_name === employee.equipo && s.fecha_inicio_semana === weekStartStr
      );

      if (schedule) {
        const dayName = format(selectedDate, 'EEEE', { locale: es }).toLowerCase();
        const dayMap = {
          'lunes': 'lunes',
          'martes': 'martes',
          'miércoles': 'miercoles',
          'jueves': 'jueves',
          'viernes': 'viernes',
          'sábado': 'sabado',
          'domingo': 'domingo'
        };
        
        const shift = schedule[dayMap[dayName]];
        
        if (shift === "Mañana") {
          return {
            type: "Mañana",
            start: employee.horario_manana_inicio || "07:00",
            end: employee.horario_manana_fin || "15:00"
          };
        } else if (shift === "Tarde") {
          return {
            type: "Tarde",
            start: employee.horario_tarde_inicio || "14:00",
            end: employee.horario_tarde_fin || "22:00"
          };
        }
      }
    }

    return null;
  };

  const shift = getTodayShift();
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pb-20">
      {!online && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          Modo sin conexión - Mostrando datos guardados
        </div>
      )}
      
      <div className="p-4 space-y-4">
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Mi Planning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'day' ? 'default' : 'outline'}
                onClick={() => setViewMode('day')}
                className="flex-1"
              >
                Día
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                onClick={() => setViewMode('week')}
                className="flex-1"
              >
                Semana
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(addDays(selectedDate, viewMode === 'day' ? -1 : -7))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 text-center">
                <p className="font-semibold text-slate-900">
                  {format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(addDays(selectedDate, viewMode === 'day' ? 1 : 7))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {viewMode === 'day' && shift && (
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">Tu turno de hoy:</p>
                <div className="flex items-center justify-between">
                  <Badge className={shift.type === "Mañana" ? "bg-amber-500" : "bg-indigo-600"}>
                    {shift.type}
                  </Badge>
                  <p className="font-semibold text-blue-900">
                    {shift.start} - {shift.end}
                  </p>
                </div>
              </div>
            )}

            {assignments.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Cog className="w-4 h-4" />
                  Máquinas Asignadas
                </h4>
                <div className="space-y-2">
                  {assignments.map((assignment, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border rounded-lg">
                      <p className="font-medium text-slate-900">{assignment.machine_name || 'Máquina'}</p>
                      <p className="text-xs text-slate-600">Proceso: {assignment.process_name || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewMode === 'week' && (
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900">Horario Semanal</h4>
                <div className="space-y-2">
                  {weekDays.map((day, idx) => {
                    const daySchedule = teamSchedules.find(s => 
                      s.team_name === employee?.equipo && 
                      s.fecha_inicio_semana === format(weekStart, 'yyyy-MM-dd')
                    );
                    
                    const dayName = format(day, 'EEEE', { locale: es }).toLowerCase();
                    const dayMap = {
                      'lunes': 'lunes',
                      'martes': 'martes',
                      'miércoles': 'miercoles',
                      'jueves': 'jueves',
                      'viernes': 'viernes',
                      'sábado': 'sabado',
                      'domingo': 'domingo'
                    };
                    
                    const shift = daySchedule?.[dayMap[dayName]];
                    
                    return (
                      <div key={idx} className={`p-3 rounded-lg border ${isToday(day) ? 'bg-blue-50 border-blue-300' : 'bg-slate-50'}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-slate-900">
                              {format(day, "EEEE d", { locale: es })}
                            </p>
                          </div>
                          {shift && (
                            <Badge className={shift === "Mañana" ? "bg-amber-500" : "bg-indigo-600"}>
                              {shift}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {employee?.equipo && (
              <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                <p className="text-sm text-purple-800 mb-1">Tu equipo:</p>
                <p className="font-semibold text-purple-900 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {employee.equipo}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}