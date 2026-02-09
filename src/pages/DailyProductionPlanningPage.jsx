import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { getMachineAlias } from "@/utils/machineAlias";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Factory, Users, Calendar as CalendarIcon, AlertTriangle, Trash2, Plus, Search, Save, Copy, Repeat, ArrowLeft, Filter } from "lucide-react";
import { format, startOfWeek, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as ReactWindow from 'react-window';
import { AutoSizer } from "react-virtualized-auto-sizer";
import ThemeToggle from "../components/common/ThemeToggle";

const List = ReactWindow.FixedSizeList || ReactWindow.default?.FixedSizeList;

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";


export default function DailyProductionPlanningPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- Local State ---
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTeam, setSelectedTeam] = useState(""); 
  const [machineSearch, setMachineSearch] = useState("");
  
  // Import Dialog State
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importDate, setImportDate] = useState("");
  const [importTeam, setImportTeam] = useState("");

  // Update import defaults when main selection changes
  React.useEffect(() => {
    if (isImportDialogOpen) {
        if (!importDate) setImportDate(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'));
        if (!importTeam) setImportTeam(selectedTeam);
    }
  }, [isImportDialogOpen, selectedDate, selectedTeam]);

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
          const alias = getMachineAlias(m);
          const sala = (m.ubicacion || '').trim();
          const codigo = (m.codigo_maquina || '').trim();
          
          uniqueMap.set(id, { ...m, alias, ubicacion: sala, codigo_maquina: codigo });
        }
      });
      
      return Array.from(uniqueMap.values()).sort((a, b) => (a.orden_visualizacion || 999) - (b.orden_visualizacion || 999));
    },
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
          const alias = getMachineAlias({
              machine_name: planning.machine_nombre,
              codigo_maquina: planning.machine_codigo,
              ubicacion: planning.machine_ubicacion
            });
            list.push({ 
                id: planning.machine_id, 
                alias: alias || planning.machine_nombre || "Desconocida",
                codigo_maquina: planning.machine_codigo || "N/A", 
                planning 
            });
        }
    });
    return list.sort((a, b) => (a.orden_visualizacion || 999) - (b.orden_visualizacion || 999));
  }, [activePlanningsMap, machines]);

  const availableMachines = useMemo(() => {
    return (machines || []).filter(m => !activePlanningsMap.has(String(m.id)));
  }, [machines, activePlanningsMap]);

  const filteredAvailableMachines = useMemo(() => {
      if (!machineSearch.trim()) return availableMachines || [];
      const lower = machineSearch.toLowerCase();
      return (availableMachines || []).filter(m => 
          m.alias?.toLowerCase().includes(lower)
      );
  }, [availableMachines, machineSearch]);

  const availableOperators = useMemo(() => {
    const teamObj = (teams || []).find(t => t.team_key === selectedTeam);
    if (!teamObj) return 0;
    
    // Normalization helper for robust comparison
    const normalize = (str) => str ? str.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    const targetTeam = normalize(teamObj.team_name);

    return (employees || []).filter(e => {
        // 1. Team Match (Robust with team_id support)
        if (e.team_id && String(e.team_id) === String(teamObj.id)) {
            // Match by ID
        } else if (normalize(e.equipo) !== targetTeam) {
             return false;
        }

        // 2. Availability (Must be "Disponible" - Robust)
        if (normalize(e.disponibilidad) !== "disponible") return false;

        // 3. Department: 'Fabricación' (Robust)
        const dept = normalize(e.departamento);
        if (dept !== 'fabricacion') return false;

        // 4. Role (Puesto) in allowed list (Robust)
        const currentPuesto = normalize(e.puesto);
        const allowedRoles = [
            'responsable de linea', 
            'segunda de linea', 
            'operario de linea',
            'operaria de linea'
        ].map(normalize);
        
        if (!allowedRoles.includes(currentPuesto)) return false;

        // 5. Absence Check (Robust)
        if (e.ausencia_inicio) {
            const checkDate = new Date(selectedDate);
            checkDate.setHours(0, 0, 0, 0);
            
            const startDate = new Date(e.ausencia_inicio);
            startDate.setHours(0, 0, 0, 0);

            if (e.ausencia_fin) {
                const endDate = new Date(e.ausencia_fin);
                endDate.setHours(0, 0, 0, 0);
                if (checkDate >= startDate && checkDate <= endDate) return false;
            } else {
                // If no end date, assume single day or active? 
                // Strict check: if checkDate >= startDate, consider absent? 
                // For now, let's assume if no end date, it's a single day absence or start of long term.
                // Safest for planning: if checkDate >= startDate, they are absent.
                if (checkDate >= startDate) return false;
            }
        }

        return true;
    }).length;
  }, [employees, teams, selectedTeam, selectedDate]);

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

  const importMutation = useMutation({
    mutationFn: async ({ sourceDate, sourceTeam }) => {
        // 1. Fetch Source Plannings
        const sourcePlannings = await base44.entities.MachinePlanning.filter({ 
            fecha_planificacion: sourceDate, 
            team_key: sourceTeam 
        });

        if (!sourcePlannings || sourcePlannings.length === 0) {
            throw new Error("No hay planificación en la fecha/equipo seleccionados.");
        }

        // 2. Filter out duplicates (already present in current planning)
        // We use activePlanningsMap from closure, but for safety in async, we should probably fetch current or trust the user knows.
        // We will skip machines that are already planned for the TARGET date/team.
        
        const addedCount = 0;
        const promises = [];

        for (const p of sourcePlannings) {
            // Check if machine is already planned in current view
            // Note: We access the latest 'activePlanningsMap' via closure or queryClient, 
            // but simpler is to check against the Set of IDs we know are currently loaded.
            const isAlreadyPlanned = activePlanningsMap.has(String(p.machine_id));
            
            if (!isAlreadyPlanned) {
                // Create new planning
                // Try to get fresh alias from loaded machines if possible
                const currentMachine = machines.find(m => String(m.id) === String(p.machine_id));
                const freshAlias = currentMachine ? getMachineAlias(currentMachine) : p.machine_nombre;

                const newPlanning = {
                    machine_id: p.machine_id,
                    machine_nombre: freshAlias,
                    machine_codigo: p.machine_codigo,
                    fecha_planificacion: selectedDate, // Target Date
                    team_key: selectedTeam,            // Target Team
                    operadores_necesarios: p.operadores_necesarios,
                    activa_planning: true,
                    turno: currentShift,               // Target Shift
                    process_id: p.process_id
                };
                
                // Add to promise list (sequential or batched is better for rate limits, but let's try parallel with small delay if needed)
                // To be safe against 429, we'll await them sequentially or in small chunks.
                promises.push(() => base44.entities.MachinePlanning.create(newPlanning));
            }
        }

        if (promises.length === 0) {
            throw new Error("Todas las máquinas de origen ya están en la planificación actual.");
        }

        // Execute sequentially to avoid 429
        for (const createFn of promises) {
            await createFn();
            await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
        }

        return promises.length;
    },
    onMutate: async () => {
        await queryClient.cancelQueries(['machinePlannings', selectedDate, selectedTeam]);
        setIsImportDialogOpen(false); // Close dialog immediately
    },
    onSuccess: (count) => {
        toast({
            title: "Importación Exitosa",
            description: `Se han importado ${count} máquinas correctamente.`,
            className: "bg-green-600 text-white border-green-700",
            duration: 3000
        });
        queryClient.invalidateQueries(['machinePlannings', selectedDate, selectedTeam]);
    },
    onError: (err) => {
        toast({
            title: "Error al importar",
            description: err.message,
            variant: "destructive",
            duration: 5000
        });
    }
  });

  // --- Handlers ---

  const handleAddMachine = (machine) => {
    const machineIdStr = String(machine.id);
    if (activePlanningsMap.has(machineIdStr)) return;

    createMutation.mutate({
        machine_id: machine.id,
        machine_nombre: machine.alias,
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
              title: "Bloqueo de Planificación",
              description: `No se puede guardar la configuración: Faltan ${deficit} operadores para cubrir la demanda.`,
              variant: "destructive",
              duration: 5000
          });
          return;
      }
      
      toast({
          title: "Planificación Guardada",
          description: "La configuración de producción ha sido confirmada correctamente.",
          className: "bg-green-600 text-white border-green-700",
          duration: 3000
      });
  };

  const handleCopyPreviousDay = () => {
      const prevDate = format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd');
      importMutation.mutate({ sourceDate: prevDate, sourceTeam: selectedTeam });
  };

  const handleImportCustom = () => {
      if (!importDate || !importTeam) return;
      importMutation.mutate({ sourceDate: importDate, sourceTeam: importTeam });
  };

  // --- Render Helpers ---

  const MachineRow = ({ index, style, data }) => {
    const { machines, onAdd } = data;
    const machine = machines[index];
    
    return (
      <div style={style} className="px-3 py-1">
        <div className="group flex items-center justify-between p-3 rounded-lg border bg-white hover:border-blue-300 hover:shadow-sm transition-all duration-200 h-full">
            <div className="flex flex-col overflow-hidden mr-2 gap-0.5">
                <span className="font-medium text-sm text-slate-700 truncate" title={getMachineAlias(machine)}>
                    {getMachineAlias(machine)}
                </span>
            </div>
            <Button 
                size="icon" 
                variant="ghost"
                onClick={() => onAdd(machine)}
                className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-full"
                title="Añadir a planificación"
            >
                <Plus className="h-4 w-4" />
            </Button>
        </div>
      </div>
    );
  };

  // --- Render ---

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      
      {/* Fixed Header Section */}
      <div className="flex-none space-y-4 z-10">
        {/* Header Compacto */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  Planificación Diaria de Producción
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
                  Configure la planificación de máquinas y operadores para el día seleccionado.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <ThemeToggle />
            </div>
        </div>

        {/* Toolbar Unificada */}
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
          {/* Left: Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto">
              <div className="flex flex-col sm:flex-row items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm w-full xl:w-auto">
                  <div className="flex items-center px-2 border-r border-slate-200 dark:border-slate-800">
                      <Filter className="w-4 h-4 text-slate-500 mr-2" />
                      <span className="text-sm font-medium text-slate-700">Filtros</span>
                  </div>
                  
                  <Input 
                      type="date" 
                      value={selectedDate} 
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="border-0 shadow-none focus-visible:ring-0 w-full sm:w-auto h-8"
                  />
                  
                  <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                  
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger className="w-full sm:w-[200px] border-0 shadow-none focus:ring-0 h-8">
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

                  <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                  <div className="px-3 text-sm font-medium text-slate-600 whitespace-nowrap flex items-center gap-2">
                      Turno: <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">{currentShift}</span>
                  </div>
              </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-end">
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                  <DialogTrigger asChild>
                       <Button variant="outline" size="sm" className="h-9 gap-2 bg-white border-slate-200">
                          <Copy className="w-4 h-4" />
                          <span className="hidden md:inline">Importar</span>
                       </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                          <DialogTitle>Importar Planificación</DialogTitle>
                          <DialogDescription>
                              Copie la configuración de máquinas de otro día o equipo.
                              Las máquinas se añadirán a la planificación actual.
                          </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                           <Button 
                              variant="secondary" 
                              className="w-full justify-start gap-3" 
                              onClick={handleCopyPreviousDay}
                              disabled={importMutation.isPending}
                          >
                              <Repeat className="w-4 h-4" />
                              <div className="flex flex-col items-start">
                                  <span className="font-medium">Repetir Día Anterior</span>
                                  <span className="text-xs text-slate-500">Mismo equipo, fecha ayer</span>
                              </div>
                           </Button>
                           
                           <div className="relative">
                              <div className="absolute inset-0 flex items-center">
                                  <span className="w-full border-t" />
                              </div>
                              <div className="relative flex justify-center text-xs uppercase">
                                  <span className="bg-background px-2 text-muted-foreground">O personalizar</span>
                              </div>
                          </div>

                          <div className="grid gap-2">
                              <label className="text-sm font-medium">Fecha Origen</label>
                              <Input 
                                  type="date" 
                                  value={importDate}
                                  onChange={(e) => setImportDate(e.target.value)}
                              />
                          </div>
                          <div className="grid gap-2">
                              <label className="text-sm font-medium">Equipo Origen</label>
                              <Select value={importTeam} onValueChange={setImportTeam}>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Seleccionar equipo..." />
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
                      </div>
                      <DialogFooter>
                          <Button 
                              onClick={handleImportCustom} 
                              disabled={!importDate || !importTeam || importMutation.isPending}
                          >
                              {importMutation.isPending ? "Importando..." : "Importar Selección"}
                          </Button>
                      </DialogFooter>
                  </DialogContent>
              </Dialog>

              <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSavePlanning}
                  className="h-9 gap-2 border-green-600 text-green-700 hover:bg-green-50 bg-white"
              >
                  <Save className="w-4 h-4" />
                  Guardar
              </Button>
              <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleClearAll}
                  disabled={activePlanningsMap.size === 0 || clearMutation.isPending}
                  className="h-9"
              >
                  {clearMutation.isPending ? "Limpiando..." : "Limpiar"}
              </Button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50 border-blue-200 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-blue-600 font-medium">Máquinas Planificadas</p>
                        <p className="text-2xl font-bold text-blue-900">{activePlanningsMap.size}</p>
                    </div>
                    <Factory className="w-8 h-8 text-blue-500/50" />
                </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-orange-600 font-medium">Operadores Necesarios</p>
                        <p className="text-2xl font-bold text-orange-900">{totalRequiredOperators}</p>
                    </div>
                    <Users className="w-8 h-8 text-orange-500/50" />
                </CardContent>
            </Card>
            <Card className={`shadow-sm transition-colors duration-300 ${availableOperators >= totalRequiredOperators ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <CardContent className="p-4 flex items-center justify-between relative overflow-hidden">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                                <p className={`text-sm font-medium ${availableOperators >= totalRequiredOperators ? 'text-green-600' : 'text-red-600'}`}>
                                Operadores Disponibles
                            </p>
                            {/* Semáforo Visual */}
                            <div className={`w-3 h-3 rounded-full shadow-sm border ${
                                availableOperators >= totalRequiredOperators 
                                    ? 'bg-green-500 border-green-600 shadow-[0_0_8px_rgba(34,197,94,0.6)]' 
                                    : 'bg-red-500 border-red-600 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                            }`} title={availableOperators >= totalRequiredOperators ? "Cobertura Suficiente" : "Déficit de Personal"} />
                        </div>
                        <p className={`text-2xl font-bold ${availableOperators >= totalRequiredOperators ? 'text-green-900' : 'text-red-900'}`}>
                            {availableOperators}
                        </p>
                    </div>
                    {availableOperators >= totalRequiredOperators ? 
                        <Users className="w-8 h-8 text-green-500/50" /> : 
                        <AlertTriangle className="w-8 h-8 text-red-500/50" />
                    }
                    {/* Background decoration for semaphore effect */}
                    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-20 pointer-events-none ${
                        availableOperators >= totalRequiredOperators ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                </CardContent>
            </Card>
        </div>

        {/* Deficit Alert */}
        {availableOperators < totalRequiredOperators && (
            <Alert variant="destructive" className="shadow-sm bg-red-50 border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">Déficit de Operadores</AlertTitle>
                <AlertDescription className="text-red-700">
                    Se requieren {totalRequiredOperators} operadores pero solo hay {availableOperators} disponibles.
                    Por favor, revise la asignación de personal.
                </AlertDescription>
            </Alert>
        )}
      </div>
      
      {/* Scrollable Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
          
          {/* Left Column: Machine Catalog */}
          <Card className="flex flex-col h-full border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-2 pt-3 px-3 border-b bg-slate-50/50 shrink-0">
               <div className="flex items-center justify-between">
                 <CardTitle className="text-sm font-semibold flex items-center gap-2">
                   <Factory className="w-3.5 h-3.5 text-slate-500" />
                   Catálogo
                 </CardTitle>
                 <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 font-normal mr-1">{filteredAvailableMachines.length} disp.</span>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 text-slate-400 hover:text-blue-600"
                        onClick={() => queryClient.invalidateQueries(['machines'])}
                        title="Recargar máquinas"
                    >
                        <Repeat className="h-3 w-3" />
                    </Button>
                 </div>
               </div>
               <div className="relative mt-2">
                  <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                  <Input 
                     placeholder="Buscar..." 
                     className="pl-8 h-8 text-xs bg-white" 
                     value={machineSearch}
                     onChange={(e) => setMachineSearch(e.target.value)}
                  />
               </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden bg-slate-50/30 flex flex-col min-h-0">
              {filteredAvailableMachines.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 px-4 text-center h-full">
                    {machines.length === 0 ? (
                       <div className="flex flex-col items-center animate-pulse">
                          <Factory className="w-8 h-8 mb-2 opacity-20" />
                          <p className="text-xs">Cargando...</p>
                       </div>
                    ) : (
                       <>
                          <Search className="w-8 h-8 mb-2 opacity-20" />
                          <p className="text-xs">Sin resultados.</p>
                       </>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 w-full h-full min-h-0">
                      <ScrollArea className="h-full w-full">
                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-1.5 p-2">
                            {filteredAvailableMachines.map((machine) => (
                                <div 
                                    key={machine.id} 
                                    className="group relative bg-white border border-slate-200 rounded-md p-2 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                                    onClick={() => handleAddMachine(machine)}
                                >
                                    <div className="flex flex-col h-full justify-between gap-1">
                                        <div className="font-medium text-xs text-slate-700 leading-tight line-clamp-2" title={machine.alias}>
                                            {machine.alias}
                                        </div>
                                        {(machine.codigo_maquina || machine.ubicacion) && (
                                            <div className="flex items-center gap-1 mt-auto pt-1">
                                                {machine.codigo_maquina && (
                                                    <span className="bg-slate-100 text-slate-500 px-1 rounded text-[9px] font-mono border border-slate-100">
                                                        {machine.codigo_maquina}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-blue-50 text-blue-600 rounded-full p-0.5 shadow-sm">
                                            <Plus className="h-3 w-3" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                      </ScrollArea>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Right Column: Planning Grid */}
          <Card className="lg:col-span-2 flex flex-col h-full border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-2 pt-3 px-4 border-b shrink-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div className="bg-blue-100 p-1 rounded">
                            <Factory className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        Máquinas Planificadas <span className="text-slate-400 font-normal">({plannedMachines.length})</span>
                    </CardTitle>
                    <div className="text-xs text-slate-500">
                        {totalRequiredOperators} operarios asignados
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 min-h-0 bg-slate-50/10">
                <ScrollArea className="h-full w-full">
                    <div className="p-3">
                        {plannedMachines.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                                <Factory className="w-10 h-10 mb-2 text-slate-200" />
                                <p className="font-medium text-sm">Lista vacía</p>
                                <p className="text-xs mt-1">Añada máquinas del catálogo</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
                                {plannedMachines.map(item => {
                                    const { planning } = item;
                                    return (
                                        <div key={planning.id} className="group bg-white border border-slate-200 rounded-lg p-2.5 hover:shadow-md hover:border-blue-200 transition-all relative flex flex-col gap-2">
                                            {/* Header: Name */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="font-semibold text-xs text-slate-800 leading-tight line-clamp-2" title={getMachineAlias(item)}>
                                                    {getMachineAlias(item)}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 -mr-1 -mt-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full shrink-0"
                                                    onClick={() => handleDeletePlanning(planning.id)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            {/* Details & Controls */}
                                            <div className="flex items-end justify-between gap-2 mt-auto">
                                                <div className="flex flex-col gap-0.5">
                                                     <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Operarios</span>
                                                     <div className="flex items-center gap-1">
                                                        <Input 
                                                            type="number" 
                                                            min="1"
                                                            className="h-6 w-12 px-1 text-center text-xs font-bold bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            defaultValue={planning.operadores_necesarios}
                                                            onBlur={(e) => handleOperatorChange(planning.id, e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if(e.key === 'Enter') handleOperatorChange(planning.id, e.currentTarget.value);
                                                            }}
                                                        />
                                                     </div>
                                                </div>
                                                
                                                <div className="flex flex-col items-end gap-0.5">
                                                     <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Turno</span>
                                                     <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                                        {planning.turno || currentShift}
                                                     </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
