import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { CalendarRange, Power, PowerOff, Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function MachinePlanningPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTeam, setSelectedTeam] = useState('team_1');
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const queryClient = useQueryClient();

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
    initialData: [],
  });

  const { data: processes } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.list(),
    initialData: [],
  });

  const { data: machineProcesses } = useQuery({
    queryKey: ['machineProcesses'],
    queryFn: () => base44.entities.MachineProcess.list(),
    initialData: [],
  });

  const { data: machinePlannings } = useQuery({
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
    mutationFn: async ({ machineId, processId, activa, operadores }) => {
      const existing = machinePlannings.find(
        p => p.machine_id === machineId && 
            p.team_key === selectedTeam && 
            p.fecha_planificacion === selectedDate
      );

      const planningData = {
        machine_id: machineId,
        process_id: processId,
        team_key: selectedTeam,
        fecha_planificacion: selectedDate,
        activa_planning: activa,
        operadores_necesarios: operadores,
        fecha_actualizacion: new Date().toISOString(),
      };

      if (existing) {
        return base44.entities.MachinePlanning.update(existing.id, planningData);
      } else {
        return base44.entities.MachinePlanning.create(planningData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machinePlannings'] });
      setShowProcessDialog(false);
      setSelectedMachine(null);
      setSelectedProcess(null);
    },
  });

  const handleTogglePlanning = (machine) => {
    const planning = getCurrentPlanning(machine.id);
    
    if (!planning || !planning.activa_planning) {
      // Activar - abrir diálogo de selección de proceso
      setSelectedMachine(machine);
      setShowProcessDialog(true);
    } else {
      // Desactivar
      savePlanningMutation.mutate({
        machineId: machine.id,
        processId: planning.process_id,
        activa: false,
        operadores: planning.operadores_necesarios,
      });
    }
  };

  const handleSelectProcess = () => {
    if (!selectedProcess || !selectedMachine) return;

    // Obtener operadores requeridos del MachineProcess
    const machineProcess = machineProcesses.find(
      mp => mp.machine_id === selectedMachine.id && mp.process_id === selectedProcess
    );

    const operadores = machineProcess?.operadores_requeridos || 1;

    savePlanningMutation.mutate({
      machineId: selectedMachine.id,
      processId: selectedProcess,
      activa: true,
      operadores: operadores,
    });
  };

  const getCurrentPlanning = (machineId) => {
    return machinePlannings.find(
      p => p.machine_id === machineId && 
          p.team_key === selectedTeam && 
          p.fecha_planificacion === selectedDate
    );
  };

  const getAvailableProcesses = (machineId) => {
    const processIds = machineProcesses
      .filter(mp => mp.machine_id === machineId && mp.activo)
      .map(mp => mp.process_id);
    
    return processes.filter(p => processIds.includes(p.id) && p.activo);
  };

  const getProcessInfo = (processId) => {
    return processes.find(p => p.id === processId);
  };

  const getTeamName = (teamKey) => {
    const team = teams.find(t => t.team_key === teamKey);
    return team?.team_name || 'Equipo';
  };

  const activeMachines = useMemo(() => {
    return machines.filter(m => {
      const planning = getCurrentPlanning(m.id);
      return planning?.activa_planning && m.estado === "Disponible";
    });
  }, [machines, machinePlannings, selectedDate, selectedTeam]);

  const totalOperators = useMemo(() => {
    return activeMachines.reduce((sum, machine) => {
      const planning = getCurrentPlanning(machine.id);
      return sum + (planning?.operadores_necesarios || 0);
    }, 0);
  }, [activeMachines]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <CalendarRange className="w-8 h-8 text-blue-600" />
            Planificación de Máquinas
          </h1>
          <p className="text-slate-600 mt-1">
            Gestiona la planificación diaria de máquinas por equipo
          </p>
        </div>

        {/* Filtros */}
        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Fecha de Planificación
                </Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-base"
                />
                <p className="text-xs text-slate-500">
                  {format(new Date(selectedDate), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Equipo
                </Label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team_1">{getTeamName('team_1')}</SelectItem>
                    <SelectItem value="team_2">{getTeamName('team_2')}</SelectItem>
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

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-700 font-medium">Operadores Necesarios</p>
                  <p className="text-2xl font-bold text-purple-900">{totalOperators}</p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de Máquinas */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>
              Configuración de Máquinas - {getTeamName(selectedTeam)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Estado Máquina</TableHead>
                    <TableHead>Estado Planning</TableHead>
                    <TableHead>Proceso</TableHead>
                    <TableHead>Operadores</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machines.map((machine) => {
                    const planning = getCurrentPlanning(machine.id);
                    const processInfo = planning?.process_id ? getProcessInfo(planning.process_id) : null;
                    const isActive = planning?.activa_planning;
                    
                    return (
                      <TableRow key={machine.id} className="hover:bg-slate-50">
                        <TableCell>
                          <span className="font-mono font-semibold">{machine.codigo}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-slate-900">{machine.nombre}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            machine.estado === "Disponible"
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-600"
                          }>
                            {machine.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            isActive
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-600"
                          }>
                            {isActive ? "Activa en Planning" : "Inactiva"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {processInfo ? (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700">
                              {processInfo.nombre}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-sm">Sin proceso</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isActive && planning?.operadores_necesarios ? (
                            <Badge className="bg-indigo-100 text-indigo-800">
                              {planning.operadores_necesarios}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={isActive ? "destructive" : "default"}
                            size="sm"
                            onClick={() => handleTogglePlanning(machine)}
                            disabled={machine.estado !== "Disponible" && !isActive}
                          >
                            {isActive ? (
                              <>
                                <PowerOff className="w-4 h-4 mr-1" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <Power className="w-4 h-4 mr-1" />
                                Activar
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Máquinas Activas */}
        {activeMachines.length > 0 && (
          <Card className="mt-6 shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="border-b border-green-200">
              <CardTitle className="text-green-900">Máquinas Activas Hoy</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeMachines.map((machine) => {
                  const planning = getCurrentPlanning(machine.id);
                  const processInfo = getProcessInfo(planning.process_id);
                  
                  return (
                    <div key={machine.id} className="bg-white p-4 rounded-lg border-2 border-green-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-mono text-sm font-bold text-slate-700">{machine.codigo}</span>
                          <h4 className="font-semibold text-slate-900">{machine.nombre}</h4>
                        </div>
                        <Power className="w-5 h-5 text-green-600" />
                      </div>
                      {processInfo && (
                        <div className="space-y-1">
                          <div className="text-sm text-slate-600">
                            <span className="font-medium">Proceso:</span> {processInfo.nombre}
                          </div>
                          <div className="text-sm text-slate-600">
                            <span className="font-medium">Operadores:</span> {planning.operadores_necesarios}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Diálogo de Selección de Proceso */}
      {showProcessDialog && selectedMachine && (
        <Dialog open={true} onOpenChange={() => {
          setShowProcessDialog(false);
          setSelectedMachine(null);
          setSelectedProcess(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Seleccionar Proceso para {selectedMachine.nombre}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Selecciona el proceso que se realizará en esta máquina
              </p>

              <div className="space-y-2">
                <Label>Proceso *</Label>
                <Select value={selectedProcess || ""} onValueChange={setSelectedProcess}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proceso" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableProcesses(selectedMachine.id).map((process) => {
                      const machineProcess = machineProcesses.find(
                        mp => mp.machine_id === selectedMachine.id && mp.process_id === process.id
                      );
                      
                      return (
                        <SelectItem key={process.id} value={process.id}>
                          {process.nombre} ({machineProcess?.operadores_requeridos || 1} operadores)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowProcessDialog(false);
                    setSelectedMachine(null);
                    setSelectedProcess(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleSelectProcess}
                  disabled={!selectedProcess || savePlanningMutation.isPending}
                >
                  {savePlanningMutation.isPending ? "Guardando..." : "Activar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}