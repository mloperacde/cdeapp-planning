import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Cog, Power, PowerOff, CalendarRange } from "lucide-react";
import MachinePlanningManager from "../components/machines/MachinePlanningManager";

export default function MachinesPage() {
  const [showForm, setShowForm] = useState(false);
  const [showPlanning, setShowPlanning] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    tipo: "",
    ubicacion: "",
    estado: "Activa",
    descripcion: "",
    requiere_operadores: 1,
  });

  const { data: machines, isLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('-created_date'),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingMachine?.id) {
        return base44.entities.Machine.update(editingMachine.id, data);
      }
      return base44.entities.Machine.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      handleClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Machine.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, newStatus }) => base44.entities.Machine.update(id, { estado: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });

  const handleEdit = (machine) => {
    setEditingMachine(machine);
    setFormData(machine);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingMachine(null);
    setFormData({
      nombre: "",
      codigo: "",
      tipo: "",
      ubicacion: "",
      estado: "Activa",
      descripcion: "",
      requiere_operadores: 1,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta máquina?')) {
      deleteMutation.mutate(id);
    }
  };

  const toggleStatus = (machine) => {
    const newStatus = machine.estado === "Activa" ? "Inactiva" : "Activa";
    toggleStatusMutation.mutate({ id: machine.id, newStatus });
  };

  const handlePlanningUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['machinePlannings'] });
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Cog className="w-8 h-8 text-blue-600" />
              Gestión de Máquinas
            </h1>
            <p className="text-slate-600 mt-1">
              Administra las máquinas y equipos
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowPlanning(true)}
              variant="outline"
              className="bg-white hover:bg-blue-50 border-blue-200"
            >
              <CalendarRange className="w-4 h-4 mr-2" />
              Planificación de Máquinas
            </Button>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Máquina
            </Button>
          </div>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Lista de Máquinas ({machines.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">Cargando máquinas...</div>
            ) : machines.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No hay máquinas registradas
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Operadores</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {machines.map((machine) => (
                      <TableRow key={machine.id} className="hover:bg-slate-50">
                        <TableCell>
                          <span className="font-mono font-semibold">{machine.codigo}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-slate-900">{machine.nombre}</span>
                        </TableCell>
                        <TableCell>{machine.tipo || '-'}</TableCell>
                        <TableCell>{machine.ubicacion || '-'}</TableCell>
                        <TableCell>
                          <Badge className={
                            machine.estado === "Activa"
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-600"
                          }>
                            {machine.estado === "Activa" ? (
                              <Power className="w-3 h-3 mr-1" />
                            ) : (
                              <PowerOff className="w-3 h-3 mr-1" />
                            )}
                            {machine.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>{machine.requiere_operadores || 1}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleStatus(machine)}
                              title={machine.estado === "Activa" ? "Desactivar" : "Activar"}
                            >
                              {machine.estado === "Activa" ? (
                                <PowerOff className="w-4 h-4 text-slate-600" />
                              ) : (
                                <Power className="w-4 h-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(machine)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(machine.id)}
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

      {showForm && (
        <Dialog open={true} onOpenChange={handleClose}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingMachine ? 'Editar Máquina' : 'Nueva Máquina'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Input
                    id="tipo"
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ubicacion">Ubicación</Label>
                  <Input
                    id="ubicacion"
                    value={formData.ubicacion}
                    onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado *</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) => setFormData({ ...formData, estado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Activa">Activa</SelectItem>
                      <SelectItem value="Inactiva">Inactiva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="operadores">Operadores Requeridos</Label>
                  <Input
                    id="operadores"
                    type="number"
                    min="1"
                    value={formData.requiere_operadores}
                    onChange={(e) => setFormData({ ...formData, requiere_operadores: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {showPlanning && (
        <MachinePlanningManager
          open={showPlanning}
          onOpenChange={setShowPlanning}
          machines={machines}
          onUpdate={handlePlanningUpdate}
        />
      )}
    </div>
  );
}