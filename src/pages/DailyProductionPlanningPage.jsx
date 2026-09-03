import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getMachineAlias } from "@/utils/machineAlias";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Calendar as CalendarIcon, Copy, Repeat, Filter, Sparkles, Trash2 } from "lucide-react";
import { format, subDays } from "date-fns";
import ThemeToggle from "../components/common/ThemeToggle";
import ProductionShiftPanel from "@/components/dailyplanning/ProductionShiftPanel";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const SHIFTS = ["Mañana", "Tarde"];

// Normaliza fechas de WorkOrder (formatos diversos) a yyyy-MM-dd
function normalizeOrderDate(val) {
  if (!val || typeof val !== "string") return null;
  if (/^\d{4}-/.test(val)) return val.split("T")[0];
  if (val.includes("/")) {
    const parts = val.split(" ");
    const datePart = parts[0];
    const timePart = parts[1];
    const dmy = datePart.split("/");
    if (dmy.length === 3) {
      const [d, m, y] = dmy;
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        const dateStr = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        return timePart ? `${dateStr}T${timePart}:00` : dateStr;
      }
    }
  }
  return val;
}

export default function DailyProductionPlanningPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- State ---
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedShift, setSelectedShift] = useState("Ambos");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importDate, setImportDate] = useState("");
  const [importTeam, setImportTeam] = useState("");

  React.useEffect(() => {
    if (isImportDialogOpen) {
      if (!importDate) setImportDate(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'));
      if (!importTeam) setImportTeam(selectedTeam);
    }
  }, [isImportDialogOpen, selectedDate, selectedTeam]);

  // --- Queries ---
  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    staleTime: Infinity, gcTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false, refetchOnReconnect: false,
  });

  const { data: machines = [] } = useQuery({
    queryKey: ['machines', 'strict_dedup'],
    queryFn: async () => {
      const rawMachines = await base44.entities.MachineMasterDatabase.list(undefined, 2000);
      const uniqueMap = new Map();
      rawMachines.forEach(m => {
        if (!m.id) return;
        const id = String(m.id);
        if (!uniqueMap.has(id)) uniqueMap.set(id, { ...m });
      });
      return Array.from(uniqueMap.values()).sort((a, b) => (a.orden_visualizacion || 999) - (b.orden_visualizacion || 999));
    },
    staleTime: Infinity, gcTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false, refetchOnReconnect: false,
    retry: 3, retryDelay: (i) => Math.min(1000 * 2 ** i, 30000),
  });

  const { data: plannings = [] } = useQuery({
    queryKey: ['machinePlannings', selectedDate, selectedTeam],
    queryFn: () => base44.entities.MachinePlanning.filter({ fecha_planificacion: selectedDate, team_key: selectedTeam }),
    enabled: !!selectedDate && !!selectedTeam && machines.length > 0,
    staleTime: 5 * 60 * 1000, retry: 3, retryDelay: (i) => Math.min(1000 * 2 ** i, 30000),
  });

  const { data: dailyPlansHistory = [] } = useQuery({
    queryKey: ['dailyMachinePlansHistory'],
    queryFn: async () => {
      if (!base44.entities.DailyMachinePlanning) return [];
      const data = await base44.entities.DailyMachinePlanning.list('', 2000);
      return Array.isArray(data) ? data : [];
    },
    staleTime: 5 * 60 * 1000, retry: 3, retryDelay: (i) => Math.min(1000 * 2 ** i, 30000),
  });

  const { data: shiftSchedule } = useQuery({
    queryKey: ['teamWeekSchedules', selectedDate],
    queryFn: async () => base44.entities.TeamWeekSchedule.list(undefined, 2000),
    enabled: teams.length > 0,
    staleTime: Infinity, gcTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false, refetchOnReconnect: false,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre', 1000),
    enabled: machines.length > 0,
    staleTime: 60 * 60 * 1000, refetchOnWindowFocus: false,
    retry: 3, retryDelay: (i) => Math.min(1000 * 2 ** i, 30000),
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders', selectedDate],
    queryFn: () => base44.entities.WorkOrder.list(undefined, 2000),
    enabled: machines.length > 0,
    staleTime: 2 * 60 * 1000, refetchOnWindowFocus: false,
    retry: 3, retryDelay: (i) => Math.min(1000 * 2 ** i, 30000),
  });

  const { data: manufacturingConfigRecord } = useQuery({
    queryKey: ["appConfig", "manufacturing"],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ config_key: "manufacturing_config" });
      return configs[0] || null;
    },
    enabled: machines.length > 0,
    staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false,
  });

  // --- Auto-select team from shift schedule ---
  React.useEffect(() => {
    if (!shiftSchedule || !selectedDate || !selectedTeam) {
      if (!selectedTeam && teams.length > 0) setSelectedTeam(teams[0].team_key);
      return;
    }
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekStart = new Date(dateObj);
    weekStart.setDate(dateObj.getDate() - ((dateObj.getDay() + 6) % 7));
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const schedule = shiftSchedule.find(s => s.fecha_inicio_semana === weekStartStr);
    if (schedule?.team_key && schedule.team_key !== selectedTeam) {
      setSelectedTeam(schedule.team_key);
    }
  }, [shiftSchedule, selectedDate, teams, selectedTeam]);

  // --- Derived ---
  const selectedTeamObj = useMemo(
    () => (teams || []).find(t => t.team_key === selectedTeam) || null,
    [teams, selectedTeam]
  );

  const manufacturingConfig = useMemo(() => {
    if (!manufacturingConfigRecord) return { areas: [], machine_assignments: {} };
    try {
      const raw = manufacturingConfigRecord.value || manufacturingConfigRecord.description || null;
      if (!raw) return { areas: [], machine_assignments: {} };
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return {
        areas: Array.isArray(parsed.areas) ? parsed.areas : [],
        machine_assignments: parsed.machine_assignments || {}
      };
    } catch { return { areas: [], machine_assignments: {} }; }
  }, [manufacturingConfigRecord]);

  const areasWithMachines = useMemo(() => {
    const allMachines = machines || [];
    const areasConfig = manufacturingConfig?.areas || [];
    const machineAssignments = manufacturingConfig?.machine_assignments || {};
    const result = [];

    areasConfig.forEach(area => {
      const areaIdStr = String(area.id);
      const machinesInArea = allMachines.filter(m => {
        const asgn = machineAssignments[m.id];
        return asgn && asgn.area_id && String(asgn.area_id) === areaIdStr;
      });
      result.push({ areaId: area.id, areaName: area.name, machines: machinesInArea });
    });

    return result;
  }, [machines, manufacturingConfig]);

  // --- Gantt suggestions: máquinas con órdenes activas para la fecha ---
  const ganttSuggestions = useMemo(() => {
    const suggestions = new Map();
    if (!workOrders || workOrders.length === 0) return suggestions;

    const selectedDateObj = new Date(selectedDate);
    selectedDateObj.setHours(12, 0, 0, 0);

    workOrders.forEach(order => {
      let extra = {};
      if (order.notes && typeof order.notes === "string") {
        try { const parsed = JSON.parse(order.notes); if (parsed && typeof parsed === "object") extra = parsed; } catch { 0; }
      }
      const merged = { ...order, ...extra };

      const effectiveStart = normalizeOrderDate(
        extra["Fecha Inicio Modificada"] || extra.modified_start_date || extra["Fecha Inicio Limite"] || extra.start_date || order.start_date || ""
      );
      const effectiveEnd = normalizeOrderDate(
        extra["Fecha Fin"] || extra["end_date_simple"] || extra.planned_end_date || order.planned_end_date || ""
      );
      if (!effectiveStart) return;

      const start = new Date(effectiveStart);
      if (Number.isNaN(start.getTime())) return;
      const end = effectiveEnd ? new Date(effectiveEnd) : start;
      if (Number.isNaN(end.getTime())) return;

      const startDay = new Date(start); startDay.setHours(0, 0, 0, 0);
      const endDay = new Date(end); endDay.setHours(23, 59, 59, 999);

      if (selectedDateObj >= startDay && selectedDateObj <= endDay && order.machine_id) {
        const key = String(order.machine_id);
        const operators = Number(merged.operadores_requeridos) || 1;
        const productName = extra.product_name || extra["Nombre"] || order.product_name || "";
        if (!suggestions.has(key)) {
          suggestions.set(key, { operators, productName });
        }
      }
    });

    return suggestions;
  }, [workOrders, selectedDate]);

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MachinePlanning.create(data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries(['machinePlannings', selectedDate, selectedTeam]);
      const previous = queryClient.getQueryData(['machinePlannings', selectedDate, selectedTeam]);
      const tempId = 'temp-' + Date.now();
      queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], (old = []) => [...old, { ...newData, id: tempId }]);
      return { previous, tempId };
    },
    onError: (err, newData, ctx) => {
      queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], ctx.previous);
      toast({ title: "Error al crear", description: err.message, variant: "destructive" });
    },
    onSuccess: (newPlanning, variables, ctx) => {
      queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], (old = []) =>
        old.map(p => p.id === ctx.tempId ? newPlanning : p)
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MachinePlanning.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries(['machinePlannings', selectedDate, selectedTeam]);
      const previous = queryClient.getQueryData(['machinePlannings', selectedDate, selectedTeam]);
      queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], (old = []) => old.filter(p => p.id !== id));
      return { previous };
    },
    onError: (err, id, ctx) => {
      queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], ctx.previous);
      toast({ title: "Error", description: "No se pudo eliminar la máquina", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MachinePlanning.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries(['machinePlannings', selectedDate, selectedTeam]);
      const previous = queryClient.getQueryData(['machinePlannings', selectedDate, selectedTeam]);
      queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], (old = []) =>
        old.map(p => p.id === id ? { ...p, ...data } : p)
      );
      return { previous };
    },
    onError: (err, vars, ctx) => {
      queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], ctx.previous);
      toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const promises = plannings.map(p => base44.entities.MachinePlanning.delete(p.id));
      await Promise.all(promises);
    },
    onMutate: async () => {
      await queryClient.cancelQueries(['machinePlannings', selectedDate, selectedTeam]);
      const previous = queryClient.getQueryData(['machinePlannings', selectedDate, selectedTeam]);
      queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], []);
      return { previous };
    },
    onError: (err, _, ctx) => {
      queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], ctx.previous);
      toast({ title: "Error", description: "No se pudo limpiar la planificación", variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries(['machinePlannings', selectedDate, selectedTeam]),
  });

  const importMutation = useMutation({
    mutationFn: async ({ sourceDate, sourceTeam }) => {
      const sourcePlannings = await base44.entities.MachinePlanning.filter({ fecha_planificacion: sourceDate, team_key: sourceTeam });
      if (!sourcePlannings || sourcePlannings.length === 0) throw new Error("No hay planificación en la fecha/equipo seleccionados.");

      const existingIds = new Set(plannings.map(p => String(p.machine_id) + "|" + (p.turno || "")));
      const promises = [];

      for (const p of sourcePlannings) {
        const key = String(p.machine_id) + "|" + (p.turno || "");
        if (existingIds.has(key)) continue;
        const currentMachine = machines.find(m => String(m.id) === String(p.machine_id));
        const freshAlias = currentMachine ? getMachineAlias(currentMachine) : p.machine_nombre;
        promises.push(() => base44.entities.MachinePlanning.create({
          machine_id: p.machine_id,
          machine_nombre: freshAlias,
          machine_codigo: p.machine_codigo,
          fecha_planificacion: selectedDate,
          team_key: selectedTeam,
          operadores_necesarios: p.operadores_necesarios,
          activa_planning: true,
          turno: p.turno || "Mañana",
          auto_suggested: false,
          process_id: p.process_id,
        }));
      }

      if (promises.length === 0) throw new Error("Todas las máquinas de origen ya están en la planificación actual.");
      for (let i = 0; i < promises.length; i++) {
        await promises[i]();
        await new Promise(r => setTimeout(r, 50));
      }
      return promises.length;
    },
    onMutate: async () => {
      await queryClient.cancelQueries(['machinePlannings', selectedDate, selectedTeam]);
      setIsImportDialogOpen(false);
    },
    onSuccess: (count) => {
      toast({ title: "Importación Exitosa", description: `Se han importado ${count} máquinas.`, className: "bg-green-600 text-white", duration: 3000 });
      queryClient.invalidateQueries(['machinePlannings', selectedDate, selectedTeam]);
    },
    onError: (err) => toast({ title: "Error al importar", description: err.message, variant: "destructive", duration: 5000 }),
  });

  const autoProposalMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !selectedTeam) throw new Error("Debe seleccionar un día y equipo.");
      const targetShifts = selectedShift === "Ambos" ? SHIFTS : [selectedShift];
      let created = 0;

      for (const shift of targetShifts) {
        const existingForShift = new Set(
          (plannings || []).filter(p => p.turno === shift).map(p => String(p.machine_id))
        );
        for (const [machineIdStr, suggestion] of ganttSuggestions) {
          if (existingForShift.has(machineIdStr)) continue;
          const machine = machines.find(m => String(m.id) === machineIdStr);
          if (!machine) continue;
          await base44.entities.MachinePlanning.create({
            machine_id: machine.id,
            machine_nombre: getMachineAlias(machine),
            machine_codigo: machine.codigo_maquina,
            fecha_planificacion: selectedDate,
            team_key: selectedTeam,
            operadores_necesarios: suggestion.operators,
            activa_planning: true,
            turno: shift,
            auto_suggested: false,
            process_id: null,
            product_name: suggestion.productName || null,
          });
          await new Promise(r => setTimeout(r, 50));
          created++;
        }
      }
      return created;
    },
    onMutate: async () => { await queryClient.cancelQueries(["machinePlannings", selectedDate, selectedTeam]); },
    onSuccess: (count) => {
      toast({ title: "Propuesta aplicada", description: `Se han activado ${count} máquinas desde el Gantt.`, className: "bg-blue-600 text-white", duration: 3000 });
      queryClient.invalidateQueries(["machinePlannings", selectedDate, selectedTeam]);
    },
    onError: (err) => toast({ title: "Error al proponer", description: err.message, variant: "destructive", duration: 5000 }),
  });

  // --- Handlers ---
  const handleAddMachine = useCallback((machine, shift, suggestedOps = 1) => {
    const machineIdStr = String(machine.id);
    const existing = (plannings || []).find(p => String(p.machine_id) === machineIdStr && p.turno === shift);
    if (existing) return;
    createMutation.mutate({
      machine_id: machine.id,
      machine_nombre: getMachineAlias(machine),
      machine_codigo: machine.codigo_maquina,
      fecha_planificacion: selectedDate,
      team_key: selectedTeam,
      operadores_necesarios: suggestedOps || 1,
      activa_planning: true,
      turno: shift,
      auto_suggested: false,
      process_id: null,
    });
  }, [plannings, selectedDate, selectedTeam, createMutation]);

  const handleDeletePlanning = useCallback((planningId) => {
    deleteMutation.mutate(planningId);
  }, [deleteMutation]);

  const handleOperatorChange = useCallback((planningId, val) => {
    const num = val === "" ? 0 : parseInt(val);
    if (!isNaN(num) && num >= 0) {
      updateMutation.mutate({ id: planningId, data: { operadores_necesarios: num } });
    }
  }, [updateMutation]);

  const handleClearAll = async () => {
    if (confirm("¿Estás seguro de que deseas borrar TODA la planificación para este día y equipo?")) {
      try {
        const fresh = await base44.entities.MachinePlanning.filter({ fecha_planificacion: selectedDate, team_key: selectedTeam });
        if (fresh?.length > 0) {
          for (const p of fresh) {
            await base44.entities.MachinePlanning.delete(p.id);
            await new Promise(r => setTimeout(r, 30));
          }
        }
        toast({ title: "Limpieza Completada", description: "Se han eliminado todos los registros.", className: "bg-green-600 text-white" });
      } catch (error) {
        toast({ title: "Error", description: "No se pudo completar la limpieza.", variant: "destructive" });
      } finally {
        queryClient.invalidateQueries(['machinePlannings', selectedDate, selectedTeam]);
      }
    }
  };

  const handleCopyPreviousDay = () => {
    const prevDate = format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd');
    importMutation.mutate({ sourceDate: prevDate, sourceTeam: selectedTeam });
  };

  const handleImportCustom = () => {
    if (!importDate || !importTeam) return;
    importMutation.mutate({ sourceDate: importDate, sourceTeam: importTeam });
  };

  // --- Shifts to render ---
  const renderShifts = selectedShift === "Ambos" ? SHIFTS : [selectedShift];
  const isParallel = renderShifts.length > 1;

  return (
    <div className="h-full flex flex-col p-4 gap-3 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="flex-none flex flex-col md:flex-row md:items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Planificación Diaria de Producción
            </h1>
            <p className="text-[10px] text-slate-500 hidden sm:block">
              Configure máquinas y operadores por zona y turno. Los cambios se guardan automáticamente.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex-none flex flex-col xl:flex-row gap-2 justify-between items-start xl:items-center">
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
              <SelectTrigger className="w-full sm:w-[180px] border-0 shadow-none focus:ring-0 h-8">
                <SelectValue placeholder="Turno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mañana">☀️ Mañana</SelectItem>
                <SelectItem value="Tarde">🌙 Tarde</SelectItem>
                <SelectItem value="Ambos">☀️🌙 Ambos (paralelo)</SelectItem>
              </SelectContent>
            </Select>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="px-3 text-sm font-medium text-slate-600 whitespace-nowrap flex items-center gap-2">
              Equipo: <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                {selectedTeamObj?.team_name || "Sin equipo"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => autoProposalMutation.mutate()}
            disabled={autoProposalMutation.isPending || !selectedDate || !selectedTeam || ganttSuggestions.size === 0}
            className="h-9 gap-2 border-amber-500 text-amber-700 hover:bg-amber-50 bg-white"
            title="Activa las máquinas sugeridas por el Gantt con sus operadores"
          >
            <Sparkles className="w-4 h-4" />
            {autoProposalMutation.isPending ? "Aplicando..." : "Propuesta Gantt"}
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
                <DialogDescription>Copie la configuración de máquinas de otro día o equipo.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Button variant="secondary" className="w-full justify-start gap-3" onClick={handleCopyPreviousDay} disabled={importMutation.isPending}>
                  <Repeat className="w-4 h-4" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Repetir Día Anterior</span>
                    <span className="text-xs text-slate-500">Mismo equipo, fecha ayer</span>
                  </div>
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">O personalizar</span></div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Fecha Origen</label>
                  <Input type="date" value={importDate} onChange={(e) => setImportDate(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Equipo Origen</label>
                  <Select value={importTeam} onValueChange={setImportTeam}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar equipo..." /></SelectTrigger>
                    <SelectContent>
                      {teams.map(t => <SelectItem key={t.team_key} value={t.team_key}>{t.team_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleImportCustom} disabled={!importDate || !importTeam || importMutation.isPending}>
                  {importMutation.isPending ? "Importando..." : "Importar Selección"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearAll}
            disabled={plannings.length === 0 || clearMutation.isPending}
            className="h-9"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {clearMutation.isPending ? "Limpiando..." : "Limpiar"}
          </Button>
        </div>
      </div>

      {/* Gantt info bar */}
      {ganttSuggestions.size > 0 && (
        <div className="flex-none flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-700">
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            <strong>{ganttSuggestions.size}</strong> máquina(s) con órdenes en el Gantt para {selectedDate}.
            Las máquinas sugeridas se muestran con borde ámbar. Pulsa "Propuesta Gantt" para activarlas automáticamente.
          </span>
        </div>
      )}

      {/* Shift panels */}
      <div className={isParallel ? "flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3" : "flex-1 min-h-0"}>
        {renderShifts.map(shift => (
          <Card key={shift} className="flex flex-col h-full border-slate-200 shadow-sm overflow-hidden min-h-0">
            <CardContent className="flex-1 min-h-0 p-3">
              <ProductionShiftPanel
                shift={shift}
                selectedDate={selectedDate}
                selectedTeam={selectedTeam}
                machines={machines}
                areasWithMachines={areasWithMachines}
                ganttSuggestions={ganttSuggestions}
                plannings={plannings}
                employees={employees}
                teams={teams}
                dailyPlansHistory={dailyPlansHistory}
                onAddMachine={handleAddMachine}
                onDeletePlanning={handleDeletePlanning}
                onOperatorChange={handleOperatorChange}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}