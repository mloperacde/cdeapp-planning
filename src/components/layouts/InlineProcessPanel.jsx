/**
 * Compact inline process configurator for the right panel of the RoomLayoutEditor.
 * Allows placing operators on the layout and defining their actions.
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ChevronDown, ChevronUp, User, Zap, Save, GitBranch } from 'lucide-react';
import { toast } from 'sonner';

const OPERATOR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

function ActionRow({ action, onChange, onDelete }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded p-2 space-y-1.5 text-xs border border-slate-100 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <span className="font-medium text-slate-500">Acción #{action.order}</span>
        <button onClick={onDelete} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
      </div>
      <Input value={action.description || ''} onChange={e => onChange({ description: e.target.value })}
        placeholder="Descripción..." className="h-6 text-xs" />
      <div className="grid grid-cols-2 gap-1">
        <div>
          <span className="text-slate-400 text-[10px]">Frec/min</span>
          <Input type="number" min={0} step={0.5} value={action.frequency_per_minute || ''}
            onChange={e => onChange({ frequency_per_minute: parseFloat(e.target.value) || 0 })}
            className="h-6 text-xs" placeholder="0" />
        </div>
        <div>
          <span className="text-slate-400 text-[10px]">Dur (seg)</span>
          <Input type="number" min={0} step={1} value={action.duration_seconds || ''}
            onChange={e => onChange({ duration_seconds: parseFloat(e.target.value) || 0 })}
            className="h-6 text-xs" placeholder="0" />
        </div>
      </div>
      <textarea value={action.instructions || ''} onChange={e => onChange({ instructions: e.target.value })}
        className="w-full text-xs border border-input rounded p-1 h-12 resize-none bg-background text-foreground"
        placeholder="Instrucciones..." />
    </div>
  );
}

function OperatorCard({ operator, layoutElements, colorIndex, onChange, onDelete }) {
  const [open, setOpen] = useState(false);
  const color = operator.color || OPERATOR_COLORS[colorIndex % OPERATOR_COLORS.length];

  const addAction = () => {
    const actions = [...(operator.actions || [])];
    actions.push({ id: `act_${Date.now()}`, order: actions.length + 1, description: '', frequency_per_minute: 0, duration_seconds: 0 });
    onChange({ actions });
  };
  const updateAction = (id, changes) => onChange({ actions: (operator.actions || []).map(a => a.id === id ? { ...a, ...changes } : a) });
  const deleteAction = (id) => onChange({ actions: (operator.actions || []).filter(a => a.id !== id) });

  const totalFreq = (operator.actions || []).reduce((s, a) => s + (a.frequency_per_minute || 0), 0);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden mb-2">
      <div className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-accent/10"
        style={{ borderLeft: `3px solid ${color}` }} onClick={() => setOpen(!open)}>
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: color }}>
          <User className="w-2.5 h-2.5" />
        </div>
        <Input value={operator.operator_label || ''} onChange={e => { e.stopPropagation(); onChange({ operator_label: e.target.value }); }}
          onClick={e => e.stopPropagation()}
          placeholder="Operario..." className="h-5 text-xs border-0 p-0 bg-transparent focus-visible:ring-0 flex-1 font-medium" />
        <input type="color" value={color} onChange={e => onChange({ color: e.target.value })}
          onClick={e => e.stopPropagation()} className="w-4 h-4 rounded border-0 cursor-pointer flex-shrink-0" />
        <button onClick={e => { e.stopPropagation(); onDelete(); }} className="text-red-400 hover:text-red-600 ml-0.5 flex-shrink-0">
          <Trash2 className="w-3 h-3" />
        </button>
        {open ? <ChevronUp className="w-3 h-3 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />}
      </div>

      {open && (
        <div className="p-2 space-y-2 bg-white dark:bg-card text-xs">
          <div>
            <Label className="text-[10px]">Rol</Label>
            <Input value={operator.operator_role || ''} onChange={e => onChange({ operator_role: e.target.value })}
              className="h-6 text-xs" placeholder="Ej: Responsable de línea..." />
          </div>
          <div>
            <Label className="text-[10px]">Posición en layout</Label>
            <select value={operator.element_ref_id || ''} onChange={e => onChange({ element_ref_id: e.target.value })}
              className="w-full h-6 text-xs border border-input rounded px-1.5 bg-background">
              <option value="">-- Sin vincular --</option>
              {(layoutElements || []).map(el => (
                <option key={el.id} value={el.id}>{el.label || el.type}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Acciones ({(operator.actions || []).length})</span>
              <Button size="sm" variant="outline" onClick={addAction} className="h-5 text-[10px] px-1.5 gap-0.5">
                <Plus className="w-2.5 h-2.5" /> Añadir
              </Button>
            </div>
            <div className="space-y-1.5">
              {(operator.actions || []).map(act => (
                <ActionRow key={act.id} action={act}
                  onChange={c => updateAction(act.id, c)}
                  onDelete={() => deleteAction(act.id)} />
              ))}
              {!(operator.actions || []).length && (
                <p className="text-[10px] text-slate-400 text-center py-1">Sin acciones. Añade una.</p>
              )}
            </div>
          </div>

          {totalFreq > 0 && (
            <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 rounded px-2 py-1">
              <Zap className="w-3 h-3 text-blue-500" />
              <span className="text-[10px] text-blue-700 dark:text-blue-300">{totalFreq.toFixed(1)} acc/min total</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function InlineProcessPanel({ layoutId, layoutElements }) {
  const qc = useQueryClient();
  const [diagramId, setDiagramId] = useState(null);
  const [data, setData] = useState(null); // null = loading/selecting

  const { data: diagrams = [] } = useQuery({
    queryKey: ['ProcessDiagram', 'byLayout', layoutId],
    queryFn: () => base44.entities.ProcessDiagram.filter({ room_layout_id: layoutId }),
    enabled: !!layoutId,
  });

  const { data: processes = [] } = useQuery({
    queryKey: ['Process'],
    queryFn: () => base44.entities.Process.list('nombre'),
  });

  // Auto-select first diagram or show picker
  const [picked, setPicked] = useState(false);

  if (!picked && diagrams.length > 0 && !data) {
    setData(diagrams[0]);
    setDiagramId(diagrams[0].id);
    setPicked(true);
  }

  const saveMutation = useMutation({
    mutationFn: (d) => diagramId
      ? base44.entities.ProcessDiagram.update(diagramId, d)
      : base44.entities.ProcessDiagram.create({ ...d, room_layout_id: layoutId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['ProcessDiagram'] });
      if (!diagramId) { setDiagramId(res.id); }
      toast.success('Diagrama guardado');
    },
  });

  const addOperator = () => {
    const op = {
      id: `op_${Date.now()}`,
      operator_label: `Operario ${((data?.operator_assignments || []).length + 1)}`,
      operator_role: '',
      x: 100,
      y: 100,
      color: OPERATOR_COLORS[(data?.operator_assignments || []).length % OPERATOR_COLORS.length],
      element_ref_id: '',
      actions: [],
    };
    setData(d => ({ ...(d || {}), operator_assignments: [...((d?.operator_assignments) || []), op] }));
  };

  const updateOperator = useCallback((id, changes) => {
    setData(d => ({ ...d, operator_assignments: (d?.operator_assignments || []).map(op => op.id === id ? { ...op, ...changes } : op) }));
  }, []);

  const deleteOperator = useCallback((id) => {
    setData(d => ({ ...d, operator_assignments: (d?.operator_assignments || []).filter(op => op.id !== id) }));
  }, []);

  // No layoutId = not saved yet
  if (!layoutId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-3 py-8 text-slate-400 space-y-2">
        <GitBranch className="w-8 h-8 opacity-30" />
        <p className="text-xs">Guarda el layout primero para configurar el diagrama de proceso</p>
      </div>
    );
  }

  // Select or create diagram
  if (!data) {
    return (
      <div className="p-3 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Diagrama de Proceso</p>
        {diagrams.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Diagramas existentes</Label>
            {diagrams.map(d => (
              <button key={d.id} onClick={() => { setData(d); setDiagramId(d.id); setPicked(true); }}
                className="w-full text-left px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs text-slate-700 dark:text-slate-300">
                {d.name || 'Sin nombre'} <span className="text-slate-400">({(d.operator_assignments || []).length} op.)</span>
              </button>
            ))}
          </div>
        )}
        <Button size="sm" onClick={() => { setData({ name: '', operator_assignments: [], process_id: '', process_name: '', status: 'Borrador', version: 1 }); setPicked(true); }}
          className="w-full gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs">
          <Plus className="w-3 h-3" /> Nuevo diagrama
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-100 dark:border-border flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Proceso</p>
          <div className="flex gap-1">
            {diagrams.length > 0 && (
              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5 text-slate-500"
                onClick={() => { setData(null); setDiagramId(null); setPicked(false); }}>
                ← Cambiar
              </Button>
            )}
            <Button size="sm" onClick={() => saveMutation.mutate(data)} disabled={saveMutation.isPending}
              className="h-6 px-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] gap-0.5">
              <Save className="w-3 h-3" /> Guardar
            </Button>
          </div>
        </div>
        <Input value={data.name || ''} onChange={e => setData(d => ({ ...d, name: e.target.value }))}
          placeholder="Nombre del diagrama..." className="h-6 text-xs" />
        <select value={data.process_id || ''} onChange={e => {
          const p = processes.find(x => x.id === e.target.value);
          setData(d => ({ ...d, process_id: e.target.value, process_name: p?.nombre || '' }));
        }} className="w-full h-6 text-xs border border-input rounded px-1.5 bg-background">
          <option value="">-- Proceso --</option>
          {processes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      {/* Operators */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">
            Operarios ({(data.operator_assignments || []).length})
          </span>
          <Button size="sm" onClick={addOperator} className="h-5 text-[10px] px-1.5 gap-0.5 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-2.5 h-2.5" /> Añadir
          </Button>
        </div>

        {!(data.operator_assignments || []).length && (
          <div className="text-center py-6 text-slate-400">
            <User className="w-7 h-7 mx-auto mb-1 opacity-30" />
            <p className="text-[10px]">Añade operarios y define sus acciones</p>
          </div>
        )}

        {(data.operator_assignments || []).map((op, idx) => (
          <OperatorCard
            key={op.id}
            operator={op}
            layoutElements={layoutElements}
            colorIndex={idx}
            onChange={c => updateOperator(op.id, c)}
            onDelete={() => deleteOperator(op.id)}
          />
        ))}
      </div>
    </div>
  );
}