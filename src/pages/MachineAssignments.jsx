import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tantml:react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, Users, GripVertical, Save } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function MachineAssignmentsPage() {
  const [selectedTeam, setSelectedTeam] = useState('team_1');
  const [machineOrder, setMachineOrder] = useState([]);
  const queryClient = useQueryClient();

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const { data: assignments } = useQuery({
    queryKey: ['machineAssignments', selectedTeam],
    queryFn: () => base44.entities.MachineAssignment.filter({ team_key: selectedTeam }),
    initialData: [],
  });

  React.useEffect(() => {
    if (machines.length > 0 && machineOrder.length === 0) {
      setMachineOrder(machines.map(m => m.id));
    }
  }, [machines]);

  const saveOrderMutation = useMutation({
    mutationFn: async (orderedIds) => {
      const promises = orderedIds.map((id, index) => 
        base44.entities.Machine.update(id, { orden: index + 1 })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });

  const saveAssignmentMutation = useMutation({
    mutationFn: async (data) => {
      const existing = assignments.find(a => a.machine_id === data.machine_id);
      if (existing) {
        return base44.entities.MachineAssignment.update(existing.id, data);
      }
      return base44.entities.MachineAssignment.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machineAssignments'] });
    },
  });

  const getEmployeesByRole = (machineId, role) => {
    let machineIds = [];
    
    for (let i = 1; i <= 10; i++) {
      const field = `maquina_${i}`;
      const emps = employees.filter(emp => emp[field] === machineId && emp.puesto === role);
      machineIds.push(...emps);
    }
    
    return machineIds;
  };

  const getAssignedEmployees = (machineId, field) => {
    const assignment = assignments.find(a => a.machine_id === machineId);
    if (!assignment) return [];
    
    if (field === 'responsable_linea' || field === 'segunda_linea') {
      return assignment[field] || [];
    }
    
    const operadores = [];
    for (let i = 1; i <= 8; i++) {
      if (assignment[`operador_${i}`]) {
        operadores.push(assignment[`operador_${i}`]);
      }
    }
    return operadores;
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(machineOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setMachineOrder(items);
  };

  const handleSaveOrder = () => {
    saveOrderMutation.mutate(machineOrder);
  };

  const getOrderedMachines = () => {
    return machineOrder
      .map(id => machines.find(m => m.id === id))
      .filter(m => m);
  };

  const getTeamName = (teamKey) => {
    const team = teams.find(t => t.team_key === teamKey);
    return team?.team_name || 'Equipo';
  };

  const getTeamColor = (teamKey) => {
    const team = teams.find(t => t.team_key === teamKey);
    return team?.color || '#3B82F6';
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.nombre || '';
  };

  const isEmployeeAvailable = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.disponibilidad === 'Disponible';
  };

  const orderedMachines = getOrderedMachines();

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <UserCog className="w-8 h-8 text-blue-600" />
            Asignaciones Operarios Máquinas
          </h1>
          <p className="text-slate-600 mt-1">
            Gestiona las asignaciones de personal a cada máquina por equipo
          </p>
        </div>

        <Tabs value={selectedTeam} onValueChange={setSelectedTeam} className="space-y-6">
          <div className="flex justify-between items-center">
            <TabsList className="grid w-96 grid-cols-2">
              <TabsTrigger value="team_1" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {getTeamName('team_1')}
              </TabsTrigger>
              <TabsTrigger value="team_2" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {getTeamName('team_2')}
              </TabsTrigger>
            </TabsList>
            
            <Button
              onClick={handleSaveOrder}
              variant="outline"
              disabled={saveOrderMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Orden
            </Button>
          </div>

          <TabsContent value={selectedTeam} className="space-y-4">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="machines">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4"
                  >
                    {orderedMachines.map((machine, index) => {
                      const responsables = getEmployeesByRole(machine.id, 'Responsable de línea');
                      const segundas = getEmployeesByRole(machine.id, 'Segunda de línea');
                      const operadores = getEmployeesByRole(machine.id, 'Operador de línea');

                      return (
                        <Draggable key={machine.id} draggableId={machine.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`shadow-lg border-0 bg-white/80 backdrop-blur-sm ${
                                snapshot.isDragging ? 'shadow-2xl scale-105' : ''
                              }`}
                            >
                              <CardHeader 
                                className="border-b border-slate-100"
                                style={{
                                  backgroundColor: `${getTeamColor(selectedTeam)}20`,
                                  borderColor: getTeamColor(selectedTeam)
                                }}
                              >
                                <div className="flex items-center gap-4">
                                  <div {...provided.dragHandleProps} className="cursor-move">
                                    <GripVertical className="w-6 h-6 text-slate-400" />
                                  </div>
                                  <div className="flex-1">
                                    <CardTitle className="flex items-center gap-3">
                                      <span className="font-mono text-lg">{machine.codigo}</span>
                                      <span className="text-lg">{machine.nombre}</span>
                                      <Badge variant="outline" className="ml-auto">
                                        Orden: {index + 1}
                                      </Badge>
                                    </CardTitle>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  {/* Responsables de Línea */}
                                  <div className="space-y-3">
                                    <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                                      <Users className="w-4 h-4 text-blue-600" />
                                      Responsables de Línea
                                    </h4>
                                    {responsables.length === 0 ? (
                                      <div className="text-sm text-slate-400 italic">
                                        Sin asignaciones
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {responsables.map((emp) => (
                                          <div
                                            key={emp.id}
                                            className={`p-2 rounded border text-sm ${
                                              isEmployeeAvailable(emp.id)
                                                ? 'bg-green-50 border-green-200 text-green-900'
                                                : 'bg-red-50 border-red-200 text-red-900'
                                            }`}
                                          >
                                            {emp.nombre}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Segundas de Línea */}
                                  <div className="space-y-3">
                                    <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                                      <Users className="w-4 h-4 text-purple-600" />
                                      Segundas de Línea
                                    </h4>
                                    {segundas.length === 0 ? (
                                      <div className="text-sm text-slate-400 italic">
                                        Sin asignaciones
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {segundas.map((emp) => (
                                          <div
                                            key={emp.id}
                                            className={`p-2 rounded border text-sm ${
                                              isEmployeeAvailable(emp.id)
                                                ? 'bg-green-50 border-green-200 text-green-900'
                                                : 'bg-red-50 border-red-200 text-red-900'
                                            }`}
                                          >
                                            {emp.nombre}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Operadores de Línea */}
                                  <div className="space-y-3">
                                    <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                                      <Users className="w-4 h-4 text-indigo-600" />
                                      Operadores de Línea
                                    </h4>
                                    {operadores.length === 0 ? (
                                      <div className="text-sm text-slate-400 italic">
                                        Sin asignaciones
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-2 gap-2">
                                        {operadores.slice(0, 8).map((emp) => (
                                          <div
                                            key={emp.id}
                                            className={`p-2 rounded border text-xs ${
                                              isEmployeeAvailable(emp.id)
                                                ? 'bg-green-50 border-green-200 text-green-900'
                                                : 'bg-red-50 border-red-200 text-red-900'
                                            }`}
                                          >
                                            {emp.nombre}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600">
                                  <div>
                                    Total asignados: {responsables.length + segundas.length + operadores.length}
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                      <span>Disponible</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                      <span>No disponible</span>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}