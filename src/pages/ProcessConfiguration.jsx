import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Edit, Trash2, Settings, Cog, ListTree } from "lucide-react";

export default function ProcessConfigurationPage() {
  const [showProcessForm, setShowProcessForm] = useState(false);
  const [showMachineAssignForm, setShowMachineAssignForm] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [selectedMachines, setSelectedMachines] = useState([]);
  const [operatorsPerMachine, setOperatorsPerMachine] = useState({});
  const queryClient = useQueryClient();

  const [processFormData, setProcessFormData] = useState({
    nombre: "",
    codigo: "",
    descripcion: "",
    operadores_requeridos: 1,
    activo: true,
  });

  const { data: processes, isLoading: loadingProcesses } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.list('-created_date'),
    initialData: [],
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('codigo'),
    initialData: [],
  });

  const { data: machineProcesses } = useQuery({
    queryKey: ['machineProcesses'],
    queryFn: () => base44.entities.MachineProcess.list(),
    initialData: [],
  });

  const saveProcessMutation = useMutation({
    mutationFn: (data) => {
      if (editingProcess?.id) {
        return base44.entities.Process.update(editingProcess.id, data);
      }
      return base44.entities.Process.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      handleCloseProcessForm();
    },
  });

  const deleteProcessMutation = useMutation({
    mutationFn: (id) => base44.entities.Process.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });

  const saveMachineProcessMutation = useMutation({
    mutationFn: async ({ processId, machineIds, operators }) => {
      // Crear/actualizar asignaciones para cada máquina seleccionada
      const promises = machineIds.map(async (machineId) => {
        const existing = machineProcesses.find(
          mp => mp.process_id === processId && mp.machine_id === machineId
        );
        
        const operatorsRequired = operators[machineId] || 1;
        
        if (existing) {
          return base44.entities.MachineProcess.update(existing.id, {
            operadores_requeridos: operatorsRequired,
            activo: true,
          });
        } else {
          return base44.entities.MachineProcess.create({
            process_id: processId,
            machine_id: machineId,
            operadores_requeridos: operatorsRequired,
            activo: true,
          });
        }
      });
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machineProcesses'] });
      handleCloseMachineAssignForm();
    },
  });

  const handleEditProcess = (process) => {
    setEditingProcess(process);
    setProcessFormData(process);
    setShowProcessForm(true);
  };

  const handleCloseProcessForm = () => {
    setShowProcessForm(false);
    setEditingProcess(null);
    setProcessFormData({
      nombre: "",
      codigo: "",
      descripcion: "",
      operadores_requeridos: 1,
      activo: true,
    });
  };

  const handleSubmitProcess = (e) => {
    e.preventDefault();
    saveProcessMutation.mutate(processFormData);
  };

  const handleDeleteProcess = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este proceso?')) {
      deleteProcessMutation.mutate(id);
    }
  };

  const handleConfigureMachines = (process) => {
    setSelectedProcess(process);
    
    // Pre-seleccionar máquinas que ya tienen este proceso
    const assignedMachines = machineProcesses
      .filter(mp => mp.process_id === process.id)
      .map(mp => mp.machine_id);
    
    setSelectedMachines(assignedMachines);
    
    // Pre-cargar operadores por máquina
    const operators = {};
    machineProcesses
      .filter(mp => mp.process_id === process.id)
      .forEach(mp => {
        operators[mp.machine_id] = mp.operadores_requeridos;
      });
    setOperatorsPerMachine(operators);
    
    setShowMachineAssignForm(true);
  };

  const handleCloseMachineAssignForm = () => {
    setShowMachineAssignForm(false);
    setSelectedProcess(null);
    setSelectedMachines([]);
    setOperatorsPerMachine({});
  };

  const handleToggleMachine = (machineId) => {
    setSelectedMachines(prev => {
      if (prev.includes(machineId)) {
        return prev.filter(id => id !== machineId);
      } else {
        return [...prev, machineId];
      }
    });
  };

  const handleOperatorsChange = (machineId, value) => {
    setOperatorsPerMachine(prev => ({
      ...prev,
      [machineId]: parseInt(value) || 1
    }));
  };

  const handleSubmitMachineAssign = (e) => {
    e.preventDefault();
    saveMachineProcessMutation.mutate({
      processId: selectedProcess.id,
      machineIds: selectedMachines,
      operators: operatorsPerMachine,
    });
  };

  const getMachinesForProcess = (processId) => {
    return machineProcesses
      .filter(mp => mp.process_id === processId && mp.activo)
      .map(mp => {
        const machine = machines.find(m => m.id === mp.machine_id);
        return {
          ...machine,
          operadores_requeridos: mp.operadores_requeridos,
        };
      })
      .filter(m => m);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <ListTree className="w-8 h-8 text-blue-600" />
              Configuración de Procesos
            </h1>
            <p className="text-slate-600 mt-1">
              Gestiona los procesos y asígnalos a múltiples máquinas
            </p>
          </div>
          <Button
            onClick={() => setShowProcessForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Proceso
          </Button>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Lista de Procesos ({processes.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingProcesses ? (
              <div className="p-12 text-center text-slate-500">Cargando procesos...</div>
            ) : processes.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No hay procesos configurados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Operadores</TableHead>
                      <TableHead>Máquinas Asignadas</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processes.map((process) => {
                      const assignedMachines = getMachinesForProcess(process.id);
                      
                      return (
                        <TableRow key={process.id} className="hover:bg-slate-50">
                          <TableCell>
                            <span className="font-mono font-semibold">{process.codigo}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-slate-900">{process.nombre}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {process.operadores_requeridos || 1} operadores
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-purple-100 text-purple-800">
                              {assignedMachines.length} máquinas
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              process.activo
                                ? "bg-green-100 text-green-800"
                                : "bg-slate-100 text-slate-600"
                            }>
                              {process.activo ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleConfigureMachines(process)}
                                title="Configurar máquinas"
                              >
                                <Settings className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditProcess(process)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteProcess(process.id)}
                                className="hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Formulario de Proceso */}
      {showProcessForm && (
        <Dialog open={true} onOpenChange={handleCloseProcessForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProcess ? 'Editar Proceso' : 'Nuevo Proceso'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmitProcess} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    value={processFormData.codigo}
                    onChange={(e) => setProcessFormData({ ...processFormData, codigo: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={processFormData.nombre}
                    onChange={(e) => setProcessFormData({ ...processFormData, nombre: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="operadores">Operadores Requeridos *</Label>
                  <Input
                    id="operadores"
                    type="number"
                    min="1"
                    value={processFormData.operadores_requeridos}
                    onChange={(e) => setProcessFormData({ ...processFormData, operadores_requeridos: parseInt(e.target.value) })}
                    required
                  />
                  <p className="text-xs text-slate-500">Número base de operadores (se puede ajustar por máquina)</p>
                </div>

                <div className="space-y-2 flex items-center">
                  <Checkbox
                    id="activo"
                    checked={processFormData.activo}
                    onCheckedChange={(checked) => setProcessFormData({ ...processFormData, activo: checked })}
                  />
                  <label htmlFor="activo" className="text-sm font-medium ml-2">
                    Proceso Activo
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={processFormData.descripcion}
                  onChange={(e) => setProcessFormData({ ...processFormData, descripcion: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseProcessForm}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveProcessMutation.isPending}>
                  {saveProcessMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Formulario de Asignación de Máquinas */}
      {showMachineAssignForm && selectedProcess && (
        <Dialog open={true} onOpenChange={handleCloseMachineAssignForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Asignar Máquinas a: {selectedProcess.nombre}
              </DialogTitle>
              <p className="text-sm text-slate-600 mt-2">
                Selecciona las máquinas a las que aplica este proceso y configura el número de operadores para cada una
              </p>
            </DialogHeader>

            <form onSubmit={handleSubmitMachineAssign} className="space-y-4">
              <div className="space-y-3">
                {machines.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No hay máquinas disponibles</p>
                ) : (
                  machines.map((machine) => (
                    <div key={machine.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          id={`machine-${machine.id}`}
                          checked={selectedMachines.includes(machine.id)}
                          onCheckedChange={() => handleToggleMachine(machine.id)}
                        />
                        <div className="flex-1">
                          <label htmlFor={`machine-${machine.id}`} className="flex items-center gap-2 cursor-pointer">
                            <Cog className="w-5 h-5 text-blue-600" />
                            <span className="font-semibold text-slate-900">{machine.nombre}</span>
                            <span className="text-sm text-slate-500">({machine.codigo})</span>
                          </label>
                          
                          {selectedMachines.includes(machine.id) && (
                            <div className="mt-3 flex items-center gap-3">
                              <Label htmlFor={`operators-${machine.id}`} className="text-sm">
                                Operadores requeridos:
                              </Label>
                              <Input
                                id={`operators-${machine.id}`}
                                type="number"
                                min="1"
                                className="w-24"
                                value={operatorsPerMachine[machine.id] || selectedProcess.operadores_requeridos || 1}
                                onChange={(e) => handleOperatorsChange(machine.id, e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Seleccionadas:</strong> {selectedMachines.length} máquinas
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseMachineAssignForm}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700" 
                  disabled={saveMachineProcessMutation.isPending || selectedMachines.length === 0}
                >
                  {saveMachineProcessMutation.isPending ? "Guardando..." : "Guardar Asignaciones"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}