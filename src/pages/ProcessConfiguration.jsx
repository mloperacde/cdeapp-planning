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
} from "@/components/ui/table.jsx";
import { Plus, Edit, Trash2, Settings, Cog, Link as LinkIcon, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import AdvancedSearch from "../components/common/AdvancedSearch";

const EMPTY_ARRAY = [];

export default function ProcessConfigurationPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [showMachineAssignment, setShowMachineAssignment] = useState(null);
  const [machineAssignments, setMachineAssignments] = useState({});
  const [filters, setFilters] = useState({});
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    descripcion: "",
    operadores_requeridos: 1,
    activo: true,
  });

  const { data: processes = EMPTY_ARRAY, isLoading } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.list('nombre'),
    initialData: EMPTY_ARRAY,
  });

  const { data: machines = EMPTY_ARRAY } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('nombre'),
    initialData: EMPTY_ARRAY,
  });

  const { data: machineProcesses = EMPTY_ARRAY } = useQuery({
    queryKey: ['machineProcesses'],
    queryFn: () => base44.entities.MachineProcess.list(),
    initialData: EMPTY_ARRAY,
  });

  // Filtered machines with their processes
  const filteredMachines = React.useMemo(() => {
    let result = machines.filter(m => {
      const searchTerm = filters.searchTerm || "";
      return !searchTerm || 
        m.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.codigo?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (filters.sortField) {
      result = [...result].sort((a, b) => {
        let aVal = a[filters.sortField];
        let bVal = b[filters.sortField];
        
        if (!aVal) return 1;
        if (!bVal) return -1;
        
        const comparison = String(aVal).localeCompare(String(bVal));
        return filters.sortDirection === 'desc' ? -comparison : comparison;
      });
    }
    
    return result;
  }, [machines, filters]);

  const getMachineProcesses = (machineId) => {
    const machineProcs = machineProcesses.filter(mp => mp.machine_id === machineId && mp.activo);
    return machineProcs.map(mp => {
      const process = processes.find(p => p.id === mp.process_id);
      return {
        ...mp,
        processName: process?.nombre,
        processCode: process?.codigo,
        processActive: process?.activo
      };
    }).filter(mp => mp.processName);
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let savedProcess;
      if (editingProcess?.id) {
        savedProcess = await base44.entities.Process.update(editingProcess.id, data);
      } else {
        savedProcess = await base44.entities.Process.create(data);
        
        // Si es un nuevo proceso, asignarlo a todas las máquinas
        if (machines.length > 0) {
          const machineAssignments = machines.map(machine => ({
            machine_id: machine.id,
            process_id: savedProcess.id,
            operadores_requeridos: data.operadores_requeridos || 1,
            activo: true
          }));
          await base44.entities.MachineProcess.bulkCreate(machineAssignments);
        }
      }
      return savedProcess;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      queryClient.invalidateQueries({ queryKey: ['machineProcesses'] });
      handleClose();
      toast.success("Proceso guardado correctamente");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Process.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      toast.success("Proceso eliminado");
    },
  });

  const saveMachineAssignmentsMutation = useMutation({
    mutationFn: async (data) => {
      const { machineId, assignments } = data;
      
      // Eliminar asignaciones anteriores de esta máquina
      const existing = machineProcesses.filter(mp => mp.machine_id === machineId);
      await Promise.all(existing.map(mp => base44.entities.MachineProcess.delete(mp.id)));
      
      // Crear nuevas asignaciones
      const newAssignments = Object.entries(assignments)
        .filter(([_, assigned]) => assigned.checked)
        .map(([processId, assigned]) => ({
          machine_id: machineId,
          process_id: processId,
          operadores_requeridos: assigned.operadores || 1,
          activo: true
        }));

      if (newAssignments.length > 0) {
        await base44.entities.MachineProcess.bulkCreate(newAssignments);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machineProcesses'] });
      setShowMachineAssignment(null);
      setMachineAssignments({});
      toast.success("Asignaciones guardadas correctamente");
    },
  });

  const handleEdit = (process) => {
    setEditingProcess(process);
    setFormData({
      nombre: process.nombre,
      codigo: process.codigo,
      descripcion: process.descripcion || "",
      operadores_requeridos: process.operadores_requeridos || 1,
      activo: process.activo ?? true,
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este proceso? También se eliminarán sus asignaciones a máquinas.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingProcess(null);
    setFormData({
      nombre: "",
      codigo: "",
      descripcion: "",
      operadores_requeridos: 1,
      activo: true,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleOpenMachineAssignment = (machine) => {
    setShowMachineAssignment(machine);
    
    // Pre-cargar procesos asignados a esta máquina
    const existing = machineProcesses.filter(mp => mp.machine_id === machine.id);
    const assignments = {};
    
    processes.forEach(process => {
      const assignment = existing.find(mp => mp.process_id === process.id);
      assignments[process.id] = {
        checked: !!assignment,
        operadores: assignment?.operadores_requeridos || process.operadores_requeridos || 1
      };
    });
    
    setMachineAssignments(assignments);
  };

  const handleToggleProcess = (processId) => {
    const process = processes.find(p => p.id === processId);
    setMachineAssignments({
      ...machineAssignments,
      [processId]: {
        checked: !machineAssignments[processId]?.checked,
        operadores: machineAssignments[processId]?.operadores || 
                   process?.operadores_requeridos || 1
      }
    });
  };

  const handleOperatorsChange = (processId, value) => {
    setMachineAssignments({
      ...machineAssignments,
      [processId]: {
        ...machineAssignments[processId],
        operadores: parseInt(value) || 1
      }
    });
  };

  const handleSaveMachineAssignments = () => {
    saveMachineAssignmentsMutation.mutate({
      machineId: showMachineAssignment.id,
      assignments: machineAssignments
    });
  };

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link to={createPageUrl("Machines")}>
          <Button variant="ghost" className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Máquinas
          </Button>
        </Link>
      </div>

      <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center">
            <CardTitle>Configuración de Procesos</CardTitle>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Proceso
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6">
            <AdvancedSearch
              data={processes}
              onFilterChange={setFilters}
              searchFields={['nombre', 'codigo']}
              placeholder="Buscar máquina por nombre o código..."
              pageId="process_configuration"
            />
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">Cargando máquinas...</div>
          ) : filteredMachines.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              No se encontraron máquinas con los filtros seleccionados
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredMachines.map((machine) => {
                const machineProcs = getMachineProcesses(machine.id);
                return (
                  <Card key={machine.id} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <Cog className="w-6 h-6 text-blue-600" />
                            <div>
                              <CardTitle className="text-xl">{machine.nombre}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {machine.codigo}
                                </Badge>
                                {machine.ubicacion && (
                                  <span className="text-xs text-slate-500">
                                    📍 {machine.ubicacion}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenMachineAssignment(machine)}
                          className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Configurar Procesos
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {machineProcs.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed">
                          <Cog className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No hay procesos configurados para esta máquina</p>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => handleOpenMachineAssignment(machine)}
                            className="mt-2"
                          >
                            Configurar ahora
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-slate-600 mb-3">
                            Procesos disponibles ({machineProcs.length})
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {machineProcs.map((mp) => (
                              <div
                                key={mp.id}
                                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border hover:border-blue-300 hover:bg-blue-50 transition-all"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">
                                    {mp.processName}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {mp.processCode}
                                  </div>
                                </div>
                                <Badge className="ml-2 bg-purple-100 text-purple-800 shrink-0">
                                  {mp.operadores_requeridos} op.
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      {showForm && (
        <Dialog open={true} onOpenChange={() => setShowForm(false)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProcess ? 'Editar Proceso' : 'Nuevo Proceso'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código *</Label>
                  <Input
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="ej: PROC-001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="ej: Ensamblaje"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  placeholder="Descripción del proceso..."
                />
              </div>

              <div className="space-y-2">
                <Label>Operadores Requeridos *</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.operadores_requeridos}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    operadores_requeridos: parseInt(e.target.value) || 1 
                  })}
                  required
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Número de operadores necesarios por defecto para este proceso
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
                <label htmlFor="activo" className="text-sm font-medium">
                  Proceso activo
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? "Guardando..." : "Guardar Proceso"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Process Assignment Dialog */}
      {showMachineAssignment && (
        <Dialog open={true} onOpenChange={() => setShowMachineAssignment(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Cog className="w-5 h-5 text-blue-600" />
                Configurar Procesos: {showMachineAssignment.nombre}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-slate-700 dark:text-slate-300">Código:</span>
                      <span className="font-semibold ml-2">{showMachineAssignment.codigo}</span>
                    </div>
                    {showMachineAssignment.ubicacion && (
                      <div>
                        <span className="text-slate-700 dark:text-slate-300">Ubicación:</span>
                        <span className="font-semibold ml-2">{showMachineAssignment.ubicacion}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Selecciona los procesos que puede realizar esta máquina:</Label>
                {processes.filter(p => p.activo).map((process) => (
                  <Card key={process.id} className={`
                    border-2 transition-all
                    ${machineAssignments[process.id]?.checked 
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-slate-200 hover:border-slate-300'}
                  `}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            id={`process-${process.id}`}
                            checked={machineAssignments[process.id]?.checked || false}
                            onCheckedChange={() => handleToggleProcess(process.id)}
                          />
                          <label htmlFor={`process-${process.id}`} className="flex-1 cursor-pointer">
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">{process.nombre}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">{process.codigo}</Badge>
                                {process.descripcion && (
                                  <span className="text-xs text-slate-500 dark:text-slate-400">{process.descripcion}</span>
                                )}
                              </div>
                            </div>
                          </label>
                        </div>

                        {machineAssignments[process.id]?.checked && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Operadores:</Label>
                            <Input
                              type="number"
                              min="1"
                              max="20"
                              value={machineAssignments[process.id]?.operadores || 1}
                              onChange={(e) => handleOperatorsChange(process.id, e.target.value)}
                              className="w-20"
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowMachineAssignment(null)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveMachineAssignments}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={saveMachineAssignmentsMutation.isPending}
                >
                  {saveMachineAssignmentsMutation.isPending ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}