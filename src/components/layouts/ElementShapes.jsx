/**
 * SVG shapes for each element type in the room layout editor.
 * Each function receives { width, height, color, label, selected } and returns SVG content (no <g> wrapper).
 * Label color is always white for visibility on colored/grey backgrounds.
 */

const LABEL_STYLE = { pointerEvents: 'none', fontFamily: 'sans-serif', fontWeight: '700' };
const WHITE = '#ffffff';

function labelFontSize(label = '', w) {
  const len = label.length || 8;
  return Math.max(7, Math.min(12, w / len * 1.4));
}

function SelRect({ W, H, selected, rx = 4 }) {
  if (!selected) return null;
  return <rect width={W} height={H} rx={rx} fill="none" stroke="#1D4ED8" strokeWidth={2.5} pointerEvents="none" />;
}

// ── Machine (generic) ────────────────────────────────────────────────────────
export function ShapeMachine({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={5} fill={color} stroke={selected ? '#1D4ED8' : 'rgba(0,0,0,0.25)'} strokeWidth={selected ? 2.5 : 1} />
      {/* top panel */}
      <rect x={0} y={0} width={W} height={H * 0.28} rx={5} fill="rgba(0,0,0,0.2)" />
      {/* gear circles */}
      <circle cx={W * 0.25} cy={H * 0.6} r={Math.min(W, H) * 0.16} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
      <circle cx={W * 0.25} cy={H * 0.6} r={Math.min(W, H) * 0.07} fill="rgba(255,255,255,0.35)" />
      <circle cx={W * 0.65} cy={H * 0.6} r={Math.min(W, H) * 0.12} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
      {/* status light */}
      <circle cx={W * 0.82} cy={H * 0.14} r={3} fill="#4ADE80" />
      {/* label */}
      <text x={W / 2} y={H * 0.18} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Filling Machine (envasadora) ──────────────────────────────────────────────
export function ShapeFillingMachine({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  const count = Math.max(2, Math.floor(W / 20));
  const step = W / (count + 1);
  return (
    <>
      <rect width={W} height={H} rx={4} fill={color} stroke={selected ? '#1D4ED8' : 'rgba(0,0,0,0.25)'} strokeWidth={selected ? 2.5 : 1} />
      {/* header hopper */}
      <rect x={W * 0.1} y={H * 0.02} width={W * 0.8} height={H * 0.22} rx={3} fill="rgba(255,255,255,0.2)" />
      <text x={W / 2} y={H * 0.16} textAnchor="middle" fontSize={8} fill={WHITE} style={{ pointerEvents: 'none' }}>TOLVA</text>
      {/* nozzles */}
      {Array.from({ length: count }).map((_, i) => (
        <g key={i} transform={`translate(${step * (i + 1) - 4}, ${H * 0.28})`}>
          <rect width={8} height={H * 0.35} rx={2} fill="rgba(255,255,255,0.5)" />
          <polygon points={`0,${H * 0.35} 8,${H * 0.35} 4,${H * 0.48}`} fill="rgba(255,255,255,0.6)" />
        </g>
      ))}
      {/* conveyor base */}
      <rect x={W * 0.04} y={H * 0.78} width={W * 0.92} height={H * 0.14} rx={2} fill="rgba(0,0,0,0.2)" />
      <text x={W / 2} y={H * 0.18} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
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
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={4} fill={color} fillOpacity={0.15} stroke={selected ? '#1D4ED8' : color} strokeWidth={selected ? 2.5 : 1.5} />
      <polygon points={pts} fill={color} fillOpacity={0.9} stroke={WHITE} strokeWidth={1} />
      <circle cx={cx} cy={cy} r={r * 0.5} fill={WHITE} fillOpacity={0.7} />
      <text x={W / 2} y={H - 5} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Rotary accumulator plate ──────────────────────────────────────────────────
export function ShapeRotaryAccumulator({ width: W, height: H, color, label, selected }) {
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.42;
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={4} fill={color} fillOpacity={0.15} stroke={selected ? '#1D4ED8' : color} strokeWidth={selected ? 2.5 : 1.5} />
      <circle cx={cx} cy={cy} r={R} fill={color} fillOpacity={0.8} stroke={WHITE} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={R * 0.6} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} strokeDasharray="5 3" />
      {[0, 72, 144, 216, 288].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return <text key={i} x={cx + R * 0.78 * Math.cos(rad)} y={cy + R * 0.78 * Math.sin(rad) + 4}
          textAnchor="middle" fontSize={9} fill={WHITE} style={{ pointerEvents: 'none' }}>↺</text>;
      })}
      <circle cx={cx} cy={cy} r={R * 0.18} fill={WHITE} fillOpacity={0.8} />
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Dosing cart ───────────────────────────────────────────────────────────────
export function ShapeDosingCart({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={4} fill={color} fillOpacity={0.15} stroke={selected ? '#1D4ED8' : color} strokeWidth={selected ? 2.5 : 1.5} />
      <rect x={W * 0.08} y={H * 0.08} width={W * 0.84} height={H * 0.55} rx={3} fill={color} fillOpacity={0.85} />
      {[0.2, 0.8].map((fx, i) => (
        <circle key={i} cx={W * fx} cy={H * 0.82} r={H * 0.1} fill={color} stroke={WHITE} strokeWidth={1.5} />
      ))}
      {[0.25, 0.4, 0.55, 0.7, 0.85].map((fx, i) => (
        <line key={i} x1={W * fx} y1={H * 0.63} x2={W * fx} y2={H * 0.7} stroke={WHITE} strokeWidth={2} />
      ))}
      <text x={W / 2} y={H * 0.38} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Nozzles / boquillas ───────────────────────────────────────────────────────
export function ShapeNozzles({ width: W, height: H, color, label, selected }) {
  const count = Math.max(2, Math.floor(W / 18));
  const step = W / (count + 1);
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={4} fill={color} fillOpacity={0.15} stroke={selected ? '#1D4ED8' : color} strokeWidth={selected ? 2.5 : 1.5} />
      <rect x={0} y={0} width={W} height={H * 0.3} rx={4} fill={color} fillOpacity={0.8} />
      {Array.from({ length: count }).map((_, i) => (
        <g key={i} transform={`translate(${step * (i + 1) - 4},${H * 0.3})`}>
          <rect width={8} height={H * 0.4} rx={2} fill={color} fillOpacity={0.85} />
          <polygon points={`0,${H * 0.4} 8,${H * 0.4} 4,${H * 0.55}`} fill={color} />
        </g>
      ))}
      <text x={W / 2} y={H * 0.2} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Linear conveyor belt ──────────────────────────────────────────────────────
export function ShapeConveyor({ width: W, height: H, color, label, selected }) {
  const r = H / 2;
  const fs = labelFontSize(label, W);
  return (
    <>
      {/* belt body */}
      <rect width={W} height={H} rx={r} fill={color} stroke={selected ? '#1D4ED8' : 'rgba(0,0,0,0.3)'} strokeWidth={selected ? 2.5 : 1} />
      {/* pulleys */}
      <circle cx={r} cy={H / 2} r={r * 0.72} fill={color} stroke={WHITE} strokeWidth={1.5} />
      <circle cx={r} cy={H / 2} r={r * 0.35} fill={WHITE} fillOpacity={0.6} />
      <circle cx={W - r} cy={H / 2} r={r * 0.72} fill={color} stroke={WHITE} strokeWidth={1.5} />
      <circle cx={W - r} cy={H / 2} r={r * 0.35} fill={WHITE} fillOpacity={0.6} />
      {/* slats */}
      {Array.from({ length: Math.floor((W - H) / 12) }).map((_, i) => (
        <line key={i} x1={r + 12 * i + 6} y1={H * 0.12} x2={r + 12 * i + 6} y2={H * 0.88}
          stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} />
      ))}
      {/* direction arrow */}
      <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fontSize={Math.min(H - 2, 14)} fill={WHITE} style={{ pointerEvents: 'none' }}>→</text>
      <text x={W / 2} y={H + 11} textAnchor="middle" fontSize={fs} fill={color} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Curved conveyor ───────────────────────────────────────────────────────────
export function ShapeCurvedConveyor({ width: W, height: H, color, label, selected }) {
  const cx = W * 0.15, cy = H * 0.85;
  const R1 = Math.min(W, H) * 0.55, R2 = Math.min(W, H) * 0.9;
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={4} fill="none" stroke={selected ? '#1D4ED8' : color} strokeWidth={selected ? 2.5 : 1.5} strokeDasharray={selected ? '' : '5 3'} />
      {/* arc band */}
      <path d={`M ${cx + R2},${cy} A ${R2},${R2} 0 0 0 ${cx},${cy - R2}`}
        fill="none" stroke={color} strokeWidth={H * 0.4} strokeOpacity={0.7} strokeLinecap="round" />
      <path d={`M ${cx + R1},${cy} A ${R1},${R1} 0 0 0 ${cx},${cy - R1}`}
        fill="none" stroke={WHITE} strokeWidth={1.5} strokeOpacity={0.4} />
      {/* arrow */}
      <text x={W * 0.75} y={H * 0.3} textAnchor="middle" fontSize={12} fill={color} style={{ pointerEvents: 'none' }}>↱</text>
      <text x={W / 2} y={H - 3} textAnchor="middle" fontSize={fs} fill={color} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Transfer pump (bomba de trasvase) ─────────────────────────────────────────
export function ShapePump({ width: W, height: H, color, label, selected }) {
  const cx = W * 0.4, cy = H / 2, R = Math.min(W, H) * 0.3;
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={4} fill={color} fillOpacity={0.12} stroke={selected ? '#1D4ED8' : color} strokeWidth={selected ? 2.5 : 1.5} />
      {/* pump body */}
      <circle cx={cx} cy={cy} r={R} fill={color} fillOpacity={0.85} stroke={WHITE} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={R * 0.45} fill={WHITE} fillOpacity={0.5} />
      {/* impeller blades */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = deg * Math.PI / 180;
        return <line key={i} x1={cx} y1={cy} x2={cx + R * 0.75 * Math.cos(rad)} y2={cy + R * 0.75 * Math.sin(rad)}
          stroke={WHITE} strokeWidth={2} strokeOpacity={0.6} />;
      })}
      {/* pipes */}
      <rect x={W * 0.72} y={H * 0.35} width={W * 0.26} height={H * 0.12} rx={2} fill={color} fillOpacity={0.7} />
      <rect x={W * 0.72} y={H * 0.55} width={W * 0.26} height={H * 0.12} rx={2} fill={color} fillOpacity={0.7} />
      <text x={W / 2} y={H - 3} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Container loader (cargador de envases) ────────────────────────────────────
export function ShapeContainerLoader({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={4} fill={color} stroke={selected ? '#1D4ED8' : 'rgba(0,0,0,0.25)'} strokeWidth={selected ? 2.5 : 1} />
      {/* hopper */}
      <polygon points={`${W*0.15},0 ${W*0.85},0 ${W*0.7},${H*0.45} ${W*0.3},${H*0.45}`} fill="rgba(255,255,255,0.25)" stroke={WHITE} strokeWidth={1} />
      {/* containers in hopper */}
      {[0.35, 0.5, 0.65].map((fx, i) => (
        <ellipse key={i} cx={W * fx} cy={H * 0.22} rx={5} ry={8} fill={WHITE} fillOpacity={0.4} />
      ))}
      {/* outlet chute */}
      <rect x={W * 0.38} y={H * 0.45} width={W * 0.24} height={H * 0.3} rx={2} fill="rgba(255,255,255,0.2)" stroke={WHITE} strokeWidth={1} />
      {/* base */}
      <rect x={0} y={H * 0.78} width={W} height={H * 0.22} rx={3} fill="rgba(0,0,0,0.2)" />
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Capper / taponadora ───────────────────────────────────────────────────────
export function ShapeCapper({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={5} fill={color} stroke={selected ? '#1D4ED8' : 'rgba(0,0,0,0.25)'} strokeWidth={selected ? 2.5 : 1} />
      {/* top head */}
      <rect x={W * 0.2} y={H * 0.04} width={W * 0.6} height={H * 0.22} rx={4} fill="rgba(0,0,0,0.2)" />
      {/* spindle */}
      <rect x={W * 0.44} y={H * 0.26} width={W * 0.12} height={H * 0.28} rx={2} fill={WHITE} fillOpacity={0.5} />
      {/* cap */}
      <ellipse cx={W / 2} cy={H * 0.56} rx={W * 0.12} ry={H * 0.07} fill={WHITE} fillOpacity={0.7} />
      {/* conveyor */}
      <rect x={0} y={H * 0.72} width={W} height={H * 0.18} rx={2} fill="rgba(0,0,0,0.2)" />
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Labeler (etiquetadora) ────────────────────────────────────────────────────
export function ShapeLabeler({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={5} fill={color} stroke={selected ? '#1D4ED8' : 'rgba(0,0,0,0.25)'} strokeWidth={selected ? 2.5 : 1} />
      {/* label roll */}
      <circle cx={W * 0.78} cy={H * 0.3} r={W * 0.14} fill="rgba(255,255,255,0.25)" stroke={WHITE} strokeWidth={1.5} />
      <circle cx={W * 0.78} cy={H * 0.3} r={W * 0.06} fill={WHITE} fillOpacity={0.6} />
      {/* label strip */}
      <rect x={W * 0.12} y={H * 0.35} width={W * 0.55} height={H * 0.2} rx={2} fill={WHITE} fillOpacity={0.35} stroke={WHITE} strokeWidth={0.8} />
      {/* conveyor */}
      <rect x={0} y={H * 0.65} width={W} height={H * 0.2} rx={2} fill="rgba(0,0,0,0.2)" />
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── IBC / Bulk container ──────────────────────────────────────────────────────
export function ShapeIBC({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={4} fill="#f8fafc" stroke={selected ? '#1D4ED8' : '#94a3b8'} strokeWidth={selected ? 2.5 : 1.5} />
      {/* cage grid */}
      <rect x={W * 0.06} y={H * 0.04} width={W * 0.88} height={H * 0.72} rx={3} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.5} />
      {/* tank inside */}
      <rect x={W * 0.14} y={H * 0.1} width={W * 0.72} height={H * 0.6} rx={2} fill={color} fillOpacity={0.5} />
      {/* grid lines */}
      {[0.35, 0.65].map((f, i) => (
        <line key={`v${i}`} x1={W * 0.06 + W * 0.88 * f} y1={H * 0.04} x2={W * 0.06 + W * 0.88 * f} y2={H * 0.76} stroke={color} strokeWidth={0.8} />
      ))}
      {[0.38, 0.7].map((f, i) => (
        <line key={`h${i}`} x1={W * 0.06} y1={H * 0.04 + H * 0.72 * f} x2={W * 0.94} y2={H * 0.04 + H * 0.72 * f} stroke={color} strokeWidth={0.8} />
      ))}
      {/* pallet */}
      <rect x={W * 0.04} y={H * 0.78} width={W * 0.92} height={H * 0.14} rx={2} fill="#92400E" fillOpacity={0.6} />
      {/* outlet valve */}
      <rect x={W * 0.4} y={H * 0.74} width={W * 0.2} height={H * 0.08} rx={2} fill={color} fillOpacity={0.9} />
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={fs} fill="#475569" style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Storage / Pallet ──────────────────────────────────────────────────────────
export function ShapePallet({ width: W, height: H, color, label, selected }) {
  const cols = Math.max(1, Math.floor(W / 22));
  const rows = Math.max(1, Math.floor((H - 18) / 18));
  const bw = (W - 8) / cols - 2;
  const bh = (H - 22) / rows - 2;
  return (
    <>
      {/* pallet base boards */}
      <rect width={W} height={H} rx={3} fill="#FEF3C7" stroke={selected ? '#1D4ED8' : '#D97706'} strokeWidth={selected ? 2.5 : 1.5} />
      <rect x={0} y={H - 12} width={W} height={12} rx={2} fill="#D97706" fillOpacity={0.7} />
      {/* boxes stacked */}
      {Array.from({ length: rows }).map((_, ri) =>
        Array.from({ length: cols }).map((_, ci) => (
          <rect key={`${ri}-${ci}`} x={4 + ci * (bw + 2)} y={4 + ri * (bh + 2)} width={bw} height={bh} rx={2}
            fill={color} fillOpacity={0.8} stroke={WHITE} strokeWidth={0.5} />
        ))
      )}
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={labelFontSize(label, W)} fill="#78350F" style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Inkjet coder ──────────────────────────────────────────────────────────────
export function ShapeInkjet({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={6} fill={color} stroke={selected ? '#1D4ED8' : 'rgba(0,0,0,0.25)'} strokeWidth={selected ? 2.5 : 1} />
      <rect x={W * 0.08} y={H * 0.1} width={W * 0.52} height={H * 0.42} rx={2} fill="#1E293B" fillOpacity={0.85} />
      {[0, 1, 2].map(r => [0, 1, 2, 3].map(c => (
        <circle key={`${r}${c}`} cx={W * 0.13 + c * 6} cy={H * 0.18 + r * 8} r={1.5} fill="#06B6D4" />
      )))}
      <rect x={W * 0.72} y={H * 0.28} width={W * 0.2} height={H * 0.16} rx={2} fill={WHITE} fillOpacity={0.5} />
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Laser coder ───────────────────────────────────────────────────────────────
export function ShapeLaser({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={6} fill={color} stroke={selected ? '#1D4ED8' : 'rgba(0,0,0,0.25)'} strokeWidth={selected ? 2.5 : 1} />
      <rect x={W * 0.08} y={H * 0.1} width={W * 0.52} height={H * 0.38} rx={2} fill="#1E293B" fillOpacity={0.85} />
      <circle cx={W * 0.75} cy={H * 0.4} r={Math.min(W, H) * 0.18} fill="rgba(255,0,0,0.2)" stroke="#FF4444" strokeWidth={1.5} />
      <line x1={W * 0.75} y1={H * 0.4} x2={W * 0.55} y2={H * 0.65} stroke="#FF0000" strokeWidth={2} strokeOpacity={0.9} />
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Cartoner / estuchadora ────────────────────────────────────────────────────
export function ShapeCartoner({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={5} fill={color} stroke={selected ? '#1D4ED8' : 'rgba(0,0,0,0.25)'} strokeWidth={selected ? 2.5 : 1} />
      {/* top panel */}
      <rect x={0} y={0} width={W} height={H * 0.22} rx={5} fill="rgba(0,0,0,0.2)" />
      {/* carton shape */}
      <rect x={W * 0.08} y={H * 0.28} width={W * 0.32} height={H * 0.52} rx={2} fill={WHITE} fillOpacity={0.25} stroke={WHITE} strokeWidth={1} />
      <polygon points={`${W * 0.08},${H * 0.28} ${W * 0.4},${H * 0.28} ${W * 0.32},${H * 0.14}`} fill={WHITE} fillOpacity={0.15} />
      {/* feed arrow */}
      <text x={W * 0.72} y={H * 0.58} textAnchor="middle" fontSize={20} fill={WHITE} fillOpacity={0.6} style={{ pointerEvents: 'none' }}>→</text>
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Wrapping machine (envolvedora/retractiladora) ──────────────────────────────
export function ShapeWrapper({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={5} fill={color} stroke={selected ? '#1D4ED8' : 'rgba(0,0,0,0.25)'} strokeWidth={selected ? 2.5 : 1} />
      {/* film roll */}
      <circle cx={W * 0.8} cy={H * 0.3} r={W * 0.12} fill={WHITE} fillOpacity={0.3} stroke={WHITE} strokeWidth={1.5} />
      <circle cx={W * 0.8} cy={H * 0.3} r={W * 0.05} fill={WHITE} fillOpacity={0.6} />
      {/* film path */}
      <line x1={W * 0.69} y1={H * 0.3} x2={W * 0.15} y2={H * 0.55} stroke={WHITE} strokeWidth={1.5} strokeOpacity={0.5} />
      {/* product outline */}
      <rect x={W * 0.1} y={H * 0.5} width={W * 0.5} height={H * 0.3} rx={3} fill={WHITE} fillOpacity={0.2} stroke={WHITE} strokeWidth={1} />
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Work table ────────────────────────────────────────────────────────────────
export function ShapeWorkTable({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      {/* tabletop */}
      <rect width={W} height={H * 0.18} rx={3} fill={color} stroke={selected ? '#1D4ED8' : 'rgba(0,0,0,0.2)'} strokeWidth={selected ? 2.5 : 1} />
      {/* legs */}
      {[W * 0.06, W * 0.9].map((lx, i) => (
        <rect key={i} x={lx} y={H * 0.18} width={W * 0.06} height={H * 0.78} rx={2} fill={color} fillOpacity={0.7} stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
      ))}
      {/* shelf */}
      <rect x={W * 0.06} y={H * 0.6} width={W * 0.88} height={H * 0.1} rx={2} fill={color} fillOpacity={0.4} />
      <text x={W / 2} y={H * 0.12} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Cabinet / Armario ─────────────────────────────────────────────────────────
export function ShapeCabinet({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={3} fill={color} stroke={selected ? '#1D4ED8' : 'rgba(0,0,0,0.25)'} strokeWidth={selected ? 2.5 : 1} />
      {/* door panels */}
      <rect x={W * 0.04} y={H * 0.06} width={W * 0.43} height={H * 0.88} rx={2} fill={WHITE} fillOpacity={0.12} stroke={WHITE} strokeWidth={0.8} />
      <rect x={W * 0.53} y={H * 0.06} width={W * 0.43} height={H * 0.88} rx={2} fill={WHITE} fillOpacity={0.12} stroke={WHITE} strokeWidth={0.8} />
      {/* handles */}
      <rect x={W * 0.42} y={H * 0.44} width={W * 0.04} height={H * 0.12} rx={1} fill={WHITE} fillOpacity={0.6} />
      <rect x={W * 0.54} y={H * 0.44} width={W * 0.04} height={H * 0.12} rx={1} fill={WHITE} fillOpacity={0.6} />
      {/* top bar */}
      <rect x={0} y={0} width={W} height={H * 0.08} rx={3} fill="rgba(0,0,0,0.25)" />
      <text x={W / 2} y={H * 0.06} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Door / Entry-Exit ─────────────────────────────────────────────────────────
export function ShapeDoor({ width: W, height: H, color, label, selected, type }) {
  const isExit = type === 'exit';
  const fs = labelFontSize(label, W);
  // Door represented as wall segment with open arc
  return (
    <>
      {/* wall segments */}
      <rect x={0} y={0} width={W * 0.18} height={H} rx={0} fill="#94a3b8" />
      <rect x={W * 0.82} y={0} width={W * 0.18} height={H} rx={0} fill="#94a3b8" />
      {/* door panel */}
      <rect x={W * 0.18} y={H * 0.05} width={H * 0.82} height={H * 0.9} rx={2}
        fill={color} fillOpacity={0.8} stroke={WHITE} strokeWidth={1} />
      {/* swing arc */}
      <path d={`M ${W * 0.18},${H * 0.05} A ${H * 0.82},${H * 0.82} 0 0 ${isExit ? 0 : 1} ${W * 0.18 + H * 0.82},${H * 0.05 + H * 0.82}`}
        fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1} strokeDasharray="4 3" />
      {/* selection border */}
      {selected && <rect width={W} height={H} fill="none" stroke="#1D4ED8" strokeWidth={2.5} />}
      <text x={W * 0.5} y={H * 0.52} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
      <text x={W * 0.5} y={H * 0.78} textAnchor="middle" fontSize={8} fill={WHITE} style={{ pointerEvents: 'none' }}>{isExit ? '⬆ OUT' : '⬇ IN'}</text>
    </>
  );
}

// ── Walkway ───────────────────────────────────────────────────────────────────
export function ShapeWalkway({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={2} fill={color} fillOpacity={0.18}
        stroke={selected ? '#1D4ED8' : '#9CA3AF'} strokeWidth={selected ? 2 : 1} strokeDasharray={selected ? '' : '8 4'} />
      {/* center dashes */}
      {Array.from({ length: Math.floor(W / 22) }).map((_, i) => (
        <line key={i} x1={10 + i * 22} y1={H / 2} x2={20 + i * 22} y2={H / 2}
          stroke="#6B7280" strokeWidth={2} strokeOpacity={0.5} />
      ))}
      <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fontSize={fs} fill="#6B7280" style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Wall ──────────────────────────────────────────────────────────────────────
export function ShapeWall({ width: W, height: H, color, label, selected }) {
  const bH = 10, bW = 20;
  const rows = Math.ceil(H / bH);
  const cols = Math.ceil(W / bW) + 1;
  return (
    <>
      <rect width={W} height={H} fill={color} stroke={selected ? '#1D4ED8' : '#1F2937'} strokeWidth={selected ? 2.5 : 1} />
      {Array.from({ length: rows }).map((_, ri) =>
        Array.from({ length: cols }).map((_, ci) => {
          const off = ri % 2 === 0 ? 0 : -bW / 2;
          return <rect key={`${ri}-${ci}`} x={ci * bW + off} y={ri * bH} width={bW - 1} height={bH - 1}
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={0.5} />;
        })
      )}
    </>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────
export function ShapeColumn({ width: W, height: H, color, label, selected }) {
  return (
    <>
      <rect width={W} height={H} rx={2} fill={color} stroke={selected ? '#1D4ED8' : '#9CA3AF'} strokeWidth={selected ? 2.5 : 1.5} />
      <line x1={4} y1={4} x2={W - 4} y2={H - 4} stroke={WHITE} strokeWidth={0.8} strokeOpacity={0.3} />
      <line x1={W - 4} y1={4} x2={4} y2={H - 4} stroke={WHITE} strokeWidth={0.8} strokeOpacity={0.3} />
    </>
  );
}

// ── Line manager desk ─────────────────────────────────────────────────────────
export function ShapeManagerDesk({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={5} fill={color} stroke={selected ? '#1D4ED8' : 'rgba(0,0,0,0.25)'} strokeWidth={selected ? 2.5 : 1} />
      {/* desk surface */}
      <rect x={0} y={0} width={W} height={H * 0.22} rx={5} fill="rgba(0,0,0,0.2)" />
      {/* monitor */}
      <rect x={W * 0.25} y={H * 0.12} width={W * 0.5} height={H * 0.35} rx={2} fill="#1E293B" />
      <rect x={W * 0.43} y={H * 0.47} width={W * 0.14} height={H * 0.09} fill="#1E293B" />
      <rect x={W * 0.3} y={H * 0.56} width={W * 0.4} height={H * 0.05} rx={1} fill="#1E293B" />
      {/* keyboard */}
      <rect x={W * 0.18} y={H * 0.68} width={W * 0.64} height={H * 0.18} rx={2} fill={WHITE} fillOpacity={0.25} />
      <text x={W / 2} y={H - 3} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Electric outlet 220V ──────────────────────────────────────────────────────
export function ShapeOutlet220({ width: W, height: H, color, label, selected }) {
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.38;
  return (
    <>
      <rect width={W} height={H} rx={4} fill="#1e293b" stroke={selected ? '#1D4ED8' : '#64748b'} strokeWidth={selected ? 2.5 : 1.5} />
      {/* outlet plate */}
      <rect x={cx - R} y={cy - R} width={R * 2} height={R * 2} rx={3} fill="#374151" stroke="#6b7280" strokeWidth={1} />
      {/* pin holes */}
      <ellipse cx={cx - R * 0.3} cy={cy - R * 0.2} rx={2.5} ry={4} fill="#111827" />
      <ellipse cx={cx + R * 0.3} cy={cy - R * 0.2} rx={2.5} ry={4} fill="#111827" />
      <ellipse cx={cx} cy={cy + R * 0.35} rx={2.5} ry={4} fill="#111827" />
      {/* voltage label */}
      <text x={cx} y={H - 4} textAnchor="middle" fontSize={Math.min(10, W * 0.2)} fill="#FCD34D" fontWeight="bold" style={{ pointerEvents: 'none' }}>220V</text>
      <text x={cx} y={H * 0.15} textAnchor="middle" fontSize={8} fill="#94a3b8" style={{ pointerEvents: 'none' }}>{label}</text>
    </>
  );
}

// ── Electric outlet 380V ──────────────────────────────────────────────────────
export function ShapeOutlet380({ width: W, height: H, color, label, selected }) {
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.38;
  return (
    <>
      <rect width={W} height={H} rx={4} fill="#1e1b4b" stroke={selected ? '#1D4ED8' : '#6d28d9'} strokeWidth={selected ? 2.5 : 1.5} />
      {/* 3-phase outlet plate */}
      <circle cx={cx} cy={cy - R * 0.1} r={R} fill="#312e81" stroke="#7c3aed" strokeWidth={1} />
      {/* 3 pin holes arranged in triangle */}
      {[0, 120, 240].map((deg, i) => {
        const rad = (deg - 90) * Math.PI / 180;
        return <ellipse key={i} cx={cx + R * 0.55 * Math.cos(rad)} cy={cy - R * 0.1 + R * 0.55 * Math.sin(rad)} rx={3} ry={4} fill="#111827" />;
      })}
      {/* center ground */}
      <ellipse cx={cx} cy={cy - R * 0.1} rx={2.5} ry={2.5} fill="#111827" />
      <text x={cx} y={H - 4} textAnchor="middle" fontSize={Math.min(10, W * 0.2)} fill="#A78BFA" fontWeight="bold" style={{ pointerEvents: 'none' }}>380V</text>
      <text x={cx} y={H * 0.15} textAnchor="middle" fontSize={8} fill="#94a3b8" style={{ pointerEvents: 'none' }}>{label}</text>
    </>
  );
}

// ── Generic "other" ───────────────────────────────────────────────────────────
export function ShapeOther({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={5} fill={color} fillOpacity={0.85}
        stroke={selected ? '#1D4ED8' : WHITE} strokeWidth={selected ? 2.5 : 1.5} strokeDasharray={selected ? '' : '5 3'} />
      <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
    </>
  );
}

// ── Dispatch map ─────────────────────────────────────────────────────────────
export const SHAPE_MAP = {
  machine: ShapeMachine,
  filling_machine: ShapeFillingMachine,
  star_plate: ShapeStarPlate,
  dosing_cart: ShapeDosingCart,
  nozzles: ShapeNozzles,
  rotary_accumulator: ShapeRotaryAccumulator,
  conveyor_belt: ShapeConveyor,
  curved_conveyor: ShapeCurvedConveyor,
  transfer_pump: ShapePump,
  container_loader: ShapeContainerLoader,
  capper: ShapeCapper,
  labeler: ShapeLabeler,
  wrapper: ShapeWrapper,
  container_bulk: ShapeIBC,
  storage: ShapePallet,
  inkjet_coder: ShapeInkjet,
  laser_coder: ShapeLaser,
  cartoner: ShapeCartoner,
  work_table: ShapeWorkTable,
  material_cabinet: ShapeCabinet,
  line_manager_desk: ShapeManagerDesk,
  outlet_220: ShapeOutlet220,
  outlet_380: ShapeOutlet380,
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