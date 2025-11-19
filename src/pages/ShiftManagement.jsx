import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, Plus, Pencil, Trash2, ArrowLeft, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ShiftManagement() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    tipo: "",
    hora_inicio: "",
    hora_fin: "",
    hora_inicio_2: "",
    hora_fin_2: "",
    horario_manana_inicio: "",
    horario_manana_fin: "",
    horario_tarde_inicio: "",
    horario_tarde_fin: "",
    requiere_equipo: false,
    activo: true,
    descripcion: ""
  });

  const queryClient = useQueryClient();

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('nombre'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Shift.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });

  const handleOpenDialog = (shift = null) => {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        nombre: shift.nombre || "",
        codigo: shift.codigo || "",
        tipo: shift.tipo || "",
        hora_inicio: shift.hora_inicio || "",
        hora_fin: shift.hora_fin || "",
        hora_inicio_2: shift.hora_inicio_2 || "",
        hora_fin_2: shift.hora_fin_2 || "",
        horario_manana_inicio: shift.horario_manana_inicio || "",
        horario_manana_fin: shift.horario_manana_fin || "",
        horario_tarde_inicio: shift.horario_tarde_inicio || "",
        horario_tarde_fin: shift.horario_tarde_fin || "",
        requiere_equipo: shift.requiere_equipo !== false,
        activo: shift.activo !== false,
        descripcion: shift.descripcion || ""
      });
    } else {
      setEditingShift(null);
      setFormData({
        nombre: "",
        codigo: "",
        tipo: "",
        hora_inicio: "",
        hora_fin: "",
        hora_inicio_2: "",
        hora_fin_2: "",
        horario_manana_inicio: "",
        horario_manana_fin: "",
        horario_tarde_inicio: "",
        horario_tarde_fin: "",
        requiere_equipo: false,
        activo: true,
        descripcion: ""
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingShift(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingShift) {
      updateMutation.mutate({ id: editingShift.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm("¿Eliminar este turno?")) {
      deleteMutation.mutate(id);
    }
  };

  const getTipoBadgeColor = (tipo) => {
    switch (tipo) {
      case "Rotativo": return "bg-blue-600";
      case "Fijo Mañana": return "bg-yellow-600";
      case "Fijo Tarde": return "bg-orange-600";
      case "Fijo Noche": return "bg-purple-600";
      case "Turno Partido": return "bg-green-600";
      default: return "bg-slate-600";
    }
  };

  const getHorarioDisplay = (shift) => {
    if (shift.tipo === "Turno Partido") {
      return `${shift.hora_inicio || "?"}-${shift.hora_fin || "?"} y ${shift.hora_inicio_2 || "?"}-${shift.hora_fin_2 || "?"}`;
    } else if (shift.tipo === "Rotativo") {
      return `M: ${shift.horario_manana_inicio || "?"}-${shift.horario_manana_fin || "?"} | T: ${shift.horario_tarde_inicio || "?"}-${shift.horario_tarde_fin || "?"}`;
    } else {
      return `${shift.hora_inicio || "?"}-${shift.hora_fin || "?"}`;
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
            <Clock className="w-8 h-8 text-blue-600" />
            Gestión de Turnos
          </h1>
          <p className="text-slate-600 mt-1">
            Configura los turnos de trabajo con horarios específicos
          </p>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex justify-between items-center">
              <CardTitle>Turnos ({shifts.length})</CardTitle>
              <Button onClick={() => handleOpenDialog()} className="bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Turno
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
                    <TableHead>Horario</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map((shift) => (
                    <TableRow key={shift.id} className="hover:bg-slate-50">
                      <TableCell className="font-semibold">{shift.nombre}</TableCell>
                      <TableCell>{shift.codigo || "-"}</TableCell>
                      <TableCell>
                        <Badge className={getTipoBadgeColor(shift.tipo)}>
                          {shift.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {getHorarioDisplay(shift)}
                      </TableCell>
                      <TableCell>
                        {shift.requiere_equipo ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            Sí
                          </Badge>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={shift.activo !== false ? "default" : "secondary"}>
                          {shift.activo !== false ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(shift)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(shift.id)}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingShift ? "Editar Turno" : "Nuevo Turno"}
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
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="tipo">Tipo de Turno *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rotativo">Rotativo</SelectItem>
                    <SelectItem value="Fijo Mañana">Fijo Mañana</SelectItem>
                    <SelectItem value="Fijo Tarde">Fijo Tarde</SelectItem>
                    <SelectItem value="Fijo Noche">Fijo Noche</SelectItem>
                    <SelectItem value="Turno Partido">Turno Partido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.tipo === "Rotativo" && (
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-4">
                <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Configuración Turno Rotativo
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mañana - Inicio</Label>
                    <Input
                      type="time"
                      value={formData.horario_manana_inicio}
                      onChange={(e) => setFormData({ ...formData, horario_manana_inicio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mañana - Fin</Label>
                    <Input
                      type="time"
                      value={formData.horario_manana_fin}
                      onChange={(e) => setFormData({ ...formData, horario_manana_fin: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tarde - Inicio</Label>
                    <Input
                      type="time"
                      value={formData.horario_tarde_inicio}
                      onChange={(e) => setFormData({ ...formData, horario_tarde_inicio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tarde - Fin</Label>
                    <Input
                      type="time"
                      value={formData.horario_tarde_fin}
                      onChange={(e) => setFormData({ ...formData, horario_tarde_fin: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.tipo === "Turno Partido" && (
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg space-y-4">
                <h4 className="font-semibold text-green-900 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Configuración Turno Partido
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primera Parte - Inicio</Label>
                    <Input
                      type="time"
                      value={formData.hora_inicio}
                      onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Primera Parte - Fin</Label>
                    <Input
                      type="time"
                      value={formData.hora_fin}
                      onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Segunda Parte - Inicio</Label>
                    <Input
                      type="time"
                      value={formData.hora_inicio_2}
                      onChange={(e) => setFormData({ ...formData, hora_inicio_2: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Segunda Parte - Fin</Label>
                    <Input
                      type="time"
                      value={formData.hora_fin_2}
                      onChange={(e) => setFormData({ ...formData, hora_fin_2: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {(formData.tipo === "Fijo Mañana" || formData.tipo === "Fijo Tarde" || formData.tipo === "Fijo Noche") && (
              <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg space-y-4">
                <h4 className="font-semibold text-yellow-900 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Configuración Turno Fijo
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora Inicio</Label>
                    <Input
                      type="time"
                      value={formData.hora_inicio}
                      onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora Fin</Label>
                    <Input
                      type="time"
                      value={formData.hora_fin}
                      onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requiere_equipo"
                  checked={formData.requiere_equipo}
                  onChange={(e) => setFormData({ ...formData, requiere_equipo: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="requiere_equipo">Requiere asignación de equipo</Label>
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