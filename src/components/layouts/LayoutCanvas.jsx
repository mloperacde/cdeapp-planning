import { useRef, useState, useCallback } from 'react';
import { getElementConfig } from './ElementPalette';
import { renderShape } from './ElementShapes';

const GRID = 10;
const snap = v => Math.round(v / GRID) * GRID;

/** Single element rendered with its SVG shape */
function LayoutElement({ el, selected, multiSelected, onPointerDown, onResize }) {
  const cfg = getElementConfig(el.type);
  const color = el.color || cfg.color;

  return (
    <g
      transform={`translate(${el.x},${el.y}) rotate(${el.rotation || 0} ${el.width / 2} ${el.height / 2})`}
      onMouseDown={(e) => onPointerDown(e, el.id)}
      style={{ cursor: 'move', userSelect: 'none' }}
    >
      {renderShape(el.type, {
        width: el.width,
        height: el.height,
        color,
        label: el.label || cfg.label,
        selected: selected || multiSelected,
      })}

      {/* Stations */}
      {(el.stations || []).map(st => (
        <g key={st.id} transform={`translate(${st.x_offset || 0},${st.y_offset || 0})`}>
          <rect width={st.width || 30} height={st.height || 20} rx={3}
            fill="#fff" fillOpacity={0.45} stroke="#fff" strokeWidth={0.8} />
          <text x={(st.width || 30) / 2} y={(st.height || 20) / 2 + 4}
            textAnchor="middle" fontSize={7} fill="#1F2937" pointerEvents="none">{st.name}</text>
        </g>
      ))}

      {/* Resize handle – only for sole selected */}
      {selected && (
        <rect
          x={el.width - 9} y={el.height - 9}
          width={9} height={9}
          fill="#1D4ED8" rx={2}
          style={{ cursor: 'se-resize' }}
          onMouseDown={(e) => {
            e.stopPropagation();
            const sx = e.clientX, sy = e.clientY;
            const sw = el.width, sh = el.height;
            const onR = (me) => onResize(el.id, snap(sw + me.clientX - sx), snap(sh + me.clientY - sy));
            const onUp = () => { window.removeEventListener('mousemove', onR); window.removeEventListener('mouseup', onUp); };
            window.addEventListener('mousemove', onR);
            window.addEventListener('mouseup', onUp);
          }}
        />
      )}

      {/* Multi-select indicator */}
      {multiSelected && !selected && (
        <rect width={el.width} height={el.height} rx={4}
          fill="none" stroke="#2563EB" strokeWidth={2} strokeDasharray="5 3" pointerEvents="none" />
      )}
    </g>
  );
}

export default function LayoutCanvas({
  elements,
  selectedId,
  selectedIds = [],       // multi-select ids
  onSelect,
  onMultiSelect,          // (ids) => void
  onUpdateElement,
  onGroupSelected,        // () => void
  width = 1200,
  height = 800,
}) {
  const svgRef = useRef(null);

  // Rectangle-selection state
  const [selRect, setSelRect] = useState(null); // { x0,y0,x1,y1 }

  const getSVGCoords = (e) => {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // ── Move single element ────────────────────────────────────────────────────
  const startMove = useCallback((e, id) => {
    e.stopPropagation();

    const isShift = e.shiftKey;

    // Shift-click: toggle in multiselect
    if (isShift) {
      const next = selectedIds.includes(id)
        ? selectedIds.filter(x => x !== id)
        : [...selectedIds, id];
      onMultiSelect?.(next);
      onSelect(null);
      return;
    }

    // If clicking something already in multiselect → move all together
    const idsToMove = selectedIds.includes(id) && selectedIds.length > 1
      ? selectedIds
      : [id];

    if (idsToMove.length === 1) {
      onSelect(id);
      onMultiSelect?.([]);
    }

    // Capture start positions
    const starts = {};
    elements.forEach(el => {
      if (idsToMove.includes(el.id)) {
        starts[el.id] = { x: el.x - e.clientX, y: el.y - e.clientY };
      }
    });

    const onMv = (me) => {
      idsToMove.forEach(eid => {
        const s = starts[eid];
        onUpdateElement(eid, {
          x: Math.max(0, snap(me.clientX + s.x)),
          y: Math.max(0, snap(me.clientY + s.y)),
        });
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMv);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMv);
    window.addEventListener('mouseup', onUp);
  }, [elements, selectedIds, onSelect, onMultiSelect, onUpdateElement]);

  // ── Resize ────────────────────────────────────────────────────────────────
  const handleResize = useCallback((id, w, h) => {
    onUpdateElement(id, { width: Math.max(20, w), height: Math.max(20, h) });
  }, [onUpdateElement]);

  // ── Canvas background click → start rect-select or deselect ───────────────
  const handleBgMouseDown = (e) => {
    if (e.target !== svgRef.current && e.target.tagName === 'rect' && e.target.getAttribute('fill') === 'url(#grid)') return;
    if (e.target !== svgRef.current) return; // only on bg rect / svg itself

    onSelect(null);
    onMultiSelect?.([]);

    const { x, y } = getSVGCoords(e);
    const start = { x, y };

    const onMv = (me) => {
      const { x: cx, y: cy } = getSVGCoords(me);
      setSelRect({
        x0: Math.min(start.x, cx),
        y0: Math.min(start.y, cy),
        x1: Math.max(start.x, cx),
        y1: Math.max(start.y, cy),
      });
    };

    const onUp = (me) => {
      window.removeEventListener('mousemove', onMv);
      window.removeEventListener('mouseup', onUp);
      setSelRect(sr => {
        if (sr && (sr.x1 - sr.x0 > 5 || sr.y1 - sr.y0 > 5)) {
          // Select all elements inside rect
          const hit = elements.filter(el =>
            el.x + el.width > sr.x0 &&
            el.x < sr.x1 &&
            el.y + el.height > sr.y0 &&
            el.y < sr.y1
          ).map(el => el.id);
          if (hit.length === 1) {
            onSelect(hit[0]);
            onMultiSelect?.([]);
          } else if (hit.length > 1) {
            onMultiSelect?.(hit);
            onSelect(null);
          }
        }
        return null;
      });
    };

    window.addEventListener('mousemove', onMv);
    window.addEventListener('mouseup', onUp);
  };

  const layerOrder = ['walkway', 'wall', 'column'];
  const bottomEls = elements.filter(e => layerOrder.includes(e.type));
  const topEls = elements.filter(e => !layerOrder.includes(e.type));

  return (
    <div className="overflow-auto border border-slate-300 dark:border-border rounded-xl bg-slate-100 dark:bg-slate-800"
      style={{ maxHeight: 'calc(100vh - 200px)' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onMouseDown={handleBgMouseDown}
        style={{ display: 'block' }}
      >
        <defs>
          <pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
            <path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke="#CBD5E1" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="white" />
        <rect width={width} height={height} fill="url(#grid)" />

        {[...bottomEls, ...topEls].map(el => (
          <LayoutElement
            key={el.id}
            el={el}
            selected={selectedId === el.id}
            multiSelected={selectedIds.includes(el.id)}
            onPointerDown={startMove}
            onResize={handleResize}
          />
        ))}

        {/* Selection rectangle */}
        {selRect && (
          <rect
            x={selRect.x0} y={selRect.y0}
            width={selRect.x1 - selRect.x0}
            height={selRect.y1 - selRect.y0}
            fill="#2563EB" fillOpacity={0.08}
            stroke="#2563EB" strokeWidth={1.5}
            strokeDasharray="5 3"
            pointerEvents="none"
          />
        )}
      </svg>
    </div>
  );
}