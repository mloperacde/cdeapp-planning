import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PmstSection, { Field } from '@/components/mobility/pmst/PmstSection';
import { Building2 } from 'lucide-react';

const EMPTY = {
  razon_social: '', cif: '', centro_nombre: '', direccion: '', municipio: '', provincia: '',
  codigo_postal: '', poligono_industrial: '', persona_responsable: '', cargo_responsable: '',
  email_contacto: '', telefono: '', fecha_elaboracion: '', periodo_vigencia: '', autoridad_competente: '',
};

export default function IdentificationSection({ plan, updatePlan, isAdmin, saving, workCenter }) {
  const [form, setForm] = useState({ ...EMPTY, ...(plan?.identificacion || {}) });
  const [meta, setMeta] = useState({
    codigo_documento: plan?.codigo_documento || '',
    responsable_plan: plan?.responsable_plan || '',
    fecha_aprobacion: plan?.fecha_aprobacion || '',
    fecha_entrada_vigor: plan?.fecha_entrada_vigor || '',
  });
  const [notas, setNotas] = useState(plan?.notas || '');

  useEffect(() => {
    setForm({ ...EMPTY, ...(plan?.identificacion || {}) });
    setMeta({
      codigo_documento: plan?.codigo_documento || '',
      responsable_plan: plan?.responsable_plan || '',
      fecha_aprobacion: plan?.fecha_aprobacion || '',
      fecha_entrada_vigor: plan?.fecha_entrada_vigor || '',
    });
    setNotas(plan?.notas || '');
  }, [plan?.id]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setM = (k, v) => setMeta((p) => ({ ...p, [k]: v }));

  const useCenterData = () => {
    if (!workCenter) return;
    setForm((p) => ({
      ...p,
      centro_nombre: p.centro_nombre || workCenter.nombre || '',
      direccion: p.direccion || workCenter.direccion || '',
      municipio: p.municipio || workCenter.municipio || '',
      provincia: p.provincia || workCenter.provincia || '',
      codigo_postal: p.codigo_postal || workCenter.codigo_postal || '',
      poligono_industrial: p.poligono_industrial || workCenter.poligono_industrial || '',
      autoridad_competente: p.autoridad_competente || 'Comunidad de Madrid',
    }));
  };

  return (
    <PmstSection
      title="Identificación del plan y del centro"
      description="Datos del documento PMST y de la persona responsable de su elaboración."
      icon={Building2}
      isAdmin={isAdmin}
      saving={saving}
      onSave={() => updatePlan({ identificacion: form, notas, ...meta })}
      footer={isAdmin && <button type="button" className="text-xs text-primary hover:underline" onClick={useCenterData}>Rellenar con datos del centro</button>}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Razón social"><Input value={form.razon_social} onChange={(e) => set('razon_social', e.target.value)} /></Field>
        <Field label="CIF"><Input value={form.cif} onChange={(e) => set('cif', e.target.value)} /></Field>
        <Field label="Código de documento"><Input value={meta.codigo_documento} onChange={(e) => setM('codigo_documento', e.target.value)} placeholder="PMST-2026-001" /></Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Centro de trabajo"><Input value={form.centro_nombre} onChange={(e) => set('centro_nombre', e.target.value)} /></Field>
        <Field label="Dirección"><Input value={form.direccion} onChange={(e) => set('direccion', e.target.value)} /></Field>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Municipio"><Input value={form.municipio} onChange={(e) => set('municipio', e.target.value)} /></Field>
        <Field label="Provincia"><Input value={form.provincia} onChange={(e) => set('provincia', e.target.value)} /></Field>
        <Field label="Código postal"><Input value={form.codigo_postal} onChange={(e) => set('codigo_postal', e.target.value)} /></Field>
        <Field label="Polígono industrial"><Input value={form.poligono_industrial} onChange={(e) => set('poligono_industrial', e.target.value)} /></Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Persona responsable"><Input value={form.persona_responsable} onChange={(e) => set('persona_responsable', e.target.value)} /></Field>
        <Field label="Cargo"><Input value={form.cargo_responsable} onChange={(e) => set('cargo_responsable', e.target.value)} /></Field>
        <Field label="Responsable de elaboración" hint="Puede coincidir con la persona responsable"><Input value={meta.responsable_plan} onChange={(e) => setM('responsable_plan', e.target.value)} /></Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Email de contacto"><Input type="email" value={form.email_contacto} onChange={(e) => set('email_contacto', e.target.value)} /></Field>
        <Field label="Teléfono"><Input value={form.telefono} onChange={(e) => set('telefono', e.target.value)} /></Field>
        <Field label="Autoridad competente"><Input value={form.autoridad_competente} onChange={(e) => set('autoridad_competente', e.target.value)} placeholder="Comunidad de Madrid" /></Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Field label="Fecha de elaboración"><Input type="date" value={form.fecha_elaboracion} onChange={(e) => set('fecha_elaboracion', e.target.value)} /></Field>
        <Field label="Periodo de vigencia"><Input value={form.periodo_vigencia} onChange={(e) => set('periodo_vigencia', e.target.value)} placeholder="2026-2028" /></Field>
        <Field label="Fecha de aprobación"><Input type="date" value={meta.fecha_aprobacion} onChange={(e) => setM('fecha_aprobacion', e.target.value)} /></Field>
        <Field label="Entrada en vigor"><Input type="date" value={meta.fecha_entrada_vigor} onChange={(e) => setM('fecha_entrada_vigor', e.target.value)} /></Field>
      </div>

      <Field label="Notas del plan">
        <Textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
      </Field>
    </PmstSection>
  );
}