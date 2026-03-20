import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Plus, Trash2, ChevronDown, ChevronUp, User, Zap } from 'lucide-react';
import { toast } from 'sonner';
import OperatorCanvas from './OperatorCanvas';

const OPERATOR_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16'];

function ActionEditor({ action, onChange, onDelete }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-2 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">Acción #{action.order}</span>
        <button onClick={onDelete} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      <div>
        <Label className="text-xs">Descripción de la acción *</Label>
        <Input value={action.description || ''} onChange={e => onChange({ description: e.target.value })} className="h-7 text-sm" placeholder="Ej: Colocar frasco en cinta..." />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Frec./minuto</Label>
          <Input type="number" min={0} step={0.5} value={action.frequency_per_minute || ''} onChange={e => onChange({ frequency_per_minute: parseFloat(e.target.value) || 0 })} className="h-7 text-sm" placeholder="0" />
        </div>
        <div>
          <Label className="text-xs">Duración (seg)</Label>
          <Input type="number" min={0} step={1} value={action.duration_seconds || ''} onChange={e => onChange({ duration_seconds: parseFloat(e.target.value) || 0 })} className="h-7 text-sm" placeholder="0" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Instrucciones</Label>
        <textarea value={action.instructions || ''} onChange={e => onChange({ instructions: e.target.value })}
          className="w-full text-xs border border-input rounded-md p-1.5 h-16 resize-none bg-background text-foreground" placeholder="Instrucciones detalladas..." />
      </div>
      <div>
        <Label className="text-xs">Notas de seguridad</Label>
        <Input value={action.safety_notes || ''} onChange={e => onChange({ safety_notes: e.target.value })} className="h-7 text-xs" placeholder="EPI, riesgos..." />
      </div>
    </div>
  );
}

