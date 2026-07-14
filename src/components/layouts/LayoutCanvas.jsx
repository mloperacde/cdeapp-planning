import { useRef, useState, useCallback, useEffect } from 'react';
import { getElementConfig } from './ElementPalette';
import { renderShape } from './ElementShapes';
import { ZoomIn, ZoomOut, Maximize2, Grid3x3 } from 'lucide-react';

const GRID = 10;
const snap = v => Math.round(v / GRID) * GRID;
const GUIDE_THRESHOLD = 6;

/** Single element with drop shadow and clean handles */
function LayoutElement({ el, selected, multiSelected, onPointerDown, onResize }) {
  const cfg = getElementConfig(el.type);
  const color = el.color || cfg.color;

  return (
    <g
      transform={`translate(${el.x},${el.y}) rotate(${el.rotation || 0} ${el.width / 2} ${el.height / 2})`}
      onMouseDown={(e) => onPointerDown(e, el.id)}
      style={{ cursor: 'move', userSelect: 'none' }}
      filter={selected ? 'url(#el-selected-shadow)' : 'url(#el-shadow)'}
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
          <rect width={st.width || 32} height={st.height || 22} rx={4}
            fill="#fff" fillOpacity={0.5} stroke="#fff" strokeWidth={0.8} />
          <text x={(st.width || 32) / 2} y={(st.height || 22) / 2 + 4}
            textAnchor="middle" fontSize={7} fill="#1F2937" pointerEvents="none"
            fontFamily="Inter, sans-serif" fontWeight="600">{st.name}</text>
        </g>
      ))}

      {/* Resize handle — bottom-right corner */}
      {selected && (
        <g>
          <rect
            x={el.width - 12} y={el.height - 12}
            width={12} height={12}
            fill="#2563EB" rx={3}
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
          {/* corner dots */}
          {[[0, 0], [el.width, 0], [0, el.height]].map(([cx, cy], i) => (
            <rect key={i} x={cx - 4} y={cy - 4} width={8} height={8} rx={2} fill="#fff" stroke="#2563EB" strokeWidth={1.5} pointerEvents="none" />
          ))}
        </g>
      )}

      {multiSelected && !selected && (
        <rect width={el.width} height={el.height} rx={5}
          fill="rgba(37,99,235,0.06)" stroke="#2563EB" strokeWidth={1.5} strokeDasharray="6 3" pointerEvents="none" />
      )}
    </g>
  );
}

