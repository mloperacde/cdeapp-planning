import { Clock } from 'lucide-react';

const PHASE_STYLES = {
  'Preparación': { bar: 'bg-amber-500', text: 'text-amber-700', soft: 'bg-amber-50 border-amber-200' },
  'Producción': { bar: 'bg-blue-600', text: 'text-blue-700', soft: 'bg-blue-50 border-blue-200' },
  'Cierre': { bar: 'bg-emerald-600', text: 'text-emerald-700', soft: 'bg-emerald-50 border-emerald-200' },
};

export function formatMinutes(value) {
  const n = Number(value) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (!h) return `${sign}${m} min`;
  if (!m) return `${sign}${h} h`;
  return `${sign}${h} h ${m} min`;
}

export default function ProcessTimelinePreview({ actividades = [], hitoNombre = 'Inicio de producción' }) {
  const items = (actividades || [])
    .filter(a => a.nombre)
    .map(a => ({
      ...a,
      offset: Number(a.offset_minutos) || 0,
      dur: Math.max(Number(a.duracion_minutos) || 0, 10),
    }));

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 dark:border-border p-6 text-center">
        <Clock className="w-6 h-6 mx-auto text-slate-300 mb-2" />
        <p className="text-xs text-slate-400">Añade actividades para ver la secuencia respecto al hito.</p>
      </div>
    );
  }

  const min = Math.min(0, ...items.map(i => i.offset));
  const max = Math.max(60, ...items.map(i => i.offset + i.dur));
  const span = max - min || 1;
  const pct = (v) => ((v - min) / span) * 100;
  const total = items.reduce((s, i) => s + i.dur, 0);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Secuencia respecto al hito</h3>
        <span className="text-xs text-slate-500">
          {formatMinutes(total)} de proceso · {items.length} actividades
        </span>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2">
        <span>{formatMinutes(min)}</span>
        <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
        <span>{formatMinutes(max)}</span>
      </div>

      <div className="relative">
        <div className="absolute top-0 bottom-0 w-px bg-red-400/70 z-10" style={{ left: `${pct(0)}%` }}>
          <span className="absolute -top-0.5 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold text-red-500 bg-white dark:bg-card px-1">
            {hitoNombre || 'Hito'}
          </span>
        </div>

        <div className="space-y-1.5 pt-4">
          {items.map((item) => {
            const style = PHASE_STYLES[item.fase] || PHASE_STYLES['Producción'];
            return (
              <div key={item.id || item.nombre} className="flex items-center gap-2">
                <span className="w-40 flex-shrink-0 truncate text-[11px] text-slate-600 dark:text-slate-300" title={item.nombre}>
                  {item.orden}. {item.nombre}
                </span>
                <div className="relative flex-1 h-4 bg-slate-50 dark:bg-slate-800/60 rounded">
                  <div
                    className={`absolute top-0 h-4 rounded ${style.bar}`}
                    style={{ left: `${pct(item.offset)}%`, width: `${Math.max(pct(item.offset + item.dur) - pct(item.offset), 1.5)}%` }}
                    title={`${formatMinutes(item.offset)} · ${formatMinutes(item.dur)}`}
                  />
                </div>
                <span className="w-20 flex-shrink-0 text-right text-[11px] text-slate-500">{formatMinutes(item.offset)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        {Object.entries(PHASE_STYLES).map(([name, style]) => (
          <span key={name} className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className={`w-2.5 h-2.5 rounded-sm ${style.bar}`} /> {name}
          </span>
        ))}
      </div>
    </div>
  );
}