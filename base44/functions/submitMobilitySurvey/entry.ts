import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function (req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const surveyId = String(body?.survey_id || '').trim();
    const token = String(body?.token || '').trim();
    const answers = Array.isArray(body?.answers) ? body.answers : [];

    if (!surveyId) return Response.json({ error: 'survey_id requerido' }, { status: 400 });
    if (!token) return Response.json({ error: 'token requerido' }, { status: 400 });
    if (answers.length === 0) return Response.json({ error: 'No hay respuestas que registrar' }, { status: 400 });

    const base44 = createClientFromRequest(req);
    const survey = await base44.asServiceRole.entities.MobilitySurvey.get(surveyId);
    if (!survey) return Response.json({ error: 'Encuesta no encontrada' }, { status: 404 });
    if (!survey.token || survey.token !== token) {
      return Response.json({ error: 'Enlace de encuesta no válido' }, { status: 401 });
    }
    if (survey.estado !== 'Abierta') {
      return Response.json({ error: 'La encuesta no está abierta' }, { status: 409 });
    }

    const preguntas = Array.isArray(survey.preguntas) ? survey.preguntas : [];
    const resultados = { ...(survey.resultados || {}) };

    for (const answer of answers) {
      const pregunta = preguntas.find((p) => p && p.id === answer?.pregunta_id);
      if (!pregunta) continue;
      const totalOpciones = Array.isArray(pregunta.opciones) ? pregunta.opciones.length : 0;
      const actuales = Array.isArray(resultados[pregunta.id]) ? resultados[pregunta.id].slice() : [];
      while (actuales.length < totalOpciones) actuales.push(0);
      const valores = Array.isArray(answer.valor) ? answer.valor : [answer.valor];
      for (const valor of valores) {
        const indice = Number(valor);
        if (Number.isInteger(indice) && indice >= 0 && indice < totalOpciones) actuales[indice] += 1;
      }
      resultados[pregunta.id] = actuales;
    }

    const respuestasTotales = (survey.respuestas_totales || 0) + 1;
    await base44.asServiceRole.entities.MobilitySurvey.update(surveyId, {
      resultados,
      respuestas_totales: respuestasTotales
    });

    return Response.json({ ok: true, respuestas_totales: respuestasTotales });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}