
import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, AlertCircle, ChevronLeft, ChevronRight, Users, Wifi, WifiOff } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { offlineStorage, isOnline } from "../components/utils/offlineStorage";

export default function MobilePlanningPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("day");
  const [online, setOnline] = useState(isOnline()); // Updated to use isOnline() from utils
  const [cachedData, setCachedData] = useState({
    employees: [],
    assignments: [],
    schedules: []
  });

  useEffect(() => {
    const handleOnline = () => setOnline(true); // Updated setOnline
    const handleOffline = () => setOnline(false); // Updated setOnline
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const { data: user } = useQuery({ // Renamed currentUser to user
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: online, // Only fetch if online
  });

  const { data: employee } = useQuery({
    queryKey: ['employee', user?.id], // Updated query key to use user.id
    queryFn: async () => {
      if (online) {
        const employees = await base44.entities.Employee.list(); // Fetch all employees
        const emp = employees.find(e => e.email === user?.email); // Find current employee
        if (emp) {
          offlineStorage.saveEmployees([emp]); // Save to offline storage
          setCachedData(prev => ({ ...prev, employees: [emp] })); // Update local cached state
        }
        return emp;
      }
      // If offline, try to get from cached storage
      const cached = offlineStorage.getEmployees();
      return cached[0] || null; // Assuming one employee per user
    },
    enabled: !!user, // Enabled when user is available
  });

  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);

  const { data: assignments = [] } = useQuery({ // Renamed machineAssignments to assignments
    queryKey: ['machineAssignments', employee?.id, selectedDate.toDateString()], // Added selectedDate to key
    queryFn: async () => {
      if (online) {
        const data = await base44.entities.MachineAssignment.filter({
          employee_id: employee.id,
          fecha_asignacion: format(selectedDate, 'yyyy-MM-dd') // Corrected field name as per existing code
        });
        offlineStorage.savePlanning(data); // Save to offline storage
        setCachedData(prev => ({ ...prev, assignments: data })); // Update local cached state
        return data;
      }
      // If offline, try to get from cached storage
      // Note: offlineStorage.getPlanning() might need a date parameter for specific assignments
      // For now, it returns all cached planning.
      return offlineStorage.getPlanning().filter(
        assignment => format(new Date(assignment.fecha_asignacion), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && assignment.employee_id === employee?.id
      );
    },
    initialData: [],
    enabled: !!employee?.id,
  });

  const { data: teamSchedules = [] } = useQuery({ // Renamed teamSchedule to teamSchedules
    queryKey: ['teamWeekSchedules'], // Changed query key
    queryFn: async () => {
      if (online) {
        const data = await base44.entities.TeamWeekSchedule.list(); // Fetch all schedules
        offlineStorage.saveTeamSchedules(data); // Save to offline storage
        setCachedData(prev => ({ ...prev, schedules: data })); // Update local cached state
        return data;
      }
      // If offline, try to get from cached storage
      return offlineStorage.getTeamSchedules();
    },
    enabled: online, // Only fetch if online
  });

  // Removed old useEffect for cachedData as queries now handle it

  const getDaySchedule = (date) => {
    const dayOfWeek = format(date, 'EEEE', { locale: es }).toLowerCase();
    
    // Find the relevant team schedule from the array based on the employee's team name
    const currentTeamSchedule = teamSchedules.find(schedule => schedule.team_name === displayEmployee?.equipo);

    if (displayEmployee?.tipo_turno === "Rotativo" && currentTeamSchedule) {
      const daySchedule = currentTeamSchedule[`${dayOfWeek}_shifts`];
      return daySchedule || [];
    }

    if (displayEmployee?.tipo_turno === "Fijo Mañana") {
      return [{
        shift_name: "Mañana",
        start_time: displayEmployee.horario_manana_inicio || "06:00",
        end_time: displayEmployee.horario_manana_fin || "14:00"
      }];
    }

    if (displayEmployee?.tipo_turno === "Fijo Tarde") {
      return [{
        shift_name: "Tarde",
        start_time: displayEmployee.horario_tarde_inicio || "14:00",
        end_time: displayEmployee.horario_tarde_fin || "22:00"
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

  // Use employee data from query directly, it already handles offline cache from offlineStorage
  const displayEmployee = employee;

  if (!displayEmployee) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pb-20">
      {!online && ( // Changed isOnline to online
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm">
          Modo sin conexión - Mostrando datos guardados
        </div>
      )}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-4 pb-6 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Mi Planificación
          </h1>
          {!online && ( // Changed isOnline to online
            <Badge className="bg-amber-500 text-white gap-1">
              <WifiOff className="w-3 h-3" />
              Sin conexión
            </Badge>
          )}
        </div>
        <p className="text-blue-100 text-xs">Consulta tus turnos y asignaciones</p>
      </div>

      <div className="px-3 -mt-4 space-y-3">
        <Card className="shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(prev => addDays(prev, viewMode === "day" ? -1 : -7))}
                className="h-8 px-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="text-center">
                <p className="font-bold text-slate-900 text-sm">
                  {viewMode === "day" 
                    ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })
                    : `${format(weekStart, "d MMM", { locale: es })} - ${format(weekEnd, "d MMM", { locale: es })}`
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
                className="h-8 px-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={viewMode === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("day")}
                className="flex-1 h-8 text-xs"
              >
                Día
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("week")}
                className="flex-1 h-8 text-xs"
              >
                Semana
              </Button>
            </div>
          </CardContent>
        </Card>

        {viewMode === "day" ? (
          <div className="space-y-3">
            <Card className="shadow-md border-2 border-blue-200">
              <CardContent className="p-3">
                <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Turno Asignado
                </h3>

                {getDaySchedule(selectedDate).length === 0 ? (
                  <p className="text-xs text-slate-500">Día libre / No asignado</p>
                ) : (
                  <div className="space-y-2">
                    {getDaySchedule(selectedDate).map((shift, idx) => (
                      <div key={idx} className="bg-blue-50 p-2 rounded-lg">
                        <p className="font-semibold text-blue-900 text-sm">{shift.shift_name}</p>
                        <p className="text-xs text-blue-700">
                          {shift.start_time} - {shift.end_time}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {assignments.length > 0 && ( // Renamed machineAssignments to assignments
              <Card className="shadow-md">
                <CardContent className="p-3">
                  <h3 className="font-bold text-slate-900 mb-2 text-sm">Máquinas Asignadas</h3>
                  <div className="space-y-2">
                    {assignments.map(assignment => ( // Renamed machineAssignments to assignments
                      <div key={assignment.id} className="bg-slate-50 p-2 rounded-lg">
                        <p className="font-semibold text-slate-900 text-sm">{assignment.machine_name}</p>
                        {assignment.turno && (
                          <Badge variant="outline" className="mt-1 text-xs">{assignment.turno}</Badge>
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
                <Card key={day.toString()} className={`shadow-sm ${isToday(day) ? 'border-2 border-emerald-400' : ''}`}>
                  <CardContent className="p-2">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          {format(day, "EEEE", { locale: es })}
                        </p>
                        <p className="text-xs text-slate-600">
                          {format(day, "d 'de' MMMM", { locale: es })}
                        </p>
                      </div>
                      {isToday(day) && (
                        <Badge className="bg-emerald-600 text-white text-xs">Hoy</Badge>
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

        {displayEmployee.equipo && (
          <Card className="shadow-md bg-purple-50 border-2 border-purple-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="font-bold text-purple-900 text-sm">Tu Equipo</p>
                  <p className="text-xs text-purple-700">{displayEmployee.equipo}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
