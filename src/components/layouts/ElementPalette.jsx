// Palette of draggable elements for the room layout editor

export const ELEMENT_TYPES = [
  { type: 'machine',           label: 'Máquina',              color: '#3B82F6', defaultW: 120, defaultH: 80,  icon: '⚙️' },
  { type: 'container_bulk',    label: 'Contenedor Bulk',       color: '#8B5CF6', defaultW: 100, defaultH: 100, icon: '🛢️' },
  { type: 'conveyor_belt',     label: 'Cinta Transportadora',  color: '#F59E0B', defaultW: 200, defaultH: 40,  icon: '➡️' },
  { type: 'inkjet_coder',      label: 'Loteador Inkjet',       color: '#06B6D4', defaultW: 80,  defaultH: 60,  icon: '🖨️' },
  { type: 'laser_coder',       label: 'Loteador Láser',        color: '#EC4899', defaultW: 80,  defaultH: 60,  icon: '🔴' },
  { type: 'cartoner',          label: 'Estuchadora',           color: '#10B981', defaultW: 150, defaultH: 90,  icon: '📦' },
  { type: 'material_cabinet',  label: 'Armario de Materiales', color: '#6B7280', defaultW: 60,  defaultH: 100, icon: '🗄️' },
  { type: 'work_table',        label: 'Mesa de Trabajo',       color: '#D97706', defaultW: 120, defaultH: 70,  icon: '🪑' },
  { type: 'line_manager_desk', label: 'Mesa Resp. de Línea',   color: '#7C3AED', defaultW: 100, defaultH: 70,  icon: '💻' },
  { type: 'entry',             label: 'Entrada',               color: '#22C55E', defaultW: 60,  defaultH: 20,  icon: '🚪' },
  { type: 'exit',              label: 'Salida',                color: '#EF4444', defaultW: 60,  defaultH: 20,  icon: '🚪' },
  { type: 'storage',           label: 'Almacenamiento',        color: '#A16207', defaultW: 80,  defaultH: 80,  icon: '📋' },
  { type: 'walkway',           label: 'Pasillo',               color: '#E5E7EB', defaultW: 200, defaultH: 40,  icon: '↕️' },
  { type: 'wall',              label: 'Pared / Límite',        color: '#374151', defaultW: 200, defaultH: 15,  icon: '🧱' },
  { type: 'column',            label: 'Columna',               color: '#6B7280', defaultW: 20,  defaultH: 20,  icon: '⬛' },
  { type: 'other',             label: 'Otro elemento',         color: '#9CA3AF', defaultW: 80,  defaultH: 60,  icon: '➕' },
];

export function getElementConfig(type) {
  return ELEMENT_TYPES.find(e => e.type === type) || ELEMENT_TYPES[ELEMENT_TYPES.length - 1];
}

export default function ElementPalette({ onAdd }) {
  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-3">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Elementos</p>
      <div className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
        {ELEMENT_TYPES.map(el => (
          <button
            key={el.type}
            onClick={() => onAdd(el)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-accent/10 transition-colors text-sm group"
          >
            <span className="text-base">{el.icon}</span>
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: el.color }}
            />
            <span className="flex-1 text-slate-700 dark:text-slate-300 text-xs leading-tight">{el.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}