import { useCallback } from 'react';
import { getElementConfig } from './ElementPalette';

const GRID = 10;
const snap = v => Math.round(v / GRID) * GRID;

function LayoutElementBg({ el }) {
  const cfg = getElementConfig(el.type);
  const color = el.color || cfg.color;
  const isDark = el.type === 'wall' || el.type === 'column';

  return (
    <g transform={`translate(${el.x},${el.y}) rotate(${el.rotation || 0} ${el.width / 2} ${el.height / 2})`}>
      <rect
        width={el.width}
        height={el.height}
        rx={6}
        fill={color}
        fillOpacity={el.type === 'walkway' ? 0.15 : 0.5}
        stroke={isDark ? '#374151' : '#94A3B8'}
        strokeWidth={1}
      />
      <text
        x={el.width / 2}
        y={el.height / 2 + 4}
        textAnchor="middle"
        fontSize={Math.min(11, el.width / (el.label?.length || 8) * 1.5)}
        fill={isDark ? '#D1D5DB' : '#475569'}
        fontWeight="500"
        pointerEvents="none"
      >
        {el.label || cfg.label}
      </text>
    </g>
  );
}

function OperatorMarker({ op, onMove }) {
  const color = op.color || '#3B82F6';

  const handleMouseDown = (e) => {
    e.stopPropagation();
    const startX = e.clientX - op.x;
    const startY = e.clientY - op.y;
    const onM = (me) => onMove(op.id, snap(me.clientX - startX), snap(me.clientY - startY));
    const onUp = () => { window.removeEventListener('mousemove', onM); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onM);
    window.addEventListener('mouseup', onUp);
  };

  const totalActions = (op.actions || []).length;
  const totalFreq = (op.actions || []).reduce((s, a) => s + (a.frequency_per_minute || 0), 0);

  return (
    <g transform={`translate(${op.x},${op.y})`} onMouseDown={handleMouseDown} style={{ cursor: 'move', userSelect: 'none' }}>
      {/* Shadow */}
      <circle cx={16} cy={18} r={16} fill="rgba(0,0,0,0.15)" />
      {/* Body circle */}
      <circle cx={14} cy={14} r={14} fill={color} stroke="#fff" strokeWidth={2} />
      {/* Person icon */}
      <circle cx={14} cy={9} r={4} fill="#fff" fillOpacity={0.9} />
      <path d="M6 22 Q14 16 22 22" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" />
      {/* Label bubble */}
      <rect x={-10} y={30} width={48} height={14} rx={7} fill={color} />
      <text x={14} y={41} textAnchor="middle" fontSize={8} fill="#fff" fontWeight="700">
        {op.operator_label || 'Op'}
      </text>
      {/* Actions badge */}
      {totalActions > 0 && (
        <g transform="translate(22,-6)">
          <circle r={8} fill="#EF4444" />
          <text textAnchor="middle" y={4} fontSize={8} fill="#fff" fontWeight="700">{totalActions}</text>
        </g>
      )}
      {/* Frequency badge */}
      {totalFreq > 0 && (
        <g transform="translate(14,50)">
          <rect x={-20} y={0} width={40} height={13} rx={6} fill="#1E3A5F" fillOpacity={0.8} />
          <text textAnchor="middle" y={10} fontSize={7.5} fill="#93C5FD">⚡ {totalFreq.toFixed(1)}/min</text>
        </g>
      )}
    </g>
  );
}

export default function OperatorCanvas({ operators, layoutElements, canvasWidth = 1200, canvasHeight = 800, onMoveOperator }) {
  const handleMove = useCallback((id, x, y) => {
    onMoveOperator(id, Math.max(0, Math.min(x, canvasWidth - 30)), Math.max(0, Math.min(y, canvasHeight - 30)));
  }, [onMoveOperator, canvasWidth, canvasHeight]);

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Arrastra los operarios para posicionarlos sobre el layout de la sala. El número rojo indica las acciones, el badge azul la frecuencia total por minuto.</p>
      <div className="overflow-auto border border-slate-300 dark:border-border rounded-xl bg-slate-100 dark:bg-slate-800" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        <svg width={canvasWidth} height={canvasHeight} style={{ display: 'block' }}>
          {/* Grid */}
          <defs>
            <pattern id="grid2" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke="#CBD5E1" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect width={canvasWidth} height={canvasHeight} fill="white" />
          <rect width={canvasWidth} height={canvasHeight} fill="url(#grid2)" />

          {/* Layout elements as background */}
          {['walkway','wall'].map(type =>
            (layoutElements || []).filter(e => e.type === type).map(el => <LayoutElementBg key={el.id} el={el} />)
          )}
          {(layoutElements || []).filter(e => e.type !== 'walkway' && e.type !== 'wall').map(el => (
            <LayoutElementBg key={el.id} el={el} />
          ))}

          {/* Operator markers */}
          {operators.map(op => (
            <OperatorMarker key={op.id} op={op} onMove={handleMove} />
          ))}

          {operators.length === 0 && (
            <text x={canvasWidth / 2} y={canvasHeight / 2} textAnchor="middle" fill="#94A3B8" fontSize={16}>
              Añade operarios en la pestaña "Operarios y Acciones"
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}