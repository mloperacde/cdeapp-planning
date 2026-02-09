import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppData } from "../components/data/DataProvider";
import TimelineControls from "../components/timeline/TimelineControls";
import TimelineView from "../components/timeline/TimelineView";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import WorkCalendar from "../components/absences/WorkCalendar";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";

export default function Timeline() {
  const now = new Date();
  const [viewMode, setViewMode] = useState('day');
  const [selectedDate, setSelectedDate] = useState(now);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  // Usar DataProvider para datos compartidos
  const { employees = [], teams = [], holidays = [], vacations = [] } = useAppData();

  const { start: startDate, end: endDate } = useMemo(() => {
    const dateCopy = new Date(selectedDate);
    switch (viewMode) {
      case 'day': {
        return {
          start: new Date(dateCopy.setHours(7, 0, 0, 0)),
          end: new Date(dateCopy.setHours(22, 0, 0, 0))
        };
      }
      case 'week': {
        const weekStart = startOfWeek(dateCopy, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(dateCopy, { weekStartsOn: 1 });
        weekStart.setHours(7, 0, 0, 0);
        weekEnd.setHours(22, 0, 0, 0);
        return { start: weekStart, end: weekEnd };
      }
      case 'month': {
        const monthStart = startOfMonth(dateCopy);
        const monthEnd = endOfMonth(dateCopy);
        monthStart.setHours(7, 0, 0, 0);
        monthEnd.setHours(22, 0, 0, 0);
        return { start: monthStart, end: monthEnd };
      }
      default: {
        return {
          start: new Date(dateCopy.setHours(7, 0, 0, 0)),
          end: new Date(dateCopy.setHours(22, 0, 0, 0))
        };
      }
    }
  }, [viewMode, selectedDate]);

  const { data: teamSchedules = [] } = useQuery({
    queryKey: ['teamWeekSchedules'],
    queryFn: () => base44.entities.TeamWeekSchedule.list(),
    initialData: [],
  });

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp?.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees]);

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Standard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Planning / Línea de Tiempo
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Visualiza la disponibilidad de empleados
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-6">
          <Card className="bg-white/80 dark:bg-card/80 backdrop-blur-sm shadow-xl border-0">
            <TimelineControls
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              selectedDate={selectedDate}
              onSelectedDateChange={setSelectedDate}
              selectedTeam={selectedTeam}
              onSelectedTeamChange={setSelectedTeam}
              teams={teams || []}
              selectedDepartment={selectedDepartment}
              onSelectedDepartmentChange={setSelectedDepartment}
              departments={departments}
            />
          </Card>

          <Card className="bg-white/80 dark:bg-card/80 backdrop-blur-sm shadow-xl border-0 overflow-hidden">
            <TimelineView 
              startDate={startDate} 
              endDate={endDate}
              holidays={holidays}
              vacations={vacations}
              selectedTeam={selectedTeam}
              employees={employees}
              teams={teams}
              teamSchedules={teamSchedules}
              viewMode={viewMode}
              selectedDepartment={selectedDepartment}
            />
          </Card>

          <WorkCalendar />
        </motion.div>
      </div>
    </div>
  );
}
