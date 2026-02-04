import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppData } from "../components/data/DataProvider";
import { useShiftConfig } from "@/hooks/useShiftConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Calendar as CalendarIcon, 
  Users, 
  Save,
  UserCheck,
  User as UserIcon,
  Cog,
  Search,
  History
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import * as ReactWindow from 'react-window';
import { AutoSizer } from "react-virtualized-auto-sizer";
import { getMachineAlias } from "@/utils/machineAlias";

const List = ReactWindow.FixedSizeList || ReactWindow.default?.FixedSizeList;

const EmployeeRow = ({ index, style, data }) => {
  const emp = data[index];
  if (!emp) return null;
  
  return (
    <Draggable draggableId={emp.id.toString()} index={index} key={emp.id}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{ 
            ...style, 
            ...provided.draggableProps.style,
            left: (style.left || 0) + 4,
            top: (style.top || 0) + 4,
            width: (style.width || 0) - 8,
            height: (style.height || 0) - 8
          }}
          className={`p-3 rounded-lg border bg-white hover:border-blue-400 transition-all cursor-grab active:cursor-grabbing ${
            snapshot.isDragging ? 'shadow-2xl border-blue-500 ring-2 ring-blue-300 z-50' : 'border-slate-200'
          }`}
        >
           <div className="text-sm font-medium truncate">{emp.nombre}</div>
           <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
             {emp.puesto && <Badge variant="secondary" className="text-[10px] h-4 px-1">{emp.puesto}</Badge>}
             {emp.equipo && <span>• {emp.equipo}</span>}
             {emp.isSkilled && <Badge variant="outline" className="text-[10px] h-4 px-1 border-yellow-500 text-yellow-600">Skilled</Badge>}
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default function ShiftPlanningPage() {
  const { shifts } = useShiftConfig();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState("Mañana"); // Will update via effect if needed
  const [selectedTeam, setSelectedTeam] = useState("all");

  // Sync selectedShift with config when loaded
  useEffect(() => {
    if (shifts.MORNING && selectedShift === "Mañana" && shifts.MORNING !== "Mañana") {
        setSelectedShift(shifts.MORNING);
    }
  }, [shifts, selectedShift]);

  const [searchTerm, setSearchTerm] = useState("");
  const [assignments, setAssignments] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  
  const queryClient = useQueryClient();

  // Usar DataProvider para datos compartidos
  const { employees = [], teams = [], machines = [] } = useAppData();

  const EMPTY_ARRAY = [];

  const { data: machineAssignments = EMPTY_ARRAY } = useQuery({
    queryKey: ['machineAssignments'],
    queryFn: () => base44.entities.MachineAssignment.list(),
  });

  const { data: dailyStaffing = EMPTY_ARRAY } = useQuery({
    queryKey: ['dailyStaffing', format(selectedDate, 'yyyy-MM-dd'), selectedShift, selectedTeam],
    queryFn: () => {
      const filters = {
        date: format(selectedDate, 'yyyy-MM-dd'),
        shift: selectedShift
      };
      if (selectedTeam !== "all") {
        // Resolve team_key from selectedTeam (which is an ID)
        const teamObj = teams.find(t => String(t.id) === String(selectedTeam));
        if (teamObj) {
            filters.team_key = teamObj.team_key;
        } else {
            // Fallback
            filters.team_key = selectedTeam;
        }
      }
      return base44.entities.DailyMachineStaffing.filter(filters);
    },
  });

  const { data: savedPlannings = EMPTY_ARRAY } = useQuery({
    queryKey: ['savedPlanningsHistory'],
    queryFn: () => base44.entities.DailyMachineStaffing.list('-created_date', 100),
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

  const getTeamForShift = (_shift, _teamKey) => {
    // Match shift to team (simple logic, can be enhanced)
    return true; // For now, show all teams
  };

  const { data: teamSchedules = [] } = useQuery({
    queryKey: ['teamWeekSchedules'],
    queryFn: () => base44.entities.TeamWeekSchedule.list(undefined, 2000),
  });

  // Helper to determine team for current date/shift if "all" is selected
  const inferTeamForShift = (date, shift) => {
      const defaultTeam = teams.length > 0 ? teams[0].team_key : "team_1";
      if (!teamSchedules.length) return defaultTeam; // Fallback
      
      const startOfWeekDate = new Date(date);
      const day = startOfWeekDate.getDay();
      const diff = startOfWeekDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
      startOfWeekDate.setDate(diff);
      const weekStartStr = format(startOfWeekDate, 'yyyy-MM-dd');

      const schedule = teamSchedules.find(s => 
          s.fecha_inicio_semana === weekStartStr && 
          s.turno === shift
      );
      
      return schedule ? schedule.team_key : defaultTeam;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const promises = [];

      // Infer team once if "all" is selected to ensure consistency for this batch
      let inferredKey = null;
      if (selectedTeam !== "all") {
         const teamObj = teams.find(t => String(t.id) === String(selectedTeam));
         inferredKey = teamObj ? teamObj.team_key : selectedTeam;
      } else {
         inferredKey = inferTeamForShift(selectedDate, selectedShift);
      }

      for (const [machineId, data] of Object.entries(assignments)) {
        const existing = dailyStaffing.find(ds => ds.machine_id === machineId);
        
        // Determinar team_key
        let teamKey = inferredKey;
        
        // If existing record has a team_key, maybe we should respect it? 
        // But if we are overwriting, we might want to update the team too if it was wrong?
        // Usually, for a specific date/shift, the team is fixed.
        if (existing && existing.team_key) {
            teamKey = existing.team_key;
        }

        const payload = {
          date: dateStr,
          shift: selectedShift,
          team_key: teamKey,
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
      queryClient.invalidateQueries({ queryKey: ['savedPlanningsHistory'] });
      toast.success(`Planificación guardada: ${format(selectedDate, 'dd/MM/yyyy')} - ${selectedShift}`);
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

    const normalize = (str) => str ? str.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    
    // Unified Availability Logic
    return employees.filter(e => {
      // 1. Assigned Check
      if (assignedIds.has(e.id)) return false;

      // 2. Department: Fabricación
      if (normalize(e.departamento) !== "fabricacion") return false;

      // 3. Availability: Disponible
      if (normalize(e.disponibilidad) !== "disponible") return false;

      // 4. Role (Puesto)
      const currentPuesto = normalize(e.puesto);
      const allowedRoles = [
        'responsable de linea', 
        'segunda de linea', 
        'operario de linea',
        'operaria de linea'
      ].map(normalize);
      
      // Flexible match (includes) or exact? User said "puestos ...". Let's use includes for safety or exact if normalized.
      // Given previous logic used includes in DailyPlanning, let's stick to exact match against list for robustness,
      // or check if any allowed role is contained.
      // DailyPlanning used exact inclusion in list. I'll do the same.
      if (!allowedRoles.includes(currentPuesto)) return false;

      // 5. Absence Check
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

      // 6. Team Filter
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
      
      // 7. Search Term
      if (searchTerm) {
        const lower = normalize(searchTerm);
        return normalize(e.nombre).includes(lower);
      }
      
      return true;
    });
  };

  const availableEmployees = getAvailableEmployees();

  const getEmployeeById = (id) => employees.find(e => e.id === id);

  const groupedHistory = useMemo(() => {
    const grouped = {};
    savedPlannings.forEach(plan => {
      const key = `${plan.date}_${plan.shift}`;
      if (!grouped[key]) {
        grouped[key] = {
          date: plan.date,
          shift: plan.shift,
          count: 0,
          latest: plan.created_date
        };
      }
      grouped[key].count++;
    });
    return Object.values(grouped).sort((a, b) => 
      new Date(b.latest) - new Date(a.latest)
    );
  }, [savedPlannings]);

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-[1800px] mx-auto">
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-600" />
                  Planificación de Turnos
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Asigna empleados a máquinas - {format(selectedDate, "dd/MM/yyyy")} - {selectedShift} - {selectedTeam === "all" ? "Todos" : teams.find(t => String(t.id) === String(selectedTeam))?.team_name}
                </p>
              </div>

              <Button 
                variant="outline"
                onClick={() => setShowHistory(!showHistory)}
                className="gap-2"
              >
                <History className="w-4 h-4" />
                {showHistory ? "Ocultar" : "Ver"} Historial
              </Button>
            </div>

            {/* Filtros y controles */}
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
                  <SelectItem value={shifts.MORNING || "Mañana"}>☀️ {shifts.MORNING || "Mañana"}</SelectItem>
                  <SelectItem value={shifts.AFTERNOON || "Tarde"}>🌅 {shifts.AFTERNOON || "Tarde"}</SelectItem>
                  {shifts.NIGHT && <SelectItem value={shifts.NIGHT}>🌙 {shifts.NIGHT}</SelectItem>}
                </SelectContent>
              </Select>

              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Seleccionar equipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Equipos</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.team_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar empleado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Button 
                onClick={() => saveMutation.mutate()}
                className="bg-green-600 hover:bg-green-700"
                disabled={saveMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {showHistory && (
            <Card className="mb-6 bg-slate-50 border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Historial de Planificaciones ({groupedHistory.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {groupedHistory.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-3 bg-white rounded border hover:border-blue-300 cursor-pointer"
                      onClick={() => {
                        setSelectedDate(new Date(item.date));
                        setSelectedShift(item.shift);
                        setShowHistory(false);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <CalendarIcon className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="font-medium text-sm">
                            {format(new Date(item.date), "dd/MM/yyyy", { locale: es })} - {item.shift}
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.count} asignación{item.count > 1 ? 'es' : ''}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">{format(new Date(item.latest), "dd/MM HH:mm")}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
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
                   {searchTerm && (
                     <p className="text-xs text-slate-500 mt-1">
                       Buscando: "{searchTerm}"
                     </p>
                   )}
                  </CardHeader>
                  <CardContent className="h-[600px] p-0">
                   <Droppable 
                      droppableId="unassigned-pool" 
                      type="EMPLOYEE" 
                      mode="virtual"
                      renderClone={(provided, snapshot, rubric) => {
                        const emp = availableEmployees[rubric.source.index];
                        return (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="p-3 rounded-lg border bg-white shadow-2xl border-blue-500 scale-105 ring-2 ring-blue-300 z-50"
                            style={provided.draggableProps.style}
                          >
                             <div className="text-sm font-medium truncate">{emp?.nombre}</div>
                             <div className="text-xs text-slate-500 flex items-center gap-1">
                               {emp?.puesto && <Badge variant="secondary" className="text-[10px] h-4 px-1">{emp.puesto}</Badge>}
                               {emp?.equipo && <span>• {emp?.equipo}</span>}
                            </div>
                          </div>
                        );
                      }}
                   >
                     {(provided, snapshot) => (
                       <div 
                         ref={provided.innerRef}
                         className={`h-full w-full transition-all ${
                           snapshot.isDraggingOver ? 'bg-blue-50/50' : ''
                         }`}
                       >
                        <AutoSizer>
                          {({ height, width }) => (
                            <List
                              height={height}
                              itemCount={availableEmployees.length}
                              itemSize={70}
                              width={width}
                              outerRef={provided.innerRef}
                              itemData={availableEmployees}
                            >
                              {EmployeeRow}
                            </List>
                          )}
                        </AutoSizer>
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
                              <CardTitle className="text-lg" title={getMachineAlias(machine)}>
                                {getMachineAlias(machine)}
                              </CardTitle>
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
