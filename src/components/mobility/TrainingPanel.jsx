import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, BookOpen, Check, ExternalLink, GraduationCap } from 'lucide-react';

const CATEGORIAS = ["Seguridad vial", "Desplazamiento sostenible", "Conducción eficiente", "Movilidad activa", "Prevención in itinere", "Otras"];

export default function TrainingPanel({ workCenter, user, isAdmin }) {
  const { toast } = useToast();
  const [trainings, setTrainings] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      const [t, c] = await Promise.all([
        base44.entities.MobilityTraining.filter({ activo: true }),
        base44.entities.MobilityTrainingCompletion.filter({ user_id: user?.id })
      ]);
      setTrainings(t || []);
      setCompletions(c || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const saveTraining = async (data) => {
    try {
      if (editing?.id) {
        await base44.entities.MobilityTraining.update(editing.id, data);
      } else {
        await base44.entities.MobilityTraining.create({ ...data, activo: true, fecha_publicacion: new Date().toISOString().slice(0, 10) });
      }
      toast({ title: 'Módulo guardado' });
      setEditing(null);
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const deleteTraining = async (id) => {
    try { await base44.entities.MobilityTraining.update(id, { activo: false }); toast({ title: 'Módulo desactivado' }); load(); }
    catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const completeTraining = async (t) => {
    try {
      await base44.entities.MobilityTrainingCompletion.create({
        training_id: t.id,
        training_title: t.titulo,
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        work_center_id: workCenter?.id,
        fecha_completado: new Date().toISOString(),
        estado: 'completado'
      });
      toast({ title: 'Formación completada' });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const isCompleted = (id) => completions.some(c => c.training_id === id);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-muted-foreground">Formación en seguridad vial y desplazamiento sostenible</h3>
        {isAdmin && <Button size="sm" onClick={() => setEditing({ isNew: true })}><Plus className="w-4 h-4 mr-1" /> Nuevo módulo</Button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
        {!loading && trainings.length === 0 && <p className="text-sm text-muted-foreground">Sin módulos publicados.</p>}
        {trainings.map(t => (
          <Card key={t.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{t.titulo}</span>
                    {t.obligatorio && <Badge variant="destructive" className="text-xs">Obligatorio</Badge>}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">{t.categoria}</Badge>
                </div>
                {isCompleted(t.id) && <Badge className="bg-emerald-600 text-xs"><Check className="w-3 h-3 mr-1" /> Completado</Badge>}
              </div>
              {t.descripcion && <p className="text-xs text-muted-foreground mb-2">{t.descripcion}</p>}
              <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
                <div>Modalidad: {t.modalidad} · {t.duracion_minutos || 0} min</div>
              </div>
              <div className="flex gap-2">
                {t.contenido_url && <Button size="sm" variant="outline" onClick={() => window.open(t.contenido_url, '_blank')}><ExternalLink className="w-3.5 h-3.5 mr-1" /> Ver material</Button>}
                {!isCompleted(t.id) && <Button size="sm" onClick={() => completeTraining(t)}><Check className="w-3.5 h-3.5 mr-1" /> Marcar completado</Button>}
                {isAdmin && <>
                  <Button size="sm" variant="ghost" onClick={() => setEditing({ ...t })}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteTraining(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isAdmin && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Resumen de finalización (gestión)</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Módulos: {trainings.length} · Completados por usuarios: visibles en informe de seguimiento del PMST.</p>
          </CardContent>
        </Card>
      )}

      {editing && <TrainingDialog training={editing.id ? editing : {}} onSave={saveTraining} onClose={() => setEditing(null)} />}
    </div>
  );
}

function TrainingDialog({ training, onSave, onClose }) {
  const [d, setD] = useState(training.titulo ? { ...training } : { titulo: '', descripcion: '', categoria: 'Seguridad vial', modalidad: 'Online', duracion_minutos: 30, contenido_url: '', obligatorio: false, work_center_id: '' });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="!w-[min(90vw,600px)] !max-w-none">
        <DialogHeader><DialogTitle>{training.titulo ? 'Editar módulo' : 'Nuevo módulo de formación'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={d.titulo} onChange={e => setD({ ...d, titulo: e.target.value })} /></div>
          <div><Label>Descripción</Label><Textarea value={d.descripcion} onChange={e => setD({ ...d, descripcion: e.target.value })} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Categoría</Label>
              <Select value={d.categoria} onValueChange={(v) => setD({ ...d, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Modalidad</Label>
              <Select value={d.modalidad} onValueChange={(v) => setD({ ...d, modalidad: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Online">Online</SelectItem><SelectItem value="Presencial">Presencial</SelectItem><SelectItem value="Mixto">Mixto</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Duración (min)</Label><Input type="number" value={d.duracion_minutos} onChange={e => setD({ ...d, duracion_minutos: parseInt(e.target.value) })} /></div>
            <div><Label>URL del material</Label><Input value={d.contenido_url} onChange={e => setD({ ...d, contenido_url: e.target.value })} placeholder="https://..." /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.obligatorio} onChange={e => setD({ ...d, obligatorio: e.target.checked })} /> Obligatorio</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(d)}><Check className="w-4 h-4 mr-1" /> Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}