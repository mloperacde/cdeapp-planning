import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Cuboid, Layers } from 'lucide-react';
import Layout3DView from '@/components/layouts/Layout3DView';

export default function PlanLinePanel({ layouts = [], roomLayoutId = '', actividades = [], onChange }) {
  const [show3D, setShow3D] = useState(false);
  const layout = layouts.find(l => l.id === roomLayoutId);
  const elements = layout?.layout_elements || [];

  const usage = {};
  actividades.forEach(a => {
    if (a.estacion_element_id) usage[a.estacion_element_id] = (usage[a.estacion_element_id] || 0) + 1;
  });

  const handleChange = (id) => {
    const selected = layouts.find(l => l.id === id);
    onChange({ room_layout_id: id, room_layout_name: selected?.name || '' });
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <Label>Línea de envasado *</Label>
        <select
          value={roomLayoutId}
          onChange={e => handleChange(e.target.value)}
          className="w-full h-9 text-sm border border-input rounded-md px-3 bg-background mt-1"
        >
          <option value="">-- Seleccionar línea / layout --</option>
          {layouts.map(l => (
            <option key={l.id} value={l.id}>{l.name}{l.room_name ? ` (${l.room_name})` : ''}</option>
          ))}
        </select>
        <p className="text-xs text-slate-500 mt-1">
          Los artículos y familias del diagrama se procesan en esta línea.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Estaciones de la línea ({elements.length})
            </h3>
          </div>
          <Button
            size="sm" variant="outline" className="gap-1 h-8"
            onClick={() => setShow3D(true)}
            disabled={elements.length === 0}
          >
            <Cuboid className="w-3.5 h-3.5" /> Vista 3D
          </Button>
        </div>

        {elements.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            Selecciona una línea con elementos configurados para asignar estaciones a las actividades.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-72 overflow-y-auto">
            {elements.map(el => (
              <div key={el.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{el.label || el.type}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${usage[el.id] ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                  {usage[el.id] || 0} act.
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {show3D && layout && (
        <Layout3DView
          elements={elements}
          roomPolygon={layout.room_polygon || []}
          canvasWidth={layout.canvas_width || 1200}
          canvasHeight={layout.canvas_height || 800}
          floorColor={layout.floor_color}
          onClose={() => setShow3D(false)}
        />
      )}
    </div>
  );
}