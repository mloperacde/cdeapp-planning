import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TimelineControls from "../components/timeline/TimelineControls";
import TimelineView from "../components/timeline/TimelineView";
import { addDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export default function Timeline() {
  const now = new Date();
  const [viewMode, setViewMode] = useState('day');
  const [selectedDate, setSelectedDate] = useState(now);
  const [selectedTeam, setSelectedTeam] = useState('all'); // 'all', 'team_1', 'team_2'

  const getDateRange = () => {
    switch (viewMode) {
      case 'day':
        return {
          start: new Date(selectedDate.setHours(7, 0, 0, 0)),
          end: new Date(selectedDate.setHours(22, 0, 0, 0))
        };
      case 'week':
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        weekStart.setHours(7, 0, 0, 0);
        weekEnd.setHours(22, 0, 0, 0);
        return { start: weekStart, end: weekEnd };
      case 'month':
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        monthStart.setHours(7, 0, 0, 0);
        monthEnd.setHours(22, 0, 0, 0);
        return { start: monthStart, end: monthEnd };
      default:
        return {
          start: new Date(selectedDate.setHours(7, 0, 0, 0)),
          end: new Date(selectedDate.setHours(22, 0, 0, 0))
        };
    }
  };

  const { start: startDate, end: endDate } = getDateRange();

  const { data: holidays, isLoading: isLoadingHolidays, refetch: refetchHolidays } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
    initialData: [],
  });

  const { data: vacations, isLoading: isLoadingVacations, refetch: refetchVacations } = useQuery({
    queryKey: ['vacations'],
    queryFn: () => base44.entities.Vacation.list(),
    initialData: [],
  });

  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const { data: teamSchedules } = useQuery({
    queryKey: ['teamWeekSchedules'],
    queryFn: () => base44.entities.TeamWeekSchedule.list(),
    initialData: [],
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-3">
            Línea de Tiempo - Disponibilidad
          </h1>
          <p className="text-slate-600 text-lg">
            Visualiza la disponibilidad de empleados por intervalos y equipos
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 mb-6">
            <TimelineControls
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              selectedDate={selectedDate}
              onSelectedDateChange={setSelectedDate}
              holidays={holidays}
              isLoadingHolidays={isLoadingHolidays}
              onHolidaysUpdate={refetchHolidays}
              vacations={vacations}
              isLoadingVacations={isLoadingVacations}
              onVacationsUpdate={refetchVacations}
              selectedTeam={selectedTeam}
              onSelectedTeamChange={setSelectedTeam}
              teams={teams}
            />
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 overflow-hidden">
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
            />
          </Card>
        </motion.div>
      </div>
    </div>
  );
}