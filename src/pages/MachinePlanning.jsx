
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

export default function MachinePlanningPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTeam, setSelectedTeam] = useState('team_1');
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [isCalling, setIsCalling] = useState(false);
  const [viewMode, setViewMode] = useState('day');
  const [currentTab, setCurrentTab] = useState('list');
  const queryClient = useQueryClient();

  const { data: machines, isLoading: loadingMachines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
    initialData: [],
  });

  const { data: processes } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.list('nombre'),
    initialData: [],
  });

  const { data: machineProcesses } = useQuery({
    queryKey: ['machineProcesses'],
    queryFn: () => base44.entities.MachineProcess.list(),
    initialData: [],
  });

  const { data: plannings } = useQuery({
    queryKey: ['machinePlannings', selectedDate, selectedTeam],
    queryFn: () => base44.entities.MachinePlanning.list(),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const savePlanningMutation = useMutation({
    mutationFn: async (data) => {
      const existing = plannings.find(
        p => p.machine_id === data.machine_id &&
        p.team_key === data.team_key &&
        p.fecha_planificacion === data.fecha_planificacion
      );

      if (existing) {
        return base44.entities.MachinePlanning.update(existing.id, data);
      }
      return base44.entities.MachinePlanning.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machinePlannings'] });
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

  const handleCallAgent = async () => {
    setIsCalling(true);
    try {
      alert('Llamando al agente de planificación automática...');
    } catch (error) {
      console.error('Error al llamar al agente:', error);
      alert('Error al ejecutar la planificación automática');
    } finally {
      queryClient.invalidateQueries({ queryKey: ['machinePlannings'] });
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
    return machineProcesses
      .filter(mp => mp.machine_id === machineId && mp.activo)
      .map(mp => processes.find(p => p.id === mp.process_id))
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

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <CalendarRange className="w-8 h-8 text-blue-600" />
              Planificación de Máquinas
            </h1>
            <p className="text-slate-600 mt-1">
              Activa o desactiva máquinas para el planning diario
            </p>
          </div>
          <Button
            onClick={handleCallAgent}
            disabled={isCalling}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isCalling ? "Planificando..." : "Planificar asignaciones"}
          </Button>
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
                                <TableHead>Proceso</TableHead>
                                <TableHead>Operadores</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {machines.map((machine, index) => {
                                const planning = getPlanningForMachine(machine.id);
                                const isActive = planning?.activa_planning;

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
                                              ? "bg-green-100 text-green-800"
                                              : "bg-slate-100 text-slate-600"
                                          }>
                                            {isActive ? "Activa" : "Inactiva"}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleTogglePlanning(machine)}
                                            title={isActive ? "Desactivar" : "Activar"}
                                          >
                                            {isActive ? (
                                              <PowerOff className="w-4 h-4 text-red-600" />
                                            ) : (
                                              <Power className="w-4 h-4 text-green-600" />
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
      </div>

      {/* Dialog de Selección de Proceso */}
      {showProcessDialog && selectedMachine && (
        <Dialog open={true} onOpenChange={() => setShowProcessDialog(false)}>
          <DialogContent>
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
