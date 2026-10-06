import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Check, X, FileText } from 'lucide-react';

const CATEGORIES = ["Movilidad activa", "Transporte colectivo", "Bajas emisiones", "Compartida/Colaborativa", "Vehículos cero emisiones", "Teletrabajo", "Seguridad vial", "Formación", "Otras"];
const ESTADOS_MEDIDA = ["Pendiente", "En curso", "Implantada", "Aplazada", "Descartada"];

export default function PlanPanel({ plan, setPlan, workCenter, isAdmin }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const updatePlan = async (updates) => {
    if (!plan) return;
    setSaving(true);
    try {
      const updated = await base44.entities.MobilityPlan.update(plan.id, updates);
      setPlan(updated);
      toast({ title: 'Plan actualizado' });
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setSaving(false);
  };

  const saveMeasure = (measure) => {
    const medidas = plan?.medidas || [];
    const idx = medidas.findIndex(m => m.id === measure.id);
    const newMedidas = idx >= 0 ? medidas.map(m => m.id === measure.id ? measure : m) : [...medidas, measure];
    updatePlan({ medidas: newMedidas });
    setEditing(null);
  };

  const deleteMeasure = (id) => {
    updatePlan({ medidas: (plan?.medidas || []).filter(m => m.id !== id) });
  };

  const addNegociacion = () => {
    const n = { fecha: new Date().toISOString().slice(0, 10), tipo: 'Reunión', participantes: '', resumen: '', documento_uri: '' };
    updatePlan({ negociacion: [...(plan?.negociacion || []), n] });
  };

  if (!plan) return <p className="text-muted-foreground text-sm">No hay plan creado para este centro.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <Badge variant={plan.estado === 'Aprobado' ? 'default' : 'secondary'}>{plan.estado}</Badge>
          <span className="text-sm text-muted-foreground ml-2">v{plan.version}</span>
        </div>
        {isAdmin && (
          <Select value={plan.estado} onValueChange={(v) => updatePlan({ estado: v })} disabled={saving}>
            <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Borrador", "En Negociación", "Aprobado", "En Seguimiento", "Revisado"].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Medidas del Plan</CardTitle>
          {isAdmin && (
            <Dialog open={editing?.isNew} onOpenChange={(o) => !o && setEditing(null)}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => setEditing({ isNew: true, measure: { id: crypto.randomUUID(), categoria: 'Compartida/Colaborativa', titulo: '', descripcion: '', responsable: '', estado: 'Pendiente', progreso: 0 } })}>
                  <Plus className="w-4 h-4 mr-1" /> Añadir medida
                </Button>
              </DialogTrigger>
              {editing?.isNew && <MeasureDialog measure={editing.measure} onSave={saveMeasure} onClose={() => setEditing(null)} />}
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {(plan.medidas || []).length === 0 && <p className="text-sm text-muted-foreground">Sin medidas. Añade la primera.</p>}
          {(plan.medidas || []).map((m) => (
            <div key={m.id} className="border rounded-lg p-3 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{m.titulo || '(sin título)'}</span>
                  <Badge variant="outline" className="text-xs">{m.categoria}</Badge>
                  <Badge variant="secondary" className="text-xs">{m.estado}</Badge>
                </div>
                {m.descripcion && <p className="text-xs text-muted-foreground mt-1">{m.descripcion}</p>}
                {m.responsable && <p className="text-xs text-muted-foreground">Responsable: {m.responsable}</p>}
                {m.indicador && <p className="text-xs text-muted-foreground">Indicador: {m.indicador}</p>}
              </div>
              {isAdmin && (
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing({ isNew: false, measure: m })}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => deleteMeasure(m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {editing && !editing.isNew && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <MeasureDialog measure={editing.measure} onSave={saveMeasure} onClose={() => setEditing(null)} />
        </Dialog>
      )}

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Negociación con representación legal</CardTitle>
          {isAdmin && <Button size="sm" variant="outline" onClick={addNegociacion} disabled={saving}><Plus className="w-4 h-4 mr-1" /> Registrar acto</Button>}
        </CardHeader>
        <CardContent className="space-y-2">
          {(plan.negociacion || []).length === 0 && <p className="text-sm text-muted-foreground">Sin actos registrados.</p>}
          {(plan.negociacion || []).map((n, i) => (
            <div key={i} className="border rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">{n.tipo}</Badge>
                <span className="text-xs text-muted-foreground">{n.fecha}</span>
              </div>
              {n.participantes && <p className="text-xs text-muted-foreground">Participantes: {n.participantes}</p>}
              {n.resumen && <p className="text-xs mt-1">{n.resumen}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MeasureDialog({ measure, onSave, onClose }) {
  const [m, setM] = useState(measure);
  return (
    <DialogContent className="!w-[min(90vw,700px)] !max-w-none">
      <DialogHeader><DialogTitle>Medida del plan</DialogTitle></DialogHeader>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        <div><Label>Título</Label><Input value={m.titulo} onChange={e => setM({ ...m, titulo: e.target.value })} /></div>
        <div><Label>Categoría</Label>
          <Select value={m.categoria} onValueChange={(v) => setM({ ...m, categoria: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Descripción</Label><Textarea value={m.descripcion} onChange={e => setM({ ...m, descripcion: e.target.value })} rows={3} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Responsable</Label><Input value={m.responsable} onChange={e => setM({ ...m, responsable: e.target.value })} /></div>
          <div><Label>Estado</Label>
            <Select value={m.estado} onValueChange={(v) => setM({ ...m, estado: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ESTADOS_MEDIDA.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Fecha inicio</Label><Input type="date" value={m.fecha_inicio || ''} onChange={e => setM({ ...m, fecha_inicio: e.target.value })} /></div>
          <div><Label>Fecha fin prevista</Label><Input type="date" value={m.fecha_fin_prevista || ''} onChange={e => setM({ ...m, fecha_fin_prevista: e.target.value })} /></div>
        </div>
        <div><Label>Meta</Label><Input value={m.meta || ''} onChange={e => setM({ ...m, meta: e.target.value })} /></div>
        <div><Label>Indicador</Label><Input value={m.indicador || ''} onChange={e => setM({ ...m, indicador: e.target.value })} /></div>
        <div><Label>Progreso ({m.progreso || 0}%)</Label><Input type="range" min="0" max="100" value={m.progreso || 0} onChange={e => setM({ ...m, progreso: parseInt(e.target.value) })} className="w-full" /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
        <Button onClick={() => onSave(m)}><Check className="w-4 h-4 mr-1" /> Guardar</Button>
      </DialogFooter>
    </DialogContent>
  );
}