import { useMemo } from 'react';
import { Clock, Flag } from 'lucide-react';
import { formatMinutes, formatHitoDate, offsetLabel } from './plannerTime';

const PRE_BAR = 'bg-amber-500';
const POST_BAR = 'bg-blue-600';

const GRID = 'grid grid-cols-[minmax(0,150px)_minmax(0,1fr)_58px] sm:grid-cols-[minmax(0,210px)_minmax(0,1fr)_72px] items-center gap-2';

function sortByOffset(list) {
  return [...list].sort((a, b) => (Number(a.offset_minutos) || 0) - (Number(b.offset_minutos) || 0));
}

export default function PlanningTimeline({
  actividades = [],
  hitoFecha = '',
  hitoNombre = 'Inicio de producción',
  selectedId,
  onSelect,
  onAdd,
}) {
  const rows = useMemo(() => {
    const valid = actividades.map((a) => ({
      ...a,
      offset: Number(a.offset_minutos) || 0,
      dur: Number(a.duracion_minutos) || 0,
    }));
    return {
      pre: sortByOffset(valid.filter((a) => a.offset < 0)),
      post: sortByOffset(valid.filter((a) => a.offset >= 0)),
    };
  }, [actividades]);

  const all = [...rows.pre, ...rows.post];
  const domain = useMemo(() => {
    if (all.length === 0) return { minT: -60, maxT: 120 };
    const minT = Math.min(0, ...all.map((a) => a.offset));
    const maxT = Math.max(60, ...all.map((a) => a.offset + Math.max(a.dur, 5)));
    return { minT, maxT: maxT === minT ? minT + 60 : maxT };
  }, [all]);

  const pct = (value) => {
    const span = domain.maxT - domain.minT || 1;
    return Math.max(0, Math.min(100, ((value - domain.minT) / span) * 100));
  };

  const ticks = Array.from({ length: 5 }, (_, i) => {
    const value = domain.minT + ((domain.maxT - domain.minT) * i) / 4;
    return Math.round(value);
  });

  const tickLabel = (value) => {
    if (Math.abs(value) >= 120) {
      const hours = Math.round(value / 60);
      return `${hours > 0 ? '+' : ''}${hours} h`;
    }
    return formatMinutes(value);
  };

  const renderRow = (activity) => {
    const selected = activity.id === selectedId;
    const end = activity.offset + Math.max(activity.dur, 5);
    const width = Math.max(pct(end) - pct(activity.offset), 1.4);
    const isPre = activity.offset < 0;
    return (
      <button
        key={activity.id}
        type="button"
        onClick={() => onSelect?.(activity.id)}
        className={`${GRID} w-full text-left px-2 py-1.5 rounded-lg transition-colors ${
          selected ? 'bg-amber-50 ring-1 ring-amber-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isPre ? PRE_BAR : POST_BAR}`} />
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
              {activity.nombre || 'Sin nombre'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 truncate pl-3">
            {activity.responsable || 'Sin responsable'}
            {activity.maquina_nombre ? ` · ${activity.maquina_nombre}` : ''}
          </div>
        </div>
        <div className="relative h-6 rounded bg-slate-100/70 dark:bg-slate-800/60">
          <div className="absolute inset-y-0 w-px bg-rose-300/80" style={{ left: `${pct(0)}%` }} />
          <div
            className={`absolute top-1 bottom-1 rounded ${isPre ? PRE_BAR : POST_BAR} ${selected ? 'ring-2 ring-amber-300' : ''}`}
            style={{ left: `${pct(activity.offset)}%`, width: `${width}%` }}
            title={`${offsetLabel(activity.offset)} · ${formatMinutes(activity.dur)}`}
          >
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-white truncate px-1">
              {formatMinutes(activity.dur)}
            </span>
          </div>
        </div>
        <div className="text-right text-[10px] font-medium text-slate-500 whitespace-nowrap">
          {offsetLabel(activity.offset)}
        </div>
      </button>
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Cronograma de la orden
          </h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            {all.length} actividades
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Antes del hito</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600" /> Proceso de envasado</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-200 border border-amber-400" /> Hito</span>
        </div>
      </div>

      {all.length === 0 ? (
        <div className="py-12 text-center">
          <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">Sin actividades todavía</p>
          <p className="text-xs text-slate-400 mt-1">
            Añade las preparaciones previas al hito y las actividades de la línea.
          </p>
          {onAdd && (
            <button onClick={onAdd} className="mt-3 text-xs font-medium text-blue-600 hover:underline">
              Añadir la primera actividad
            </button>
          )}
        </div>
      ) : (
        <div className="p-2">
          <div className={`${GRID} px-2 pb-1`}>
            <span />
            <div className="relative h-4">
              {ticks.map((tick, i) => (
                <span
                  key={`${tick}-${i}`}
                  className={`absolute top-0 -translate-x-1/2 text-[9px] text-slate-400 whitespace-nowrap ${
                    i === 1 || i === 3 ? 'hidden sm:block' : ''
                  }`}
                  style={{ left: `${pct(tick)}%` }}
                >
                  {tickLabel(tick)}
                </span>
              ))}
            </div>
            <span />
          </div>

          <div className="px-2 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Preparación y disponibilidad
          </div>
          {rows.pre.length === 0 ? (
            <p className="px-3 pb-1 text-[11px] text-slate-400">Sin actividades previas al hito.</p>
          ) : (
            rows.pre.map(renderRow)
          )}

          <div className="my-1.5 mx-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 flex items-center gap-2">
            <Flag className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-amber-900 truncate flex-1">{hitoNombre}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-700 text-white px-1.5 py-0.5 rounded">
              Hito
            </span>
            <span className="text-[10px] text-amber-800 whitespace-nowrap hidden sm:block">
              {formatHitoDate(hitoFecha)}
            </span>
          </div>

          <div className="px-2 pt-0.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Actividades de la línea configurada
          </div>
          {rows.post.length === 0 ? (
            <p className="px-3 pb-1 text-[11px] text-slate-400">Sin actividades después del hito.</p>
          ) : (
            rows.post.map(renderRow)
          )}
        </div>
      )}
    </div>
  );
}