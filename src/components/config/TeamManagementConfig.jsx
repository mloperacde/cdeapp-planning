import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Calendar, Settings, Save, RefreshCw, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, addWeeks, getISOWeek, startOfYear, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import TeamCompositionConfig from "./TeamCompositionConfig";

export default function TeamManagementConfig() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">
            <Settings className="w-4 h-4 mr-2" />
            Configuración General
          </TabsTrigger>
          <TabsTrigger value="rotation">
            <Calendar className="w-4 h-4 mr-2" />
            Calendario de Rotación
          </TabsTrigger>
          <TabsTrigger value="composition">
            <Users className="w-4 h-4 mr-2" />
            Composición de Equipos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralTeamConfig />
        </TabsContent>

        <TabsContent value="rotation" className="mt-6">
          <RotationCalendarConfig />
        </TabsContent>

        <TabsContent value="composition" className="mt-6">
          <TeamCompositionConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GeneralTeamConfig() {
  const queryClient = useQueryClient();
  const [editingTeams, setEditingTeams] = useState({});

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    refetchOnMount: true, // Ensure fresh data when tab is switched
  });

  // Initialize editing state when data loads
  React.useEffect(() => {
    if (teams.length > 0) {
      const initialState = {};
      teams.forEach(team => {
        initialState[team.id] = { ...team };
      });
      setEditingTeams(initialState);
    }
  }, [teams]);

  const updateMutation = useMutation({
    mutationFn: async ({ updatedTeams, originalTeams }) => {
      // 1. Detect name changes
      const nameChanges = [];
      Object.values(updatedTeams).forEach(newTeam => {
        const oldTeam = originalTeams.find(t => t.id === newTeam.id);
        if (oldTeam && oldTeam.team_name !== newTeam.team_name) {
          nameChanges.push({
            oldName: oldTeam.team_name,
            newName: newTeam.team_name
          });
        }
      });

      // 2. Update Team Configs
      const teamPromises = Object.values(updatedTeams).map(team => 
        base44.entities.TeamConfig.update(team.id, {
          team_name: team.team_name,
          color: team.color
        })
      );
      await Promise.all(teamPromises);

      // 3. Cascade update to employees if names changed
      if (nameChanges.length > 0) {
        console.log("Detected team name changes:", nameChanges);
        
        // Fetch all employees to find matches
        // Add timestamp to bust potential cache
        let allEmployees = [];
        try {
            allEmployees = await base44.entities.EmployeeMasterDatabase.list({ 
                limit: 2000,
                _t: Date.now() 
            });
        } catch (e) {
            console.error("Error fetching employees:", e);
            allEmployees = [];
        }

        console.log(`Scanned ${allEmployees.length} employees for team updates`);
        
        const updatesToProcess = [];

        allEmployees.forEach(emp => {
          if (!emp.equipo) return;
          
          // Normalize names for comparison (trim and lowercase for robust matching)
          const empTeamName = String(emp.equipo).trim();
          
          const change = nameChanges.find(c => {
             // Check exact match (trimmed) or case-insensitive match
             const oldName = String(c.oldName).trim();
             return oldName === empTeamName || oldName.toLowerCase() === empTeamName.toLowerCase();
          });
          
          if (change) {
            updatesToProcess.push({
              id: emp.id,
              data: { equipo: change.newName.trim() },
              name: emp.nombre
            });
          }
        });

        if (updatesToProcess.length > 0) {
          console.log(`Updating ${updatesToProcess.length} employees due to team name changes.`);
          
          // Process in batches
          const BATCH_SIZE = 5;
          for (let i = 0; i < updatesToProcess.length; i += BATCH_SIZE) {
            const batch = updatesToProcess.slice(i, i + BATCH_SIZE);
            await Promise.all(
              batch.map(item => 
                base44.entities.EmployeeMasterDatabase.update(item.id, item.data)
              )
            );
            
            if (i + BATCH_SIZE < updatesToProcess.length) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
          return { updatedCount: updatesToProcess.length };
        } else {
            console.log("No employees found matching the old team names.");
            return { updatedCount: 0 };
        }
      }
      return { updatedCount: 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teamConfigs'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      
      const msg = data.updatedCount > 0 
        ? `Configuración guardada y ${data.updatedCount} empleados movidos al nuevo nombre de equipo.` 
        : "Configuración de equipos actualizada.";
        
      toast.success(msg);
    }
  });

  const handleChange = (id, field, value) => {
    setEditingTeams(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleSave = () => {
    updateMutation.mutate({ updatedTeams: editingTeams, originalTeams: teams });
  };

  if (isLoading) return <div>Cargando...</div>;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>Nombres y Colores de Equipos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6">
          {Object.values(editingTeams).map((team) => (
            <div key={team.id} className="flex items-end gap-4 p-4 border rounded-lg bg-slate-50">
              <div className="space-y-2 flex-1">
                <Label>Identificador Interno</Label>
                <Input value={team.team_key} disabled className="bg-slate-100" />
              </div>
              <div className="space-y-2 flex-1">
                <Label>Nombre del Equipo</Label>
                <Input 
                  value={team.team_name} 
                  onChange={(e) => handleChange(team.id, 'team_name', e.target.value)}
                  placeholder="Ej: Equipo 1 (Isa)"
                />
              </div>
              <div className="space-y-2 w-32">
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="color" 
                    value={team.color} 
                    onChange={(e) => handleChange(team.id, 'color', e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <span className="text-xs text-slate-500">{team.color}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RotationCalendarConfig() {
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [generatedWeeks, setGeneratedWeeks] = useState([]);
  
  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['teamWeekSchedules', selectedYear],
    queryFn: () => base44.entities.TeamWeekSchedule.list(),
  });

  // Generate weeks for the selected year
  React.useEffect(() => {
    const weeks = [];
    let currentDate = startOfWeek(startOfYear(new Date(selectedYear, 0, 1)), { weekStartsOn: 1 });
    
    // Generate 52/53 weeks
    for (let i = 0; i < 53; i++) {
      if (currentDate.getFullYear() > selectedYear && i > 50) break;
      
      weeks.push({
        weekNumber: getISOWeek(currentDate),
        startDate: format(currentDate, 'yyyy-MM-dd'),
        displayDate: format(currentDate, "d 'de' MMMM", { locale: es }),
        endDate: format(addDays(currentDate, 6), "d 'de' MMMM", { locale: es })
      });
      
      currentDate = addWeeks(currentDate, 1);
    }
    setGeneratedWeeks(weeks);
  }, [selectedYear]);

  const saveScheduleMutation = useMutation({
    mutationFn: async (schedulesToSave) => {
      // Logic to save/update schedules
      // This is complex because we need to check if exists then update, or create
      // For simplicity, we'll assume we send individual upserts or handle it one by one
      // Since API capabilities are limited to standard CRUD usually, we might need a custom endpoint or loop
      // Here assuming we loop through changes
      
      const promises = schedulesToSave.map(async (schedule) => {
        // Find existing ID if any
        const existing = schedules.find(s => 
          s.team_key === schedule.team_key && 
          s.fecha_inicio_semana === schedule.fecha_inicio_semana
        );

        if (existing) {
          if (existing.turno !== schedule.turno) {
            return base44.entities.TeamWeekSchedule.update(existing.id, { turno: schedule.turno });
          }
        } else {
          return base44.entities.TeamWeekSchedule.create(schedule);
        }
      });
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamWeekSchedules'] });
      toast.success("Calendario de rotación actualizado");
    }
  });

  const [pendingChanges, setPendingChanges] = useState({});

  const handleShiftChange = (weekStartDate, teamKey, shift) => {
    const key = `${weekStartDate}_${teamKey}`;
    setPendingChanges(prev => ({
      ...prev,
      [key]: {
        team_key: teamKey,
        fecha_inicio_semana: weekStartDate,
        turno: shift
      }
    }));
  };

  const getShift = (weekStartDate, teamKey) => {
    const changeKey = `${weekStartDate}_${teamKey}`;
    if (pendingChanges[changeKey]) return pendingChanges[changeKey].turno;
    
    const saved = schedules.find(s => 
      s.team_key === teamKey && 
      s.fecha_inicio_semana === weekStartDate
    );
    return saved?.turno || "";
  };

  const handleSaveChanges = () => {
    const changes = Object.values(pendingChanges);
    if (changes.length === 0) return;
    saveScheduleMutation.mutate(changes);
    setPendingChanges({});
  };

  const autoGenerateRotation = () => {
    // Logic: Start with Team 1 = Morning on first week, then alternate
    // Team 2 = Opposite
    if (teams.length < 2) return;
    
    const team1 = teams[0];
    const team2 = teams[1];
    
    const newChanges = {};
    let isTeam1Morning = true;

    generatedWeeks.forEach(week => {
      const shift1 = isTeam1Morning ? "Mañana" : "Tarde";
      const shift2 = isTeam1Morning ? "Tarde" : "Mañana";
      
      newChanges[`${week.startDate}_${team1.team_key}`] = {
        team_key: team1.team_key,
        fecha_inicio_semana: week.startDate,
        turno: shift1
      };
      
      newChanges[`${week.startDate}_${team2.team_key}`] = {
        team_key: team2.team_key,
        fecha_inicio_semana: week.startDate,
        turno: shift2
      };

      isTeam1Morning = !isTeam1Morning;
    });

    setPendingChanges(newChanges);
    toast.info("Rotación generada. Revise y guarde los cambios.");
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Calendario de Rotación Semanal</CardTitle>
          <div className="flex items-center gap-4">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={autoGenerateRotation}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Generar Rotación Automática
            </Button>
            <Button onClick={handleSaveChanges} disabled={Object.keys(pendingChanges).length === 0} className="bg-blue-600">
              <Save className="w-4 h-4 mr-2" />
              Guardar Cambios
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <div className="grid grid-cols-4 bg-slate-100 p-3 font-semibold text-sm">
            <div>Semana</div>
            <div>Fecha Inicio</div>
            {teams.slice(0, 2).map(team => (
              <div key={team.id} style={{ color: team.color }}>{team.team_name}</div>
            ))}
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {generatedWeeks.map((week) => (
              <div key={week.startDate} className="grid grid-cols-4 p-3 border-t text-sm items-center hover:bg-slate-50">
                <div className="font-medium">Semana {week.weekNumber}</div>
                <div className="text-slate-500">
                  {week.displayDate} - {week.endDate}
                </div>
                {teams.slice(0, 2).map(team => (
                  <div key={team.id}>
                    <Select 
                      value={getShift(week.startDate, team.team_key)} 
                      onValueChange={(v) => handleShiftChange(week.startDate, team.team_key, v)}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mañana">Mañana</SelectItem>
                        <SelectItem value="Tarde">Tarde</SelectItem>
                        <SelectItem value="Noche">Noche</SelectItem>
                        <SelectItem value="Descanso">Descanso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
