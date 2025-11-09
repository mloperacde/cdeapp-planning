import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, Users, GripVertical, Save } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function MachineAssignmentsPage() {
  const [selectedTeam, setSelectedTeam] = useState('team_1');
  const [machineOrder, setMachineOrder] = useState({});
  const [editingOrder, setEditingOrder] = useState(null);
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

  React.useEffect(() => {
    if (machines.length > 0) {
      const orderMap = {};
      machines.forEach((m, index) => {
        orderMap[m.id] = m.orden || (index + 1);
      });
      setMachineOrder(orderMap);
    }
  }, [machines]);

  const updateOrderMutation = useMutation({
    mutationFn: async ({ machineId, newOrder }) => {
      return base44.entities.Machine.update(machineId, { orden: newOrder });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      setEditingOrder(null);
    },
  });

  const saveAllOrdersMutation = useMutation({
    mutationFn: async (orderMap) => {
      const promises = Object.entries(orderMap).map(([id, orden]) => 
        base44.entities.Machine.update(id, { orden })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });

  const getEmployeesByRole = (machineId, role) => {
    let matchingEmployees = [];
    
    for (let i = 1; i <= 10; i++) {
      const field = `maquina_${i}`;
      const emps = employees.filter(emp => emp[field] === machineId && emp.puesto === role);
      matchingEmployees.push(...emps);
    }
    
    return matchingEmployees;
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sortedMachines = getOrderedMachines();
    const [movedMachine] = sortedMachines.splice(result.source.index, 1);
    sortedMachines.splice(result.destination.index, 0, movedMachine);

    const newOrderMap = {};
    sortedMachines.forEach((machine, index) => {
      newOrderMap[machine.id] = index + 1;
    });

    setMachineOrder(newOrderMap);
  };

  const handleSaveAllOrders = () => {
    saveAllOrdersMutation.mutate(machineOrder);
  };

  const handleOrderChange = (machineId, newValue) => {
    const newOrder = parseInt(newValue) || 1;
    setMachineOrder({
      ...machineOrder,
      [machineId]: newOrder
    });
  };

  const handleSaveOrder = (machineId) => {
    updateOrderMutation.mutate({
      machineId,
      newOrder: machineOrder[machineId]
    });
  };

  const getOrderedMachines = () => {
    return [...machines].sort((a, b) => {
      const orderA = machineOrder[a.id] || 999;
      const orderB = machineOrder[b.id] || 999;
      return orderA - orderB;
    });
  };

  const getTeamName = (teamKey) => {
    const team = teams.find(t => t.team_key === teamKey);
    return team?.team_name || 'Equipo';
  };

  const getTeamColor = (teamKey) => {
    const team = teams.find(t => t.team_key === teamKey);
    return team?.color || '#3B82F6';
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
              onClick={handleSaveAllOrders}
              variant="outline"
              disabled={saveAllOrdersMutation.isPending}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveAllOrdersMutation.isPending ? 'Guardando...' : 'Guardar Orden'}
            </Button>
          </div>

          <TabsContent value={selectedTeam} className="space-y-3">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="machines">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
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
                              className={`shadow-md border-0 bg-white/80 backdrop-blur-sm transition-all ${
                                snapshot.isDragging ? 'shadow-2xl scale-105' : ''
                              }`}
                            >
                              <CardHeader 
                                className="border-b border-slate-100 py-3 px-4"
                                style={{
                                  backgroundColor: `${getTeamColor(selectedTeam)}20`,
                                  borderColor: getTeamColor(selectedTeam)
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div {...provided.dragHandleProps} className="cursor-move">
                                    <GripVertical className="w-5 h-5 text-slate-400" />
                                  </div>
                                  <div className="flex-1 flex items-center gap-3">
                                    <span className="font-mono text-sm font-bold">{machine.codigo}</span>
                                    <span className="text-sm font-semibold">{machine.nombre}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {editingOrder === machine.id ? (
                                      <>
                                        <Input
                                          type="number"
                                          min="1"
                                          value={machineOrder[machine.id] || 1}
                                          onChange={(e) => handleOrderChange(machine.id, e.target.value)}
                                          className="w-16 h-8 text-sm"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSaveOrder(machine.id);
                                          }}
                                          disabled={updateOrderMutation.isPending}
                                          className="h-8 px-2"
                                        >
                                          <Save className="w-4 h-4" />
                                        </Button>
                                      </>
                                    ) : (
                                      <Badge 
                                        variant="outline" 
                                        className="cursor-pointer hover:bg-slate-100"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingOrder(machine.id);
                                        }}
                                      >
                                        Orden: {machineOrder[machine.id] || 1}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* Responsables de Línea */}
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-xs text-slate-700 flex items-center gap-1">
                                      <Users className="w-3 h-3 text-blue-600" />
                                      Responsables
                                    </h4>
                                    {responsables.length === 0 ? (
                                      <div className="text-xs text-slate-400 italic">Sin asignar</div>
                                    ) : (
                                      <div className="space-y-1">
                                        {responsables.map((emp) => (
                                          <div
                                            key={emp.id}
                                            className={`p-1.5 rounded border text-xs ${
                                              isEmployeeAvailable(emp.id)
                                                ? 'bg-green-50 border-green-200 text-green-900'
                                                : 'bg-red-50 border-red-300 text-red-900 font-semibold'
                                            }`}
                                          >
                                            {emp.nombre}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Segundas de Línea */}
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-xs text-slate-700 flex items-center gap-1">
                                      <Users className="w-3 h-3 text-purple-600" />
                                      Segundas
                                    </h4>
                                    {segundas.length === 0 ? (
                                      <div className="text-xs text-slate-400 italic">Sin asignar</div>
                                    ) : (
                                      <div className="space-y-1">
                                        {segundas.map((emp) => (
                                          <div
                                            key={emp.id}
                                            className={`p-1.5 rounded border text-xs ${
                                              isEmployeeAvailable(emp.id)
                                                ? 'bg-green-50 border-green-200 text-green-900'
                                                : 'bg-red-50 border-red-300 text-red-900 font-semibold'
                                            }`}
                                          >
                                            {emp.nombre}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Operadores de Línea */}
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-xs text-slate-700 flex items-center gap-1">
                                      <Users className="w-3 h-3 text-indigo-600" />
                                      Operadores
                                    </h4>
                                    {operadores.length === 0 ? (
                                      <div className="text-xs text-slate-400 italic">Sin asignar</div>
                                    ) : (
                                      <div className="grid grid-cols-2 gap-1">
                                        {operadores.slice(0, 8).map((emp) => (
                                          <div
                                            key={emp.id}
                                            className={`p-1 rounded border text-xs ${
                                              isEmployeeAvailable(emp.id)
                                                ? 'bg-green-50 border-green-200 text-green-900'
                                                : 'bg-red-50 border-red-300 text-red-900 font-semibold'
                                            }`}
                                          >
                                            {emp.nombre}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                                  <div>
                                    Total: {responsables.length + segundas.length + operadores.length}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                      <span>Disponible</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                      <span>Ausente</span>
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