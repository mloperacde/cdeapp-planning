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
import { Factory, Users, Calendar as CalendarIcon, AlertTriangle, Trash2, Plus, Search, Save, Copy, Repeat, ArrowLeft, Filter, Sparkles } from "lucide-react";
import { format, startOfWeek, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as ReactWindow from 'react-window';
import { AutoSizer } from "react-virtualized-auto-sizer";
import ThemeToggle from "../components/common/ThemeToggle";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [selectedShift, setSelectedShift] = useState("Mañana");
  const [selectedTeam, setSelectedTeam] = useState(""); 
  const [configMode, setConfigMode] = useState("manual");
  const [isLoading, setIsLoading] = useState(false);
  
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

  const { data: dailyPlansHistory = [] } = useQuery({
    queryKey: ['dailyMachinePlansHistory'],
    queryFn: async () => {
      if (!base44.entities.DailyMachinePlanning) return [];
      const data = await base44.entities.DailyMachinePlanning.list('', 2000);
      return Array.isArray(data) ? data : [];
    },
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

  const { data: manufacturingConfigRecord } = useQuery({
    queryKey: ["appConfig", "manufacturing"],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ config_key: "manufacturing_config" });
      return configs[0] || null;
    },
    enabled: machines.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // --- Derived State ---

  const selectedTeamObj = useMemo(() => {
    return (teams || []).find(t => t.team_key === selectedTeam) || null;
  }, [teams, selectedTeam]);

  React.useEffect(() => {
    if (!shiftSchedule || !selectedDate || !selectedShift) return;

    const [year, month, day] = selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');

    const normalize = (str) => str ? str.toString().trim().toLowerCase() : "";
    const targetShift = normalize(selectedShift);

    const schedule = shiftSchedule.find(s => {
      if (s.fecha_inicio_semana !== weekStartStr) return false;
      const turno = normalize(s.turno);
      if (targetShift.includes("mañana")) {
        return turno.includes("mañana") || turno.includes("t1");
      }
      if (targetShift.includes("tarde")) {
        return turno.includes("tarde") || turno.includes("t2");
      }
      return false;
    });

    if (schedule && schedule.team_key) {
      if (schedule.team_key !== selectedTeam) {
        setSelectedTeam(schedule.team_key);
      }
      return;
    }

    if (!selectedTeam && teams.length > 0) {
      setSelectedTeam(teams[0].team_key);
    }
  }, [shiftSchedule, selectedDate, selectedShift, teams, selectedTeam]);

  const currentShift = useMemo(() => {
    return selectedShift || "Sin Asignar";
  }, [selectedShift]);

  const manufacturingConfig = useMemo(() => {
    if (!manufacturingConfigRecord) {
      return { areas: [] };
    }
    try {
      const raw = manufacturingConfigRecord.value || manufacturingConfigRecord.description || manufacturingConfigRecord.app_subtitle || null;
      if (!raw) return { areas: [] };
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return {
        areas: Array.isArray(parsed.areas) ? parsed.areas : [],
      };
    } catch {
      return { areas: [] };
    }
  }, [manufacturingConfigRecord]);

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
        // Solo contar como "planificada" la parte manual (no sugerida)
        if (planning.auto_suggested) return;
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

  const areasWithMachines = useMemo(() => {
    const allMachines = machines || [];
    const areasConfig = manufacturingConfig?.areas || [];
    const usedMachineIds = new Set();
    const result = [];

    areasConfig.forEach(area => {
      const areaIdStr = String(area.id);
      const machinesInArea = allMachines.filter(m => {
        const mAreaId = m.area_id ? String(m.area_id) : null;
        if (mAreaId && mAreaId === areaIdStr) return true;
        if (!mAreaId && m.area_name && area.name && String(m.area_name).trim() === String(area.name).trim()) return true;
        return false;
      });
      machinesInArea.forEach(m => usedMachineIds.add(String(m.id)));
      result.push({
        areaId: area.id,
        areaName: area.name,
        machines: machinesInArea,
      });
    });

    const leftover = allMachines.filter(m => !usedMachineIds.has(String(m.id)));
    if (leftover.length) {
      result.push({
        areaId: "unassigned",
        areaName: "Sin Área",
        machines: leftover,
      });
    }

    return result;
  }, [machines, manufacturingConfig]);

  const avgOperatorsByMachine = useMemo(() => {
    const sums = new Map();
    const counts = new Map();
    const norm = (s) => s ? s.toString().trim().toLowerCase() : '';
    const targetShift = norm(currentShift);

    (dailyPlansHistory || []).forEach(r => {
      if (!r || r.team_key !== selectedTeam) return;
      const recordShift = norm(r.turno || r.shift);
      if (recordShift && recordShift !== targetShift) return;
      if (!r.machine_id) return;
      const mid = String(r.machine_id);
      const op = Number(r.operadores_necesarios) || 0;
      sums.set(mid, (sums.get(mid) || 0) + op);
      counts.set(mid, (counts.get(mid) || 0) + 1);
    });

    const avg = new Map();
    sums.forEach((sum, mid) => {
      const c = counts.get(mid) || 1;
      avg.set(mid, sum / c);
    });
    return avg;
  }, [dailyPlansHistory, selectedTeam, currentShift]);

  const availableOperators = useMemo(() => {
    const teamObj = (teams || []).find(t => t.team_key === selectedTeam);
    if (!teamObj) return 0;
    
    // Normalization helper for robust comparison
    const normalize = (str) => str ? str.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    const targetTeam = normalize(teamObj.team_name);
    const shift = normalize(currentShift);
    const isMorningShift = shift.includes("mañana") || shift.includes("t1") || shift === "manana";
    const isAfternoonShift = shift.includes("tarde") || shift.includes("t2");

    return (employees || []).filter(e => {
        // 1. Team Match (Robust with team_id support) + include fixed shift employees
        //    Logic: Employee belongs to team OR has Fixed Shift corresponding to current shift
        const isTeamById = e.team_id && String(e.team_id) === String(teamObj.id);
        const isTeamByName = normalize(e.equipo) === targetTeam;
        const tipoTurno = normalize(e.tipo_turno);
        
        // Fixed shift employees are available regardless of team, IF they match the shift
        const isFixedMorning = tipoTurno === "fijo manana" || tipoTurno === "fijo mañana";
        const isFixedAfternoon = tipoTurno === "fijo tarde";

        const matchesShiftContext = 
          (isMorningShift && isFixedMorning) ||
          (isAfternoonShift && isFixedAfternoon);

        // If employee is Fixed Shift matching current shift, INCLUDE them (even if team doesn't match)
        // If employee is Rotating (Rotativo), they MUST match the Team
        
        let shouldInclude = false;
        if (matchesShiftContext) {
            shouldInclude = true;
        } else if (isTeamById || isTeamByName) {
            // Only include team members if they are NOT fixed shift for the OTHER shift
            // e.g. If current is Morning, and team member is Fixed Afternoon, exclude.
            if (isMorningShift && isFixedAfternoon) shouldInclude = false;
            else if (isAfternoonShift && isFixedMorning) shouldInclude = false;
            else shouldInclude = true;
        }

        if (!shouldInclude) return false;

        // 2. Availability (Must be "Disponible" - Robust)
        // If status is not explicitly 'disponible', skip.
        if (normalize(e.disponibilidad) !== "disponible") return false;

        // 3. Department: 'Producción' (Robust, normalizado)
        // Allow variations like 'produccion', 'production', 'operaciones'
        const dept = normalize(e.departamento);
        if (!dept.includes('produccion') && !dept.includes('production') && !dept.includes('operaciones')) return false;

        // 4. Role (Puesto) in allowed list (Robust)
        // Allow empty role if department is correct? Better strict for operators count.
        const currentPuesto = normalize(e.puesto);
        const allowedRoles = [
            'responsable de linea', 
            'segunda de linea', 
            'operario de linea',
            'operaria de linea',
            'tecnico de proceso',
            'operario',
            'operaria'
        ].map(normalize);
        
        // Check if role contains any of allowed keywords (more robust than exact match)
        const roleMatch = allowedRoles.some(role => currentPuesto.includes(role));
        if (!roleMatch) return false;

        // 5. Absence Check (Robust)
        // ... (existing logic seems fine, but let's ensure we parse dates correctly)
        if (e.ausencia_inicio) {
            const checkDate = new Date(selectedDate);
            checkDate.setHours(12, 0, 0, 0); // Use noon to avoid timezone edge cases
            const checkTime = checkDate.getTime();
            
            const startDate = new Date(e.ausencia_inicio);
            startDate.setHours(0, 0, 0, 0);
            const startTime = startDate.getTime();

            if (e.ausencia_fin) {
                const endDate = new Date(e.ausencia_fin);
                endDate.setHours(23, 59, 59, 999);
                const endTime = endDate.getTime();
                
                if (checkTime >= startTime && checkTime <= endTime) return false;
            } else {
                // If no end date, assume active absence
                if (checkTime >= startTime) return false;
            }
        }

        return true;
    }).length;
  }, [employees, teams, selectedTeam, selectedDate]);

  const totalRequiredOperators = useMemo(() => {
    let total = 0;
    activePlanningsMap.forEach(p => {
        if (p.auto_suggested) return;
        
        // Ensure machine exists in the current machine list to avoid ghost counts
        const machineExists = machines.some(m => String(m.id) === String(p.machine_id));
        if (!machineExists) return;

        total += (Number(p.operadores_necesarios) || 0);
    });
    return total;
  }, [activePlanningsMap, machines]);

  // --- Mutations ---

  const autoProposalMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !selectedTeam) {
        throw new Error("Debe seleccionar un día y turno antes de proponer planificación.");
      }

      if (!base44.entities.WorkOrder) {
        throw new Error("Entidad WorkOrder no disponible en este entorno.");
      }

      const raw = await base44.entities.WorkOrder.list(undefined, 2000);
      if (!Array.isArray(raw) || raw.length === 0) {
        throw new Error("No hay órdenes planificadas en el Gantt.");
      }

      const orders = raw.map(order => {
        let extra = {};
        if (order.notes && typeof order.notes === "string") {
          try {
            const parsed = JSON.parse(order.notes);
            if (parsed && typeof parsed === "object") extra = parsed;
          } catch (_) {}
        }

        const normDate = (val) => {
          if (!val) return null;
          if (typeof val !== "string") return val;
          if (/^\d{4}-/.test(val)) return val;
          if (val.includes("/")) {
            const parts = val.split(" ");
            const datePart = parts[0];
            const timePart = parts[1];
            const dmy = datePart.split("/");
            if (dmy.length === 3) {
              const d = dmy[0];
              const m = dmy[1];
              const y = dmy[2];
              if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
                const dateStr = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
                return timePart ? `${dateStr}T${timePart}:00` : dateStr;
              }
            }
          }
          return val;
        };

        const merged = { ...order, ...extra };

        const effectiveStart = (() => {
          const modStart = normDate(extra["Fecha Inicio Modificada"] || extra.modified_start_date || "");
          const startLimit = normDate(extra["Fecha Inicio Limite"] || extra.start_date || order.start_date || "");
          const result = modStart && !String(modStart).startsWith("0000") && String(modStart).length > 0 ? modStart : startLimit;
          return result || null;
        })();

        const effectiveEnd = normDate(
          extra["Fecha Fin"] || extra["end_date_simple"] || extra.planned_end_date || order.planned_end_date || ""
        );

        return {
          id: order.id,
          machine_id: order.machine_id,
          effective_start_date: effectiveStart,
          effective_delivery_date: effectiveEnd,
          product_name: extra.product_name || extra["Nombre"] || order.product_name || ""
        };
      });

      const selectedDateObj = new Date(selectedDate);
      selectedDateObj.setHours(12, 0, 0, 0);

      const machinesForDay = new Map();

      orders.forEach(o => {
        if (!o.effective_start_date) return;
        const start = new Date(o.effective_start_date);
        if (Number.isNaN(start.getTime())) return;
        const end = o.effective_delivery_date ? new Date(o.effective_delivery_date) : start;
        if (Number.isNaN(end.getTime())) return;
        const startDay = new Date(start);
        startDay.setHours(0, 0, 0, 0);
        const endDay = new Date(end);
        endDay.setHours(23, 59, 59, 999);
        if (selectedDateObj >= startDay && selectedDateObj <= endDay && o.machine_id) {
          const key = String(o.machine_id);
          if (!machinesForDay.has(key)) {
            machinesForDay.set(key, o);
          }
        }
      });

      if (machinesForDay.size === 0) {
        throw new Error("No hay máquinas con órdenes programadas en el Gantt para este día.");
      }

      const candidateMachines = (machines || []).filter(m => machinesForDay.has(String(m.id)));
      const toCreate = candidateMachines.filter(m => !activePlanningsMap.has(String(m.id)));

      if (toCreate.length === 0) {
        throw new Error("Todas las máquinas del Gantt ya están en la planificación diaria.");
      }

      for (const machine of toCreate) {
        const orderForMachine = machinesForDay.get(String(machine.id));
        await base44.entities.MachinePlanning.create({
          machine_id: machine.id,
          machine_nombre: machine.alias,
          machine_codigo: machine.codigo_maquina,
          fecha_planificacion: selectedDate,
          team_key: selectedTeam,
          operadores_necesarios: 1,
          activa_planning: true,
          turno: currentShift,
          auto_suggested: true,
          process_id: null,
          product_name: orderForMachine?.product_name || null
        });
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      return toCreate.length;
    },
    onMutate: async () => {
      await queryClient.cancelQueries(["machinePlannings", selectedDate, selectedTeam]);
    },
    onSuccess: (count) => {
      toast({
        title: "Propuesta generada",
        description: `Se han añadido ${count} máquinas desde el Gantt de órdenes.`,
        className: "bg-blue-600 text-white border-blue-700",
        duration: 3000
      });
      queryClient.invalidateQueries(["machinePlannings", selectedDate, selectedTeam]);
      setConfigMode("suggested");
    },
    onError: (err) => {
      toast({
        title: "Error al proponer planificación",
        description: err.message,
        variant: "destructive",
        duration: 5000
      });
    }
  });

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

  const saveSnapshotMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !selectedTeam) {
        throw new Error("Debe seleccionar un día y equipo antes de guardar.");
      }
      if (!base44.entities.DailyMachinePlanning) {
        throw new Error("Entidad DailyMachinePlanning no disponible en este entorno.");
      }

      const manualPlannings = [];
      activePlanningsMap.forEach(p => {
        if (p.auto_suggested) return;
        manualPlannings.push(p);
      });

      if (manualPlannings.length === 0) {
        throw new Error("No hay ninguna máquina planificada en modo manual para guardar.");
      }

      for (const p of manualPlannings) {
        await base44.entities.DailyMachinePlanning.create({
          date: selectedDate,
          shift: currentShift,
          fecha: selectedDate,
          turno: currentShift,
          team_key: selectedTeam,
          machine_id: p.machine_id,
          process_id: p.process_id || null,
          activa: p.activa_planning !== false,
          operadores_necesarios: Number(p.operadores_necesarios) || 0,
        });
        await new Promise(resolve => setTimeout(resolve, 25));
      }
    },
    onSuccess: () => {
      toast({
        title: "Planificación Guardada",
        description: "La configuración de producción ha sido confirmada correctamente.",
        className: "bg-green-600 text-white border-green-700",
        duration: 3000
      });
    },
    onError: (err) => {
      toast({
        title: "Error al guardar planificación",
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
        auto_suggested: false,
        process_id: null
    });
  };

  const handleDeletePlanning = (planningId) => {
    deleteMutation.mutate(planningId);
  };

  const handleOperatorChange = (planningId, val) => {
    // Treat empty string as 0 for real-time updates
    const num = val === "" ? 0 : parseInt(val);
    if (!isNaN(num) && num >= 0) { 
        updateMutation.mutate({
            id: planningId,
            data: { operadores_necesarios: num }
        });
    }
  };

  const handleClearAll = async () => {
    if (confirm("¿Estás seguro de que deseas borrar TODA la planificación para este día y equipo? Esta acción no se puede deshacer.")) {
        setIsLoading(true); // Using correct state setter
        try {
            // 1. Obtener lista fresca de la base de datos para asegurar limpieza total
            const freshPlannings = await base44.entities.MachinePlanning.filter({ 
                fecha_planificacion: selectedDate, 
                team_key: selectedTeam 
            });
            
            if (freshPlannings && freshPlannings.length > 0) {
                // 2. Borrado secuencial con pequeño delay para evitar 429 y asegurar persistencia
                for (const p of freshPlannings) {
                    await base44.entities.MachinePlanning.delete(p.id);
                    await new Promise(r => setTimeout(r, 30));
                }
            }
            
            toast({
                title: "Limpieza Completada",
                description: "Se han eliminado todos los registros de planificación.",
                className: "bg-green-600 text-white border-green-700"
            });
        } catch (error) {
            console.error("Error en limpieza total:", error);
            toast({
                title: "Error",
                description: "No se pudo completar la limpieza total.",
                variant: "destructive"
            });
        } finally {
            queryClient.invalidateQueries(['machinePlannings', selectedDate, selectedTeam]);
            setIsLoading(false);
        }
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
      
      saveSnapshotMutation.mutate();
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
                  
                  <Select value={selectedShift} onValueChange={setSelectedShift}>
                      <SelectTrigger className="w-full sm:w-[200px] border-0 shadow-none focus:ring-0 h-8">
                          <SelectValue placeholder="Seleccionar turno" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Mañana">Mañana</SelectItem>
                          <SelectItem value="Tarde">Tarde</SelectItem>
                      </SelectContent>
                  </Select>

                  <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                  <div className="px-3 text-sm font-medium text-slate-600 whitespace-nowrap flex items-center gap-2">
                      Equipo: <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                        {selectedTeamObj?.team_name || "Sin equipo asignado"}
                      </span>
                  </div>
              </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-end">
              <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => autoProposalMutation.mutate()}
                  disabled={autoProposalMutation.isPending || !selectedDate || !selectedTeam}
                  className="h-9 gap-2 border-blue-600 text-blue-700 hover:bg-blue-50 bg-white"
              >
                  <Sparkles className="w-4 h-4" />
                  {autoProposalMutation.isPending ? "Generando propuesta..." : "Propuesta desde Gantt"}
              </Button>

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
                  disabled={saveSnapshotMutation.isPending}
                  className="h-9 gap-2 border-green-600 text-green-700 hover:bg-green-50 bg-white"
              >
                  <Save className="w-4 h-4" />
                  {saveSnapshotMutation.isPending ? "Guardando..." : "Guardar"}
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
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-4 h-full">

          <Card className="flex flex-col h-full border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-2 pt-3 px-4 border-b shrink-0">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="bg-blue-100 p-1 rounded">
                    <Factory className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  Mapa de Áreas y Máquinas
                  <span className="text-slate-400 font-normal text-xs">
                    {plannedMachines.length} activas
                  </span>
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-0.5">
                    <Button
                      variant={configMode === "manual" ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-7 px-3 text-[11px]",
                        configMode === "manual"
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                      onClick={() => setConfigMode("manual")}
                    >
                      Config. manual
                    </Button>
                    <Button
                      variant={configMode === "suggested" ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-7 px-3 text-[11px]",
                        configMode === "suggested"
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                      onClick={() => setConfigMode("suggested")}
                    >
                      Config. sugerida
                    </Button>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {totalRequiredOperators} operarios asignados
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 min-h-0 bg-slate-50/10">
              <ScrollArea className="h-full w-full">
                <div className="p-3 space-y-3">
                  {areasWithMachines.map(group => {
                    const totalInArea = group.machines.length;
                    const activeInAreaManual = group.machines.filter(m => {
                      const planning = activePlanningsMap.get(String(m.id));
                      return planning && !planning.auto_suggested;
                    }).length;
                    const activeInAreaSuggested = group.machines.filter(m => {
                      const planning = activePlanningsMap.get(String(m.id));
                      return planning && planning.auto_suggested;
                    }).length;
                    const activeInArea =
                      configMode === "manual" ? activeInAreaManual : activeInAreaSuggested;

                    return (
                      <div
                        key={group.areaId}
                        className="border border-slate-200 rounded-lg bg-white/70 overflow-hidden"
                      >
                        <div className="px-3 py-2 flex items-center justify-between bg-slate-50 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center">
                              <Factory className="w-3.5 h-3.5 text-blue-600" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-slate-800">
                                {group.areaName || "Sin Área"}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {totalInArea} máquinas
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {activeInArea}/{totalInArea} activas
                          </span>
                        </div>
                        <div className="p-2">
                          {group.machines.length === 0 ? (
                            <div className="text-[11px] text-slate-400 italic px-1 py-3">
                              No hay máquinas asignadas a esta área.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1.5">
                              {group.machines.map(machine => {
                                const planning = activePlanningsMap.get(String(machine.id));
                                const isActiveManual = !!(planning && !planning.auto_suggested);
                                const isActiveSuggested = !!(planning && planning.auto_suggested);
                                const isActive =
                                  configMode === "manual" ? isActiveManual : isActiveSuggested;

                                const operatorsValue =
                                  planning && (planning.operadores_necesarios !== undefined && planning.operadores_necesarios !== null)
                                    ? planning.operadores_necesarios
                                    : "";
                                const avgVal = avgOperatorsByMachine.get(String(machine.id));
                                const avgDisplay = typeof avgVal === 'number' ? avgVal.toFixed(1) : null;
                                const avgRounded = typeof avgVal === 'number' ? Math.max(1, Math.round(avgVal)) : null;

                                return (
                                  <div
                                    key={machine.id}
                                    className={cn(
                                      "flex items-center gap-2 rounded-md border px-2 py-1.5 bg-white",
                                      isActive
                                        ? "border-emerald-300 bg-emerald-50/60"
                                        : "border-slate-200 opacity-80"
                                    )}
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <Checkbox
                                        id={`machine-${group.areaId}-${machine.id}`}
                                        checked={isActive}
                                        disabled={configMode === "suggested"}
                                        onCheckedChange={checked => {
                                          if (configMode !== "manual") return;
                                          if (checked) {
                                            if (!isActiveManual) {
                                              handleAddMachine(machine);
                                            }
                                          } else if (planning) {
                                            handleDeletePlanning(planning.id);
                                          }
                                        }}
                                      />
                                      <div className="flex flex-col flex-1 min-w-0">
                                        <label
                                          htmlFor={`machine-${group.areaId}-${machine.id}`}
                                          className="text-[11px] font-medium text-slate-800 truncate cursor-pointer"
                                          title={machine.alias}
                                        >
                                          {machine.alias}
                                        </label>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                          {machine.codigo_maquina && (
                                            <span className="font-mono bg-slate-50 border border-slate-200 rounded px-1">
                                              {machine.codigo_maquina}
                                            </span>
                                          )}
                                          {(machine.room_name || machine.ubicacion) && (
                                            <span className="truncate">
                                              {machine.room_name || machine.ubicacion}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {configMode === "manual" ? (
                                        <>
                                          <span className="text-[10px] text-slate-400">Op.</span>
                                          <Input
                                            type="number"
                                            min="0"
                                            className="h-6 w-12 px-1 text-center text-[11px] font-semibold bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                            disabled={!isActiveManual || !planning}
                                            value={operatorsValue}
                                            onChange={e => {
                                              if (planning) {
                                                handleOperatorChange(
                                                  planning.id,
                                                  e.target.value
                                                );
                                              }
                                            }}
                                          />
                                          {avgDisplay && (
                                            <span className="text-[10px] text-slate-500 ml-1">
                                              avg {avgDisplay}
                                            </span>
                                          )}
                                          {isActiveManual && planning && avgRounded && Number(operatorsValue || 0) !== avgRounded && (
                                            <Button
                                              variant="secondary"
                                              size="sm"
                                              className="h-6 text-[10px] px-2 ml-1"
                                              onClick={() => handleOperatorChange(planning.id, String(avgRounded))}
                                            >
                                              Aplicar
                                            </Button>
                                          )}
                                        </>
                                      ) : (
                                        planning &&
                                        planning.auto_suggested && (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
                                            Sugerida
                                          </span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
