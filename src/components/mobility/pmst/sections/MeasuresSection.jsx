import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/mobility/pmst/PmstSection';
import { MEASURE_CATEGORIES, REQUIRED_MEASURE_CATEGORIES } from '@/components/mobility/pmst/pmstRequirements';
import { Target, Plus, Pencil, Trash2, Check, X } from 'lucide-react';

const ESTADOS = ['Pendiente', 'En curso', 'Implantada', 'Aplazada', 'Descartada'];

export default function MeasuresSection({ plan, updatePlan, isAdmin, saving }) {
  const [editing, setEditing] = useState(null);
  const medidas = plan?.medidas || [];

  const saveMeasure = (m) => {
    const idx = medidas.findIndex((x) => x.id === m.id);
    const newMedidas = idx >= 0 ? medidas.map((x) => (x.id === m.id ? m : x)) : [...medidas, m];
    updatePlan({ medidas: newMedidas });
    setEditing(null);
  };

  const newMeasure = (categoria = REQUIRED_MEASURE_CATEGORIES[0]) => ({
    id: crypto.randomUUID(), categoria, titulo: '', descripcion: '', responsable: '',
    fecha_inicio: '', fecha_fin_prevista: '', meta: '', indicador: '', estado: 'Pendiente', progreso: 0,
  });

  const covered = (cat) => medidas.some((m) => m.categoria === cat);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Medidas del plan</CardTitle>
          {isAdmin && <Button size="sm" variant="outline" onClick={() => setEditing(newMeasure())} disabled={saving}><Plus className="w-4 h-4 mr-1" /> Añadir medida</Button>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">El plan debe cubrir transporte público, movilidad activa, vehículo compartido, teletrabajo y flexibilidad horaria.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {REQUIRED_MEASURE_CATEGORIES.map((cat) => (
            <Badge key={cat} variant={covered(cat) ? 'default' : 'outline'} className="text-xs gap-1">
              {covered(cat) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} {cat}
            </Badge>
          ))}
        </div>

        {medidas.length === 0 && <p className="text-sm text-muted-foreground">Sin medidas. Añade la primera.</p>}

        <div className="space-y-2">
          {medidas.map((m) => (
            <div key={m.id} className="border rounded-lg p-3 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{m.titulo || '(sin título)'}</span>
                  <Badge variant="outline" className="text-xs">{m.categoria}</Badge>
                  <Badge variant="secondary" className="text-xs">{m.estado}</Badge>
                </div>
                {m.descripcion && <p className="text-xs text-muted-foreground mt-1">{m.descripcion}</p>}
                <p className="text-xs text-muted-foreground">
                  {m.responsable && `Responsable: ${m.responsable} · `}
                  {m.indicador && `Indicador: ${m.indicador} · `}
                  Progreso: {m.progreso || 0}%
                </p>
              </div>
              {isAdmin && (
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => updatePlan({ medidas: medidas.filter((x) => x.id !== m.id) })}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {editing && (
          <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
            <MeasureDialog measure={editing} onSave={saveMeasure} onClose={() => setEditing(null)} />
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

function MeasureDialog({ measure, onSave, onClose }) {
  const [m, setM] = useState(measure);
  return (
    <DialogContent className="!w-[min(90vw,700px)] !max-w-none">
      <DialogHeader><DialogTitle>Medida del plan</DialogTitle></DialogHeader>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        <Field label="Título"><Input value={m.titulo} onChange={(e) => setM({ ...m, titulo: e.target.value })} /></Field>
        <Field label="Categoría">
          <Select value={m.categoria} onValueChange={(v) => setM({ ...m, categoria: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MEASURE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Descripción"><Textarea rows={3} value={m.descripcion} onChange={(e) => setM({ ...m, descripcion: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Responsable"><Input value={m.responsable} onChange={(e) => setM({ ...m, responsable: e.target.value })} /></Field>
          <Field label="Estado">
            <Select value={m.estado} onValueChange={(v) => setM({ ...m, estado: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha inicio"><Input type="date" value={m.fecha_inicio || ''} onChange={(e) => setM({ ...m, fecha_inicio: e.target.value })} /></Field>
          <Field label="Fecha fin prevista"><Input type="date" value={m.fecha_fin_prevista || ''} onChange={(e) => setM({ ...m, fecha_fin_prevista: e.target.value })} /></Field>
        </div>
        <Field label="Meta"><Input value={m.meta || ''} onChange={(e) => setM({ ...m, meta: e.target.value })} /></Field>
        <Field label="Indicador"><Input value={m.indicador || ''} onChange={(e) => setM({ ...m, indicador: e.target.value })} /></Field>
        <Field label={`Progreso (${m.progreso || 0}%)`}>
          <Input type="range" min="0" max="100" value={m.progreso || 0} onChange={(e) => setM({ ...m, progreso: parseInt(e.target.value, 10) })} className="w-full" />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
        <Button onClick={() => onSave(m)}><Check className="w-4 h-4 mr-1" /> Guardar</Button>
      </DialogFooter>
    </DialogContent>
  );
}