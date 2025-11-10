
import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, GripVertical, User, UserCheck, Users, ArrowLeft, RefreshCw, Save, ArrowUp, ArrowDown } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function MachineAssignmentsPage() {
  const [currentTeam, setCurrentTeam] = useState("team_1");
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

  // Auto-asignar operarios basado en sus fichas de empleado
  const autoAssignOperators = () => {
    const newAssignments = {};
    const teamName = teams.find(t => t.team_key === currentTeam)?.team_name;

    machines.forEach(machine => {
      // Buscar empleados que tienen esta máquina configurada en su ficha
      const eligibleEmployees = employees.filter(emp => {
        // Solo empleados del equipo actual y disponibles
        if (emp.equipo !== teamName || emp.disponibilidad !== "Disponible") return false;

        // Verificar si tienen alguna de las 10 máquinas asignadas que coincida con esta máquina
        for (let i = 1; i <= 10; i++) {
          if (emp[`maquina_${i}`] === machine.id) {
            return true;
          }
        }
        return false;
      });

      // Clasificar por puesto
      const responsables = eligibleEmployees.filter(e => e.puesto?.toLowerCase().includes('responsable'));
      const segundas = eligibleEmployees.filter(e => e.puesto?.toLowerCase().includes('segunda'));
      const operarios = eligibleEmployees.filter(e => 
        !e.puesto?.toLowerCase().includes('responsable') && 
        !e.puesto?.toLowerCase().includes('segunda') &&
        e.puesto?.toLowerCase().includes('operari')
      );

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
    return employees.find(e => e.id === employeeId)?.nombre || "Desconocido";
  };

  const isEmployeeAvailable = (employeeId) => {
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
              Gestiona las asignaciones de empleados a máquinas por equipo
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={autoAssignOperators}
              variant="outline"
              className="border-purple-200 hover:bg-purple-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Auto-Asignar
            </Button>
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
                              <div className="flex items-center gap-2 mb-3">
                                <UserCheck className="w-5 h-5 text-green-600" />
                                <Label className="text-base font-semibold">Responsables de Línea</Label>
                                <Badge variant="outline">{assignment.responsable_linea.length}</Badge>
                              </div>
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
                                        assignment.responsable_linea.map((empId, index) => (
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
                                                <span className="text-sm flex-1">{getEmployeeName(empId)}</span>
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
                                                </div>
                                              </div>
                                            )}
                                          </Draggable>
                                        ))
                                      )}
                                      {provided.placeholder}
                                    </div>
                                  )}
                                </Droppable>
                              </DragDropContext>
                            </div>

                            {/* Segundas de Línea */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 mb-3">
                                <User className="w-5 h-5 text-blue-600" />
                                <Label className="text-base font-semibold">Segundas de Línea</Label>
                                <Badge variant="outline">{assignment.segunda_linea.length}</Badge>
                              </div>
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
                                        assignment.segunda_linea.map((empId, index) => (
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
                                                <span className="text-sm flex-1">{getEmployeeName(empId)}</span>
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
                                                </div>
                                              </div>
                                            )}
                                          </Draggable>
                                        ))
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
                                  {Object.values(assignment).filter((v, i) => i >= 2 && v !== null).length}
                                </Badge>
                              </div>
                              <div className="space-y-2 min-h-[100px] bg-slate-50 rounded-lg p-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
                                  const empId = assignment[`operador_${num}`];
                                  if (!empId) return null;

                                  return (
                                    <div
                                      key={num}
                                      className={`
                                        flex items-center gap-2 p-2 bg-white border rounded
                                        ${!isEmployeeAvailable(empId) ? 'opacity-50 bg-red-50' : ''}
                                      `}
                                    >
                                      <Badge className="text-xs px-2 py-0 bg-purple-600 text-white">
                                        Op {num}
                                      </Badge>
                                      <span className="text-sm">{getEmployeeName(empId)}</span>
                                    </div>
                                  );
                                })}
                                {Object.values(assignment).filter((v, i) => i >= 2 && v !== null).length === 0 && (
                                  <p className="text-sm text-slate-400 text-center py-4">
                                    Sin operarios asignados
                                  </p>
                                )}
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
      </div>
    </div>
  );
}
