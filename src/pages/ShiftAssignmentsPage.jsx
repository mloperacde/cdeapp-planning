import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppData } from "../components/data/DataProvider";
import { useShiftConfig } from "@/hooks/useShiftConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Calendar as CalendarIcon, 
  Users, 
  Save,
  History,
  Search,
  Factory,
  Sparkles,
  Edit3,
  Download,
  Monitor
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getMachineAlias } from "@/utils/machineAlias";
import { createPageUrl } from "@/utils";
import * as XLSX from "xlsx";

import { isProductionOperator, normalize } from "@/utils/employeeFilters";

// Helper: Get Employee Name Robustly
const getEmployeeName = (emp) => {
    if (!emp) return "";
    return emp.nombre || emp.name || emp.Name || emp.full_name || emp.fullName || emp.display_name || "Sin Nombre";
};

// --- Subcomponents ---

// Subcomponent for a Drop Slot
function Slot({ id, label, assignedId, employees, isRequired }) {
    const assignedEmployee = assignedId ? employees.find(e => String(e.id) === String(assignedId)) : null;

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span className={`font-medium ${isRequired ? 'text-slate-900 dark:text-slate-200' : 'text-slate-500'}`}>
                    {label} {isRequired && '*'}
                </span>
            </div>
            <Droppable droppableId={id}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[50px] rounded-md border-2 border-dashed transition-all ${
                            snapshot.isDraggingOver 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : assignedEmployee 
                                ? 'border-solid border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800' 
                                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                        } p-1`}
                    >
                        {assignedEmployee ? (
                            <Draggable draggableId={String(assignedEmployee.id)} index={0}>
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="bg-white dark:bg-slate-700 p-2 rounded shadow-sm border border-slate-200 dark:border-slate-600 flex justify-between items-center h-full"
                                        style={provided.draggableProps.style}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                                                {getEmployeeName(assignedEmployee).charAt(0)}
                                            </div>
                                            <span className="text-sm truncate font-medium">{getEmployeeName(assignedEmployee)}</span>
                                        </div>
                                    </div>
                                )}
                            </Draggable>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-slate-400 pointer-events-none">
                                Arrastrar aquí
                            </div>
                        )}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}

// --- Main Component ---

export default function ShiftAssignmentsPage() {
  const { shifts } = useShiftConfig();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState("Mañana");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [assignments, setAssignments] = useState({});
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editingPuesto, setEditingPuesto] = useState("");
  
  const queryClient = useQueryClient();
  const { employees = [], teams = [], machines = [] } = useAppData();

  const updateEmployeePosition = useMutation({
    mutationFn: async ({ id, puesto }) => {
      return base44.entities.EmployeeMasterDatabase.update(id, { 
        puesto: puesto ? puesto.toUpperCase() : null 
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success("Puesto actualizado correctamente");
      setEditingEmployeeId(null);
      setEditingPuesto("");
    },
    onError: (err) => {
      toast.error(err?.message || "Error al actualizar puesto");
    }
  });

  // New: Fetch Daily Machine Planning (plan confirmado por día/turno/equipo)
  const { data: dailyMachinePlannings = [] } = useQuery({
    queryKey: ['dailyMachinePlannings', format(selectedDate, 'yyyy-MM-dd'), selectedShift, selectedTeam],
    queryFn: () => {
       const dateStr = format(selectedDate, 'yyyy-MM-dd');
       const filters = { 
         date: dateStr,
         shift: selectedShift
       };
       if (selectedTeam !== "all") {
           const teamObj = teams.find(t => String(t.id) === String(selectedTeam));
           if (teamObj) filters.team_key = teamObj.team_key;
       }
       return base44.entities.DailyMachinePlanning.filter(filters);
    },
    enabled: !!selectedDate && !!selectedShift
  });

  // New: Fetch Team Schedules (for Shift Auto-detection)
  const { data: teamSchedules = [] } = useQuery({
      queryKey: ['teamSchedules'],
      queryFn: () => base44.entities.TeamWeekSchedule.list(undefined, 1000)
  });

  // New: Fetch Employee Machine Skills (Ideal Assignment Source)
  const { data: employeeSkills = [] } = useQuery({
      queryKey: ['employeeMachineSkills'],
      queryFn: () => base44.entities.EmployeeMachineSkill.list(undefined, 2000)
  });

  // Sync Team based on Date + Shift (same philosophy as DailyProductionPlanningPage)
  useEffect(() => {
      if (!selectedShift || !selectedDate || teamSchedules.length === 0) return;

      const dateObj = new Date(selectedDate);
      const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');

      const normalize = (str) => str ? str.toString().trim().toLowerCase() : "";
      const targetShift = normalize(selectedShift);

      const schedule = teamSchedules.find(s => {
          if (s.fecha_inicio_semana !== weekStartStr) return false;
          const turno = normalize(s.turno);
          if (targetShift.includes("mañana")) {
              return turno.includes("mañana") || turno.includes("t1");
          }
          if (targetShift.includes("tarde")) {
              return turno.includes("tarde") || turno.includes("t2");
          }
          if (targetShift.includes("noche")) {
              return turno.includes("noche") || turno.includes("t3");
          }
          return turno === targetShift;
      });

      if (schedule && schedule.team_key) {
          const team = teams.find(t => t.team_key === schedule.team_key);
          if (team && String(team.id) !== String(selectedTeam)) {
              setSelectedTeam(String(team.id));
          }
      }
  }, [selectedShift, selectedDate, teamSchedules, teams, selectedTeam]);

  // Fetch Assignments
  const { data: dailyStaffing = [] } = useQuery({
    queryKey: ['dailyStaffing', format(selectedDate, 'yyyy-MM-dd'), selectedShift, selectedTeam],
    queryFn: () => {
      const filters = {
        date: format(selectedDate, 'yyyy-MM-dd'),
        shift: selectedShift
      };
      if (selectedTeam !== "all") {
        const teamObj = teams.find(t => String(t.id) === String(selectedTeam));
        filters.team_key = teamObj ? teamObj.team_key : selectedTeam;
      }
      return base44.entities.DailyMachineStaffing.filter(filters);
    },
  });

  // Initialize Assignments
  useEffect(() => {
      const loaded = {};
      // Default structure for all machines
      machines.forEach(m => {
          loaded[m.id] = {
              responsable_linea: null,
              segunda_linea: null,
              operador_1: null,
              operador_2: null,
              // Add more slots if needed
          };
      });

      // Fill with loaded data
      dailyStaffing.forEach(ds => {
          if (loaded[ds.machine_id]) {
            loaded[ds.machine_id] = {
                ...loaded[ds.machine_id],
                responsable_linea: ds.responsable_linea,
                segunda_linea: ds.segunda_linea,
                operador_1: ds.operador_1,
                operador_2: ds.operador_2,
            };
          }
      });
      setAssignments(loaded);
  }, [dailyStaffing, machines]);

  // Handlers
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    // Handle Drop Logic
    const destParts = destination.droppableId.split('-');
    if (destParts[0] === 'machine') {
        const machineId = destParts[1];
        const role = destParts.slice(2).join('_');
        
        // Prevent overwrite if occupied? Or allow replace?
        // Let's allow replace for now, maybe warn.
        
        setAssignments(prev => ({
            ...prev,
            [machineId]: {
                ...prev[machineId],
                [role]: draggableId
            }
        }));

        // If moved FROM another machine slot, clear it
        if (source.droppableId.startsWith('machine-')) {
             const srcParts = source.droppableId.split('-');
             const srcMachineId = srcParts[1];
             const srcRole = srcParts.slice(2).join('_');
             setAssignments(prev => ({
                ...prev,
                [srcMachineId]: {
                    ...prev[srcMachineId],
                    [srcRole]: null
                }
             }));
        }
    } else if (destination.droppableId === 'unassigned-pool') {
        // Unassigning
        if (source.droppableId.startsWith('machine-')) {
             const srcParts = source.droppableId.split('-');
             const srcMachineId = srcParts[1];
             const srcRole = srcParts.slice(2).join('_');
             setAssignments(prev => ({
                ...prev,
                [srcMachineId]: {
                    ...prev[srcMachineId],
                    [srcRole]: null
                }
             }));
        }
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const promises = [];
        
        // Find team key
        let teamKey = "default";
        if (selectedTeam !== "all") {
             const teamObj = teams.find(t => String(t.id) === String(selectedTeam));
             teamKey = teamObj ? teamObj.team_key : selectedTeam;
        }

        for (const [machineId, roles] of Object.entries(assignments)) {
            // Only save if at least one role is assigned or if it existed before
            // Simplified: Save all machines that have assignments
            const hasAssignment = Object.values(roles).some(v => v);
            
            if (hasAssignment) {
                const existing = dailyStaffing.find(ds => String(ds.machine_id) === String(machineId));
                const payload = {
                    date: dateStr,
                    shift: selectedShift,
                    team_key: teamKey,
                    machine_id: machineId,
                    ...roles,
                    status: 'Confirmado'
                };
                
                if (existing) {
                    promises.push(base44.entities.DailyMachineStaffing.update(existing.id, payload));
                } else {
                    promises.push(base44.entities.DailyMachineStaffing.create(payload));
                }
            }
        }
        await Promise.all(promises);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['dailyStaffing'] });
        toast.success("Asignaciones guardadas correctamente");
    }
  });

  // Filter machines based on confirmed daily planning
  const plannedMachines = useMemo(() => {
    if (!dailyMachinePlannings.length) return [];
    const plannedIds = new Set(dailyMachinePlannings.map(mp => String(mp.machine_id)));
    return machines.filter(m => plannedIds.has(String(m.id)))
        .sort((a,b) => (a.orden_visualizacion || 999) - (b.orden_visualizacion || 999));
  }, [machines, dailyMachinePlannings]);

  // Helper: Get Ideal Slot
  const getExperienceSlot = (emp, machineId) => {
    const skill = employeeSkills.find(s => 
        s.employee_id === emp.id && s.machine_id === machineId
    );
    if (skill?.orden_preferencia) return skill.orden_preferencia;
    
    const machine = machines.find(m => String(m.id) === String(machineId));
    const identifiers = machine ? [
        String(machine.id),
        machine.codigo ? String(machine.codigo) : null
    ].filter(Boolean) : [String(machineId)];

    for (let i = 1; i <= 10; i++) {
        const val = emp[`maquina_${i}`];
        if (val && identifiers.includes(String(val))) return i;
    }
    return 999;
  };

  // Helper: Check Role Match
  const normalize = (str) => str ? str.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
  
  const checkRoleMatch = (emp, roleKey) => {
      const puesto = normalize(emp.puesto);
      const isTecnicoProceso = puesto.includes('tecnico de proceso');
      if (isTecnicoProceso) return true;
      if (roleKey === 'responsable_linea') {
          return puesto.includes('responsable de linea') || puesto.includes('responsable de línea');
      }
      if (roleKey === 'segunda_linea') {
          return puesto.includes('segunda de linea') || puesto.includes('2ª');
      }
      if (roleKey.startsWith('operador')) {
          return puesto.includes('operari'); // Matches operario, operaria
      }
      return false;
  };

  const isEmployeeAvailable = (e, dateStr, teamId) => {
       // 1. Department (Production Only)
       // Reuse utility for consistency with other pages
       if (!isProductionOperator(e)) return false;

       // 2. Absence Check
       if (e.ausencia_inicio) {
            const checkDate = new Date(dateStr);
            checkDate.setHours(12, 0, 0, 0); // Noon to avoid timezone issues
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
                if (checkTime >= startTime) return false;
            }
       }

       // 3. Availability Status
       if (normalize(e.disponibilidad) !== "disponible") return false;

       // 4. Team & Shift Matching (The Core Logic)
       if (teamId !== "all") {
           const teamObj = teams.find(t => String(t.id) === String(teamId));
           if (!teamObj) return false;

           const targetTeam = normalize(teamObj.team_name);
           const shift = normalize(selectedShift);
           const isMorningShift = shift.includes("mañana") || shift.includes("t1") || shift === "manana";
           const isAfternoonShift = shift.includes("tarde") || shift.includes("t2");

           // 1. Team Match
           const isTeamById = e.team_id && String(e.team_id) === String(teamId);
           const isTeamByName = normalize(e.equipo) === targetTeam;
           
           // 2. Fixed Shift Match
           const tipoTurno = normalize(e.tipo_turno);
           const isFixed = tipoTurno.includes("fijo");
           const isMorningType = tipoTurno.includes("manana") || tipoTurno.includes("mañana") || tipoTurno.includes("t1");
           const isAfternoonType = tipoTurno.includes("tarde") || tipoTurno.includes("t2");

           const isFixedMorning = isFixed && isMorningType;
           const isFixedAfternoon = isFixed && isAfternoonType;

           const matchesShiftContext = 
             (isMorningShift && isFixedMorning) ||
             (isAfternoonShift && isFixedAfternoon);

           // Inclusion Logic
           if (matchesShiftContext) return true; // Always include if Fixed Shift matches current shift
           
           if (isTeamById || isTeamByName) {
               // Exclude if Fixed Shift for OPPOSITE shift
               if (isMorningShift && isFixedAfternoon) return false;
               if (isAfternoonShift && isFixedMorning) return false;
               return true; // Otherwise include team member
           }

           return false;
       }
       return true;
  };

  const handleAutoAssign = () => {
    if (selectedTeam === "all") {
        toast.error("Seleccione un equipo para realizar la asignación automática.");
        return;
    }

    const newAssignments = { ...assignments };
    const assignedEmpIds = new Set();
    
    // Mark currently assigned as unavailable (so we don't double assign)
    Object.values(newAssignments).forEach(roles => {
        Object.values(roles).forEach(id => { if(id) assignedEmpIds.add(String(id)); });
    });

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    let assignedCount = 0;

    plannedMachines.forEach(machine => {
        const planning = dailyMachinePlannings.find(mp => String(mp.machine_id) === String(machine.id));
        const requiredOps = Number(planning?.operadores_necesarios) || 0;
        
        const rolesToFill = [];
        if (requiredOps >= 1) rolesToFill.push({ key: 'responsable_linea' });
        if (requiredOps >= 2) rolesToFill.push({ key: 'segunda_linea' });
        for (let i = 0; i < requiredOps - 2; i++) {
            rolesToFill.push({ key: `operador_${i+1}` });
        }

        rolesToFill.forEach(({ key }) => {
            if (newAssignments[machine.id]?.[key]) return;

            const roleCandidates = employees.filter(e => {
                if (assignedEmpIds.has(String(e.id))) return false;
                if (!isEmployeeAvailable(e, dateStr, selectedTeam)) return false;
                if (!checkRoleMatch(e, key)) return false;
                return true;
            });

            let bestCandidate = null;
            const slot1 = roleCandidates.find(e => getExperienceSlot(e, machine.id) === 1);
            if (slot1) {
                bestCandidate = slot1;
            } else {
                const slot2 = roleCandidates.find(e => getExperienceSlot(e, machine.id) === 2);
                if (slot2) bestCandidate = slot2;
            }

            if (bestCandidate) {
                newAssignments[machine.id] = {
                    ...newAssignments[machine.id],
                    [key]: bestCandidate.id
                };
                assignedEmpIds.add(String(bestCandidate.id));
                assignedCount++;
            }
        });
    });

    plannedMachines.forEach(machine => {
        const planning = dailyMachinePlannings.find(mp => String(mp.machine_id) === String(machine.id));
        const requiredOps = Number(planning?.operadores_necesarios) || 0;

        const rolesToFill = [];
        for (let i = 0; i < Math.max(0, requiredOps - 2); i++) {
            rolesToFill.push(`operador_${i+1}`);
        }

        rolesToFill.forEach((roleKey) => {
            if (newAssignments[machine.id]?.[roleKey]) return;

            const candidates = employees.filter(e => {
                if (assignedEmpIds.has(String(e.id))) return false;
                if (!isEmployeeAvailable(e, dateStr, selectedTeam)) return false;
                return true;
            });

            if (candidates.length === 0) return;

            const sorted = [...candidates].sort((a, b) => {
                const sa = getExperienceSlot(a, machine.id);
                const sb = getExperienceSlot(b, machine.id);
                if (sa !== sb) return sa - sb;
                return getEmployeeName(a).localeCompare(getEmployeeName(b));
            });

            const bestCandidate = sorted[0];
            if (bestCandidate) {
                newAssignments[machine.id] = {
                    ...newAssignments[machine.id],
                    [roleKey]: bestCandidate.id
                };
                assignedEmpIds.add(String(bestCandidate.id));
                assignedCount++;
            }
        });
    });

    setAssignments(newAssignments);
    if (assignedCount > 0) {
        toast.success(`Se han sugerido ${assignedCount} asignaciones.`);
    } else {
        toast.info("No se encontraron nuevas asignaciones sugeridas.");
    }
  };

  const handleExportExcel = () => {
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const teamObj = selectedTeam !== "all" ? teams.find(t => String(t.id) === String(selectedTeam)) : null;
      const teamName = teamObj?.team_name || "";
      const roles = [
        { key: "responsable_linea", label: "Responsable línea" },
        { key: "segunda_linea", label: "2ª línea" },
        { key: "operador_1", label: "Operador 1" },
        { key: "operador_2", label: "Operador 2" },
        { key: "operador_3", label: "Operador 3" },
        { key: "operador_4", label: "Operador 4" },
        { key: "operador_5", label: "Operador 5" },
        { key: "operador_6", label: "Operador 6" },
        { key: "operador_7", label: "Operador 7" },
        { key: "operador_8", label: "Operador 8" }
      ];

      const machineRows = [];
      const employeeRows = [];

      plannedMachines.forEach(machine => {
        const rolesForMachine = assignments[machine.id] || {};
        roles.forEach(role => {
          const empId = rolesForMachine[role.key];
          if (!empId) return;
          const emp = employees.find(e => String(e.id) === String(empId));
          const empName = getEmployeeName(emp);
          const puesto = emp?.puesto || "";
          machineRows.push({
            Fecha: dateStr,
            Turno: selectedShift,
            Equipo: teamName,
            Maquina: getMachineAlias(machine),
            CodigoMaquina: machine?.codigo_maquina || "",
            Rol: role.label,
            Empleado: empName,
            Puesto: puesto
          });
          employeeRows.push({
            Fecha: dateStr,
            Turno: selectedShift,
            Equipo: teamName,
            Empleado: empName,
            Puesto: puesto,
            Rol: role.label,
            Maquina: getMachineAlias(machine),
            CodigoMaquina: machine?.codigo_maquina || ""
          });
        });
      });

      employeeRows.sort((a, b) => (a.Empleado || "").localeCompare(b.Empleado || ""));

      if (machineRows.length === 0 && employeeRows.length === 0) {
        toast.info("No hay asignaciones para exportar");
        return;
      }

      const wb = XLSX.utils.book_new();
      if (machineRows.length > 0) {
        const wsMachines = XLSX.utils.json_to_sheet(machineRows);
        XLSX.utils.book_append_sheet(wb, wsMachines, "PorMaquinas");
      }
      if (employeeRows.length > 0) {
        const wsEmployees = XLSX.utils.json_to_sheet(employeeRows);
        XLSX.utils.book_append_sheet(wb, wsEmployees, "PorEmpleados");
      }

      const safeShift = (selectedShift || "").replace(/\s+/g, "_");
      const safeTeam = (teamName || "").replace(/\s+/g, "_") || "Equipo";
      const fileName = `AsignacionTurno_${dateStr}_${safeShift}_${safeTeam}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Asignación exportada a Excel", { description: fileName });
    } catch (error) {
      toast.error("Error al exportar a Excel");
    }
  };

  const handleOpenScreen = async () => {
    if (selectedTeam === "all") {
      toast.error("Seleccione un equipo antes de enviar a pantalla.");
      return;
    }
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const screenId = "main";
    let extra = "";
    try {
      const payload = {
        date: dateStr,
        shift: selectedShift,
        teamId: selectedTeam,
        assignments,
        plannedMachineIds: plannedMachines.map(m => m.id),
      };
      const raw = JSON.stringify(payload);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("shiftAssignmentsDisplayPayload", raw);
        } catch {
          0;
        }
        try {
          const encoded = btoa(unescape(encodeURIComponent(raw)));
          extra = `&payload=${encodeURIComponent(encoded)}`;
        } catch {
          0;
        }
      }
      try {
        const configKey = `shift_assignments_display_${screenId}`;
        await base44.entities.AppConfig.create({
          config_key: configKey,
          value: raw,
        });
      } catch {
        toast.warning("No se pudo actualizar la pantalla remota. Se abrirá la vista de pantalla igualmente.");
      }
    } catch {
      0;
    }
    const url = `${createPageUrl("ShiftAssignmentsDisplay")}?screenId=${encodeURIComponent(screenId)}&date=${encodeURIComponent(dateStr)}&shift=${encodeURIComponent(selectedShift)}&teamId=${encodeURIComponent(selectedTeam)}${extra}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const getEmployeeName = (emp) => {
      if (!emp) return "";
      return emp.nombre || emp.name || emp.Name || emp.full_name || emp.fullName || emp.display_name || "Sin Nombre";
  };

  // Available Employees (Restored & Updated)
  const availableEmployees = useMemo(() => {
     const assignedIds = new Set();
     Object.values(assignments).forEach(roles => {
         Object.values(roles).forEach(id => {
             if (id) assignedIds.add(String(id));
         });
     });
     
     const dateStr = format(selectedDate, 'yyyy-MM-dd');

     return employees.filter(e => {
         if (assignedIds.has(String(e.id))) return false;
         if (!isEmployeeAvailable(e, dateStr, selectedTeam)) return false;
         if (searchTerm) {
             const lower = normalize(searchTerm);
             const name = normalize(getEmployeeName(e));
             return name.includes(lower);
         }
         return true;
     });
  }, [employees, assignments, selectedTeam, searchTerm, selectedDate]);

  const productionPositions = useMemo(() => {
     const set = new Set();
     employees.forEach(e => {
        const d = (e.departamento || "").toString().trim().toUpperCase();
        if ((d === "PRODUCCIÓN" || d === "PRODUCCION") && e.puesto) {
          set.add(e.puesto);
        }
     });
     return Array.from(set).sort((a, b) => (a || "").localeCompare(b || ""));
  }, [employees]);

  // Count Employees by Position (New Feature)
  const availableCountsByPosition = useMemo(() => {
      const counts = {};
      availableEmployees.forEach(e => {
          const p = e.puesto || "Sin Puesto";
          counts[p] = (counts[p] || 0) + 1;
      });
      return counts;
  }, [availableEmployees]);

  // Grouped Employees for Right Panel
  const groupedAvailableEmployees = useMemo(() => {
      // Sort by Role: Responsable, Segunda, Operario, Others
      const getRolePriority = (puesto) => {
          const p = normalize(puesto);
          if (p.includes('responsable')) return 1;
          if (p.includes('segunda') || p.includes('2ª')) return 2;
          if (p.includes('operari')) return 3;
          return 4;
      };

      return [...availableEmployees].sort((a, b) => {
          const prioA = getRolePriority(a.puesto);
          const prioB = getRolePriority(b.puesto);
          if (prioA !== prioB) return prioA - prioB;
          return getEmployeeName(a).localeCompare(getEmployeeName(b));
      });
  }, [availableEmployees]);


  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-6 gap-6">
       {/* Header */}
       <div className="flex justify-between items-center shrink-0">
         <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Planning Diario
            </h1>
            <p className="text-slate-500">Gestión de personal por máquina y turno</p>
         </div>
         <div className="flex items-center gap-4">
            <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "dd/MM/yyyy", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar 
                    mode="single" 
                    selected={selectedDate} 
                    onSelect={(d) => {
                      if (!d) return;
                      setSelectedDate(d);
                      setIsDatePopoverOpen(false);
                    }} 
                    locale={es} 
                  />
                </PopoverContent>
            </Popover>
            
            <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger className="w-[150px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={shifts.MORNING || "Mañana"}>{shifts.MORNING || "Mañana"}</SelectItem>
                    <SelectItem value={shifts.AFTERNOON || "Tarde"}>{shifts.AFTERNOON || "Tarde"}</SelectItem>
                    <SelectItem value={shifts.NIGHT || "Noche"}>{shifts.NIGHT || "Noche"}</SelectItem>
                </SelectContent>
            </Select>

            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Equipo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {teams.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.team_name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              onClick={handleExportExcel}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleOpenScreen}
              className="gap-2"
            >
              <Monitor className="w-4 h-4" />
              Enviar a pantalla
            </Button>

            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                Guardar
            </Button>
         </div>
       </div>

       {/* Content */}
       <DragDropContext onDragEnd={handleDragEnd}>
         <div className="flex flex-1 gap-6 min-h-0">
            {/* Machine List */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
                {/* Search Bar & Auto Assign Button */}
                <div className="flex items-center gap-2">
                     <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            placeholder="Buscar máquina..." 
                            className="pl-9"
                        />
                     </div>
                     <Button variant="outline" onClick={handleAutoAssign} className="gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        Sugerir Asignación
                     </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {plannedMachines.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            No hay máquinas planificadas para este turno/equipo.
                        </div>
                    ) : (
                        plannedMachines.map(machine => {
                            const planning = dailyMachinePlannings.find(mp => String(mp.machine_id) === String(machine.id));
                            const requiredOps = Number(planning?.operadores_necesarios) || 0;
                            
                            return (
                                <Card key={machine.id} className="overflow-hidden">
                                    <CardHeader className="py-3 bg-slate-50 border-b">
                                        <CardTitle className="text-sm flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Factory className="w-4 h-4 text-slate-500" />
                                                <span className="font-medium text-slate-700 truncate" title={getMachineAlias(machine)}>
                                                    {getMachineAlias(machine)}
                                                </span>
                                            </div>
                                            <Badge variant="outline" className="text-xs font-normal">
                                                {requiredOps} Operarios
                                            </Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 grid grid-cols-2 gap-4">
                                        {requiredOps >= 1 && (
                                            <Slot 
                                                id={`machine-${machine.id}-responsable_linea`} 
                                                label="Responsable" 
                                                assignedId={assignments[machine.id]?.responsable_linea} 
                                                employees={employees}
                                                isRequired
                                            />
                                        )}
                                        {requiredOps >= 2 && (
                                            <Slot 
                                                id={`machine-${machine.id}-segunda_linea`} 
                                                label="2ª Línea" 
                                                assignedId={assignments[machine.id]?.segunda_linea} 
                                                employees={employees}
                                                isRequired
                                            />
                                        )}
                                        {Array.from({ length: Math.max(0, requiredOps - 2) }).map((_, i) => (
                                            <Slot 
                                                key={i}
                                                id={`machine-${machine.id}-operador_${i+1}`} 
                                                label={`Operador ${i+1}`} 
                                                assignedId={assignments[machine.id]?.[`operador_${i+1}`]} 
                                                employees={employees}
                                                isRequired
                                            />
                                        ))}
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Employee Pool */}
            <div className="w-[350px] flex flex-col gap-4 min-h-0 bg-slate-50 p-4 rounded-xl border">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Disponibles
                        <Badge variant="secondary">{groupedAvailableEmployees.length} / {employees.length}</Badge>
                    </h3>
                </div>
                
                {/* Stats Summary */}
                <div className="flex flex-wrap gap-1 text-[10px]">
                    {Object.entries(availableCountsByPosition).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([pos, count]) => (
                        <span key={pos} className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                            {pos}: <strong>{count}</strong>
                        </span>
                    ))}
                </div>

                <Input 
                    placeholder="Buscar empleado..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                
                <div className="flex-1 min-h-0">
                    {groupedAvailableEmployees.length === 0 && employees.length > 0 && (
                        <div className="p-4 text-sm text-amber-600 bg-amber-50 rounded-md mb-2">
                            <p className="font-semibold">No hay empleados visibles.</p>
                            <p>Total cargados: {employees.length}</p>
                            <p>Equipo Seleccionado: {teams.find(t => String(t.id) === String(selectedTeam))?.team_name || selectedTeam}</p>
                            <p className="mt-2 text-xs text-slate-500">
                                Verifique que los empleados tengan el campo "Equipo" asignado correctamente o que el filtro de departamento/disponibilidad coincida.
                            </p>
                        </div>
                    )}

                    <Droppable 
                        droppableId="unassigned-pool" 
                        isDropDisabled={false}
                    >
                        {(provided) => (
                            <div 
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-2"
                            >
                                {groupedAvailableEmployees.map((emp, index) => (
                                    <EmployeeRow 
                                        key={emp.id} 
                                        index={index} 
                                        data={groupedAvailableEmployees} 
                                        positions={productionPositions}
                                        editingEmployeeId={editingEmployeeId}
                                        editingPuesto={editingPuesto}
                                        setEditingEmployeeId={setEditingEmployeeId}
                                        setEditingPuesto={setEditingPuesto}
                                        updateEmployeePosition={updateEmployeePosition}
                                        style={{}}
                                    />
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </div>
            </div>
         </div>
       </DragDropContext>
    </div>
  );
}

// Adjusted EmployeeRow for standard list
function EmployeeRow({ index, data, positions, editingEmployeeId, editingPuesto, setEditingEmployeeId, setEditingPuesto, updateEmployeePosition }) {
  const emp = data[index];
  const isEditing = editingEmployeeId === emp.id;

  return (
    <Draggable key={emp.id} draggableId={String(emp.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
             ...provided.draggableProps.style,
          }}
          className={`p-3 rounded-lg border bg-white shadow-sm cursor-grab active:cursor-grabbing group hover:border-blue-400 transition-colors ${
              emp.isSkilled ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-slate-200'
          } ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 opacity-90 z-50' : ''}`}
        >
          <div className="flex justify-between items-center gap-2">
              <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 truncate">{getEmployeeName(emp)}</p>
                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Select
                        value={editingPuesto || emp.puesto || "none"}
                        onValueChange={(val) => {
                          const next = val === "none" ? "" : val;
                          setEditingPuesto(next);
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs bg-white">
                          <SelectValue placeholder="Seleccionar puesto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">- Sin puesto -</SelectItem>
                          {positions.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateEmployeePosition.mutate({ id: emp.id, puesto: editingPuesto || emp.puesto || "" });
                        }}
                        disabled={updateEmployeePosition.isPending}
                      >
                        <Save className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEmployeeId(null);
                          setEditingPuesto("");
                        }}
                        disabled={updateEmployeePosition.isPending}
                      >
                        <History className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 truncate">{emp.puesto}</p>
                  )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-slate-500 hover:text-slate-900"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isEditing) {
                      setEditingEmployeeId(null);
                      setEditingPuesto("");
                    } else {
                      setEditingEmployeeId(emp.id);
                      setEditingPuesto(emp.puesto || "");
                    }
                  }}
                >
                  <Edit3 className="w-3 h-3" />
                </Button>
                {emp.isSkilled && (
                  <Badge variant="secondary" className="bg-green-50 text-green-700 text-[10px] px-1.5 h-5 shrink-0">
                      Skill
                  </Badge>
                )}
              </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
