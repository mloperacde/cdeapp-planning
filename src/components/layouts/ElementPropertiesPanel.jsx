import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { ELEMENT_TYPES } from './ElementPalette';

export default function ElementPropertiesPanel({ element, machines, onUpdate, onDelete, roomPolygon, floorColor, onUpdateFloor, onDeleteFloor, onRedrawFloor, onUpdateRoomPolygon }) {
  const [newStation, setNewStation] = useState('');
  const [showVertices, setShowVertices] = useState(false);

  // Special panel for room floor
  if (element?.id === '__room_floor__') {
    const pts = roomPolygon || [];
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const bbX = pts.length ? Math.min(...xs) : 0;
    const bbY = pts.length ? Math.min(...ys) : 0;
    const bbW = pts.length ? Math.max(...xs) - bbX : 0;
    const bbH = pts.length ? Math.max(...ys) - bbY : 0;
    return (
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">🏠 Suelo de Sala</p>
          <Button size="sm" variant="ghost" className="text-red-500 h-6 w-6 p-0" onClick={onDeleteFloor} title="Borrar suelo">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div>
          <Label className="text-xs">Color del suelo</Label>
          <div className="flex gap-2 items-center mt-1">
            <input type="color" value={floorColor || '#475569'} onChange={e => onUpdateFloor?.({ floorColor: e.target.value })}
              className="w-8 h-7 rounded border border-input cursor-pointer" />
            <Input value={floorColor || '#475569'} onChange={e => onUpdateFloor?.({ floorColor: e.target.value })} className="h-7 text-xs flex-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
          <div><span className="block text-[10px] text-slate-400">Puntos</span><span className="font-medium text-slate-700 dark:text-slate-300">{pts.length}</span></div>
          <div><span className="block text-[10px] text-slate-400">Tamaño</span><span className="font-medium text-slate-700 dark:text-slate-300">{Math.round(bbW)}×{Math.round(bbH)}</span></div>
          <div><span className="block text-[10px] text-slate-400">Pos. X</span><span className="font-medium text-slate-700 dark:text-slate-300">{Math.round(bbX)}</span></div>
          <div><span className="block text-[10px] text-slate-400">Pos. Y</span><span className="font-medium text-slate-700 dark:text-slate-300">{Math.round(bbY)}</span></div>
        </div>

        {/* Edición manual de vértices */}
        {pts.length > 0 && (
          <div>
            <button
              onClick={() => setShowVertices(v => !v)}
              className="w-full flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-medium py-1 px-2 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <span>Editar vértices ({pts.length})</span>
              {showVertices ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showVertices && (
              <div className="mt-1 space-y-1 max-h-48 overflow-y-auto pr-0.5">
                {pts.map((p, i) => (
                  <div key={i} className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded px-1.5 py-1">
                    <span className="text-[10px] text-slate-400 w-4 font-bold">{i + 1}</span>
                    <div className="flex items-center gap-1 flex-1">
                      <span className="text-[10px] text-slate-400">X</span>
                      <Input
                        type="number"
                        value={p.x}
                        onChange={e => {
                          const updated = pts.map((pt, j) => j === i ? { ...pt, x: +e.target.value } : pt);
                          onUpdateRoomPolygon?.(updated);
                        }}
                        className="h-5 text-xs px-1 w-16"
                      />
                      <span className="text-[10px] text-slate-400">Y</span>
                      <Input
                        type="number"
                        value={p.y}
                        onChange={e => {
                          const updated = pts.map((pt, j) => j === i ? { ...pt, y: +e.target.value } : pt);
                          onUpdateRoomPolygon?.(updated);
                        }}
                        className="h-5 text-xs px-1 w-16"
                      />
                    </div>
                    <button
                      onClick={() => onUpdateRoomPolygon?.(pts.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 flex-shrink-0"
                      title="Eliminar vértice"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1" onClick={onRedrawFloor}>
          ✏️ Redibujar contorno
        </Button>
      </div>
    );
  }

  if (!element) {
    return (
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-4 text-center text-slate-400 text-sm">
        <p>Selecciona un elemento para editar sus propiedades</p>
      </div>
    );
  }

  const update = (field, value) => onUpdate(element.id, { [field]: value });

  const addStation = () => {
    if (!newStation.trim()) return;
    const stations = [...(element.stations || []), {
      id: `st_${Date.now()}`,
      name: newStation.trim(),
      x_offset: 5,
      y_offset: 5,
      width: Math.min(60, element.width - 10),
      height: Math.min(30, element.height / 3),
    }];
    update('stations', stations);
    setNewStation('');
  };

  const removeStation = (stId) => {
    update('stations', (element.stations || []).filter(s => s.id !== stId));
  };

  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-3 space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Propiedades</p>
        <Button size="sm" variant="ghost" className="text-red-500 h-6 w-6 p-0" onClick={() => onDelete(element.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-xs">Etiqueta</Label>
          <Input value={element.label || ''} onChange={e => update('label', e.target.value)} className="h-7 text-sm" />
        </div>

        <div>
          <Label className="text-xs">Tipo</Label>
          <select
            value={element.type}
            onChange={e => update('type', e.target.value)}
            className="w-full h-7 text-sm border border-input rounded-md px-2 bg-background"
          >
            {ELEMENT_TYPES.map(t => (
              <option key={t.type} value={t.type}>{t.label}</option>
            ))}
          </select>
        </div>

        {element.type === 'machine' && machines?.length > 0 && (
          <div>
            <Label className="text-xs">Máquina vinculada</Label>
            <select
              value={element.ref_id || ''}
              onChange={e => update('ref_id', e.target.value)}
              className="w-full h-7 text-sm border border-input rounded-md px-2 bg-background"
            >
              <option value="">-- Sin vincular --</option>
              {machines.map(m => (
                <option key={m.id} value={m.id}>{m.nombre} ({m.codigo_maquina})</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <Label className="text-xs">Color</Label>
          <div className="flex gap-2 items-center">
            <input type="color" value={element.color || '#3B82F6'} onChange={e => update('color', e.target.value)}
              className="w-8 h-7 rounded border border-input cursor-pointer" />
            <Input value={element.color || '#3B82F6'} onChange={e => update('color', e.target.value)} className="h-7 text-xs flex-1" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">X</Label><Input type="number" value={element.x} onChange={e => update('x', +e.target.value)} className="h-7 text-sm" /></div>
          <div><Label className="text-xs">Y</Label><Input type="number" value={element.y} onChange={e => update('y', +e.target.value)} className="h-7 text-sm" /></div>
          <div><Label className="text-xs">Ancho</Label><Input type="number" value={element.width} onChange={e => update('width', +e.target.value)} className="h-7 text-sm" /></div>
          <div><Label className="text-xs">Alto</Label><Input type="number" value={element.height} onChange={e => update('height', +e.target.value)} className="h-7 text-sm" /></div>
        </div>

        <div>
          <Label className="text-xs">Rotación (°)</Label>
          <Input type="number" value={element.rotation || 0} onChange={e => update('rotation', +e.target.value)} className="h-7 text-sm" />
        </div>
      </div>

      {/* Stations */}
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Estaciones</p>
        <div className="space-y-1 mb-2">
          {(element.stations || []).map(st => (
            <div key={st.id} className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1">
              <span className="text-xs flex-1 text-slate-700 dark:text-slate-300">{st.name}</span>
              <button onClick={() => removeStation(st.id)} className="text-red-400 hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          <Input
            placeholder="Nombre estación..."
            value={newStation}
            onChange={e => setNewStation(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addStation()}
            className="h-7 text-xs flex-1"
          />
          <Button size="sm" onClick={addStation} className="h-7 px-2">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}