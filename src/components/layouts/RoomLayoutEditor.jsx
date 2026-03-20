import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Settings, Layers } from 'lucide-react';
import { toast } from 'sonner';
import ElementPalette, { getElementConfig } from './ElementPalette';
import LayoutCanvas from './LayoutCanvas';
import ElementPropertiesPanel from './ElementPropertiesPanel';

export default function RoomLayoutEditor({ layoutId, onBack }) {
  const qc = useQueryClient();
  const isNew = !layoutId;

  const [data, setData] = useState({
    name: '',
    room_name: '',
    description: '',
    canvas_width: 1200,
    canvas_height: 800,
    status: 'Borrador',
    layout_elements: [],
  });
  const [selectedId, setSelectedId] = useState(null);
  const [sidePanel, setSidePanel] = useState('palette');
  const [loaded, setLoaded] = useState(false);

  const { data: machines = [] } = useQuery({
    queryKey: ['MachineMasterDatabase'],
    queryFn: () => base44.entities.MachineMasterDatabase.list('nombre'),
  });

  const { data: existingLayout } = useQuery({
    queryKey: ['RoomLayout', layoutId],
    queryFn: () => base44.entities.RoomLayout.filter({ id: layoutId }),
    enabled: !isNew && !loaded,
  });

  if (existingLayout?.[0] && !loaded) {
    setData(existingLayout[0]);
    setLoaded(true);
  }

  const saveMutation = useMutation({
    mutationFn: (d) => isNew ? base44.entities.RoomLayout.create(d) : base44.entities.RoomLayout.update(layoutId, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['RoomLayout'] });
      toast.success('Layout guardado correctamente');
      if (isNew) onBack();
    },
  });

  const addElement = (elConfig) => {
    const el = {
      id: `el_${Date.now()}`,
      type: elConfig.type,
      label: elConfig.label,
      color: elConfig.color,
      x: 50,
      y: 50,
      width: elConfig.defaultW,
      height: elConfig.defaultH,
      rotation: 0,
      stations: [],
    };
    setData(prev => ({ ...prev, layout_elements: [...(prev.layout_elements || []), el] }));
    setSelectedId(el.id);
    setSidePanel('properties');
  };

  const updateElement = (id, changes) => {
    setData(prev => ({
      ...prev,
      layout_elements: (prev.layout_elements || []).map(e => e.id === id ? { ...e, ...changes } : e),
    }));
  };

  const deleteElement = (id) => {
    setData(prev => ({ ...prev, layout_elements: (prev.layout_elements || []).filter(e => e.id !== id) }));
    setSelectedId(null);
  };

  const selectedElement = (data.layout_elements || []).find(e => e.id === selectedId);

  const handleSelect = (id) => {
    setSelectedId(id);
    if (id) setSidePanel('properties');
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-background overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-card border-b border-slate-200 dark:border-border shadow-sm flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Button>
        <div className="flex-1 min-w-0">
          <Input
            value={data.name}
            onChange={e => setData(d => ({ ...d, name: e.target.value }))}
            placeholder="Nombre del layout..."
            className="h-8 font-semibold border-0 bg-transparent text-slate-900 dark:text-white text-base p-0 focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={data.status}
            onChange={e => setData(d => ({ ...d, status: e.target.value }))}
            className="h-8 text-xs border border-input rounded-md px-2 bg-background"
          >
            {['Borrador', 'Aprobado', 'Archivado'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button size="sm" onClick={() => saveMutation.mutate(data)} disabled={saveMutation.isPending} className="gap-1 bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="w-4 h-4" /> Guardar
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-52 flex-shrink-0 p-2 border-r border-slate-200 dark:border-border bg-white dark:bg-card space-y-2 overflow-y-auto">
          <div className="flex gap-1 mb-2">
            {[['palette', 'Paleta', Layers], ['settings', 'Config', Settings]].map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setSidePanel(key)}
                className={`flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded transition-colors ${sidePanel === key ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-accent/10'}`}
              >
                <Icon className="w-3 h-3" />{label}
              </button>
            ))}
          </div>

          {sidePanel === 'palette' && <ElementPalette onAdd={addElement} />}

          {sidePanel === 'settings' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Sala física</Label>
                <Input value={data.room_name} onChange={e => setData(d => ({ ...d, room_name: e.target.value }))} className="h-7 text-sm" placeholder="Ej: Sala 101..." />
              </div>
              <div>
                <Label className="text-xs">Descripción</Label>
                <textarea value={data.description || ''} onChange={e => setData(d => ({ ...d, description: e.target.value }))}
                  className="w-full text-sm border border-input rounded-md p-2 h-20 resize-none bg-background text-foreground" placeholder="Descripción..." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Ancho (px)</Label>
                  <Input type="number" value={data.canvas_width} onChange={e => setData(d => ({ ...d, canvas_width: +e.target.value }))} className="h-7 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Alto (px)</Label>
                  <Input type="number" value={data.canvas_height} onChange={e => setData(d => ({ ...d, canvas_height: +e.target.value }))} className="h-7 text-sm" />
                </div>
              </div>
              <div className="pt-1 text-xs text-slate-500">
                {(data.layout_elements || []).length} elementos en el layout
              </div>
            </div>
          )}

          {sidePanel === 'properties' && (
            <ElementPropertiesPanel
              element={selectedElement}
              machines={machines}
              onUpdate={updateElement}
              onDelete={deleteElement}
            />
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 p-3 overflow-auto">
          <LayoutCanvas
            elements={data.layout_elements || []}
            selectedId={selectedId}
            onSelect={handleSelect}
            onUpdateElement={updateElement}
            width={data.canvas_width || 1200}
            height={data.canvas_height || 800}
          />
          <p className="text-xs text-slate-400 mt-2 text-center">
            Haz clic en un elemento para seleccionarlo · Arrastra para moverlo · Arrastra la esquina azul para redimensionar
          </p>
        </div>

        {/* Right sidebar - Properties (when element selected) */}
        {selectedElement && (
          <div className="w-56 flex-shrink-0 p-2 border-l border-slate-200 dark:border-border bg-white dark:bg-card overflow-y-auto">
            <ElementPropertiesPanel
              element={selectedElement}
              machines={machines}
              onUpdate={updateElement}
              onDelete={deleteElement}
            />
          </div>
        )}
      </div>
    </div>
  );
}