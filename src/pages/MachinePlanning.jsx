
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
import { CalendarRange, Power, PowerOff, Settings, GripVertical, Sparkles, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
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

    // Update order for all affected machines
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
    
    if (planning?.activa_planning) {
      // Desactivar
      savePlanningMutation.mutate({
        ...planning,
        activa_planning: false,
      });
    } else {
      // Activar - mostrar diálogo de selección de proceso
      setSelectedMachine(machine);
      setShowProcessDialog(true);
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
      // Aquí llamaríamos al agente assignment_generator
      // Por ahora solo mostramos un mensaje
      alert('Llamando al agente de planificación automática...');
      
      // Simulamos la llamada al agente
      // await base44.agents.assignmentGenerator.generate({ date: selectedDate, team: selectedTeam });
      
    } catch (error) {
      console.error('Error al llamar al agente:', error);
      alert('Error al ejecutar la planificación automática');
    } finally {
      queryClient.invalidateQueries({ queryKey: ['machinePlannings'] }); // Invalidate after agent call
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </CardContent>
        </Card>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Total Operadores Necesarios</p>
                  <p className="text-2xl font-bold text-green-900">{totalOperators}</p>
                </div>
                <Settings className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Máquinas con Drag & Drop */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mb-6">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>
              Lista de Máquinas ({machines.length})
              <p className="text-sm text-slate-500 font-normal mt-1">
                Arrastra las máquinas para reordenarlas
              </p>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
        </Card>

        {/* Máquinas Activas Hoy */}
        {activeMachines.length > 0 && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle>
                Máquinas Activas para Hoy ({activeMachines.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeMachines.map((planning) => {
                  const machine = machines.find(m => m.id === planning.machine_id);
                  return (
                    <Card key={planning.id} className="bg-green-50 border-green-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">{machine?.nombre}</h3>
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
