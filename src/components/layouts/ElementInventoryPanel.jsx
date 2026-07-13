import { useMemo, useState } from 'react';
import { getElementConfig } from './ElementPalette';
import { Plus, X, RefreshCw, ClipboardList, ChevronDown, ChevronRight, Hash } from 'lucide-react';

// Genera un prefijo corto para la marca a partir del tipo o etiqueta
const typePrefix = (type, label) => {
  const cfg = getElementConfig(type);
  const base = (label || cfg?.label || type || 'EL').toUpperCase();
  const clean = base.replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'EL';
  return clean;
};

export default function ElementInventoryPanel({
  layoutElements = [],
  inventory = [],
  onChange,
  onHighlightElement,   // (elementId | null) => void — hover sync with canvas
}) {
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [hoveredId, setHoveredId] = useState(null);

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

  // Summary by type
  const typeSummary = useMemo(() => {
    const map = {};
    autoInventory.forEach(item => {
      if (!map[item.element_type]) {
        map[item.element_type] = { element_type: item.element_type, label: item.label, count: 0 };
      }
      map[item.element_type].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [autoInventory]);

  // Merge: auto items with persisted overrides + manual items
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

  const totalElements = autoInventory.length + mergedInventory.filter(i => !i.auto_generated).length;

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

  const toggleGroup = (type) => {
    setCollapsedGroups(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleHover = (elementId) => {
    setHoveredId(elementId);
    onHighlightElement?.(elementId);
  };

  const handleHoverEnd = () => {
    setHoveredId(null);
    onHighlightElement?.(null);
  };

  // Group auto items by type
  const autoItems = mergedInventory.filter(i => i.auto_generated);
  const manualItems = mergedInventory.filter(i => !i.auto_generated);
  const autoByType = {};
  autoItems.forEach(item => {
    if (!autoByType[item.element_type]) autoByType[item.element_type] = { label: item.label, items: [] };
    autoByType[item.element_type].items.push(item);
  });
  const autoGroups = Object.entries(autoByType);

  const findIndex = (item) => mergedInventory.findIndex(m =>
    (item.source_element_id && m.source_element_id === item.source_element_id && m.auto_generated)
    || (!item.auto_generated && !m.auto_generated && m.label === item.label && m.marca === item.marca)
  );

  // Validate code: alphanumeric + hyphens/underscores only
  const validateCode = (val) => val.replace(/[^A-Za-z0-9\-_]/g, '').toUpperCase();

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ClipboardList className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Inventario ({typeSummary.length} tipos · {totalElements} ud)
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

      <p className="text-[10px] text-slate-400 leading-tight">
        Pasa el ratón sobre un elemento para resaltarlo en el canvas. El código (ej: <span className="font-mono">MESA-01</span>) se muestra sobre el gráfico.
      </p>

      <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded px-2 py-1">
        Total: <span className="font-bold text-slate-700 dark:text-slate-300">{totalElements}</span> elementos
      </div>

      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
        {mergedInventory.length === 0 && (
          <div className="text-center py-3 border border-dashed border-slate-200 dark:border-slate-600 rounded-lg">
            <ClipboardList className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
            <p className="text-[10px] text-slate-400">Sin elementos en el inventario</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Añade elementos al layout o pulsa +</p>
          </div>
        )}

        {/* Auto groups by type */}
        {autoGroups.map(([type, group]) => {
          const cfg = getElementConfig(type);
          const collapsed = collapsedGroups[type];
          return (
            <div key={type} className="rounded-lg border border-emerald-100 dark:border-emerald-800/30 bg-emerald-50/40 dark:bg-emerald-900/10 overflow-hidden">
              <button onClick={() => toggleGroup(type)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                {collapsed ? <ChevronRight className="w-3 h-3 text-emerald-500" /> : <ChevronDown className="w-3 h-3 text-emerald-500" />}
                <span className="text-sm flex-shrink-0">{cfg?.icon || '📦'}</span>
                <span className="flex-1 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                  {group.label}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 rounded px-1.5 py-0.5">
                  {group.items.length} ud
                </span>
              </button>
              {!collapsed && (
                <div className="px-1.5 pb-1.5 space-y-1">
                  {group.items.map((item) => {
                    const globalIdx = findIndex(item);
                    const isHovered = hoveredId === item.source_element_id;
                    return (
                      <div
                        key={item.source_element_id || item.label}
                        className={`flex items-center gap-1 rounded border px-1.5 py-1 cursor-pointer transition-colors ${
                          isHovered
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                            : 'bg-white dark:bg-slate-800/60 border-slate-100 dark:border-slate-700'
                        }`}
                        onMouseEnter={() => handleHover(item.source_element_id)}
                        onMouseLeave={handleHoverEnd}
                        onClick={() => handleHover(isHovered ? null : item.source_element_id)}
                      >
                        <span className="text-[10px] font-mono text-slate-400 w-5 flex-shrink-0">#{item.instance_number}</span>
                        {/* Code field — alphanumeric only */}
                        <div className="flex items-center gap-0.5 flex-1 min-w-0">
                          <Hash className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                          <input
                            value={item.marca || ''}
                            onChange={e => updateItem(globalIdx, { marca: validateCode(e.target.value) })}
                            onClick={e => e.stopPropagation()}
                            placeholder="COD-01"
                            maxLength={12}
                            className="flex-1 min-w-0 text-[11px] font-mono font-semibold border border-emerald-200 dark:border-emerald-800/40 rounded px-1 py-0.5 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 outline-none focus:border-emerald-400 uppercase"
                          />
                        </div>
                        <input
                          value={item.notes || ''}
                          onChange={e => updateItem(globalIdx, { notes: e.target.value })}
                          onClick={e => e.stopPropagation()}
                          placeholder="Notas"
                          className="w-16 min-w-0 text-[10px] bg-transparent border-0 border-b border-dashed border-slate-200 dark:border-slate-600 outline-none text-slate-500 dark:text-slate-400 placeholder:text-slate-300"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Manual items */}
        {manualItems.map((item, idx) => {
          const cfg = getElementConfig(item.element_type);
          const globalIdx = mergedInventory.findIndex(m => !m.auto_generated && m === item);
          return (
            <div key={`manual-${idx}`}
              className="rounded-lg border p-1.5 bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30">
              <div className="flex items-center gap-1.5">
                <span className="text-sm flex-shrink-0">{cfg?.icon || '📦'}</span>
                <input
                  value={item.label}
                  onChange={e => updateItem(globalIdx, { label: e.target.value })}
                  className="flex-1 min-w-0 text-xs font-medium bg-transparent border-0 outline-none text-slate-700 dark:text-slate-300"
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={e => updateItem(globalIdx, { quantity: Math.max(1, +e.target.value) })}
                  className="w-10 text-xs text-center border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  min="1"
                />
                <span className="text-[9px] text-slate-400">ud</span>
                <button onClick={() => removeItem(globalIdx)}
                  className="p-0.5 rounded text-red-400 hover:text-red-600 flex-shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                <Hash className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                <input
                  value={item.marca || ''}
                  onChange={e => updateItem(globalIdx, { marca: validateCode(e.target.value) })}
                  placeholder="COD-01"
                  maxLength={12}
                  className="flex-1 text-[10px] font-mono uppercase bg-transparent border-0 border-b border-dashed border-amber-200 dark:border-amber-700 outline-none text-amber-700 dark:text-amber-400 placeholder:text-slate-300"
                />
              </div>
              <input
                value={item.notes || ''}
                onChange={e => updateItem(globalIdx, { notes: e.target.value })}
                placeholder="Notas..."
                className="w-full text-[10px] mt-1 bg-transparent border-0 border-b border-dashed border-slate-200 dark:border-slate-600 outline-none text-slate-500 dark:text-slate-400 placeholder:text-slate-300"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}