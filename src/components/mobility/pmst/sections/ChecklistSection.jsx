import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PmstSection, { Field } from '@/components/mobility/pmst/PmstSection';
import { CAM_REQUIREMENTS, PMST_DISCLAIMER, PMST_SOURCES, PMST_STEPS, sectionCompletion } from '@/components/mobility/pmst/pmstRequirements';
import { CheckSquare, Check, X, AlertTriangle, Info } from 'lucide-react';

export default function ChecklistSection({ plan, updatePlan, isAdmin, saving }) {
  const [dpd, setDpd] = useState(false);
  const [notas, setNotas] = useState('');
  const [registrado, setRegistrado] = useState(false);
  const [fechaRegistro, setFechaRegistro] = useState('');

  useEffect(() => {
    setDpd(!!plan?.checklist?.dpd_validado);
    setNotas(plan?.checklist?.notas || '');
    setRegistrado(!!plan?.registrado_edim);
    setFechaRegistro(plan?.fecha_registro_edim || '');
  }, [plan?.id]);

  const completion = sectionCompletion(plan);
  const secciones = PMST_STEPS.filter((s) => s.id !== 'documento' && s.id !== 'checklist');

  const save = () => updatePlan({
    checklist: { ...(plan?.checklist || {}), secciones: completion, dpd_validado: dpd, notas, fecha_consulta_normativa: new Date().toISOString().slice(0, 10) },
    registrado_edim: registrado,
    fecha_registro_edim: registrado ? fechaRegistro || new Date().toISOString().slice(0, 10) : null,
  });

  return (
    <div className="space-y-4">
      <PmstSection
        title="Checklist de integridad del plan"
        description="Comprueba que cada sección del plan está completa antes de generar el documento."
        icon={CheckSquare}
        isAdmin={isAdmin}
        saving={saving}
        onSave={save}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {secciones.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-sm border rounded-md px-3 py-2">
              {completion[s.id] ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-amber-600" />}
              <span>{s.label}</span>
              <Badge variant={completion[s.id] ? 'default' : 'outline'} className="ml-auto text-xs">{completion[s.id] ? 'Completa' : 'Pendiente'}</Badge>
            </div>
          ))}
        </div>
      </PmstSection>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Requisitos de la Comunidad de Madrid y normativa aplicable</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Contenido orientativo. Distingue requisitos confirmados de aspectos que deben validarse con el órgano competente.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {CAM_REQUIREMENTS.map((r) => (
            <div key={r.id} className="border rounded-lg p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{r.titulo}</span>
                <Badge variant={r.estado === 'confirmado' ? 'default' : 'secondary'} className="text-xs gap-1">
                  {r.estado === 'confirmado' ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {r.estado === 'confirmado' ? 'Confirmado' : 'A validar'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{r.detalle}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Referencia: {r.referencia}</p>
            </div>
          ))}

          <div className="flex items-center justify-between border rounded-lg p-3 mt-2">
            <div>
              <p className="text-sm font-medium">Tratamiento de datos validado por el DPD</p>
              <p className="text-xs text-muted-foreground">Marca esta casilla cuando el Delegado de Protección de Datos haya validado los textos y el tratamiento.</p>
            </div>
            <Switch checked={dpd} onCheckedChange={setDpd} disabled={!isAdmin} />
          </div>

          <Field label="Notas del checklist"><Textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} /></Field>

          <div className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <p className="text-sm font-medium">Registro o depósito realizado</p>
              <p className="text-xs text-muted-foreground">Marca esta casilla cuando hayas presentado el plan ante el órgano competente. La app no realiza el depósito.</p>
            </div>
            <Switch checked={registrado} onCheckedChange={setRegistrado} disabled={!isAdmin} />
          </div>
          {registrado && (
            <Field label="Fecha de registro"><Input type="date" value={fechaRegistro} onChange={(e) => setFechaRegistro(e.target.value)} /></Field>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-500">{PMST_DISCLAIMER}</p>
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-500">
            <p className="font-medium">Fuentes a consultar:</p>
            <ul className="list-disc list-inside">
              {PMST_SOURCES.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}