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
  Sparkles
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getMachineAlias } from "@/utils/machineAlias";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [assignments, setAssignments] = useState({});
  
  const queryClient = useQueryClient();
  const { employees = [], teams = [], machines = [] } = useAppData();

  // New: Fetch Machine Planning
  const { data: machinePlannings = [] } = useQuery({
    queryKey: ['machinePlannings', format(selectedDate, 'yyyy-MM-dd'), selectedTeam],
    queryFn: () => {
       const filters = { 
         fecha_planificacion: format(selectedDate, 'yyyy-MM-dd')
       };
       if (selectedTeam !== "all") {
           const teamObj = teams.find(t => String(t.id) === String(selectedTeam));
           if (teamObj) filters.team_key = teamObj.team_key;
       }
       return base44.entities.MachinePlanning.filter(filters);
    },
    enabled: !!selectedDate
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

  // Auto-detect Shift based on Date + Team
  useEffect(() => {
      if (selectedTeam !== "all" && teamSchedules.length > 0) {
          const teamObj = teams.find(t => String(t.id) === String(selectedTeam));
          if (!teamObj) return;

          const dateObj = new Date(selectedDate);
          // Calculate start of week (Monday)
          const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
          const weekStartStr = format(weekStart, 'yyyy-MM-dd');

          console.log(`Checking schedule for Team ${teamObj.team_key} Week ${weekStartStr}`);

          const schedule = teamSchedules.find(s => 
              s.team_key === teamObj.team_key && 
              s.fecha_inicio_semana === weekStartStr
          );

          if (schedule && schedule.turno) {
              console.log(`Found schedule: ${schedule.turno}`);
              setSelectedShift(schedule.turno);
          } else {
              console.log("No schedule found");
          }
      }
  }, [selectedDate, selectedTeam, teamSchedules, teams]);

  // Sync Team based on Shift (Reverse Logic - Optional but requested)
  useEffect(() => {
      if (selectedTeam === "all" && teamSchedules.length > 0) {
           const dateObj = new Date(selectedDate);
           const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
           const weekStartStr = format(weekStart, 'yyyy-MM-dd');

           const schedule = teamSchedules.find(s => 
               s.turno === selectedShift && 
               s.fecha_inicio_semana === weekStartStr
           );

           if (schedule) {
               const team = teams.find(t => t.team_key === schedule.team_key);
               if (team) setSelectedTeam(String(team.id));
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

  // Filter machines based on planning
  const plannedMachines = useMemo(() => {
    if (!machinePlannings.length) return [];
    const plannedIds = new Set(machinePlannings.map(mp => String(mp.machine_id)));
    return machines.filter(m => plannedIds.has(String(m.id)))
        .sort((a,b) => (a.orden_visualizacion || 999) - (b.orden_visualizacion || 999));
  }, [machines, machinePlannings]);

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
       const dept = normalize(e.departamento);
       if (dept !== "produccion") return false;

       // Absence
       if (e.ausencia_inicio) {
            const checkDate = new Date(dateStr);
            checkDate.setHours(0, 0, 0, 0);
            const startDate = new Date(e.ausencia_inicio);
            startDate.setHours(0, 0, 0, 0);
            if (e.ausencia_fin) {
                const endDate = new Date(e.ausencia_fin);
                endDate.setHours(0, 0, 0, 0);
                if (checkDate >= startDate && checkDate <= endDate) return false;
            } else {
                if (checkDate >= startDate) return false;
            }
       }
       // 4. Team (Strict match or Fixed Shift)
       if (teamId !== "all") {
           const teamObj = teams.find(t => String(t.id) === String(teamId));
           if (teamObj) {
               // Check team_id first (more reliable)
               if (e.team_id && String(e.team_id) === String(teamId)) return true;
               
               // Fallback to name matching
               const empTeam = normalize(e.equipo);
               const targetTeam = normalize(teamObj.team_name);
               
               // Flexible match
               if (empTeam === targetTeam) return true;
               if (targetTeam.length > 2 && empTeam.includes(targetTeam)) return true;
               if (empTeam.length > 2 && targetTeam.includes(empTeam)) return true;
               
               return false;
           }
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
        const planning = machinePlannings.find(mp => String(mp.machine_id) === String(machine.id));
        const requiredOps = Number(planning?.operadores_necesarios) || 0;
        
        // Define needed roles
        const rolesToFill = [];
        if (requiredOps >= 1) rolesToFill.push({ key: 'responsable_linea', label: 'Responsable' });
        if (requiredOps >= 2) rolesToFill.push({ key: 'segunda_linea', label: 'Segunda' });
        for (let i = 0; i < requiredOps - 2; i++) {
            rolesToFill.push({ key: `operador_${i+1}`, label: `Operador ${i+1}` });
        }

        rolesToFill.forEach(({ key }) => {
            // Skip if already filled
            if (newAssignments[machine.id]?.[key]) return;

            // Find Candidates
            // Criteria: 
            // 1. Available & In Team
            // 2. Matches Role
            // 3. Ideal Slot 1 (Fallback to Slot 2)
            
            // Get all potential candidates first
            const candidates = employees.filter(e => {
                if (assignedEmpIds.has(String(e.id))) return false;
                if (!isEmployeeAvailable(e, dateStr, selectedTeam)) return false;
                if (!checkRoleMatch(e, key)) return false;
                return true;
            });

            // Sort by Preference Slot
            // We look for Slot 1, then Slot 2.
            let bestCandidate = null;
            
            // Find Slot 1
            const slot1 = candidates.find(e => getExperienceSlot(e, machine.id) === 1);
            if (slot1) {
                bestCandidate = slot1;
            } else {
                // Find Slot 2
                const slot2 = candidates.find(e => getExperienceSlot(e, machine.id) === 2);
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

    setAssignments(newAssignments);
    if (assignedCount > 0) {
        toast.success(`Se han sugerido ${assignedCount} asignaciones.`);
    } else {
        toast.info("No se encontraron nuevas asignaciones sugeridas.");
    }
  };

  // Helper: Get Employee Name Robustly
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
                Asignación de Turnos
            </h1>
            <p className="text-slate-500">Gestión de personal por máquina y turno</p>
         </div>
         <div className="flex items-center gap-4">
            <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "dd/MM/yyyy", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} locale={es} />
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
                            const planning = machinePlannings.find(mp => String(mp.machine_id) === String(machine.id));
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
                                        style={{}} // No longer needed for standard list
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
function EmployeeRow({ index, data }) {
  const emp = data[index];
  
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
          <div className="flex justify-between items-center">
              <div>
                  <p className="font-medium text-sm text-slate-900 truncate">{getEmployeeName(emp)}</p>
                  <p className="text-xs text-slate-500 truncate">{emp.puesto}</p>
              </div>
              {emp.isSkilled && (
                  <Badge variant="secondary" className="bg-green-50 text-green-700 text-[10px] px-1.5 h-5 shrink-0">
                      Skill
                  </Badge>
              )}
          </div>
        </div>
      )}
    </Draggable>
  );
};
