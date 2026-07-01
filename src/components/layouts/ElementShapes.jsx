/**
 * SVG shapes for each element type in the room layout editor.
 * Professional industrial floor plan quality with gradients, shadows and detail.
 */

const LABEL_STYLE = { pointerEvents: 'none', fontFamily: "'Inter', 'Segoe UI', sans-serif", fontWeight: '600', letterSpacing: '0.01em' };
const WHITE = '#ffffff';

function labelFontSize(label = '', w) {
  const len = label.length || 8;
  return Math.max(7, Math.min(13, w / len * 1.5));
}

function SelRect({ W, H, selected, rx = 6 }) {
  if (!selected) return null;
  return (
    <>
      <rect width={W} height={H} rx={rx} fill="none" stroke="#2563EB" strokeWidth={2} strokeDasharray="6 3" pointerEvents="none" />
      <rect width={W} height={H} rx={rx} fill="none" stroke="rgba(37,99,235,0.2)" strokeWidth={6} pointerEvents="none" />
    </>
  );
}

// ── Machine (generic) ────────────────────────────────────────────────────────
export function ShapeMachine({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  const gid = `mg_${Math.abs(color.charCodeAt(1) || 0)}`;
  return (
    <>
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
        <filter id={`sh_${gid}`} x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.18" />
        </filter>
      </defs>
      <rect width={W} height={H} rx={6} fill={`url(#${gid})`} stroke={selected ? '#2563EB' : 'rgba(0,0,0,0.2)'} strokeWidth={selected ? 2 : 1} filter={`url(#sh_${gid})`} />
      {/* top header bar */}
      <rect x={0} y={0} width={W} height={H * 0.25} rx={6} fill="rgba(0,0,0,0.22)" />
      <rect x={0} y={H * 0.2} width={W} height={H * 0.06} fill="rgba(0,0,0,0.12)" />
      {/* gear detail */}
      <circle cx={W * 0.28} cy={H * 0.62} r={Math.min(W, H) * 0.15} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2.5} />
      <circle cx={W * 0.28} cy={H * 0.62} r={Math.min(W, H) * 0.07} fill="rgba(255,255,255,0.3)" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const rad = deg * Math.PI / 180;
        const r = Math.min(W, H) * 0.15;
        return <rect key={i} x={W * 0.28 + r * Math.cos(rad) - 2} y={H * 0.62 + r * Math.sin(rad) - 3} width={4} height={6}
          fill="rgba(255,255,255,0.4)" transform={`rotate(${deg} ${W * 0.28 + r * Math.cos(rad)} ${H * 0.62 + r * Math.sin(rad)})`} rx={1} />;
      })}
      <circle cx={W * 0.68} cy={H * 0.62} r={Math.min(W, H) * 0.1} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
      <circle cx={W * 0.68} cy={H * 0.62} r={Math.min(W, H) * 0.04} fill="rgba(255,255,255,0.3)" />
      {/* status lights */}
      <circle cx={W * 0.82} cy={H * 0.12} r={4} fill="#4ADE80" />
      <circle cx={W * 0.82} cy={H * 0.12} r={4} fill="#4ADE80" fillOpacity="0.4" transform={`scale(1.8) translate(${W * 0.82 * (1 - 1/1.8)}, ${H * 0.12 * (1 - 1/1.8)})`} />
      {/* label */}
      <text x={W / 2} y={H * 0.16} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Filling Machine ───────────────────────────────────────────────────────────
