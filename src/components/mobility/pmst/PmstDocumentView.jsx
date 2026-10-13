import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CAM_REQUIREMENTS, PMST_DISCLAIMER, MEASURE_CATEGORIES } from '@/components/mobility/pmst/pmstRequirements';
import { Printer, Download, FileText } from 'lucide-react';

function KV({ label, value }) {
  return (
    <div className="flex gap-2 text-sm py-1">
      <span className="text-muted-foreground w-52 flex-shrink-0">{label}</span>
      <span className="font-medium">{value || '—'}</span>
    </div>
  );
}

function Block({ num, title, children }) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-bold uppercase tracking-wide border-b pb-1 mb-3">{num}. {title}</h2>
      {children}
    </section>
  );
}

function Table({ head, rows }) {
  if (!rows.length) return <p className="text-xs text-muted-foreground">Sin datos registrados.</p>;
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr>{head.map((h) => <th key={h} className="border bg-muted/60 px-2 py-1 text-left font-semibold">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j} className="border px-2 py-1 align-top">{c || '—'}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PmstDocumentView({ plan, workCenter }) {
  if (!plan) return null;
  const i = plan.identificacion || {};
  const a = plan.alcance || {};
  const m = plan.metodologia || {};
  const d = plan.diagnostico || {};
  const medidas = plan.medidas || [];
  const indicadores = plan.indicadores || [];
  const negociacion = plan.negociacion || [];
  const seguimientos = plan.seguimientos || [];
  const checklist = plan.checklist || {};
  const code = plan.codigo_documento || `PMST-${(plan.work_center_name || 'centro').slice(0, 12)}`;

  const download = () => {
    const inner = document.getElementById('pmst-document')?.innerHTML || '';
    const css = 'body{font-family:Arial,Helvetica,sans-serif;color:#111827;padding:40px;line-height:1.5}h1{font-size:20px;margin:0}h2{font-size:13px;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #cbd5e1;padding-bottom:4px;margin-top:20px}table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #cbd5e1;padding:5px;font-size:11px;text-align:left}th{background:#f1f5f9}.muted{color:#64748b;font-size:11px}';
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${code}</title><style>${css}</style></head><body>${inner}</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${code}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" /> Imprimir</Button>
        <Button onClick={download}><Download className="w-4 h-4 mr-1" /> Descargar documento</Button>
      </div>

      <div id="pmst-document" className="pmst-print-area bg-white text-foreground border rounded-lg p-6 lg:p-10 shadow-sm">
        <header className="border-b-2 border-primary pb-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Plan de Movilidad Sostenible al Trabajo</p>
          <h1 className="text-xl font-bold mt-1">{i.centro_nombre || workCenter?.nombre || 'Centro de trabajo'}</h1>
          <p className="text-sm text-muted-foreground">{i.direccion || workCenter?.direccion}{i.municipio ? `, ${i.municipio}` : ''}{i.provincia ? ` (${i.provincia})` : ''}</p>
          <div className="flex flex-wrap gap-2 mt-3 text-xs">
            <Badge variant="outline">Código: {code}</Badge>
            <Badge variant="outline">Versión: {plan.version}</Badge>
            <Badge variant="secondary">{plan.estado}</Badge>
            <Badge variant="outline">Autoridad: {i.autoridad_competente || 'Comunidad de Madrid'}</Badge>
          </div>
        </header>

        <Block num="1" title="Identificación">
          <KV label="Razón social" value={i.razon_social} />
          <KV label="CIF" value={i.cif} />
          <KV label="Centro de trabajo" value={i.centro_nombre || workCenter?.nombre} />
          <KV label="Dirección" value={`${i.direccion || ''} ${i.codigo_postal || ''} ${i.municipio || ''} ${i.provincia || ''}`.trim()} />
          <KV label="Polígono industrial" value={i.poligono_industrial} />
          <KV label="Persona responsable" value={`${i.persona_responsable || ''}${i.cargo_responsable ? ` (${i.cargo_responsable})` : ''}`} />
          <KV label="Contacto" value={`${i.email_contacto || ''} ${i.telefono || ''}`.trim()} />
          <KV label="Fecha de elaboración" value={i.fecha_elaboracion} />
          <KV label="Periodo de vigencia" value={i.periodo_vigencia} />
          <KV label="Fecha de aprobación" value={plan.fecha_aprobacion} />
          <KV label="Entrada en vigor" value={plan.fecha_entrada_vigor} />
        </Block>

        <Block num="2" title="Alcance">
          <KV label="Plantilla total" value={a.plantilla_total} />
          <KV label="Número de turnos" value={a.num_turnos} />
          <KV label="Personas por turno" value={Object.entries(a.trabajadores_por_turno || {}).map(([k, v]) => `${k}: ${v}`).join(' · ')} />
          <KV label="Horarios" value={a.horarios} />
          <KV label="Modalidades de trabajo" value={a.modalidades} />
          <KV label="Distancia media" value={a.distancias_medias_km ? `${a.distancias_medias_km} km` : ''} />
          <KV label="Plazas de aparcamiento" value={a.plazas_aparcamiento} />
          <div className="text-sm mt-2"><p className="text-muted-foreground">Accesos y entorno</p><p>{a.accesos_descripcion || '—'}</p></div>
          <div className="text-sm mt-2"><p className="text-muted-foreground">Transporte público cercano</p><p>{a.transporte_publico || '—'}</p></div>
        </Block>

        <Block num="3" title="Metodología del diagnóstico">
          <KV label="Fuentes" value={(m.fuentes || []).join(', ')} />
          <KV label="Periodo de referencia" value={m.periodo_referencia} />
          <KV label="Técnica" value={m.tecnica} />
          <KV label="Muestra" value={m.tamano_muestra} />
          <KV label="Ámbito temporal" value={m.ambito_temporal} />
          <KV label="Fecha del trabajo de campo" value={m.fecha_trabajo_campo} />
          <KV label="Responsable técnico" value={m.responsable_tecnico} />
          <p className="text-sm mt-2"><span className="text-muted-foreground">Tratamiento de datos: </span>{m.tratamiento_datos || 'Datos tratados de forma anónima y agregada.'}</p>
        </Block>

        <Block num="4" title="Diagnóstico de movilidad">
          <p className="text-xs font-semibold mt-2 mb-1">Reparto modal</p>
          <Table head={['Modo de transporte', '%']} rows={(d.reparto_modal || []).map((r) => [r.modo, r.porcentaje != null ? `${r.porcentaje}%` : ''])} />
          <p className="text-xs font-semibold mt-3 mb-1">Zonas de origen</p>
          <Table head={['Zona', '%']} rows={(d.origen_zonas || []).map((r) => [r.zona, r.porcentaje != null ? `${r.porcentaje}%` : ''])} />
          <KV label="Distancia media" value={d.distancia_media_km ? `${d.distancia_media_km} km` : ''} />
          <KV label="Emisiones estimadas" value={d.emisiones_estimadas_t ? `${d.emisiones_estimadas_t} t CO₂eq/año` : ''} />
          <KV label="Motivos de uso del vehículo" value={d.motivos_uso} />
          <KV label="Barreras detectadas" value={d.barreras} />
          <KV label="Accesibilidad al transporte público" value={d.accesibilidad_tp} />
          <KV label="Aparcamiento" value={d.aparcamiento} />
          <KV label="Fuentes de datos" value={d.fuentes_datos} />
          <p className="text-sm mt-2"><span className="text-muted-foreground">Conclusiones: </span>{d.conclusiones || '—'}</p>
        </Block>

        <Block num="5" title="Medidas del plan">
          <Table
            head={['Categoría', 'Medida', 'Responsable', 'Plazo', 'Estado', 'Progreso', 'Indicador / Meta']}
            rows={medidas.map((x) => [
              x.categoria,
              `${x.titulo || ''}${x.descripcion ? ` — ${x.descripcion}` : ''}`,
              x.responsable,
              [x.fecha_inicio, x.fecha_fin_prevista].filter(Boolean).join(' → '),
              x.estado,
              `${x.progreso || 0}%`,
              [x.indicador, x.meta].filter(Boolean).join(' / '),
            ])}
          />
          <p className="text-xs muted text-muted-foreground mt-2">Categorías contempladas en la normativa: {MEASURE_CATEGORIES.slice(0, 5).join(', ')}.</p>
        </Block>

        <Block num="6" title="Indicadores de seguimiento">
          <Table
            head={['Indicador', 'Unidad', 'Valor base', 'Valor actual', 'Meta']}
            rows={indicadores.map((x) => [x.nombre, x.unidad, x.valor_base, x.valor_actual, x.meta])}
          />
          <KV label="Próximo informe" value={plan.proximo_seguimiento} />
        </Block>

        <Block num="7" title="Negociación con la representación legal">
          <Table
            head={['Fecha', 'Tipo', 'Participantes', 'Resumen y acuerdos', 'Evidencia']}
            rows={negociacion.map((x) => [x.fecha, x.tipo, x.participantes, x.resumen, x.documento_nombre])}
          />
        </Block>

        <Block num="8" title="Informes de seguimiento">
          <Table
            head={['Fecha', 'Periodo', 'Nivel de implantación', 'Conclusiones', 'Elaborado por']}
            rows={seguimientos.map((x) => [x.fecha_informe, x.periodo, x.nivel_implantacion != null ? `${x.nivel_implantacion}%` : '', x.conclusiones, x.elaborado_por])}
          />
        </Block>

        <Block num="9" title="Requisitos de registro y aspectos a validar">
          <Table
            head={['Requisito', 'Estado', 'Referencia', 'Detalle']}
            rows={CAM_REQUIREMENTS.map((r) => [r.titulo, r.estado === 'confirmado' ? 'Confirmado' : 'A validar', r.referencia, r.detalle])}
          />
          <KV label="Validación del DPD" value={checklist.dpd_validado ? 'Validado' : 'Pendiente'} />
          <KV label="Registro o depósito" value={plan.registrado_edim ? `Realizado${plan.fecha_registro_edim ? ` (${plan.fecha_registro_edim})` : ''}` : 'Pendiente'} />
          <KV label="Fecha de consulta normativa" value={checklist.fecha_consulta_normativa} />
        </Block>

        <Block num="10" title="Anexos y evidencias">
          <Table
            head={['Documento', 'Tipo', 'Fecha']}
            rows={(plan.documentos || []).map((x) => [x.nombre, x.tipo, x.fecha_subida ? new Date(x.fecha_subida).toLocaleDateString('es-ES') : ''])}
          />
          <p className="text-xs font-semibold mt-2">Evidencias de negociación</p>
          <ul className="text-xs list-disc list-inside">
            {negociacion.filter((x) => x.documento_nombre).map((x, idx) => <li key={idx}>{x.fecha} — {x.documento_nombre}</li>)}
            {negociacion.filter((x) => x.documento_nombre).length === 0 && <li className="text-muted-foreground">Sin evidencias adjuntas.</li>}
          </ul>
        </Block>

        <Block num="11" title="Aprobación y firma">
          <div className="grid grid-cols-2 gap-8 mt-6 text-sm">
            <div>
              <div className="border-t pt-1 mt-10">Firma de la persona responsable</div>
              <p className="text-xs text-muted-foreground mt-1">{i.persona_responsable || ''} {i.cargo_responsable ? `· ${i.cargo_responsable}` : ''}</p>
            </div>
            <div>
              <div className="border-t pt-1 mt-10">Firma por la representación legal</div>
              <p className="text-xs text-muted-foreground mt-1">{negociacion[0]?.participantes || ''}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">Fecha de emisión del documento: {new Date().toLocaleDateString('es-ES')}</p>
        </Block>

        <footer className="mt-8 pt-3 border-t text-[11px] text-muted-foreground">
          <p>{PMST_DISCLAIMER}</p>
          <p className="flex items-center gap-1 mt-1"><FileText className="w-3 h-3" /> Documento generado desde el módulo de Movilidad Sostenible. Debe contrastarse con las fuentes oficiales vigentes antes de su presentación.</p>
        </footer>
      </div>
    </div>
  );
}