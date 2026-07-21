import { useMemo, useState } from 'react';
import { getElementConfig } from './ElementPalette';
import { Plus, X, RefreshCw, ClipboardList, Hash, ChevronDown, ChevronRight, Ruler } from 'lucide-react';

// Genera un prefijo corto para la marca a partir del tipo o etiqueta
const typePrefix = (type, label) => {
  const cfg = getElementConfig(type);
  const base = (label || cfg?.label || type || 'EL').toUpperCase();
  const clean = base.replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'EL';
  return clean;
};

const validateCode = (val) => val.replace(/[^A-Za-z0-9\-_]/g, '').toUpperCase();

const CATEGORY_ORDER = ['Maquinaria', 'Transporte', 'Codificación', 'Almacenamiento', 'Mobiliario', 'Electricidad', 'Estructura', 'Otros'];

const formatMedidas = (m) => {
  if (!m) return null;
  const l = m.largo != null && m.largo !== '' ? Number(m.largo) : null;
  const a = m.ancho != null && m.ancho !== '' ? Number(m.ancho) : null;
  const h = m.alto != null && m.alto !== '' ? Number(m.alto) : null;
  const parts = [];
  if (l != null) parts.push(l);
  if (a != null) parts.push(a);
  if (h != null) parts.push(h);
  return parts.length ? `${parts.join(' × ')} cm` : null;
};

export default function ElementInventoryPanel({
  layoutElements = [],
  inventory = [],
  onChange,
  onHighlightElement,
}) {
  const [hoveredId, setHoveredId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [collapsed, setCollapsed] = useState({});

  // Una entrada de inventario por elemento del layout, numerada por tipo
  const autoInventory = useMemo(() => {
    const counters = {};
    return (layoutElements || []).map((el, idx) => {
      const cfg = getElementConfig(el.type);
      const key = el.type;
      counters[key] = (counters[key] || 0) + 1;
      const instance = counters[key];
      const prefix = typePrefix(el.type, el.label);
      return {
        element_type: el.type,
        category: cfg?.category || 'Otros',
        type_label: cfg?.label || el.type,
        label: el.label || cfg?.label || el.type,
        quantity: 1,
        auto_generated: true,
        instance_number: instance,
        marca: `${prefix}-${String(instance).padStart(2, '0')}`,
        source_element_id: el.id,
        medidas_cm: el.medidas_cm || null,
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

  // Agrupar por categoría → tipo de elemento
  const grouped = useMemo(() => {
    const g = {};
    mergedInventory.forEach((item, idx) => {
      const cat = item.category || 'Otros';
      const tl = item.type_label || item.element_type || 'Otro';
      if (!g[cat]) g[cat] = {};
      if (!g[cat][tl]) g[cat][tl] = [];
      g[cat][tl].push({ item, idx });
    });
    return g;
  }, [mergedInventory]);

  const totalElements = mergedInventory.length;

  const syncFromLayout = () => onChange(mergedInventory);

  const addManualItem = () => {
    onChange([...(inventory || []), {
      element_type: 'other',
      category: 'Otros',
      type_label: 'Otro',
      label: 'Nuevo elemento',
      quantity: 1,
      auto_generated: false,
      instance_number: 1,
      marca: '',
      notes: '',
    }]);
  };

  const updateItem = (idx, changes) => {
    const updated = [...mergedInventory];
    updated[idx] = { ...updated[idx], ...changes };
    onChange(updated);
  };

  const removeItem = (idx) => {
    const updated = [...mergedInventory];
    updated.splice(idx, 1);
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

  const toggleCategory = (cat) => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));

  const orderedCategories = Object.keys(grouped).sort(
    (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)
  );

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
        Organizado por categoría. Hover para resaltar en canvas.
      </p>

      {/* Lista agrupada por categoría */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-0.5 mt-1 space-y-1.5">
        {mergedInventory.length === 0 && (
          <div className="text-center py-4 border border-dashed border-slate-200 dark:border-slate-600 rounded-lg">
            <ClipboardList className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
            <p className="text-[10px] text-slate-400">Sin elementos</p>
          </div>
        )}

        {orderedCategories.map(cat => {
          const typeGroups = grouped[cat];
          const catCount = Object.values(typeGroups).reduce((s, arr) => s + arr.length, 0);
          const isCollapsed = collapsed[cat];
          return (
            <div key={cat} className="rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  {cat} · {catCount}
                </span>
                {isCollapsed ? <ChevronRight className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
              </button>

              {!isCollapsed && (
                <div className="p-1 space-y-1.5">
                  {Object.entries(typeGroups).map(([typeLabel, entries]) => (
                    <div key={typeLabel}>
                      <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide px-1 mb-0.5">
                        {typeLabel}
                      </p>
                      <div className="space-y-1">
                        {entries.map(({ item, idx }) => {
                          const cfg = getElementConfig(item.element_type);
                          const isHovered = hoveredId === item.source_element_id;
                          const isEditing = editingId === item.source_element_id;
                          const medidasTxt = formatMedidas(item.medidas_cm);
                          return (
                            <div
                              key={item.source_element_id || `m-${idx}`}
                              className={`group relative rounded-md border px-1.5 py-1 cursor-pointer transition-all ${
                                isHovered
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600 shadow-sm'
                                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                              }`}
                              onMouseEnter={() => item.source_element_id && handleHover(item.source_element_id)}
                              onMouseLeave={handleHoverEnd}
                              onClick={() => item.source_element_id && handleHover(isHovered ? null : item.source_element_id)}
                            >
                              {/* Etiqueta del elemento (nombre asignado en el layout) */}
                              <div className="flex items-center gap-1">
                                <span className="text-xs flex-shrink-0">{cfg?.icon || '📦'}</span>
                                {item.auto_generated ? (
                                  <span className="flex-1 min-w-0 text-[10px] font-medium text-slate-700 dark:text-slate-200 truncate" title={item.label}>
                                    {item.label || item.type_label}
                                  </span>
                                ) : (
                                  <input
                                    value={item.label}
                                    onChange={e => { e.stopPropagation(); updateItem(idx, { label: e.target.value }); }}
                                    onClick={e => e.stopPropagation()}
                                    className="flex-1 min-w-0 text-[10px] font-medium bg-transparent border-0 outline-none text-slate-600 dark:text-slate-400"
                                  />
                                )}
                                {!item.auto_generated && (
                                  <button onClick={(e) => { e.stopPropagation(); removeItem(idx); }}
                                    className="p-0.5 rounded text-red-400 hover:text-red-600 flex-shrink-0">
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>

                              {/* Código de inventario */}
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

                              {/* Medidas */}
                              {medidasTxt && (
                                <div className="flex items-center gap-0.5 mt-0.5 text-[9px] text-slate-500 dark:text-slate-400">
                                  <Ruler className="w-2.5 h-2.5 flex-shrink-0" />
                                  <span className="truncate">{medidasTxt}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}