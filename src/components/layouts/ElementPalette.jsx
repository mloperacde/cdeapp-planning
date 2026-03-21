// Palette of draggable elements for the room layout editor

export const ELEMENT_TYPES = [
  // Maquinaria general
  { type: 'machine',            label: 'Máquina genérica',      color: '#3B82F6', defaultW: 120, defaultH: 80,  icon: '⚙️',  category: 'Maquinaria' },
  { type: 'star_plate',         label: 'Plato Estrella',         color: '#F97316', defaultW: 90,  defaultH: 90,  icon: '✦',   category: 'Maquinaria' },
  { type: 'dosing_cart',        label: 'Carro Dosificador',      color: '#0EA5E9', defaultW: 100, defaultH: 70,  icon: '🛒',  category: 'Maquinaria' },
  { type: 'nozzles',            label: 'Boquillas',              color: '#8B5CF6', defaultW: 120, defaultH: 60,  icon: '⬇️',  category: 'Maquinaria' },
  { type: 'rotary_accumulator', label: 'Plato Acumulador Rot.',  color: '#EC4899', defaultW: 100, defaultH: 100, icon: '↺',   category: 'Maquinaria' },
  { type: 'cartoner',           label: 'Estuchadora',            color: '#10B981', defaultW: 150, defaultH: 90,  icon: '📦',  category: 'Maquinaria' },
  // Transporte
  { type: 'conveyor_belt',      label: 'Cinta Transportadora',   color: '#F59E0B', defaultW: 200, defaultH: 40,  icon: '➡️',  category: 'Transporte' },
  // Codificación
  { type: 'inkjet_coder',       label: 'Loteador Inkjet',        color: '#06B6D4', defaultW: 80,  defaultH: 60,  icon: '🖨️',  category: 'Codificación' },
  { type: 'laser_coder',        label: 'Loteador Láser',         color: '#EF4444', defaultW: 80,  defaultH: 60,  icon: '🔴',  category: 'Codificación' },
  // Almacenamiento y materiales
  { type: 'container_bulk',     label: 'Contenedor Bulk (IBC)',  color: '#7C3AED', defaultW: 90,  defaultH: 110, icon: '🛢️',  category: 'Almacenamiento' },
  { type: 'storage',            label: 'Palet / Almacén',        color: '#A16207', defaultW: 80,  defaultH: 80,  icon: '📋',  category: 'Almacenamiento' },
  { type: 'material_cabinet',   label: 'Armario de Materiales',  color: '#6B7280', defaultW: 60,  defaultH: 100, icon: '🗄️',  category: 'Almacenamiento' },
  // Mobiliario
  { type: 'work_table',         label: 'Mesa de Trabajo',        color: '#D97706', defaultW: 120, defaultH: 70,  icon: '🪑',  category: 'Mobiliario' },
  { type: 'line_manager_desk',  label: 'Mesa Resp. de Línea',    color: '#6D28D9', defaultW: 100, defaultH: 70,  icon: '💻',  category: 'Mobiliario' },
  // Estructura
  { type: 'entry',              label: 'Entrada',                color: '#22C55E', defaultW: 60,  defaultH: 25,  icon: '🚪',  category: 'Estructura' },
  { type: 'exit',               label: 'Salida',                 color: '#EF4444', defaultW: 60,  defaultH: 25,  icon: '🚪',  category: 'Estructura' },
  { type: 'walkway',            label: 'Pasillo',                color: '#E5E7EB', defaultW: 200, defaultH: 40,  icon: '↕️',  category: 'Estructura' },
  { type: 'wall',               label: 'Pared / Límite',         color: '#374151', defaultW: 200, defaultH: 15,  icon: '🧱',  category: 'Estructura' },
  { type: 'column',             label: 'Columna',                color: '#6B7280', defaultW: 20,  defaultH: 20,  icon: '⬛',  category: 'Estructura' },
  // Otros
  { type: 'other',              label: 'Elemento libre',         color: '#9CA3AF', defaultW: 80,  defaultH: 60,  icon: '➕',  category: 'Otros' },
];

const CATEGORIES = ['Maquinaria', 'Transporte', 'Codificación', 'Almacenamiento', 'Mobiliario', 'Estructura', 'Otros'];

export function getElementConfig(type) {
  return ELEMENT_TYPES.find(e => e.type === type) || ELEMENT_TYPES[ELEMENT_TYPES.length - 1];
}

export default function ElementPalette({ onAdd }) {
  return (
    <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-0.5">
      {CATEGORIES.map(cat => {
        const items = ELEMENT_TYPES.filter(e => e.category === cat);
        if (!items.length) return null;
        return (
          <div key={cat}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-0.5">{cat}</p>
            {items.map(el => (
              <button
                key={el.type}
                onClick={() => onAdd(el)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-accent/10 transition-colors"
              >
                <span className="text-sm w-5 text-center flex-shrink-0">{el.icon}</span>
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: el.color }} />
                <span className="flex-1 text-slate-700 dark:text-slate-300 text-xs leading-tight truncate">{el.label}</span>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}