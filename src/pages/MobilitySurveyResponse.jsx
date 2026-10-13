import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Leaf, Check, ShieldCheck, Info } from 'lucide-react';

export default function MobilitySurveyResponse() {
  const [surveyId, setSurveyId] = useState(null);
  const [token, setToken] = useState(null);
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('survey');
    const t = params.get('t');
    setSurveyId(id);
    setToken(t);
    (async () => {
      if (!id) { setError('Falta el identificador de la encuesta.'); setLoading(false); return; }
      try {
        const s = await base44.entities.MobilitySurvey.get(id);
        setSurvey(s);
      } catch (e) { setError('No se ha podido cargar la encuesta.'); }
      setLoading(false);
    })();
  }, []);

  const setSingle = (qid, idx) => setAnswers((p) => ({ ...p, [qid]: idx }));
  const toggleMulti = (qid, idx, checked) => setAnswers((p) => {
    const current = Array.isArray(p[qid]) ? p[qid] : [];
    return { ...p, [qid]: checked ? [...current, idx] : current.filter((x) => x !== idx) };
  });

  const submit = async () => {
    setSending(true);
    setError('');
    try {
      const payload = Object.entries(answers).map(([pregunta_id, valor]) => ({ pregunta_id, valor }));
      await base44.functions.invoke('submitMobilitySurvey', { survey_id: surveyId, token, answers: payload });
      setDone(true);
    } catch (e) {
      setError(e?.response?.data?.error || 'No se han podido enviar las respuestas.');
    }
    setSending(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Leaf className="w-6 h-6 text-emerald-600" /> Encuesta de movilidad</h1>
        <p className="text-sm text-muted-foreground mt-1">{survey?.titulo || 'Encuesta anónima'}</p>
      </div>

      <Card className="border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20">
        <CardContent className="p-3 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-700 dark:text-emerald-400">{survey?.introduccion}</p>
        </CardContent>
      </Card>

      {error && <Card className="border-red-300 bg-red-50/60"><CardContent className="p-3 text-sm text-red-700">{error}</CardContent></Card>}

      {done ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Check className="w-12 h-12 mx-auto text-emerald-600" />
            <p className="font-medium">Respuestas registradas</p>
            <p className="text-sm text-muted-foreground">Gracias por participar. Tu respuesta se ha sumado de forma anónima al diagnóstico de movilidad.</p>
          </CardContent>
        </Card>
      ) : !survey ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Encuesta no encontrada.</CardContent></Card>
      ) : survey.estado !== 'Abierta' ? (
        <Card>
          <CardContent className="p-6 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">La recogida de respuestas no está abierta en este momento.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Cuestionario</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {(survey.preguntas || []).map((p) => (
              <div key={p.id} className="space-y-2">
                <p className="text-sm font-medium">{p.texto}</p>
                {p.tipo === 'opcion_multiple' ? (
                  <div className="space-y-2">
                    {p.opciones.map((o, i) => (
                      <label key={i} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={(answers[p.id] || []).includes(i)} onCheckedChange={(c) => toggleMulti(p.id, i, !!c)} />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <RadioGroup value={answers[p.id] != null ? String(answers[p.id]) : undefined} onValueChange={(v) => setSingle(p.id, Number(v))}>
                    {p.opciones.map((o, i) => (
                      <label key={i} className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value={String(i)} id={`${p.id}-${i}`} />
                        <span>{o}</span>
                      </label>
                    ))}
                  </RadioGroup>
                )}
              </div>
            ))}
            <Button onClick={submit} disabled={sending} className="w-full sm:w-auto">
              {sending ? 'Enviando...' : 'Enviar respuestas'}
            </Button>
            <p className="text-[11px] text-muted-foreground">No se registra tu identidad. Las respuestas se almacenan solo como recuentos agregados.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}