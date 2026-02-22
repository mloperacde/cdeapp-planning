import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Megaphone, Plus, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const TYPE_STYLES = {
  Informativo: "bg-blue-100 text-blue-800",
  Urgente: "bg-red-100 text-red-800",
  Recordatorio: "bg-yellow-100 text-yellow-800",
  Evento: "bg-green-100 text-green-800",
};

export default function AnnouncementBoard({ isAdmin }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titulo: "", contenido: "", tipo: "Informativo", fecha_expiracion: "" });
  const queryClient = useQueryClient();

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => base44.entities.Announcement.list("-created_date", 50),
  });

  const active = announcements.filter(a => {
    if (!a.activo) return false;
    if (a.fecha_expiracion) {
      return new Date(a.fecha_expiracion) >= new Date(new Date().setHours(0, 0, 0, 0));
    }
    return true;
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Announcement.create({
      ...data,
      activo: true,
      autor_nombre: "",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setShowForm(false);
      setForm({ titulo: "", contenido: "", tipo: "Informativo", fecha_expiracion: "" });
      toast.success("Comunicado publicado");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Announcement.update(id, { activo: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Comunicado eliminado");
    },
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-amber-500" />
          Tablón de Anuncios
        </CardTitle>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowForm(true)} className="h-8 bg-amber-500 hover:bg-amber-600">
            <Plus className="w-4 h-4 mr-1" />
            Nuevo
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-3 pr-1">
        {active.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed">
            <Megaphone className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No hay comunicados activos.</p>
          </div>
        ) : (
          active.map(ann => (
            <div key={ann.id} className="p-3 border rounded-lg bg-white dark:bg-slate-800 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{ann.titulo}</span>
                  <Badge className={`text-xs scale-90 ${TYPE_STYLES[ann.tipo] || TYPE_STYLES.Informativo}`}>
                    {ann.tipo}
                  </Badge>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => deleteMutation.mutate(ann.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                    aria-label="Eliminar comunicado"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{ann.contenido}</p>
              <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                <span>{format(new Date(ann.created_date), "d MMM yyyy", { locale: es })}</span>
                {ann.fecha_expiracion && (
                  <span>Expira: {format(new Date(ann.fecha_expiracion), "d MMM", { locale: es })}</span>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Comunicado</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }}
          >
            <div className="space-y-1">
              <Label>Título *</Label>
              <Input required value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Contenido *</Label>
              <Textarea required rows={4} value={form.contenido} onChange={e => setForm({ ...form, contenido: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Informativo", "Urgente", "Recordatorio", "Evento"].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fecha Expiración</Label>
                <Input type="date" value={form.fecha_expiracion} onChange={e => setForm({ ...form, fecha_expiracion: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600" disabled={createMutation.isPending}>
                Publicar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}