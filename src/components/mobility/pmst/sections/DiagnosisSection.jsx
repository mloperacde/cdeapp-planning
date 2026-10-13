import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import PmstSection, { Field } from '@/components/mobility/pmst/PmstSection';
import SurveyBuilder from '@/components/mobility/pmst/SurveyBuilder';
import { BarChart3, Plus, Trash2 } from 'lucide-react';

export default function DiagnosisSection({ plan, updatePlan, isAdmin, saving, workCenter }) {
  const [form, setForm] = useState({});
  const [reparto, setReparto] = useState([]);
  const [zonas, setZonas] = useState([]);

  useEffect(() => {
    setForm({ ...(plan?.diagnostico || {}) });
    setReparto(plan?.diagnostico?.reparto_modal || []);
    setZonas(plan?.diagnostico?.origen_zonas || []);
  }, [plan?.id]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const num = (v) => (v === '' ? undefined : Number(v));

  const save = () => updatePlan({
    diagnostico: { ...form, reparto_modal: reparto, origen_zonas: zonas, survey_id: plan?.diagnostico?.survey_id },
  });

  return (
    <div className="space-y-4">
      <PmstSection
        title="Diagnóstico de movilidad (datos agregados)"
        description="Reparto modal, zonas de origen y conclusiones. Introduce solo datos agregados y anonimizados."
        icon={BarChart3}
        isAdmin={isAdmin}
        saving={saving}
        onSave={save}
      >
        <div className="space-y-2">
          <label className="text-xs font-medium">Reparto modal (% de la plantilla)</label>
          {reparto.map((r, i) => (
            <div key={i} className="flex gap-2">
              <Input placeholder="Modo (coche, bus, bici...)" value={r.modo || ''} onChange={(e) => setReparto((p) => p.map((x, j) => (j === i ? { ...x, modo: e.target.value } : x)))} />
              <Input type="number" min="0" max="100" className="w-28" placeholder="%" value={r.porcentaje ?? ''} onChange={(e) => setReparto((p) => p.map((x, j) => (j === i ? { ...x, porcentaje: num(e.target.value) } : x)))} />
              {isAdmin && <Button size="icon" variant="ghost" className="text-red-600" onClick={() => setReparto((p) => p.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>}
            </div>
          ))}
          {isAdmin && <Button size="sm" variant="outline" onClick={() => setReparto((p) => [...p, { modo: '', porcentaje: '' }])}><Plus className="w-4 h-4 mr-1" /> Añadir modo</Button>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium">Zonas de origen (% de la plantilla)</label>
          {zonas.map((z, i) => (
            <div key={i} className="flex gap-2">
              <Input placeholder="Zona o municipio" value={z.zona || ''} onChange={(e) => setZonas((p) => p.map((x, j) => (j === i ? { ...x, zona: e.target.value } : x)))} />
              <Input type="number" min="0" max="100" className="w-28" placeholder="%" value={z.porcentaje ?? ''} onChange={(e) => setZonas((p) => p.map((x, j) => (j === i ? { ...x, porcentaje: num(e.target.value) } : x)))} />
              {isAdmin && <Button size="icon" variant="ghost" className="text-red-600" onClick={() => setZonas((p) => p.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>}
            </div>
          ))}
          {isAdmin && <Button size="sm" variant="outline" onClick={() => setZonas((p) => [...p, { zona: '', porcentaje: '' }])}><Plus className="w-4 h-4 mr-1" /> Añadir zona</Button>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Distancia media (km)"><Input type="number" min="0" value={form.distancia_media_km ?? ''} onChange={(e) => set('distancia_media_km', num(e.target.value))} /></Field>
          <Field label="Emisiones estimadas (t CO₂eq/año)"><Input type="number" min="0" value={form.emisiones_estimadas_t ?? ''} onChange={(e) => set('emisiones_estimadas_t', num(e.target.value))} /></Field>
          <Field label="Fuentes de datos"><Input value={form.fuentes_datos || ''} onChange={(e) => set('fuentes_datos', e.target.value)} /></Field>
        </div>

        <Field label="Motivos de uso del vehículo privado"><Textarea rows={2} value={form.motivos_uso || ''} onChange={(e) => set('motivos_uso', e.target.value)} /></Field>
        <Field label="Barreras detectadas"><Textarea rows={2} value={form.barreras || ''} onChange={(e) => set('barreras', e.target.value)} /></Field>
        <Field label="Accesibilidad al transporte público"><Textarea rows={2} value={form.accesibilidad_tp || ''} onChange={(e) => set('accesibilidad_tp', e.target.value)} /></Field>
        <Field label="Aparcamiento"><Textarea rows={2} value={form.aparcamiento || ''} onChange={(e) => set('aparcamiento', e.target.value)} /></Field>
        <Field label="Conclusiones del diagnóstico"><Textarea rows={3} value={form.conclusiones || ''} onChange={(e) => set('conclusiones', e.target.value)} /></Field>
      </PmstSection>

      <SurveyBuilder plan={plan} workCenter={workCenter} isAdmin={isAdmin} updatePlan={updatePlan} />
    </div>
  );
}