import { useRef, useState, useCallback, useEffect } from 'react';
import { getElementConfig } from './ElementPalette';
import { renderShape } from './ElementShapes';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

const GRID = 10;
const snap = v => Math.round(v / GRID) * GRID;
const GUIDE_THRESHOLD = 6; // px distance to show alignment guide

/** Single element */
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

      {(el.stations || []).map(st => (
        <g key={st.id} transform={`translate(${st.x_offset || 0},${st.y_offset || 0})`}>
          <rect width={st.width || 30} height={st.height || 20} rx={3}
            fill="#fff" fillOpacity={0.45} stroke="#fff" strokeWidth={0.8} />
          <text x={(st.width || 30) / 2} y={(st.height || 20) / 2 + 4}
            textAnchor="middle" fontSize={7} fill="#1F2937" pointerEvents="none">{st.name}</text>
        </g>
      ))}

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

      {multiSelected && !selected && (
        <rect width={el.width} height={el.height} rx={4}
          fill="none" stroke="#2563EB" strokeWidth={2} strokeDasharray="5 3" pointerEvents="none" />
      )}
    </g>
  );
}

/** Room floor surface — rendered BELOW all elements */
function RoomFloor({ points, isDrawing, currentPoint }) {
  if (points.length === 0 && !isDrawing) return null;
  const ptStr = points.map(p => `${p.x},${p.y}`).join(' ');
  const allPts = currentPoint ? [...points, currentPoint] : points;
  const allStr = allPts.map(p => `${p.x},${p.y}`).join(' ');
  const wallColor = '#334155';
  const floorId = 'floor-pattern';

  return (
    <g pointerEvents="none">
      {/* Floor tile pattern */}
      <defs>
        <pattern id={floorId} width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#F1F5F9" />
          <rect width="20" height="20" fill="#E9EEF5" />
          <rect x="20" y="20" width="20" height="20" fill="#E9EEF5" />
        </pattern>
      </defs>

      {/* Closed floor fill */}
      {points.length > 2 && !isDrawing && (
        <>
          <polygon points={ptStr} fill={`url(#${floorId})`} stroke="none" />
          <polygon points={ptStr} fill="none" stroke={wallColor} strokeWidth={3} strokeLinejoin="round" />
          {/* Inner wall shadow */}
          <polygon points={ptStr} fill="none" stroke={wallColor} strokeWidth={6} strokeOpacity={0.08} strokeLinejoin="round" />
        </>
      )}

      {/* In-progress outline */}
      {isDrawing && allPts.length > 1 && (
        <polyline points={allStr} fill="none" stroke={wallColor} strokeWidth={2.5} strokeDasharray="8 4" />
      )}

      {/* Vertex handles */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={5} fill={wallColor} stroke="#fff" strokeWidth={1.5} />
          <text x={p.x + 7} y={p.y - 5} fontSize={8} fill={wallColor} fontWeight="bold">{i + 1}</text>
        </g>
      ))}

      {/* Snap-to-close indicator on first point */}
      {points.length > 2 && isDrawing && (
        <circle cx={points[0].x} cy={points[0].y} r={10} fill="none" stroke="#10B981" strokeWidth={2} strokeDasharray="3 2" />
      )}
    </g>
  );
}

