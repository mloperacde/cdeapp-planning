/**
 * Library for saving and loading element groups/templates across layouts.
 * Templates are stored in localStorage for simplicity (no extra entity needed).
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'room_layout_templates_v1';

export function getTemplates() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveTemplates(tpls) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tpls));
}

export default function LayoutTemplateLibrary({ selectedElements, onInsertTemplate }) {
  const [templates, setTemplates] = useState(getTemplates);
  const [name, setName] = useState('');

  const saveTemplate = () => {
    if (!name.trim()) { toast.error('Escribe un nombre para la plantilla'); return; }
    if (!selectedElements?.length) { toast.error('Selecciona elementos para guardar como plantilla'); return; }

    // Normalize positions relative to bounding box top-left
    const minX = Math.min(...selectedElements.map(e => e.x));
    const minY = Math.min(...selectedElements.map(e => e.y));
    const normalized = selectedElements.map(e => ({ ...e, x: e.x - minX, y: e.y - minY }));

    const tpl = {
      id: `tpl_${Date.now()}`,
      name: name.trim(),
      elements: normalized,
      count: normalized.length,
      createdAt: new Date().toISOString(),
    };
    const updated = [tpl, ...templates];
    saveTemplates(updated);
    setTemplates(updated);
    setName('');
    toast.success(`Plantilla "${tpl.name}" guardada (${tpl.count} elementos)`);
  };

  const deleteTemplate = (id) => {
    const updated = templates.filter(t => t.id !== id);
    saveTemplates(updated);
    setTemplates(updated);
    toast.success('Plantilla eliminada');
  };

  const insertTemplate = (tpl) => {
    // Offset slightly so it doesn't overlap exactly
    const offset = 20;
    const elements = tpl.elements.map(e => ({
      ...e,
      id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: e.x + offset,
      y: e.y + offset,
    }));
    onInsertTemplate(elements);
    toast.success(`Plantilla "${tpl.name}" insertada`);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        Plantillas reutilizables
      </p>

      {/* Save selected as template */}
      <div className="space-y-1">
        <p className="text-xs text-slate-500">
          {selectedElements?.length
            ? `${selectedElements.length} elemento(s) seleccionados`
            : 'Selecciona elementos en el canvas para guardar como plantilla'}
        </p>
        <div className="flex gap-1">
          <Input
            placeholder="Nombre de la plantilla..."
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveTemplate()}
            className="h-7 text-xs flex-1"
          />
          <Button
            size="sm"
            onClick={saveTemplate}
            disabled={!selectedElements?.length}
            className="h-7 px-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Template list */}
      {templates.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3">No hay plantillas guardadas</p>
      ) : (
        <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
          {templates.map(tpl => (
            <div
              key={tpl.id}
              className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded-lg px-2 py-1.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{tpl.name}</p>
                <p className="text-xs text-slate-400">{tpl.count} elementos</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                onClick={() => insertTemplate(tpl)}
                title="Insertar en el layout"
              >
                <Download className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                onClick={() => deleteTemplate(tpl.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}