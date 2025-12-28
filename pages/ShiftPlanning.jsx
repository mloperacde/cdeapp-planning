import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Sparkles, 
  Save,
  AlertCircle,
  UserCheck,
  User as UserIcon,
  Cog
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import EmployeeSelect from "../components/common/EmployeeSelect";

const EMPTY_ARRAY = [];

export default function ShiftPlanningPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState("Mañana");
  const [assignments, setAssignments] = useState({});
  
  const queryClient = useQueryClient();

  const { data: machines = EMPTY_ARRAY } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
  });

  const { data: employees = EMPTY_ARRAY } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        await base44.functions.invoke('syncEmployeeData');
      } catch (e) {
        console.error("Sync failed", e);
      }
      return base44.entities.EmployeeMasterDatabase.list('nombre');
    },
  });

  const { data: teams = EMPTY_ARRAY } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
  });

  const { data: machineAssignments = EMPTY_ARRAY } = useQuery({
    queryKey: ['machineAssignments'],
    queryFn: () => base44.entities.MachineAssignment.list(),
  });

  const { data: dailyStaffing = EMPTY_ARRAY } = useQuery({
    queryKey: ['dailyStaffing', format(selectedDate, 'yyyy-MM-dd'), selectedShift],
    queryFn: () => base44.entities.DailyMachineStaffing.filter({
      date: format(selectedDate, 'yyyy-MM-dd'),
      shift: selectedShift
    }),
  });

  // Initialize assignments from dailyStaffing
  React.useEffect(() => {
    if (dailyStaffing.length > 0) {
      const loaded = {};
      dailyStaffing.forEach(ds => {
        loaded[ds.machine_id] = {
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
      setAssignments(loaded);
    } else {
      // Load from ideal assignments
      const ideal = {};
      machines.forEach(machine => {
        const teamAssignment = machineAssignments.find(ma => 
          ma.machine_id === machine.id && 
          getTeamForShift(selectedShift, ma.team_key)
        );
        
        if (teamAssignment) {
          ideal[machine.id] = {
            responsable_linea: teamAssignment.responsable_linea?.[0] || null,
            segunda_linea: teamAssignment.segunda_linea?.[0] || null,
            operador_1: teamAssignment.operador_1 || null,
            operador_2: teamAssignment.operador_2 || null,
            operador_3: teamAssignment.operador_3 || null,
            operador_4: teamAssignment.operador_4 || null,
            operador_5: teamAssignment.operador_5 || null,
            operador_6: teamAssignment.operador_6 || null,
            operador_7: teamAssignment.operador_7 || null,
            operador_8: teamAssignment.operador_8 || null,
          };
        } else {
          ideal[machine.id] = {
            responsable_linea: null,
            segunda_linea: null,
            operador_1: null,
            operador_2: null,
            operador_3: null,
            operador_4: null,
            operador_5: null,
            operador_6: null,
            operador_7: null,
            operador_8: null,
          };
        }
      });
      setAssignments(ideal);
    }
  }, [dailyStaffing, machines, machineAssignments, selectedShift]);

  const getTeamForShift = (shift, teamKey) => {
    // Match shift to team (simple logic, can be enhanced)
    return true; // For now, show all teams
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const promises = [];

      for (const [machineId, data] of Object.entries(assignments)) {
        const existing = dailyStaffing.find(ds => ds.machine_id === machineId);
        const payload = {
          date: dateStr,
          shift: selectedShift,
          machine_id: machineId,
          ...data,
          status: 'Confirmado'
        };

        if (existing) {
          promises.push(base44.entities.DailyMachineStaffing.update(existing.id, payload));
        } else {
          promises.push(base44.entities.DailyMachineStaffing.create(payload));
        }
      }

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyStaffing'] });
      toast.success("Planificación guardada correctamente");
    },
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

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.source.droppableId === result.destination.droppableId) return;

    const { source, destination } = result;
    
    // Parse droppable IDs
    const sourceId = source.droppableId;
    const destId = destination.droppableId;

    // Extract employee ID from draggableId
    let employeeId = result.draggableId;
    
    // If dragging from a machine role, extract the actual employee ID
    if (sourceId.startsWith('machine-') && sourceId !== 'unassigned-pool') {
      const parts = sourceId.split('-');
      const machineId = parts[1];
      const role = parts.slice(2).join('_'); // Handle 'operador_1', etc.
      employeeId = assignments[machineId]?.[role];
      
      if (!employeeId) return;
      
      // Clear source
      handleAssignmentChange(machineId, role, null);
    }

    // Set destination (only if dropping on a machine role)
    if (destId.startsWith('machine-') && destId !== 'unassigned-pool') {
      const parts = destId.split('-');
      const machineId = parts[1];
      const role = parts.slice(2).join('_');
      
      // Check if destination already has an employee
      if (assignments[machineId]?.[role]) {
        toast.warning("Esta posición ya está ocupada");
        return;
      }
      
      handleAssignmentChange(machineId, role, employeeId);
    }
  };

  const getAvailableEmployees = () => {
    const assignedIds = new Set();
    Object.values(assignments).forEach(a => {
      Object.values(a).forEach(id => {
        if (id) assignedIds.add(id);
      });
    });

    return employees.filter(e => 
      !assignedIds.has(e.id) && 
      e.departamento === "FABRICACION" &&
      e.disponibilidad === "Disponible"
    );
  };

  const availableEmployees = getAvailableEmployees();

  const getEmployeeById = (id) => employees.find(e => e.id === id);

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-[1800px] mx-auto">
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Planificación de Turnos
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Asigna empleados a máquinas por turno utilizando drag & drop
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "dd/MM/yyyy", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>

              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mañana">☀️ Mañana</SelectItem>
                  <SelectItem value="Tarde">🌅 Tarde</SelectItem>
                  <SelectItem value="Noche">🌙 Noche</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={() => saveMutation.mutate()}
                className="bg-green-600 hover:bg-green-700"
                disabled={saveMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Guardando..." : "Guardar Planificación"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Unassigned Pool */}
              <div className="lg:col-span-1">
                <Card className="border-2 border-dashed border-slate-300 bg-slate-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Disponibles ({availableEmployees.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                   <Droppable droppableId="unassigned-pool" type="EMPLOYEE">
                     {(provided, snapshot) => (
                       <div 
                         ref={provided.innerRef} 
                         {...provided.droppableProps} 
                         className={`space-y-2 min-h-[100px] rounded-lg p-2 transition-all ${
                           snapshot.isDraggingOver ? 'bg-blue-50/50 ring-2 ring-blue-300 ring-inset' : ''
                         }`}
                       >
                         {availableEmployees.map((emp, index) => (
                           <Draggable key={emp.id} draggableId={emp.id} index={index}>
                             {(provided, snapshot) => (
                               <div
                                 ref={provided.innerRef}
                                 {...provided.draggableProps}
                                 {...provided.dragHandleProps}
                                 className={`p-3 rounded-lg border bg-white cursor-grab active:cursor-grabbing transition-all ${
                                   snapshot.isDragging 
                                     ? 'shadow-2xl border-blue-500 scale-105 ring-2 ring-blue-300 z-50' 
                                     : 'hover:border-blue-300 hover:shadow-md'
                                 }`}
                                 style={{
                                   ...provided.draggableProps.style,
                                 }}
                               >
                                 <div className="text-sm font-medium truncate">{emp.nombre}</div>
                                 <div className="text-xs text-slate-500">{emp.puesto}</div>
                               </div>
                             )}
                           </Draggable>
                         ))}
                         {provided.placeholder}
                       </div>
                     )}
                   </Droppable>
                  </CardContent>
                </Card>
              </div>

              {/* Machines Assignment */}
              <div className="lg:col-span-3">
                <div className="space-y-4">
                  {machines.map((machine) => {
                    const assignment = assignments[machine.id] || {};
                    
                    return (
                      <Card key={machine.id} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <Cog className="w-5 h-5 text-blue-600" />
                            <div>
                              <CardTitle className="text-lg">{machine.nombre}</CardTitle>
                              <div className="text-xs text-slate-500">{machine.codigo}</div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Responsable */}
                            <Droppable droppableId={`machine-${machine.id}-responsable_linea`} type="EMPLOYEE">
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`p-3 rounded-lg border-2 border-dashed transition-all min-h-[80px] ${
                                    snapshot.isDraggingOver ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-300' : 'border-slate-200'
                                  }`}
                                >
                                  <Label className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                                    <UserCheck className="w-3 h-3" /> Responsable
                                  </Label>
                                  {assignment.responsable_linea ? (
                                    <Draggable 
                                      draggableId={`assigned-${machine.id}-resp-${assignment.responsable_linea}`}
                                      index={0}
                                    >
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`p-2 bg-white rounded border cursor-grab active:cursor-grabbing transition-all ${
                                            snapshot.isDragging ? 'shadow-2xl scale-105 ring-2 ring-blue-400' : ''
                                          }`}
                                        >
                                          <div className="text-sm font-medium truncate">
                                            {getEmployeeById(assignment.responsable_linea)?.nombre}
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ) : (
                                    <div className="text-xs text-slate-400 italic p-2">Arrastra empleado aquí</div>
                                  )}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>

                            {/* Segunda */}
                            <Droppable droppableId={`machine-${machine.id}-segunda_linea`} type="EMPLOYEE">
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`p-3 rounded-lg border-2 border-dashed transition-all min-h-[80px] ${
                                    snapshot.isDraggingOver ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-300' : 'border-slate-200'
                                  }`}
                                >
                                  <Label className="text-xs font-semibold text-indigo-700 mb-2 flex items-center gap-1">
                                    <UserIcon className="w-3 h-3" /> Segunda
                                  </Label>
                                  {assignment.segunda_linea ? (
                                    <Draggable 
                                      draggableId={`assigned-${machine.id}-seg-${assignment.segunda_linea}`}
                                      index={0}
                                    >
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`p-2 bg-white rounded border cursor-grab active:cursor-grabbing transition-all ${
                                            snapshot.isDragging ? 'shadow-2xl scale-105 ring-2 ring-blue-400' : ''
                                          }`}
                                        >
                                          <div className="text-sm font-medium truncate">
                                            {getEmployeeById(assignment.segunda_linea)?.nombre}
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ) : (
                                    <div className="text-xs text-slate-400 italic p-2">Arrastra empleado aquí</div>
                                  )}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>

                            {/* Operarios */}
                            <div className="md:col-span-1">
                              <Label className="text-xs font-semibold text-slate-700 mb-2 block">
                                Operarios
                              </Label>
                              <div className="space-y-2">
                                {[1, 2, 3, 4, 5].map(num => (
                                  <Droppable key={num} droppableId={`machine-${machine.id}-operador_${num}`} type="EMPLOYEE">
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`p-2 rounded border-2 border-dashed transition-all min-h-[50px] flex items-center ${
                                          snapshot.isDraggingOver ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-300' : 'border-slate-200'
                                        }`}
                                      >
                                        <Badge variant="outline" className="mr-2 text-[10px] shrink-0">{num}</Badge>
                                        {assignment[`operador_${num}`] ? (
                                          <Draggable 
                                            draggableId={`assigned-${machine.id}-op${num}-${assignment[`operador_${num}`]}`}
                                            index={0}
                                          >
                                            {(provided, snapshot) => (
                                              <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className={`flex-1 p-1.5 bg-white rounded border cursor-grab active:cursor-grabbing transition-all ${
                                                  snapshot.isDragging ? 'shadow-2xl scale-105 ring-2 ring-blue-400' : ''
                                                }`}
                                              >
                                                <div className="text-sm font-medium truncate">
                                                  {getEmployeeById(assignment[`operador_${num}`])?.nombre}
                                                </div>
                                              </div>
                                            )}
                                          </Draggable>
                                        ) : (
                                          <span className="text-xs text-slate-400 italic">Arrastra empleado aquí</span>
                                        )}
                                        {provided.placeholder}
                                      </div>
                                    )}
                                  </Droppable>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </DragDropContext>
        </CardContent>
      </Card>
    </div>
  );
}