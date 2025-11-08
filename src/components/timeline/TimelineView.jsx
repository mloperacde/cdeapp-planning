import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { format, isWithinInterval, isSameDay, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import TimeSlot from "./TimeSlot";
import { AlertCircle, Calendar, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const WORKING_DAY_START = 7 * 60;
const WORKING_DAY_END = 22 * 60;

export default function TimelineView({ 
  startDate, 
  endDate, 
  holidays, 
  vacations, 
  selectedTeam,
  employees,
  teams,
  teamSchedules,
  viewMode
}) {
  const { workingIntervals, stats } = useMemo(() => {
    const allIntervals = [];
    const stats = { totalEmployees: 0, intervals: 0 };
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    current.setMinutes(Math.floor(current.getMinutes() / 5) * 5);
    current.setSeconds(0);
    current.setMilliseconds(0);
    
    const holidayDates = new Set(
      holidays.map(h => format(new Date(h.date), "yyyy-MM-dd"))
    );
    
    const vacationRanges = vacations.map(v => ({
      start: new Date(v.start_date),
      end: new Date(v.end_date),
      employeeIds: v.aplica_todos ? null : v.employee_ids
    }));

    // Filtrar empleados por equipo seleccionado
    const getTeamName = (teamKey) => {
      const team = teams.find(t => t.team_key === teamKey);
      return team?.team_name || '';
    };

    let filteredEmployees = employees;
    if (selectedTeam === 'team_1') {
      const teamName = getTeamName('team_1');
      filteredEmployees = employees.filter(emp => emp.equipo === teamName);
    } else if (selectedTeam === 'team_2') {
      const teamName = getTeamName('team_2');
      filteredEmployees = employees.filter(emp => emp.equipo === teamName);
    }

    stats.totalEmployees = filteredEmployees.length;
    
    const getEmployeeTeamKey = (employee) => {
      const team1 = teams.find(t => t.team_key === 'team_1');
      const team2 = teams.find(t => t.team_key === 'team_2');
      
      if (team1 && employee.equipo === team1.team_name) return 'team_1';
      if (team2 && employee.equipo === team2.team_name) return 'team_2';
      return null;
    };

    const getTeamScheduleForWeek = (teamKey, date) => {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      return teamSchedules.find(s => s.team_key === teamKey && s.fecha_inicio_semana === weekStartStr);
    };
    
    const getEmployeeShift = (employee, date) => {
      if (employee.tipo_turno === "Fijo Mañana") return "Mañana";
      if (employee.tipo_turno === "Fijo Tarde") return "Tarde";
      
      // Para rotativos, usar el horario del equipo
      if (employee.tipo_turno === "Rotativo") {
        const teamKey = getEmployeeTeamKey(employee);
        if (teamKey) {
          const schedule = getTeamScheduleForWeek(teamKey, date);
          return schedule?.turno || "Mañana";
        }
      }
      
      return "Mañana";
    };
    
    const getEmployeeSchedule = (employee, shift) => {
      if (employee.tipo_jornada === "Reducida" && employee.horario_personalizado_inicio && employee.horario_personalizado_fin) {
        const [startH, startM] = employee.horario_personalizado_inicio.split(':').map(Number);
        const [endH, endM] = employee.horario_personalizado_fin.split(':').map(Number);
        return { start: startH * 60 + startM, end: endH * 60 + endM };
      }
      
      if (shift === "Mañana") {
        return { start: 7 * 60, end: 15 * 60 };
      } else {
        if (employee.tipo_jornada === "Completa 40h") {
          return { start: 14 * 60, end: 22 * 60 };
        } else {
          return { start: 15 * 60, end: 22 * 60 };
        }
      }
    };
    
    const isEmployeeAvailable = (employee, date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const dayOfWeek = date.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) return false;
      if (holidayDates.has(dateStr)) return false;
      
      if (employee.disponibilidad === "Ausente") {
        if (employee.ausencia_inicio && employee.ausencia_fin) {
          const ausenciaStart = new Date(employee.ausencia_inicio);
          const ausenciaEnd = new Date(employee.ausencia_fin);
          if (date >= ausenciaStart && date <= ausenciaEnd) {
            return false;
          }
        }
      }
      
      for (const vacRange of vacationRanges) {
        if (vacRange.employeeIds === null || vacRange.employeeIds?.includes(employee.id)) {
          if (isWithinInterval(date, { start: vacRange.start, end: vacRange.end })) {
            return false;
          }
        }
      }
      
      const shift = getEmployeeShift(employee, date);
      const schedule = getEmployeeSchedule(employee, shift);
      const timeInMinutes = date.getHours() * 60 + date.getMinutes();
      
      return timeInMinutes >= schedule.start && timeInMinutes < schedule.end;
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
        const availableCount = filteredEmployees.filter(emp => 
          isEmployeeAvailable(emp, currentDate)
        ).length;
        
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
  }, [startDate, endDate, holidays, vacations, selectedTeam, employees, teams, teamSchedules]);

  if (workingIntervals.length === 0) {
    return (
      <div className="p-12 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <p className="text-slate-600 mb-2">
          No hay intervalos laborables en el rango seleccionado
        </p>
      </div>
    );
  }

  const maxEmployees = Math.max(...workingIntervals.map(i => i.availableEmployees), 1);
  const avgEmployees = (workingIntervals.reduce((sum, i) => sum + i.availableEmployees, 0) / workingIntervals.length).toFixed(1);

  const getTeamColor = () => {
    if (selectedTeam === 'team_1') {
      const team = teams.find(t => t.team_key === 'team_1');
      return team?.color || '#8B5CF6';
    }
    if (selectedTeam === 'team_2') {
      const team = teams.find(t => t.team_key === 'team_2');
      return team?.color || '#EC4899';
    }
    return '#3B82F6';
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          Disponibilidad de Empleados
          {selectedTeam !== 'all' && (
            <span style={{ color: getTeamColor() }} className="ml-2">
              - {teams.find(t => t.team_key === selectedTeam)?.team_name}
            </span>
          )}
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
          <div className="flex gap-0 min-w-max">
            {workingIntervals.map((interval, index) => (
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
                teamColor={getTeamColor()}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}