export function ShapeFillingMachine({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  const count = Math.max(2, Math.floor(W / 22));
  const step = W / (count + 1);
  const gid = `fm_${W}`;
  return (
    <>
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.65" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} rx={5} fill={`url(#${gid})`} stroke={selected ? '#2563EB' : 'rgba(0,0,0,0.2)'} strokeWidth={selected ? 2 : 1} />
      {/* hopper */}
      <rect x={W * 0.08} y={H * 0.02} width={W * 0.84} height={H * 0.24} rx={4} fill="rgba(0,0,0,0.25)" />
      <rect x={W * 0.1} y={H * 0.04} width={W * 0.8} height={H * 0.18} rx={3} fill="rgba(255,255,255,0.12)" />
      <text x={W / 2} y={H * 0.16} textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.8)" style={{ pointerEvents: 'none', fontWeight: '700' }}>TOLVA</text>
      {/* nozzles */}
      {Array.from({ length: count }).map((_, i) => (
        <g key={i} transform={`translate(${step * (i + 1) - 5}, ${H * 0.28})`}>
          <rect width={10} height={H * 0.35} rx={3} fill="rgba(255,255,255,0.55)" />
          <polygon points={`0,${H * 0.35} 10,${H * 0.35} 5,${H * 0.48}`} fill="rgba(255,255,255,0.65)" />
          <circle cx={5} cy={H * 0.5} r={2.5} fill={color} fillOpacity={0.7} />
        </g>
      ))}
      {/* conveyor */}
      <rect x={W * 0.03} y={H * 0.78} width={W * 0.94} height={H * 0.16} rx={3} fill="rgba(0,0,0,0.28)" />
      {Array.from({ length: Math.floor(W / 14) }).map((_, i) => (
        <line key={i} x1={W * 0.03 + i * 14 + 7} y1={H * 0.78} x2={W * 0.03 + i * 14 + 7} y2={H * 0.94}
          stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
      ))}
      <text x={W / 2} y={H * 0.19} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Star plate ────────────────────────────────────────────────────────────────
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
      <rect width={W} height={H} rx={5} fill={color} fillOpacity={0.12} stroke={selected ? '#2563EB' : color} strokeWidth={selected ? 2 : 1.5} />
      <polygon points={pts} fill={color} fillOpacity={0.9} stroke={WHITE} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={r * 0.55} fill="rgba(255,255,255,0.8)" />
      <circle cx={cx} cy={cy} r={r * 0.2} fill={color} fillOpacity={0.6} />
      <text x={W / 2} y={H - 5} textAnchor="middle" fontSize={fs} fill={color} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Rotary accumulator ────────────────────────────────────────────────────────
export function ShapeRotaryAccumulator({ width: W, height: H, color, label, selected }) {
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.42;
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={5} fill={color} fillOpacity={0.1} stroke={selected ? '#2563EB' : color} strokeWidth={selected ? 2 : 1.5} />
      <circle cx={cx} cy={cy} r={R} fill={color} fillOpacity={0.85} stroke={WHITE} strokeWidth={1.5} />
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = deg * Math.PI / 180;
        return <line key={i} x1={cx} y1={cy} x2={cx + R * 0.85 * Math.cos(rad)} y2={cy + R * 0.85 * Math.sin(rad)}
          stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />;
      })}
      <circle cx={cx} cy={cy} r={R * 0.6} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} strokeDasharray="5 3" />
      <circle cx={cx} cy={cy} r={R * 0.2} fill={WHITE} fillOpacity={0.8} />
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Dosing cart ───────────────────────────────────────────────────────────────
export function ShapeDosingCart({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={5} fill={color} fillOpacity={0.12} stroke={selected ? '#2563EB' : color} strokeWidth={selected ? 2 : 1.5} />
      <rect x={W * 0.08} y={H * 0.06} width={W * 0.84} height={H * 0.55} rx={4} fill={color} fillOpacity={0.85} />
      {/* tank level */}
      <rect x={W * 0.12} y={H * 0.28} width={W * 0.76} height={H * 0.3} rx={2} fill="rgba(255,255,255,0.15)" />
      <rect x={W * 0.12} y={H * 0.4} width={W * 0.76} height={H * 0.18} rx={2} fill={color} fillOpacity={0.5} />
      {/* nozzles */}
      {[0.28, 0.43, 0.58, 0.72].map((fx, i) => (
        <rect key={i} x={W * fx - 2} y={H * 0.61} width={5} height={H * 0.1} rx={1.5} fill={WHITE} fillOpacity={0.6} />
      ))}
      {/* wheels */}
      {[0.18, 0.82].map((fx, i) => (
        <circle key={i} cx={W * fx} cy={H * 0.85} r={H * 0.1} fill={color} stroke={WHITE} strokeWidth={1.5} />
      ))}
      <text x={W / 2} y={H * 0.38} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Nozzles ───────────────────────────────────────────────────────────────────
export function ShapeNozzles({ width: W, height: H, color, label, selected }) {
  const count = Math.max(2, Math.floor(W / 18));
  const step = W / (count + 1);
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={4} fill={color} fillOpacity={0.12} stroke={selected ? '#2563EB' : color} strokeWidth={selected ? 2 : 1.5} />
      <rect x={0} y={0} width={W} height={H * 0.3} rx={4} fill={color} fillOpacity={0.85} />
      {Array.from({ length: count }).map((_, i) => (
        <g key={i} transform={`translate(${step * (i + 1) - 5},${H * 0.3})`}>
          <rect width={10} height={H * 0.42} rx={3} fill={color} fillOpacity={0.9} />
          <polygon points={`0,${H * 0.42} 10,${H * 0.42} 5,${H * 0.58}`} fill={color} fillOpacity={0.7} />
          <circle cx={5} cy={H * 0.59} r={3} fill={WHITE} fillOpacity={0.5} />
        </g>
      ))}
      <text x={W / 2} y={H * 0.2} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Linear conveyor belt ──────────────────────────────────────────────────────
export function ShapeConveyor({ width: W, height: H, color, label, selected }) {
  const r = H / 2;
  const fs = labelFontSize(label, W);
  const gid = `cv_${W}`;
  return (
    <>
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {/* belt body */}
      <rect width={W} height={H} rx={r} fill={`url(#${gid})`} stroke={selected ? '#2563EB' : 'rgba(0,0,0,0.3)'} strokeWidth={selected ? 2 : 1} />
      {/* pulleys */}
      <circle cx={r} cy={H / 2} r={r * 0.75} fill={color} stroke={WHITE} strokeWidth={2} />
      <circle cx={r} cy={H / 2} r={r * 0.35} fill={WHITE} fillOpacity={0.7} />
      <circle cx={W - r} cy={H / 2} r={r * 0.75} fill={color} stroke={WHITE} strokeWidth={2} />
      <circle cx={W - r} cy={H / 2} r={r * 0.35} fill={WHITE} fillOpacity={0.7} />
      {/* slats */}
      {Array.from({ length: Math.floor((W - H) / 10) }).map((_, i) => (
        <line key={i} x1={r + 10 * i + 5} y1={H * 0.1} x2={r + 10 * i + 5} y2={H * 0.9}
          stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
      ))}
      {/* direction arrow */}
      <text x={W / 2} y={H / 2 + 5} textAnchor="middle" fontSize={Math.min(H - 4, 14)} fill={WHITE} fillOpacity={0.9} style={{ pointerEvents: 'none', fontWeight: 'bold' }}>→</text>
      <text x={W / 2} y={H + 12} textAnchor="middle" fontSize={fs} fill={color} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} rx={r} />
    </>
  );
}

// ── Curved conveyor ───────────────────────────────────────────────────────────
export function ShapeCurvedConveyor({ width: W, height: H, color, label, selected }) {
  const cx = W * 0.1, cy = H * 0.9;
  const R1 = Math.min(W, H) * 0.5, R2 = Math.min(W, H) * 0.88;
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={5} fill="none" stroke={selected ? '#2563EB' : color} strokeWidth={selected ? 2 : 1.5} strokeDasharray={selected ? '' : '6 3'} />
      <path d={`M ${cx + R2},${cy} A ${R2},${R2} 0 0 0 ${cx},${cy - R2}`}
        fill="none" stroke={color} strokeWidth={H * 0.38} strokeOpacity={0.75} strokeLinecap="round" />
      <path d={`M ${cx + R1},${cy} A ${R1},${R1} 0 0 0 ${cx},${cy - R1}`}
        fill="none" stroke={WHITE} strokeWidth={2} strokeOpacity={0.4} />
      {Array.from({ length: 5 }).map((_, i) => {
        const ang = (i / 4) * Math.PI / 2;
        const rMid = (R1 + R2) / 2;
        return <text key={i} x={cx + rMid * Math.cos(ang)} y={cy - rMid * Math.sin(ang) + 4}
          textAnchor="middle" fontSize={9} fill={WHITE} fillOpacity={0.7} style={{ pointerEvents: 'none' }}>→</text>;
      })}
      <text x={W / 2} y={H - 3} textAnchor="middle" fontSize={fs} fill={color} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Transfer pump ─────────────────────────────────────────────────────────────
export function ShapePump({ width: W, height: H, color, label, selected }) {
  const cx = W * 0.38, cy = H / 2, R = Math.min(W, H) * 0.3;
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={5} fill={color} fillOpacity={0.1} stroke={selected ? '#2563EB' : color} strokeWidth={selected ? 2 : 1.5} />
      <circle cx={cx} cy={cy} r={R} fill={color} fillOpacity={0.9} stroke={WHITE} strokeWidth={2} />
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = deg * Math.PI / 180;
        return <line key={i} x1={cx} y1={cy} x2={cx + R * 0.78 * Math.cos(rad)} y2={cy + R * 0.78 * Math.sin(rad)}
          stroke={WHITE} strokeWidth={2} strokeOpacity={0.55} />;
      })}
      <circle cx={cx} cy={cy} r={R * 0.42} fill={WHITE} fillOpacity={0.55} />
      <circle cx={cx} cy={cy} r={R * 0.15} fill={color} fillOpacity={0.8} />
      {/* pipes */}
      <rect x={W * 0.7} y={H * 0.3} width={W * 0.28} height={H * 0.14} rx={3} fill={color} fillOpacity={0.7} stroke={WHITE} strokeWidth={0.8} />
      <rect x={W * 0.7} y={H * 0.58} width={W * 0.28} height={H * 0.14} rx={3} fill={color} fillOpacity={0.7} stroke={WHITE} strokeWidth={0.8} />
      <text x={W / 2} y={H - 3} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Container loader ──────────────────────────────────────────────────────────
export function ShapeContainerLoader({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={5} fill={color} stroke={selected ? '#2563EB' : 'rgba(0,0,0,0.25)'} strokeWidth={selected ? 2 : 1} />
      <polygon points={`${W * 0.12},0 ${W * 0.88},0 ${W * 0.72},${H * 0.46} ${W * 0.28},${H * 0.46}`} fill="rgba(0,0,0,0.2)" stroke={WHITE} strokeWidth={1} />
      {[0.35, 0.5, 0.65].map((fx, i) => (
        <ellipse key={i} cx={W * fx} cy={H * 0.2} rx={5} ry={9} fill={WHITE} fillOpacity={0.45} />
      ))}
      <rect x={W * 0.38} y={H * 0.46} width={W * 0.24} height={H * 0.3} rx={3} fill="rgba(255,255,255,0.22)" stroke={WHITE} strokeWidth={0.8} />
      <rect x={0} y={H * 0.78} width={W} height={H * 0.22} rx={4} fill="rgba(0,0,0,0.25)" />
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Capper ────────────────────────────────────────────────────────────────────
export function ShapeCapper({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={6} fill={color} stroke={selected ? '#2563EB' : 'rgba(0,0,0,0.22)'} strokeWidth={selected ? 2 : 1} />
      <rect x={W * 0.18} y={H * 0.03} width={W * 0.64} height={H * 0.24} rx={5} fill="rgba(0,0,0,0.22)" />
      {/* spindle arm */}
      <rect x={W * 0.44} y={H * 0.27} width={W * 0.12} height={H * 0.3} rx={3} fill={WHITE} fillOpacity={0.6} />
      {/* cap */}
      <ellipse cx={W / 2} cy={H * 0.57} rx={W * 0.14} ry={H * 0.08} fill={WHITE} fillOpacity={0.75} />
      <ellipse cx={W / 2} cy={H * 0.57} rx={W * 0.07} ry={H * 0.04} fill={color} fillOpacity={0.5} />
      {/* conveyor */}
      <rect x={0} y={H * 0.73} width={W} height={H * 0.18} rx={3} fill="rgba(0,0,0,0.22)" />
      <text x={W / 2} y={H - 3} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Labeler ───────────────────────────────────────────────────────────────────
export function ShapeLabeler({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={6} fill={color} stroke={selected ? '#2563EB' : 'rgba(0,0,0,0.22)'} strokeWidth={selected ? 2 : 1} />
      {/* label roll */}
      <circle cx={W * 0.79} cy={H * 0.28} r={W * 0.16} fill="rgba(255,255,255,0.22)" stroke={WHITE} strokeWidth={2} />
      <circle cx={W * 0.79} cy={H * 0.28} r={W * 0.07} fill={WHITE} fillOpacity={0.65} />
      {/* label strip */}
      <rect x={W * 0.1} y={H * 0.33} width={W * 0.58} height={H * 0.22} rx={3} fill={WHITE} fillOpacity={0.35} stroke={WHITE} strokeWidth={0.8} />
      {/* label lines */}
      <line x1={W * 0.14} y1={H * 0.39} x2={W * 0.62} y2={H * 0.39} stroke={color} strokeWidth={1} strokeOpacity={0.6} />
      <line x1={W * 0.14} y1={H * 0.46} x2={W * 0.5} y2={H * 0.46} stroke={color} strokeWidth={1} strokeOpacity={0.6} />
      {/* conveyor */}
      <rect x={0} y={H * 0.65} width={W} height={H * 0.2} rx={3} fill="rgba(0,0,0,0.22)" />
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── IBC / Bulk container ──────────────────────────────────────────────────────
export function ShapeIBC({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={4} fill="#f1f5f9" stroke={selected ? '#2563EB' : '#94a3b8'} strokeWidth={selected ? 2 : 1.5} />
      {/* cage frame */}
      <rect x={W * 0.05} y={H * 0.03} width={W * 0.9} height={H * 0.72} rx={3} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2} />
      {/* tank */}
      <rect x={W * 0.12} y={H * 0.09} width={W * 0.76} height={H * 0.6} rx={2} fill={color} fillOpacity={0.45} />
      {/* fill level */}
      <rect x={W * 0.12} y={H * 0.39} width={W * 0.76} height={H * 0.3} rx={2} fill={color} fillOpacity={0.3} />
      {/* grid */}
      {[0.33, 0.67].map((f, i) => (
        <line key={`v${i}`} x1={W * 0.05 + W * 0.9 * f} y1={H * 0.03} x2={W * 0.05 + W * 0.9 * f} y2={H * 0.75} stroke={color} strokeWidth={1} strokeOpacity={0.5} />
      ))}
      {[0.35, 0.68].map((f, i) => (
        <line key={`h${i}`} x1={W * 0.05} y1={H * 0.03 + H * 0.72 * f} x2={W * 0.95} y2={H * 0.03 + H * 0.72 * f} stroke={color} strokeWidth={1} strokeOpacity={0.5} />
      ))}
      {/* pallet */}
      <rect x={W * 0.03} y={H * 0.77} width={W * 0.94} height={H * 0.14} rx={2} fill="#92400E" fillOpacity={0.55} />
      {[0.28, 0.5, 0.72].map((f, i) => (
        <line key={i} x1={W * f} y1={H * 0.77} x2={W * f} y2={H * 0.91} stroke="rgba(0,0,0,0.2)" strokeWidth={1.5} />
      ))}
      {/* valve */}
      <rect x={W * 0.38} y={H * 0.73} width={W * 0.24} height={H * 0.07} rx={2} fill={color} fillOpacity={0.9} />
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={fs} fill="#334155" style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
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
      <rect width={W} height={H} rx={3} fill="#FEFCE8" stroke={selected ? '#2563EB' : '#D97706'} strokeWidth={selected ? 2 : 1.5} />
      {/* boxes */}
      {Array.from({ length: rows }).map((_, ri) =>
        Array.from({ length: cols }).map((_, ci) => (
          <rect key={`${ri}-${ci}`} x={4 + ci * (bw + 2)} y={4 + ri * (bh + 2)} width={bw} height={bh} rx={2}
            fill={color} fillOpacity={0.75} stroke={WHITE} strokeWidth={0.5} />
        ))
      )}
      {/* pallet base */}
      <rect x={0} y={H - 12} width={W} height={12} rx={2} fill="#B45309" fillOpacity={0.7} />
      {[0.25, 0.5, 0.75].map((f, i) => (
        <line key={i} x1={W * f} y1={H - 12} x2={W * f} y2={H} stroke="rgba(0,0,0,0.15)" strokeWidth={1.5} />
      ))}
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={labelFontSize(label, W)} fill="#78350F" style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Inkjet coder ──────────────────────────────────────────────────────────────
export function ShapeInkjet({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={7} fill={color} stroke={selected ? '#2563EB' : 'rgba(0,0,0,0.25)'} strokeWidth={selected ? 2 : 1} />
      <rect x={W * 0.07} y={H * 0.08} width={W * 0.56} height={H * 0.45} rx={3} fill="#0F172A" />
      {/* dot matrix */}
      {[0, 1, 2].map(r => [0, 1, 2, 3].map(c => (
        <circle key={`${r}${c}`} cx={W * 0.12 + c * 7} cy={H * 0.16 + r * 9} r={2} fill="#22D3EE" />
      )))}
      <text x={W * 0.35} y={H * 0.42} textAnchor="middle" fontSize={7} fill="#38BDF8" style={{ pointerEvents: 'none', fontFamily: 'monospace' }}>LOT</text>
      {/* cartridge */}
      <rect x={W * 0.72} y={H * 0.22} width={W * 0.22} height={H * 0.2} rx={3} fill={WHITE} fillOpacity={0.5} />
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Laser coder ───────────────────────────────────────────────────────────────
export function ShapeLaser({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={7} fill={color} stroke={selected ? '#2563EB' : 'rgba(0,0,0,0.25)'} strokeWidth={selected ? 2 : 1} />
      <rect x={W * 0.07} y={H * 0.08} width={W * 0.54} height={H * 0.4} rx={3} fill="#0F172A" />
      {/* laser head */}
      <circle cx={W * 0.76} cy={H * 0.38} r={Math.min(W, H) * 0.18} fill="rgba(255,0,0,0.18)" stroke="#FF4444" strokeWidth={1.5} />
      <circle cx={W * 0.76} cy={H * 0.38} r={4} fill="#FF2222" />
      <line x1={W * 0.76} y1={H * 0.38} x2={W * 0.55} y2={H * 0.65} stroke="#FF0000" strokeWidth={2.5} strokeOpacity={0.9} />
      <line x1={W * 0.76} y1={H * 0.38} x2={W * 0.4} y2={H * 0.72} stroke="#FF4444" strokeWidth={1} strokeOpacity={0.4} />
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Cartoner ──────────────────────────────────────────────────────────────────
export function ShapeCartoner({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={6} fill={color} stroke={selected ? '#2563EB' : 'rgba(0,0,0,0.22)'} strokeWidth={selected ? 2 : 1} />
      <rect x={0} y={0} width={W} height={H * 0.22} rx={6} fill="rgba(0,0,0,0.2)" />
      {/* carton */}
      <rect x={W * 0.07} y={H * 0.28} width={W * 0.35} height={H * 0.54} rx={3} fill={WHITE} fillOpacity={0.22} stroke={WHITE} strokeWidth={1} />
      <polygon points={`${W * 0.07},${H * 0.28} ${W * 0.42},${H * 0.28} ${W * 0.34},${H * 0.12}`} fill={WHITE} fillOpacity={0.14} />
      {/* flap lines */}
      <line x1={W * 0.07} y1={H * 0.38} x2={W * 0.42} y2={H * 0.38} stroke={WHITE} strokeWidth={0.8} strokeOpacity={0.5} />
      {/* arrow */}
      <text x={W * 0.73} y={H * 0.56} textAnchor="middle" fontSize={22} fill={WHITE} fillOpacity={0.5} style={{ pointerEvents: 'none' }}>→</text>
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Wrapper ───────────────────────────────────────────────────────────────────
export function ShapeWrapper({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={6} fill={color} stroke={selected ? '#2563EB' : 'rgba(0,0,0,0.22)'} strokeWidth={selected ? 2 : 1} />
      <circle cx={W * 0.81} cy={H * 0.28} r={W * 0.13} fill={WHITE} fillOpacity={0.28} stroke={WHITE} strokeWidth={2} />
      <circle cx={W * 0.81} cy={H * 0.28} r={W * 0.05} fill={WHITE} fillOpacity={0.65} />
      {/* film path lines */}
      <line x1={W * 0.69} y1={H * 0.28} x2={W * 0.14} y2={H * 0.55} stroke={WHITE} strokeWidth={1.5} strokeOpacity={0.5} />
      <line x1={W * 0.69} y1={H * 0.3} x2={W * 0.14} y2={H * 0.57} stroke={WHITE} strokeWidth={0.6} strokeOpacity={0.25} />
      {/* product */}
      <rect x={W * 0.1} y={H * 0.5} width={W * 0.52} height={H * 0.32} rx={4} fill={WHITE} fillOpacity={0.2} stroke={WHITE} strokeWidth={1} />
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Work table ────────────────────────────────────────────────────────────────
export function ShapeWorkTable({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      {/* top surface */}
      <rect width={W} height={H * 0.2} rx={4} fill={color} stroke={selected ? '#2563EB' : 'rgba(0,0,0,0.2)'} strokeWidth={selected ? 2 : 1} />
      {/* table edge shadow */}
      <rect x={W * 0.01} y={H * 0.2} width={W * 0.98} height={H * 0.04} rx={1} fill="rgba(0,0,0,0.15)" />
      {/* legs */}
      {[W * 0.06, W * 0.88].map((lx, i) => (
        <rect key={i} x={lx} y={H * 0.24} width={W * 0.07} height={H * 0.74} rx={2}
          fill={color} fillOpacity={0.75} stroke="rgba(0,0,0,0.12)" strokeWidth={0.5} />
      ))}
      {/* shelf */}
      <rect x={W * 0.06} y={H * 0.62} width={W * 0.88} height={H * 0.1} rx={2} fill={color} fillOpacity={0.45} />
      <text x={W / 2} y={H * 0.14} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} rx={4} />
    </>
  );
}

// ── Cabinet ───────────────────────────────────────────────────────────────────
export function ShapeCabinet({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={4} fill={color} stroke={selected ? '#2563EB' : 'rgba(0,0,0,0.25)'} strokeWidth={selected ? 2 : 1} />
      <rect x={0} y={0} width={W} height={H * 0.09} rx={4} fill="rgba(0,0,0,0.28)" />
      {/* door panels */}
      <rect x={W * 0.04} y={H * 0.1} width={W * 0.43} height={H * 0.86} rx={2} fill={WHITE} fillOpacity={0.12} stroke={WHITE} strokeWidth={0.8} />
      <rect x={W * 0.53} y={H * 0.1} width={W * 0.43} height={H * 0.86} rx={2} fill={WHITE} fillOpacity={0.12} stroke={WHITE} strokeWidth={0.8} />
      {/* handles */}
      <rect x={W * 0.41} y={H * 0.44} width={W * 0.05} height={H * 0.12} rx={2} fill={WHITE} fillOpacity={0.65} />
      <rect x={W * 0.54} y={H * 0.44} width={W * 0.05} height={H * 0.12} rx={2} fill={WHITE} fillOpacity={0.65} />
      <text x={W / 2} y={H * 0.07} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Door ──────────────────────────────────────────────────────────────────────
export function ShapeDoor({ width: W, height: H, color, label, selected, type }) {
  const isExit = type === 'exit';
  const fs = labelFontSize(label, W);
  return (
    <>
      {/* wall segments */}
      <rect x={0} y={0} width={W * 0.16} height={H} rx={0} fill="#94a3b8" />
      <rect x={W * 0.84} y={0} width={W * 0.16} height={H} rx={0} fill="#94a3b8" />
      {/* door panel */}
      <rect x={W * 0.16} y={H * 0.04} width={H * 0.88} height={H * 0.92} rx={3}
        fill={color} fillOpacity={0.85} stroke={WHITE} strokeWidth={1} />
      {/* swing arc */}
      <path d={`M ${W * 0.16},${H * 0.04} A ${H * 0.88},${H * 0.88} 0 0 ${isExit ? 0 : 1} ${W * 0.16 + H * 0.88},${H * 0.04 + H * 0.88}`}
        fill={color} fillOpacity={0.12} stroke={color} strokeWidth={1.5} strokeDasharray="5 3" />
      {/* door handle */}
      <circle cx={W * 0.75} cy={H * 0.5} r={3} fill={WHITE} fillOpacity={0.7} />
      {selected && <rect width={W} height={H} fill="none" stroke="#2563EB" strokeWidth={2} strokeDasharray="6 3" />}
      <text x={W * 0.5} y={H * 0.5} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
      <text x={W * 0.5} y={H * 0.78} textAnchor="middle" fontSize={8} fill={WHITE} fillOpacity={0.85} style={{ pointerEvents: 'none', fontWeight: '700' }}>{isExit ? '▲ OUT' : '▼ IN'}</text>
    </>
  );
}

// ── Walkway ───────────────────────────────────────────────────────────────────
export function ShapeWalkway({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={3} fill={color} fillOpacity={0.2}
        stroke={selected ? '#2563EB' : '#9CA3AF'} strokeWidth={selected ? 2 : 1} strokeDasharray={selected ? '' : '10 5'} />
      {/* hatching pattern */}
      {Array.from({ length: Math.floor(W / 20) }).map((_, i) => (
        <line key={i} x1={10 + i * 20} y1={H / 2} x2={22 + i * 20} y2={H / 2}
          stroke="#9CA3AF" strokeWidth={2.5} strokeOpacity={0.6} strokeLinecap="round" />
      ))}
      {/* arrows */}
      <text x={W * 0.25} y={H / 2 + 4} textAnchor="middle" fontSize={Math.min(H - 2, 11)} fill="#6B7280" style={{ pointerEvents: 'none' }}>↕</text>
      <text x={W * 0.75} y={H / 2 + 4} textAnchor="middle" fontSize={Math.min(H - 2, 11)} fill="#6B7280" style={{ pointerEvents: 'none' }}>↕</text>
      <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fontSize={fs} fill="#4B5563" style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Wall ──────────────────────────────────────────────────────────────────────
export function ShapeWall({ width: W, height: H, color, label, selected }) {
  const bH = Math.min(10, H / 2), bW = 20;
  const rows = Math.ceil(H / bH);
  const cols = Math.ceil(W / bW) + 1;
  return (
    <>
      <rect width={W} height={H} fill={color} stroke={selected ? '#2563EB' : '#1F2937'} strokeWidth={selected ? 2 : 1} />
      {Array.from({ length: rows }).map((_, ri) =>
        Array.from({ length: cols }).map((_, ci) => {
          const off = ri % 2 === 0 ? 0 : -bW / 2;
          return <rect key={`${ri}-${ci}`} x={ci * bW + off} y={ri * bH} width={bW - 1} height={bH - 1}
            fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={0.5} />;
        })
      )}
      {selected && <rect width={W} height={H} fill="none" stroke="#2563EB" strokeWidth={2} strokeDasharray="6 3" />}
    </>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────
export function ShapeColumn({ width: W, height: H, color, label, selected }) {
  const cx = W / 2, cy = H / 2;
  return (
    <>
      <rect width={W} height={H} rx={2} fill={color} stroke={selected ? '#2563EB' : '#64748B'} strokeWidth={selected ? 2 : 1.5} />
      {/* cross hatching */}
      <line x1={3} y1={3} x2={W - 3} y2={H - 3} stroke={WHITE} strokeWidth={1} strokeOpacity={0.35} />
      <line x1={W - 3} y1={3} x2={3} y2={H - 3} stroke={WHITE} strokeWidth={1} strokeOpacity={0.35} />
      <circle cx={cx} cy={cy} r={Math.min(W, H) * 0.22} fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth={0.8} />
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Manager desk ──────────────────────────────────────────────────────────────
export function ShapeManagerDesk({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={6} fill={color} stroke={selected ? '#2563EB' : 'rgba(0,0,0,0.25)'} strokeWidth={selected ? 2 : 1} />
      <rect x={0} y={0} width={W} height={H * 0.22} rx={6} fill="rgba(0,0,0,0.2)" />
      {/* monitor */}
      <rect x={W * 0.22} y={H * 0.1} width={W * 0.56} height={H * 0.38} rx={2} fill="#0F172A" />
      <rect x={W * 0.27} y={H * 0.13} width={W * 0.46} height={H * 0.29} rx={1} fill="#1E40AF" fillOpacity={0.4} />
      {/* stand + base */}
      <rect x={W * 0.44} y={H * 0.48} width={W * 0.12} height={H * 0.1} fill="#0F172A" />
      <rect x={W * 0.32} y={H * 0.58} width={W * 0.36} height={H * 0.05} rx={1} fill="#0F172A" />
      {/* keyboard */}
      <rect x={W * 0.16} y={H * 0.7} width={W * 0.68} height={H * 0.18} rx={3} fill={WHITE} fillOpacity={0.22} />
      <text x={W / 2} y={H - 3} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Outlet 220V ───────────────────────────────────────────────────────────────
export function ShapeOutlet220({ width: W, height: H, color, label, selected }) {
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.38;
  return (
    <>
      <rect width={W} height={H} rx={4} fill="#1e293b" stroke={selected ? '#2563EB' : '#475569'} strokeWidth={selected ? 2 : 1.5} />
      <rect x={cx - R} y={cy - R} width={R * 2} height={R * 2} rx={4} fill="#334155" stroke="#64748b" strokeWidth={1} />
      <ellipse cx={cx - R * 0.3} cy={cy - R * 0.2} rx={2.5} ry={4.5} fill="#0F172A" />
      <ellipse cx={cx + R * 0.3} cy={cy - R * 0.2} rx={2.5} ry={4.5} fill="#0F172A" />
      <ellipse cx={cx} cy={cy + R * 0.38} rx={2.5} ry={4.5} fill="#0F172A" />
      <text x={cx} y={H - 4} textAnchor="middle" fontSize={Math.min(10, W * 0.22)} fill="#FCD34D" fontWeight="bold" style={{ pointerEvents: 'none' }}>220V</text>
      {selected && <rect width={W} height={H} rx={4} fill="none" stroke="#2563EB" strokeWidth={2} strokeDasharray="5 3" />}
    </>
  );
}

// ── Outlet 380V ───────────────────────────────────────────────────────────────
export function ShapeOutlet380({ width: W, height: H, color, label, selected }) {
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.38;
  return (
    <>
      <rect width={W} height={H} rx={4} fill="#1e1b4b" stroke={selected ? '#2563EB' : '#6d28d9'} strokeWidth={selected ? 2 : 1.5} />
      <circle cx={cx} cy={cy - R * 0.1} r={R} fill="#312e81" stroke="#7c3aed" strokeWidth={1.5} />
      {[0, 120, 240].map((deg, i) => {
        const rad = (deg - 90) * Math.PI / 180;
        return <ellipse key={i} cx={cx + R * 0.58 * Math.cos(rad)} cy={cy - R * 0.1 + R * 0.58 * Math.sin(rad)} rx={3} ry={4.5} fill="#0F172A" />;
      })}
      <ellipse cx={cx} cy={cy - R * 0.1} rx={3} ry={3} fill="#0F172A" />
      <text x={cx} y={H - 4} textAnchor="middle" fontSize={Math.min(10, W * 0.22)} fill="#A78BFA" fontWeight="bold" style={{ pointerEvents: 'none' }}>380V</text>
      {selected && <rect width={W} height={H} rx={4} fill="none" stroke="#2563EB" strokeWidth={2} strokeDasharray="5 3" />}
    </>
  );
}

// ── Other ─────────────────────────────────────────────────────────────────────
export function ShapeOther({ width: W, height: H, color, label, selected }) {
  const fs = labelFontSize(label, W);
  return (
    <>
      <rect width={W} height={H} rx={6} fill={color} fillOpacity={0.82}
        stroke={selected ? '#2563EB' : WHITE} strokeWidth={selected ? 2 : 1.5} strokeDasharray={selected ? '' : '6 3'} />
      <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fontSize={fs} fill={WHITE} style={LABEL_STYLE}>{label}</text>
      <SelRect W={W} H={H} selected={selected} />
    </>
  );
}

// ── Dispatch map ──────────────────────────────────────────────────────────────
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