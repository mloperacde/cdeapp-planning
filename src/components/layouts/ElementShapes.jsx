/**
 * SVG shapes for each element type in the room layout editor.
 * Each function receives { width, height, color, label, selected } and returns SVG content (no <g> wrapper).
 */

const LABEL_STYLE = { pointerEvents: 'none', fontFamily: 'sans-serif', fontWeight: '600' };

function labelFontSize(label = '', w) {
  const len = label.length || 8;
  return Math.max(7, Math.min(12, w / len * 1.4));
}

// ── Machine (generic) ────────────────────────────────────────────────────────
export function ShapeMachine({ width: W, height: H, color, label, selected }) {
  return (
    <>
      <rect width={W} height={H} rx={6} fill={color} fillOpacity={0.9}
        stroke={selected ? '#1D4ED8' : '#fff'} strokeWidth={selected ? 2.5 : 1.5} />
      {/* gear hint */}
      <circle cx={W / 2} cy={H / 2} r={Math.min(W, H) * 0.22} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
      <circle cx={W / 2} cy={H / 2} r={Math.min(W, H) * 0.1} fill="rgba(255,255,255,0.35)" />
      <text x={W / 2} y={H - 7} textAnchor="middle" fontSize={labelFontSize(label, W)} fill="#fff" style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Star plate (plato estrella) ───────────────────────────────────────────────
export function ShapeStarPlate({ width: W, height: H, color, label, selected }) {
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.38;
  const r = R * 0.45;
  const n = 8;
  const pts = Array.from({ length: n * 2 }, (_, i) => {
    const angle = (i * Math.PI) / n - Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    return `${cx + rad * Math.cos(angle)},${cy + rad * Math.sin(angle)}`;
  }).join(' ');
  return (
    <>
      <rect width={W} height={H} rx={4} fill={color} fillOpacity={0.15}
        stroke={selected ? '#1D4ED8' : color} strokeWidth={selected ? 2.5 : 1.5} />
      <polygon points={pts} fill={color} fillOpacity={0.85} stroke="#fff" strokeWidth={1} />
      <circle cx={cx} cy={cy} r={r * 0.5} fill="#fff" fillOpacity={0.6} />
      <text x={W / 2} y={H - 5} textAnchor="middle" fontSize={labelFontSize(label, W)} fill={color} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Dosing cart (carro dosificador) ──────────────────────────────────────────
export function ShapeDosingCart({ width: W, height: H, color, label, selected }) {
  return (
    <>
      <rect width={W} height={H} rx={4} fill={color} fillOpacity={0.1}
        stroke={selected ? '#1D4ED8' : color} strokeWidth={selected ? 2.5 : 1.5} />
      {/* body */}
      <rect x={W * 0.1} y={H * 0.1} width={W * 0.8} height={H * 0.55} rx={3}
        fill={color} fillOpacity={0.8} />
      {/* wheels */}
      {[0.2, 0.8].map((fx, i) => (
        <circle key={i} cx={W * fx} cy={H * 0.82} r={H * 0.1} fill={color} stroke="#fff" strokeWidth={1.5} />
      ))}
      {/* nozzles row */}
      {[0.25, 0.4, 0.55, 0.7, 0.85].map((fx, i) => (
        <line key={i} x1={W * fx} y1={H * 0.65} x2={W * fx} y2={H * 0.7} stroke="#fff" strokeWidth={2} />
      ))}
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={labelFontSize(label, W)} fill={color} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Nozzles / boquillas ───────────────────────────────────────────────────────
export function ShapeNozzles({ width: W, height: H, color, label, selected }) {
  const count = Math.max(2, Math.floor(W / 18));
  const step = W / (count + 1);
  return (
    <>
      <rect width={W} height={H} rx={4} fill={color} fillOpacity={0.12}
        stroke={selected ? '#1D4ED8' : color} strokeWidth={selected ? 2.5 : 1.5} />
      {/* header bar */}
      <rect x={0} y={0} width={W} height={H * 0.3} rx={4} fill={color} fillOpacity={0.7} />
      {/* nozzle bodies */}
      {Array.from({ length: count }).map((_, i) => (
        <g key={i} transform={`translate(${step * (i + 1) - 4},${H * 0.3})`}>
          <rect width={8} height={H * 0.4} rx={2} fill={color} fillOpacity={0.85} />
          {/* tip */}
          <polygon points={`0,${H * 0.4} 8,${H * 0.4} 4,${H * 0.55}`} fill={color} />
        </g>
      ))}
      <text x={W / 2} y={H - 3} textAnchor="middle" fontSize={labelFontSize(label, W)} fill={color} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Rotary accumulator plate ──────────────────────────────────────────────────
export function ShapeRotaryAccumulator({ width: W, height: H, color, label, selected }) {
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.42;
  return (
    <>
      <rect width={W} height={H} rx={4} fill={color} fillOpacity={0.1}
        stroke={selected ? '#1D4ED8' : color} strokeWidth={selected ? 2.5 : 1.5} />
      <circle cx={cx} cy={cy} r={R} fill={color} fillOpacity={0.75} stroke="#fff" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={R * 0.55} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} strokeDasharray="4 3" />
      {/* rotation arrows */}
      {[0, 90, 180, 270].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <text key={i} x={cx + R * 0.75 * Math.cos(rad)} y={cy + R * 0.75 * Math.sin(rad) + 4}
            textAnchor="middle" fontSize={9} fill="#fff" style={{ pointerEvents: 'none' }}>↺</text>
        );
      })}
      <circle cx={cx} cy={cy} r={R * 0.18} fill="#fff" fillOpacity={0.7} />
      <text x={W / 2} y={H - 5} textAnchor="middle" fontSize={labelFontSize(label, W)} fill={color} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Conveyor belt ─────────────────────────────────────────────────────────────
export function ShapeConveyor({ width: W, height: H, color, label, selected }) {
  const r = H / 2;
  return (
    <>
      <rect width={W} height={H} rx={r} fill={color} fillOpacity={0.85}
        stroke={selected ? '#1D4ED8' : '#fff'} strokeWidth={selected ? 2.5 : 1.5} />
      {/* pulley circles */}
      <circle cx={r} cy={H / 2} r={r * 0.7} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
      <circle cx={W - r} cy={H / 2} r={r * 0.7} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
      {/* belt slats */}
      {Array.from({ length: Math.floor((W - H) / 14) }).map((_, i) => (
        <line key={i} x1={r + 14 * i + 7} y1={H * 0.15} x2={r + 14 * i + 7} y2={H * 0.85}
          stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
      ))}
      {/* arrow */}
      <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fontSize={11} fill="#fff" style={{ pointerEvents: 'none' }}>→</text>
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={labelFontSize(label, W)} fill="#fff" style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── IBC / Bulk container ──────────────────────────────────────────────────────
export function ShapeIBC({ width: W, height: H, color, label, selected }) {
  return (
    <>
      <rect width={W} height={H} rx={4} fill={color} fillOpacity={0.1}
        stroke={selected ? '#1D4ED8' : color} strokeWidth={selected ? 2.5 : 1.5} />
      {/* IBC cage */}
      <rect x={W * 0.08} y={H * 0.08} width={W * 0.84} height={H * 0.72} rx={3}
        fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1.5} />
      {/* inner tank */}
      <rect x={W * 0.16} y={H * 0.14} width={W * 0.68} height={H * 0.58} rx={2}
        fill={color} fillOpacity={0.55} />
      {/* grid lines on cage */}
      {[0.33, 0.66].map((f, i) => (
        <line key={`v${i}`} x1={W * 0.08 + W * 0.84 * f} y1={H * 0.08}
          x2={W * 0.08 + W * 0.84 * f} y2={H * 0.8} stroke={color} strokeWidth={0.8} />
      ))}
      {[0.4, 0.7].map((f, i) => (
        <line key={`h${i}`} x1={W * 0.08} y1={H * 0.08 + H * 0.72 * f}
          x2={W * 0.92} y2={H * 0.08 + H * 0.72 * f} stroke={color} strokeWidth={0.8} />
      ))}
      {/* pallet base */}
      <rect x={W * 0.05} y={H * 0.82} width={W * 0.9} height={H * 0.12} rx={2}
        fill="#92400E" fillOpacity={0.6} />
      {/* outlet */}
      <rect x={W * 0.42} y={H * 0.79} width={W * 0.16} height={H * 0.06} rx={2}
        fill={color} fillOpacity={0.9} />
      <text x={W / 2} y={H - 3} textAnchor="middle" fontSize={labelFontSize(label, W)} fill={color} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Storage / Pallet ──────────────────────────────────────────────────────────
export function ShapePallet({ width: W, height: H, color, label, selected }) {
  const cols = Math.max(1, Math.floor(W / 22));
  const rows = Math.max(1, Math.floor((H - 18) / 16));
  const bw = (W - 8) / cols - 2;
  const bh = (H - 22) / rows - 2;
  return (
    <>
      {/* pallet base */}
      <rect width={W} height={H} rx={4} fill="#FEF3C7"
        stroke={selected ? '#1D4ED8' : '#D97706'} strokeWidth={selected ? 2.5 : 1.5} />
      <rect x={0} y={H - 14} width={W} height={14} rx={3} fill="#D97706" fillOpacity={0.6} />
      {/* boards */}
      {[0.15, 0.48, 0.81].map((f, i) => (
        <rect key={i} x={0} y={H - 14 + H * 0.01 + i * 3.5} width={W} height={3} fill="#92400E" fillOpacity={0.5} />
      ))}
      {/* boxes */}
      {Array.from({ length: rows }).map((_, ri) =>
        Array.from({ length: cols }).map((_, ci) => (
          <rect key={`${ri}-${ci}`}
            x={4 + ci * (bw + 2)} y={4 + ri * (bh + 2)}
            width={bw} height={bh} rx={2}
            fill={color} fillOpacity={0.75} stroke="#fff" strokeWidth={0.5} />
        ))
      )}
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={labelFontSize(label, W)} fill="#92400E" style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Inkjet coder ──────────────────────────────────────────────────────────────
export function ShapeInkjet({ width: W, height: H, color, label, selected }) {
  return (
    <>
      <rect width={W} height={H} rx={6} fill={color} fillOpacity={0.9}
        stroke={selected ? '#1D4ED8' : '#fff'} strokeWidth={selected ? 2.5 : 1.5} />
      {/* screen */}
      <rect x={W * 0.1} y={H * 0.1} width={W * 0.5} height={H * 0.45} rx={2}
        fill="#1E293B" fillOpacity={0.8} />
      {/* dot matrix */}
      {[0, 1, 2].map(r => [0, 1, 2, 3].map(c => (
        <circle key={`${r}${c}`} cx={W * 0.15 + c * 6} cy={H * 0.18 + r * 8}
          r={1.5} fill="#06B6D4" />
      )))}
      {/* nozzle */}
      <rect x={W * 0.72} y={H * 0.3} width={W * 0.2} height={H * 0.15} rx={2}
        fill="#fff" fillOpacity={0.6} />
      <text x={W / 2} y={H - 5} textAnchor="middle" fontSize={labelFontSize(label, W)} fill="#fff" style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Laser coder ───────────────────────────────────────────────────────────────
export function ShapeLaser({ width: W, height: H, color, label, selected }) {
  return (
    <>
      <rect width={W} height={H} rx={6} fill={color} fillOpacity={0.9}
        stroke={selected ? '#1D4ED8' : '#fff'} strokeWidth={selected ? 2.5 : 1.5} />
      <circle cx={W * 0.5} cy={H * 0.4} r={Math.min(W, H) * 0.2} fill="#fff" fillOpacity={0.2} />
      <line x1={W * 0.5} y1={H * 0.4} x2={W * 0.8} y2={H * 0.7} stroke="#FF0000" strokeWidth={1.5} strokeOpacity={0.8} />
      <line x1={W * 0.5} y1={H * 0.4} x2={W * 0.2} y2={H * 0.7} stroke="#FF0000" strokeWidth={1} strokeOpacity={0.4} />
      <text x={W / 2} y={H - 5} textAnchor="middle" fontSize={labelFontSize(label, W)} fill="#fff" style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Cartoner / estuchadora ────────────────────────────────────────────────────
export function ShapeCartoner({ width: W, height: H, color, label, selected }) {
  return (
    <>
      <rect width={W} height={H} rx={6} fill={color} fillOpacity={0.85}
        stroke={selected ? '#1D4ED8' : '#fff'} strokeWidth={selected ? 2.5 : 1.5} />
      {/* box shape */}
      <rect x={W * 0.1} y={H * 0.15} width={W * 0.35} height={H * 0.55} rx={2}
        fill="#fff" fillOpacity={0.3} stroke="#fff" strokeWidth={1} />
      {/* flap top */}
      <polygon points={`${W * 0.1},${H * 0.15} ${W * 0.45},${H * 0.15} ${W * 0.35},${H * 0.05}`}
        fill="#fff" fillOpacity={0.2} stroke="#fff" strokeWidth={0.5} />
      {/* arrow feed */}
      <text x={W * 0.7} y={H * 0.55} textAnchor="middle" fontSize={18} fill="#fff" fillOpacity={0.6} style={{ pointerEvents: 'none' }}>→</text>
      <text x={W / 2} y={H - 5} textAnchor="middle" fontSize={labelFontSize(label, W)} fill="#fff" style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Work table ────────────────────────────────────────────────────────────────
export function ShapeWorkTable({ width: W, height: H, color, label, selected }) {
  return (
    <>
      <rect width={W} height={H} rx={4} fill={color} fillOpacity={0.9}
        stroke={selected ? '#1D4ED8' : '#fff'} strokeWidth={selected ? 2.5 : 1.5} />
      {/* table legs */}
      {[0.08, 0.88].map((fx, i) => (
        <rect key={i} x={W * fx} y={H * 0.6} width={W * 0.07} height={H * 0.35} rx={1}
          fill="#fff" fillOpacity={0.4} />
      ))}
      {/* tabletop surface */}
      <rect x={W * 0.04} y={H * 0.12} width={W * 0.92} height={H * 0.5} rx={3}
        fill="#fff" fillOpacity={0.25} />
      <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fontSize={labelFontSize(label, W)} fill="#fff" style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Cabinet / Armario ─────────────────────────────────────────────────────────
export function ShapeCabinet({ width: W, height: H, color, label, selected }) {
  return (
    <>
      <rect width={W} height={H} rx={3} fill={color} fillOpacity={0.85}
        stroke={selected ? '#1D4ED8' : '#fff'} strokeWidth={selected ? 2.5 : 1.5} />
      {/* shelves */}
      {[0.28, 0.54, 0.78].map((f, i) => (
        <line key={i} x1={W * 0.06} y1={H * f} x2={W * 0.94} y2={H * f}
          stroke="#fff" strokeWidth={1} strokeOpacity={0.5} />
      ))}
      {/* door line */}
      <line x1={W / 2} y1={H * 0.04} x2={W / 2} y2={H * 0.96}
        stroke="#fff" strokeWidth={1} strokeOpacity={0.5} />
      {/* handles */}
      <circle cx={W * 0.42} cy={H * 0.5} r={2} fill="#fff" fillOpacity={0.7} />
      <circle cx={W * 0.58} cy={H * 0.5} r={2} fill="#fff" fillOpacity={0.7} />
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={labelFontSize(label, W)} fill="#fff" style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Door / Entry-Exit ─────────────────────────────────────────────────────────
export function ShapeDoor({ width: W, height: H, color, label, selected, type }) {
  const isExit = type === 'exit';
  return (
    <>
      <rect width={W} height={H} rx={3} fill={color} fillOpacity={0.85}
        stroke={selected ? '#1D4ED8' : '#fff'} strokeWidth={selected ? 2.5 : 1.5} />
      {/* arc */}
      <path d={`M ${W * 0.15},${H / 2} A ${W * 0.35},${H * 0.4} 0 0 ${isExit ? 0 : 1} ${W * 0.85},${H / 2}`}
        fill="none" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.7} />
      <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fontSize={9} fill="#fff" style={{ pointerEvents: 'none' }}>
        {isExit ? '⬆ OUT' : '⬇ IN'}
      </text>
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={labelFontSize(label, W)} fill="#fff" style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Walkway ───────────────────────────────────────────────────────────────────
export function ShapeWalkway({ width: W, height: H, color, label, selected }) {
  const dashed = Array.from({ length: Math.floor(W / 20) }, (_, i) => i);
  return (
    <>
      <rect width={W} height={H} rx={2} fill={color} fillOpacity={0.25}
        stroke={selected ? '#1D4ED8' : '#9CA3AF'} strokeWidth={selected ? 2 : 1}
        strokeDasharray={selected ? '' : '6 3'} />
      {dashed.map(i => (
        <line key={i} x1={10 + i * 20} y1={H / 2} x2={18 + i * 20} y2={H / 2}
          stroke="#6B7280" strokeWidth={1.5} strokeOpacity={0.5} />
      ))}
      <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fontSize={labelFontSize(label, W)} fill="#6B7280" style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Wall ──────────────────────────────────────────────────────────────────────
export function ShapeWall({ width: W, height: H, color, label, selected }) {
  const brickW = 20, brickH = 10;
  const rows = Math.ceil(H / brickH);
  const cols = Math.ceil(W / brickW) + 1;
  return (
    <>
      <rect width={W} height={H} fill={color}
        stroke={selected ? '#1D4ED8' : '#1F2937'} strokeWidth={selected ? 2.5 : 1} />
      {Array.from({ length: rows }).map((_, ri) =>
        Array.from({ length: cols }).map((_, ci) => {
          const offset = ri % 2 === 0 ? 0 : -brickW / 2;
          return (
            <rect key={`${ri}-${ci}`}
              x={ci * brickW + offset} y={ri * brickH}
              width={brickW - 1} height={brickH - 1}
              fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} />
          );
        })
      )}
    </>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────
export function ShapeColumn({ width: W, height: H, color, label, selected }) {
  return (
    <>
      <rect width={W} height={H} rx={2} fill={color}
        stroke={selected ? '#1D4ED8' : '#9CA3AF'} strokeWidth={selected ? 2.5 : 1.5} />
      <line x1={4} y1={4} x2={W - 4} y2={H - 4} stroke="#fff" strokeWidth={0.8} strokeOpacity={0.3} />
      <line x1={W - 4} y1={4} x2={4} y2={H - 4} stroke="#fff" strokeWidth={0.8} strokeOpacity={0.3} />
    </>
  );
}

// ── Line manager desk ─────────────────────────────────────────────────────────
export function ShapeManagerDesk({ width: W, height: H, color, label, selected }) {
  return (
    <>
      <rect width={W} height={H} rx={6} fill={color} fillOpacity={0.9}
        stroke={selected ? '#1D4ED8' : '#fff'} strokeWidth={selected ? 2.5 : 1.5} />
      {/* monitor */}
      <rect x={W * 0.25} y={H * 0.1} width={W * 0.5} height={H * 0.38} rx={2} fill="#1E293B" />
      <rect x={W * 0.43} y={H * 0.48} width={W * 0.14} height={H * 0.1} fill="#1E293B" />
      <rect x={W * 0.3} y={H * 0.58} width={W * 0.4} height={H * 0.06} rx={1} fill="#1E293B" />
      {/* keyboard */}
      <rect x={W * 0.2} y={H * 0.7} width={W * 0.6} height={H * 0.2} rx={2}
        fill="#fff" fillOpacity={0.3} />
      <text x={W / 2} y={H - 3} textAnchor="middle" fontSize={labelFontSize(label, W)} fill="#fff" style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Generic "other" ───────────────────────────────────────────────────────────
export function ShapeOther({ width: W, height: H, color, label, selected }) {
  return (
    <>
      <rect width={W} height={H} rx={6} fill={color} fillOpacity={0.8}
        stroke={selected ? '#1D4ED8' : '#fff'} strokeWidth={selected ? 2.5 : 1.5}
        strokeDasharray={selected ? '' : '5 3'} />
      <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fontSize={labelFontSize(label, W)} fill="#fff" style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Dispatch map ─────────────────────────────────────────────────────────────
export const SHAPE_MAP = {
  machine: ShapeMachine,
  star_plate: ShapeStarPlate,
  dosing_cart: ShapeDosingCart,
  nozzles: ShapeNozzles,
  rotary_accumulator: ShapeRotaryAccumulator,
  conveyor_belt: ShapeConveyor,
  container_bulk: ShapeIBC,
  storage: ShapePallet,
  inkjet_coder: ShapeInkjet,
  laser_coder: ShapeLaser,
  cartoner: ShapeCartoner,
  work_table: ShapeWorkTable,
  material_cabinet: ShapeCabinet,
  line_manager_desk: ShapeManagerDesk,
  entry: (p) => <ShapeDoor {...p} type="entry" />,
  exit: (p) => <ShapeDoor {...p} type="exit" />,
  walkway: ShapeWalkway,
  wall: ShapeWall,
  column: ShapeColumn,
  other: ShapeOther,
};

export function renderShape(type, props) {
  const Comp = SHAPE_MAP[type] || ShapeOther;
  return <Comp {...props} />;
}