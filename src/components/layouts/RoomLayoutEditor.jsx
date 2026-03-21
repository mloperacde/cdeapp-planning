import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Settings, Layers, Library, Copy, Ungroup, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ElementPalette from './ElementPalette';
import LayoutCanvas from './LayoutCanvas';
import ElementPropertiesPanel from './ElementPropertiesPanel';
import LayoutTemplateLibrary from './LayoutTemplateLibrary';

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
  const [selectedId, setSelectedId] = useState(null);      // single select
  const [selectedIds, setSelectedIds] = useState([]);      // multi select
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
    mutationFn: (d) => isNew
      ? base44.entities.RoomLayout.create(d)
      : base44.entities.RoomLayout.update(layoutId, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['RoomLayout'] });
      toast.success('Layout guardado correctamente');
      if (isNew) onBack();
    },
  });

  // ── Element operations ─────────────────────────────────────────────────────
  const addElement = (elConfig) => {
    const el = {
      id: `el_${Date.now()}`,
      type: elConfig.type,
      label: elConfig.label,
      color: elConfig.color,
      x: 60,
      y: 60,
      width: elConfig.defaultW,
      height: elConfig.defaultH,
      rotation: 0,
      stations: [],
    };
    setData(prev => ({ ...prev, layout_elements: [...(prev.layout_elements || []), el] }));
    setSelectedId(el.id);
    setSelectedIds([]);
    setSidePanel('properties');
  };

  const updateElement = (id, changes) => {
    setData(prev => ({
      ...prev,
      layout_elements: (prev.layout_elements || []).map(e => e.id === id ? { ...e, ...changes } : e),
    }));
  };

  const deleteElement = (id) => {
    setData(prev => ({
      ...prev,
      layout_elements: (prev.layout_elements || []).filter(e => e.id !== id),
    }));
    setSelectedId(null);
  };

  const deleteSelected = () => {
    const toRemove = new Set(selectedIds.length > 1 ? selectedIds : selectedId ? [selectedId] : []);
    if (!toRemove.size) return;
    setData(prev => ({
      ...prev,
      layout_elements: (prev.layout_elements || []).filter(e => !toRemove.has(e.id)),
    }));
    setSelectedId(null);
    setSelectedIds([]);
    toast.success(`${toRemove.size} elemento(s) eliminado(s)`);
  };

  // ── Duplicate selected ─────────────────────────────────────────────────────
  const duplicateSelected = () => {
    const ids = selectedIds.length > 1 ? selectedIds : selectedId ? [selectedId] : [];
    if (!ids.length) return;
    const toDup = (data.layout_elements || []).filter(e => ids.includes(e.id));
    const copies = toDup.map(e => ({
      ...e,
      id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: e.x + 20,
      y: e.y + 20,
    }));
    setData(prev => ({ ...prev, layout_elements: [...(prev.layout_elements || []), ...copies] }));
    toast.success(`${copies.length} elemento(s) duplicado(s)`);
  };

  // ── Group: merge selected into a single element with stations ─────────────
  const groupSelected = () => {
    if (selectedIds.length < 2) { toast.error('Selecciona al menos 2 elementos para agrupar'); return; }
    const toGroup = (data.layout_elements || []).filter(e => selectedIds.includes(e.id));
    const minX = Math.min(...toGroup.map(e => e.x));
    const minY = Math.min(...toGroup.map(e => e.y));
    const maxX = Math.max(...toGroup.map(e => e.x + e.width));
    const maxY = Math.max(...toGroup.map(e => e.y + e.height));
    const grouped = {
      id: `el_${Date.now()}`,
      type: 'machine',
      label: 'Grupo',
      color: '#6366F1',
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      rotation: 0,
      stations: toGroup.map(e => ({
        id: e.id,
        name: e.label || e.type,
        x_offset: e.x - minX,
        y_offset: e.y - minY,
        width: e.width,
        height: e.height,
      })),
    };
    setData(prev => ({
      ...prev,
      layout_elements: [
        ...(prev.layout_elements || []).filter(e => !selectedIds.includes(e.id)),
        grouped,
      ],
    }));
    setSelectedId(grouped.id);
    setSelectedIds([]);
    toast.success(`${toGroup.length} elementos agrupados`);
  };

  // ── Insert template ────────────────────────────────────────────────────────
  const insertTemplate = (elements) => {
    setData(prev => ({ ...prev, layout_elements: [...(prev.layout_elements || []), ...elements] }));
    setSelectedIds(elements.map(e => e.id));
    setSelectedId(null);
  };

  const selectedElement = (data.layout_elements || []).find(e => e.id === selectedId);
  const activeMultiCount = selectedIds.length;

  const handleSelect = (id) => {
    setSelectedId(id);
    if (id) {
      setSelectedIds([]);
      setSidePanel('properties');
    }
  };

  const handleMultiSelect = (ids) => {
    setSelectedIds(ids);
    if (ids.length > 0) {
      setSelectedId(null);
      setSidePanel('multi');
    }
  };

  const TABS = [
    { key: 'palette',   label: 'Elementos', Icon: Layers },
    { key: 'templates', label: 'Plantillas', Icon: Library },
    { key: 'settings',  label: 'Config',    Icon: Settings },
  ];

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

        {/* Multi-select toolbar */}
        {(activeMultiCount > 1 || (activeMultiCount >= 1 && !selectedId)) && (
          <div className="flex items-center gap-1 border border-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2 py-1">
            <span className="text-xs text-blue-600 font-medium">{activeMultiCount} sel.</span>
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-blue-600" onClick={duplicateSelected} title="Duplicar">
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-indigo-600" onClick={groupSelected} title="Agrupar">
              <Ungroup className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-red-500" onClick={deleteSelected} title="Eliminar">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={data.status}
            onChange={e => setData(d => ({ ...d, status: e.target.value }))}
            className="h-8 text-xs border border-input rounded-md px-2 bg-background"
          >
            {['Borrador', 'Aprobado', 'Archivado'].map(s => <option key={s}>{s}</option>)}
          </select>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate(data)}
            disabled={saveMutation.isPending}
            className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="w-4 h-4" /> Guardar
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-52 flex-shrink-0 p-2 border-r border-slate-200 dark:border-border bg-white dark:bg-card space-y-2 overflow-y-auto">
          {/* Tabs */}
          <div className="flex gap-0.5 mb-1">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setSidePanel(key)}
                className={`flex-1 flex flex-col items-center gap-0.5 text-xs py-1 rounded transition-colors ${
                  sidePanel === key
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-accent/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[10px] leading-tight">{label}</span>
              </button>
            ))}
          </div>

          {sidePanel === 'palette' && <ElementPalette onAdd={addElement} />}

          {sidePanel === 'templates' && (
            <LayoutTemplateLibrary
              selectedElements={(data.layout_elements || []).filter(e =>
                selectedIds.includes(e.id) || e.id === selectedId
              )}
              onInsertTemplate={insertTemplate}
            />
          )}

          {sidePanel === 'settings' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Sala física</Label>
                <Input value={data.room_name} onChange={e => setData(d => ({ ...d, room_name: e.target.value }))}
                  className="h-7 text-sm" placeholder="Ej: Sala 101..." />
              </div>
              <div>
                <Label className="text-xs">Descripción</Label>
                <textarea value={data.description || ''}
                  onChange={e => setData(d => ({ ...d, description: e.target.value }))}
                  className="w-full text-sm border border-input rounded-md p-2 h-20 resize-none bg-background text-foreground"
                  placeholder="Descripción..." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Ancho (px)</Label>
                  <Input type="number" value={data.canvas_width}
                    onChange={e => setData(d => ({ ...d, canvas_width: +e.target.value }))} className="h-7 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Alto (px)</Label>
                  <Input type="number" value={data.canvas_height}
                    onChange={e => setData(d => ({ ...d, canvas_height: +e.target.value }))} className="h-7 text-sm" />
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

          {sidePanel === 'multi' && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold text-blue-600">{activeMultiCount} elementos seleccionados</p>
              <p className="text-xs text-slate-500">Usa los botones de la barra superior para operar sobre la selección.</p>
              <p className="text-xs text-slate-400 mt-2">
                <strong>Shift+clic</strong> añade/quita de la selección.<br />
                <strong>Arrastrar</strong> en el fondo crea un rectángulo de selección.
              </p>
              <Button size="sm" variant="outline" className="w-full text-xs" onClick={groupSelected}>
                <Ungroup className="w-3 h-3 mr-1" /> Agrupar selección
              </Button>
              <Button size="sm" variant="outline" className="w-full text-xs" onClick={duplicateSelected}>
                <Copy className="w-3 h-3 mr-1" /> Duplicar selección
              </Button>
              <Button size="sm" variant="outline" className="w-full text-xs text-red-500 border-red-200 hover:bg-red-50" onClick={deleteSelected}>
                <Trash2 className="w-3 h-3 mr-1" /> Eliminar selección
              </Button>
              <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setSidePanel('templates')}>
                <Library className="w-3 h-3 mr-1" /> Guardar como plantilla
              </Button>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 p-3 overflow-auto">
          <LayoutCanvas
            elements={data.layout_elements || []}
            selectedId={selectedId}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onMultiSelect={handleMultiSelect}
            onUpdateElement={updateElement}
            onGroupSelected={groupSelected}
            width={data.canvas_width || 1200}
            height={data.canvas_height || 800}
          />
          <p className="text-xs text-slate-400 mt-1.5 text-center">
            Clic = seleccionar · Shift+clic = multiselección · Arrastrar fondo = selección rectangular · Arrastra esquina azul = redimensionar
          </p>
        </div>

        {/* Right panel – properties of single selected */}
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