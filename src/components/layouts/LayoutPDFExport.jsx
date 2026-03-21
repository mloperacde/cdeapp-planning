/**
 * LayoutPDFExport — generates a PDF report for a room layout.
 * Uses browser print (window.print) with a dedicated print stylesheet,
 * rendering the SVG canvas + element table + metadata.
 * No external PDF library needed.
 */
import { useRef, useState } from 'react';
import { X, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ELEMENT_TYPES } from './ElementPalette';
import { renderShape } from './ElementShapes';

const STATUS_COLORS = {
  'Borrador':  { bg: '#FEF3C7', text: '#92400E', label: 'BORRADOR' },
  'Aprobado':  { bg: '#D1FAE5', text: '#065F46', label: 'APROBADO' },
  'Archivado': { bg: '#F1F5F9', text: '#475569', label: 'ARCHIVADO' },
};

function getCategoryForType(type) {
  const cfg = ELEMENT_TYPES.find(e => e.type === type);
  return cfg?.category || 'Otros';
}
function getLabelForType(type) {
  const cfg = ELEMENT_TYPES.find(e => e.type === type);
  return cfg?.label || type;
}

/** Build aggregated table data from layout_elements */
function buildElementTable(elements) {
  const map = {};
  for (const el of elements) {
    const key = el.type;
    if (!map[key]) {
      map[key] = {
        type: key,
        typeName: getLabelForType(key),
        category: getCategoryForType(key),
        color: el.color,
        count: 0,
        labels: [],
        widths: [],
        heights: [],
      };
    }
    map[key].count++;
    map[key].labels.push(el.label || getLabelForType(key));
    map[key].widths.push(el.width);
    map[key].heights.push(el.height);
  }
  return Object.values(map).sort((a, b) => a.category.localeCompare(b.category) || a.typeName.localeCompare(b.typeName));
}

/** Inline SVG preview thumbnail for an element type */
function ElementThumb({ type, color, size = 32 }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', flexShrink: 0 }}>
      {renderShape(type, { width: size, height: size, color: color || '#6B7280', label: '', selected: false })}
    </svg>
  );
}

