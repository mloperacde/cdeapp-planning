import { useRef, useState, useCallback } from 'react';
import { getElementConfig } from './ElementPalette';

const GRID = 10;
const snap = v => Math.round(v / GRID) * GRID;

function LayoutElement({ el, selected, onSelect, onMove, onResize }) {
  const cfg = getElementConfig(el.type);
  const color = el.color || cfg.color;
  const isDark = el.type === 'wall' || el.type === 'column';

  const handleMouseDown = (e) => {
    e.stopPropagation();
    onSelect(el.id);
    const startX = e.clientX - el.x;
    const startY = e.clientY - el.y;
    const onMove_ = (me) => onMove(el.id, snap(me.clientX - startX), snap(me.clientY - startY));
    const onUp = () => { window.removeEventListener('mousemove', onMove_); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove_);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <g
      transform={`translate(${el.x},${el.y}) rotate(${el.rotation || 0} ${el.width / 2} ${el.height / 2})`}
      onMouseDown={handleMouseDown}
      style={{ cursor: 'move', userSelect: 'none' }}
    >
      <rect
        width={el.width}
        height={el.height}
        rx={el.type === 'column' ? 2 : 6}
        fill={color}
        fillOpacity={el.type === 'walkway' ? 0.3 : 0.85}
        stroke={selected ? '#1D4ED8' : isDark ? '#1F2937' : '#fff'}
        strokeWidth={selected ? 2.5 : 1.5}
      />

      {/* Stations inside element */}
      {(el.stations || []).map(st => (
        <g key={st.id} transform={`translate(${st.x_offset || 0},${st.y_offset || 0})`}>
          <rect
            width={st.width || 30}
            height={st.height || 20}
            rx={3}
            fill="#fff"
            fillOpacity={0.5}
            stroke="#fff"
            strokeWidth={1}
          />
          <text x={(st.width || 30) / 2} y={(st.height || 20) / 2 + 4} textAnchor="middle" fontSize={7} fill="#1F2937">
            {st.name}
          </text>
        </g>
      ))}

      {/* Label */}
      <text
        x={el.width / 2}
        y={el.height / 2 + 4}
        textAnchor="middle"
        fontSize={Math.min(12, el.width / (el.label?.length || 8) * 1.5)}
        fill={isDark || el.type === 'walkway' ? '#374151' : '#fff'}
        fontWeight="600"
        pointerEvents="none"
      >
        {el.label || cfg.label}
      </text>

      {/* Resize handle */}
      {selected && (
        <rect
          x={el.width - 8}
          y={el.height - 8}
          width={8}
          height={8}
          fill="#1D4ED8"
          rx={2}
          style={{ cursor: 'se-resize' }}
          onMouseDown={(e) => {
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const startW = el.width;
            const startH = el.height;
            const onR = (me) => onResize(el.id, snap(startW + me.clientX - startX), snap(startH + me.clientY - startY));
            const onUp = () => { window.removeEventListener('mousemove', onR); window.removeEventListener('mouseup', onUp); };
            window.addEventListener('mousemove', onR);
            window.addEventListener('mouseup', onUp);
          }}
        />
      )}
    </g>
  );
}

export default function LayoutCanvas({ elements, selectedId, onSelect, onUpdateElement, width = 1200, height = 800 }) {
  const svgRef = useRef(null);

  const handleMove = useCallback((id, x, y) => {
    onUpdateElement(id, { x: Math.max(0, x), y: Math.max(0, y) });
  }, [onUpdateElement]);

  const handleResize = useCallback((id, w, h) => {
    onUpdateElement(id, { width: Math.max(20, w), height: Math.max(20, h) });
  }, [onUpdateElement]);

  return (
    <div className="overflow-auto border border-slate-300 dark:border-border rounded-xl bg-slate-100 dark:bg-slate-800" style={{ maxHeight: 'calc(100vh - 200px)' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onMouseDown={() => onSelect(null)}
        style={{ display: 'block' }}
      >
        {/* Grid */}
        <defs>
          <pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
            <path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke="#CBD5E1" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="white" />
        <rect width={width} height={height} fill="url(#grid)" />

        {/* Elements - bottom layers first */}
        {['walkway', 'wall'].map(type =>
          elements.filter(e => e.type === type).map(el => (
            <LayoutElement key={el.id} el={el} selected={selectedId === el.id}
              onSelect={onSelect} onMove={handleMove} onResize={handleResize} />
          ))
        )}
        {elements.filter(e => e.type !== 'walkway' && e.type !== 'wall').map(el => (
          <LayoutElement key={el.id} el={el} selected={selectedId === el.id}
            onSelect={onSelect} onMove={handleMove} onResize={handleResize} />
        ))}
      </svg>
    </div>
  );
}