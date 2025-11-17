
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Factory, Wrench, Package, ClipboardCheck, Eye, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ProductionPlanningTab from "../components/dailyplanning/ProductionPlanningTab";
import MaintenancePlanningTab from "../components/dailyplanning/MaintenancePlanningTab";
import WarehousePlanningTab from "../components/dailyplanning/WarehousePlanningTab";
import QualityPlanningTab from "../components/dailyplanning/QualityPlanningTab";

export default function DailyPlanningPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTeam, setSelectedTeam] = useState('team_1');
  const [activeTab, setActiveTab] = useState('production');
  const [isCalling, setIsCalling] = useState(false);
  const queryClient = useQueryClient();

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

  // Get shift for selected date and team
  const selectedShift = useMemo(() => {
    const team = teams.find(t => t.team_key === selectedTeam);
    if (!team) return null;

    const weekStart = new Date(selectedDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1));
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
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600" />
              Planning Diario
            </h1>
            <p className="text-slate-600 mt-1">
              Planificación diaria de producción, mantenimiento, almacén y calidad
            </p>
          </div>
          <Button
            onClick={handleCallSchedulingAssistant}
            disabled={isCalling}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {isCalling ? "Generando..." : "Asistente Programación IA"}
          </Button>
        </div>

        {/* Filtros Globales */}
        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
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
                  className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
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
        <Card className="mb-6 bg-blue-50 border-2 border-blue-300">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800 space-y-1 flex-1">
                <p><strong>📅 Fecha:</strong> {format(new Date(selectedDate), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</p>
                <p><strong>👥 Equipo:</strong> {getTeamName(selectedTeam)}</p>
                <p><strong>⏰ Turno:</strong> {selectedShift || 'Pendiente de asignar'}</p>
                <p className="text-xs mt-2 text-blue-700">
                  Configura la planificación para cada departamento usando las pestañas abajo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs para diferentes departamentos */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="production" className="flex items-center gap-2">
              <Factory className="w-4 h-4" />
              Fabricación
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Mantenimiento
            </TabsTrigger>
            <TabsTrigger value="warehouse" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Almacén
            </TabsTrigger>
            <TabsTrigger value="quality" className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" />
              Calidad
            </TabsTrigger>
          </TabsList>

          <TabsContent value="production">
            <ProductionPlanningTab
              selectedDate={selectedDate}
              selectedTeam={selectedTeam}
              selectedShift={selectedShift}
            />
          </TabsContent>

          <TabsContent value="maintenance">
            <MaintenancePlanningTab
              selectedDate={selectedDate}
              selectedTeam={selectedTeam}
              selectedShift={selectedShift}
            />
          </TabsContent>

          <TabsContent value="warehouse">
            <WarehousePlanningTab
              selectedDate={selectedDate}
              selectedTeam={selectedTeam}
              selectedShift={selectedShift}
            />
          </TabsContent>

          <TabsContent value="quality">
            <QualityPlanningTab
              selectedDate={selectedDate}
              selectedTeam={selectedTeam}
              selectedShift={selectedShift}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
