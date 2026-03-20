import { Label } from '@/components/ui/label';

function TextArea({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <div>
      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</Label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-1 w-full rounded-md border border-slate-200 dark:border-border bg-white dark:bg-input px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
      />
    </div>
  );
}

export default function ReportTextSections({ data, onChange }) {
  return (
    <div className="space-y-5 max-w-4xl">
      <TextArea
        label="Objetivo"
        value={data.objetivo}
        onChange={(v) => onChange({ objetivo: v })}
        placeholder="Describir el objetivo principal del informe..."
        rows={3}
      />
      <TextArea
        label="Alcance"
        value={data.alcance}
        onChange={(v) => onChange({ alcance: v })}
        placeholder="Definir el alcance de la validación o calificación..."
        rows={3}
      />
      <TextArea
        label="Resumen Ejecutivo"
        value={data.resumenEjecutivo}
        onChange={(v) => onChange({ resumenEjecutivo: v })}
        placeholder="Resumen ejecutivo del informe técnico..."
        rows={5}
      />
      <TextArea
        label="Metodología"
        value={data.metodologia}
        onChange={(v) => onChange({ metodologia: v })}
        placeholder="Descripción de la metodología empleada, normas y protocolos seguidos..."
        rows={5}
      />
      <TextArea
        label="Conclusiones"
        value={data.conclusiones}
        onChange={(v) => onChange({ conclusiones: v })}
        placeholder="Conclusiones finales del informe..."
        rows={5}
      />
      <TextArea
        label="Recomendaciones"
        value={data.recomendaciones}
        onChange={(v) => onChange({ recomendaciones: v })}
        placeholder="Recomendaciones para mejora o seguimiento..."
        rows={4}
      />
    </div>
  );
}