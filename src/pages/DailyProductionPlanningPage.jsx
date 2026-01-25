import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Factory, Users, Calendar as CalendarIcon, AlertTriangle, Trash2, Plus, Check, ChevronsUpDown } from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function DailyProductionPlanningPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- Local State ---
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTeam, setSelectedTeam] = useState(""); 
  const [openCombobox, setOpenCombobox] = useState(false);

  // --- Queries ---

  // 1. Fetch Teams
  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
    enabled: teams.length > 0, // Stagger: Wait for Teams
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // 3. Fetch Plannings for Date/Team
  const { data: plannings = [] } = useQuery({
    queryKey: ['machinePlannings', selectedDate, selectedTeam],
    queryFn: () => base44.entities.MachinePlanning.filter({ 
      fecha_planificacion: selectedDate, 
      team_key: selectedTeam 
    }),
    enabled: !!selectedDate && !!selectedTeam && machines.length > 0, // Stagger: Wait for Machines
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // 4. Fetch Shift Schedule to determine Shift
  const { data: shiftSchedule } = useQuery({
    queryKey: ['teamWeekSchedules', selectedDate],
    queryFn: async () => {
      const allSchedules = await base44.entities.TeamWeekSchedule.list(undefined, 2000);
      return allSchedules;
    },
    enabled: teams.length > 0, // Stagger: Wait for Teams
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // 5. Fetch Employees for Availability
  const { data: employees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre', 1000),
    enabled: machines.length > 0, // Stagger: Wait for Machines (Splitting heavy loads)
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // --- Derived State ---

  const currentShift = useMemo(() => {
    if (!shiftSchedule) return "Desconocido";
    const dateObj = new Date(selectedDate);
    const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    
    const schedule = shiftSchedule.find(s => 
      s.team_key === selectedTeam && 
      s.week_start_date === weekStartStr
    );

    if (!schedule) return "Sin Asignar";

    let dayIndex = dateObj.getDay();
    if (dayIndex === 0) dayIndex = 7;
    
    const fieldName = `day_${dayIndex}_shift`;
    return schedule[fieldName] || "Libre";
  }, [shiftSchedule, selectedDate, selectedTeam]);

  const activePlanningsMap = useMemo(() => {
    const map = new Map();
    plannings.forEach(p => {
        if (p.team_key === selectedTeam && p.fecha_planificacion === selectedDate) {
            map.set(String(p.machine_id), p);
        }
    });
    return map;
  }, [plannings, selectedTeam, selectedDate]);

  const plannedMachines = useMemo(() => {
    const list = [];
    activePlanningsMap.forEach(planning => {
        const machine = machines.find(m => String(m.id) === String(planning.machine_id));
        if (machine) {
            list.push({ ...machine, planning });
        } else {
            list.push({ 
                id: planning.machine_id, 
                nombre: planning.machine_nombre || "Desconocida", 
                codigo_maquina: planning.machine_codigo || "N/A", 
                planning 
            });
        }
    });
    return list.sort((a, b) => (a.orden_visualizacion || 999) - (b.orden_visualizacion || 999));
  }, [activePlanningsMap, machines]);

  const availableMachines = useMemo(() => {
    return machines.filter(m => !activePlanningsMap.has(String(m.id)));
  }, [machines, activePlanningsMap]);

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
    onMutate: async (newData) => {
        await queryClient.cancelQueries(['machinePlannings', selectedDate, selectedTeam]);
        const previousPlannings = queryClient.getQueryData(['machinePlannings', selectedDate, selectedTeam]);

        const tempId = 'temp-' + Date.now();
        queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], (old = []) => {
            return [...old, { ...newData, id: tempId }];
        });

        return { previousPlannings, tempId };
    },
    onError: (err, newData, context) => {
        queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], context.previousPlannings);
        toast({
            title: "Error al crear",
            description: err.message,
            variant: "destructive"
        });
    },
    onSuccess: (newPlanning, variables, context) => {
        // Replace temp item with real item
        queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], (old = []) => {
            return old.map(p => p.id === context.tempId ? newPlanning : p);
        });
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
        toast({ title: "Error", description: "No se pudo eliminar la máquina", variant: "destructive" });
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
    }
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
        const promises = plannings.map(p => base44.entities.MachinePlanning.delete(p.id));
        await Promise.all(promises);
    },
    onMutate: async () => {
        await queryClient.cancelQueries(['machinePlannings', selectedDate, selectedTeam]);
        const previousPlannings = queryClient.getQueryData(['machinePlannings', selectedDate, selectedTeam]);

        queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], []);

        return { previousPlannings };
    },
    onError: (err, _, context) => {
        queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], context.previousPlannings);
        toast({ title: "Error", description: "No se pudo limpiar la planificación", variant: "destructive" });
    },
    onSettled: () => {
         queryClient.invalidateQueries(['machinePlannings', selectedDate, selectedTeam]);
    }
  });

  // --- Handlers ---

  const handleAddMachine = (machine) => {
    const machineIdStr = String(machine.id);
    if (activePlanningsMap.has(machineIdStr)) return;

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
    setOpenCombobox(false);
  };

  const handleDeletePlanning = (planningId) => {
    deleteMutation.mutate(planningId);
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

  const handleClearAll = () => {
    if (confirm("¿Estás seguro de que deseas borrar TODA la planificación para este día y equipo? Esta acción no se puede deshacer.")) {
        clearMutation.mutate();
    }
  };

  // --- Render ---

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
            Planificación Diaria de Producción
            </h1>
            <p className="text-slate-500 mt-1">
                Configure la planificación de máquinas y operadores para el día seleccionado.
            </p>
        </div>
        <Button 
            variant="destructive" 
            onClick={handleClearAll}
            disabled={activePlanningsMap.size === 0 || clearMutation.isPending}
            className="w-full md:w-auto"
        >
            {clearMutation.isPending ? "Limpiando..." : "Limpiar Planificación"}
        </Button>
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

      {/* Machine Selection & List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Listado de Máquinas</CardTitle>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCombobox}
                        className="w-[250px] justify-between"
                    >
                        <span className="truncate">
                             Añadir Máquina...
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                    <Command>
                        <CommandInput placeholder="Buscar máquina..." />
                        <CommandList>
                            <CommandEmpty>No se encontraron máquinas.</CommandEmpty>
                            <CommandGroup>
                                {availableMachines.map((machine) => (
                                    <CommandItem
                                        key={machine.id}
                                        value={`${machine.nombre} ${machine.codigo_maquina || ''}`}
                                        onSelect={() => handleAddMachine(machine)}
                                    >
                                        <div className="flex flex-col">
                                            <span>{machine.nombre}</span>
                                            {machine.codigo_maquina && (
                                                <span className="text-xs text-slate-500">{machine.codigo_maquina}</span>
                                            )}
                                        </div>
                                        <Check
                                            className={cn(
                                                "ml-auto h-4 w-4",
                                                activePlanningsMap.has(String(machine.id)) ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
            {plannedMachines.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                    <p>No hay máquinas planificadas para este día.</p>
                    <p className="text-sm">Utiliza el botón "Añadir Máquina" para comenzar.</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Máquina</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead className="w-[150px]">Operarios</TableHead>
                            <TableHead className="w-[100px] text-center">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {plannedMachines.map(item => {
                            const { planning } = item;
                            return (
                                <TableRow key={planning.id}>
                                    <TableCell className="font-medium">
                                        {item.nombre}
                                        {item.descripcion && item.descripcion !== item.nombre && (
                                            <div className="text-xs text-slate-500">{item.descripcion}</div>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm text-slate-500">
                                        {item.codigo_maquina}
                                    </TableCell>
                                    <TableCell>
                                        <Input 
                                            type="number" 
                                            min="1" 
                                            className="w-20 h-8"
                                            defaultValue={planning.operadores_necesarios}
                                            disabled={String(planning.id).startsWith('temp-')}
                                            onBlur={(e) => handleOperatorChange(planning.id, e.target.value)}
                                            onKeyDown={(e) => {
                                                if(e.key === 'Enter') handleOperatorChange(planning.id, e.currentTarget.value);
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => handleDeletePlanning(planning.id)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
