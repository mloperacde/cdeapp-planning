import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Field } from '@/components/mobility/pmst/PmstSection';
import { useToast } from '@/components/ui/use-toast';
import { Check, X } from 'lucide-react';

const EMPTY = {
  nombre: '', direccion: '', municipio: '', provincia: 'Madrid', codigo_postal: '',
  poligono_industrial: '', plantilla_total: '', num_turnos: '', obligado_pmst: false,
  autoridad_competente: 'Comunidad de Madrid',
};

export default function WorkCenterDialog({ open, onOpenChange, onCreated }) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.nombre || !form.direccion || !form.municipio) {
      toast({ title: 'Faltan datos', description: 'Nombre, dirección y municipio son obligatorios.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const created = await base44.entities.MobilityWorkCenter.create({
        ...form,
        plantilla_total: form.plantilla_total === '' ? undefined : Number(form.plantilla_total),
        num_turnos: form.num_turnos === '' ? undefined : Number(form.num_turnos),
      });
      toast({ title: 'Centro creado' });
      onCreated(created);
      setForm(EMPTY);
      onOpenChange(false);
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[min(90vw,650px)] !max-w-none">
        <DialogHeader><DialogTitle>Nuevo centro de trabajo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Nombre del centro"><Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} /></Field>
          <Field label="Dirección"><Input value={form.direccion} onChange={(e) => set('direccion', e.target.value)} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Municipio"><Input value={form.municipio} onChange={(e) => set('municipio', e.target.value)} /></Field>
            <Field label="Provincia"><Input value={form.provincia} onChange={(e) => set('provincia', e.target.value)} /></Field>
            <Field label="Código postal"><Input value={form.codigo_postal} onChange={(e) => set('codigo_postal', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Polígono industrial"><Input value={form.poligono_industrial} onChange={(e) => set('poligono_industrial', e.target.value)} /></Field>
            <Field label="Plantilla total"><Input type="number" min="0" value={form.plantilla_total} onChange={(e) => set('plantilla_total', e.target.value)} /></Field>
            <Field label="Número de turnos"><Input type="number" min="0" value={form.num_turnos} onChange={(e) => set('num_turnos', e.target.value)} /></Field>
          </div>
          <div className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <p className="text-sm font-medium">Centro obligado a PMST</p>
              <p className="text-xs text-muted-foreground">Más de 200 personas trabajadoras o más de 100 por turno.</p>
            </div>
            <Switch checked={form.obligado_pmst} onCheckedChange={(c) => set('obligado_pmst', c)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
          <Button onClick={save} disabled={saving}><Check className="w-4 h-4 mr-1" /> Crear centro</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}