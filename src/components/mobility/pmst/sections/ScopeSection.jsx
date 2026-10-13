import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import PmstSection, { Field } from '@/components/mobility/pmst/PmstSection';
import { Users, Plus, Trash2 } from 'lucide-react';

export default function ScopeSection({ plan, updatePlan, isAdmin, saving }) {
  const [form, setForm] = useState({});
  const [turnos, setTurnos] = useState([]);

  useEffect(() => {
    setForm({ ...(plan?.alcance || {}) });
    const t = plan?.alcance?.trabajadores_por_turno || {};
    setTurnos(Object.entries(t).map(([turno, personas]) => ({ turno, personas })));
  }, [plan?.id]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const num = (v) => (v === '' ? undefined : Number(v));

  const save = () => {
    const mapa = {};
    turnos.forEach((t) => { if (t.turno) mapa[t.turno] = Number(t.personas) || 0; });
    updatePlan({ alcance: { ...form, trabajadores_por_turno: mapa } });
  };

  return (
    <PmstSection
      title="Alcance del plan"
      description="Plantilla afectada, turnos, accesos y disponibilidad de transporte en el entorno del centro."
      icon={Users}
      isAdmin={isAdmin}
      saving={saving}
      onSave={save}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Plantilla total"><Input type="number" min="0" value={form.plantilla_total ?? ''} onChange={(e) => set('plantilla_total', num(e.target.value))} /></Field>
        <Field label="Número de turnos"><Input type="number" min="0" value={form.num_turnos ?? ''} onChange={(e) => set('num_turnos', num(e.target.value))} /></Field>
        <Field label="Distancia media (km)"><Input type="number" min="0" value={form.distancias_medias_km ?? ''} onChange={(e) => set('distancias_medias_km', num(e.target.value))} /></Field>
        <Field label="Plazas de aparcamiento"><Input type="number" min="0" value={form.plazas_aparcamiento ?? ''} onChange={(e) => set('plazas_aparcamiento', num(e.target.value))} /></Field>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium">Personas por turno</label>
        {turnos.map((t, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="Turno (Mañana / Tarde)" value={t.turno} onChange={(e) => setTurnos((p) => p.map((x, j) => (j === i ? { ...x, turno: e.target.value } : x)))} />
            <Input type="number" min="0" className="w-32" placeholder="Personas" value={t.personas} onChange={(e) => setTurnos((p) => p.map((x, j) => (j === i ? { ...x, personas: e.target.value } : x)))} />
            {isAdmin && <Button size="icon" variant="ghost" className="text-red-600" onClick={() => setTurnos((p) => p.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>}
          </div>
        ))}
        {isAdmin && <Button size="sm" variant="outline" onClick={() => setTurnos((p) => [...p, { turno: '', personas: '' }])}><Plus className="w-4 h-4 mr-1" /> Añadir turno</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Horarios"><Input value={form.horarios || ''} onChange={(e) => set('horarios', e.target.value)} placeholder="Mañana 6:00-14:00 / Tarde 14:00-22:00" /></Field>
        <Field label="Modalidades de trabajo" hint="Presencialidad, teletrabajo, turnos rotativos..."><Input value={form.modalidades || ''} onChange={(e) => set('modalidades', e.target.value)} /></Field>
      </div>

      <Field label="Accesos y entorno"><Textarea rows={2} value={form.accesos_descripcion || ''} onChange={(e) => set('accesos_descripcion', e.target.value)} placeholder="Accesos rodados, carriles bici, aceras, aparcamiento disuasorio..." /></Field>
      <Field label="Transporte público cercano"><Textarea rows={2} value={form.transporte_publico || ''} onChange={(e) => set('transporte_publico', e.target.value)} placeholder="Líneas de autobús, cercanías, metro, frecuencia..." /></Field>
      <Field label="Observaciones"><Textarea rows={2} value={form.observaciones || ''} onChange={(e) => set('observaciones', e.target.value)} /></Field>
    </PmstSection>
  );
}