import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserCog, Save, UserCheck, User, Users, History, MapPin, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import EmployeeSelect from "../common/EmployeeSelect";

const EMPTY_ARRAY = [];

export default function IdealAssignmentView() {
  const [currentTeam, setCurrentTeam] = useState("");
  const [assignments, setAssignments] = useState({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [currentMachineHistory, setCurrentMachineHistory] = useState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState(null);
  
  const queryClient = useQueryClient();

  // 1. Data Loading
  const { data: machines = EMPTY_ARRAY, isLoading: loadingMachines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
  });

  const { data: employees = EMPTY_ARRAY, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
  });

  const { data: machineAssignments = EMPTY_ARRAY } = useQuery({
    queryKey: ['machineAssignments'],
    queryFn: () => base44.entities.MachineAssignment.list(),
  });

  const { data: teams = EMPTY_ARRAY } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // 2. Initial Team Selection
  useEffect(() => {
    if (teams.length > 0 && !currentTeam) {
        if (currentUser && employees.length > 0) {
            const currentEmp = employees.find(e => e.email === currentUser.email);
            if (currentEmp?.equipo) {
                const team = teams.find(t => t.team_name === currentEmp.equipo);
                if (team) {
                    setCurrentTeam(team.team_key);
                    return;
                }
            }
        }
        if (teams[0]) setCurrentTeam(teams[0].team_key);
    }
  }, [teams, currentUser, employees, currentTeam]);

  // 3. Pre-selection / Heuristics Helpers
  const getExperienceSlot = (emp, machineId) => {
    for (let i = 1; i <= 10; i++) {
        if (emp[`maquina_${i}`] === machineId) return i;
    }
    return 999;
  };

  const getSortValue = (emp, machineId) => {
      // Priority: Experience Slot ASC, Category ASC, Name ASC
      const slot = getExperienceSlot(emp, machineId);
      const category = parseInt(emp.categoria) || 99; // Assume numeric or comparable
      return { slot, category, name: emp.nombre };
  };

  // Helper to filter eligible employees per role/machine (for both pre-selection and dropdown)
  const getEligibleEmployees = (machineId, roleType) => {
    if (!currentTeam) return [];
    
    const teamConfig = teams.find(t => t.team_key === currentTeam);
    const teamName = teamConfig ? teamConfig.team_name : "";

    return employees.filter(emp => {
        // Common Criteria
        if (emp.departamento !== "FABRICACION") return false;
        if (emp.equipo !== teamName) return false;
        // if (emp.disponibilidad !== "Disponible") return false; // Optional: maybe show unavailable in dropdown but greyed out? Prompt says "disponibilidad == Disponible" for eligibility.
        if (emp.disponibilidad !== "Disponible") return false;

        const puesto = (emp.puesto || "").toUpperCase();
        
        if (roleType === "RESPONSABLE") {
            if (!puesto.includes("RESPONSABLE DE LINEA") && !puesto.includes("RESPONSABLE DE LÍNEA")) return false;
            // Strict experience: maquina_1 must be machineId
            if (emp.maquina_1 !== machineId) return false;
            return true;
        }

        if (roleType === "SEGUNDA") {
            if (!puesto.includes("SEGUNDA") && !puesto.includes("2ª")) return false;
            // Strict experience: ANY maquina_X must be machineId
            const hasExp = [1,2,3,4,5,6,7,8,9,10].some(i => emp[`maquina_${i}`] === machineId);
            if (!hasExp) return false;
            return true;
        }

        if (roleType === "OPERARIO") {
            if (!puesto.includes("OPERARI") && !puesto.includes("OPERARIO") && !puesto.includes("OPERARIA")) return false;
            // Strict experience check as per latest requirement
            const hasExp = [1,2,3,4,5,6,7,8,9,10].some(i => emp[`maquina_${i}`] === machineId);
            if (!hasExp) return false;
            return true; 
        }

        return false;
    });
  };

  // 4. Calculate Defaults (Pre-selection)
  const calculateDefaultAssignment = (machineId) => {
    const defaultAssign = {
        responsable_linea: null,
        segunda_linea: null,
        operador_1: null,
        operador_2: null,
        operador_3: null,
        operador_4: null,
        operador_5: null,
        // ... unused slots
    };

    const assignedIds = new Set();

    // Responsable
    const eligibleResp = getEligibleEmployees(machineId, "RESPONSABLE")
        .sort((a, b) => {
             const catA = parseInt(a.categoria) || 99;
             const catB = parseInt(b.categoria) || 99;
             if (catA !== catB) return catA - catB;
             return a.nombre.localeCompare(b.nombre);
        });
    if (eligibleResp.length > 0) {
        defaultAssign.responsable_linea = eligibleResp[0].id;
        assignedIds.add(eligibleResp[0].id);
    }

    // Segunda
    const eligibleSeg = getEligibleEmployees(machineId, "SEGUNDA")
        .filter(e => !assignedIds.has(e.id))
        .sort((a, b) => {
            const sortA = getSortValue(a, machineId);
            const sortB = getSortValue(b, machineId);
            if (sortA.slot !== sortB.slot) return sortA.slot - sortB.slot;
            if (sortA.category !== sortB.category) return sortA.category - sortB.category;
            return sortA.name.localeCompare(sortB.name);
        });
    if (eligibleSeg.length > 0) {
        defaultAssign.segunda_linea = eligibleSeg[0].id;
        assignedIds.add(eligibleSeg[0].id);
    }

    // Operarios (1-5)
    const eligibleOps = getEligibleEmployees(machineId, "OPERARIO")
        .filter(e => !assignedIds.has(e.id))
        .sort((a, b) => {
            const sortA = getSortValue(a, machineId);
            const sortB = getSortValue(b, machineId);
            if (sortA.slot !== sortB.slot) return sortA.slot - sortB.slot;
            if (sortA.category !== sortB.category) return sortA.category - sortB.category;
            return sortA.name.localeCompare(sortB.name);
        });
    
    for (let i = 1; i <= 5; i++) {
        if (eligibleOps.length > 0) {
            const picked = eligibleOps.shift();
            defaultAssign[`operador_${i}`] = picked.id;
        }
    }

    return defaultAssign;
  };

  // 5. Initialize Assignments
  useEffect(() => {
    if (machines.length === 0 || !currentTeam || loadingEmployees) return;

    const loadedAssignments = {};
    machines.forEach(machine => {
      const existing = machineAssignments.find(
        a => a.machine_id === machine.id && a.team_key === currentTeam
      );

      if (existing) {
        loadedAssignments[machine.id] = {
          responsable_linea: existing.responsable_linea?.[0] || null,
          segunda_linea: existing.segunda_linea?.[0] || null,
          operador_1: existing.operador_1 || null,
          operador_2: existing.operador_2 || null,
          operador_3: existing.operador_3 || null,
          operador_4: existing.operador_4 || null,
          operador_5: existing.operador_5 || null,
          operador_6: existing.operador_6 || null,
          operador_7: existing.operador_7 || null,
          operador_8: existing.operador_8 || null,
        };
      } else {
        // Use Heuristic Defaults
        loadedAssignments[machine.id] = calculateDefaultAssignment(machine.id);
      }
    });

    setAssignments(loadedAssignments);
  }, [machines, machineAssignments, currentTeam, employees]); // Added employees dependency

  // 6. Get Candidates for Dropdown (Filter out exclusions)
  const getCandidatesForDropdown = (machineId, roleType, currentMachineData) => {
      const allEligible = getEligibleEmployees(machineId, roleType);
      
      // Filter out candidates already assigned in THIS machine to OTHER roles
      // Note: currentMachineData contains the CURRENT selection state for this machine
      const assignedInMachine = new Set();
      if (currentMachineData.responsable_linea) assignedInMachine.add(currentMachineData.responsable_linea);
      if (currentMachineData.segunda_linea) assignedInMachine.add(currentMachineData.segunda_linea);
      for(let i=1; i<=8; i++) {
          if (currentMachineData[`operador_${i}`]) assignedInMachine.add(currentMachineData[`operador_${i}`]);
      }

      return allEligible.map(emp => {
          // If employee is assigned to current slot? We don't know the current slot here easily without passing it.
          // But the Dropdown needs the list.
          // The Dropdown value is handled by EmployeeSelect.
          // We should mark "disabled" or filter out?
          // If we filter out, the current value might disappear if it was invalid?
          // Better to filter out ONLY if it's assigned to ANOTHER slot.
          // But `assignedInMachine` includes the current slot's value too.
          // We will pass `excludeIds` to EmployeeSelect or filter here.
          // Let's filter out only if `assignedInMachine` has it.
          // Wait, if I'm selecting "Responsable", and "John" is currently "Responsable", he is in `assignedInMachine`.
          // If I filter him out, I can't see him to keep him selected (or he disappears).
          // So I need to exclude `assignedInMachine` MINUS `currentValue`.
          // I'll handle exclusion in the render loop where I have `currentValue`.
          
          let group = "Otros";
          const slot = getExperienceSlot(emp, machineId);
          if (slot <= 10) group = "Con experiencia";
          if (roleType === "OPERARIO" && slot > 10) group = "Sin experiencia específica"; // If loose matching

          return { ...emp, _group: group, _slot: slot };
      }).sort((a, b) => {
           if (a._slot !== b._slot) return a._slot - b._slot;
           return a.nombre.localeCompare(b.nombre);
      });
  };

  // AI Optimization
  const handleOptimize = async () => {
    if (!currentTeam) return;
    setIsOptimizing(true);
    try {
        const response = await base44.functions.invoke('optimize_staff_allocation', {
            team_key: currentTeam,
            department: "FABRICACION",
            current_assignments: assignments
        });
        
        if (response.data && response.data.suggestions) {
            setOptimizationResult(response.data.suggestions);
        } else {
            toast.info("La IA no generó sugerencias nuevas.");
        }
    } catch (error) {
        console.error(error);
        toast.error("Error al optimizar con IA");
    } finally {
        setIsOptimizing(false);
    }
  };

  const applyOptimization = () => {
    if (!optimizationResult) return;
    
    setAssignments(prev => {
        const next = { ...prev };
        Object.entries(optimizationResult).forEach(([machineId, sugg]) => {
            if (next[machineId]) {
                next[machineId] = {
                    ...next[machineId],
                    responsable_linea: sugg.responsable_linea || next[machineId].responsable_linea,
                    segunda_linea: sugg.segunda_linea || next[machineId].segunda_linea,
                    operador_1: sugg.operador_1 || next[machineId].operador_1,
                    operador_2: sugg.operador_2 || next[machineId].operador_2,
                    operador_3: sugg.operador_3 || next[machineId].operador_3,
                    operador_4: sugg.operador_4 || next[machineId].operador_4,
                    operador_5: sugg.operador_5 || next[machineId].operador_5,
                    operador_6: sugg.operador_6 || next[machineId].operador_6,
                    operador_7: sugg.operador_7 || next[machineId].operador_7,
                    operador_8: sugg.operador_8 || next[machineId].operador_8,
                };
            }
        });
        return next;
    });
    setOptimizationResult(null);
    toast.success("Sugerencias aplicadas. Revise y guarde los cambios.");
  };

  // 7. Save Mutation
  const saveMutation = useMutation({
    mutationFn: async ({ machineId, data, machineName }) => {
      // Validation: Check for duplicates
      const ids = [
          data.responsable_linea, 
          data.segunda_linea, 
          data.operador_1, data.operador_2, data.operador_3, data.operador_4, data.operador_5
      ].filter(Boolean); // Remove nulls
      
      const uniqueIds = new Set(ids);
      if (uniqueIds.size !== ids.length) {
          throw new Error("No se puede guardar: El mismo empleado está asignado a múltiples roles en esta máquina.");
      }

      const payload = {
          machine_id: machineId,
          team_key: currentTeam,
          responsable_linea: data.responsable_linea ? [data.responsable_linea] : [],
          segunda_linea: data.segunda_linea ? [data.segunda_linea] : [],
          operador_1: data.operador_1,
          operador_2: data.operador_2,
          operador_3: data.operador_3,
          operador_4: data.operador_4,
          operador_5: data.operador_5,
          operador_6: data.operador_6,
          operador_7: data.operador_7,
          operador_8: data.operador_8,
      };

      const existing = machineAssignments.find(
        a => a.machine_id === machineId && a.team_key === currentTeam
      );

      // Audit Log
      try {
          const changes = existing ? JSON.stringify({ old: existing, new: payload }) : JSON.stringify({ new: payload });
          await base44.entities.MachineAssignmentAudit.create({
              machine_id: machineId,
              machine_name: machineName,
              team_key: currentTeam,
              action: existing ? 'update' : 'create',
              changes: changes,
              modified_by: currentUser?.email || 'unknown',
              timestamp: new Date().toISOString()
          });
      } catch (e) {
          console.warn("Audit log failed", e);
      }

      if (existing) {
        return base44.entities.MachineAssignment.update(existing.id, payload);
      } else {
        return base44.entities.MachineAssignment.create(payload);
      }
    },
    onSuccess: () => {
      toast.success("Asignaciones guardadas exitosamente");
      queryClient.invalidateQueries({ queryKey: ['machineAssignments'] });
    },
    onError: (err) => {
      toast.error(err.message || "Error al guardar asignaciones");
    }
  });

  const handleAssignmentChange = (machineId, field, value) => {
    setAssignments(prev => ({
      ...prev,
      [machineId]: {
        ...prev[machineId],
        [field]: value
      }
    }));
  };

  const handleSaveMachine = (machineId, machineName) => {
    saveMutation.mutate({ machineId, data: assignments[machineId], machineName });
  };

  const handleSaveAll = async () => {
    // Identify modified assignments
    const promises = [];
    
    // Iterate over all machines (assignments state covers all machines initialized)
    Object.keys(assignments).forEach(machineId => {
        const currentData = assignments[machineId];
        const machine = machines.find(m => m.id === machineId);
        const machineName = machine?.nombre || "Máquina";

        // Check against DB data
        const original = machineAssignments.find(a => a.machine_id === machineId && a.team_key === currentTeam);
        
        let isModified = false;
        if (!original) {
            // New assignment, check if it has any data
            const hasData = Object.values(currentData).some(v => v !== null && v !== "" && (Array.isArray(v) ? v.length > 0 : true));
            if (hasData) isModified = true;
        } else {
            // Compare fields
            // Helper to clean array vs value
            const getVal = (v) => Array.isArray(v) ? v[0] : v;
            
            if (getVal(original.responsable_linea) !== currentData.responsable_linea) isModified = true;
            if (getVal(original.segunda_linea) !== currentData.segunda_linea) isModified = true;
            for(let i=1; i<=8; i++) {
                if ((original[`operador_${i}`] || null) !== (currentData[`operador_${i}`] || null)) isModified = true;
            }
        }

        if (isModified) {
            promises.push(saveMutation.mutateAsync({ machineId, data: currentData, machineName }));
        }
    });

    if (promises.length === 0) {
        toast.info("No hay cambios pendientes para guardar.");
        return;
    }

    try {
        await Promise.all(promises);
        toast.success(`Se han guardado ${promises.length} configuraciones de máquinas.`);
    } catch (error) {
        console.error(error);
        toast.error("Hubo errores al guardar algunas asignaciones.");
    }
  };

  const fetchHistory = async (machineId) => {
    if (!machineId) return;
    try {
        const history = await base44.entities.MachineAssignmentAudit.filter({ 
            machine_id: machineId,
            team_key: currentTeam
        }, '-timestamp', 20);
        setCurrentMachineHistory(history);
        setHistoryOpen(true);
    } catch (error) {
        console.error(error);
        toast.error("Error al cargar historial");
    }
  };

  if (loadingMachines || loadingEmployees) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Loader2 className="w-8 h-8 mb-4 animate-spin text-blue-500" />
            <p>Cargando configuración de equipos...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-xl font-bold text-slate-900">Configuración de Equipos Ideales</h2>
            <p className="text-slate-500 text-sm">Define la estructura base para la planificación.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border">
            <Label className="whitespace-nowrap font-medium px-2">Equipo de Trabajo:</Label>
            <Select value={currentTeam} onValueChange={setCurrentTeam}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Seleccionar equipo" />
                </SelectTrigger>
                <SelectContent>
                    {teams.map(t => (
                        <SelectItem key={t.team_key} value={t.team_key}>{t.team_name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6 bg-slate-50 p-3 rounded-lg border">
      <div className="flex items-center gap-2">
          <Button 
              onClick={handleOptimize} 
              disabled={isOptimizing}
              variant="outline"
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
          >
              {isOptimizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {isOptimizing ? "Optimizando..." : "Sugerir Distribución IA"}
          </Button>
      </div>

      <Button 
          onClick={handleSaveAll} 
          className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
      >
          <Save className="w-4 h-4 mr-2" />
          Guardar Todos los Cambios
      </Button>
      </div>

      <div className="h-[calc(100vh-280px)] overflow-y-auto pr-2 pb-10">
        <div className="grid grid-cols-1 gap-6">
            <div className="grid gap-6">
                {machines.map(machine => {
                    const assignment = assignments[machine.id] || {};
                    
                    // Helper to filter candidates (exclude those assigned to other slots in THIS machine)
                    const getEmployeesForRole = (role) => {
                        const candidates = getCandidatesForDropdown(machine.id, role, assignment);
                        return candidates.filter(c => {
                            // Check if used in other roles
                            const isResponsable = assignment.responsable_linea === c.id;
                            const isSegunda = assignment.segunda_linea === c.id;
                            // Check if assigned to any operator slot (1-8)
                            const isOperator = [1,2,3,4,5,6,7,8].some(i => assignment[`operador_${i}`] === c.id);

                            if (role === "RESPONSABLE") {
                                return !isSegunda && !isOperator;
                            }
                            if (role === "SEGUNDA") {
                                return !isResponsable && !isOperator;
                            }
                            if (role === "OPERARIO") {
                                // For operators, we exclude Resp and Seg. 
                                // We do NOT exclude other operators here because this same list is used for all operator dropdowns.
                                // If we excluded 'John' (assigned to op_1), then the dropdown for op_1 wouldn't show 'John'.
                                return !isResponsable && !isSegunda;
                            }
                            return true;
                        });
                    };

                    const responsables = getEmployeesForRole("RESPONSABLE");
                    const segundas = getEmployeesForRole("SEGUNDA");
                    const operarios = getEmployeesForRole("OPERARIO");
                    
                    return (
                        <Card key={machine.id} className="overflow-hidden border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="bg-slate-50 border-b pb-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-xl">{machine.nombre}</CardTitle>
                                        <div className="flex gap-4 text-sm text-slate-500 mt-1">
                                            <span className="font-mono bg-slate-200 px-1 rounded">{machine.codigo}</span>
                                            {machine.ubicacion && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {machine.ubicacion}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fetchHistory(machine.id)}
                                        >
                                            <History className="w-4 h-4 mr-2" />
                                            Historial
                                        </Button>
                                        <Button 
                                            onClick={() => handleSaveMachine(machine.id, machine.nombre)} 
                                            size="sm" 
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            <Save className="w-4 h-4 mr-2" />
                                            Guardar
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Responsable */}
                                <div className="space-y-3">
                                    <Label className="flex items-center gap-2 text-blue-700">
                                        <UserCheck className="w-4 h-4" /> Responsable de Línea
                                    </Label>
                                    <EmployeeSelect
                                        employees={responsables}
                                        value={assignment.responsable_linea || ""}
                                        onValueChange={(val) => handleAssignmentChange(machine.id, 'responsable_linea', val)}
                                        placeholder="Seleccionar responsable"
                                        showDepartment={false}
                                    />
                                </div>

                                {/* Segunda */}
                                <div className="space-y-3">
                                    <Label className="flex items-center gap-2 text-indigo-700">
                                        <User className="w-4 h-4" /> Segunda de Línea
                                    </Label>
                                    <EmployeeSelect
                                        employees={segundas}
                                        value={assignment.segunda_linea || ""}
                                        onValueChange={(val) => handleAssignmentChange(machine.id, 'segunda_linea', val)}
                                        placeholder="Seleccionar segunda"
                                        showDepartment={false}
                                    />
                                </div>

                                {/* Operarios */}
                                <div className="space-y-3 lg:col-span-1 md:col-span-2">
                                    <Label className="flex items-center gap-2 text-slate-700">
                                        <Users className="w-4 h-4" /> Operarios de Línea
                                    </Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                            <div key={num} className="flex gap-2 items-center">
                                                <Badge variant="outline" className="w-6 h-6 flex items-center justify-center shrink-0 bg-slate-100 text-[10px]">
                                                    {num}
                                                </Badge>
                                                <div className="flex-1">
                                                    <EmployeeSelect
                                                        employees={operarios}
                                                        value={assignment[`operador_${num}`] || ""}
                                                        onValueChange={(val) => handleAssignmentChange(machine.id, `operador_${num}`, val)}
                                                        placeholder={`Operario ${num}`}
                                                        showDepartment={false}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
      </div>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Historial de Cambios</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[300px] w-full pr-4">
                {currentMachineHistory.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">No hay historial disponible</p>
                ) : (
                    <div className="space-y-4">
                        {currentMachineHistory.map((entry, idx) => (
                            <div key={idx} className="border-l-2 border-slate-200 pl-3 pb-2">
                                <p className="text-sm font-medium">{entry.action === 'create' ? 'Creado' : 'Actualizado'}</p>
                                <p className="text-xs text-slate-500">
                                    {format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm", { locale: es })}
                                </p>
                                <p className="text-xs text-slate-400">por {entry.modified_by}</p>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Optimization Review Dialog */}
      {optimizationResult && (
        <Dialog open={!!optimizationResult} onOpenChange={() => setOptimizationResult(null)}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        Sugerencias de Optimización IA
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                        {Object.entries(optimizationResult).map(([machineId, sugg]) => {
                            const machineName = machines.find(m => m.id === machineId)?.nombre || machineId;
                            return (
                                <div key={machineId} className="bg-slate-50 p-3 rounded-lg border">
                                    <h4 className="font-semibold text-sm mb-2">{machineName}</h4>
                                    <div className="text-xs space-y-1">
                                        {sugg.reasoning && <p className="italic text-slate-500 mb-2">"{sugg.reasoning}"</p>}
                                        <div className="grid grid-cols-2 gap-2">
                                            {sugg.responsable_linea && <div>Resp: <span className="font-medium">{employees.find(e => e.id === sugg.responsable_linea)?.nombre || sugg.responsable_linea}</span></div>}
                                            {sugg.segunda_linea && <div>2ª: <span className="font-medium">{employees.find(e => e.id === sugg.segunda_linea)?.nombre || sugg.segunda_linea}</span></div>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOptimizationResult(null)}>Cancelar</Button>
                    <Button onClick={applyOptimization} className="bg-purple-600 hover:bg-purple-700">Aplicar Sugerencias</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}