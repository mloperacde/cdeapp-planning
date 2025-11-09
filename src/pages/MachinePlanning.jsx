import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Cog, Users, CheckCircle2, XCircle, CalendarRange } from "lucide-react";

export default function MachinePlanningPage() {
  const [selectedProcess, setSelectedProcess] = useState({});
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [currentMachine, setCurrentMachine] = useState(null);
  const queryClient = useQueryClient();

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('-codigo'),
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

  const { data: machinePlannings, refetch } = useQuery({
    queryKey: ['machinePlannings'],
    queryFn: () => base44.entities.MachinePlanning.list(),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: async ({ machineId, active, processId, operadores }) => {
      const existing = machinePlannings.find(mp => mp.machine_id === machineId);
      
      if (existing) {
        return base44.entities.MachinePlanning.update(existing.id, {
          activa_planning: active,
          process_id: processId,
          operadores_necesarios: operadores,
          fecha_actualizacion: new Date().toISOString()
        });
      } else {
        return base44.entities.MachinePlanning.create({
          machine_id: machineId,
          activa_planning: active,
          process_id: processId,
          operadores_necesarios: operadores,
          fecha_actualizacion: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      refetch();
      setShowProcessDialog(false);
      setCurrentMachine(null);
    },
  });

  const getAvailableProcesses = (machineId) => {
    const machineProcessList = machineProcesses.filter(mp => mp.machine_id === machineId && mp.activo);
    return machineProcessList.map(mp => {
      const process = processes.find(p => p.id === mp.process_id);
      return {
        ...process,
        operadores_requeridos: mp.operadores_requeridos
      };
    }).filter(p => p && p.id);
  };

  const handleToggle = (machine, currentState) => {
    if (!currentState) {
      // Activar: mostrar diálogo de selección de proceso
      const availableProcesses = getAvailableProcesses(machine.id);
      if (availableProcesses.length === 0) {
        alert('Esta máquina no tiene procesos configurados');
        return;
      }
      setCurrentMachine(machine);
      setShowProcessDialog(true);
    } else {
      // Desactivar
      saveMutation.mutate({ 
        machineId: machine.id, 
        active: false,
        processId: null,
        operadores: 0
      });
    }
  };

  const handleProcessSelect = () => {
    if (!currentMachine || !selectedProcess[currentMachine.id]) return;
    
    const availableProcesses = getAvailableProcesses(currentMachine.id);
    const selectedProc = availableProcesses.find(p => p.id === selectedProcess[currentMachine.id]);
    
    if (selectedProc) {
      saveMutation.mutate({
        machineId: currentMachine.id,
        active: true,
        processId: selectedProc.id,
        operadores: selectedProc.operadores_requeridos
      });
    }
  };

  const isActivePlanning = (machineId) => {
    const planning = machinePlannings.find(mp => mp.machine_id === machineId);
    return planning?.activa_planning || false;
  };

  const getProcessInfo = (machineId) => {
    const planning = machinePlannings.find(mp => mp.machine_id === machineId);
    if (!planning || !planning.process_id) return null;
    
    const process = processes.find(p => p.id === planning.process_id);
    return {
      process,
      operadores: planning.operadores_necesarios
    };
  };

  const activeMachines = machines.filter(m => isActivePlanning(m.id));
  const totalOperatorsNeeded = activeMachines.reduce((sum, m) => {
    const info = getProcessInfo(m.id);
    return sum + (info?.operadores || 0);
  }, 0);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <CalendarRange className="w-8 h-8 text-blue-600" />
            Planificación de Máquinas
          </h1>
          <p className="text-slate-600 mt-1">
            Activa máquinas y selecciona procesos para el planning
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-sm text-blue-700">Total Operadores Necesarios</div>
                <div className="text-3xl font-bold text-blue-900">{totalOperatorsNeeded}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-700">Máquinas Activas</div>
              <div className="text-2xl font-bold text-blue-900">
                {activeMachines.length} / {machines.length}
              </div>
            </div>
          </div>

          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Configuración de Planning</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-16">Estado</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Proceso Activo</TableHead>
                      <TableHead className="text-center">Operadores</TableHead>
                      <TableHead className="text-center">Estado Máquina</TableHead>
                      <TableHead className="text-center">Planning</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {machines.map((machine) => {
                      const isActive = isActivePlanning(machine.id);
                      const processInfo = getProcessInfo(machine.id);
                      return (
                        <TableRow key={machine.id} className={isActive ? "bg-green-50" : ""}>
                          <TableCell>
                            {isActive ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-slate-400" />
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono font-semibold text-slate-900">
                              {machine.codigo}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-slate-900">{machine.nombre}</span>
                          </TableCell>
                          <TableCell>
                            {processInfo ? (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                {processInfo.process?.nombre}
                              </Badge>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {processInfo ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                <Users className="w-3 h-3 mr-1" />
                                {processInfo.operadores}
                              </Badge>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={
                              machine.estado === "Disponible"
                                ? "bg-green-100 text-green-800"
                                : "bg-slate-100 text-slate-600"
                            }>
                              {machine.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={isActive}
                              onCheckedChange={() => handleToggle(machine, isActive)}
                              disabled={machine.estado !== "Disponible" || saveMutation.isPending}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showProcessDialog && currentMachine && (
        <Dialog open={true} onOpenChange={() => setShowProcessDialog(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Seleccionar Proceso - {currentMachine.nombre}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Proceso</label>
                <Select
                  value={selectedProcess[currentMachine.id] || ""}
                  onValueChange={(value) => setSelectedProcess({ ...selectedProcess, [currentMachine.id]: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proceso" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableProcesses(currentMachine.id).map((proc) => (
                      <SelectItem key={proc.id} value={proc.id}>
                        {proc.nombre} - {proc.operadores_requeridos} operadores
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowProcessDialog(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleProcessSelect}
                  disabled={!selectedProcess[currentMachine.id]}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Activar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}