import { Input } from '@/components/ui/input';
import { Copy, GripVertical, Trash2 } from 'lucide-react';

const TIPOS = ['Máquina', 'Manual', 'Logística', 'Verificación', 'Acondicionamiento'];
const FASES = ['Preparación', 'Producción', 'Cierre'];

const selectClass = 'w-full h-8 text-xs border border-input rounded-md px-2 bg-background text-foreground';

export default function ActivityRow({ activity, index, layoutElements = [], machines = [], onChange, onDuplicate, onDelete, dragHandleProps }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-2.5">
      <div className="flex items-center gap-1.5">
        <div {...(dragHandleProps || {})} className="cursor-grab active:cursor-grabbing p-0.5 text-slate-400 hover:text-blue-600">
          <GripVertical className="w-4 h-4" />
        </div>
        <span className="w-5 text-[11px] font-semibold text-slate-400">{index + 1}</span>
        <Input
          value={activity.nombre || ''}
          onChange={e => onChange({ nombre: e.target.value })}
          placeholder="Nombre de la actividad (ej: Llenado de frascos)"
          className="h-8 text-sm font-medium flex-1"
        />
        <button onClick={onDuplicate} title="Duplicar" className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} title="Eliminar" className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mt-2 pl-6">
        <div>
          <label className="text-[10px] text-slate-400">Fase</label>
          <select value={activity.fase || 'Producción'} onChange={e => onChange({ fase: e.target.value })} className={selectClass}>
            {FASES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-400">Tipo</label>
          <select value={activity.tipo || 'Manual'} onChange={e => onChange({ tipo: e.target.value })} className={selectClass}>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-400">Duración (min)</label>
          <Input
            type="number" min={0} step={5}
            value={activity.duracion_minutos ?? 0}
            onChange={e => onChange({ duracion_minutos: Number(e.target.value) || 0 })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-400">Respecto al hito (min)</label>
          <Input
            type="number" step={5}
            value={activity.offset_minutos ?? 0}
            onChange={e => onChange({ offset_minutos: Number(e.target.value) || 0 })}
            className="h-8 text-xs"
          />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] text-slate-400">Estación del layout</label>
          <select
            value={activity.estacion_element_id || ''}
            onChange={e => {
              const el = layoutElements.find(x => x.id === e.target.value);
              onChange({ estacion_element_id: e.target.value, estacion_nombre: el ? (el.label || el.type) : '' });
            }}
            className={selectClass}
          >
            <option value="">Sin estación</option>
            {layoutElements.map(el => <option key={el.id} value={el.id}>{el.label || el.type}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[10px] text-slate-400">Máquina</label>
          <select
            value={activity.maquina_id || ''}
            onChange={e => {
              const m = machines.find(x => x.id === e.target.value);
              onChange({ maquina_id: e.target.value, maquina_nombre: m ? m.nombre : '' });
            }}
            className={selectClass}
          >
            <option value="">Sin máquina</option>
            {machines.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>
        <div className="col-span-2 md:col-span-2">
          <label className="text-[10px] text-slate-400">Responsable</label>
          <Input
            value={activity.responsable || ''}
            onChange={e => onChange({ responsable: e.target.value })}
            placeholder="Ej: Jefe de línea"
            className="h-8 text-xs"
          />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] text-slate-400">Notas</label>
          <Input
            value={activity.notas || ''}
            onChange={e => onChange({ notas: e.target.value })}
            placeholder="Validaciones, componentes, incidencias..."
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
}