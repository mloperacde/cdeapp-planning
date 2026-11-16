import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cuboid, Layers } from 'lucide-react';
import Layout3DView from '@/components/layouts/Layout3DView';

export default function LineStations3D({ layout, actividades = [], selectedId, onSelectActivity }) {
  const [show3D, setShow3D] = useState(false);
  const elements = layout?.layout_elements || [];
  const selected = actividades.find((a) => a.id === selectedId);
  const activeStationId = selected?.estacion_element_id || '';

  const activitiesAt = (elementId) =>
    actividades.filter((a) => a.estacion_element_id === elementId);

  const selectStation = (elementId) => {
    const first = activitiesAt(elementId)[0];
    if (first) onSelectActivity?.(first.id);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800">
        <div className="min-w-0">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Configuración resultante
          </h3>
          <p className="text-[11px] text-slate-500 truncate">
            {layout ? `${layout.name} · ${elements.length} estaciones` : 'Sin línea asignada'}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 gap-1 text-xs flex-shrink-0"
          disabled={!layout || elements.length === 0}
          onClick={() => setShow3D(true)}
        >
          <Cuboid className="w-3.5 h-3.5" /> Vista general
        </Button>
      </div>

      {!layout || elements.length === 0 ? (
        <p className="px-3 py-6 text-xs text-slate-400 text-center">
          Asigna una línea de envasado con estaciones para ver la configuración en 3D.
        </p>
      ) : (
        <>
          <div className="flex gap-1.5 px-2 py-2 overflow-x-auto">
            {elements.map((el, index) => {
              const count = activitiesAt(el.id).length;
              const active = activeStationId === el.id;
              return (
                <button
                  key={el.id}
                  type="button"
                  onClick={() => selectStation(el.id)}
                  className={`flex-shrink-0 rounded-lg border px-2 py-1 text-left transition-colors ${
                    active
                      ? 'border-amber-400 bg-amber-50 text-amber-900'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-400">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[11px] font-medium whitespace-nowrap truncate max-w-[110px]">
                      {el.label || el.type}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400 pl-4">
                    {count ? `${count} act.` : 'libre'}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="px-3 pb-2 text-[10px] text-slate-400 flex items-center gap-1">
            <Layers className="w-3 h-3" /> Selecciona una estación para abrir su actividad
          </p>
        </>
      )}

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