function OperatorPanel({ operator, layoutElements, colorIndex, onChange, onDelete }) {
  const [expanded, setExpanded] = useState(true);

  const addAction = () => {
    const actions = [...(operator.actions || [])];
    actions.push({ id: `act_${Date.now()}`, order: actions.length + 1, description: '', frequency_per_minute: 0, duration_seconds: 0 });
    onChange({ actions });
  };

  const updateAction = (actId, changes) => {
    onChange({ actions: (operator.actions || []).map(a => a.id === actId ? { ...a, ...changes } : a) });
  };

  const deleteAction = (actId) => {
    onChange({ actions: (operator.actions || []).filter(a => a.id !== actId) });
  };

  const color = operator.color || OPERATOR_COLORS[colorIndex % OPERATOR_COLORS.length];

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-accent/10"
        style={{ borderLeft: `4px solid ${color}` }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: color }}>
          <User className="w-3 h-3" />
        </div>
        <div className="flex-1 min-w-0">
          <Input
            value={operator.operator_label || ''}
            onChange={e => { e.stopPropagation(); onChange({ operator_label: e.target.value }); }}
            onClick={e => e.stopPropagation()}
            placeholder="Ej: Operario 1..."
            className="h-6 text-sm font-semibold border-0 p-0 bg-transparent focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center gap-1">
          <input type="color" value={color} onChange={e => onChange({ color: e.target.value })}
            onClick={e => e.stopPropagation()} className="w-5 h-5 rounded border-0 cursor-pointer" />
          <button onClick={e => { e.stopPropagation(); onDelete(); }} className="text-red-400 hover:text-red-600 ml-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="p-3 space-y-3 bg-white dark:bg-card">
          <div>
            <Label className="text-xs">Rol</Label>
            <Input value={operator.operator_role || ''} onChange={e => onChange({ operator_role: e.target.value })} className="h-7 text-sm" placeholder="Ej: Responsable de línea..." />
          </div>

          <div>
            <Label className="text-xs">Elemento del layout</Label>
            <select
              value={operator.element_ref_id || ''}
              onChange={e => onChange({ element_ref_id: e.target.value })}
              className="w-full h-7 text-sm border border-input rounded-md px-2 bg-background"
            >
              <option value="">-- Sin vincular --</option>
              {(layoutElements || []).map(el => (
                <option key={el.id} value={el.id}>{el.label || el.type} ({el.type})</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold">Acciones ({(operator.actions || []).length})</Label>
              <Button size="sm" variant="outline" onClick={addAction} className="h-6 text-xs gap-1">
                <Plus className="w-3 h-3" /> Añadir
              </Button>
            </div>
            <div className="space-y-2">
              {(operator.actions || []).map(act => (
                <ActionEditor
                  key={act.id}
                  action={act}
                  onChange={changes => updateAction(act.id, changes)}
                  onDelete={() => deleteAction(act.id)}
                />
              ))}
              {(operator.actions || []).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">Sin acciones definidas</p>
              )}
            </div>
          </div>

          {/* Stats */}
          {(operator.actions || []).some(a => a.frequency_per_minute > 0) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs text-blue-700 dark:text-blue-300">
                Capacidad total: {(operator.actions || []).reduce((s, a) => s + (a.frequency_per_minute || 0), 0).toFixed(1)} acciones/min
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProcessDiagramEditor({ diagramId, layouts, onBack }) {
  const qc = useQueryClient();
  const isNew = !diagramId;

  const [data, setData] = useState({
    name: '',
    description: '',
    room_layout_id: '',
    room_layout_name: '',
    process_id: '',
    process_name: '',
    operator_assignments: [],
    status: 'Borrador',
    version: 1,
    notes: '',
  });
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('operators'); // 'operators' | 'canvas' | 'settings'

  const { data: processes = [] } = useQuery({
    queryKey: ['Process'],
    queryFn: () => base44.entities.Process.list('nombre'),
  });

  // Load selected layout elements
  const selectedLayout = layouts?.find(l => l.id === data.room_layout_id);
  const layoutElements = selectedLayout?.layout_elements || [];

  useQuery({
    queryKey: ['ProcessDiagram', diagramId],
    queryFn: () => base44.entities.ProcessDiagram.filter({ id: diagramId }),
    enabled: !isNew && !loaded,
    onSuccess: (res) => {
      if (res?.[0]) { setData(res[0]); setLoaded(true); }
    },
  });

  const saveMutation = useMutation({
    mutationFn: (d) => isNew ? base44.entities.ProcessDiagram.create(d) : base44.entities.ProcessDiagram.update(diagramId, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ProcessDiagram'] });
      toast.success('Diagrama guardado correctamente');
      if (isNew) onBack();
    },
  });

  const addOperator = () => {
    const op = {
      id: `op_${Date.now()}`,
      operator_label: `Operario ${(data.operator_assignments || []).length + 1}`,
      operator_role: '',
      x: 100 + (data.operator_assignments || []).length * 60,
      y: 100,
      color: OPERATOR_COLORS[(data.operator_assignments || []).length % OPERATOR_COLORS.length],
      element_ref_id: '',
      station_id: '',
      actions: [],
    };
    setData(prev => ({ ...prev, operator_assignments: [...(prev.operator_assignments || []), op] }));
  };

  const updateOperator = useCallback((id, changes) => {
    setData(prev => ({
      ...prev,
      operator_assignments: (prev.operator_assignments || []).map(op => op.id === id ? { ...op, ...changes } : op),
    }));
  }, []);

  const deleteOperator = useCallback((id) => {
    setData(prev => ({ ...prev, operator_assignments: (prev.operator_assignments || []).filter(op => op.id !== id) }));
  }, []);

  const handleLayoutChange = (layoutId) => {
    const layout = layouts?.find(l => l.id === layoutId);
    setData(d => ({ ...d, room_layout_id: layoutId, room_layout_name: layout?.name || '' }));
  };

  const handleProcessChange = (processId) => {
    const proc = processes?.find(p => p.id === processId);
    setData(d => ({ ...d, process_id: processId, process_name: proc?.nombre || '' }));
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
            placeholder="Nombre del diagrama de proceso..."
            className="h-8 font-semibold border-0 bg-transparent text-slate-900 dark:text-white text-base p-0 focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <select value={data.status} onChange={e => setData(d => ({ ...d, status: e.target.value }))}
            className="h-8 text-xs border border-input rounded-md px-2 bg-background">
            {['Borrador','En Revisión','Aprobado','Obsoleto'].map(s => <option key={s}>{s}</option>)}
          </select>
          <Button size="sm" onClick={() => saveMutation.mutate(data)} disabled={saveMutation.isPending} className="gap-1 bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="w-4 h-4" /> Guardar
          </Button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-0 border-b border-slate-200 dark:border-border bg-white dark:bg-card px-4 flex-shrink-0">
        {[['operators','Operarios y Acciones'],['canvas','Vista en Layout'],['settings','Configuración']].map(([key,label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4">

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-xl space-y-4">
            <div>
              <Label>Layout de sala vinculado *</Label>
              <select value={data.room_layout_id} onChange={e => handleLayoutChange(e.target.value)}
                className="w-full h-9 text-sm border border-input rounded-md px-3 bg-background mt-1">
                <option value="">-- Seleccionar layout --</option>
                {(layouts || []).map(l => <option key={l.id} value={l.id}>{l.name} ({l.room_name})</option>)}
              </select>
            </div>
            <div>
              <Label>Proceso vinculado *</Label>
              <select value={data.process_id} onChange={e => handleProcessChange(e.target.value)}
                className="w-full h-9 text-sm border border-input rounded-md px-3 bg-background mt-1">
                <option value="">-- Seleccionar proceso --</option>
                {processes.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>)}
              </select>
            </div>
            <div>
              <Label>Descripción</Label>
              <textarea value={data.description || ''} onChange={e => setData(d => ({ ...d, description: e.target.value }))}
                className="w-full text-sm border border-input rounded-md p-2 h-24 resize-none bg-background text-foreground mt-1" placeholder="Descripción del diagrama..." />
            </div>
            <div>
              <Label>Versión</Label>
              <Input type="number" min={1} value={data.version || 1} onChange={e => setData(d => ({ ...d, version: +e.target.value }))} className="h-9 w-24 mt-1" />
            </div>
            <div>
              <Label>Notas adicionales</Label>
              <textarea value={data.notes || ''} onChange={e => setData(d => ({ ...d, notes: e.target.value }))}
                className="w-full text-sm border border-input rounded-md p-2 h-20 resize-none bg-background text-foreground mt-1" placeholder="Notas..." />
            </div>
          </div>
        )}

        {/* Operators Tab */}
        {activeTab === 'operators' && (
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {(data.operator_assignments || []).length} operario(s) definido(s)
              </p>
              <Button onClick={addOperator} size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4" /> Añadir Operario
              </Button>
            </div>
            {(data.operator_assignments || []).length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No hay operarios definidos. Añade el primero.</p>
              </div>
            )}
            {(data.operator_assignments || []).map((op, idx) => (
              <OperatorPanel
                key={op.id}
                operator={op}
                layoutElements={layoutElements}
                colorIndex={idx}
                onChange={changes => updateOperator(op.id, changes)}
                onDelete={() => deleteOperator(op.id)}
              />
            ))}
          </div>
        )}

        {/* Canvas Tab */}
        {activeTab === 'canvas' && (
          <OperatorCanvas
            operators={data.operator_assignments || []}
            layoutElements={layoutElements}
            canvasWidth={selectedLayout?.canvas_width || 1200}
            canvasHeight={selectedLayout?.canvas_height || 800}
            onMoveOperator={(id, x, y) => updateOperator(id, { x, y })}
          />
        )}
      </div>
    </div>
  );
}