/** Professional room floor with wall thickness, texture, and room label */
function RoomFloor({ points, isDrawing, currentPoint, floorColor, snapToClose, selected, onPointerDown, onVertexDrag }) {
  if (points.length === 0 && !isDrawing) return null;
  const ptStr = points.map(p => `${p.x},${p.y}`).join(' ');
  const allPts = currentPoint ? [...points, currentPoint] : points;
  const allStr = allPts.map(p => `${p.x},${p.y}`).join(' ');
  const wallColor = '#1e293b';
  const fill = floorColor || '#CBD5E1';

  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const bbX = xs.length ? Math.min(...xs) : 0, bbY = ys.length ? Math.min(...ys) : 0;
  const bbW = xs.length ? Math.max(...xs) - bbX : 0, bbH = ys.length ? Math.max(...ys) - bbY : 0;

  return (
    <g>
      {points.length > 2 && (
        <>
          {/* Floor fill */}
          <polygon points={ptStr} fill={fill}
            style={{ cursor: isDrawing ? 'crosshair' : 'move', userSelect: 'none' }}
            onMouseDown={!isDrawing ? (e) => onPointerDown?.(e, '__room_floor__') : undefined}
          />
          {/* Floor texture dots */}
          <polygon points={ptStr} fill="url(#floor-pattern)" fillOpacity={0.35} pointerEvents="none" />
          {/* Inner wall shadow */}
          <polygon points={ptStr} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={12} strokeLinejoin="round" pointerEvents="none" />
          {/* Wall outline — thick */}
          <polygon points={ptStr} fill="none" stroke={wallColor} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" pointerEvents="none" />
          {/* Wall inner highlight */}
          <polygon points={ptStr} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={2} strokeLinejoin="round" pointerEvents="none" />
          {/* Selection dashes */}
          {selected && !isDrawing && (
            <polygon points={ptStr} fill="rgba(37,99,235,0.05)" stroke="#2563EB" strokeWidth={2} strokeDasharray="10 5" strokeLinejoin="round" pointerEvents="none" />
          )}
        </>
      )}

      {/* Drawing preview */}
      {isDrawing && allPts.length > 1 && (
        <polyline points={allStr} fill="none" stroke={wallColor} strokeWidth={3} strokeDasharray="10 6" strokeLinecap="round" pointerEvents="none" />
      )}
      {isDrawing && allPts.length > 2 && (
        <polygon points={allStr} fill={fill} fillOpacity={0.3} stroke="none" pointerEvents="none" />
      )}

      {/* Vertex handles */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={isDrawing ? 8 : 12}
            fill="transparent"
            style={{ cursor: isDrawing ? 'default' : 'grab' }}
            onMouseDown={!isDrawing ? (e) => { e.stopPropagation(); onVertexDrag?.(e, i); } : undefined}
          />
          <circle cx={p.x} cy={p.y} r={isDrawing ? 5 : 7}
            fill={selected && !isDrawing ? '#2563EB' : '#fff'}
            stroke={selected && !isDrawing ? '#fff' : wallColor} strokeWidth={2.5}
            pointerEvents="none" />
          <circle cx={p.x} cy={p.y} r={isDrawing ? 2 : 3}
            fill={selected && !isDrawing ? '#fff' : wallColor}
            pointerEvents="none" />
          <text x={p.x + 12} y={p.y - 8} fontSize={9} fill={wallColor} fontWeight="700"
            fontFamily="Inter, monospace" pointerEvents="none">{i + 1}</text>
        </g>
      ))}

      {/* Snap-to-close indicator */}
      {points.length >= 2 && isDrawing && (
        <>
          <circle cx={points[0].x} cy={points[0].y} r={snapToClose ? 16 : 20}
            fill={snapToClose ? '#10B981' : 'none'}
            fillOpacity={snapToClose ? 0.2 : 0}
            stroke={snapToClose ? '#10B981' : '#F59E0B'}
            strokeWidth={snapToClose ? 3 : 2}
            strokeDasharray={snapToClose ? 'none' : '5 3'}
            pointerEvents="none" />
          <text x={points[0].x + 22} y={points[0].y - 12} fontSize={10}
            fill={snapToClose ? '#10B981' : '#F59E0B'} fontWeight="700" fontFamily="Inter, sans-serif" pointerEvents="none">
            {snapToClose ? '✓ Cerrar' : 'Inicio'}
          </text>
        </>
      )}

      {/* Room label when selected */}
      {selected && !isDrawing && points.length > 2 && (
        <text x={bbX + bbW / 2} y={bbY - 12} textAnchor="middle" fontSize={10} fill="#2563EB"
          fontWeight="700" fontFamily="Inter, sans-serif" pointerEvents="none">
          🏠 Suelo de Sala
        </text>
      )}

      {/* Dimension labels */}
      {!isDrawing && points.length > 2 && (
        <text x={bbX + bbW / 2} y={bbY + bbH + 16} textAnchor="middle" fontSize={9} fill="#64748b"
          fontFamily="Inter, monospace" pointerEvents="none">
          {Math.round(bbW)} × {Math.round(bbH)} px
        </text>
      )}
    </g>
  );
}

