import { useMemo } from 'react';
import { getElementConfig } from './ElementPalette';
import { Plus, X, RefreshCw, ClipboardList } from 'lucide-react';

export default function ElementInventoryPanel({ layoutElements = [], inventory = [], onChange }) {
  // Auto-generate inventory from current layout elements
  const autoInventory = useMemo(() => {
    const counts = {};
    (layoutElements || []).forEach(el => {
      const cfg = getElementConfig(el.type);
      const key = el.type;
      if (!counts[key]) {
        counts[key] = { element_type: el.type, label: el.label || cfg.label, quantity: 0, auto_generated: true };
      }
      counts[key].quantity++;
    });
    return Object.values(counts).sort((a, b) => b.quantity - a.quantity);
  }, [layoutElements]);

  // Merge: keep manual items + auto items (auto items update quantity from layout)
  const mergedInventory = useMemo(() => {
    const manualItems = (inventory || []).filter(item => !item.auto_generated);
    return [...autoInventory, ...manualItems];
  }, [autoInventory, inventory]);

  const totalElements = mergedInventory.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const syncFromLayout = () => {
    // Keep only manual items, auto items are regenerated from layout
    const manualItems = (inventory || []).filter(item => !item.auto_generated);
    onChange([...autoInventory, ...manualItems]);
  };

  const addManualItem = () => {
    onChange([...(inventory || []), {
      element_type: 'other',
      label: 'Nuevo elemento',
      quantity: 1,
      auto_generated: false,
      notes: '',
    }]);
  };

  const updateItem = (index, changes) => {
    const updated = [...(inventory || [])];
    updated[index] = { ...updated[index], ...changes };
    onChange(updated);
  };

  const removeItem = (index) => {
    onChange((inventory || []).filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ClipboardList className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Inventario ({mergedInventory.length})
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
        Elementos necesarios según la configuración del layout. Los items auto-generados se actualizan con el diseño.
      </p>

      <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded px-2 py-1">
        Total: <span className="font-bold text-slate-700 dark:text-slate-300">{totalElements}</span> elementos
      </div>

      <div className="space-y-1 max-h-72 overflow-y-auto">
        {mergedInventory.length === 0 && (
          <div className="text-center py-3 border border-dashed border-slate-200 dark:border-slate-600 rounded-lg">
            <ClipboardList className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
            <p className="text-[10px] text-slate-400">Sin elementos en el inventario</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Añade elementos al layout o pulsa +</p>
          </div>
        )}
        {mergedInventory.map((item, idx) => {
          const cfg = getElementConfig(item.element_type);
          return (
            <div key={idx}
              className={`rounded-lg border p-1.5 ${
                item.auto_generated
                  ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30'
                  : 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30'
              }`}>
              <div className="flex items-center gap-1.5">
                <span className="text-sm flex-shrink-0">{cfg.icon || '📦'}</span>
                {item.auto_generated ? (
                  <span className="flex-1 text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                    {item.label}
                  </span>
                ) : (
                  <input
                    value={item.label}
                    onChange={e => updateItem(idx, { label: e.target.value })}
                    className="flex-1 text-xs font-medium bg-transparent border-0 outline-none text-slate-700 dark:text-slate-300 min-w-0"
                  />
                )}
                <input
                  type="number"
                  value={item.quantity}
                  onChange={e => updateItem(idx, { quantity: Math.max(1, +e.target.value) })}
                  className="w-10 text-xs text-center border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  min="1"
                />
                <span className="text-[9px] text-slate-400">ud</span>
                {!item.auto_generated && (
                  <button onClick={() => removeItem(idx)}
                    className="p-0.5 rounded text-red-400 hover:text-red-600 flex-shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              {!item.auto_generated && (
                <input
                  value={item.notes || ''}
                  onChange={e => updateItem(idx, { notes: e.target.value })}
                  placeholder="Notas..."
                  className="w-full text-[10px] mt-1 bg-transparent border-0 border-b border-dashed border-slate-200 dark:border-slate-600 outline-none text-slate-500 dark:text-slate-400 placeholder:text-slate-300"
                />
              )}
              {item.auto_generated && (
                <span className="text-[8px] text-emerald-500 font-medium ml-5">● Auto</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}