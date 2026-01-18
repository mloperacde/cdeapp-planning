import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Plane, AlertCircle } from "lucide-react";
import { format, eachDayOfInterval, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function VacationManager({ open, onOpenChange, vacations = [], onUpdate, embedded = false }) {
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
      setFormData({ start_date: "", end_date: "", name: "", notes: "" });
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

  const sortedVacations = [...vacations].sort(
    (a, b) => new Date(a.start_date) - new Date(b.start_date)
  );

  const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const allDays = eachDayOfInterval({ start, end });
    const totalDays = allDays.length;
    
    const holidayDates = holidays.map(h => format(new Date(h.date), 'yyyy-MM-dd'));
    
    const workableDays = allDays.filter(day => {
      const dayOfWeek = getDay(day);
      const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
      const isHolidayDay = holidayDates.includes(format(day, 'yyyy-MM-dd'));
      return !isWeekendDay && !isHolidayDay;
    }).length;

    return { total: totalDays, workable: workableDays };
  };

  const content = (
    <>
      {!embedded && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Los fines de semana y festivos se excluyen automáticamente del cálculo de días laborables.
          </AlertDescription>
        </Alert>
      )}

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
                    placeholder="ej. Vacaciones de verano, Semana Santa..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Descripción (opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Información adicional"
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
                      setFormData({ start_date: "", end_date: "", name: "", notes: "" });
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}

            {sortedVacations.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Fecha Inicio</TableHead>
                      <TableHead>Fecha Fin</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Días Laborables</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedVacations.map((vacation) => {
                      const { workable } = calculateDays(vacation.start_date, vacation.end_date);
                      return (
                        <TableRow key={vacation.id}>
                          <TableCell className="font-medium">
                            {format(new Date(vacation.start_date), "dd/MM/yyyy", { locale: es })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {format(new Date(vacation.end_date), "dd/MM/yyyy", { locale: es })}
                          </TableCell>
                          <TableCell>{vacation.name}</TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {workable} días
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(vacation)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteMutation.mutate(vacation.id)}
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
            )}
      </div>
    </>
  );

  if (embedded) {
    return content;
  }

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
        {content}
      </DialogContent>
    </Dialog>
  );
}