/** Ruler tick marks for professional measurement feel */
function Rulers({ width, height, zoom, pan, GRID }) {
  const majorEvery = 100, minorEvery = 10;
  const ticks = [];
  for (let x = 0; x <= width; x += minorEvery) {
    const isMajor = x % majorEvery === 0;
    ticks.push(<line key={`rx${x}`} x1={x} y1={height} x2={x} y2={height - (isMajor ? 8 : 4)}
      stroke="#94a3b8" strokeWidth={isMajor ? 1 : 0.5} />);
    if (isMajor && x > 0) ticks.push(
      <text key={`rtx${x}`} x={x} y={height - 10} textAnchor="middle" fontSize={7}
        fill="#94a3b8" fontFamily="monospace">{x}</text>
    );
  }
  for (let y = 0; y <= height; y += minorEvery) {
    const isMajor = y % majorEvery === 0;
    ticks.push(<line key={`ry${y}`} x1={0} y1={y} x2={isMajor ? 8 : 4} y2={y}
      stroke="#94a3b8" strokeWidth={isMajor ? 1 : 0.5} />);
    if (isMajor && y > 0) ticks.push(
      <text key={`rty${y}`} x={10} y={y + 3} fontSize={7}
        fill="#94a3b8" fontFamily="monospace">{y}</text>
    );
  }
  return <g pointerEvents="none">{ticks}</g>;
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
  onFinishDrawingRoom,
  drawingRoom = false,
  floorColor,
  width = 1200,
  height = 800,
  svgRef: externalSvgRef,
  inventory = [],
  highlightedElementId = null,
}) {
  const FLOOR_ID = '__room_floor__';
  const internalSvgRef = useRef(null);
  const svgRef = externalSvgRef || internalSvgRef;
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selRect, setSelRect] = useState(null);
  const [guides, setGuides] = useState({ x: null, y: null });
  const [drawCursor, setDrawCursor] = useState(null);
  const [snapToClose, setSnapToClose] = useState(false);
  const [showRulers, setShowRulers] = useState(true);

  const CLOSE_RADIUS = 22;

  const zoomIn = () => setZoom(z => Math.min(4, +(z + 0.2).toFixed(2)));
  const zoomOut = () => setZoom(z => Math.max(0.2, +(z - 0.2).toFixed(2)));
  const zoomReset = () => { setZoom(0.85); setPan({ x: 0, y: 0 }); };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom(z => Math.min(4, Math.max(0.2, +(z + (e.deltaY > 0 ? -0.1 : 0.1)).toFixed(2))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const getSVGCoords = useCallback((e) => {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom - pan.x,
      y: (e.clientY - rect.top) / zoom - pan.y,
    };
  }, [zoom, pan]);

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

  const startVertexDrag = useCallback((e, vertexIdx) => {
    e.stopPropagation();
    onSelect('__room_floor__');
    onMultiSelect?.([]);
    const origPoints = roomPolygon.map(p => ({ ...p }));
    const startX = e.clientX / zoom, startY = e.clientY / zoom;
    const origPt = origPoints[vertexIdx];
    const onMv = (me) => {
      const dx = me.clientX / zoom - startX, dy = me.clientY / zoom - startY;
      const updated = origPoints.map((p, i) => i === vertexIdx ? { x: snap(origPt.x + dx), y: snap(origPt.y + dy) } : p);
      onRoomPolygonChange?.(updated);
    };
    const onUp = () => { window.removeEventListener('mousemove', onMv); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMv);
    window.addEventListener('mouseup', onUp);
  }, [roomPolygon, onRoomPolygonChange, onSelect, onMultiSelect, zoom]);

  const startMoveFloor = useCallback((e) => {
    e.stopPropagation();
    onSelect(FLOOR_ID);
    onMultiSelect?.([]);
    const startX = e.clientX / zoom, startY = e.clientY / zoom;
    const origPoints = roomPolygon.map(p => ({ ...p }));
    const onMv = (me) => {
      const dx = snap(me.clientX / zoom - startX), dy = snap(me.clientY / zoom - startY);
      onRoomPolygonChange?.(origPoints.map(p => ({ x: p.x + dx, y: p.y + dy })));
    };
    const onUp = () => { window.removeEventListener('mousemove', onMv); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMv);
    window.addEventListener('mouseup', onUp);
  }, [roomPolygon, onRoomPolygonChange, onSelect, onMultiSelect, zoom]);

  const startMove = useCallback((e, id) => {
    e.stopPropagation();
    if (id === FLOOR_ID) { startMoveFloor(e); return; }
    if (e.shiftKey) {
      const next = selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id];
      onMultiSelect?.(next); onSelect(null); return;
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
        if (idsToMove.length === 1 && movingEl) computeGuides(eid, nx, ny, movingEl.width, movingEl.height);
      });
    };
    const onUp = () => { setGuides({ x: null, y: null }); window.removeEventListener('mousemove', onMv); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMv);
    window.addEventListener('mouseup', onUp);
  }, [elements, selectedIds, onSelect, onMultiSelect, onUpdateElement, computeGuides, zoom, startMoveFloor]);

  const handleResize = useCallback((id, w, h) => {
    onUpdateElement(id, { width: Math.max(20, w), height: Math.max(20, h) });
  }, [onUpdateElement]);

  const isNearFirstPoint = useCallback((clientX, clientY) => {
    if (roomPolygon.length < 2) return false;
    const svg = svgRef.current;
    if (!svg) return false;
    const rect = svg.getBoundingClientRect();
    const sx = (roomPolygon[0].x + pan.x) * zoom + rect.left;
    const sy = (roomPolygon[0].y + pan.y) * zoom + rect.top;
    const dx = clientX - sx, dy = clientY - sy;
    return Math.sqrt(dx * dx + dy * dy) < CLOSE_RADIUS;
  }, [roomPolygon, zoom, pan]);

  const handleBgMouseDown = (e) => {
    if (drawingRoom) {
      if (e.button === 2) { e.preventDefault(); if (roomPolygon.length > 0) onRoomPolygonChange?.(roomPolygon.slice(0, -1)); return; }
      if (isNearFirstPoint(e.clientX, e.clientY)) { onFinishDrawingRoom?.(); return; }
      const { x, y } = getSVGCoords(e);
      onRoomPolygonChange?.([...roomPolygon, { x: snap(x), y: snap(y) }]);
      return;
    }
    const tag = e.target.tagName;
    if (tag !== 'svg' && tag !== 'rect') return;
    const fillAttr = e.target.getAttribute('fill');
    if (tag === 'rect' && fillAttr !== 'white' && fillAttr !== '#f8fafc' && fillAttr !== 'url(#canvas-grid)') return;
    onSelect(null); onMultiSelect?.([]);
    const { x, y } = getSVGCoords(e);
    const start = { x, y };
    const onMv = (me) => {
      const { x: cx, y: cy } = getSVGCoords(me);
      setSelRect({ x0: Math.min(start.x, cx), y0: Math.min(start.y, cy), x1: Math.max(start.x, cx), y1: Math.max(start.y, cy) });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMv); window.removeEventListener('mouseup', onUp);
      setSelRect(sr => {
        if (sr && (sr.x1 - sr.x0 > 5 || sr.y1 - sr.y0 > 5)) {
          const hit = elements.filter(el => el.x + el.width > sr.x0 && el.x < sr.x1 && el.y + el.height > sr.y0 && el.y < sr.y1).map(el => el.id);
          if (hit.length === 1) { onSelect(hit[0]); onMultiSelect?.([]); }
          else if (hit.length > 1) { onMultiSelect?.(hit); onSelect(null); }
        }
        return null;
      });
    };
    window.addEventListener('mousemove', onMv); window.addEventListener('mouseup', onUp);
  };

  const handleDblClick = (e) => {
    if (!drawingRoom || roomPolygon.length < 3) return;
    e.preventDefault(); onFinishDrawingRoom?.();
  };

  const handleMouseMove = (e) => {
    if (!drawingRoom) return;
    const near = isNearFirstPoint(e.clientX, e.clientY);
    setSnapToClose(near);
    if (near && roomPolygon.length >= 2) setDrawCursor({ x: roomPolygon[0].x, y: roomPolygon[0].y });
    else { const { x, y } = getSVGCoords(e); setDrawCursor({ x: snap(x), y: snap(y) }); }
  };

  const layerOrder = ['walkway', 'wall', 'column'];
  const bottomEls = elements.filter(e => layerOrder.includes(e.type));
  const topEls = elements.filter(e => !layerOrder.includes(e.type));

  return (
    <div ref={containerRef}
      className="relative overflow-hidden border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-900 flex-1 min-h-0"
      style={{ height: '100%', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)' }}>

      {/* Controls bar */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-lg shadow-md px-2 py-1">
        <button onClick={zoomOut} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors" title="Alejar">
          <ZoomOut className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
        </button>
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <button onClick={zoomIn} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors" title="Acercar">
          <ZoomIn className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
        </button>
        <button onClick={zoomReset} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors" title="Ajustar">
          <Maximize2 className="w-3 h-3 text-slate-500" />
        </button>
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5" />
        <button onClick={() => setShowRulers(r => !r)}
          className={`p-1 rounded transition-colors ${showRulers ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' : 'hover:bg-slate-100 text-slate-500'}`}
          title="Reglas">
          <Grid3x3 className="w-3 h-3" />
        </button>
      </div>

      {/* Drawing mode banner */}
      {drawingRoom && (
        <div className="absolute top-2 left-2 z-10 bg-indigo-700/95 backdrop-blur text-white text-xs rounded-xl px-4 py-2.5 shadow-xl border border-indigo-500/50 space-y-0.5">
          <div className="font-bold text-sm">✏️ Modo Dibujo de Sala</div>
          <div className="text-indigo-200">· Clic = añadir vértice</div>
          <div className="text-indigo-200">· Doble clic = cerrar polígono</div>
          <div className="text-indigo-200">· Clic derecho = deshacer punto</div>
          <div className="text-indigo-300 font-semibold mt-0.5">{roomPolygon.length} puntos añadidos</div>
        </div>
      )}

      <div style={{ overflow: 'auto', width: '100%', height: '100%' }}>
        <svg
          ref={svgRef}
          width={width * zoom}
          height={height * zoom}
          onMouseDown={handleBgMouseDown}
          onMouseMove={handleMouseMove}
          onDoubleClick={handleDblClick}
          onContextMenu={(e) => { if (drawingRoom) e.preventDefault(); }}
          style={{ display: 'block', cursor: drawingRoom ? (snapToClose ? 'cell' : 'crosshair') : 'default' }}
        >
          <defs>
            {/* Fine grid pattern */}
            <pattern id="canvas-grid-minor" width={GRID * zoom} height={GRID * zoom} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID * zoom} 0 L 0 0 0 ${GRID * zoom}`} fill="none" stroke="#E2E8F0" strokeWidth="0.4" />
            </pattern>
            <pattern id="canvas-grid" width={100 * zoom} height={100 * zoom} patternUnits="userSpaceOnUse">
              <rect width={100 * zoom} height={100 * zoom} fill="url(#canvas-grid-minor)" />
              <path d={`M ${100 * zoom} 0 L 0 0 0 ${100 * zoom}`} fill="none" stroke="#CBD5E1" strokeWidth="0.8" />
            </pattern>
            {/* Floor texture */}
            <pattern id="floor-pattern" width={20} height={20} patternUnits="userSpaceOnUse" patternTransform={`scale(${zoom})`}>
              <rect width={20} height={20} fill="none" />
              <circle cx={10} cy={10} r={1} fill="rgba(0,0,0,0.07)" />
            </pattern>
            {/* Drop shadows */}
            <filter id="el-shadow" x="-15%" y="-15%" width="130%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" floodColor="#000" />
            </filter>
            <filter id="el-selected-shadow" x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="3" stdDeviation="5" floodOpacity="0.2" floodColor="#2563EB" />
            </filter>
          </defs>

          {/* Canvas background */}
          <rect width={width * zoom} height={height * zoom} fill="#f8fafc" />
          <rect width={width * zoom} height={height * zoom} fill="url(#canvas-grid)" />

          {/* Canvas border */}
          <rect x={0.5} y={0.5} width={width * zoom - 1} height={height * zoom - 1}
            fill="none" stroke="#CBD5E1" strokeWidth={1} strokeDasharray="8 4" />

          <g transform={`scale(${zoom})`}>
            {/* Rulers */}
            {showRulers && <Rulers width={width} height={height} zoom={zoom} pan={pan} GRID={GRID} />}

            {/* Room floor */}
            <RoomFloor
              points={roomPolygon}
              isDrawing={drawingRoom}
              currentPoint={drawingRoom ? drawCursor : null}
              floorColor={floorColor}
              snapToClose={snapToClose}
              selected={selectedId === FLOOR_ID}
              onPointerDown={startMove}
              onVertexDrag={startVertexDrag}
            />

            {/* Elements */}
            {[...bottomEls, ...topEls].map(el => {
              // Compute inventory code: auto-generated from element type, overridden by persisted inventory
              const cfg = getElementConfig(el.type) || {};
              const baseLabel = (el.label || cfg.label || el.type || 'EL').toUpperCase();
              const prefix = (baseLabel.replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'EL');
              // Count instance number among same-type elements (stable order)
              const sameTypeEls = elements.filter(e => e.type === el.type);
              const instanceNum = sameTypeEls.indexOf(el) + 1;
              const autoMarca = `${prefix}-${String(instanceNum).padStart(2, '0')}`;
              const invItem = inventory.find(i => i.source_element_id === el.id);
              const marca = invItem?.marca || autoMarca;
              const isHighlighted = highlightedElementId === el.id;
              return (
                <g key={el.id}>
                  <LayoutElement
                    el={el}
                    selected={selectedId === el.id}
                    multiSelected={selectedIds.includes(el.id) || isHighlighted}
                    onPointerDown={startMove}
                    onResize={handleResize}
                  />
                  {/* Inventory code badge — shown when element has a marca assigned */}
                  {marca && (
                    <g transform={`translate(${el.x},${el.y}) rotate(${el.rotation || 0} ${el.width / 2} ${el.height / 2})`} pointerEvents="none">
                      <rect
                        x={el.width / 2 - (marca.length * 3.5 + 4)}
                        y={el.height - 14}
                        width={marca.length * 7 + 8}
                        height={13}
                        rx={3}
                        fill={isHighlighted ? '#2563EB' : 'rgba(15,23,42,0.75)'}
                        stroke={isHighlighted ? '#93C5FD' : 'rgba(255,255,255,0.2)'}
                        strokeWidth={0.8}
                      />
                      <text
                        x={el.width / 2}
                        y={el.height - 5}
                        textAnchor="middle"
                        fontSize={7.5}
                        fontFamily="monospace"
                        fontWeight="700"
                        fill="#FFFFFF"
                        letterSpacing={0.5}
                      >{marca}</text>
                    </g>
                  )}
                  {/* Inventory highlight ring */}
                  {isHighlighted && (
                    <rect
                      x={el.x - 3} y={el.y - 3}
                      width={el.width + 6} height={el.height + 6}
                      rx={7} fill="none"
                      stroke="#2563EB" strokeWidth={2} strokeDasharray="6 3"
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            })}

            {/* Selection rect */}
            {selRect && (
              <rect x={selRect.x0} y={selRect.y0} width={selRect.x1 - selRect.x0} height={selRect.y1 - selRect.y0}
                fill="rgba(37,99,235,0.06)" stroke="#2563EB" strokeWidth={1.5} strokeDasharray="6 3" pointerEvents="none" />
            )}

            {/* Alignment guides */}
            {guides.x != null && (
              <line x1={guides.x} y1={0} x2={guides.x} y2={height}
                stroke="#F43F5E" strokeWidth={1} strokeDasharray="5 3" pointerEvents="none" />
            )}
            {guides.y != null && (
              <line x1={0} y1={guides.y} x2={width} y2={guides.y}
                stroke="#F43F5E" strokeWidth={1} strokeDasharray="5 3" pointerEvents="none" />
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}