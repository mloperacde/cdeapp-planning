import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Edit, Trash2, Cog, Brain, Loader, Zap } from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { getMachineAlias } from "@/utils/machineAlias";
import MaintenancePlanTemplatesLibrary from "./MaintenancePlanTemplatesLibrary";
import MaintenancePlanTemplateAIGenerator from "./MaintenancePlanTemplateAIGenerator";

export default function MaintenanceTypeManager({ open, onOpenChange, machines: machinesProp }) {
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [showTemplatesLibrary, setShowTemplatesLibrary] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: () => base44.functions.invoke('syncMaintenancePlansWithMachines', {}),
    onSuccess: (data) => {
      toast({
        title: "Sincronización completada",
        description: `Se sincronizaron ${data.syncedCount} planes de ${data.totalPlans} planes activos`,
      });
      queryClient.invalidateQueries({ queryKey: ['maintenanceTypes'] });
    },
    onError: (error) => {
      toast({
        title: "Error en sincronización",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createEmptySubtask = () => ({
    titulo: "",
    duracion_minutos: 0,
    herramientas: "",
    observaciones: ""
  });

  const createEmptyTask = () => ({
    nombre: "",
    duracion_minutos: 0,
    observaciones: "",
    subtarea_1: createEmptySubtask(),
    subtarea_2: createEmptySubtask(),
    subtarea_3: createEmptySubtask(),
    subtarea_4: createEmptySubtask(),
    subtarea_5: createEmptySubtask(),
    subtarea_6: createEmptySubtask(),
    subtarea_7: createEmptySubtask(),
    subtarea_8: createEmptySubtask(),
  });

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    machine_ids: [],
    activo: true,
    tarea_1: createEmptyTask(),
    tarea_2: createEmptyTask(),
    tarea_3: createEmptyTask(),
    tarea_4: createEmptyTask(),
    tarea_5: createEmptyTask(),
    tarea_6: createEmptyTask(),
  });

  // Merge MachineMasterDatabase (passed as prop) + Machine inventory entity
  const { data: inventoryMachines = [] } = useQuery({
    queryKey: ["equipment-inventory"],
    queryFn: () => base44.entities.Machine.list("codigo", 500),
    staleTime: 5 * 60 * 1000,
  });

  // Combine both sources, deduplicated by id
  const machines = useMemo(() => {
    const combined = [...(machinesProp || []), ...inventoryMachines];
    const seen = new Set();
    return combined.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
  }, [machinesProp, inventoryMachines]);

  const { data: maintenanceTypes } = useQuery({
    queryKey: ['maintenanceTypes'],
    queryFn: () => base44.entities.MaintenanceType.list(),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingType?.id) {
        await base44.entities.MaintenanceType.update(editingType.id, data);
      } else {
        await base44.entities.MaintenanceType.create(data);
      }
      // Sincronizar planes con máquinas automáticamente tras guardar
      await base44.functions.invoke('syncMaintenancePlansWithMachines', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceTypes'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
      toast({
        title: "Guardado y sincronizado",
        description: "El tipo de mantenimiento se guardó y los planes se sincronizaron con las máquinas.",
      });
      handleCloseForm();
    },
    onError: (error) => {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceTypes'] });
    },
  });

  const handleEdit = (type) => {
    setEditingType(type);
    const safeData = { ...type };
    for (let i = 1; i <= 6; i++) {
      if (!safeData[`tarea_${i}`]) {
        safeData[`tarea_${i}`] = createEmptyTask();
      } else if (typeof safeData[`tarea_${i}`].subtarea_1 === 'string') {
        // Migrar desde formato viejo al nuevo
        const oldTask = safeData[`tarea_${i}`];
        safeData[`tarea_${i}`] = createEmptyTask();
        safeData[`tarea_${i}`].nombre = oldTask.nombre || "";
      }
    }
    setFormData(safeData);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este tipo de mantenimiento?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingType(null);
    setFormData({
      nombre: "",
      descripcion: "",
      machine_ids: [],
      activo: true,
      tarea_1: createEmptyTask(),
      tarea_2: createEmptyTask(),
      tarea_3: createEmptyTask(),
      tarea_4: createEmptyTask(),
      tarea_5: createEmptyTask(),
      tarea_6: createEmptyTask(),
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const toggleMachine = (machineId) => {
    setFormData(prev => ({
      ...prev,
      machine_ids: prev.machine_ids.includes(machineId)
        ? prev.machine_ids.filter(id => id !== machineId)
        : [...prev.machine_ids, machineId]
    }));
  };

  const updateTask = (taskNum, field, value) => {
    setFormData(prev => ({
      ...prev,
      [`tarea_${taskNum}`]: {
        ...(prev[`tarea_${taskNum}`] || createEmptyTask()),
        [field]: value
      }
    }));
  };

  const updateSubtask = (taskNum, subNum, field, value) => {
    setFormData(prev => ({
      ...prev,
      [`tarea_${taskNum}`]: {
        ...prev[`tarea_${taskNum}`],
        [`subtarea_${subNum}`]: {
          ...(prev[`tarea_${taskNum}`][`subtarea_${subNum}`] || createEmptySubtask()),
          [field]: value
        }
      }
    }));
  };

  const getMachineName = (machineId) => {
    const machine = machines.find(m => m.id === machineId);
    return machine ? getMachineAlias(machine) : "Máquina desconocida";
  };

  if (showForm) {
    return (
      <Dialog open={true} onOpenChange={handleCloseForm}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Editar Tipo de Mantenimiento' : 'Nuevo Tipo de Mantenimiento'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Máquinas a las que Aplica</Label>
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {machines.map((machine) => (
                      <div key={machine.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`machine-${machine.id}`}
                          checked={formData.machine_ids.includes(machine.id)}
                          onCheckedChange={() => toggleMachine(machine.id)}
                        />
                        <label htmlFor={`machine-${machine.id}`} className="text-sm cursor-pointer">
                                                    {getMachineAlias(machine)}
                                                </label>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-500">Seleccionadas: {formData.machine_ids.length}</p>
              </div>
            </div>

            <Tabs defaultValue="tarea_1" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <TabsTrigger key={num} value={`tarea_${num}`}>
                    Tarea {num}
                  </TabsTrigger>
                ))}
              </TabsList>

              {[1, 2, 3, 4, 5, 6].map((taskNum) => (
                <TabsContent key={taskNum} value={`tarea_${taskNum}`} className="space-y-6 mt-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-3 border border-blue-200 dark:border-blue-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nombre de la Tarea {taskNum} *</Label>
                        <Input
                          value={formData[`tarea_${taskNum}`].nombre}
                          onChange={(e) => updateTask(taskNum, 'nombre', e.target.value)}
                          placeholder={`ej. Inspección de componentes`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Duración Total (minutos)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData[`tarea_${taskNum}`].duracion_minutos}
                          onChange={(e) => updateTask(taskNum, 'duracion_minutos', parseInt(e.target.value) || 0)}
                          placeholder="ej. 45"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Observaciones de la Tarea</Label>
                      <Textarea
                        value={formData[`tarea_${taskNum}`].observaciones}
                        onChange={(e) => updateTask(taskNum, 'observaciones', e.target.value)}
                        placeholder="Notas especiales o recomendaciones del fabricante"
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-900 dark:text-white">Subtareas</h4>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((subNum) => {
                      const subtask = formData[`tarea_${taskNum}`][`subtarea_${subNum}`];
                      if (!subtask?.titulo) return null;
                      return (
                        <div key={subNum} className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900/30 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Subtarea {subNum}: Título</Label>
                              <Input
                                value={subtask.titulo}
                                onChange={(e) => updateSubtask(taskNum, subNum, 'titulo', e.target.value)}
                                placeholder={`Título de subtarea ${subNum}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Duración (minutos)</Label>
                              <Input
                                type="number"
                                min="0"
                                value={subtask.duracion_minutos}
                                onChange={(e) => updateSubtask(taskNum, subNum, 'duracion_minutos', parseInt(e.target.value) || 0)}
                                placeholder="ej. 15"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Herramientas Requeridas</Label>
                            <Input
                              value={subtask.herramientas}
                              onChange={(e) => updateSubtask(taskNum, subNum, 'herramientas', e.target.value)}
                              placeholder="ej. Llave inglesa, destornillador Phillips"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Observaciones</Label>
                            <Textarea
                              value={subtask.observaciones}
                              onChange={(e) => updateSubtask(taskNum, subNum, 'observaciones', e.target.value)}
                              placeholder="Recomendaciones especiales o precauciones"
                              rows={2}
                            />
                          </div>
                        </div>
                      );
                    })}
                    
                    {!formData[`tarea_${taskNum}`].subtarea_1?.titulo && (
                      <p className="text-sm text-slate-500 italic">Sin subtareas configuradas para esta tarea</p>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="activo"
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
              />
              <label htmlFor="activo" className="text-sm font-medium">
                Tipo de Mantenimiento Activo
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Tipos de Mantenimiento</span>
            <div className="flex gap-2">
              <Button 
                onClick={() => syncMutation.mutate()}
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={syncMutation.isPending}
              >
                <Zap className="w-4 h-4" />
                {syncMutation.isPending ? "Sincronizando..." : "Sincronizar"}
              </Button>
              <Button 
                onClick={() => setShowAIGenerator(true)} 
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Brain className="w-4 h-4" />
                Generar con IA
              </Button>
              <Button onClick={() => setShowForm(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Tipo
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {maintenanceTypes.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No hay tipos de mantenimiento configurados
            </div>
          ) : (
            maintenanceTypes.map((type) => (
              <Card key={type.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{type.nombre}</CardTitle>
                      <Badge className={type.activo ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}>
                        {type.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(type)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(type.id)}
                        className="hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {type.descripcion && (
                    <p className="text-sm text-slate-600 mt-2">{type.descripcion}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <Cog className="w-4 h-4" />
                        Máquinas Asignadas ({type.machine_ids?.length || 0})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {type.machine_ids?.length > 0 ? (
                          type.machine_ids.map((machineId) => (
                            <Badge key={machineId} variant="outline" className="bg-blue-50 text-blue-700">
                              {getMachineName(machineId)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">No hay máquinas asignadas</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Tareas Configuradas</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6].map((num) => (
                          type[`tarea_${num}`]?.nombre && (
                            <Badge key={num} variant="outline" className="bg-slate-50 text-slate-700">
                              {num}. {type[`tarea_${num}`].nombre}
                            </Badge>
                          )
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {showAIGenerator && (
          <div className="mt-4 pt-4 border-t">
            <MaintenancePlanTemplateAIGenerator 
              machines={machines}
              onTemplateGenerated={() => {
                setShowAIGenerator(false);
                queryClient.invalidateQueries({ queryKey: ['maintenanceTypes'] });
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}