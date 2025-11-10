import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TimelineControls from "../components/timeline/TimelineControls";
import TimelineView from "../components/timeline/TimelineView";
import MachineRequirements from "../components/timeline/MachineRequirements";
import { addDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { Sparkles } from "lucide-react";

export default function Timeline() {
  const now = new Date();
  const [viewMode, setViewMode] = useState('day');
  const [selectedDate, setSelectedDate] = useState(now);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [isCalling, setIsCalling] = useState(false);

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

  const handleCallSchedulingAssistant = async () => {
    setIsCalling(true);
    try {
      // Aquí llamaríamos al agente scheduling_assistant
      // Por ahora solo mostramos un mensaje
      alert('Llamando al asistente de programación inteligente...\n\nEl asistente analizará:\n- Disponibilidad de máquinas\n- Habilidades de operadores\n- Mantenimientos planificados\n- Preferencias de empleados\n- Minimización de horas extra');
      
      // Simulamos la llamada al agente
      // await base44.agents.schedulingAssistant.generate({ 
      //   startDate, 
      //   endDate, 
      //   team: selectedTeam 
      // });
      
    } catch (error) {
      console.error('Error al llamar al agente:', error);
      alert('Error al ejecutar el asistente de programación');
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Planning / Línea de Tiempo
              </h1>
              <p className="text-slate-600 text-lg mt-2">
                Visualiza la disponibilidad de empleados y requisitos de máquinas
              </p>
            </div>
            <Button
              onClick={handleCallSchedulingAssistant}
              disabled={isCalling}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg"
              size="lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {isCalling ? "Generando..." : "Asistente de Programación IA"}
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-6"
        >
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
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

          <MachineRequirements />
        </motion.div>
      </div>
    </div>
  );
}