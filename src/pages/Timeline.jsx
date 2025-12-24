import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TimelineControls from "../components/timeline/TimelineControls";
import TimelineView from "../components/timeline/TimelineView";
import { addDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import WorkCalendar from "../components/absences/WorkCalendar";

const EMPTY_ARRAY = [];

export default function Timeline() {
  const now = new Date();
  const [viewMode, setViewMode] = useState('day');
  const [selectedDate, setSelectedDate] = useState(now);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all'); // New state for selected department
  const [isCalling, setIsCalling] = useState(false);

  const { start: startDate, end: endDate } = useMemo(() => {
    const dateCopy = new Date(selectedDate); // Create a copy to avoid mutating the state date
    switch (viewMode) {
      case 'day':
        return {
          start: new Date(dateCopy.setHours(7, 0, 0, 0)),
          end: new Date(dateCopy.setHours(22, 0, 0, 0))
        };
      case 'week':
        const weekStart = startOfWeek(dateCopy, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(dateCopy, { weekStartsOn: 1 });
        weekStart.setHours(7, 0, 0, 0);
        weekEnd.setHours(22, 0, 0, 0);
        return { start: weekStart, end: weekEnd };
      case 'month':
        const monthStart = startOfMonth(dateCopy);
        const monthEnd = endOfMonth(dateCopy);
        monthStart.setHours(7, 0, 0, 0);
        monthEnd.setHours(22, 0, 0, 0);
        return { start: monthStart, end: monthEnd };
      default:
        return {
          start: new Date(dateCopy.setHours(7, 0, 0, 0)),
          end: new Date(dateCopy.setHours(22, 0, 0, 0))
        };
    }
  }, [viewMode, selectedDate]);

  const { data: holidays = EMPTY_ARRAY } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
    initialData: EMPTY_ARRAY,
    staleTime: 5 * 60 * 1000,
  });

  const { data: vacations = EMPTY_ARRAY } = useQuery({
    queryKey: ['vacations'],
    queryFn: () => base44.entities.Vacation.list(),
    initialData: EMPTY_ARRAY,
    staleTime: 5 * 60 * 1000,
  });

  const { data: employees = EMPTY_ARRAY } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: EMPTY_ARRAY,
    staleTime: 2 * 60 * 1000,
  });

  const { data: teams = EMPTY_ARRAY } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: EMPTY_ARRAY,
    staleTime: 10 * 60 * 1000,
  });

  const { data: teamSchedules = EMPTY_ARRAY } = useQuery({
    queryKey: ['teamWeekSchedules'],
    queryFn: () => base44.entities.TeamWeekSchedule.list(),
    initialData: EMPTY_ARRAY,
    staleTime: 5 * 60 * 1000,
  });

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set();
    if (Array.isArray(employees)) { // Ensure employees data is available and is an array
      employees.forEach(emp => {
        if (emp?.departamento) depts.add(emp.departamento); // Safely access departamento
      });
    }
    return Array.from(depts).sort();
  }, [employees]);

  // Removed handleCallSchedulingAssistant as per instructions

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-background dark:via-background dark:to-background">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Button>
          </Link>
        </div>

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