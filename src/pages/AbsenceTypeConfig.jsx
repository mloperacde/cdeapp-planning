
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Edit, Trash2, Settings, ArrowLeft, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AbsenceTypeConfigPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    remunerada: false,
    requiere_aprobacion: true,
    duracion_prevista_dias: 0,
    es_critica: false,
    notificar_admin: false,
    dias_aviso_previo: 0,
    color: "#3B82F6",
    descripcion: "",
    activo: true,
    orden: 0,
  });

  const { data: absenceTypes, isLoading } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.list('orden'),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingType?.id) {
        return base44.entities.AbsenceType.update(editingType.id, data);
      }
      // Si es nuevo y no tiene orden, asignar el siguiente
      if (!data.orden) {
        data.orden = absenceTypes.length + 1;
      }
      return base44.entities.AbsenceType.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absenceTypes'] });
      handleClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AbsenceType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absenceTypes'] });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (updates) => {
      const promises = updates.map(({ id, orden }) =>
        base44.entities.AbsenceType.update(id, { orden })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absenceTypes'] });
    },
  });

  const handleEdit = (type) => {
    setEditingType(type);
    setFormData({
      ...type,
      duracion_prevista_dias: type.duracion_prevista_dias || 0,
      es_critica: type.es_critica || false,
      notificar_admin: type.notificar_admin || false,
      dias_aviso_previo: type.dias_aviso_previo || 0,
    });
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingType(null);
    setFormData({
      nombre: "",
      codigo: "",
      remunerada: false,
      requiere_aprobacion: true,
      duracion_prevista_dias: 0,
      es_critica: false,
      notificar_admin: false,
      dias_aviso_previo: 0,
      color: "#3B82F6",
      descripcion: "",
      activo: true,
      orden: 0,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este tipo de ausencia?')) {
      deleteMutation.mutate(id);
    }
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const updates = [
      { id: absenceTypes[index].id, orden: absenceTypes[index - 1].orden },
      { id: absenceTypes[index - 1].id, orden: absenceTypes[index].orden },
    ];
    updateOrderMutation.mutate(updates);
  };

  const moveDown = (index) => {
    if (index >= absenceTypes.length - 1) return;
    const updates = [
      { id: absenceTypes[index].id, orden: absenceTypes[index + 1].orden },
      { id: absenceTypes[index + 1].id, orden: absenceTypes[index].orden },
    ];
    updateOrderMutation.mutate(updates);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("AbsenceManagement")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Gestión de Ausencias
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Settings className="w-8 h-8 text-blue-600" />
              Configuración de Tipos de Ausencias
            </h1>
            <p className="text-slate-600 mt-1">
              Define los tipos de ausencias disponibles en el sistema
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Tipo
          </Button>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mb-6">
          <CardHeader className="border-b border-slate-100 bg-blue-50">
            <CardTitle className="text-blue-900">ℹ️ Información</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-sm text-blue-800 space-y-1">
              <p>• Los tipos de ausencias configurados aquí aparecerán en el formulario de registro de ausencias</p>
              <p>• Puedes definir si cada tipo es remunerado (con pago de salario) o no</p>
              <p>• El orden de visualización se puede ajustar con los botones de flecha</p>
              <p>• Los tipos inactivos no aparecerán en los formularios pero se mantienen en el historial</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Tipos de Ausencias ({absenceTypes.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">Cargando tipos...</div>
            ) : absenceTypes.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No hay tipos de ausencias configurados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-12">Orden</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Remunerada</TableHead>
                      <TableHead>Requiere Aprobación</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {absenceTypes.map((type, index) => (
                      <TableRow key={type.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => moveUp(index)}
                              disabled={index === 0}
                            >
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => moveDown(index)}
                              disabled={index >= absenceTypes.length - 1}
                            >
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-semibold text-slate-700">
                            {type.codigo}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: type.color || '#3B82F6' }}
                            />
                            <span className="font-semibold text-slate-900">{type.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            type.remunerada 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }>
                            {type.remunerada ? "Sí" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            type.requiere_aprobacion 
                              ? "border-orange-300 text-orange-700" 
                              : "border-blue-300 text-blue-700"
                          }>
                            {type.requiere_aprobacion ? "Sí" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            type.activo
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-600"
                          }>
                            {type.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
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
                {editingType ? 'Editar Tipo de Ausencia' : 'Nuevo Tipo de Ausencia'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="ej: VAC, BM, PERM"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="ej: Vacaciones"
                    required
                  />
                </div>
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
                <Label htmlFor="color">Color Identificativo</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <Label htmlFor="remunerada" className="font-semibold">Ausencia Remunerada</Label>
                    <p className="text-xs text-slate-600">El empleado recibe pago durante esta ausencia</p>
                  </div>
                  <Switch
                    id="remunerada"
                    checked={formData.remunerada}
                    onCheckedChange={(checked) => setFormData({ ...formData, remunerada: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <Label htmlFor="requiere_aprobacion" className="font-semibold">Requiere Aprobación</Label>
                    <p className="text-xs text-slate-600">La ausencia debe ser aprobada antes de aplicarse</p>
                  </div>
                  <Switch
                    id="requiere_aprobacion"
                    checked={formData.requiere_aprobacion}
                    onCheckedChange={(checked) => setFormData({ ...formData, requiere_aprobacion: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div>
                    <Label htmlFor="es_critica" className="font-semibold">Ausencia Crítica</Label>
                    <p className="text-xs text-amber-700">Requiere notificación especial y atención inmediata</p>
                  </div>
                  <Switch
                    id="es_critica"
                    checked={formData.es_critica}
                    onCheckedChange={(checked) => setFormData({ ...formData, es_critica: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div>
                    <Label htmlFor="notificar_admin" className="font-semibold">Notificar Admin/Supervisores</Label>
                    <p className="text-xs text-blue-700">Enviar notificaciones cuando se registre este tipo</p>
                  </div>
                  <Switch
                    id="notificar_admin"
                    checked={formData.notificar_admin}
                    onCheckedChange={(checked) => setFormData({ ...formData, notificar_admin: checked })}
                  />
                </div>

                <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                  <Label htmlFor="duracion_prevista_dias">Duración Prevista (días)</Label>
                  <Input
                    id="duracion_prevista_dias"
                    type="number"
                    min="0"
                    value={formData.duracion_prevista_dias}
                    onChange={(e) => setFormData({ ...formData, duracion_prevista_dias: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-slate-600">Duración estimada típica para este tipo de ausencia</p>
                </div>

                <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                  <Label htmlFor="dias_aviso_previo">Días de Aviso Previo</Label>
                  <Input
                    id="dias_aviso_previo"
                    type="number"
                    min="0"
                    value={formData.dias_aviso_previo}
                    onChange={(e) => setFormData({ ...formData, dias_aviso_previo: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-slate-600">Días antes del inicio para generar notificación (0 = no notificar)</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <Label htmlFor="activo" className="font-semibold">Tipo Activo</Label>
                    <p className="text-xs text-slate-600">Si está activo aparecerá en los formularios</p>
                  </div>
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
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
    </div>
  );
}
