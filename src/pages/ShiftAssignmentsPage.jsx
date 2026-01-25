import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppData } from "../components/data/DataProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar as CalendarIcon, 
  Users, 
  Save,
  UserCheck,
  User as UserIcon,
  Cog,
  Search,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ArrowRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ThemeToggle from "../components/common/ThemeToggle";

export default function ShiftAssignmentsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedMachineId, setSelectedMachineId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Local state for assignments (unsaved changes)
  const [localAssignments, setLocalAssignments] = useState({});
  
  const queryClient = useQueryClient();
  const { employees = [], teams = [], machines = [] } = useAppData();

  // Set default team
  useEffect(() => {
    if (teams.length > 0 && !selectedTeam) {
        setSelectedTeam(teams[0].team_key);
    }
  }, [teams, selectedTeam]);

  // --- QUERIES ---

  // 1. Fetch Daily Production Plan (Which machines are planned?)
  const { data: productionPlan = [] } = useQuery({
    queryKey: ['dailyProductionPlan', format(selectedDate, 'yyyy-MM-dd'), selectedTeam],
    queryFn: () => {
        if (!selectedTeam) return [];
        return base44.entities.MachinePlanning.filter({
            fecha_planificacion: format(selectedDate, 'yyyy-MM-dd'),
            team_key: selectedTeam
        });
    },
    enabled: !!selectedTeam,
  });

  // 2. Fetch Existing Assignments (Staffing)
  const { data: existingStaffing = [] } = useQuery({
    queryKey: ['dailyMachineStaffing', format(selectedDate, 'yyyy-MM-dd'), selectedTeam],
    queryFn: () => {
        if (!selectedTeam) return [];
        return base44.entities.DailyMachineStaffing.filter({
            date: format(selectedDate, 'yyyy-MM-dd'),
            team_key: selectedTeam
        });
    },
    enabled: !!selectedTeam,
  });

  // 3. Fetch Employee Skills
  const { data: employeeSkills = [] } = useQuery({
    queryKey: ['employeeSkills'],
    queryFn: () => base44.entities.EmployeeSkill.list(),
    staleTime: 5 * 60 * 1000,
  });

  // --- INITIALIZATION ---

  // Initialize local assignments when data loads
  useEffect(() => {
    if (existingStaffing.length > 0) {
        const loaded = {};
        existingStaffing.forEach(ds => {
            loaded[ds.machine_id] = {
                id: ds.id, // Keep ID for updates
                responsable_linea: ds.responsable_linea,
                segunda_linea: ds.segunda_linea,
                operador_1: ds.operador_1,
                operador_2: ds.operador_2,
                operador_3: ds.operador_3,
                operador_4: ds.operador_4,
                operador_5: ds.operador_5,
                operador_6: ds.operador_6,
                operador_7: ds.operador_7,
                operador_8: ds.operador_8,
            };
        });
        setLocalAssignments(loaded);
    } else {
        setLocalAssignments({});
    }
  }, [existingStaffing]);

  // --- HELPERS ---

  const getMachineDetails = (machineId) => machines.find(m => String(m.id) === String(machineId));
  const getEmployeeById = (id) => employees.find(e => e.id === id);

  const checkEmployeeSkill = (employeeId, machineId) => {
    const emp = getEmployeeById(employeeId);
    if (!emp) return false;

    // 1. Check Skill Matrix
    const hasSkill = employeeSkills.some(es => 
        es.employee_id === employeeId && 
        String(es.machine_id) === String(machineId)
    );
    if (hasSkill) return true;

    // 2. Check Legacy Columns (maquina_1 ... maquina_10)
    const hasLegacySkill = [1,2,3,4,5,6,7,8,9,10].some(i => 
        String(emp[`maquina_${i}`]) === String(machineId)
    );
    
    return hasLegacySkill;
  };

  const getAvailableEmployees = (machineIdForSkillCheck = null) => {
    // Get all assigned employee IDs across all machines
    const assignedIds = new Set();
    Object.values(localAssignments).forEach(a => {
        Object.values(a).forEach(val => {
             // Skip non-ID values if any
             if (typeof val === 'string' || typeof val === 'number') assignedIds.add(String(val));
        });
    });

    return employees.filter(e => {
        // Filter by Team
        if (selectedTeam) {
            const teamName = teams.find(t => t.team_key === selectedTeam)?.team_name;
            if (e.equipo !== teamName) return false;
        }

        // Filter by Availability
        if (e.disponibilidad !== "Disponible") return false;

        // Filter if already assigned
        if (assignedIds.has(String(e.id))) return false;

        // Filter by Search
        if (searchTerm) {
            return e.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
        }

        return true;
    }).sort((a, b) => {
        // Sort by Skill for the selected machine
        if (machineIdForSkillCheck) {
            const aSkill = checkEmployeeSkill(a.id, machineIdForSkillCheck);
            const bSkill = checkEmployeeSkill(b.id, machineIdForSkillCheck);
            if (aSkill && !bSkill) return -1;
            if (!aSkill && bSkill) return 1;
        }
        return a.nombre.localeCompare(b.nombre);
    });
  };

  // --- MUTATIONS ---

  const saveMutation = useMutation({
    mutationFn: async () => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const promises = [];

        // Save each machine assignment
        for (const [machineId, data] of Object.entries(localAssignments)) {
            // Check if there's anything to save (at least one person assigned)
            const hasAssignments = Object.keys(data).some(k => k !== 'id' && data[k]);
            
            // Prepare payload
            const payload = {
                date: dateStr,
                team_key: selectedTeam,
                machine_id: machineId,
                status: 'Confirmado',
                responsable_linea: data.responsable_linea || null,
                segunda_linea: data.segunda_linea || null,
                operador_1: data.operador_1 || null,
                operador_2: data.operador_2 || null,
                operador_3: data.operador_3 || null,
                operador_4: data.operador_4 || null,
                operador_5: data.operador_5 || null,
                operador_6: data.operador_6 || null,
                operador_7: data.operador_7 || null,
                operador_8: data.operador_8 || null,
            };

            if (data.id) {
                promises.push(base44.entities.DailyMachineStaffing.update(data.id, payload));
            } else if (hasAssignments) {
                promises.push(base44.entities.DailyMachineStaffing.create(payload));
            }
        }
        
        await Promise.all(promises);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['dailyMachineStaffing'] });
        toast.success("Asignaciones guardadas correctamente");
    },
    onError: (err) => {
        console.error(err);
        toast.error("Error al guardar asignaciones");
    }
  });

  // --- DRAG AND DROP HANDLERS ---

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    
    // Dropping into the pool (unassigning)
    if (destination.droppableId === 'employee-pool') {
        if (source.droppableId.startsWith('machine-')) {
            const [_, machineId, role] = source.droppableId.split('-');
            
            setLocalAssignments(prev => ({
                ...prev,
                [machineId]: {
                    ...prev[machineId],
                    [role]: null
                }
            }));
        }
        return;
    }

    // Dropping into a machine slot
    if (destination.droppableId.startsWith('machine-')) {
        const [_, machineId, role] = destination.droppableId.split('-');
        
        // If coming from another slot, clear source
        if (source.droppableId.startsWith('machine-')) {
            const [__, srcMachineId, srcRole] = source.droppableId.split('-');
            
            setLocalAssignments(prev => {
                const newState = { ...prev };
                // Remove from source
                newState[srcMachineId] = { ...newState[srcMachineId], [srcRole]: null };
                // Add to dest
                newState[machineId] = { ...newState[machineId], [role]: draggableId };
                return newState;
            });
        } else {
            // Coming from pool
            setLocalAssignments(prev => ({
                ...prev,
                [machineId]: {
                    ...prev[machineId] || {},
                    [role]: draggableId
                }
            }));
        }
    }
  };

  // --- RENDER ---

  const selectedMachinePlan = productionPlan.find(p => String(p.machine_id) === String(selectedMachineId));
  const availableEmployees = getAvailableEmployees(selectedMachineId);

  return (
    <div className="h-full flex flex-col p-4 gap-4 bg-slate-50 dark:bg-slate-950 overflow-hidden w-full max-w-full">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    Asignación de Personal
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                    Gestione la asignación de operarios a máquinas planificadas según habilidades.
                </p>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
             <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal w-[240px]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>

              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Seleccionar Equipo" />
                </SelectTrigger>
                <SelectContent>
                    {teams.map(t => (
                        <SelectItem key={t.team_key} value={t.team_key}>{t.team_name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <ThemeToggle />
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden min-h-0">
        
        {/* LEFT COLUMN: PLANNED MACHINES LIST */}
        <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between shrink-0 mb-2">
                <h2 className="font-semibold flex items-center gap-2">
                    <Factory className="w-4 h-4 text-slate-500" />
                    Máquinas Planificadas ({productionPlan.length})
                </h2>
                <Badge variant="outline">{productionPlan.length} total</Badge>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {productionPlan.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No hay planificación para este día/equipo.</p>
                        <p className="text-xs">Configure primero la Planificación Diaria.</p>
                    </div>
                ) : (
                    productionPlan.map(plan => {
                        const machine = getMachineDetails(plan.machine_id);
                        const assignment = localAssignments[plan.machine_id] || {};
                        
                        // Count assigned
                        const assignedCount = [
                            assignment.responsable_linea,
                            assignment.segunda_linea,
                            assignment.operador_1,
                            assignment.operador_2,
                            assignment.operador_3,
                            assignment.operador_4
                        ].filter(Boolean).length;

                        // Required (simple estimation or from plan if available)
                        const required = Number(plan.operadores_necesarios) || 1; 
                        const isComplete = assignedCount >= required;

                        return (
                            <div 
                                key={plan.id}
                                onClick={() => setSelectedMachineId(plan.machine_id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                                    String(selectedMachineId) === String(plan.machine_id)
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-300'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-medium text-slate-900 dark:text-slate-100">
                                            {machine?.nombre || `Máquina ${plan.machine_id}`}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {machine?.codigo}
                                        </p>
                                    </div>
                                    {isComplete ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <Badge variant="secondary" className="text-xs">
                                            {assignedCount}/{required}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>

        {/* CENTER & RIGHT: ASSIGNMENT WORKSPACE */}
        <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
            
            {/* WORKSPACE HEADER */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm shrink-0 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    {selectedMachineId ? (
                        <>
                             <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <Cog className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">
                                    {getMachineDetails(selectedMachineId)?.nombre || "Máquina Desconocida"}
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Arrastre empleados a las posiciones requeridas
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 text-slate-500">
                            <ArrowRight className="w-5 h-5 animate-pulse" />
                            <span>Seleccione una máquina de la lista para comenzar</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button 
                        variant="default" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saveMutation.isPending ? "Guardando..." : "Guardar Todo"}
                    </Button>
                </div>
            </div>

            {/* SPLIT: SLOTS vs POOL */}
            {selectedMachineId && (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden min-h-0">
                    
                    {/* MACHINE SLOTS */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-y-auto">
                        <h3 className="font-semibold mb-4 text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Puestos a Cubrir
                        </h3>
                        
                        <div className="space-y-4">
                            {/* Responsable de Linea (Fixed) */}
                            <Slot 
                                id={`machine-${selectedMachineId}-responsable_linea`}
                                label="Responsable de Línea"
                                assignedId={localAssignments[selectedMachineId]?.responsable_linea}
                                employees={employees}
                                isRequired={true}
                            />

                            {/* Segunda Linea (Fixed) */}
                            <Slot 
                                id={`machine-${selectedMachineId}-segunda_linea`}
                                label="Segunda Línea"
                                assignedId={localAssignments[selectedMachineId]?.segunda_linea}
                                employees={employees}
                            />

                            {/* Dynamic Operators based on Plan */}
                            {Array.from({ length: Number(selectedMachinePlan?.operadores_necesarios) || 4 }).map((_, idx) => (
                                <Slot 
                                    key={idx}
                                    id={`machine-${selectedMachineId}-operador_${idx + 1}`}
                                    label={`Operador ${idx + 1}`}
                                    assignedId={localAssignments[selectedMachineId]?.[`operador_${idx + 1}`]}
                                    employees={employees}
                                    isRequired={true}
                                />
                            ))}
                        </div>
                    </div>

                    {/* EMPLOYEE POOL */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-inner flex flex-col overflow-hidden">
                        <div className="mb-4 space-y-2">
                             <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input 
                                    placeholder="Buscar empleado..." 
                                    className="pl-9 bg-white" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                             </div>
                             <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                                <span>{availableEmployees.length} disponibles</span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Cualificado
                                    <span className="w-2 h-2 rounded-full bg-slate-300 ml-2"></span> Otros
                                </span>
                             </div>
                        </div>

                        <Droppable droppableId="employee-pool" isDropDisabled={true}>
                            {(provided) => (
                                <div 
                                    ref={provided.innerRef} 
                                    {...provided.droppableProps}
                                    className="flex-1 overflow-y-auto space-y-2 pr-2"
                                >
                                    {availableEmployees.map((emp, index) => {
                                        const isSkilled = checkEmployeeSkill(emp.id, selectedMachineId);
                                        return (
                                            <Draggable key={emp.id} draggableId={String(emp.id)} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`p-3 rounded-lg border bg-white shadow-sm cursor-grab active:cursor-grabbing group hover:border-blue-400 transition-colors ${
                                                            isSkilled ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-slate-200'
                                                        } ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 opacity-90' : ''}`}
                                                        style={provided.draggableProps.style}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <p className="font-medium text-sm text-slate-900">{emp.nombre}</p>
                                                                <p className="text-xs text-slate-500">{emp.puesto}</p>
                                                            </div>
                                                            {isSkilled && (
                                                                <Badge variant="secondary" className="bg-green-50 text-green-700 text-[10px] px-1.5 h-5">
                                                                    Skill
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        );
                                    })}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>

                </div>
            )}
        </div>

      </div>
      </DragDropContext>
    </div>
  );
}

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
                                                {assignedEmployee.nombre.charAt(0)}
                                            </div>
                                            <span className="text-sm truncate font-medium">{assignedEmployee.nombre}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500"
                                            // Deletion is handled by dragging out, but a click handler could be added here if needed via context
                                        >
                                            <span className="sr-only">Remover</span>
                                        </Button>
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
