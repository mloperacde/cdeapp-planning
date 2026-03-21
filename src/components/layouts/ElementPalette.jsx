// Palette of draggable elements for the room layout editor

export const ELEMENT_TYPES = [
  // ── Maquinaria ─────────────────────────────────────────────────────────────
  { type: 'machine',            label: 'Máquina genérica',       color: '#3B82F6', defaultW: 120, defaultH: 80,  icon: '⚙️',  category: 'Maquinaria' },
  { type: 'filling_machine',    label: 'Envasadora/Llenadora',    color: '#0EA5E9', defaultW: 160, defaultH: 100, icon: '🔧',  category: 'Maquinaria' },
  { type: 'capper',             label: 'Taponadora',              color: '#6366F1', defaultW: 100, defaultH: 90,  icon: '🔩',  category: 'Maquinaria' },
  { type: 'labeler',            label: 'Etiquetadora',            color: '#8B5CF6', defaultW: 130, defaultH: 90,  icon: '🏷️',  category: 'Maquinaria' },
  { type: 'cartoner',           label: 'Estuchadora',             color: '#10B981', defaultW: 160, defaultH: 90,  icon: '📦',  category: 'Maquinaria' },
  { type: 'wrapper',            label: 'Envolvedora/Retractil.',  color: '#14B8A6', defaultW: 150, defaultH: 90,  icon: '🌀',  category: 'Maquinaria' },
  { type: 'star_plate',         label: 'Plato Estrella',          color: '#F97316', defaultW: 90,  defaultH: 90,  icon: '✦',   category: 'Maquinaria' },
  { type: 'rotary_accumulator', label: 'Plato Acumulador Rot.',   color: '#EC4899', defaultW: 100, defaultH: 100, icon: '↺',   category: 'Maquinaria' },
  { type: 'nozzles',            label: 'Boquillas',               color: '#A78BFA', defaultW: 120, defaultH: 60,  icon: '⬇️',  category: 'Maquinaria' },
  { type: 'dosing_cart',        label: 'Carro Dosificador',       color: '#0EA5E9', defaultW: 100, defaultH: 70,  icon: '🛒',  category: 'Maquinaria' },
  // ── Transporte ─────────────────────────────────────────────────────────────
  { type: 'conveyor_belt',      label: 'Cinta Lineal',            color: '#F59E0B', defaultW: 200, defaultH: 40,  icon: '➡️',  category: 'Transporte' },
  { type: 'curved_conveyor',    label: 'Cinta Curva',             color: '#D97706', defaultW: 120, defaultH: 120, icon: '↱',   category: 'Transporte' },
  { type: 'transfer_pump',      label: 'Bomba Trasvase',          color: '#06B6D4', defaultW: 80,  defaultH: 80,  icon: '💧',  category: 'Transporte' },
  { type: 'container_loader',   label: 'Cargador de Envases',     color: '#2563EB', defaultW: 100, defaultH: 110, icon: '🏗️',  category: 'Transporte' },
  // ── Codificación ───────────────────────────────────────────────────────────
  { type: 'inkjet_coder',       label: 'Loteador Inkjet',         color: '#06B6D4', defaultW: 80,  defaultH: 60,  icon: '🖨️',  category: 'Codificación' },
  { type: 'laser_coder',        label: 'Loteador Láser',          color: '#EF4444', defaultW: 80,  defaultH: 60,  icon: '🔴',  category: 'Codificación' },
  // ── Almacenamiento ─────────────────────────────────────────────────────────
  { type: 'container_bulk',     label: 'Contenedor Bulk (IBC)',   color: '#7C3AED', defaultW: 90,  defaultH: 110, icon: '🛢️',  category: 'Almacenamiento' },
  { type: 'storage',            label: 'Palet',                   color: '#A16207', defaultW: 80,  defaultH: 80,  icon: '📋',  category: 'Almacenamiento' },
  { type: 'material_cabinet',   label: 'Armario de Materiales',   color: '#6B7280', defaultW: 60,  defaultH: 100, icon: '🗄️',  category: 'Almacenamiento' },
  // ── Mobiliario ─────────────────────────────────────────────────────────────
  { type: 'work_table',         label: 'Mesa de Trabajo',         color: '#D97706', defaultW: 120, defaultH: 70,  icon: '🪑',  category: 'Mobiliario' },
  { type: 'line_manager_desk',  label: 'Mesa Resp. de Línea',     color: '#6D28D9', defaultW: 100, defaultH: 70,  icon: '💻',  category: 'Mobiliario' },
  // ── Electricidad ───────────────────────────────────────────────────────────
  { type: 'outlet_220',         label: 'Enchufe 220V',            color: '#1e293b', defaultW: 40,  defaultH: 40,  icon: '🔌',  category: 'Electricidad' },
  { type: 'outlet_380',         label: 'Enchufe 380V (Trifásico)',color: '#1e1b4b', defaultW: 48,  defaultH: 48,  icon: '⚡',  category: 'Electricidad' },
  // ── Estructura ─────────────────────────────────────────────────────────────
  { type: 'entry',              label: 'Entrada',                 color: '#22C55E', defaultW: 80,  defaultH: 30,  icon: '🚪',  category: 'Estructura' },
  { type: 'exit',               label: 'Salida',                  color: '#EF4444', defaultW: 80,  defaultH: 30,  icon: '🚪',  category: 'Estructura' },
  { type: 'walkway',            label: 'Pasillo',                 color: '#E5E7EB', defaultW: 200, defaultH: 40,  icon: '↕️',  category: 'Estructura' },
  { type: 'wall',               label: 'Pared / Límite',          color: '#374151', defaultW: 200, defaultH: 15,  icon: '🧱',  category: 'Estructura' },
  { type: 'column',             label: 'Columna',                 color: '#6B7280', defaultW: 20,  defaultH: 20,  icon: '⬛',  category: 'Estructura' },
  // ── Otros ──────────────────────────────────────────────────────────────────
  { type: 'other',              label: 'Elemento libre',          color: '#9CA3AF', defaultW: 80,  defaultH: 60,  icon: '➕',  category: 'Otros' },
];

