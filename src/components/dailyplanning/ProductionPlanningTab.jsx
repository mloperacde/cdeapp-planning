import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Factory, Eye, AlertTriangle, Users, Save, CheckCircle, X, ChevronsUpDown, Check, Trash2, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useToast } from "@/components/ui/use-toast";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProductionPlanningTab({ selectedDate, selectedTeam, selectedShift }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: plannings = [] } = useQuery({
    queryKey: ['machinePlannings', selectedDate, selectedTeam],
    queryFn: () => base44.entities.MachinePlanning.filter({ 
      fecha_planificacion: selectedDate, 
      team_key: selectedTeam 
    }),
    initialData: [],
    enabled: machines.length > 0, // Stagger: Wait for Machines
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: machines = [] } = useQuery({
    queryKey: ['machines', 'v2_deduplicated'], // Changed key to force cache refresh
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 2000);
      
      // Deduplicate machines by ID ONLY to ensure strictly unique rows
      // The user reported "selecting one marks 4", which implies duplicate rows rendering
      const uniqueMachines = new Map();
      
      data.forEach(m => {
        if (!m.id) return; // Skip invalid
        const id = String(m.id); // Normalize ID
        
        // If we haven't seen this ID, add it.
        // If we HAVE seen it, we ignore duplicates (first wins)
        if (!uniqueMachines.has(id)) {
           uniqueMachines.set(id, {
             id: m.id, // Keep original type if needed by backend, or normalize? usually keeping original is safer but for comparison we use String
             nombre: m.nombre,
             codigo: m.codigo_maquina,
             descripcion: m.descripcion,
             orden: m.orden_visualizacion || 999
           });
        }
      });
      
      return Array.from(uniqueMachines.values()).sort((a, b) => a.orden - b.orden);
    },
    staleTime: Infinity, // Forever
    gcTime: Infinity,
    enabled: teams.length > 0, // Stagger: Wait for Teams
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    staleTime: Infinity, // Forever
    gcTime: Infinity,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre', 500),
    staleTime: Infinity, // Forever
    gcTime: Infinity,
    enabled: machines.length > 0, // Stagger: Wait for Machines
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const [openCombobox, setOpenCombobox] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const deletingIdsRef = React.useRef(new Set());

  // --- Derived State ---

  const activePlanningsMap = useMemo(() => {
    const map = new Map();
    // Sort by created_at desc to keep latest
    const sortedPlannings = [...plannings]
        .filter(p => p.team_key === selectedTeam && p.fecha_planificacion === selectedDate)
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    sortedPlannings.forEach(p => {
        if (!map.has(String(p.machine_id))) {
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
            // Fallback if machine not found in master list
            list.push({ 
                id: planning.machine_id, 
                nombre: planning.machine_nombre || "Desconocida", 
                codigo_maquina: planning.machine_codigo || "N/A", 
                descripcion: "",
                planning 
            });
        }
    });
    return list.sort((a, b) => (a.orden || 999) - (b.orden || 999));
  }, [activePlanningsMap, machines]);

  const availableMachines = useMemo(() => {
    return machines.filter(m => !activePlanningsMap.has(String(m.id)));
  }, [machines, activePlanningsMap]);

  const totalOperators = useMemo(() => {
    let total = 0;
    activePlanningsMap.forEach(p => {
        total += (Number(p.operadores_necesarios) || 0);
    });
    return total;
  }, [activePlanningsMap]);

  const availableOperators = useMemo(() => {
    const teamName = teams.find(t => t.team_key === selectedTeam)?.team_name;
    if (!teamName) return 0;

    return employees.filter(emp => 
      emp.equipo === teamName && 
      emp.disponibilidad === "Disponible" &&
      emp.incluir_en_planning !== false
    ).length;
  }, [employees, selectedTeam, teams]);

  const operatorsDeficit = totalOperators - availableOperators;

  // --- Mutations ---

  const createPlanningMutation = useMutation({
    mutationFn: (data) => base44.entities.MachinePlanning.create(data),
    onMutate: async (newData) => {
        await queryClient.cancelQueries(['machinePlannings', selectedDate, selectedTeam]);
        const previousPlannings = queryClient.getQueryData(['machinePlannings', selectedDate, selectedTeam]);

        const tempId = `temp-${Date.now()}`;
        queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], (oldData = []) => {
            return [...oldData, { ...newData, id: tempId, created_at: new Date().toISOString() }];
        });

        return { previousPlannings, tempId };
    },
    onSuccess: (newPlanning, variables, context) => {
      // Replace temp item with real item
      queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], (oldData = []) => {
        return oldData.map(p => p.id === context.tempId ? newPlanning : p);
      });
      // NO INVALIDATION to avoid 429
    },
    onError: (err, newData, context) => {
      queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], context.previousPlannings);
      console.error("Error creating planning:", err);
      toast({
        title: "Error",
        description: "Error al añadir máquina: " + err.message,
        variant: "destructive"
      });
    }
  });

  const updatePlanningMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MachinePlanning.update(id, data),
    onSuccess: (updatedPlanning) => {
      // Optimistic update: Update item in cache without refetching
      queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], (oldData = []) => {
        return oldData.map(p => p.id === updatedPlanning.id ? updatedPlanning : p);
      });
      queryClient.invalidateQueries({ queryKey: ['machinePlannings', selectedDate, selectedTeam] });
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: "Error al actualizar: " + err.message,
        variant: "destructive"
      });
    }
  });

  const deletePlanningMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.MachinePlanning.delete(id),
    onSuccess: (deletedId, { id }) => {
      // Optimistic update: Remove from cache without refetching
      const idToDelete = typeof deletedId === 'object' ? deletedId?.id : id;
      
      queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], (oldData = []) => {
        return oldData.filter(p => p.id !== idToDelete && p.id !== id);
      });
      queryClient.invalidateQueries({ queryKey: ['machinePlannings', selectedDate, selectedTeam] });
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: "Error al eliminar: " + err.message,
        variant: "destructive"
      });
    }
  });

  // --- Handlers ---

  const handleAddMachine = (machine) => {
    const machineIdStr = String(machine.id);
    if (activePlanningsMap.has(machineIdStr)) return;

    createPlanningMutation.mutate({
        machine_id: machine.id,
        machine_nombre: machine.nombre,
        machine_codigo: machine.codigo_maquina, // Ensure correct field mapping from machine object
        fecha_planificacion: selectedDate,
        team_key: selectedTeam,
        operadores_necesarios: 1,
        activa_planning: true,
        turno: selectedShift,
        process_id: null
    });
    setOpenCombobox(false);
  };

  const handleDeletePlanning = (planningId) => {
    deletePlanningMutation.mutate({ id: planningId });
  };

  const handleOperatorChange = (planningId, val) => {
    const num = parseInt(val);
    if (!isNaN(num) && num > 0) {
        updatePlanningMutation.mutate({
            id: planningId,
            data: { operadores_necesarios: num }
        });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="border-b border-blue-100">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Factory className="w-6 h-6" />
              Planificación de Producción - {selectedShift || 'Sin turno'}
            </CardTitle>
            {/* Link removed temporarily as per user request to inline the config */}
            {/* <Link to={createPageUrl("MachinePlanning")}>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <Eye className="w-4 h-4 mr-2" />
                Planificación de Máquinas
              </Button>
            </Link> */}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Resumen de Operadores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-700 font-medium">Máquinas Activas</p>
                    <p className="text-2xl font-bold text-blue-900">{plannedMachines.length}</p>
                  </div>
                  <Factory className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-orange-700 font-medium">Operadores Necesarios</p>
                    <p className="text-2xl font-bold text-orange-900">{totalOperators}</p>
                  </div>
                  <Users className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-gradient-to-br ${
              operatorsDeficit > 0 
                ? 'from-red-50 to-red-100 border-red-300' 
                : 'from-green-50 to-green-100 border-green-200'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-medium ${
                      operatorsDeficit > 0 ? 'text-red-700' : 'text-green-700'
                    }`}>
                      Operadores Disponibles
                    </p>
                    <p className={`text-2xl font-bold ${
                      operatorsDeficit > 0 ? 'text-red-900' : 'text-green-900'
                    }`}>
                      {availableOperators}
                    </p>
                  </div>
                  {operatorsDeficit > 0 ? (
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  ) : (
                    <Users className="w-8 h-8 text-green-600" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerta de déficit */}
          {operatorsDeficit > 0 && (
            <Card className="mb-6 bg-red-50 border-2 border-red-300">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-900 mb-1">
                      ⚠️ Déficit de Operadores: Faltan {operatorsDeficit} operador{operatorsDeficit !== 1 ? 'es' : ''}
                    </p>
                    <p className="text-sm text-red-800">
                      Ajusta la planificación abajo para equilibrar la carga.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Machine Selection & List */}
          <div className="mt-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Factory className="w-5 h-5 text-blue-600" />
                    Planificación de Máquinas
                </h3>
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCombobox}
                            className="w-full sm:w-[300px] justify-between"
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
                                            <Plus className="ml-auto h-4 w-4 opacity-50" />
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
            
            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                {plannedMachines.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-slate-50">
                        <Factory className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="font-medium">No hay máquinas planificadas para este turno.</p>
                        <p className="text-sm mt-1">Utiliza el buscador arriba para añadir máquinas.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Máquina</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead className="w-[180px]">Operarios</TableHead>
                                <TableHead className="w-[100px] text-center">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {plannedMachines.map(item => {
                                const { planning } = item;
                                return (
                                    <TableRow key={planning.id} className="hover:bg-slate-50/50">
                                        <TableCell className="font-medium text-slate-900">
                                            <div className="flex flex-col">
                                                <span>{item.nombre}</span>
                                                {item.descripcion && item.descripcion !== item.nombre && (
                                                    <div className="text-xs text-slate-500">{item.descripcion}</div>
                                                )}
                                            </div>
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
                                                    onBlur={(e) => handleOperatorChange(planning.id, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if(e.key === 'Enter') handleOperatorChange(planning.id, e.currentTarget.value);
                                                    }}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDeletePlanning(planning.id)}
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
          </div>

          {/* Botón de Guardar / Validación */}
          <div className="mt-8 flex justify-end border-t pt-6">
            {plannedMachines.length > 0 && operatorsDeficit <= 0 ? (
              <Button 
                onClick={() => setShowSummary(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-6 px-8 text-lg rounded-xl shadow-lg transition-all flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4"
              >
                <Save className="w-6 h-6" />
                Guardar Planificación Daily
              </Button>
            ) : (
              <div className="flex flex-col items-end gap-2">
                 {operatorsDeficit > 0 && (
                  <div className="flex items-center text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-200 animate-pulse">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    <span className="font-medium">Corrige el déficit de {operatorsDeficit} operadores para poder guardar</span>
                  </div>
                 )}
                 <Button disabled className="opacity-50 cursor-not-allowed py-6 px-8 text-lg">
                    <Save className="w-6 h-6 mr-2" />
                    Guardar Planificación Daily
                 </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumen Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl text-green-700">
              <CheckCircle className="w-6 h-6" />
              Resumen de Planificación
            </DialogTitle>
            <DialogDescription>
              Revisa el resumen de la planificación antes de confirmar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-slate-500">Fecha</p>
                <p className="font-bold">{selectedDate}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-slate-500">Turno</p>
                <p className="font-bold">{selectedShift || 'Sin turno'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-slate-500">Total Máquinas</p>
                <p className="font-bold">{plannedMachines.length}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-slate-500">Total Operadores</p>
                <p className="font-bold">{totalOperators}</p>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 font-semibold text-sm text-slate-700">
                Detalle por Máquina
              </div>
              <div className="divide-y max-h-60 overflow-y-auto">
                {plannedMachines.map(item => (
                  <div key={item.planning.id} className="flex justify-between items-center px-4 py-2 text-sm">
                    <span className="font-medium">{item.nombre}</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                      {item.planning.operadores_necesarios} op.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setShowSummary(false)}>
              <X className="w-4 h-4 mr-2" />
              Seguir Editando
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setShowSummary(false);
                toast({
                  title: "Planificación Confirmada",
                  description: "La planificación ha sido guardada exitosamente.",
                  className: "bg-green-600 text-white border-none"
                });
              }}
            >
              <Save className="w-4 h-4 mr-2" />
              Confirmar y Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
