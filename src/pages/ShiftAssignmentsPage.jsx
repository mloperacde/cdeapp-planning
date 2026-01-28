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
  Factory
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ReactWindow from 'react-window';
import { AutoSizer } from "react-virtualized-auto-sizer";

const { FixedSizeList: List } = ReactWindow;

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
                                                {assignedEmployee.nombre.charAt(0)}
                                            </div>
                                            <span className="text-sm truncate font-medium">{assignedEmployee.nombre}</span>
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

const EmployeeRow = ({ index, style, data }) => {
  const emp = data[index];
  
  return (
    <Draggable key={emp.id} draggableId={String(emp.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
             ...style,
             ...provided.draggableProps.style,
             left: style.left + 8,
             top: style.top + 8,
             width: "calc(100% - 16px)",
             height: style.height - 8
          }}
          className={`p-3 rounded-lg border bg-white shadow-sm cursor-grab active:cursor-grabbing group hover:border-blue-400 transition-colors ${
              emp.isSkilled ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-slate-200'
          } ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 opacity-90 z-50' : ''}`}
        >
          <div className="flex justify-between items-center">
              <div>
                  <p className="font-medium text-sm text-slate-900 truncate">{emp.nombre}</p>
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

  // Sync default shift
  useEffect(() => {
    if (shifts.MORNING && selectedShift === "Mañana" && shifts.MORNING !== "Mañana") {
        setSelectedShift(shifts.MORNING);
    }
  }, [shifts, selectedShift]);

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

  // Available Employees Calculation (Unified Logic)
  const availableEmployees = useMemo(() => {
    const assignedIds = new Set();
    Object.values(assignments).forEach(roles => {
        Object.values(roles).forEach(id => {
            if (id) assignedIds.add(String(id));
        });
    });

    const normalize = (str) => str ? str.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    
    return employees.filter(e => {
        if (assignedIds.has(String(e.id))) return false;

        // 1. Department: Fabricación
        if (normalize(e.departamento) !== "fabricacion") return false;

        // 2. Availability: Disponible
        if (normalize(e.disponibilidad) !== "disponible") return false;

        // 3. Role Check
        const currentPuesto = normalize(e.puesto);
        const allowedRoles = ['responsable de linea', 'segunda de linea', 'operario de linea', 'operaria de linea'].map(normalize);
        if (!allowedRoles.includes(currentPuesto)) return false;

        // 4. Absence Check
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
                if (checkDate >= startDate) return false;
            }
        }

        // 5. Team Filter
        if (selectedTeam !== "all") {
            const teamObj = teams.find(t => String(t.id) === String(selectedTeam));
            if (teamObj) {
                let matchesTeam = false;
                if (e.team_id && String(e.team_id) === String(teamObj.id)) {
                    matchesTeam = true;
                } else {
                    const empTeam = normalize(e.equipo);
                    const targetTeam = normalize(teamObj.team_name);
                    if (empTeam && targetTeam && empTeam === targetTeam) {
                        matchesTeam = true;
                    }
                }
                
                if (!matchesTeam) return false;
            }
        }

        // 6. Search
        if (searchTerm) {
            const lower = normalize(searchTerm);
            return normalize(e.nombre).includes(lower);
        }

        return true;
    });
  }, [employees, assignments, selectedTeam, searchTerm, selectedDate, teams]);

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
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                        placeholder="Buscar máquina..." 
                        className="pl-9"
                    />
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {machines
                        .sort((a,b) => (a.orden_visualizacion || 999) - (b.orden_visualizacion || 999))
                        .map(machine => (
                        <Card key={machine.id} className="overflow-hidden">
                            <CardHeader className="py-3 bg-slate-50 border-b">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Factory className="w-4 h-4 text-slate-500" />
                                    {/* Machine Order: Sala, Codigo, Nombre */}
                                    <span className="font-bold text-slate-700 uppercase">{machine.ubicacion || "N/A"}</span>
                                    {machine.codigo_maquina && <span className="text-slate-400 font-mono text-xs">• {machine.codigo_maquina}</span>}
                                    <span className="text-slate-600 font-medium truncate ml-1">{machine.nombre}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 grid grid-cols-2 gap-4">
                                <Slot 
                                    id={`machine-${machine.id}-responsable_linea`} 
                                    label="Responsable" 
                                    assignedId={assignments[machine.id]?.responsable_linea} 
                                    employees={employees}
                                    isRequired
                                />
                                <Slot 
                                    id={`machine-${machine.id}-segunda_linea`} 
                                    label="2ª Línea" 
                                    assignedId={assignments[machine.id]?.segunda_linea} 
                                    employees={employees}
                                />
                                <Slot 
                                    id={`machine-${machine.id}-operador_1`} 
                                    label="Operador 1" 
                                    assignedId={assignments[machine.id]?.operador_1} 
                                    employees={employees}
                                />
                                <Slot 
                                    id={`machine-${machine.id}-operador_2`} 
                                    label="Operador 2" 
                                    assignedId={assignments[machine.id]?.operador_2} 
                                    employees={employees}
                                />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Employee Pool */}
            <div className="w-[350px] flex flex-col gap-4 min-h-0 bg-slate-50 p-4 rounded-xl border">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Disponibles
                        <Badge variant="secondary">{availableEmployees.length}</Badge>
                    </h3>
                </div>
                <Input 
                    placeholder="Buscar empleado..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                
                <div className="flex-1 min-h-0">
                    <Droppable 
                        droppableId="unassigned-pool" 
                        mode="virtual"
                        renderClone={(provided, snapshot, rubric) => {
                            const emp = availableEmployees[rubric.source.index];
                            return (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={provided.draggableProps.style}
                                    className="p-3 rounded-lg border bg-white shadow-xl border-blue-500 z-50"
                                >
                                   {emp?.nombre}
                                </div>
                            );
                        }}
                    >
                        {(provided) => (
                            <div className="h-full w-full">
                                <AutoSizer>
                                    {({ height, width }) => (
                                        <List
                                            height={height}
                                            width={width}
                                            itemCount={availableEmployees.length}
                                            itemSize={80}
                                            itemData={availableEmployees}
                                            outerRef={provided.innerRef}
                                        >
                                            {EmployeeRow}
                                        </List>
                                    )}
                                </AutoSizer>
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
