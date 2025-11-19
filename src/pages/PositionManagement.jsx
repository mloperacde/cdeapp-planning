import React, { useState } from "react";
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
import { Briefcase, Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PositionManagement() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    descripcion: "",
    tipo: "",
    activo: true
  });

  const queryClient = useQueryClient();

  const { data: positions = [], isLoading } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list('nombre'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Position.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Position.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Position.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });

  const handleOpenDialog = (position = null) => {
    if (position) {
      setEditingPosition(position);
      setFormData({
        nombre: position.nombre || "",
        codigo: position.codigo || "",
        descripcion: position.descripcion || "",
        tipo: position.tipo || "",
        activo: position.activo !== false
      });
    } else {
      setEditingPosition(null);
      setFormData({
        nombre: "",
        codigo: "",
        descripcion: "",
        tipo: "",
        activo: true
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingPosition(null);
    setFormData({
      nombre: "",
      codigo: "",
      descripcion: "",
      tipo: "",
      activo: true
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingPosition) {
      updateMutation.mutate({ id: editingPosition.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm("¿Eliminar este puesto?")) {
      deleteMutation.mutate(id);
    }
  };

  const getTipoBadgeColor = (tipo) => {
    switch (tipo) {
      case "Responsable de Línea": return "bg-blue-600";
      case "Segunda de Línea": return "bg-purple-600";
      case "Operador de Línea": return "bg-green-600";
      default: return "bg-slate-600";
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Configuración
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-blue-600" />
            Gestión de Puestos
          </h1>
          <p className="text-slate-600 mt-1">
            Configura los puestos de trabajo de la empresa
          </p>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex justify-between items-center">
              <CardTitle>Puestos ({positions.length})</CardTitle>
              <Button onClick={() => handleOpenDialog()} className="bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Puesto
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">Cargando...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Nombre</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((position) => (
                    <TableRow key={position.id} className="hover:bg-slate-50">
                      <TableCell className="font-semibold">{position.nombre}</TableCell>
                      <TableCell>{position.codigo || "-"}</TableCell>
                      <TableCell>
                        {position.tipo ? (
                          <Badge className={getTipoBadgeColor(position.tipo)}>
                            {position.tipo}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {position.descripcion || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={position.activo !== false ? "default" : "secondary"}>
                          {position.activo !== false ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(position)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(position.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPosition ? "Editar Puesto" : "Nuevo Puesto"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo (para asignaciones automáticas)</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Sin especificar</SelectItem>
                  <SelectItem value="Responsable de Línea">Responsable de Línea</SelectItem>
                  <SelectItem value="Segunda de Línea">Segunda de Línea</SelectItem>
                  <SelectItem value="Operador de Línea">Operador de Línea</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="activo">Activo</Label>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-blue-600"
              >
                {createMutation.isPending || updateMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}