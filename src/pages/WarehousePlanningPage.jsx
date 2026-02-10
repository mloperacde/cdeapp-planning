import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Package, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import WarehousePlanningTab from "../components/dailyplanning/WarehousePlanningTab";

export default function WarehousePlanningPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTeam, setSelectedTeam] = useState('');
  const [isCalling, setIsCalling] = useState(false);

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  // Set default team when teams are loaded
  useEffect(() => {
    if (teams.length > 0 && !selectedTeam) {
        setSelectedTeam(teams[0].team_key);
    }
  }, [teams, selectedTeam]);

  const { data: teamSchedules = [] } = useQuery({
    queryKey: ['teamWeekSchedules'],
    queryFn: () => base44.entities.TeamWeekSchedule.list(undefined, 2000),
    initialData: [],
    staleTime: 0,
    refetchOnMount: true,
  });

  // Get shift for selected date and team
  const selectedShift = useMemo(() => {
    const team = teams.find(t => t.team_key === selectedTeam);
    if (!team) return null;

    // Parse date explicitly to avoid timezone issues with Mondays
    const [year, month, day] = selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    
    const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');

    const schedule = teamSchedules.find(
      s => s.team_key === selectedTeam && s.fecha_inicio_semana === weekStartStr
    );

    return schedule?.turno || null;
  }, [selectedDate, selectedTeam, teams, teamSchedules]);

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
            <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Planning de Almacén
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Planificación diaria de tareas de almacén
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
                <Label htmlFor="team">Equipo</Label>
                <select
                  id="team"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white dark:bg-card"
                >
                  {teams.map((team) => (
                    <option key={team.team_key} value={team.team_key}>
                      {team.team_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Turno Asignado</Label>
                <div 
                  className="h-10 px-3 rounded-md border-2 flex items-center font-semibold"
                  style={{ 
                    borderColor: getTeamColor(selectedTeam),
                    backgroundColor: `${getTeamColor(selectedTeam)}10`
                  }}
                >
                  {selectedShift ? (
                    <Badge 
                      className="text-base"
                      style={{ backgroundColor: getTeamColor(selectedTeam) }}
                    >
                      {selectedShift}
                    </Badge>
                  ) : (
                    <span className="text-slate-500">Sin asignar</span>
                  )}
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

        {/* Contenido Almacén */}
        <WarehousePlanningTab
            selectedDate={selectedDate}
            selectedTeam={selectedTeam}
            selectedShift={selectedShift}
            teams={teams}
            teamSchedules={teamSchedules}
        />
      </div>
    </div>
  );
}
