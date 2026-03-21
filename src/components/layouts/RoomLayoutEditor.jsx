import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, Save, Settings, Layers, Library, Copy, Ungroup, Trash2,
  PenTool, GitBranch, Clipboard, Box
} from 'lucide-react';
import { toast } from 'sonner';
import ElementPalette from './ElementPalette';
import LayoutCanvas from './LayoutCanvas';
import ElementPropertiesPanel from './ElementPropertiesPanel';
import LayoutTemplateLibrary from './LayoutTemplateLibrary';
import InlineProcessPanel from './InlineProcessPanel';
import Layout3DView from './Layout3DView';

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
    room_polygon: [],
    floor_color: '#475569',
  });
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sidePanel, setSidePanel] = useState('palette');
  const [rightPanel, setRightPanel] = useState('process'); // 'process' | 'props'
  const [loaded, setLoaded] = useState(false);
  const [drawingRoom, setDrawingRoom] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const clipboard = useRef([]); // copy/paste buffer

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

  // ── Element operations ────────────────────────────────────────────────────
  const addElement = (elConfig) => {
    const el = {
      id: `el_${Date.now()}`,
      type: elConfig.type,
      label: elConfig.label,
      color: elConfig.color,
      x: 60, y: 60,
      width: elConfig.defaultW,
      height: elConfig.defaultH,
      rotation: 0,
      stations: [],
    };
    setData(prev => ({ ...prev, layout_elements: [...(prev.layout_elements || []), el] }));
    setSelectedId(el.id);
    setSelectedIds([]);
    setSidePanel('palette');
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

  const deleteSelected = () => {
    const toRemove = new Set(selectedIds.length > 1 ? selectedIds : selectedId ? [selectedId] : []);
    if (!toRemove.size) return;
    setData(prev => ({ ...prev, layout_elements: (prev.layout_elements || []).filter(e => !toRemove.has(e.id)) }));
    setSelectedId(null);
    setSelectedIds([]);
    toast.success(`${toRemove.size} elemento(s) eliminado(s)`);
  };

  // ── Copy / Paste ──────────────────────────────────────────────────────────
  const copySelected = () => {
    const ids = selectedIds.length > 1 ? selectedIds : selectedId ? [selectedId] : [];
    if (!ids.length) return;
    clipboard.current = (data.layout_elements || []).filter(e => ids.includes(e.id));
    toast.success(`${clipboard.current.length} elemento(s) copiado(s)`);
  };

  const pasteClipboard = () => {
    if (!clipboard.current.length) return;
    const copies = clipboard.current.map(e => ({
      ...e,
      id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: e.x + 20,
      y: e.y + 20,
    }));
    setData(prev => ({ ...prev, layout_elements: [...(prev.layout_elements || []), ...copies] }));
    setSelectedIds(copies.map(c => c.id));
    setSelectedId(null);
    toast.success(`${copies.length} elemento(s) pegado(s)`);
  };

  // ── Duplicate ─────────────────────────────────────────────────────────────
  const duplicateSelected = () => {
    const ids = selectedIds.length > 1 ? selectedIds : selectedId ? [selectedId] : [];
    if (!ids.length) return;
    const copies = (data.layout_elements || []).filter(e => ids.includes(e.id)).map(e => ({
      ...e,
      id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: e.x + 20, y: e.y + 20,
    }));
    setData(prev => ({ ...prev, layout_elements: [...(prev.layout_elements || []), ...copies] }));
    toast.success(`${copies.length} elemento(s) duplicado(s)`);
  };

  // ── Group ─────────────────────────────────────────────────────────────────
  const groupSelected = () => {
    if (selectedIds.length < 2) { toast.error('Selecciona al menos 2 elementos'); return; }
    const toGroup = (data.layout_elements || []).filter(e => selectedIds.includes(e.id));
    const minX = Math.min(...toGroup.map(e => e.x));
    const minY = Math.min(...toGroup.map(e => e.y));
    const maxX = Math.max(...toGroup.map(e => e.x + e.width));
    const maxY = Math.max(...toGroup.map(e => e.y + e.height));
    const grouped = {
      id: `el_${Date.now()}`, type: 'machine', label: 'Grupo', color: '#6366F1',
      x: minX, y: minY, width: maxX - minX, height: maxY - minY, rotation: 0,
      stations: toGroup.map(e => ({
        id: e.id, name: e.label || e.type,
        x_offset: e.x - minX, y_offset: e.y - minY,
        width: e.width, height: e.height,
      })),
    };
    setData(prev => ({
      ...prev,
      layout_elements: [...(prev.layout_elements || []).filter(e => !selectedIds.includes(e.id)), grouped],
    }));
    setSelectedId(grouped.id);
    setSelectedIds([]);
    toast.success(`${toGroup.length} elementos agrupados`);
  };

  // ── Templates ─────────────────────────────────────────────────────────────
  const insertTemplate = (elements) => {
    setData(prev => ({ ...prev, layout_elements: [...(prev.layout_elements || []), ...elements] }));
    setSelectedIds(elements.map(e => e.id));
    setSelectedId(null);
  };

  // ── Room polygon ──────────────────────────────────────────────────────────
  const handleRoomPolygonChange = (pts) => {
    setData(prev => ({ ...prev, room_polygon: pts }));
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); copySelected(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); pasteClipboard(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); duplicateSelected(); }
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      if (e.key === 'Escape') { setDrawingRoom(false); setSelectedId(null); setSelectedIds([]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const selectedElement = (data.layout_elements || []).find(e => e.id === selectedId);
  const activeMultiCount = selectedIds.length;

  const handleSelect = (id) => {
    setSelectedId(id);
    if (id) {
      setSelectedIds([]);
      setRightPanel('props');
    }
  };

  const handleMultiSelect = (ids) => {
    setSelectedIds(ids);
    if (ids.length > 0) setSelectedId(null);
  };

  const LEFT_TABS = [
    { key: 'palette',   label: 'Elementos', Icon: Layers },
    { key: 'templates', label: 'Plantillas', Icon: Library },
    { key: 'settings',  label: 'Config',    Icon: Settings },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-background overflow-hidden">
      {show3D && (
        <Layout3DView
          elements={data.layout_elements || []}
          roomPolygon={data.room_polygon || []}
          canvasWidth={data.canvas_width || 1200}
          canvasHeight={data.canvas_height || 800}
          onClose={() => setShow3D(false)}
        />
      )}
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-card border-b border-slate-200 dark:border-border shadow-sm flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 h-7 text-xs">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver
        </Button>
        <div className="flex-1 min-w-0">
          <Input value={data.name} onChange={e => setData(d => ({ ...d, name: e.target.value }))}
            placeholder="Nombre del layout..."
            className="h-7 font-semibold border-0 bg-transparent text-slate-900 dark:text-white text-sm p-0 focus-visible:ring-0" />
        </div>

        {/* Action toolbar */}
        <div className="flex items-center gap-1 border border-slate-200 dark:border-border rounded-lg px-1.5 py-0.5">
          <button onClick={copySelected} title="Copiar (Ctrl+C)" className="p-1 hover:bg-slate-100 dark:hover:bg-accent/10 rounded text-slate-500 hover:text-slate-700">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={pasteClipboard} title="Pegar (Ctrl+V)" className="p-1 hover:bg-slate-100 dark:hover:bg-accent/10 rounded text-slate-500 hover:text-slate-700">
            <Clipboard className="w-3.5 h-3.5" />
          </button>
          <button onClick={groupSelected} title="Agrupar selección" disabled={activeMultiCount < 2}
            className="p-1 hover:bg-slate-100 dark:hover:bg-accent/10 rounded text-slate-500 hover:text-slate-700 disabled:opacity-30">
            <Ungroup className="w-3.5 h-3.5" />
          </button>
          <button onClick={deleteSelected} title="Eliminar (Delete)"
            className="p-1 hover:bg-slate-100 dark:hover:bg-accent/10 rounded text-red-400 hover:text-red-600">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-border mx-0.5" />
          <button
            onClick={() => setDrawingRoom(d => !d)}
            title="Dibujar contorno de sala"
            className={`p-1 rounded flex items-center gap-1 text-xs ${drawingRoom ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 dark:hover:bg-accent/10 text-slate-500'}`}
          >
            <PenTool className="w-3.5 h-3.5" />
          </button>
          {drawingRoom && (
            <button onClick={() => { setData(d => ({ ...d, room_polygon: [] })); }} title="Borrar contorno"
              className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 text-xs">
              ✕
            </button>
          )}
          <div className="w-px h-4 bg-slate-200 dark:bg-border mx-0.5" />
          <button onClick={() => setShow3D(true)} title="Ver en 3D"
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-accent/10 text-slate-500 hover:text-indigo-600 flex items-center gap-1 text-xs font-medium">
            <Box className="w-3.5 h-3.5" /> 3D
          </button>
        </div>

        {activeMultiCount > 1 && (
          <span className="text-xs text-blue-600 font-medium bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-2 py-0.5">
            {activeMultiCount} sel.
          </span>
        )}

        <select value={data.status} onChange={e => setData(d => ({ ...d, status: e.target.value }))}
          className="h-7 text-xs border border-input rounded-md px-2 bg-background">
          {['Borrador', 'Aprobado', 'Archivado'].map(s => <option key={s}>{s}</option>)}
        </select>
        <Button size="sm" onClick={() => saveMutation.mutate(data)} disabled={saveMutation.isPending}
          className="gap-1 bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs">
          <Save className="w-3.5 h-3.5" /> Guardar
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <div className="w-48 flex-shrink-0 p-2 border-r border-slate-200 dark:border-border bg-white dark:bg-card space-y-1 overflow-hidden flex flex-col">
          <div className="flex gap-0.5 flex-shrink-0">
            {LEFT_TABS.map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setSidePanel(key)}
                className={`flex-1 flex flex-col items-center gap-0.5 text-xs py-1 rounded transition-colors ${
                  sidePanel === key ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-accent/10'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[10px] leading-tight">{label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {sidePanel === 'palette' && <ElementPalette onAdd={addElement} />}

            {sidePanel === 'templates' && (
              <LayoutTemplateLibrary
                selectedElements={(data.layout_elements || []).filter(e => selectedIds.includes(e.id) || e.id === selectedId)}
                onInsertTemplate={insertTemplate}
              />
            )}

            {sidePanel === 'settings' && (
              <div className="space-y-3 pt-1">
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
                  <div><Label className="text-xs">Ancho</Label><Input type="number" value={data.canvas_width} onChange={e => setData(d => ({ ...d, canvas_width: +e.target.value }))} className="h-7 text-sm" /></div>
                  <div><Label className="text-xs">Alto</Label><Input type="number" value={data.canvas_height} onChange={e => setData(d => ({ ...d, canvas_height: +e.target.value }))} className="h-7 text-sm" /></div>
                </div>
                <div>
                  <Label className="text-xs">Color del suelo</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={data.floor_color || '#475569'}
                      onChange={e => setData(d => ({ ...d, floor_color: e.target.value }))}
                      className="h-7 w-10 rounded border border-input cursor-pointer" />
                    <span className="text-xs text-slate-500 font-mono">{data.floor_color || '#475569'}</span>
                    <button onClick={() => setData(d => ({ ...d, floor_color: '#475569' }))}
                      className="text-xs text-blue-500 hover:underline">Reset</button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">{(data.layout_elements || []).length} elementos · {(data.room_polygon || []).length} puntos sala</p>
              </div>
            )}
          </div>

        </div>

        {/* CANVAS */}
        <div className="flex-1 overflow-hidden min-w-0 flex flex-col">
          <LayoutCanvas
            elements={data.layout_elements || []}
            selectedId={selectedId}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onMultiSelect={handleMultiSelect}
            onUpdateElement={updateElement}
            onGroupSelected={groupSelected}
            roomPolygon={data.room_polygon || []}
            onRoomPolygonChange={handleRoomPolygonChange}
            drawingRoom={drawingRoom}
            floorColor={data.floor_color || '#475569'}
            width={data.canvas_width || 1200}
            height={data.canvas_height || 800}
          />
          <p className="text-xs text-slate-400 mt-1 text-center flex-shrink-0 pb-1">
            Clic=selec · Shift+clic=multi · Arrastrar=rect.selección · Ctrl+scroll=zoom · Ctrl+C/V=copiar/pegar · Del=borrar
          </p>
        </div>

        {/* RIGHT PANEL – Process configurator */}
        <div className="w-56 flex-shrink-0 border-l border-slate-200 dark:border-border bg-white dark:bg-card flex flex-col overflow-hidden">
          {/* Right panel tabs */}
          <div className="flex border-b border-slate-100 dark:border-border flex-shrink-0">
            <button onClick={() => setRightPanel('process')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium transition-colors ${rightPanel === 'process' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <GitBranch className="w-3 h-3" /> Proceso
            </button>
            <button onClick={() => setRightPanel('props')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium transition-colors ${rightPanel === 'props' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <Layers className="w-3 h-3" /> Propiedades
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {rightPanel === 'process' && (
              <InlineProcessPanel
                layoutId={isNew ? null : layoutId}
                layoutElements={data.layout_elements || []}
              />
            )}
            {rightPanel === 'props' && (
              <div className="p-2 overflow-y-auto h-full">
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
      </div>
    </div>
  );
}