export default function LayoutCanvas({
  elements,
  selectedId,
  selectedIds = [],
  onSelect,
  onMultiSelect,
  onUpdateElement,
  onGroupSelected,
  roomPolygon = [],
  onRoomPolygonChange,
  drawingRoom = false,
  width = 1200,
  height = 800,
}) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selRect, setSelRect] = useState(null);
  const [guides, setGuides] = useState({ x: null, y: null }); // alignment lines
  const [drawCursor, setDrawCursor] = useState(null); // current mouse for room drawing

  // ── Zoom controls ────────────────────────────────────────────────────────
  const zoomIn = () => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)));
  const zoomOut = () => setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)));
  const zoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom(z => {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        return Math.min(4, Math.max(0.25, +(z + delta).toFixed(2)));
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ── SVG coordinate helper (accounts for zoom + pan) ──────────────────────
  const getSVGCoords = useCallback((e) => {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom - pan.x,
      y: (e.clientY - rect.top) / zoom - pan.y,
    };
  }, [zoom, pan]);

  // ── Alignment guides ─────────────────────────────────────────────────────
  const computeGuides = useCallback((movingId, nx, ny, nw, nh) => {
    const others = elements.filter(e => e.id !== movingId);
    let gx = null, gy = null;
    for (const o of others) {
      const oxs = [o.x, o.x + o.width / 2, o.x + o.width];
      const oys = [o.y, o.y + o.height / 2, o.y + o.height];
      const mxs = [nx, nx + nw / 2, nx + nw];
      const mys = [ny, ny + nh / 2, ny + nh];
      for (const ox of oxs) for (const mx of mxs) if (Math.abs(ox - mx) < GUIDE_THRESHOLD / zoom) gx = ox;
      for (const oy of oys) for (const my of mys) if (Math.abs(oy - my) < GUIDE_THRESHOLD / zoom) gy = oy;
    }
    setGuides({ x: gx, y: gy });
  }, [elements, zoom]);

  // ── Move single / group ──────────────────────────────────────────────────
  const startMove = useCallback((e, id) => {
    e.stopPropagation();

    if (e.shiftKey) {
      const next = selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id];
      onMultiSelect?.(next);
      onSelect(null);
      return;
    }

    const idsToMove = selectedIds.includes(id) && selectedIds.length > 1 ? selectedIds : [id];
    if (idsToMove.length === 1) { onSelect(id); onMultiSelect?.([]); }

    const starts = {};
    elements.forEach(el => {
      if (idsToMove.includes(el.id)) starts[el.id] = { x: el.x - e.clientX / zoom, y: el.y - e.clientY / zoom };
    });

    const movingEl = elements.find(el => el.id === id);

    const onMv = (me) => {
      idsToMove.forEach(eid => {
        const s = starts[eid];
        const nx = Math.max(0, snap(me.clientX / zoom + s.x));
        const ny = Math.max(0, snap(me.clientY / zoom + s.y));
        onUpdateElement(eid, { x: nx, y: ny });
        if (idsToMove.length === 1 && movingEl) {
          computeGuides(eid, nx, ny, movingEl.width, movingEl.height);
        }
      });
    };
    const onUp = () => {
      setGuides({ x: null, y: null });
      window.removeEventListener('mousemove', onMv);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMv);
    window.addEventListener('mouseup', onUp);
  }, [elements, selectedIds, onSelect, onMultiSelect, onUpdateElement, computeGuides, zoom]);

  const handleResize = useCallback((id, w, h) => {
    onUpdateElement(id, { width: Math.max(20, w), height: Math.max(20, h) });
  }, [onUpdateElement]);

  // ── Background interactions ──────────────────────────────────────────────
  const handleBgMouseDown = (e) => {
    // Room drawing mode
    if (drawingRoom) {
      const { x, y } = getSVGCoords(e);
      // Close polygon if clicking near start
      if (roomPolygon.length > 2) {
        const dx = x - roomPolygon[0].x, dy = y - roomPolygon[0].y;
        if (Math.sqrt(dx * dx + dy * dy) < 12 / zoom) {
          onRoomPolygonChange?.([...roomPolygon]); // signal close
          return;
        }
      }
      onRoomPolygonChange?.([...roomPolygon, { x: snap(x), y: snap(y) }]);
      return;
    }

    // Must be clicking on the SVG background itself
    const tag = e.target.tagName;
    if (tag !== 'svg' && tag !== 'rect') return;
    const fillAttr = e.target.getAttribute('fill');
    if (tag === 'rect' && fillAttr !== 'white' && fillAttr !== 'url(#grid)') return;

    onSelect(null);
    onMultiSelect?.([]);

    const { x, y } = getSVGCoords(e);
    const start = { x, y };

    const onMv = (me) => {
      const { x: cx, y: cy } = getSVGCoords(me);
      setSelRect({ x0: Math.min(start.x, cx), y0: Math.min(start.y, cy), x1: Math.max(start.x, cx), y1: Math.max(start.y, cy) });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMv);
      window.removeEventListener('mouseup', onUp);
      setSelRect(sr => {
        if (sr && (sr.x1 - sr.x0 > 5 || sr.y1 - sr.y0 > 5)) {
          const hit = elements.filter(el => el.x + el.width > sr.x0 && el.x < sr.x1 && el.y + el.height > sr.y0 && el.y < sr.y1).map(el => el.id);
          if (hit.length === 1) { onSelect(hit[0]); onMultiSelect?.([]); }
          else if (hit.length > 1) { onMultiSelect?.(hit); onSelect(null); }
        }
        return null;
      });
    };
    window.addEventListener('mousemove', onMv);
    window.addEventListener('mouseup', onUp);
  };

  // Mouse move for room draw cursor
  const handleMouseMove = (e) => {
    if (!drawingRoom) return;
    const { x, y } = getSVGCoords(e);
    setDrawCursor({ x: snap(x), y: snap(y) });
  };

  const layerOrder = ['walkway', 'wall', 'column'];
  const bottomEls = elements.filter(e => layerOrder.includes(e.type));
  const topEls = elements.filter(e => !layerOrder.includes(e.type));

  return (
    <div ref={containerRef} className="relative overflow-hidden border border-slate-300 dark:border-border rounded-xl bg-slate-100 dark:bg-slate-800 flex-1 min-h-0"
      style={{ height: '100%' }}>

      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-white dark:bg-card border border-slate-200 dark:border-border rounded-lg shadow-sm px-1.5 py-1">
        <button onClick={zoomOut} className="p-1 hover:bg-slate-100 dark:hover:bg-accent/10 rounded" title="Alejar (Ctrl+Scroll)">
          <ZoomOut className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
        </button>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={zoomIn} className="p-1 hover:bg-slate-100 dark:hover:bg-accent/10 rounded" title="Acercar">
          <ZoomIn className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
        </button>
        <button onClick={zoomReset} className="p-1 hover:bg-slate-100 dark:hover:bg-accent/10 rounded" title="Restablecer">
          <Maximize2 className="w-3 h-3 text-slate-500" />
        </button>
      </div>

      {drawingRoom && (
        <div className="absolute top-2 left-2 z-10 bg-indigo-600 text-white text-xs rounded-lg px-3 py-1.5 shadow">
          Modo dibujo sala · Clic para añadir punto · Clic en inicio para cerrar
        </div>
      )}

      <div style={{ overflow: 'auto', width: '100%', height: '100%' }}>
        <svg
          ref={svgRef}
          width={width * zoom}
          height={height * zoom}
          onMouseDown={handleBgMouseDown}
          onMouseMove={handleMouseMove}
          style={{ display: 'block', cursor: drawingRoom ? 'crosshair' : 'default' }}
        >
          <defs>
            <pattern id="grid" width={GRID * zoom} height={GRID * zoom} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID * zoom} 0 L 0 0 0 ${GRID * zoom}`} fill="none" stroke="#CBD5E1" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width={width * zoom} height={height * zoom} fill="white" />
          <rect width={width * zoom} height={height * zoom} fill="url(#grid)" />

          <g transform={`scale(${zoom})`}>
            {/* Room polygon */}
            <RoomDrawing
              points={roomPolygon}
              isDrawing={drawingRoom}
              currentPoint={drawingRoom ? drawCursor : null}
            />

            {/* Elements */}
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
              <rect x={selRect.x0} y={selRect.y0} width={selRect.x1 - selRect.x0} height={selRect.y1 - selRect.y0}
                fill="#2563EB" fillOpacity={0.08} stroke="#2563EB" strokeWidth={1.5} strokeDasharray="5 3" pointerEvents="none" />
            )}

            {/* Alignment guides */}
            {guides.x != null && (
              <line x1={guides.x} y1={0} x2={guides.x} y2={height}
                stroke="#F43F5E" strokeWidth={1} strokeDasharray="4 3" pointerEvents="none" />
            )}
            {guides.y != null && (
              <line x1={0} y1={guides.y} x2={width} y2={guides.y}
                stroke="#F43F5E" strokeWidth={1} strokeDasharray="4 3" pointerEvents="none" />
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}