const CATEGORIES = ['Maquinaria', 'Transporte', 'Codificación', 'Almacenamiento', 'Mobiliario', 'Electricidad', 'Estructura', 'Otros'];

export function getElementConfig(type) {
  return ELEMENT_TYPES.find(e => e.type === type) || ELEMENT_TYPES[ELEMENT_TYPES.length - 1];
}

/** Special palette item for the room floor surface */
function RoomFloorPaletteItem({ isDrawing, hasFloor, floorColor, onToggleDraw, onClearFloor }) {
  return (
    <div className={`rounded-lg border-2 transition-all ${isDrawing ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : hasFloor ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800' : 'border-dashed border-slate-300 dark:border-slate-600'}`}>
      <button onClick={onToggleDraw} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left">
        <div className="flex-shrink-0 w-8 h-8 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: hasFloor ? floorColor : 'transparent' }}>
          {hasFloor ? (
            <span className="text-xs" style={{ color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>🏠</span>
          ) : (
            <span className="text-xs text-slate-400">✏️</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium leading-tight ${isDrawing ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
            {isDrawing ? '✏️ Dibujando...' : 'Suelo de Sala'}
          </p>
          <p className="text-[10px] text-slate-400 leading-tight">
            {isDrawing ? 'Clic en canvas para añadir puntos' : hasFloor ? 'Polígono definido — clic para redibujar' : 'Clic para definir contorno'}
          </p>
        </div>
      </button>
      {hasFloor && !isDrawing && (
        <div className="px-2 pb-2 flex gap-1">
          <button onClick={onToggleDraw}
            className="flex-1 text-[10px] py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 transition-colors">
            ✏️ Redibujar
          </button>
          <button onClick={onClearFloor}
            className="flex-1 text-[10px] py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 transition-colors">
            🗑 Borrar
          </button>
        </div>
      )}
    </div>
  );
}

export default function ElementPalette({ onAdd, isDrawingRoom, hasRoomFloor, floorColor, onToggleDrawRoom, onClearRoomFloor }) {
  return (
    <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-0.5">
      {CATEGORIES.map(cat => {
        const items = ELEMENT_TYPES.filter(e => e.category === cat);
        if (!items.length && cat !== 'Estructura') return null;
        return (
          <div key={cat}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-0.5">{cat}</p>
            {items.map(el => (
              <button key={el.type} onClick={() => onAdd(el)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-accent/10 transition-colors">
                <span className="text-sm w-5 text-center flex-shrink-0">{el.icon}</span>
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: el.color }} />
                <span className="flex-1 text-slate-700 dark:text-slate-300 text-xs leading-tight truncate">{el.label}</span>
              </button>
            ))}
            {cat === 'Estructura' && (
              <RoomFloorPaletteItem
                isDrawing={isDrawingRoom}
                hasFloor={hasRoomFloor}
                floorColor={floorColor}
                onToggleDraw={onToggleDrawRoom}
                onClearFloor={onClearRoomFloor}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}