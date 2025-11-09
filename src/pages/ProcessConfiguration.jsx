import React, { useState } from "react";
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
import { Cog, Plus, Edit, Trash2, Settings, Users } from "lucide-react";

export default function ProcessConfigurationPage() {
  const [showProcessForm, setShowProcessForm] = useState(false);
  const [showMachineProcessForm, setShowMachineProcessForm] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const queryClient = useQueryClient();

  const [processFormData, setProcessFormData] = useState({
    nombre: "",
    codigo: "",
    descripcion: "",
    activo: true,
  });

  const [machineProcessData, setMachineProcessData] = useState({
    selectedMachines: [],
    operadores_requeridos: 1,
  });

  const { data: processes, isLoading } = useQuery({
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
    mutationFn: async (data) => {
      const promises = data.selectedMachines.map(machineId => {
        const existing = machineProcesses.find(
          mp => mp.machine_id === machineId && mp.process_id === selectedProcess.id
        );
        
        if (existing) {
          return base44.entities.MachineProcess.update(existing.id, {
            operadores_requeridos: data.operadores_requeridos,
            activo: true,
          });
        } else {
          return base44.entities.MachineProcess.create({
            machine_id: machineId,
            process_id: selectedProcess.id,
            operadores_requeridos: data.operadores_requeridos,
            activo: true,
          });
        }
      });
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machineProcesses'] });
      handleCloseMachineProcessForm();
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
      activo: true,
    });
  };

  const handleCloseMachineProcessForm = () => {
    setShowMachineProcessForm(false);
    setSelectedProcess(null);
    setMachineProcessData({
      selectedMachines: [],
      operadores_requeridos: 1,
    });
  };

  const handleSubmitProcess = (e) => {
    e.preventDefault();
    saveProcessMutation.mutate(processFormData);
  };

  const handleSubmitMachineProcess = (e) => {
    e.preventDefault();
    saveMachineProcessMutation.mutate(machineProcessData);
  };

  const handleDeleteProcess = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este proceso?')) {
      deleteProcessMutation.mutate(id);
    }
  };

  const handleConfigureMachines = (process) => {
    setSelectedProcess(process);
    const assignedMachines = machineProcesses
      .filter(mp => mp.process_id === process.id && mp.activo)
      .map(mp => mp.machine_id);
    
    setMachineProcessData({
      selectedMachines: assignedMachines,
      operadores_requeridos: machineProcesses.find(mp => mp.process_id === process.id)?.operadores_requeridos || 1,
    });
    
    setShowMachineProcessForm(true);
  };

  const toggleMachine = (machineId) => {
    setMachineProcessData(prev => ({
      ...prev,
      selectedMachines: prev.selectedMachines.includes(machineId)
        ? prev.selectedMachines.filter(id => id !== machineId)
        : [...prev.selectedMachines, machineId]
    }));
  };

  const getMachineCount = (processId) => {
    return machineProcesses.filter(mp => mp.process_id === processId && mp.activo).length;
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Settings className="w-8 h-8 text-blue-600" />
              Configuración de Procesos
            </h1>
            <p className="text-slate-600 mt-1">
              Gestiona los procesos y asígnalos a las máquinas
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
            <CardTitle>Procesos Configurados ({processes.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
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
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-center">Máquinas</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processes.map((process) => (
                      <TableRow key={process.id} className="hover:bg-slate-50">
                        <TableCell>
                          <span className="font-mono font-semibold">{process.codigo}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-slate-900">{process.nombre}</span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {process.descripcion || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700">
                            <Cog className="w-3 h-3 mr-1" />
                            {getMachineCount(process.id)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
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
                              <Cog className="w-4 h-4" />
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
                    ))}
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

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activo"
                  checked={processFormData.activo}
                  onCheckedChange={(checked) => setProcessFormData({ ...processFormData, activo: checked })}
                />
                <label htmlFor="activo" className="text-sm font-medium">
                  Proceso Activo
                </label>
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

      {/* Formulario de Asignación a Máquinas */}
      {showMachineProcessForm && selectedProcess && (
        <Dialog open={true} onOpenChange={handleCloseMachineProcessForm}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Configurar Máquinas - {selectedProcess.nombre}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmitMachineProcess} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="operadores">Operadores Requeridos *</Label>
                <Input
                  id="operadores"
                  type="number"
                  min="1"
                  value={machineProcessData.operadores_requeridos}
                  onChange={(e) => setMachineProcessData({ 
                    ...machineProcessData, 
                    operadores_requeridos: parseInt(e.target.value) 
                  })}
                  required
                />
                <p className="text-xs text-slate-500">
                  Este número de operadores se aplicará a todas las máquinas seleccionadas
                </p>
              </div>

              <div className="space-y-3">
                <Label>Seleccionar Máquinas</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2 border rounded-lg bg-slate-50">
                  {machines.map((machine) => (
                    <div
                      key={machine.id}
                      onClick={() => toggleMachine(machine.id)}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        machineProcessData.selectedMachines.includes(machine.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={machineProcessData.selectedMachines.includes(machine.id)}
                          onCheckedChange={() => toggleMachine(machine.id)}
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900">{machine.nombre}</div>
                          <div className="text-xs text-slate-500 font-mono">{machine.codigo}</div>
                          <Badge 
                            variant="outline" 
                            className={`mt-1 text-xs ${
                              machine.estado === "Disponible"
                                ? "bg-green-50 text-green-700"
                                : "bg-slate-50 text-slate-600"
                            }`}
                          >
                            {machine.estado}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-600">
                  Máquinas seleccionadas: {machineProcessData.selectedMachines.length}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseMachineProcessForm}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700" 
                  disabled={saveMachineProcessMutation.isPending || machineProcessData.selectedMachines.length === 0}
                >
                  {saveMachineProcessMutation.isPending ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}