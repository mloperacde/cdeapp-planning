import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import IdentificationSection from '@/components/mobility/pmst/sections/IdentificationSection';
import ScopeSection from '@/components/mobility/pmst/sections/ScopeSection';
import MethodologySection from '@/components/mobility/pmst/sections/MethodologySection';
import DiagnosisSection from '@/components/mobility/pmst/sections/DiagnosisSection';
import MeasuresSection from '@/components/mobility/pmst/sections/MeasuresSection';
import NegotiationSection from '@/components/mobility/pmst/sections/NegotiationSection';
import FollowUpSection from '@/components/mobility/pmst/sections/FollowUpSection';
import ChecklistSection from '@/components/mobility/pmst/sections/ChecklistSection';
import PmstDocumentView from '@/components/mobility/pmst/PmstDocumentView';
import { PMST_STEPS, sectionCompletion } from '@/components/mobility/pmst/pmstRequirements';
import { Building2, Users, ClipboardList, BarChart3, Target, FileText, CalendarCheck, CheckSquare, FileDown, ChevronLeft, ChevronRight, Save, Check, X } from 'lucide-react';

const ICONS = { Building2, Users, ClipboardList, BarChart3, Target, FileText, CalendarCheck, CheckSquare, FileDown };

const SECTIONS = {
  identificacion: IdentificationSection,
  alcance: ScopeSection,
  metodologia: MethodologySection,
  diagnostico: DiagnosisSection,
  medidas: MeasuresSection,
  negociacion: NegotiationSection,
  seguimiento: FollowUpSection,
  checklist: ChecklistSection,
};

const ESTADOS = ['Borrador', 'En Revisión', 'En Negociación', 'Aprobado', 'En Seguimiento', 'Revisado'];

export default function PmstWizard({ plan, setPlan, workCenter, isAdmin }) {
  const { toast } = useToast();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const step = PMST_STEPS[stepIndex];
  const completion = sectionCompletion(plan);

  const updatePlan = async (updates) => {
    setSaving(true);
    try {
      const updated = await base44.entities.MobilityPlan.update(plan.id, updates);
      setPlan(updated);
      toast({ title: 'Plan actualizado' });
    } catch (e) {
      toast({ title: 'Error al guardar', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const saveVersion = async () => {
    const snapshot = { ...plan };
    delete snapshot.historial_versiones;
    const ver = (parseFloat(plan.version) || 1) + 0.1;
    const newVersion = ver.toFixed(1);
    const historial = [
      ...(plan.historial_versiones || []),
      { version: plan.version || '1.0', fecha: new Date().toISOString(), autor: plan.responsable_plan || '', resumen: `Versión guardada (${plan.estado})`, snapshot },
    ];
    await updatePlan({ version: newVersion, historial_versiones: historial });
    toast({ title: `Versión ${newVersion} guardada`, description: 'El historial conserva las versiones anteriores.' });
  };

  const Section = SECTIONS[step.id];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={plan.estado === 'Aprobado' ? 'default' : 'secondary'}>{plan.estado}</Badge>
              <span className="text-xs text-muted-foreground">v{plan.version} · {plan.codigo_documento || 'sin código'}</span>
              <span className="text-xs text-muted-foreground">· {plan.work_center_name}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isAdmin && (
                <Select value={plan.estado} onValueChange={(v) => updatePlan({ estado: v })} disabled={saving}>
                  <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {isAdmin && <Button size="sm" variant="outline" onClick={saveVersion} disabled={saving}><Save className="w-4 h-4 mr-1" /> Guardar versión</Button>}
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1">
            {PMST_STEPS.map((s, i) => {
              const Icon = ICONS[s.icon];
              const done = s.id === 'documento' ? false : completion[s.id];
              return (
                <button
                  key={s.id}
                  onClick={() => setStepIndex(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors ${i === stepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted/60 hover:bg-muted text-muted-foreground'}`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {s.label}
                  {done && <Check className="w-3 h-3 text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {step.id === 'documento' ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-medium flex items-center gap-2"><FileDown className="w-4 h-4 text-primary" /> Documento formal del plan</p>
                <p className="text-xs text-muted-foreground mt-1">Revísalo antes de presentarlo. Puedes imprimirlo o descargarlo como documento editable.</p>
              </div>
              {!completion.checklist && (
                <Badge variant="outline" className="text-xs gap-1"><X className="w-3 h-3" /> Checklist pendiente</Badge>
              )}
            </div>
            <PmstDocumentView plan={plan} workCenter={workCenter} />
          </CardContent>
        </Card>
      ) : Section ? (
        <Section plan={plan} updatePlan={updatePlan} isAdmin={isAdmin} saving={saving} workCenter={workCenter} />
      ) : null}

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={stepIndex === 0} onClick={() => setStepIndex((i) => Math.max(0, i - 1))}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
        </Button>
        <span className="text-xs text-muted-foreground">Paso {stepIndex + 1} de {PMST_STEPS.length}</span>
        <Button variant="outline" disabled={stepIndex === PMST_STEPS.length - 1} onClick={() => setStepIndex((i) => Math.min(PMST_STEPS.length - 1, i + 1))}>
          Siguiente <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}