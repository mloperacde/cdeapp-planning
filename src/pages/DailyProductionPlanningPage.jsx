import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Factory, Users, Calendar as CalendarIcon, AlertTriangle, Trash2, Plus, Search, Save } from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DailyProductionPlanningPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- Local State ---
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTeam, setSelectedTeam] = useState(""); 
  const [machineSearch, setMachineSearch] = useState("");

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
    
    // Parse YYYY-MM-DD as local date to avoid timezone shifts
    const [year, month, day] = selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    
    const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    
    const schedule = shiftSchedule.find(s => 
      s.team_key === selectedTeam && 
      s.fecha_inicio_semana === weekStartStr
    );

    return schedule?.turno || "Sin Asignar";
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

  const filteredAvailableMachines = useMemo(() => {
      if (!machineSearch.trim()) return availableMachines;
      const lower = machineSearch.toLowerCase();
      return availableMachines.filter(m => 
          m.nombre?.toLowerCase().includes(lower) || 
          m.codigo_maquina?.toLowerCase().includes(lower)
      );
  }, [availableMachines, machineSearch]);

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

  const handleSavePlanning = () => {
      const deficit = totalRequiredOperators - availableOperators;
      if (deficit > 0) {
          toast({
              title: "Planificación Guardada (Con Advertencias)",
              description: `Se ha registrado la planificación, pero existe un déficit de ${deficit} operadores.`,
              variant: "destructive"
          });
      } else {
          toast({
              title: "Planificación Guardada",
              description: "La configuración de producción ha sido confirmada correctamente.",
              className: "bg-green-600 text-white border-green-700"
          });
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
        <div className="flex gap-2 w-full md:w-auto">
            <Button 
                variant="outline" 
                onClick={handleSavePlanning}
                className="flex-1 md:flex-none gap-2 border-green-600 text-green-700 hover:bg-green-50"
            >
                <Save className="w-4 h-4" />
                Guardar
            </Button>
            <Button 
                variant="destructive" 
                onClick={handleClearAll}
                disabled={activePlanningsMap.size === 0 || clearMutation.isPending}
                className="flex-1 md:flex-none"
            >
                {clearMutation.isPending ? "Limpiando..." : "Limpiar"}
            </Button>
        </div>
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

      {/* Deficit Alert */}
      {availableOperators < totalRequiredOperators && (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Déficit de Operadores</AlertTitle>
            <AlertDescription>
                Se requieren {totalRequiredOperators} operadores pero solo hay {availableOperators} disponibles.
                Por favor, revise la asignación de personal.
            </AlertDescription>
        </Alert>
      )}

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-350px)] min-h-[600px]">
          
          {/* Left Column: Machine Catalog */}
          <Card className="flex flex-col h-full border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
               <CardTitle className="text-base font-semibold flex items-center gap-2">
                 <Factory className="w-4 h-4 text-slate-500" />
                 Catálogo de Máquinas
               </CardTitle>
               <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                     placeholder="Buscar por nombre o código..." 
                     className="pl-9 bg-white" 
                     value={machineSearch}
                     onChange={(e) => setMachineSearch(e.target.value)}
                  />
               </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden bg-slate-50/30">
                <ScrollArea className="h-full">
                   <div className="p-3 space-y-2">
                      {filteredAvailableMachines.map(machine => (
                          <div key={machine.id} className="group flex items-center justify-between p-3 rounded-lg border bg-white hover:border-blue-300 hover:shadow-sm transition-all duration-200">
                              <div className="flex flex-col overflow-hidden mr-2">
                                  <span className="font-medium text-sm text-slate-700 truncate">{machine.nombre}</span>
                                  {machine.codigo_maquina && <span className="text-xs text-slate-500">{machine.codigo_maquina}</span>}
                              </div>
                              <Button 
                                  size="icon" 
                                  variant="ghost"
                                  onClick={() => handleAddMachine(machine)}
                                  className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-full"
                                  title="Añadir a planificación"
                              >
                                  <Plus className="h-4 w-4" />
                              </Button>
                          </div>
                      ))}
                      {filteredAvailableMachines.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-12 text-slate-400 px-4 text-center">
                              <Search className="w-8 h-8 mb-2 opacity-20" />
                              <p className="text-sm">No se encontraron máquinas disponibles con ese criterio.</p>
                          </div>
                      )}
                   </div>
                </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Column: Planning Table */}
          <Card className="lg:col-span-2 flex flex-col h-full border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">
                        Máquinas Planificadas <span className="text-slate-400 font-normal ml-1">({plannedMachines.length})</span>
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                    <div className="min-w-[600px]">
                        {plannedMachines.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                <Factory className="w-12 h-12 mb-3 text-slate-200" />
                                <p className="font-medium">No hay máquinas planificadas</p>
                                <p className="text-sm mt-1">Seleccione máquinas del catálogo para comenzar</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead className="pl-6">Máquina</TableHead>
                                        <TableHead>Código</TableHead>
                                        <TableHead className="w-[150px]">Operarios</TableHead>
                                        <TableHead className="w-[100px] text-center pr-6">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {plannedMachines.map(item => {
                                        const { planning } = item;
                                        return (
                                            <TableRow key={planning.id} className="hover:bg-slate-50/50">
                                                <TableCell className="pl-6 font-medium">
                                                    {item.nombre}
                                                    {item.descripcion && item.descripcion !== item.nombre && (
                                                        <div className="text-xs text-slate-500">{item.descripcion}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono text-sm text-slate-500">
                                                    {item.codigo_maquina}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4 text-slate-400" />
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
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center pr-6">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => handleDeletePlanning(planning.id)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
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
                </ScrollArea>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
