import React from 'react';
import { Progress } from '@/components/ui/progress';
import { surveyResultsFor } from '@/components/mobility/pmst/pmstRequirements';

export default function SurveyResults({ survey }) {
  const preguntas = survey?.preguntas || [];
  if (!preguntas.length) return null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {survey.respuestas_totales || 0} respuestas registradas. Solo se muestran recuentos agregados por opción.
      </p>
      {preguntas.map((p) => {
        const rows = surveyResultsFor(survey, p.id);
        const total = rows.reduce((s, r) => s + r.count, 0);
        return (
          <div key={p.id} className="space-y-2">
            <p className="text-sm font-medium">{p.texto}</p>
            {total === 0 && <p className="text-xs text-muted-foreground">Sin respuestas todavía.</p>}
            {total > 0 && rows.map((r) => (
              <div key={r.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{r.label}</span>
                  <span className="text-muted-foreground">{r.count} · {r.pct}%</span>
                </div>
                <Progress value={r.pct} className="h-2" />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}