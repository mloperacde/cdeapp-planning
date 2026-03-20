import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const SEVERITY_COLORS = {
  Baja: '#16a34a',
  Media: '#ca8a04',
  Alta: '#ea580c',
  Crítica: '#dc2626',
};

const STATUS_COLORS = {
  Pendiente: '#6b7280',
  'En Progreso': '#2563eb',
  Resuelto: '#16a34a',
  Verificado: '#7c3aed',
};

export default function ReportPrintView({ data, onBack }) {
  const printRef = useRef();

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>${data.tituloInforme || 'Informe Técnico'}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Arial', sans-serif; font-size: 10pt; color: #1e293b; background: white; }
          .page { padding: 20mm 20mm 20mm 20mm; max-width: 210mm; margin: 0 auto; }
          h1 { font-size: 16pt; color: #1e3a5f; margin-bottom: 4px; }
          h2 { font-size: 12pt; color: #1e3a5f; border-bottom: 2px solid #2563eb; padding-bottom: 4px; margin: 16px 0 8px; }
          h3 { font-size: 10pt; color: #334155; margin-bottom: 6px; }
          .header { background: #1e3a5f; color: white; padding: 16px 20px; margin: -20mm -20mm 16px; }
          .header h1 { color: white; font-size: 14pt; }
          .header p { color: #94a3b8; font-size: 9pt; margin-top: 2px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
          .meta-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px; }
          .meta-item .label { font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .meta-item .value { font-size: 10pt; font-weight: 600; color: #1e293b; margin-top: 2px; }
          .section { margin-bottom: 16px; }
          .section p { font-size: 10pt; line-height: 1.6; color: #334155; white-space: pre-wrap; }
          .finding { border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 8px; overflow: hidden; page-break-inside: avoid; }
          .finding-header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f8fafc; }
          .finding-body { padding: 8px 12px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 8pt; font-weight: 600; }
          .evidence-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .evidence-item { border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; page-break-inside: avoid; }
          .evidence-item img { width: 100%; height: 120px; object-fit: cover; }
          .evidence-item .caption { padding: 6px 8px; font-size: 8pt; color: #64748b; background: #f8fafc; }
          .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 32px; }
          .signature-box { border: 1px solid #e2e8f0; border-radius: 4px; padding: 12px; }
          .signature-line { border-top: 1px solid #1e293b; margin-top: 40px; padding-top: 6px; font-size: 8pt; color: #64748b; }
          .status-badge { display: inline-block; padding: 3px 12px; border-radius: 12px; font-size: 9pt; font-weight: 700; }
          .page-break { page-break-before: always; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="page">${content}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const fmtDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: es }) : '—';

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-card flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Volver al editor
        </Button>
        <Button onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Printer className="w-4 h-4" /> Imprimir / Exportar PDF
        </Button>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900 p-6">
        <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
          <div ref={printRef} className="print-content">
            {/* Header */}
            <div style={{ background: '#1e3a5f', color: 'white', padding: '20px 24px' }}>
              <div style={{ fontSize: '9pt', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                {data.tipoInforme || 'Informe Técnico'}
              </div>
              <h1 style={{ fontSize: '18pt', fontWeight: 'bold', color: 'white', margin: '0 0 6px' }}>
                {data.tituloInforme || 'Sin título'}
              </h1>
              <div style={{ display: 'flex', gap: '16px', fontSize: '9pt', color: '#94a3b8', flexWrap: 'wrap' }}>
                {data.numeroInforme && <span>📄 Ref: {data.numeroInforme}</span>}
                {data.fecha && <span>📅 {fmtDate(data.fecha)}</span>}
                {data.autor && <span>👤 {data.autor}</span>}
                <span style={{ background: data.estadoInforme === 'Validado' ? '#16a34a' : data.estadoInforme === 'Rechazado' ? '#dc2626' : '#ca8a04', color: 'white', padding: '1px 10px', borderRadius: '10px', fontWeight: 'bold', fontSize: '8pt' }}>
                  {data.estadoInforme}
                </span>
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Meta info grid */}
              <div className="meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
                {[
                  { label: 'Artículo / Equipo', value: data.articulo },
                  { label: 'Código', value: data.productId },
                  { label: 'Sala / Área', value: data.sala },
                  { label: 'Línea', value: data.linea },
                  { label: 'Lote', value: data.lote },
                  { label: 'Fecha Inicio', value: fmtDate(data.fechaInicio) },
                  { label: 'Fecha Fin', value: fmtDate(data.fechaFin) },
                  { label: 'Departamento', value: data.departamento },
                ].filter(f => f.value && f.value !== '—').map(({ label, value }) => (
                  <div key={label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px' }}>
                    <div style={{ fontSize: '7pt', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                    <div style={{ fontSize: '10pt', fontWeight: '600', color: '#1e293b', marginTop: '2px' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Secciones de texto */}
              {[
                { title: '1. Objetivo', content: data.objetivo },
                { title: '2. Alcance', content: data.alcance },
                { title: '3. Resumen Ejecutivo', content: data.resumenEjecutivo },
                { title: '4. Metodología', content: data.metodologia },
              ].filter(s => s.content).map(({ title, content }) => (
                <div key={title} style={{ marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '12pt', color: '#1e3a5f', borderBottom: '2px solid #2563eb', paddingBottom: '4px', marginBottom: '8px' }}>{title}</h2>
                  <p style={{ fontSize: '10pt', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap' }}>{content}</p>
                </div>
              ))}

              {/* Hallazgos */}
              {data.hallazgos?.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '12pt', color: '#1e3a5f', borderBottom: '2px solid #2563eb', paddingBottom: '4px', marginBottom: '8px' }}>
                    5. Hallazgos ({data.hallazgos.length})
                  </h2>
                  {data.hallazgos.map((f, i) => (
                    <div key={f.id || i} style={{ border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '8px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f8fafc', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 'bold', color: '#64748b', fontSize: '8pt' }}>#{i + 1}</span>
                        <span style={{ background: SEVERITY_COLORS[f.severity] || '#6b7280', color: 'white', padding: '1px 8px', borderRadius: '10px', fontSize: '8pt', fontWeight: '600' }}>{f.severity}</span>
                        <span style={{ background: STATUS_COLORS[f.status] || '#6b7280', color: 'white', padding: '1px 8px', borderRadius: '10px', fontSize: '8pt' }}>{f.status}</span>
                        <span style={{ fontWeight: '600', fontSize: '10pt' }}>{f.title}</span>
                        {f.category && <span style={{ color: '#64748b', fontSize: '8pt' }}>({f.category})</span>}
                      </div>
                      {(f.description || f.accionCorrectiva) && (
                        <div style={{ padding: '8px 12px' }}>
                          {f.description && <p style={{ fontSize: '9pt', color: '#334155', marginBottom: '4px' }}>{f.description}</p>}
                          {f.accionCorrectiva && (
                            <p style={{ fontSize: '9pt', color: '#16a34a', borderLeft: '3px solid #16a34a', paddingLeft: '8px', marginTop: '4px' }}>
                              <strong>Acción Correctiva:</strong> {f.accionCorrectiva}
                            </p>
                          )}
                          {(f.responsable || f.fechaLimite) && (
                            <p style={{ fontSize: '8pt', color: '#64748b', marginTop: '4px' }}>
                              {f.responsable && `Responsable: ${f.responsable}`}
                              {f.responsable && f.fechaLimite && ' | '}
                              {f.fechaLimite && `Fecha límite: ${fmtDate(f.fechaLimite)}`}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Evidencias */}
              {data.evidencias?.filter(e => e.type === 'image' && e.url).length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '12pt', color: '#1e3a5f', borderBottom: '2px solid #2563eb', paddingBottom: '4px', marginBottom: '8px' }}>Evidencias Fotográficas</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {data.evidencias.filter(e => e.type === 'image' && e.url).map((e, i) => (
                      <div key={e.id || i} style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <img src={e.url} alt={e.caption} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                        <div style={{ padding: '6px 8px', background: '#f8fafc', fontSize: '8pt', color: '#64748b' }}>{e.caption || `Evidencia ${i + 1}`}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conclusiones y Recomendaciones */}
              {data.conclusiones && (
                <div style={{ marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '12pt', color: '#1e3a5f', borderBottom: '2px solid #2563eb', paddingBottom: '4px', marginBottom: '8px' }}>Conclusiones</h2>
                  <p style={{ fontSize: '10pt', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap' }}>{data.conclusiones}</p>
                </div>
              )}
              {data.recomendaciones && (
                <div style={{ marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '12pt', color: '#1e3a5f', borderBottom: '2px solid #2563eb', paddingBottom: '4px', marginBottom: '8px' }}>Recomendaciones</h2>
                  <p style={{ fontSize: '10pt', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap' }}>{data.recomendaciones}</p>
                </div>
              )}

              {/* Firmas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '32px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '16px' }}>
                  <div style={{ fontSize: '9pt', color: '#64748b', marginBottom: '4px' }}>AUTOR / REDACTOR</div>
                  <div style={{ fontWeight: '600' }}>{data.autor || '________________'}</div>
                  <div style={{ borderTop: '1px solid #1e293b', marginTop: '48px', paddingTop: '6px', fontSize: '8pt', color: '#64748b' }}>
                    {data.firmaAutor ? '✓ Firmado' : 'Firma Pendiente'}
                  </div>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '16px' }}>
                  <div style={{ fontSize: '9pt', color: '#64748b', marginBottom: '4px' }}>APROBADOR QA</div>
                  <div style={{ fontWeight: '600' }}>{data.aprobadorQA || '________________'}</div>
                  <div style={{ borderTop: '1px solid #1e293b', marginTop: '48px', paddingTop: '6px', fontSize: '8pt', color: '#64748b' }}>
                    {data.firmaQA ? '✓ Aprobado' : 'Aprobación Pendiente'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}