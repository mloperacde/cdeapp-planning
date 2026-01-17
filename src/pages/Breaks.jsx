import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Edit, Trash2, Coffee, Sparkles, Clock, Users } from "lucide-react";

export default function BreaksPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingBreak, setEditingBreak] = useState(null);
  const [isCalling, setIsCalling] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nombre: "",
    hora_inicio: "",
    duracion_minutos: 20,
    personas_por_turno: 5,
    aplica_turno_manana: true,
    aplica_turno_tarde: true,
    activo: true,
  });

  const { data: breakShifts, isLoading } = useQuery({
    queryKey: ['breakShifts'],
    queryFn: () => base44.entities.BreakShift.list(),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingBreak?.id) {
        return base44.entities.BreakShift.update(editingBreak.id, data);
      }
      return base44.entities.BreakShift.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakShifts'] });
      handleClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BreakShift.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakShifts'] });
    },
  });

  const handleEdit = (breakShift) => {
    setEditingBreak(breakShift);
    setFormData(breakShift);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingBreak(null);
    setFormData({
      nombre: "",
      hora_inicio: "",
      duracion_minutos: 20,
      personas_por_turno: 5,
      aplica_turno_manana: true,
      aplica_turno_tarde: true,
      activo: true,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este turno de descanso?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCallAgent = async () => {
    setIsCalling(true);
    try {
      // Aquí llamaríamos al agente break_manager
      // Por ahora solo mostramos un mensaje
      alert('Llamando al agente de generación automática de descansos...');
      
      // Simulamos la llamada al agente
      // await base44.agents.breakManager.generate();
      
    } catch (error) {
      console.error('Error al llamar al agente:', error);
      alert('Error al ejecutar la generación automática de descansos');
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Coffee className="w-8 h-8 text-blue-600" />
              Gestión de Descansos
            </h1>
            <p className="text-slate-600 mt-1">
              Configura los horarios y grupos de descanso
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCallAgent}
              disabled={isCalling}
              variant="outline"
              className="bg-white hover:bg-purple-50 border-purple-200"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isCalling ? "Generando..." : "Generar descansos"}
            </Button>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Turno de Descanso
            </Button>
          </div>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Turnos de Descanso Configurados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">Cargando...</div>
            ) : breakShifts.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No hay turnos de descanso configurados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Nombre</TableHead>
                      <TableHead>Hora Inicio</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead>Personas/Turno</TableHead>
                      <TableHead>Aplica a</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breakShifts.map((breakShift) => (
                      <TableRow key={breakShift.id} className="hover:bg-slate-50">
                        <TableCell>
                          <span className="font-semibold text-slate-900">{breakShift.nombre}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            {breakShift.hora_inicio}
                          </div>
                        </TableCell>
                        <TableCell>{breakShift.duracion_minutos} min</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-green-600" />
                            {breakShift.personas_por_turno}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {breakShift.aplica_turno_manana && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700">
                                Mañana
                              </Badge>
                            )}
                            {breakShift.aplica_turno_tarde && (
                              <Badge variant="outline" className="bg-indigo-50 text-indigo-700">
                                Tarde
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            breakShift.activo
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-600"
                          }>
                            {breakShift.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(breakShift)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(breakShift.id)}
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
                {editingBreak ? 'Editar Turno de Descanso' : 'Nuevo Turno de Descanso'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    placeholder="ej. Descanso 1"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hora_inicio">Hora de Inicio *</Label>
                  <Input
                    id="hora_inicio"
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duracion">Duración (minutos) *</Label>
                  <Input
                    id="duracion"
                    type="number"
                    min="5"
                    value={formData.duracion_minutos}
                    onChange={(e) => setFormData({ ...formData, duracion_minutos: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personas">Personas por Turno *</Label>
                  <Input
                    id="personas"
                    type="number"
                    min="1"
                    value={formData.personas_por_turno}
                    onChange={(e) => setFormData({ ...formData, personas_por_turno: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200">
                <Label>Aplicar a Turnos</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="manana"
                      checked={formData.aplica_turno_manana}
                      onCheckedChange={(checked) => setFormData({ ...formData, aplica_turno_manana: checked })}
                    />
                    <label htmlFor="manana" className="text-sm">
                      Turno de Mañana (7:00 - 15:00)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tarde"
                      checked={formData.aplica_turno_tarde}
                      onCheckedChange={(checked) => setFormData({ ...formData, aplica_turno_tarde: checked })}
                    />
                    <label htmlFor="tarde" className="text-sm">
                      Turno de Tarde (14:00/15:00 - 22:00)
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-4 border-t border-slate-200">
                <Checkbox
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
                <label htmlFor="activo" className="text-sm font-medium">
                  Turno Activo
                </label>
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
    </div>
  );
}
