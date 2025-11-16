
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Plane, AlertCircle, Edit } from "lucide-react";
import { format, eachDayOfInterval, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function VacationManager({ open, onOpenChange, vacations = [], onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [editingVacation, setEditingVacation] = useState(null);
  const [formData, setFormData] = useState({
    fecha_inicio: "",
    fecha_fin: "",
    nombre: "",
    descripcion: "",
  });

  const queryClient = useQueryClient();

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (editingVacation) {
        await base44.entities.Vacation.update(editingVacation.id, data);
      } else {
        await base44.entities.Vacation.create(data);
      }
      onUpdate();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
      setFormData({ fecha_inicio: "", fecha_fin: "", nombre: "", descripcion: "" });
      setShowForm(false);
      setEditingVacation(null);
      toast.success(editingVacation ? "Vacaciones actualizadas" : "Vacaciones creadas");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Vacation.delete(id);
      onUpdate();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
      toast.success("Período eliminado");
    },
  });

  const handleEdit = (vacation) => {
    setEditingVacation(vacation);
    setFormData({
      fecha_inicio: vacation.fecha_inicio,
      fecha_fin: vacation.fecha_fin,
      nombre: vacation.nombre,
      descripcion: vacation.descripcion || "",
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.fecha_inicio && formData.fecha_fin && formData.nombre) {
      if (new Date(formData.fecha_fin) < new Date(formData.fecha_inicio)) {
        toast.error("La fecha de fin no puede ser anterior a la fecha de inicio");
        return;
      }
      createMutation.mutate(formData);
    }
  };

  const sortedVacations = Array.isArray(vacations) ? [...vacations].sort(
    (a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio)
  ) : [];

  const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const allDays = eachDayOfInterval({ start, end });
    const totalDays = allDays.length;
    
    const holidayDates = holidays.map(h => format(new Date(h.fecha), 'yyyy-MM-dd'));
    
    const workableDays = allDays.filter(day => {
      const dayOfWeek = getDay(day);
      const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6; // 0 for Sunday, 6 for Saturday
      const isHolidayDay = holidayDates.includes(format(day, 'yyyy-MM-dd'));
      return !isWeekendDay && !isHolidayDay;
    }).length;

    return { total: totalDays, workable: workableDays };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Plane className="w-6 h-6 text-sky-600" />
            Gestión de Vacaciones
          </DialogTitle>
          <DialogDescription>
            Configura períodos de vacaciones. Se guardarán automáticamente.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-sky-200 bg-sky-50">
          <AlertCircle className="h-4 w-4 text-sky-600" />
          <AlertDescription className="text-sky-800">
            Los períodos de vacaciones se excluirán automáticamente de la línea de tiempo, junto con fines de semana y festivos.
            Se muestran días totales y días laborables (excluyendo fines de semana y festivos).
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {!showForm ? (
            <Button
              onClick={() => setShowForm(true)}
              className="w-full bg-sky-600 hover:bg-sky-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Añadir Período de Vacaciones
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_inicio">Fecha de Inicio *</Label>
                  <Input
                    id="fecha_inicio"
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha_fin">Fecha de Fin *</Label>
                  <Input
                    id="fecha_fin"
                    type="date"
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Período *</Label>
                <Input
                  id="nombre"
                  placeholder="ej. Vacaciones de verano, Semana Santa..."
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción (opcional)</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Información adicional"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={2}
                />
              </div>

              {formData.fecha_inicio && formData.fecha_fin && new Date(formData.fecha_fin) >= new Date(formData.fecha_inicio) && (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
                  {(() => {
                    const { total, workable } = calculateDays(formData.fecha_inicio, formData.fecha_fin);
                    return (
                      <div className="space-y-1">
                        <p className="text-sm text-sky-800">
                          Días totales: <span className="font-semibold">{total} días</span>
                        </p>
                        <p className="text-sm text-sky-800">
                          Días laborables: <span className="font-semibold">{workable} días</span>
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 bg-sky-600 hover:bg-sky-700"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Guardando..." : editingVacation ? "Actualizar" : "Guardar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingVacation(null);
                    setFormData({ fecha_inicio: "", fecha_fin: "", nombre: "", descripcion: "" });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {sortedVacations.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Período</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Días</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedVacations.map((vacation) => {
                    const { total, workable } = calculateDays(vacation.fecha_inicio, vacation.fecha_fin);
                    return (
                      <TableRow key={vacation.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">
                              {format(new Date(vacation.fecha_inicio), "d MMM yyyy", { locale: es })}
                            </span>
                            <span className="text-xs text-slate-500">hasta</span>
                            <span className="font-semibold text-sm">
                              {format(new Date(vacation.fecha_fin), "d MMM yyyy", { locale: es })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-sky-100 text-sky-800">
                            {vacation.nombre}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-sky-700">{total}</span>
                              <span className="text-xs text-slate-600">días totales</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-emerald-700">{workable}</span>
                              <span className="text-xs text-slate-600">laborables</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                          {vacation.descripcion || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(vacation)}
                              className="hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(vacation.id)}
                              disabled={deleteMutation.isPending}
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
          ) : (
            <div className="text-center py-12 border rounded-lg bg-slate-50">
              <Plane className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 mb-2">No hay períodos de vacaciones configurados</p>
              <p className="text-sm text-slate-500">
                Añade vacaciones para excluirlas de la línea de tiempo
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
