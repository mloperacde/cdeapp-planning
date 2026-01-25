import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Factory, Users, Save, Calendar as CalendarIcon, Filter, AlertTriangle } from "lucide-react";
import { format, parseISO, startOfWeek, addDays, getISOWeek } from "date-fns";

export default function DailyProductionPlanningPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- Local State ---
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTeam, setSelectedTeam] = useState(""); 

  // --- Queries ---

  // 1. Fetch Teams
  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    staleTime: Infinity, // Config is stable
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Set default team
  React.useEffect(() => {
    if (teams.length > 0 && !selectedTeam) {
        setSelectedTeam(teams[0].team_key);
    }
  }, [teams, selectedTeam]);

  // 2. Fetch Machines (STRICT DEDUPLICATION)
  const { data: machines = [] } = useQuery({
    queryKey: ['machines', 'strict_dedup'],
    queryFn: async () => {
      const rawMachines = await base44.entities.MachineMasterDatabase.list(undefined, 2000);
      
      // Strict Deduplication by ID
      const uniqueMap = new Map();
      rawMachines.forEach(m => {
        if (!m.id) return;
        const id = String(m.id);
        if (!uniqueMap.has(id)) {
          uniqueMap.set(id, m);
        }
      });
      
      return Array.from(uniqueMap.values()).sort((a, b) => (a.orden_visualizacion || 999) - (b.orden_visualizacion || 999));
    },
    staleTime: Infinity, // Machines are stable
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // 3. Fetch Plannings for Date/Team
  const { data: plannings = [] } = useQuery({
    queryKey: ['machinePlannings', selectedDate, selectedTeam],
    queryFn: () => base44.entities.MachinePlanning.filter({ 
      fecha_planificacion: selectedDate, 
      team_key: selectedTeam 
    }),
    enabled: !!selectedDate && !!selectedTeam,
    staleTime: 5 * 60 * 1000, // 5 min cache for current planning
  });

  // 4. Fetch Shift Schedule to determine Shift
  const { data: shiftSchedule } = useQuery({
    queryKey: ['teamWeekSchedules', selectedDate],
    queryFn: async () => {
      // Logic to find shift from schedule
      // Assuming we can list and filter locally or via API
      // For simplicity, we list all and filter. Optimized in real backend.
      const allSchedules = await base44.entities.TeamWeekSchedule.list(undefined, 2000);
      return allSchedules;
    },
    staleTime: Infinity, // Schedules are stable
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // 5. Fetch Employees for Availability
  const { data: employees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre', 1000),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // --- Derived State ---

  const currentShift = useMemo(() => {
    if (!shiftSchedule) return "Desconocido";
    // Simple logic: Find schedule entry for this team/date
    // Note: The schema for TeamWeekSchedule usually has week_start_date, team_key, and day_x_shift
    // We need to match the date to the week
    const dateObj = new Date(selectedDate);
    const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 }); // Monday start
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    
    // Find the schedule for this team and week
    const schedule = shiftSchedule.find(s => 
      s.team_key === selectedTeam && 
      s.week_start_date === weekStartStr
    );

    if (!schedule) return "Sin Asignar";

    // Map day index (0-6) to field name (day_1_shift, etc.)
    // date-fns getDay: 0=Sunday, 1=Monday...
    // Our schema likely: day_1_shift = Monday
    let dayIndex = dateObj.getDay(); // 0..6
    // Adjust so 1=Monday... 7=Sunday
    if (dayIndex === 0) dayIndex = 7;
    
    const fieldName = `day_${dayIndex}_shift`;
    return schedule[fieldName] || "Libre";
  }, [shiftSchedule, selectedDate, selectedTeam]);

  const activePlanningsMap = useMemo(() => {
    const map = new Map();
    plannings.forEach(p => {
        // Only consider plannings for this team/date (already filtered by query, but good to be safe)
        if (p.team_key === selectedTeam && p.fecha_planificacion === selectedDate) {
            map.set(String(p.machine_id), p);
        }
    });
    return map;
  }, [plannings, selectedTeam, selectedDate]);

  const availableOperators = useMemo(() => {
    const teamName = teams.find(t => t.team_key === selectedTeam)?.team_name;
    if (!teamName) return 0;
    return employees.filter(e => 
        e.equipo === teamName && 
        e.disponibilidad === "Disponible" &&
        e.incluir_en_planning !== false
    ).length;
  }, [employees, teams, selectedTeam]);

  const totalRequiredOperators = useMemo(() => {
    let total = 0;
    activePlanningsMap.forEach(p => {
        total += (Number(p.operadores_necesarios) || 0);
    });
    return total;
  }, [activePlanningsMap]);

  // --- Mutations ---

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MachinePlanning.create(data),
    // Optimistic Update
    onMutate: async (newData) => {
        await queryClient.cancelQueries(['machinePlannings', selectedDate, selectedTeam]);
        const previousPlannings = queryClient.getQueryData(['machinePlannings', selectedDate, selectedTeam]);

        queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], (old = []) => {
            // Fake ID for UI immediate response
            const tempPlanning = { ...newData, id: 'temp-' + Date.now() };
            return [...old, tempPlanning];
        });

        return { previousPlannings };
    },
    onError: (err, newData, context) => {
        queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], context.previousPlannings);
        toast({ title: "Error", description: "No se pudo crear la planificación", variant: "destructive" });
    },
    onSettled: () => {
        // Only refetch if absolutely necessary, or let staled data expire naturally
        // queryClient.invalidateQueries(['machinePlannings', selectedDate, selectedTeam]); 
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MachinePlanning.delete(id),
    onMutate: async (id) => {
        await queryClient.cancelQueries(['machinePlannings', selectedDate, selectedTeam]);
        const previousPlannings = queryClient.getQueryData(['machinePlannings', selectedDate, selectedTeam]);

        queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], (old = []) => {
            return old.filter(p => p.id !== id);
        });

        return { previousPlannings };
    },
    onError: (err, id, context) => {
        queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], context.previousPlannings);
        toast({ title: "Error", description: "No se pudo eliminar la planificación", variant: "destructive" });
    },
    onSettled: () => {
         // queryClient.invalidateQueries(['machinePlannings', selectedDate, selectedTeam]);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({id, data}) => base44.entities.MachinePlanning.update(id, data),
    onMutate: async ({id, data}) => {
        await queryClient.cancelQueries(['machinePlannings', selectedDate, selectedTeam]);
        const previousPlannings = queryClient.getQueryData(['machinePlannings', selectedDate, selectedTeam]);

        queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], (old = []) => {
            return old.map(p => p.id === id ? { ...p, ...data } : p);
        });

        return { previousPlannings };
    },
    onError: (err, vars, context) => {
        queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], context.previousPlannings);
        toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
    },
    onSettled: () => {
        // queryClient.invalidateQueries(['machinePlannings', selectedDate, selectedTeam]);
    }
  });

  // --- Handlers ---

  const handleToggle = (machine, isChecked) => {
    const machineIdStr = String(machine.id);
    const existingPlanning = activePlanningsMap.get(machineIdStr);

    if (isChecked) {
        if (existingPlanning) return; // Already exists
        
        createMutation.mutate({
            machine_id: machine.id,
            machine_nombre: machine.nombre,
            machine_codigo: machine.codigo_maquina,
            fecha_planificacion: selectedDate,
            team_key: selectedTeam,
            operadores_necesarios: 1,
            activa_planning: true,
            turno: currentShift,
            process_id: null
        });
    } else {
        if (!existingPlanning) return; // Already gone
        deleteMutation.mutate(existingPlanning.id);
    }
  };

  const handleOperatorChange = (planningId, val) => {
    const num = parseInt(val);
    if (!isNaN(num) && num > 0) {
        updateMutation.mutate({
            id: planningId,
            data: { operadores_necesarios: num }
        });
    }
  };

  // --- Render ---

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-blue-600" />
          Planificación Diaria de Producción (V2)
        </h1>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Fecha</label>
            <Input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Equipo</label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                    <SelectValue placeholder="Seleccionar Equipo" />
                </SelectTrigger>
                <SelectContent>
                    {teams.map(t => (
                        <SelectItem key={t.team_key} value={t.team_key}>
                            {t.team_name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Turno (Automático)</label>
            <div className="px-3 py-2 bg-slate-100 rounded-md border font-medium text-slate-700">
                {currentShift}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm text-blue-600 font-medium">Máquinas Planificadas</p>
                    <p className="text-2xl font-bold text-blue-900">{activePlanningsMap.size}</p>
                </div>
                <Factory className="w-8 h-8 text-blue-500" />
            </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm text-orange-600 font-medium">Operadores Necesarios</p>
                    <p className="text-2xl font-bold text-orange-900">{totalRequiredOperators}</p>
                </div>
                <Users className="w-8 h-8 text-orange-500" />
            </CardContent>
        </Card>
        <Card className={`${availableOperators >= totalRequiredOperators ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className={`text-sm font-medium ${availableOperators >= totalRequiredOperators ? 'text-green-600' : 'text-red-600'}`}>
                        Operadores Disponibles
                    </p>
                    <p className={`text-2xl font-bold ${availableOperators >= totalRequiredOperators ? 'text-green-900' : 'text-red-900'}`}>
                        {availableOperators}
                    </p>
                </div>
                {availableOperators >= totalRequiredOperators ? 
                    <Users className="w-8 h-8 text-green-500" /> : 
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                }
            </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
            <CardTitle>Listado de Máquinas</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px] text-center">Estado</TableHead>
                        <TableHead>Máquina</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead className="w-[150px]">Operarios</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {machines.map(machine => {
                        const machineIdStr = String(machine.id);
                        const planning = activePlanningsMap.get(machineIdStr);
                        const isPlanned = !!planning;

                        return (
                            <TableRow key={machineIdStr} className={isPlanned ? "bg-blue-50" : ""}>
                                <TableCell className="text-center">
                                    <Switch 
                                        checked={isPlanned}
                                        onCheckedChange={(checked) => handleToggle(machine, checked)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium">
                                    {machine.nombre}
                                    {machine.descripcion && machine.descripcion !== machine.nombre && (
                                        <div className="text-xs text-slate-500">{machine.descripcion}</div>
                                    )}
                                </TableCell>
                                <TableCell className="font-mono text-sm text-slate-500">
                                    {machine.codigo_maquina}
                                </TableCell>
                                <TableCell>
                                    {isPlanned ? (
                                        <Input 
                                            type="number" 
                                            min="1" 
                                            className="w-20 h-8"
                                            defaultValue={planning.operadores_necesarios}
                                            onBlur={(e) => handleOperatorChange(planning.id, e.target.value)}
                                            onKeyDown={(e) => {
                                                if(e.key === 'Enter') handleOperatorChange(planning.id, e.currentTarget.value);
                                            }}
                                        />
                                    ) : (
                                        <span className="text-slate-400 text-sm">-</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
