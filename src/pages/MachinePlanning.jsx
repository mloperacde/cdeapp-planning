import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarRange, Power, PowerOff, Settings, GripVertical, Sparkles, ArrowLeft, Calendar as CalendarIcon, AlertTriangle, Users } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { notifyMachinePlanningChange } from "../components/notifications/NotificationService";
import ProductionMonitor from "../components/machines/ProductionMonitor";

export default function MachinePlanningPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTeam, setSelectedTeam] = useState('team_1');
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [isCalling, setIsCalling] = useState(false);
  const [viewMode, setViewMode] = useState('day');
  const [currentTab, setCurrentTab] = useState('list');
  const [agentResult, setAgentResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: machines, isLoading: loadingMachines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
    initialData: [],
    staleTime: 5 * 60 * 1000,
  });

  const { data: machineStatuses = [] } = useQuery({
    queryKey: ['machineStatuses'],
    queryFn: () => base44.entities.MachineStatus.list(),
    staleTime: 1 * 60 * 1000,
  });

  const getMachineStatus = (machineId) => {
    return machineStatuses.find(ms => ms.machine_id === machineId) || {
      estado_disponibilidad: "Disponible",
      estado_produccion: "Sin orden"
    };
  };

  const { data: processes } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.list('nombre'),
    initialData: [],
    staleTime: 10 * 60 * 1000,
  });

  const { data: machineProcesses } = useQuery({
    queryKey: ['machineProcesses'],
    queryFn: () => base44.entities.MachineProcess.list(),
    initialData: [],
    staleTime: 5 * 60 * 1000,
  });

  const { data: plannings } = useQuery({
    queryKey: ['machinePlannings', selectedDate, selectedTeam],
    queryFn: () => base44.entities.MachinePlanning.filter({
      team_key: selectedTeam,
      fecha_planificacion: selectedDate
    }),
    initialData: [],
    staleTime: 2 * 60 * 1000,
  });

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
    staleTime: 10 * 60 * 1000,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
    staleTime: 5 * 60 * 1000,
  });

  const savePlanningMutation = useMutation({
    mutationFn: async (data) => {
      const existing = plannings.find(
        p => p.machine_id === data.machine_id &&
        p.team_key === data.team_key &&
        p.fecha_planificacion === data.fecha_planificacion
      );

      let result;
      if (existing) {
        result = await base44.entities.MachinePlanning.update(existing.id, data);
      } else {
        result = await base44.entities.MachinePlanning.create(data);
      }

      return result;
    },
    onSuccess: async (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['machinePlannings'] });
      
      // Notificaciones en segundo plano (no bloqueantes)
      const teamName = teams.find(t => t.team_key === variables.team_key)?.team_name;
      if (teamName) {
        const teamEmployees = employees.filter(e => e.equipo === teamName);
        const employeeIds = teamEmployees.map(e => e.id);
        
        notifyMachinePlanningChange(
          variables.machine_id,
          variables.team_key,
          variables.activa_planning,
          employeeIds
        ).catch(err => console.error('Error al enviar notificaciones:', err));
      }
    },
  });

  const updateMachineOrderMutation = useMutation({
    mutationFn: ({ machineId, newOrder }) =>
      base44.entities.Machine.update(machineId, { orden: newOrder }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(machines);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    items.forEach((machine, index) => {
      if (machine.orden !== index + 1) {
        updateMachineOrderMutation.mutate({
          machineId: machine.id,
          newOrder: index + 1
        });
      }
    });
  };

  const handleTogglePlanning = (machine) => {
    const planning = getPlanningForMachine(machine.id);

    // Verificar operarios disponibles antes de activar
    if (!planning?.activa_planning) {
      const currentActiveMachines = plannings.filter(
        p => p.activa_planning &&
        p.team_key === selectedTeam &&
        p.fecha_planificacion === selectedDate &&
        p.machine_id !== machine.id
      );

      const currentTotalOperators = currentActiveMachines.reduce((sum, p) => sum + (p.operadores_necesarios || 0), 0);

      // Necesitamos saber cuántos operadores necesita esta máquina
      const machineProcess = machineProcesses.find(mp => mp.machine_id === machine.id);
      const neededOperators = machineProcess?.operadores_requeridos || 1;

      if (currentTotalOperators + neededOperators > availableOperators) {
        alert('⚠️ No hay suficientes operarios disponibles para activar esta máquina.\n\n' +
              `Operarios necesarios: ${currentTotalOperators + neededOperators}\n` +
              `Operarios disponibles: ${availableOperators}\n\n` +
              'Por favor, desactiva otras máquinas o aumenta la disponibilidad de operarios.');
        return;
      }

      setSelectedMachine(machine);
      setShowProcessDialog(true);
    } else {
      // Desactivar
      savePlanningMutation.mutate({
        ...planning,
        activa_planning: false,
        process_id: null, // Clear process when deactivating
        operadores_necesarios: 0, // Clear operators when deactivating
      });
    }
  };

  const handleSelectProcess = (processId) => {
    if (!selectedMachine) return;
    
    const machineProcess = machineProcesses.find(
      mp => mp.machine_id === selectedMachine.id && mp.process_id === processId
    );

    const operadoresNecesarios = machineProcess?.operadores_requeridos || 1;

    savePlanningMutation.mutate({
      machine_id: selectedMachine.id,
      process_id: processId,
      team_key: selectedTeam,
      fecha_planificacion: selectedDate,
      activa_planning: true,
      operadores_necesarios: operadoresNecesarios,
      fecha_actualizacion: new Date().toISOString(),
    });

    setShowProcessDialog(false);
    setSelectedMachine(null);
  };

  const clearPlanningMutation = useMutation({
    mutationFn: async () => {
      const planningsToDelete = plannings.filter(
        p => p.team_key === selectedTeam && p.fecha_planificacion === selectedDate
      );
      
      for (const planning of planningsToDelete) {
        await base44.entities.MachinePlanning.delete(planning.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machinePlannings'] });
      setAgentResult(null);
    },
  });

  const handleClearPlanning = () => {
    if (confirm('¿Eliminar todas las asignaciones de este día/equipo?')) {
      clearPlanningMutation.mutate();
    }
  };

  const handleCallAgent = async () => {
    setIsCalling(true);
    setAgentResult(null);
    
    try {
      const teamName = teams.find(t => t.team_key === selectedTeam)?.team_name;
      const availableEmployees = employees.filter(e => 
        e.equipo === teamName && e.disponibilidad === "Disponible"
      );

      const activePlannings = activeMachines.map(p => {
        const machine = machines.find(m => m.id === p.machine_id);
        const process = processes.find(pr => pr.id === p.process_id);
        return {
          machine_id: p.machine_id,
          machine_name: machine?.nombre,
          machine_code: machine?.codigo,
          process_name: process?.nombre,
          operadores_necesarios: p.operadores_necesarios
        };
      });

      const prompt = `Genera asignaciones para máquinas planificadas:
      
Fecha: ${selectedDate}
Equipo: ${teamName}
Máquinas activas: ${JSON.stringify(activePlannings)}
Operadores disponibles: ${JSON.stringify(availableEmployees.map(e => ({ id: e.id, nombre: e.nombre, puesto: e.puesto })))}

INSTRUCCIONES:
1. Asigna a cada máquina: 1 responsable de línea, 1 segunda de línea, y los operadores necesarios
2. Prioriza experiencia (campos maquina_1 a maquina_10 del empleado)
3. Balancea carga de trabajo
4. Retorna JSON con estructura exacta`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            asignaciones: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  machine_id: { type: "string" },
                  responsable_linea_id: { type: "string" },
                  segunda_linea_id: { type: "string" },
                  operadores_ids: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      setAgentResult({
        fecha: selectedDate,
        equipo: teamName,
        maquinas_activas: activeMachines.length,
        total_operadores_necesarios: totalOperators,
        total_operadores_asignados: response.asignaciones?.reduce((sum, a) => 
          sum + (a.operadores_ids?.length || 0) + 2, 0
        ) || 0,
        asignaciones: response.asignaciones || []
      });

    } catch (error) {
      console.error('Error al llamar al agente:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsCalling(false);
    }
  };

  const getPlanningForMachine = (machineId) => {
    return plannings.find(
      p => p.machine_id === machineId &&
      p.team_key === selectedTeam &&
      p.fecha_planificacion === selectedDate
    );
  };

  const getProcessName = (processId) => {
    const process = processes.find(p => p.id === processId);
    return process?.nombre || "Sin proceso";
  };

  const getAvailableProcesses = (machineId) => {
    const machine = machines.find(m => m.id === machineId);
    if (!machine?.procesos_ids || machine.procesos_ids.length === 0) {
      return machineProcesses
        .filter(mp => mp.machine_id === machineId && mp.activo)
        .map(mp => processes.find(p => p.id === mp.process_id))
        .filter(p => p);
    }
    
    return machine.procesos_ids
      .map(pid => processes.find(p => p.id === pid))
      .filter(p => p);
  };

  const activeMachines = useMemo(() => {
    return plannings.filter(
      p => p.activa_planning &&
      p.team_key === selectedTeam &&
      p.fecha_planificacion === selectedDate
    );
  }, [plannings, selectedTeam, selectedDate]);

  const totalOperators = useMemo(() => {
    return activeMachines.reduce((sum, p) => sum + (p.operadores_necesarios || 0), 0);
  }, [activeMachines]);

  // Calcular operarios disponibles
  const availableOperators = useMemo(() => {
    // Filtrar empleados del equipo seleccionado que estén disponibles
    const teamName = teams.find(t => t.team_key === selectedTeam)?.team_name;
    if (!teamName) return 0;

    return employees.filter(emp =>
      emp.equipo === teamName &&
      emp.disponibilidad === "Disponible"
    ).length;
  }, [employees, selectedTeam, teams]);

  const operatorsDeficit = totalOperators - availableOperators;

  // Obtener rango de fechas para la vista de calendario
  const getCalendarDates = () => {
    const date = new Date(selectedDate);
    switch (viewMode) {
      case 'week':
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: weekStart, end: weekEnd });
      case 'month':
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        return eachDayOfInterval({ start: monthStart, end: monthEnd });
      default:
        return [date];
    }
  };

  const calendarDates = getCalendarDates();

  const getActiveMachinesForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return plannings.filter(
      p => p.activa_planning &&
      p.team_key === selectedTeam &&
      p.fecha_planificacion === dateStr
    ).length;
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Machines")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Máquinas
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <CalendarRange className="w-8 h-8 text-blue-600" />
              Planificación de Máquinas
            </h1>
            <p className="text-slate-600 mt-1">
              Activa o desactiva máquinas para el planning diario
            </p>
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha de Planificación</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipo">Equipo</Label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.team_key} value={team.team_key}>
                        {team.team_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="viewMode">Vista de Calendario</Label>
                <Select value={viewMode} onValueChange={setViewMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Día</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-center gap-3 mt-4">
              <Button
                onClick={handleCallAgent}
                disabled={isCalling || activeMachines.length === 0}
                className="bg-purple-600 hover:bg-purple-700 text-lg px-8 py-6"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {isCalling ? "Planificando asignaciones..." : "Planificar Asignaciones Automáticas"}
              </Button>
              
              <Button
                onClick={handleClearPlanning}
                disabled={clearPlanningMutation.isPending || activeMachines.length === 0}
                variant="destructive"
                className="text-lg px-8 py-6"
              >
                {clearPlanningMutation.isPending ? "Limpiando..." : "Limpiar Planificación"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resumen con alerta si faltan operarios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Máquinas Activas</p>
                  <p className="text-2xl font-bold text-blue-900">{activeMachines.length}</p>
                </div>
                <Power className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-700 font-medium">Total Operadores Necesarios</p>
                  <p className="text-2xl font-bold text-orange-900">{totalOperators}</p>
                </div>
                <Settings className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${
            operatorsDeficit > 0
              ? 'from-red-50 to-red-100 border-red-300'
              : 'from-green-50 to-green-100 border-green-200'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium ${
                    operatorsDeficit > 0 ? 'text-red-700' : 'text-green-700'
                  }`}>
                    Operadores Disponibles
                  </p>
                  <p className={`text-2xl font-bold ${
                    operatorsDeficit > 0 ? 'text-red-900' : 'text-green-900'
                  }`}>
                    {availableOperators}
                  </p>
                </div>
                {operatorsDeficit > 0 ? (
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                ) : (
                  <Users className="w-8 h-8 text-green-600" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerta de déficit de operarios */}
        {operatorsDeficit > 0 && (
          <Card className="mb-6 bg-red-50 border-2 border-red-300">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-900 mb-1">
                    ⚠️ Déficit de Operadores: Faltan {operatorsDeficit} operador{operatorsDeficit !== 1 ? 'es' : ''}
                  </p>
                  <p className="text-sm text-red-800">
                    No puedes activar más máquinas hasta que haya suficientes operarios disponibles.
                    Desactiva algunas máquinas o aumenta la disponibilidad de empleados.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs: Lista, Kanban y Calendario */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mb-6">
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <CardHeader className="border-b border-slate-100">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="list">Vista Lista</TabsTrigger>
                <TabsTrigger value="kanban">Vista Kanban</TabsTrigger>
                <TabsTrigger value="calendar">Vista Calendario</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="list" className="mt-0">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4">Lista de Máquinas ({machines.length})</h3>
                {loadingMachines ? (
                  <div className="p-12 text-center text-slate-500">Cargando máquinas...</div>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="machines">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                        >
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50">
                                <TableHead className="w-12"></TableHead>
                                <TableHead>Máquina</TableHead>
                                <TableHead>Estados</TableHead>
                                <TableHead>Proceso</TableHead>
                                <TableHead>Operadores</TableHead>
                                <TableHead>Estado Planning</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {machines.map((machine, index) => {
                                const planning = getPlanningForMachine(machine.id);
                                const isActive = planning?.activa_planning;
                                const machineStatus = getMachineStatus(machine.id);
                                const isAvailable = machineStatus.estado_disponibilidad === "Disponible";

                                return (
                                  <Draggable
                                    key={machine.id}
                                    draggableId={machine.id}
                                    index={index}
                                  >
                                    {(provided, snapshot) => (
                                      <TableRow
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`
                                          ${snapshot.isDragging ? 'bg-blue-50 shadow-lg' : 'hover:bg-slate-50'}
                                          ${isActive ? 'bg-green-50' : ''}
                                        `}
                                      >
                                        <TableCell {...provided.dragHandleProps}>
                                          <GripVertical className="w-5 h-5 text-slate-400 cursor-grab" />
                                        </TableCell>
                                        <TableCell>
                                          <div>
                                            <span className="font-semibold text-slate-900">{machine.nombre}</span>
                                            <div className="text-xs text-slate-500">{machine.codigo}</div>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex flex-col gap-1">
                                            <Badge variant={isAvailable ? "outline" : "destructive"} className="text-xs w-fit">
                                              {machineStatus.estado_disponibilidad}
                                            </Badge>
                                            <Badge variant="outline" className={`text-xs w-fit ${
                                              machineStatus.estado_produccion === "Orden en curso" ? "bg-blue-100 text-blue-800" :
                                              machineStatus.estado_produccion === "Orden nueva" ? "bg-purple-100 text-purple-800" :
                                              "bg-slate-100 text-slate-600"
                                            }`}>
                                              {machineStatus.estado_produccion}
                                            </Badge>
                                            {machineStatus.alerta_desviacion && (
                                              <Badge className="bg-red-600 text-xs w-fit">
                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                Alerta
                                              </Badge>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          {planning?.process_id ? (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                              {getProcessName(planning.process_id)}
                                            </Badge>
                                          ) : (
                                            <span className="text-slate-400">-</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {planning?.operadores_necesarios ? (
                                            <Badge className="bg-purple-100 text-purple-800">
                                              {planning.operadores_necesarios}
                                            </Badge>
                                          ) : (
                                            <span className="text-slate-400">-</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <Badge className={
                                            isActive
                                              ? "bg-green-600 text-white"
                                              : "bg-slate-100 text-slate-600"
                                          }>
                                            {isActive ? "Planificada" : "No planificada"}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleTogglePlanning(machine)}
                                            title={isActive ? "Desactivar" : "Activar"}
                                            disabled={!isAvailable && !isActive}
                                          >
                                            {isActive ? (
                                              <PowerOff className="w-4 h-4 text-red-600" />
                                            ) : (
                                              <Power className={`w-4 h-4 ${isAvailable ? 'text-green-600' : 'text-slate-300'}`} />
                                            )}
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </Draggable>
                                );
                              })}
                              {provided.placeholder}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </CardContent>
            </TabsContent>

            <TabsContent value="kanban" className="mt-0">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4">Máquinas Planificadas ({machines.length})</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                      <Power className="w-5 h-5" />
                      Activas ({activeMachines.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {machines.filter(m => getPlanningForMachine(m.id)?.activa_planning).map(machine => {
                        const planning = getPlanningForMachine(machine.id);
                        return (
                          <Card key={machine.id} className="bg-green-50 border-2 border-green-300 hover:shadow-lg transition-all cursor-pointer">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h5 className="font-bold text-slate-900">{machine.nombre}</h5>
                                  <p className="text-xs text-slate-600">{machine.codigo}</p>
                                </div>
                                <Power className="w-5 h-5 text-green-600" />
                              </div>
                              {planning?.process_id && (
                                <Badge className="bg-blue-100 text-blue-700 text-xs mb-2">
                                  {getProcessName(planning.process_id)}
                                </Badge>
                              )}
                              {planning?.operadores_necesarios && (
                                <div className="mt-2">
                                  <Badge className="bg-purple-600 text-white">
                                    {planning.operadores_necesarios} operadores
                                  </Badge>
                                </div>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTogglePlanning(machine)}
                                className="w-full mt-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <PowerOff className="w-4 h-4 mr-2" />
                                Desactivar
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <PowerOff className="w-5 h-5" />
                      Inactivas ({machines.length - activeMachines.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {machines.filter(m => !getPlanningForMachine(m.id)?.activa_planning).map(machine => (
                        <Card key={machine.id} className="bg-slate-50 border-2 border-slate-200 hover:shadow-lg transition-all cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h5 className="font-bold text-slate-900">{machine.nombre}</h5>
                                <p className="text-xs text-slate-600">{machine.codigo}</p>
                              </div>
                              <PowerOff className="w-5 h-5 text-slate-400" />
                            </div>
                            <Badge variant="outline" className="text-xs mb-2">
                              Inactiva
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTogglePlanning(machine)}
                              className="w-full mt-3 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Power className="w-4 h-4 mr-2" />
                              Activar
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </TabsContent>


            <TabsContent value="calendar" className="mt-0">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4">
                  Calendario de Planificación - {viewMode === 'day' ? 'Día' : viewMode === 'week' ? 'Semana' : 'Mes'}
                </h3>
                <div className={`grid gap-3 ${
                  viewMode === 'month' ? 'grid-cols-7' :
                  viewMode === 'week' ? 'grid-cols-7' :
                  'grid-cols-1'
                }`}>
                  {calendarDates.map((date) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const activeMachinesCount = getActiveMachinesForDate(date);
                    const isSelected = isSameDay(date, new Date(selectedDate));

                    return (
                      <div
                        key={dateStr}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`
                          p-4 border-2 rounded-lg cursor-pointer transition-all
                          ${isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-lg'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}
                          ${activeMachinesCount > 0 ? 'bg-green-50' : ''}
                        `}
                      >
                        <div className="text-center">
                          <div className="text-xs text-slate-500 font-medium">
                            {format(date, 'EEE', { locale: es })}
                          </div>
                          <div className="text-2xl font-bold text-slate-900">
                            {format(date, 'd')}
                          </div>
                          {viewMode === 'month' && (
                            <div className="text-xs text-slate-500">
                              {format(date, 'MMM', { locale: es })}
                            </div>
                          )}
                          {activeMachinesCount > 0 && (
                            <Badge className="mt-2 bg-green-600 text-white text-xs">
                              {activeMachinesCount} máq.
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Máquinas Activas Hoy */}
        {activeMachines.length > 0 && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle>
                Máquinas Activas para {format(new Date(selectedDate), "d 'de' MMMM, yyyy", { locale: es })} ({activeMachines.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeMachines.map((planning) => {
                  const machine = machines.find(m => m.id === planning.machine_id);
                  if (!machine) return null; // Should not happen, but for safety

                  return (
                    <Card key={planning.id} className="bg-green-50 border-green-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">{machine.nombre}</h3>
                            <p className="text-sm text-slate-600 mt-1">
                              {getProcessName(planning.process_id)}
                            </p>
                            <Badge className="mt-2 bg-purple-100 text-purple-800">
                              {planning.operadores_necesarios} operadores
                            </Badge>
                          </div>
                          <Power className="w-5 h-5 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resultados del Agente */}
        {agentResult && (
          <Card className="shadow-lg border-2 border-purple-300 bg-purple-50">
            <CardHeader className="border-b border-purple-200">
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <Sparkles className="w-5 h-5" />
                Asignaciones Generadas por IA
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 p-4 bg-white rounded-lg border-2 border-purple-200">
                <div>
                  <p className="text-xs text-slate-600">Fecha</p>
                  <p className="font-bold text-slate-900">{format(new Date(agentResult.fecha), 'd MMM yyyy', { locale: es })}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Equipo</p>
                  <p className="font-bold text-slate-900">{agentResult.equipo}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Máquinas Activas</p>
                  <p className="font-bold text-purple-900">{agentResult.maquinas_activas}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Op. Necesarios</p>
                  <p className="font-bold text-orange-900">{agentResult.total_operadores_necesarios}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Op. Asignados</p>
                  <p className="font-bold text-green-900">{agentResult.total_operadores_asignados}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3">Vista por Máquina</h3>
                  <div className="space-y-3">
                    {agentResult.asignaciones?.map((asig, idx) => {
                      const machine = machines.find(m => m.id === asig.machine_id);
                      const responsable = employees.find(e => e.id === asig.responsable_linea_id);
                      const segunda = employees.find(e => e.id === asig.segunda_linea_id);
                      const operadores = asig.operadores_ids?.map(id => employees.find(e => e.id === id)).filter(Boolean);
                      
                      return (
                        <Card key={idx} className="bg-white">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-bold text-slate-900">{machine?.nombre}</h4>
                                <p className="text-xs text-slate-500">{machine?.codigo}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-slate-600 mb-1">Responsable Línea</p>
                                <p className="font-semibold text-blue-900">{responsable?.nombre || 'No asignado'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-600 mb-1">Segunda Línea</p>
                                <p className="font-semibold text-purple-900">{segunda?.nombre || 'No asignado'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-600 mb-1">Operadores</p>
                                <div className="space-y-1">
                                  {operadores?.map((op, i) => (
                                    <p key={i} className="text-slate-700">• {op.nombre}</p>
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

                <div>
                  <h3 className="font-semibold text-lg mb-3">Vista por Empleado</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(() => {
                      const employeeAssignments = {};
                      agentResult.asignaciones?.forEach(asig => {
                        const machine = machines.find(m => m.id === asig.machine_id);
                        
                        [
                          { id: asig.responsable_linea_id, role: 'Responsable Línea' },
                          { id: asig.segunda_linea_id, role: 'Segunda Línea' },
                          ...(asig.operadores_ids || []).map(id => ({ id, role: 'Operador' }))
                        ].forEach(({ id, role }) => {
                          if (!id) return;
                          if (!employeeAssignments[id]) {
                            employeeAssignments[id] = [];
                          }
                          employeeAssignments[id].push({ machine: machine?.nombre, role });
                        });
                      });
                      
                      return Object.entries(employeeAssignments).map(([empId, assignments]) => {
                        const emp = employees.find(e => e.id === empId);
                        return (
                          <Card key={empId} className="bg-white">
                            <CardContent className="p-3">
                              <p className="font-bold text-slate-900 mb-2">{emp?.nombre}</p>
                              {assignments.map((a, i) => (
                                <div key={i} className="text-sm flex justify-between items-center">
                                  <span className="text-slate-700">{a.machine}</span>
                                  <Badge variant="outline" className="text-xs">{a.role}</Badge>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Selección de Proceso */}
      {showProcessDialog && selectedMachine && (
        <Dialog open={true} onOpenChange={() => {
          setShowProcessDialog(false);
          setSelectedMachine(null);
        }}>
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Seleccionar Proceso para {selectedMachine.nombre}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {getAvailableProcesses(selectedMachine.id).map((process) => (
                <Button
                  key={process.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleSelectProcess(process.id)}
                  disabled={savePlanningMutation.isPending}
                >
                  <div className="text-left">
                    <div className="font-semibold">{process.nombre}</div>
                    <div className="text-xs text-slate-500">{process.codigo}</div>
                  </div>
                </Button>
              ))}
              {getAvailableProcesses(selectedMachine.id).length === 0 && (
                <p className="text-center text-slate-500 py-4">
                  No hay procesos configurados para esta máquina
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}