import React, { useState } from "react";
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
import { Plus, Edit, Trash2, Cog } from "lucide-react";

export default function MaintenanceTypeManager({ open, onOpenChange, machines }) {
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    machine_ids: [],
    activo: true,
    tarea_1: { nombre: "", subtarea_1: "", subtarea_2: "", subtarea_3: "", subtarea_4: "", subtarea_5: "", subtarea_6: "", subtarea_7: "", subtarea_8: "" },
    tarea_2: { nombre: "", subtarea_1: "", subtarea_2: "", subtarea_3: "", subtarea_4: "", subtarea_5: "", subtarea_6: "", subtarea_7: "", subtarea_8: "" },
    tarea_3: { nombre: "", subtarea_1: "", subtarea_2: "", subtarea_3: "", subtarea_4: "", subtarea_5: "", subtarea_6: "", subtarea_7: "", subtarea_8: "" },
    tarea_4: { nombre: "", subtarea_1: "", subtarea_2: "", subtarea_3: "", subtarea_4: "", subtarea_5: "", subtarea_6: "", subtarea_7: "", subtarea_8: "" },
    tarea_5: { nombre: "", subtarea_1: "", subtarea_2: "", subtarea_3: "", subtarea_4: "", subtarea_5: "", subtarea_6: "", subtarea_7: "", subtarea_8: "" },
    tarea_6: { nombre: "", subtarea_1: "", subtarea_2: "", subtarea_3: "", subtarea_4: "", subtarea_5: "", subtarea_6: "", subtarea_7: "", subtarea_8: "" },
  });

  const { data: maintenanceTypes } = useQuery({
    queryKey: ['maintenanceTypes'],
    queryFn: () => base44.entities.MaintenanceType.list(),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingType?.id) {
        return base44.entities.MaintenanceType.update(editingType.id, data);
      }
      return base44.entities.MaintenanceType.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceTypes'] });
      handleCloseForm();
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
    setFormData(type);
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
      tarea_1: { nombre: "", subtarea_1: "", subtarea_2: "", subtarea_3: "", subtarea_4: "", subtarea_5: "", subtarea_6: "", subtarea_7: "", subtarea_8: "" },
      tarea_2: { nombre: "", subtarea_1: "", subtarea_2: "", subtarea_3: "", subtarea_4: "", subtarea_5: "", subtarea_6: "", subtarea_7: "", subtarea_8: "" },
      tarea_3: { nombre: "", subtarea_1: "", subtarea_2: "", subtarea_3: "", subtarea_4: "", subtarea_5: "", subtarea_6: "", subtarea_7: "", subtarea_8: "" },
      tarea_4: { nombre: "", subtarea_1: "", subtarea_2: "", subtarea_3: "", subtarea_4: "", subtarea_5: "", subtarea_6: "", subtarea_7: "", subtarea_8: "" },
      tarea_5: { nombre: "", subtarea_1: "", subtarea_2: "", subtarea_3: "", subtarea_4: "", subtarea_5: "", subtarea_6: "", subtarea_7: "", subtarea_8: "" },
      tarea_6: { nombre: "", subtarea_1: "", subtarea_2: "", subtarea_3: "", subtarea_4: "", subtarea_5: "", subtarea_6: "", subtarea_7: "", subtarea_8: "" },
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
        ...prev[`tarea_${taskNum}`],
        [field]: value
      }
    }));
  };

  const getMachineName = (machineId) => {
    const machine = machines.find(m => m.id === machineId);
    return machine?.nombre || "Máquina desconocida";
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
                          {machine.nombre}
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
                <TabsContent key={taskNum} value={`tarea_${taskNum}`} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Nombre de la Tarea {taskNum}</Label>
                    <Input
                      value={formData[`tarea_${taskNum}`].nombre}
                      onChange={(e) => updateTask(taskNum, 'nombre', e.target.value)}
                      placeholder={`ej. Inspección de componentes`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((subNum) => (
                      <div key={subNum} className="space-y-2">
                        <Label>Subtarea {subNum}</Label>
                        <Input
                          value={formData[`tarea_${taskNum}`][`subtarea_${subNum}`]}
                          onChange={(e) => updateTask(taskNum, `subtarea_${subNum}`, e.target.value)}
                          placeholder={`Descripción subtarea ${subNum}`}
                        />
                      </div>
                    ))}
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
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Tipo
            </Button>
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
      </DialogContent>
    </Dialog>
  );
}