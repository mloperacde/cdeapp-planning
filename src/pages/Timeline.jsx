import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAppData } from "../components/data/DataProvider";
import TimelineControls from "../components/timeline/TimelineControls";
import TimelineView from "../components/timeline/TimelineView";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import WorkCalendar from "../components/absences/WorkCalendar";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

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
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-background dark:via-background dark:to-background">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Planning / Línea de Tiempo
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg mt-2">
            Visualiza la disponibilidad de empleados
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-6"
        >
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
