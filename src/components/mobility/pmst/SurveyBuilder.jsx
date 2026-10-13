import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import SurveyResults from '@/components/mobility/pmst/SurveyResults';
import { DEFAULT_SURVEY_QUESTIONS, SURVEY_INTRO, surveyResultsFor } from '@/components/mobility/pmst/pmstRequirements';
import { Plus, Trash2, Link2, Check, ClipboardCopy, Lock, Unlock, BarChart3 } from 'lucide-react';

export default function SurveyBuilder({ plan, workCenter, isAdmin, updatePlan }) {
  const { toast } = useToast();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const list = await base44.entities.MobilitySurvey.filter({ plan_id: plan.id });
      setSurvey((list || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [plan.id]);

  const updateSurvey = async (updates) => {
    setBusy(true);
    try {
      const updated = await base44.entities.MobilitySurvey.update(survey.id, updates);
      setSurvey(updated);
      toast({ title: 'Encuesta actualizada' });
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setBusy(false);
  };

  const createSurvey = async () => {
    setBusy(true);
    try {
      const s = await base44.entities.MobilitySurvey.create({
        work_center_id: workCenter?.id,
        plan_id: plan.id,
        titulo: `Encuesta de movilidad – ${workCenter?.nombre || 'centro'}`,
        descripcion: 'Diagnóstico de movilidad para el PMST',
        introduccion: SURVEY_INTRO,
        preguntas: DEFAULT_SURVEY_QUESTIONS,
        estado: 'Borrador',
        token: crypto.randomUUID(),
        respuestas_totales: 0,
        resultados: {},
      });
      setSurvey(s);
      updatePlan({ diagnostico: { ...(plan.diagnostico || {}), survey_id: s.id } });
      toast({ title: 'Encuesta creada' });
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setBusy(false);
  };

  const openSurvey = () => updateSurvey({ estado: 'Abierta', fecha_apertura: new Date().toISOString() });

  const closeAndIntegrate = async () => {
    const dist = surveyResultsFor(survey, 'modal').filter((d) => d.count > 0).map((d) => ({ modo: d.label, porcentaje: d.pct }));
    setBusy(true);
    try {
      const updated = await base44.entities.MobilitySurvey.update(survey.id, { estado: 'Cerrada', fecha_cierre: new Date().toISOString() });
      setSurvey(updated);
      updatePlan({
        diagnostico: {
          ...(plan.diagnostico || {}),
          survey_id: survey.id,
          reparto_modal: dist.length ? dist : plan.diagnostico?.reparto_modal || [],
        },
      });
      toast({ title: 'Recogida cerrada', description: dist.length ? 'Reparto modal integrado en el diagnóstico' : 'Sin datos de reparto modal' });
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setBusy(false);
  };

  const setPreguntas = (preguntas) => setSurvey((s) => ({ ...s, preguntas }));

  const addPregunta = () => setPreguntas([...(survey.preguntas || []), { id: crypto.randomUUID(), texto: '', tipo: 'opcion_unica', opciones: [''] }]);
  const removePregunta = (id) => setPreguntas((survey.preguntas || []).filter((p) => p.id !== id));
  const setTexto = (id, texto) => setPreguntas((survey.preguntas || []).map((p) => (p.id === id ? { ...p, texto } : p)));
  const setOpcion = (id, i, v) => setPreguntas((survey.preguntas || []).map((p) => (p.id === id ? { ...p, opciones: p.opciones.map((o, j) => (j === i ? v : o)) } : p)));
  const addOpcion = (id) => setPreguntas((survey.preguntas || []).map((p) => (p.id === id ? { ...p, opciones: [...p.opciones, ''] } : p)));
  const removeOpcion = (id, i) => setPreguntas((survey.preguntas || []).map((p) => (p.id === id ? { ...p, opciones: p.opciones.filter((_, j) => j !== i) } : p)));

  const copyLink = () => {
    const url = `${window.location.origin}/MobilitySurvey?survey=${survey.id}&t=${survey.token}`;
    navigator.clipboard.writeText(url).then(
      () => toast({ title: 'Enlace copiado', description: 'Compártelo con la plantilla por los canales internos.' }),
      () => toast({ title: 'No se pudo copiar', description: url, variant: 'destructive' })
    );
  };

  if (loading) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando encuesta...</CardContent></Card>;

  if (!survey) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center space-y-3">
          <BarChart3 className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aún no hay encuesta anónima para este plan. Recoge hábitos de movilidad de la plantilla de forma agregada.</p>
          {isAdmin && <Button onClick={createSurvey} disabled={busy}><Plus className="w-4 h-4 mr-1" /> Crear encuesta anónima</Button>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Encuesta anónima de movilidad
            <Badge variant={survey.estado === 'Abierta' ? 'default' : 'secondary'}>{survey.estado}</Badge>
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {isAdmin && <Button size="sm" variant="outline" onClick={copyLink}><ClipboardCopy className="w-4 h-4 mr-1" /> Copiar enlace</Button>}
            {isAdmin && survey.estado !== 'Abierta' && <Button size="sm" onClick={openSurvey} disabled={busy}><Unlock className="w-4 h-4 mr-1" /> Abrir recogida</Button>}
            {isAdmin && survey.estado === 'Abierta' && <Button size="sm" onClick={closeAndIntegrate} disabled={busy}><Lock className="w-4 h-4 mr-1" /> Cerrar e integrar</Button>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Link2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          Encuesta sin datos identificativos: las respuestas se guardan solo como recuentos agregados por opción.
        </p>

        <div className="space-y-3">
          {(survey.preguntas || []).map((p) => (
            <div key={p.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <Input value={p.texto} disabled={!isAdmin} onChange={(e) => setTexto(p.id, e.target.value)} placeholder="Pregunta" />
                {isAdmin && <Button size="icon" variant="ghost" className="text-red-600 flex-shrink-0" onClick={() => removePregunta(p.id)}><Trash2 className="w-4 h-4" /></Button>}
              </div>
              <div className="space-y-1.5 pl-1">
                {p.opciones.map((o, i) => (
                  <div key={i} className="flex gap-2">
                    <Input className="h-8 text-sm" value={o} disabled={!isAdmin} onChange={(e) => setOpcion(p.id, i, e.target.value)} placeholder={`Opción ${i + 1}`} />
                    {isAdmin && p.opciones.length > 2 && <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => removeOpcion(p.id, i)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                  </div>
                ))}
                {isAdmin && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => addOpcion(p.id)}><Plus className="w-3 h-3 mr-1" /> Opción</Button>}
              </div>
            </div>
          ))}
        </div>

        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={addPregunta}><Plus className="w-4 h-4 mr-1" /> Añadir pregunta</Button>
            <Button size="sm" onClick={() => updateSurvey({ preguntas: survey.preguntas })} disabled={busy}><Check className="w-4 h-4 mr-1" /> Guardar preguntas</Button>
          </div>
        )}

        {survey.respuestas_totales > 0 && (
          <div className="border-t pt-3">
            <SurveyResults survey={survey} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}