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
import { Plus, Trash2, CalendarOff, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function HolidayManager({ open, onOpenChange, holidays, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    name: "",
    description: "",
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Holiday.create(data),
    onSuccess: () => {
      onUpdate();
      setFormData({ date: "", name: "", description: "" });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Holiday.delete(id),
    onSuccess: () => {
      onUpdate();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.date && formData.name) {
      createMutation.mutate(formData);
    }
  };

  const sortedHolidays = [...holidays].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <CalendarOff className="w-6 h-6 text-orange-600" />
            Gestión de Días Festivos
          </DialogTitle>
          <DialogDescription>
            Añade o elimina días festivos. Estos días no se mostrarán en la línea de tiempo.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Los fines de semana (sábados y domingos) se excluyen automáticamente de la línea de tiempo.
          </AlertDescription>
        </Alert>

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
                  {createMutation.isPending ? "Guardando..." : "Guardar Festivo"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ date: "", name: "", description: "" });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {sortedHolidays.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-20">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHolidays.map((holiday) => (
                    <TableRow key={holiday.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">
                            {format(new Date(holiday.date), "d MMM yyyy", { locale: es })}
                          </span>
                          <span className="text-xs text-slate-500">
                            {format(new Date(holiday.date), "EEEE", { locale: es })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          {holiday.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {holiday.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(holiday.id)}
                          disabled={deleteMutation.isPending}
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-slate-50">
              <CalendarOff className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 mb-2">No hay días festivos configurados</p>
              <p className="text-sm text-slate-500">
                Añade festivos para excluirlos de la línea de tiempo
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}