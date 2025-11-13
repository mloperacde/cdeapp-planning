
import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCog, GripVertical, User, UserCheck, Users, ArrowLeft, RefreshCw, Save, ArrowUp, ArrowDown, Factory, Wrench, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function MachineAssignmentsPage() {
  const [currentTeam, setCurrentTeam] = useState("team_1");
  const [selectedDepartment, setSelectedDepartment] = useState("FABRICACION");
  const [assignments, setAssignments] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  const { data: machines, isLoading: loadingMachines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const { data: machineAssignments } = useQuery({
    queryKey: ['machineAssignments'],
    queryFn: () => base44.entities.MachineAssignment.list(),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  // Filtrar empleados según departamento seleccionado
  const filteredEmployees = useMemo(() => {
    if (selectedDepartment === "FABRICACION") {
      const validPositions = ['responsable de linea', 'segunda de linea', 'operaria de linea'];
      
      return employees.filter(emp => {
        if (emp.departamento !== "FABRICACION") return false;
        if (emp.disponibilidad !== "Disponible") return false;
        if (emp.incluir_en_planning === false) return false;
        
        const puesto = (emp.puesto || '').toLowerCase();
        return validPositions.some(vp => puesto.includes(vp));
      });
    } else if (selectedDepartment === "MANTENIMIENTO") {
      return employees.filter(emp => {
        if (emp.departamento !== "MANTENIMIENTO") return false;
        if (emp.disponibilidad !== "Disponible") return false;
        if (emp.incluir_en_planning === false) return false;
        return true;
      });
    }
    return [];
  }, [employees, selectedDepartment]);

  const saveAssignmentsMutation = useMutation({
    mutationFn: async (assignmentsData) => {
      const promises = Object.entries(assignmentsData).map(([machineId, data]) => {
        const existing = machineAssignments.find(
          a => a.machine_id === machineId && a.team_key === currentTeam
        );

        if (existing) {
          return base44.entities.MachineAssignment.update(existing.id, {
            ...data,
            machine_id: machineId,
            team_key: currentTeam,
          });
        }
        return base44.entities.MachineAssignment.create({
          ...data,
          machine_id: machineId,
          team_key: currentTeam,
        });
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machineAssignments'] });
      setHasChanges(false);
    },
  });

  // Auto-asignar operarios basado en sus fichas de empleado - SOLO FABRICACIÓN
  const autoAssignOperators = () => {
    if (selectedDepartment !== "FABRICACION") return;
    
    const newAssignments = {};
    const teamName = teams.find(t => t.team_key === currentTeam)?.team_name;

    machines.forEach(machine => {
      const eligibleEmployees = filteredEmployees.filter(emp => {
        if (emp.equipo !== teamName) return false;

        for (let i = 1; i <= 10; i++) {
          if (emp[`maquina_${i}`] === machine.id) {
            return true;
          }
        }
        return false;
      });

      const responsables = eligibleEmployees.filter(e => e.puesto?.toLowerCase().includes('responsable de linea'));
      const segundas = eligibleEmployees.filter(e => e.puesto?.toLowerCase().includes('segunda de linea'));
      const operarios = eligibleEmployees.filter(e => e.puesto?.toLowerCase().includes('operaria de linea'));

      newAssignments[machine.id] = {
        responsable_linea: responsables.map(e => e.id),
        segunda_linea: segundas.map(e => e.id),
        operador_1: operarios[0]?.id || null,
        operador_2: operarios[1]?.id || null,
        operador_3: operarios[2]?.id || null,
        operador_4: operarios[3]?.id || null,
        operador_5: operarios[4]?.id || null,
        operador_6: operarios[5]?.id || null,
        operador_7: operarios[6]?.id || null,
        operador_8: operarios[7]?.id || null,
      };
    });

    setAssignments(newAssignments);
    setHasChanges(true);
  };

  // Cargar asignaciones existentes
  useEffect(() => {
    const loadedAssignments = {};
    machines.forEach(machine => {
      const existing = machineAssignments.find(
        a => a.machine_id === machine.id && a.team_key === currentTeam
      );

      if (existing) {
        loadedAssignments[machine.id] = {
          responsable_linea: existing.responsable_linea || [],
          segunda_linea: existing.segunda_linea || [],
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
        loadedAssignments[machine.id] = {
          responsable_linea: [],
          segunda_linea: [],
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

    setAssignments(loadedAssignments);
  }, [machines, machineAssignments, currentTeam]);

  const handleSave = () => {
    saveAssignmentsMutation.mutate(assignments);
  };

  const getEmployeeName = (employeeId) => {
    if (!employeeId) return null;
    return employees.find(e => e.id === employeeId)?.nombre || "Desconocido";
  };

  const isEmployeeAvailable = (employeeId) => {
    if (!employeeId) return true;
    return employees.find(e => e.id === employeeId)?.disponibilidad === "Disponible";
  };

  const handleDragEnd = (result, machineId, role) => {
    if (!result.destination) return;

    const assignment = assignments[machineId];
    const items = Array.from(assignment[role]);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setAssignments({
      ...assignments,
      [machineId]: {
        ...assignment,
        [role]: items,
      }
    });
    setHasChanges(true);
  };

  const moveUp = (machineId, role, index) => {
    if (index === 0) return;

    const assignment = assignments[machineId];
    const items = [...assignment[role]];
    [items[index - 1], items[index]] = [items[index], items[index - 1]];

    setAssignments({
      ...assignments,
      [machineId]: {
        ...assignment,
        [role]: items,
      }
    });
    setHasChanges(true);
  };

  const moveDown = (machineId, role, index) => {
    const assignment = assignments[machineId];
    if (index >= assignment[role].length - 1) return;

    const items = [...assignment[role]];
    [items[index], items[index + 1]] = [items[index + 1], items[index]];

    setAssignments({
      ...assignments,
      [machineId]: {
        ...assignment,
        [role]: items,
      }
    });
    setHasChanges(true);
  };

  const getTeamColor = (teamKey) => {
    const team = teams.find(t => t.team_key === teamKey);
    return team?.color || '#3B82F6';
  };

  // Obtener máquinas de mantenimiento con prioridad para un empleado
  const getMaintenanceMachinesForEmployee = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return [];

    const machinesWithPriority = [];
    for (let i = 1; i <= 20; i++) {
      const machineId = emp[`maquina_mantenimiento_${i}`];
      const priority = emp[`prioridad_mantenimiento_${i}`];
      if (machineId) {
        const machine = machines.find(m => m.id === machineId);
        if (machine) {
          machinesWithPriority.push({
            machine,
            priority: priority || 0
          });
        }
      }
    }

    return machinesWithPriority.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  };

  // Funciones para asignación manual
  const handleAddToRole = (machineId, role, employeeId) => {
    const assignment = assignments[machineId];
    const currentList = assignment[role] || [];
    
    if (!currentList.includes(employeeId)) {
      setAssignments({
        ...assignments,
        [machineId]: {
          ...assignment,
          [role]: [...currentList, employeeId]
        }
      });
      setHasChanges(true);
    }
  };

  const handleRemoveFromRole = (machineId, role, index) => {
    const assignment = assignments[machineId];
    const newList = [...assignment[role]];
    newList.splice(index, 1);
    
    setAssignments({
      ...assignments,
      [machineId]: {
        ...assignment,
        [role]: newList
      }
    });
    setHasChanges(true);
  };

  const handleSetOperator = (machineId, operatorNum, employeeId) => {
    const assignment = assignments[machineId];
    
    setAssignments({
      ...assignments,
      [machineId]: {
        ...assignment,
        [`operador_${operatorNum}`]: employeeId || null
      }
    });
    setHasChanges(true);
  };

  // Obtener empleados disponibles para cada rol
  const getAvailableEmployeesForRole = (machineId, role) => {
    const teamName = teams.find(t => t.team_key === currentTeam)?.team_name;
    
    if (role === 'responsable_linea') {
      return filteredEmployees.filter(e => 
        e.puesto?.toLowerCase().includes('responsable de linea') && 
        e.equipo === teamName
      );
    } else if (role === 'segunda_linea') {
      return filteredEmployees.filter(e => 
        e.puesto?.toLowerCase().includes('segunda de linea') && 
        e.equipo === teamName
      );
    } else {
      // Para operarios, filtrar los que tienen la máquina en su configuración
      return filteredEmployees.filter(emp => {
        if (!emp.puesto?.toLowerCase().includes('operaria de linea')) return false;
        if (emp.equipo !== teamName) return false;
        
        // Verificar si tiene esta máquina en su configuración
        for (let i = 1; i <= 10; i++) {
          if (emp[`maquina_${i}`] === machineId) {
            return true;
          }
        }
        return false;
      });
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("ShiftManagers")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Jefes de Turno
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <UserCog className="w-8 h-8 text-blue-600" />
              Asignaciones de Operarios a Máquinas
            </h1>
            <p className="text-slate-600 mt-1">
              Distribuye personal por departamento y equipo
            </p>
          </div>
          <div className="flex gap-2">
            {selectedDepartment === "FABRICACION" && (
              <Button
                onClick={autoAssignOperators}
                variant="outline"
                className="border-purple-200 hover:bg-purple-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Auto-Asignar
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saveAssignmentsMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveAssignmentsMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>

        {hasChanges && (
          <Card className="mb-6 bg-amber-50 border-2 border-amber-300">
            <CardContent className="p-4">
              <p className="text-sm text-amber-800">
                <strong>⚠️ Hay cambios sin guardar.</strong> Recuerda hacer clic en "Guardar Cambios" para aplicar las asignaciones.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Selector de Departamento */}
        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Label className="text-base font-semibold">Departamento:</Label>
              <div className="flex gap-3">
                <Button
                  variant={selectedDepartment === "FABRICACION" ? "default" : "outline"}
                  onClick={() => setSelectedDepartment("FABRICACION")}
                  className={selectedDepartment === "FABRICACION" ? "bg-blue-600" : ""}
                >
                  <Factory className="w-4 h-4 mr-2" />
                  Fabricación
                </Button>
                <Button
                  variant={selectedDepartment === "MANTENIMIENTO" ? "default" : "outline"}
                  onClick={() => setSelectedDepartment("MANTENIMIENTO")}
                  className={selectedDepartment === "MANTENIMIENTO" ? "bg-orange-600" : ""}
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  Mantenimiento
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vista para FABRICACION */}
        {selectedDepartment === "FABRICACION" && (
          <>
            <Card className="mb-6 bg-blue-50 border-2 border-blue-300">
              <CardContent className="p-4">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Información:</strong> Solo se mostrarán empleados del departamento FABRICACIÓN con los puestos: 
                  Responsable de línea, Segunda de línea y Operaria de línea.
                </p>
              </CardContent>
            </Card>

            <Tabs value={currentTeam} onValueChange={setCurrentTeam} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                {teams.map((team) => (
                  <TabsTrigger
                    key={team.team_key}
                    value={team.team_key}
                    style={{ borderColor: getTeamColor(team.team_key) }}
                    className="data-[state=active]:border-b-4"
                  >
                    {team.team_name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {teams.map((team) => (
                <TabsContent key={team.team_key} value={team.team_key}>
                  <div className="space-y-4">
                    {loadingMachines ? (
                      <div className="p-12 text-center text-slate-500">Cargando máquinas...</div>
                    ) : (
                      machines.map((machine) => {
                        const assignment = assignments[machine.id] || {
                          responsable_linea: [],
                          segunda_linea: [],
                          operador_1: null,
                          operador_2: null,
                          operador_3: null,
                          operador_4: null,
                          operador_5: null,
                          operador_6: null,
                          operador_7: null,
                          operador_8: null,
                        };

                        const responsables = getAvailableEmployeesForRole(machine.id, 'responsable_linea');
                        const segundas = getAvailableEmployeesForRole(machine.id, 'segunda_linea');
                        const operarios = getAvailableEmployeesForRole(machine.id, 'operador');

                        return (
                          <Card key={machine.id} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                            <CardHeader className="border-b border-slate-100">
                              <CardTitle className="flex items-center justify-between">
                                <div>
                                  <span className="text-xl">{machine.nombre}</span>
                                  <span className="text-sm text-slate-500 ml-3">{machine.codigo}</span>
                                </div>
                                <Badge className={
                                  machine.estado === "Disponible"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }>
                                  {machine.estado}
                                </Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Responsables de Línea */}
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <UserCheck className="w-5 h-5 text-green-600" />
                                      <Label className="text-base font-semibold">Responsables de Línea</Label>
                                      <Badge variant="outline">{assignment.responsable_linea.length}</Badge>
                                    </div>
                                  </div>

                                  {/* Selector Manual */}
                                  <Select 
                                    onValueChange={(value) => handleAddToRole(machine.id, 'responsable_linea', value)}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="+ Añadir responsable" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {responsables.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                          {emp.nombre}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <DragDropContext onDragEnd={(result) => handleDragEnd(result, machine.id, 'responsable_linea')}>
                                    <Droppable droppableId={`responsables-${machine.id}`}>
                                      {(provided) => (
                                        <div
                                          {...provided.droppableProps}
                                          ref={provided.innerRef}
                                          className="space-y-2 min-h-[100px] bg-slate-50 rounded-lg p-3"
                                        >
                                          {assignment.responsable_linea.length === 0 ? (
                                            <p className="text-sm text-slate-400 text-center py-4">
                                              Sin responsables asignados
                                            </p>
                                          ) : (
                                            assignment.responsable_linea.map((empId, index) => {
                                              const empName = getEmployeeName(empId);
                                              
                                              return (
                                                <Draggable key={empId} draggableId={`resp-${empId}-${machine.id}`} index={index}>
                                                  {(provided, snapshot) => (
                                                    <div
                                                      ref={provided.innerRef}
                                                      {...provided.draggableProps}
                                                      className={`
                                                        flex items-center gap-2 p-2 bg-white border rounded
                                                        ${snapshot.isDragging ? 'shadow-lg' : ''}
                                                        ${!isEmployeeAvailable(empId) ? 'opacity-50 bg-red-50' : ''}
                                                      `}
                                                    >
                                                      <div {...provided.dragHandleProps}>
                                                        <GripVertical className="w-4 h-4 text-slate-400" />
                                                      </div>
                                                      <Badge className="text-xs px-2 py-0 bg-green-600 text-white">
                                                        {index + 1}
                                                      </Badge>
                                                      <span className="text-sm flex-1">{empName}</span>
                                                      <div className="flex gap-1">
                                                        <Button
                                                          size="icon"
                                                          variant="ghost"
                                                          className="h-6 w-6"
                                                          onClick={() => moveUp(machine.id, 'responsable_linea', index)}
                                                          disabled={index === 0}
                                                        >
                                                          <ArrowUp className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                          size="icon"
                                                          variant="ghost"
                                                          className="h-6 w-6"
                                                          onClick={() => moveDown(machine.id, 'responsable_linea', index)}
                                                          disabled={index >= assignment.responsable_linea.length - 1}
                                                        >
                                                          <ArrowDown className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                          size="icon"
                                                          variant="ghost"
                                                          className="h-6 w-6 text-red-600 hover:bg-red-50"
                                                          onClick={() => handleRemoveFromRole(machine.id, 'responsable_linea', index)}
                                                        >
                                                          <X className="w-3 h-3" />
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  )}
                                                </Draggable>
                                              );
                                            })
                                          )}
                                          {provided.placeholder}
                                        </div>
                                      )}
                                    </Droppable>
                                  </DragDropContext>
                                </div>

                                {/* Segundas de Línea */}
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <User className="w-5 h-5 text-blue-600" />
                                      <Label className="text-base font-semibold">Segundas de Línea</Label>
                                      <Badge variant="outline">{assignment.segunda_linea.length}</Badge>
                                    </div>
                                  </div>

                                  {/* Selector Manual */}
                                  <Select 
                                    onValueChange={(value) => handleAddToRole(machine.id, 'segunda_linea', value)}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="+ Añadir segunda" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {segundas.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                          {emp.nombre}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <DragDropContext onDragEnd={(result) => handleDragEnd(result, machine.id, 'segunda_linea')}>
                                    <Droppable droppableId={`segundas-${machine.id}`}>
                                      {(provided) => (
                                        <div
                                          {...provided.droppableProps}
                                          ref={provided.innerRef}
                                          className="space-y-2 min-h-[100px] bg-slate-50 rounded-lg p-3"
                                        >
                                          {assignment.segunda_linea.length === 0 ? (
                                            <p className="text-sm text-slate-400 text-center py-4">
                                              Sin segundas asignadas
                                            </p>
                                          ) : (
                                            assignment.segunda_linea.map((empId, index) => {
                                              const empName = getEmployeeName(empId);
                                              
                                              return (
                                                <Draggable key={empId} draggableId={`seg-${empId}-${machine.id}`} index={index}>
                                                  {(provided, snapshot) => (
                                                    <div
                                                      ref={provided.innerRef}
                                                      {...provided.draggableProps}
                                                      className={`
                                                        flex items-center gap-2 p-2 bg-white border rounded
                                                        ${snapshot.isDragging ? 'shadow-lg' : ''}
                                                        ${!isEmployeeAvailable(empId) ? 'opacity-50 bg-red-50' : ''}
                                                      `}
                                                    >
                                                      <div {...provided.dragHandleProps}>
                                                        <GripVertical className="w-4 h-4 text-slate-400" />
                                                      </div>
                                                      <Badge className="text-xs px-2 py-0 bg-blue-600 text-white">
                                                        {index + 1}
                                                      </Badge>
                                                      <span className="text-sm flex-1">{empName}</span>
                                                      <div className="flex gap-1">
                                                        <Button
                                                          size="icon"
                                                          variant="ghost"
                                                          className="h-6 w-6"
                                                          onClick={() => moveUp(machine.id, 'segunda_linea', index)}
                                                          disabled={index === 0}
                                                        >
                                                          <ArrowUp className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                          size="icon"
                                                          variant="ghost"
                                                          className="h-6 w-6"
                                                          onClick={() => moveDown(machine.id, 'segunda_linea', index)}
                                                          disabled={index >= assignment.segunda_linea.length - 1}
                                                        >
                                                          <ArrowDown className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                          size="icon"
                                                          variant="ghost"
                                                          className="h-6 w-6 text-red-600 hover:bg-red-50"
                                                          onClick={() => handleRemoveFromRole(machine.id, 'segunda_linea', index)}
                                                        >
                                                          <X className="w-3 h-3" />
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  )}
                                                </Draggable>
                                              );
                                            })
                                          )}
                                          {provided.placeholder}
                                        </div>
                                      )}
                                    </Droppable>
                                  </DragDropContext>
                                </div>

                                {/* Operarios */}
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Users className="w-5 h-5 text-purple-600" />
                                    <Label className="text-base font-semibold">Operarios</Label>
                                    <Badge variant="outline">
                                      {Object.entries(assignment).filter(([k, v]) => k.startsWith('operador_') && v !== null).length}
                                    </Badge>
                                  </div>
                                  <div className="space-y-2 min-h-[100px] bg-slate-50 rounded-lg p-3">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
                                      const empId = assignment[`operador_${num}`];
                                      
                                      return (
                                        <div key={num} className="space-y-1">
                                          <Select
                                            value={empId || "empty"}
                                            onValueChange={(value) => handleSetOperator(machine.id, num, value === "empty" ? null : value)}
                                          >
                                            <SelectTrigger className="w-full">
                                              <SelectValue placeholder={`Operario ${num}`} />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="empty">Sin asignar</SelectItem>
                                              {operarios.map((emp) => (
                                                <SelectItem key={emp.id} value={emp.id}>
                                                  {emp.nombre}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          
                                          {empId && (
                                            <div className={`
                                              flex items-center gap-2 p-2 bg-white border rounded
                                              ${!isEmployeeAvailable(empId) ? 'opacity-50 bg-red-50' : ''}
                                            `}>
                                              <Badge className="text-xs px-2 py-0 bg-purple-600 text-white">
                                                Op {num}
                                              </Badge>
                                              <span className="text-sm flex-1">{getEmployeeName(empId)}</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}

        {/* Vista para MANTENIMIENTO */}
        {selectedDepartment === "MANTENIMIENTO" && (
          <>
            <Card className="mb-6 bg-orange-50 border-2 border-orange-300">
              <CardContent className="p-4">
                <p className="text-sm text-orange-800">
                  <strong>ℹ️ Información:</strong> Vista de empleados del departamento MANTENIMIENTO. 
                  Las asignaciones de máquinas y prioridades se configuran en la ficha individual de cada empleado.
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map((emp) => {
                const machinesWithPriority = getMaintenanceMachinesForEmployee(emp.id);
                
                return (
                  <Card key={emp.id} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                    <CardHeader className="border-b border-slate-100">
                      <CardTitle className="text-lg">{emp.nombre}</CardTitle>
                      <p className="text-sm text-slate-600">{emp.puesto}</p>
                    </CardHeader>
                    <CardContent className="p-4">
                      {machinesWithPriority.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">
                          Sin máquinas asignadas
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {machinesWithPriority.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{item.machine.nombre}</p>
                                <p className="text-xs text-slate-500">{item.machine.codigo}</p>
                              </div>
                              <Badge className="bg-orange-600">
                                Prioridad {item.priority}
                              </Badge>
                            </div>
                          ))}
                          {machinesWithPriority.length > 5 && (
                            <p className="text-xs text-slate-500 text-center">
                              +{machinesWithPriority.length - 5} máquinas más
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
