import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react';
import {
  UNIDADES,
  unitValue,
  fromUnit,
  activityWindow,
  formatClock,
  formatShortDate,
} from './plannerTime';

const selectClass = 'w-full h-8 text-xs border border-input rounded-md px-2 bg-background text-foreground';

export default function ActivityInspector({
  activity,
  index = 0,
  total = 0,
  hitoFecha = '',
  machines = [],
  layoutElements = [],
  onChange,
  onDuplicate,
  onDelete,
  onMove,
  onAdd,
}) {
  if (!activity) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Actividad seleccionada
          </h3>
          <Button size="sm" onClick={onAdd} className="h-7 px-2 gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-3.5 h-3.5" /> Añadir
          </Button>
        </div>
        <p className="text-xs text-slate-400 py-8 text-center">
          Selecciona una actividad del cronograma para editarla.
        </p>
      </div>
    );
  }

  const offset = Number(activity.offset_minutos) || 0;
  const unidad = activity.unidad || 'Minutos';
  const window = activityWindow(hitoFecha, activity);

  const setFase = (fase) => {
    const magnitude = Math.abs(offset);
    onChange({
      fase,
      offset_minutos: fase === 'Preparación' ? -(magnitude || 60) : magnitude,
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Actividad seleccionada
        </h3>
        <Button size="sm" onClick={onAdd} className="h-7 px-2 gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-3.5 h-3.5" /> Añadir
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index <= 0}
            className="p-1 rounded border border-slate-200 text-slate-500 hover:text-blue-600 disabled:opacity-40"
            title="Subir"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index >= total - 1}
            className="p-1 rounded border border-slate-200 text-slate-500 hover:text-blue-600 disabled:opacity-40"
            title="Bajar"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className="text-[10px] text-slate-400">Actividad {index + 1} de {total}</span>
      </div>

      <div>
        <Label className="text-[10px] text-slate-500">Nombre de la actividad</Label>
        <Input
          value={activity.nombre || ''}
          onChange={(e) => onChange({ nombre: e.target.value })}
          placeholder="Ej: Dosificación del perfume"
          className="h-8 text-xs mt-0.5"
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <Label className="text-[10px] text-slate-500">Fase</Label>
          <select
            value={offset < 0 ? 'Preparación' : 'Producción'}
            onChange={(e) => setFase(e.target.value)}
            className={`${selectClass} mt-0.5`}
          >
            <option value="Preparación">Antes del hito</option>
            <option value="Producción">Después del hito</option>
          </select>
        </div>
        <div>
          <Label className="text-[10px] text-slate-500">Unidad</Label>
          <select
            value={unidad}
            onChange={(e) => onChange({ unidad: e.target.value })}
            className={`${selectClass} mt-0.5`}
          >
            {UNIDADES.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <Label className="text-[10px] text-slate-500">
            {offset < 0 ? 'Antes del hito' : 'Después del hito'}
          </Label>
          <Input
            type="number"
            step={unidad === 'Horas' ? 0.5 : 5}
            value={unidad === 'Horas' ? Math.round((offset / 60) * 100) / 100 : offset}
            onChange={(e) => onChange({ offset_minutos: fromUnit(e.target.value, unidad) })}
            className="h-8 text-xs mt-0.5"
          />
        </div>
        <div>
          <Label className="text-[10px] text-slate-500">Duración ({unidad.toLowerCase()})</Label>
          <Input
            type="number"
            min={0}
            step={unidad === 'Horas' ? 0.5 : 5}
            value={unitValue(activity)}
            onChange={(e) => onChange({ duracion_minutos: Math.abs(fromUnit(e.target.value, unidad)) })}
            className="h-8 text-xs mt-0.5"
          />
        </div>
      </div>

      <div>
        <Label className="text-[10px] text-slate-500">Responsable</Label>
        <Input
          value={activity.responsable || ''}
          onChange={(e) => onChange({ responsable: e.target.value })}
          placeholder="Ej: Producción"
          className="h-8 text-xs mt-0.5"
        />
      </div>

      <div>
        <Label className="text-[10px] text-slate-500">Máquina asignada</Label>
        <select
          value={activity.maquina_id || ''}
          onChange={(e) => {
            const machine = machines.find((m) => m.id === e.target.value);
            onChange({ maquina_id: e.target.value, maquina_nombre: machine ? machine.nombre : '' });
          }}
          className={`${selectClass} mt-0.5`}
        >
          <option value="">Sin máquina</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>{m.nombre}</option>
          ))}
        </select>
      </div>

      <div>
        <Label className="text-[10px] text-slate-500">Estación de la línea</Label>
        <select
          value={activity.estacion_element_id || ''}
          onChange={(e) => {
            const el = layoutElements.find((x) => x.id === e.target.value);
            onChange({
              estacion_element_id: e.target.value,
              estacion_nombre: el ? el.label || el.type : '',
            });
          }}
          className={`${selectClass} mt-0.5`}
        >
          <option value="">Sin estación</option>
          {layoutElements.map((el) => (
            <option key={el.id} value={el.id}>{el.label || el.type}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-wide text-slate-400">Inicio calculado</div>
          <div className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
            {window ? `${formatShortDate(window.start)}, ${formatClock(window.start)}` : '—'}
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-wide text-slate-400">Fin calculado</div>
          <div className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
            {window ? `${formatShortDate(window.end)}, ${formatClock(window.end)}` : '—'}
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 pt-0.5">
        <Button size="sm" variant="outline" className="flex-1 h-8 gap-1 text-xs" onClick={onDuplicate}>
          <Copy className="w-3.5 h-3.5" /> Duplicar
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 gap-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" /> Eliminar
        </Button>
      </div>
    </div>
  );
}