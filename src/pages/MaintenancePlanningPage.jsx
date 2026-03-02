import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Wrench, Sparkles, ArrowLeft, Clock, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import MaintenancePlanningTab from "../components/dailyplanning/MaintenancePlanningTab";
import SaturdaySupportPlanning from "../components/dailyplanning/SaturdaySupportPlanning";

export default function MaintenancePlanningPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedShift, setSelectedShift] = useState("Mañana");
  const [selectedTeam, setSelectedTeam] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [activeTab, setActiveTab] = useState("daily");
  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const { data: teamSchedules = [] } = useQuery({
    queryKey: ['teamWeekSchedules'],
    queryFn: () => base44.entities.TeamWeekSchedule.list(undefined, 2000),
    initialData: [],
    staleTime: 0,
    refetchOnMount: true,
  });

  // Auto-select Team based on Date + Shift
  useEffect(() => {
    if (!selectedDate || !selectedShift || teamSchedules.length === 0) return;

    const [year, month, day] = selectedDate.split('-').map(Number);
    // Crear fecha local a mediodía para evitar problemas de zona horaria
    const targetDate = new Date(year, month - 1, day, 12, 0, 0);

    const normalize = (str) => str ? str.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    const targetShift = normalize(selectedShift);

    const schedule = teamSchedules.find(s => {
      // Validar fecha dentro del rango de la semana del schedule
      if (!s.fecha_inicio_semana) return false;
      const [sy, sm, sd] = s.fecha_inicio_semana.split('-').map(Number);
      const startDate = new Date(sy, sm - 1, sd, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6); // Semana completa (Lun-Dom)
      endDate.setHours(23, 59, 59);

      if (targetDate < startDate || targetDate > endDate) return false;

      const turno = normalize(s.turno);
      if (targetShift.includes("manana") || targetShift.includes("mañana")) {
        return turno.includes("manana") || turno.includes("mañana") || turno.includes("t1");
      }
      if (targetShift.includes("tarde")) {
        return turno.includes("tarde") || turno.includes("t2");
      }
      if (targetShift.includes("noche")) {
        return turno.includes("noche") || turno.includes("t3");
      }
      return turno === targetShift;
    });

    if (schedule && schedule.team_key) {
      if (schedule.team_key !== selectedTeam) {
        setSelectedTeam(schedule.team_key);
      }
    } else if (!selectedTeam && teams.length > 0) {
      // Fallback if no schedule found
      setSelectedTeam(teams[0].team_key);
    }
  }, [selectedDate, selectedShift, teamSchedules, teams, selectedTeam]);

  const getTeamColor = (teamKey) => {
    const team = teams.find(t => t.team_key === teamKey);
    return team?.color || '#3B82F6';
  };

  const getTeamName = (teamKey) => {
    const team = teams.find(t => t.team_key === teamKey);
    return team?.team_name || teamKey;
  };

  const handleCallSchedulingAssistant = async () => {
    setIsCalling(true);
    try {
      alert('Llamando al asistente de programación inteligente...\n\nEl asistente analizará:\n- Disponibilidad de máquinas\n- Habilidades de operadores\n- Mantenimientos planificados\n- Preferencias de empleados\n- Minimización de horas extra');
    } catch (error) {
      console.error('Error al llamar al agente:', error);
      alert('Error al ejecutar el asistente de programación');
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Standard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Planning de Mantenimiento
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Planificación diaria de tareas de mantenimiento
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCallSchedulingAssistant}
            disabled={isCalling}
            className="h-8 gap-2 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800"
          >
            <Sparkles className="w-4 h-4" />
            {isCalling ? "Generando..." : "Asistente IA"}
          </Button>
          <Link to={createPageUrl("Dashboard")}>
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="flex flex-col gap-6">

        {/* Filtros Globales */}
        <Card className="mb-6 shadow-lg border-0 bg-white dark:bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shift">Turno</Label>
                <select
                  id="shift"
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white dark:bg-card"
                >
                  <option value="Mañana">Mañana</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noche">Noche</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="team">Equipo (Calculado)</Label>
                <div className="relative">
                  <select
                    id="team"
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white dark:bg-card appearance-none"
                    style={{ 
                      borderColor: getTeamColor(selectedTeam),
                      backgroundColor: `${getTeamColor(selectedTeam)}10`
                    }}
                  >
                    {teams.map((team) => (
                      <option key={team.team_key} value={team.team_key}>
                        {team.team_name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <Badge 
                      className="h-6"
                      style={{ backgroundColor: getTeamColor(selectedTeam) }}
                    >
                      Auto
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información del planning */}
        <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1 flex-1">
                <p><strong>📅 Fecha:</strong> {format(new Date(selectedDate), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</p>
                <p><strong>👥 Equipo:</strong> {getTeamName(selectedTeam)}</p>
                <p><strong>⏰ Turno:</strong> {selectedShift || 'Pendiente de asignar'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contenido Mantenimiento */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Planning 14-15h
            </TabsTrigger>
            <TabsTrigger value="saturday" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Sábados / Formación
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <MaintenancePlanningTab
                selectedDate={selectedDate}
                selectedTeam={selectedTeam}
                selectedShift={selectedShift}
                teams={teams}
                teamSchedules={teamSchedules}
            />
          </TabsContent>

          <TabsContent value="saturday">
             <SaturdaySupportPlanning 
                selectedDate={selectedDate}
                selectedTeam={selectedTeam}
                teams={teams}
             />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