export default function LayoutPDFExport({ data, svgRef, onClose }) {
  const printRef = useRef(null);
  const [printing, setPrinting] = useState(false);

  const elements = data.layout_elements || [];
  const tableRows = buildElementTable(elements);
  const statusCfg = STATUS_COLORS[data.status] || STATUS_COLORS['Borrador'];
  const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

  // Capture the SVG as a data URL for the PDF
  const getSVGDataURL = () => {
    if (!svgRef?.current) return null;
    const svg = svgRef.current;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const encoded = encodeURIComponent(svgStr);
    return `data:image/svg+xml;charset=utf-8,${encoded}`;
  };

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 200);
  };

  const svgDataURL = getSVGDataURL();

  // Group table by category for display
  const categories = [...new Set(tableRows.map(r => r.category))];

  return (
    <>
      {/* Print stylesheet injected in <head> */}
      <style>{`
        @media print {
          body > *:not(#layout-pdf-root) { display: none !important; }
          #layout-pdf-root { display: block !important; position: fixed; inset: 0; z-index: 9999; background: white; }
          .no-print { display: none !important; }
          @page { size: A4 landscape; margin: 12mm 14mm; }
        }
      `}</style>

      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 no-print-overlay">
        {/* Modal preview */}
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
          {/* Modal header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 flex-shrink-0 no-print">
            <div>
              <h2 className="font-semibold text-slate-800 text-sm">Vista previa del informe PDF</h2>
              <p className="text-xs text-slate-400">{elements.length} elementos · {tableRows.length} tipos distintos</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handlePrint} disabled={printing} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs">
                {printing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                Exportar PDF
              </Button>
              <button onClick={onClose} className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable preview */}
          <div className="flex-1 overflow-auto bg-slate-100 p-4">
            {/* ── PDF CONTENT ── */}
            <div id="layout-pdf-root" ref={printRef}
              style={{ background: 'white', width: '100%', maxWidth: 1050, margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: '#1e293b', fontSize: 11 }}>

              {/* ── HEADER ── */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e40af', paddingBottom: 10, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1e40af', letterSpacing: '-0.5px' }}>
                    {data.name || 'Layout sin nombre'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Sala: <strong>{data.room_name || '—'}</strong> &nbsp;·&nbsp; Lienzo: {data.canvas_width || 1200} × {data.canvas_height || 800} px
                  </div>
                  {data.description && (
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3, maxWidth: 500 }}>{data.description}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ display: 'inline-block', background: statusCfg.bg, color: statusCfg.text, fontWeight: 700, fontSize: 11, padding: '3px 10px', borderRadius: 6, letterSpacing: 1 }}>
                    {statusCfg.label}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Generado: {today}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>Elementos: {elements.length} · Tipos: {tableRows.length}</div>
                </div>
              </div>

              {/* ── CANVAS IMAGE ── */}
              {svgDataURL && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Vista 2D del Layout</div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#f8fafc', textAlign: 'center' }}>
                    <img
                      src={svgDataURL}
                      alt="Layout 2D"
                      style={{ maxWidth: '100%', height: 'auto', maxHeight: 340, objectFit: 'contain', display: 'block', margin: '0 auto' }}
                    />
                  </div>
                </div>
              )}

              {/* ── ELEMENTS TABLE ── */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                  Inventario de Elementos
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead>
                    <tr style={{ background: '#1e40af', color: 'white' }}>
                      <th style={th}>Icono</th>
                      <th style={th}>Categoría</th>
                      <th style={th}>Tipo de Elemento</th>
                      <th style={{ ...th, textAlign: 'center' }}>Cant.</th>
                      <th style={th}>Etiquetas</th>
                      <th style={{ ...th, textAlign: 'center' }}>Ancho (px)</th>
                      <th style={{ ...th, textAlign: 'center' }}>Alto (px)</th>
                      <th style={th}>Dimensiones típicas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, idx) => {
                      const avgW = Math.round(row.widths.reduce((a, b) => a + b, 0) / row.widths.length);
                      const avgH = Math.round(row.heights.reduce((a, b) => a + b, 0) / row.heights.length);
                      const uniqueLabels = [...new Set(row.labels)].join(', ');
                      return (
                        <tr key={row.type} style={{ background: idx % 2 === 0 ? '#f8fafc' : 'white', borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ ...td, textAlign: 'center', padding: '4px 6px' }}>
                            <ElementThumb type={row.type} color={row.color} size={28} />
                          </td>
                          <td style={td}>
                            <span style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 4, padding: '1px 5px', fontSize: 9, fontWeight: 600 }}>
                              {row.category}
                            </span>
                          </td>
                          <td style={{ ...td, fontWeight: 600 }}>{row.typeName}</td>
                          <td style={{ ...td, textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{row.count}</td>
                          <td style={{ ...td, color: '#475569', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uniqueLabels}</td>
                          <td style={{ ...td, textAlign: 'center' }}>{avgW}</td>
                          <td style={{ ...td, textAlign: 'center' }}>{avgH}</td>
                          <td style={{ ...td, color: '#64748b' }}>{avgW} × {avgH} px</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
                      <td colSpan={3} style={{ ...td, color: '#1e293b' }}>TOTAL</td>
                      <td style={{ ...td, textAlign: 'center', fontSize: 13 }}>{elements.length}</td>
                      <td colSpan={4} style={td}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* ── SUMMARY STATS ── */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                {[
                  { label: 'Total elementos', value: elements.length, color: '#1e40af' },
                  { label: 'Tipos distintos', value: tableRows.length, color: '#7c3aed' },
                  { label: 'Categorías', value: categories.length, color: '#065F46' },
                  { label: 'Puntos suelo', value: (data.room_polygon || []).length, color: '#92400E' },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, minWidth: 120, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* ── FOOTER ── */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8' }}>
                <span>CDE PlanApp — Informe de Layout</span>
                <span>{data.name} · {today}</span>
                <span>Estado: {data.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const th = {
  padding: '6px 8px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: 10,
  letterSpacing: 0.3,
  borderRight: '1px solid rgba(255,255,255,0.15)',
};

const td = {
  padding: '5px 8px',
  verticalAlign: 'middle',
  fontSize: 10,
};