import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, CalendarOff, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function HolidayManager({ open, onOpenChange, holidays = [], onUpdate, embedded = false }) {
  const [showForm, setShowForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [formData, setFormData] = useState({
    date: "",
    name: "",
    description: ""
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (editingHoliday) {
        await base44.entities.Holiday.update(editingHoliday.id, data);
      } else {
        await base44.entities.Holiday.create(data);
      }
      onUpdate();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setFormData({ date: "", name: "", description: "" });
      setShowForm(false);
      setEditingHoliday(null);
      toast.success(editingHoliday ? "Festivo actualizado" : "Festivo creado");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Holiday.delete(id);
      onUpdate();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success("Festivo eliminado");
    },
  });

  const handleEdit = (holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      date: holiday.date,
      name: holiday.name,
      description: holiday.description || "",
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.date && formData.name) {
      createMutation.mutate(formData);
    }
  };

  const sortedHolidays = [...holidays].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const content = (
    <>
      {!embedded && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Los fines de semana se excluyen automáticamente del calendario laboral.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
          {!showForm ? (
            <Button
              onClick={() => setShowForm(true)}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Añadir Día Festivo
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-slate-50">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha del Festivo *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Festivo *</Label>
                <Input
                  id="name"
                  placeholder="ej. Año Nuevo, Navidad..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Información adicional sobre el festivo"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Guardando..." : editingHoliday ? "Actualizar" : "Guardar Festivo"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingHoliday(null);
                    setFormData({ date: "", name: "", description: "" });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {sortedHolidays.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHolidays.map((holiday) => (
                    <TableRow key={holiday.id}>
                      <TableCell className="font-medium">
                        {format(new Date(holiday.date), "dd/MM/yyyy - EEEE", { locale: es })}
                      </TableCell>
                      <TableCell>{holiday.name}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {holiday.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(holiday)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(holiday.id)}
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
      </div>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <CalendarOff className="w-6 h-6 text-orange-600" />
            Gestión de Días Festivos
          </DialogTitle>
          <DialogDescription>
            Configura los días festivos del año. Se guardarán automáticamente.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}