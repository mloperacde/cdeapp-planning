import { useMemo } from "react";
import { format, isWithinInterval, startOfWeek } from "date-fns";
import TimeSlot from "./TimeSlot";
import { AlertCircle, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SHIFTS, WORK_SCHEDULES, WORKING_HOURS } from "@/constants/shifts";

const WORKING_DAY_START = WORKING_HOURS.START_MINUTES;
const WORKING_DAY_END = WORKING_HOURS.END_MINUTES;

export default function TimelineView({
  startDate,
  endDate,
  holidays = [],
  vacations = [],
  selectedTeam = 'all',
  employees = [],
  teams = [],
  teamSchedules = [],
  viewMode = 'day',
  selectedDepartment = 'all'
}) {
  const { workingIntervals, stats } = useMemo(() => {
    if (!startDate || !endDate) {
      return { workingIntervals: [], stats: { totalEmployees: 0, intervals: 0 } };
    }

    const allIntervals = [];
    const stats = { totalEmployees: 0, intervals: 0 };
    const current = new Date(startDate);
    const end = new Date(endDate);

    current.setMinutes(Math.floor(current.getMinutes() / 5) * 5);
    current.setSeconds(0);
    current.setMilliseconds(0);

    const holidayDates = new Set(
      (Array.isArray(holidays) ? holidays : []).filter((h) => h?.date).map((h) => {
        try {
          return format(new Date(h.date), "yyyy-MM-dd");
        } catch {
          return null;
        }
      }).filter(Boolean)
    );

    const vacationRanges = (Array.isArray(vacations) ? vacations : []).filter((v) => v?.start_date && v?.end_date).map((v) => {
      try {
        return {
          start: new Date(v.start_date),
          end: new Date(v.end_date),
          employeeIds: v.aplica_todos ? null : v.employee_ids
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Filtrar empleados por equipo, departamento y que estén en estado Alta
    const getTeamName = (teamKey) => {
      const team = Array.isArray(teams) ? teams.find((t) => t?.team_key === teamKey) : null;
      return team?.team_name || '';
    };

    let filteredEmployees = Array.isArray(employees) ? employees.filter((emp) => emp?.estado_empleado === 'Alta') : [];

    // Filtro por departamento
    if (selectedDepartment !== 'all') {
      filteredEmployees = filteredEmployees.filter((emp) => emp?.departamento === selectedDepartment);
    }

    // Filtro por equipo
    if (selectedTeam !== 'all') {
      const team = Array.isArray(teams) ? teams.find((t) => t?.team_key === selectedTeam) : null;
      const teamName = team?.team_name || '';
      if (teamName) {
        filteredEmployees = filteredEmployees.filter((emp) => emp?.equipo === teamName);
      }
    }

    stats.totalEmployees = filteredEmployees.length;

    const getEmployeeTeamKey = (employee) => {
      if (!employee?.equipo) return null;
      const foundTeam = Array.isArray(teams) ? teams.find((t) => t.team_name === employee.equipo) : null;
      return foundTeam ? foundTeam.team_key : null;
    };

    const getTeamScheduleForWeek = (teamKey, date) => {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      return Array.isArray(teamSchedules) ? teamSchedules.find((s) => s?.team_key === teamKey && s?.fecha_inicio_semana === weekStartStr) : null;
    };

    // Pre-calcular disponibilidad de empleados
    const employeeAvailabilityMap = new Map();
    
    filteredEmployees.forEach(emp => {
      const teamKey = getEmployeeTeamKey(emp);
      
      employeeAvailabilityMap.set(emp.id, {
        employee: emp,
        teamKey,
        isAbsent: emp.disponibilidad === "Ausente",
        absStart: null,
        absEnd: null
      });
    });

    const getEmployeeShift = (employee, date, teamKey) => {
      if (!employee) return SHIFTS.MORNING;
      if (employee.tipo_turno === SHIFTS.FIXED_MORNING) return SHIFTS.MORNING;
      if (employee.tipo_turno === SHIFTS.FIXED_AFTERNOON) return SHIFTS.AFTERNOON;

      if (employee.tipo_turno === SHIFTS.ROTATING && teamKey) {
        const schedule = getTeamScheduleForWeek(teamKey, date);
        return schedule?.turno || SHIFTS.MORNING;
      }

      return SHIFTS.MORNING;
    };

    const getEmployeeSchedule = (employee, shift) => {
      if (!employee) return { start: WORK_SCHEDULES.MORNING.startHour * 60, end: WORK_SCHEDULES.MORNING.endHour * 60 };

      if (employee.tipo_jornada === "Reducida" && employee.horario_personalizado_inicio && employee.horario_personalizado_fin) {
        const [startH, startM] = employee.horario_personalizado_inicio.split(':').map(Number);
        const [endH, endM] = employee.horario_personalizado_fin.split(':').map(Number);
        return { start: startH * 60 + startM, end: endH * 60 + endM };
      }

      if (shift === SHIFTS.MORNING) {
        return { start: WORK_SCHEDULES.MORNING.startHour * 60, end: WORK_SCHEDULES.MORNING.endHour * 60 };
      } else {
        if (employee.tipo_jornada === "Completa 40h") {
          return { start: WORK_SCHEDULES.AFTERNOON_40H.startHour * 60, end: WORK_SCHEDULES.AFTERNOON_40H.endHour * 60 };
        } else {
          return { start: WORK_SCHEDULES.AFTERNOON.startHour * 60, end: WORK_SCHEDULES.AFTERNOON.endHour * 60 };
        }
      }
    };

    const isInWorkingHours = (date) => {
      const timeInMinutes = date.getHours() * 60 + date.getMinutes();
      return timeInMinutes >= WORKING_DAY_START && timeInMinutes < WORKING_DAY_END;
    };

    let index = 0;
    while (current <= end && index < 10000) {
      const currentDate = new Date(current);
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayDates.has(dateStr);
      const inWorkingHours = isInWorkingHours(currentDate);

      if (inWorkingHours && !isWeekend && !isHoliday) {
        const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
        let availableCount = 0;

        // Iterar sobre el mapa pre-calculado
        for (const [empId, data] of employeeAvailabilityMap) {
          const { employee, teamKey, isAbsent, absStart, absEnd } = data;
          
          // Check de ausencia específica
          let isNowAbsent = isAbsent;
          if (absStart && absEnd) {
            isNowAbsent = currentDate >= absStart && currentDate <= absEnd;
          }
          
          if (isNowAbsent) continue;
          
          // Check de vacaciones
          let isOnVacation = false;
          for (const vacRange of vacationRanges) {
            if (vacRange?.employeeIds === null || vacRange?.employeeIds?.includes(empId)) {
              if (isWithinInterval(currentDate, { start: vacRange.start, end: vacRange.end })) {
                isOnVacation = true;
                break;
              }
            }
          }
          
          if (isOnVacation) continue;
          
          // Check de horario
          const shift = getEmployeeShift(employee, currentDate, teamKey);
          const schedule = getEmployeeSchedule(employee, shift);
          
          if (currentMinutes >= schedule.start && currentMinutes < schedule.end) {
            availableCount++;
          }
        }

        allIntervals.push({
          date: currentDate,
          availableEmployees: availableCount
        });
        stats.intervals++;
      }

      current.setMinutes(current.getMinutes() + 5);
      index++;
    }

    return { workingIntervals: allIntervals, stats };
  }, [startDate, endDate, holidays, vacations, selectedTeam, employees, teams, teamSchedules, selectedDepartment]);

  if (workingIntervals.length === 0) {
    return (
      <div className="p-12 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <p className="text-slate-600 mb-2">
          No hay intervalos laborables en el rango seleccionado
        </p>
      </div>);

  }

  const maxEmployees = Math.max(...workingIntervals.map((i) => i?.availableEmployees || 0), 1);
  const avgEmployees = (workingIntervals.reduce((sum, i) => sum + (i?.availableEmployees || 0), 0) / workingIntervals.length).toFixed(1);

  const getTeamColor = () => {
    if (selectedTeam !== 'all') {
      const team = Array.isArray(teams) ? teams.find((t) => t?.team_key === selectedTeam) : null;
      return team?.color || '#3B82F6';
    }
    return '#3B82F6';
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          Disponibilidad de Empleados
          {selectedDepartment !== 'all' &&
          <span className="text-orange-600 ml-2">- {selectedDepartment}</span>
          }
          {selectedTeam !== 'all' &&
          <span style={{ color: getTeamColor() }} className="ml-2">
              - {teams.find((t) => t.team_key === selectedTeam)?.team_name}
            </span>
          }
        </h3>
        <p className="text-sm text-slate-600 mb-3">
          Cada punto muestra el número de empleados disponibles en ese intervalo de 5 minutos
        </p>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="outline" style={{
            backgroundColor: `${getTeamColor()}20`,
            color: getTeamColor(),
            borderColor: getTeamColor()
          }}>
            <Users className="w-3 h-3 mr-1" />
            Total Empleados: {stats.totalEmployees}
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Users className="w-3 h-3 mr-1" />
            Máximo: {maxEmployees} empleados
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Users className="w-3 h-3 mr-1" />
            Promedio: {avgEmployees} empleados
          </Badge>
          <Badge variant="outline" className="bg-slate-50 text-slate-700">
            <Clock className="w-3 h-3 mr-1" />
            {stats.intervals} intervalos
          </Badge>
        </div>
      </div>

      <div className="relative">
        <div className="absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200" />

        <div className="overflow-x-auto pb-4">
          <div className="pt-24 flex gap-0 min-w-max">
            {workingIntervals.map((interval, index) =>
            <TimeSlot
              key={index}
              time={interval.date}
              availableEmployees={interval.availableEmployees}
              maxEmployees={maxEmployees}
              index={index}
              isFirst={index === 0}
              isLast={index === workingIntervals.length - 1}
              totalIntervals={workingIntervals.length}
              viewMode={viewMode}
              teamColor={getTeamColor()} />

            )}
          </div>
        </div>
      </div>
    </div>);

}