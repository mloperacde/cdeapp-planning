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
import { Users, Calendar, Settings, Save, RefreshCw, ArrowRightLeft, ArrowDownCircle } from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, addWeeks, getISOWeek, startOfYear, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import TeamCompositionConfig from "./TeamCompositionConfig";
import { useShiftConfig } from "@/hooks/useShiftConfig";

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
            const target = Object.values(updatedTeams).find(t => String(t.team_name).trim().toLowerCase() === String(change.newName).trim().toLowerCase());
            updatesToProcess.push({
              id: emp.id,
              data: { 
                equipo: change.newName.trim(),
                team_key: target ? target.team_key : null,
                team_id: target ? target.id : null
              },
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
                    await new Promise(resolve => setTimeout(resolve, 1000));
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
                  placeholder="Ej: Equipo 1"
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
  const { shifts } = useShiftConfig();
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [generatedWeeks, setGeneratedWeeks] = useState([]);
  
  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['teamWeekSchedules', selectedYear],
    queryFn: () => base44.entities.TeamWeekSchedule.list(undefined, 2000),
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
    // 1. Find the week index
    const startWeekIndex = generatedWeeks.findIndex(w => w.startDate === weekStartDate);
    if (startWeekIndex === -1) return;

    const MORNING = shifts.MORNING || "Mañana";
    const AFTERNOON = shifts.AFTERNOON || "Tarde";
    
    // Helper to swap shifts
    const swap = (s) => {
      if (s === MORNING) return AFTERNOON;
      if (s === AFTERNOON) return MORNING;
      return s; 
    };

    const team1 = teams[0];
    const team2 = teams[1];
    
    // If we have fewer than 2 teams, just update the single cell
    if (teams.length < 2) {
         const key = `${weekStartDate}_${teamKey}`;
         setPendingChanges(prev => ({
           ...prev,
           [key]: { team_key: teamKey, fecha_inicio_semana: weekStartDate, turno: shift }
         }));
         return;
    }

    // Determine values for start week
    // We use the NEW value for the edited team, and the EXISTING value for the other
    let val1, val2;
    if (team1.team_key === teamKey) {
        val1 = shift;
        val2 = getShift(weekStartDate, team2.team_key);
    } else {
        val1 = getShift(weekStartDate, team1.team_key);
        val2 = shift;
    }

    const newChanges = { ...pendingChanges };

    // Update the start week explicitly
    newChanges[`${weekStartDate}_${team1.team_key}`] = {
        team_key: team1.team_key,
        fecha_inicio_semana: weekStartDate,
        turno: val1
    };
    newChanges[`${weekStartDate}_${team2.team_key}`] = {
        team_key: team2.team_key,
        fecha_inicio_semana: weekStartDate,
        turno: val2
    };

    // Propagate forward to all subsequent weeks
    for (let i = startWeekIndex + 1; i < generatedWeeks.length; i++) {
        const week = generatedWeeks[i];
        const distance = i - startWeekIndex;
        const isSameParity = distance % 2 === 0;

        const next1 = isSameParity ? val1 : swap(val1);
        const next2 = isSameParity ? val2 : swap(val2);

        newChanges[`${week.startDate}_${team1.team_key}`] = {
            team_key: team1.team_key,
            fecha_inicio_semana: week.startDate,
            turno: next1
        };
        newChanges[`${week.startDate}_${team2.team_key}`] = {
            team_key: team2.team_key,
            fecha_inicio_semana: week.startDate,
            turno: next2
        };
    }

    setPendingChanges(newChanges);
    toast.info("Calendario recalculado automáticamente a partir de esta semana");
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
      const shift1 = isTeam1Morning ? (shifts.MORNING || "Mañana") : (shifts.AFTERNOON || "Tarde");
      const shift2 = isTeam1Morning ? (shifts.AFTERNOON || "Tarde") : (shifts.MORNING || "Mañana");
      
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

  const handlePropagateRotation = (startWeekIndex) => {
    if (teams.length < 2) {
      toast.error("Se requieren al menos 2 equipos para la rotación.");
      return;
    }

    const startWeek = generatedWeeks[startWeekIndex];
    const team1 = teams[0];
    const team2 = teams[1];
    
    // Get current shifts for the starting week
    const shift1 = getShift(startWeek.startDate, team1.team_key);
    const shift2 = getShift(startWeek.startDate, team2.team_key);

    if (!shift1 || !shift2) {
      toast.error("Defina los turnos de ambos equipos en esta semana para usarla como base.");
      return;
    }

    const MORNING = shifts.MORNING || "Mañana";
    const AFTERNOON = shifts.AFTERNOON || "Tarde";

    const swap = (s) => {
      if (s === MORNING) return AFTERNOON;
      if (s === AFTERNOON) return MORNING;
      return s; 
    };

    const newChanges = { ...pendingChanges };

    // Recalculate ALL weeks based on the selected week parity
    generatedWeeks.forEach((week, index) => {
      // Calculate distance
      const distance = Math.abs(index - startWeekIndex);
      const isSameParity = distance % 2 === 0;

      const nextShift1 = isSameParity ? shift1 : swap(shift1);
      const nextShift2 = isSameParity ? shift2 : swap(shift2);

      newChanges[`${week.startDate}_${team1.team_key}`] = {
        team_key: team1.team_key,
        fecha_inicio_semana: week.startDate,
        turno: nextShift1
      };
      
      newChanges[`${week.startDate}_${team2.team_key}`] = {
        team_key: team2.team_key,
        fecha_inicio_semana: week.startDate,
        turno: nextShift2
      };
    });

    setPendingChanges(newChanges);
    toast.success(`Rotación recalculada usando la Semana ${startWeek.weekNumber} como base.`);
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
          <div className="grid grid-cols-[80px_1fr_1fr_1fr_50px] bg-slate-100 p-3 font-semibold text-sm gap-2">
            <div>Semana</div>
            <div>Fecha Inicio</div>
            {teams.slice(0, 2).map(team => (
              <div key={team.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }}></div>
                <span style={{ color: team.color }}>{team.team_name}</span>
              </div>
            ))}
            <div className="text-center">Ext.</div>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {generatedWeeks.map((week, index) => (
              <div key={week.startDate} className="grid grid-cols-[80px_1fr_1fr_1fr_50px] p-3 border-t text-sm items-center hover:bg-slate-50 gap-2">
                <div className="font-medium">Sem {week.weekNumber}</div>
                <div className="text-slate-500 truncate">
                  {week.displayDate}
                </div>
                {teams.slice(0, 2).map(team => {
                  const currentShift = getShift(week.startDate, team.team_key);
                  const isMorning = currentShift === (shifts.MORNING || "Mañana");
                  const isAfternoon = currentShift === (shifts.AFTERNOON || "Tarde");
                  const isRest = currentShift === "Descanso";
                  
                  return (
                    <div key={team.id}>
                      <Select 
                        value={currentShift} 
                        onValueChange={(v) => handleShiftChange(week.startDate, team.team_key, v)}
                      >
                        <SelectTrigger 
                          className="w-full h-8"
                          style={{
                            backgroundColor: isMorning ? `${team.color}20` : isAfternoon ? `${team.color}10` : isRest ? '#f1f5f9' : 'white',
                            borderColor: team.color,
                            color: currentShift ? team.color : 'inherit'
                          }}
                        >
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={shifts.MORNING || "Mañana"}>{shifts.MORNING || "Mañana"}</SelectItem>
                          <SelectItem value={shifts.AFTERNOON || "Tarde"}>{shifts.AFTERNOON || "Tarde"}</SelectItem>
                          {shifts.NIGHT && <SelectItem value={shifts.NIGHT}>{shifts.NIGHT}</SelectItem>}
                          <SelectItem value="Descanso">Descanso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
                <div className="flex justify-center">
                   <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                    title="Usar esta semana como base y recalcular todo el año" 
                    onClick={() => handlePropagateRotation(index)}
                   >
                     <ArrowDownCircle className="w-4 h-4" />
                   </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}