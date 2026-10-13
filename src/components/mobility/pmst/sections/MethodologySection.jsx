import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import PmstSection, { Field } from '@/components/mobility/pmst/PmstSection';
import { ClipboardList } from 'lucide-react';

const FUENTES = [
  'Encuesta anónima a la plantilla',
  'Datos de fichajes y turnos',
  'Registro de accesos y aparcamiento',
  'Consulta a la representación legal',
  'Información de transporte público',
  'Observación directa del entorno',
  'Informes internos previos',
];

export default function MethodologySection({ plan, updatePlan, isAdmin, saving }) {
  const [form, setForm] = useState({});
  const [fuentes, setFuentes] = useState([]);

  useEffect(() => {
    setForm({ ...(plan?.metodologia || {}) });
    setFuentes(plan?.metodologia?.fuentes || []);
  }, [plan?.id]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const num = (v) => (v === '' ? undefined : Number(v));
  const toggleFuente = (f, checked) => setFuentes((p) => (checked ? [...p, f] : p.filter((x) => x !== f)));

  return (
    <PmstSection
      title="Metodología del diagnóstico"
      description="Fuentes utilizadas, periodo de referencia y tratamiento de los datos."
      icon={ClipboardList}
      isAdmin={isAdmin}
      saving={saving}
      onSave={() => updatePlan({ metodologia: { ...form, fuentes } })}
    >
      <div className="space-y-2">
        <label className="text-xs font-medium">Fuentes de información</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FUENTES.map((f) => (
            <label key={f} className="flex items-center gap-2 text-sm">
              <Checkbox checked={fuentes.includes(f)} onCheckedChange={(c) => toggleFuente(f, !!c)} />
              <span>{f}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Periodo de referencia"><Input value={form.periodo_referencia || ''} onChange={(e) => set('periodo_referencia', e.target.value)} placeholder="Ej: septiembre de 2026" /></Field>
        <Field label="Técnica empleada"><Input value={form.tecnica || ''} onChange={(e) => set('tecnica', e.target.value)} placeholder="Encuesta + análisis de datos internos" /></Field>
        <Field label="Tamaño de muestra"><Input type="number" min="0" value={form.tamano_muestra ?? ''} onChange={(e) => set('tamano_muestra', num(e.target.value))} /></Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Ámbito temporal"><Input value={form.ambito_temporal || ''} onChange={(e) => set('ambito_temporal', e.target.value)} /></Field>
        <Field label="Fecha del trabajo de campo"><Input value={form.fecha_trabajo_campo || ''} onChange={(e) => set('fecha_trabajo_campo', e.target.value)} placeholder="Ej: 1-15 de septiembre de 2026" /></Field>
      </div>

      <Field label="Responsable técnico"><Input value={form.responsable_tecnico || ''} onChange={(e) => set('responsable_tecnico', e.target.value)} /></Field>

      <Field label="Tratamiento de datos" hint="Anonimato, agregación y base jurídica. A validar con el Delegado de Protección de Datos.">
        <Textarea rows={3} value={form.tratamiento_datos || ''} onChange={(e) => set('tratamiento_datos', e.target.value)} placeholder="Los datos se recogen de forma anónima y se tratan únicamente de forma agregada..." />
      </Field>

      <Field label="Observaciones"><Textarea rows={2} value={form.observaciones || ''} onChange={(e) => set('observaciones', e.target.value)} /></Field>
    </PmstSection>
  );
}