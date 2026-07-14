import { useMemo, useState } from 'react';
import { getElementConfig } from './ElementPalette';
import { Plus, X, RefreshCw, ClipboardList, Hash } from 'lucide-react';

// Genera un prefijo corto para la marca a partir del tipo o etiqueta
const typePrefix = (type, label) => {
  const cfg = getElementConfig(type);
  const base = (label || cfg?.label || type || 'EL').toUpperCase();
  const clean = base.replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'EL';
  return clean;
};

const validateCode = (val) => val.replace(/[^A-Za-z0-9\-_]/g, '').toUpperCase();

export default function ElementInventoryPanel({
  layoutElements = [],
  inventory = [],
  onChange,
  onHighlightElement,
}) {
  const [hoveredId, setHoveredId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // One inventory entry per layout element, numbered per type
  const autoInventory = useMemo(() => {
    const counters = {};
    return (layoutElements || []).map(el => {
      const cfg = getElementConfig(el.type);
      const key = el.type;
      counters[key] = (counters[key] || 0) + 1;
      const instance = counters[key];
      const prefix = typePrefix(el.type, el.label);
      return {
        element_type: el.type,
        label: el.label || cfg?.label || el.type,
        quantity: 1,
        auto_generated: true,
        instance_number: instance,
        marca: `${prefix}-${String(instance).padStart(2, '0')}`,
        source_element_id: el.id,
        notes: '',
      };
    });
  }, [layoutElements]);

  const mergedInventory = useMemo(() => {
    const manualItems = (inventory || []).filter(item => !item.auto_generated && !item.source_element_id);
    const overrides = {};
    (inventory || []).forEach(item => {
      if (item.auto_generated && item.source_element_id) {
        overrides[item.source_element_id] = item;
      }
    });
    const autoWithOverrides = autoInventory.map(item => {
      const ov = overrides[item.source_element_id];
      return ov ? { ...item, marca: ov.marca, notes: ov.notes || '' } : item;
    });
    return [...autoWithOverrides, ...manualItems];
  }, [autoInventory, inventory]);

  const totalElements = mergedInventory.length;

  const syncFromLayout = () => onChange(mergedInventory);

  const addManualItem = () => {
    onChange([...(inventory || []), {
      element_type: 'other',
      label: 'Nuevo elemento',
      quantity: 1,
      auto_generated: false,
      instance_number: 1,
      marca: '',
      notes: '',
    }]);
  };

  const updateItem = (index, changes) => {
    const updated = [...mergedInventory];
    updated[index] = { ...updated[index], ...changes };
    onChange(updated);
  };

  const removeItem = (index) => {
    const updated = [...mergedInventory];
    updated.splice(index, 1);
    onChange(updated);
  };

  const handleHover = (elementId) => {
    setHoveredId(elementId);
    onHighlightElement?.(elementId);
  };

  const handleHoverEnd = () => {
    setHoveredId(null);
    onHighlightElement?.(null);
  };

  return (
    <div className="flex flex-col h-full pt-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <ClipboardList className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {totalElements} elementos
          </span>
        </div>
        <div className="flex gap-0.5">
          <button onClick={syncFromLayout}
            className="p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500"
            title="Sincronizar desde layout">
            <RefreshCw className="w-3 h-3" />
          </button>
          <button onClick={addManualItem}
            className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"
            title="Añadir elemento manual">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 leading-tight flex-shrink-0 mt-0.5">
        Hover para resaltar en canvas. El código se muestra sobre cada elemento del gráfico.
      </p>

      {/* Grid compacto de códigos — sin scroll interno */}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-1 content-start mt-1 overflow-y-auto overflow-x-hidden pr-0.5">
        {mergedInventory.length === 0 && (
          <div className="col-span-2 text-center py-4 border border-dashed border-slate-200 dark:border-slate-600 rounded-lg">
            <ClipboardList className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
            <p className="text-[10px] text-slate-400">Sin elementos</p>
          </div>
        )}

        {mergedInventory.map((item, idx) => {
          const cfg = getElementConfig(item.element_type);
          const isHovered = hoveredId === item.source_element_id;
          const isEditing = editingId === item.source_element_id;
          return (
            <div
              key={item.source_element_id || `m-${idx}`}
              className={`group relative rounded-md border px-1 py-1 cursor-pointer transition-all ${
                isHovered
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700'
              }`}
              onMouseEnter={() => item.source_element_id && handleHover(item.source_element_id)}
              onMouseLeave={handleHoverEnd}
              onClick={() => item.source_element_id && handleHover(isHovered ? null : item.source_element_id)}
            >
              <div className="flex items-center gap-1">
                <span className="text-xs flex-shrink-0">{cfg?.icon || '📦'}</span>
                {item.auto_generated ? (
                  <span className="text-[9px] text-slate-400 flex-shrink-0">#{item.instance_number}</span>
                ) : (
                  <input
                    value={item.label}
                    onChange={e => { e.stopPropagation(); updateItem(idx, { label: e.target.value }); }}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 min-w-0 text-[9px] font-medium bg-transparent border-0 outline-none text-slate-600 dark:text-slate-400"
                  />
                )}
                {!item.auto_generated && (
                  <button onClick={(e) => { e.stopPropagation(); removeItem(idx); }}
                    className="p-0.5 rounded text-red-400 hover:text-red-600 flex-shrink-0">
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
              {/* Code — prominent, mono, always visible */}
              {isEditing && item.auto_generated ? (
                <div className="flex items-center gap-0.5 mt-0.5">
                  <Hash className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                  <input
                    autoFocus
                    value={item.marca || ''}
                    onChange={e => updateItem(idx, { marca: validateCode(e.target.value) })}
                    onClick={e => e.stopPropagation()}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingId(null); }}
                    placeholder="COD-01"
                    maxLength={12}
                    className="w-full text-[10px] font-mono font-bold border border-emerald-300 dark:border-emerald-700 rounded px-1 py-0.5 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 outline-none uppercase"
                  />
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); if (item.auto_generated) setEditingId(item.source_element_id); }}
                  className={`w-full flex items-center gap-0.5 mt-0.5 rounded px-1 py-0.5 ${
                    item.auto_generated ? 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : ''
                  }`}
                >
                  <Hash className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 tracking-tight truncate">
                    {item.marca || '—'}
                  </span>
                </button>
              )}
              {!item.auto_generated && (
                <input
                  value={item.marca || ''}
                  onChange={e => updateItem(idx, { marca: validateCode(e.target.value) })}
                  onClick={e => e.stopPropagation()}
                  placeholder="COD"
                  maxLength={12}
                  className="w-full mt-0.5 text-[10px] font-mono font-bold uppercase bg-transparent border-0 border-b border-dashed border-amber-300 dark:border-amber-700 outline-none text-amber-700 dark:text-amber-400 placeholder:text-slate-300"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}