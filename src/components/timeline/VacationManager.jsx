
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
import { format, differenceInDays, eachDayOfInterval, isWeekend } from "date-fns";
import { es } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function VacationManager({ open, onOpenChange, vacations = [], onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [editingVacation, setEditingVacation] = useState(null);
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    name: "",
    notes: "",
  });

  const queryClient = useQueryClient();

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => editingVacation 
      ? base44.entities.Vacation.update(editingVacation.id, data)
      : base44.entities.Vacation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
      onUpdate();
      setFormData({ start_date: "", end_date: "", name: "", notes: "" });
      setShowForm(false);
      setEditingVacation(null);
      toast.success(editingVacation ? "Vacaciones actualizadas" : "Vacaciones creadas");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vacation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
      onUpdate();
      toast.success("Período eliminado");
    },
  });

  const handleEdit = (vacation) => {
    setEditingVacation(vacation);
    setFormData({
      start_date: vacation.start_date,
      end_date: vacation.end_date,
      name: vacation.name,
      notes: vacation.notes || "",
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.start_date && formData.end_date && formData.name) {
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        toast.error("La fecha de fin no puede ser anterior a la fecha de inicio");
        return;
      }
      createMutation.mutate(formData);
    }
  };

  const sortedVacations = Array.isArray(vacations) ? [...vacations].sort(
    (a, b) => new Date(a.start_date) - new Date(b.start_date)
  ) : [];

  const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const allDays = eachDayOfInterval({ start, end });
    const totalDays = allDays.length;
    
    const holidayDates = holidays.map(h => new Date(h.date).toDateString());
    
    const workableDays = allDays.filter(day => 
      !isWeekend(day) && !holidayDates.includes(day.toDateString())
    ).length;

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
            Añade, edita o elimina períodos de vacaciones. Estos días no se mostrarán en la línea de tiempo.
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
                  <Label htmlFor="start_date">Fecha de Inicio *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">Fecha de Fin *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Período *</Label>
                <Input
                  id="name"
                  placeholder="ej. Vacaciones de verano, Viaje familiar..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Información adicional sobre las vacaciones"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              {formData.start_date && formData.end_date && new Date(formData.end_date) >= new Date(formData.start_date) && (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
                  {(() => {
                    const { total, workable } = calculateDays(formData.start_date, formData.end_date);
                    return (
                      <div className="space-y-1">
                        <p className="text-sm text-sky-800">
                          Días totales (naturales): <span className="font-semibold">{total} días</span>
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
                  {createMutation.isPending ? "Guardando..." : editingVacation ? "Actualizar" : "Guardar Vacaciones"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingVacation(null);
                    setFormData({ start_date: "", end_date: "", name: "", notes: "" });
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
                    const { total, workable } = calculateDays(vacation.start_date, vacation.end_date);
                    return (
                      <TableRow key={vacation.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">
                              {format(new Date(vacation.start_date), "d MMM yyyy", { locale: es })}
                            </span>
                            <span className="text-xs text-slate-500">hasta</span>
                            <span className="font-semibold text-sm">
                              {format(new Date(vacation.end_date), "d MMM yyyy", { locale: es })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-sky-100 text-sky-800">
                            {vacation.name}
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
                          {vacation.notes || "-"}
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
