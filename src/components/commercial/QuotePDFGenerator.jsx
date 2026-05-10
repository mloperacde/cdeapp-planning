/**
 * Genera y abre un PDF profesional de presupuesto de maquila.
 * Usa window.print() sin librerías externas.
 */

function fmt(n) {
  return (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PRODUCT_TYPE_LABELS = {
  cosmetico: 'Cosmético',
  perfumeria: 'Perfumería',
  sanitario: 'Sanitario / Médico',
  alimenticio: 'Alimenticio',
  otro: 'Otro',
};

const TEXTURE_LABELS = {
  liquido: 'Líquido', crema: 'Crema', gel: 'Gel', emulsion: 'Emulsión',
  spray: 'Spray / Aerosol', polvo: 'Polvo', solido: 'Sólido', otro: 'Otro',
};

const CONTAINER_LABELS = {
  frasco: 'Frasco', bote: 'Bote', tarro: 'Tarro de vidrio', tubo: 'Tubo laminar',
  sachet: 'Sachet / Monodosis', sachet_toallita: 'Sachet con Toallita',
  ampolla: 'Ampolla / Vial', blister: 'Blíster', sobre: 'Sobre', carton: 'Cartón plegable', otro: 'Otro',
};

const STATUS_LABELS = {
  borrador: 'BORRADOR', enviado: 'ENVIADO', aprobado: 'APROBADO',
  rechazado: 'RECHAZADO', cancelado: 'CANCELADO',
};

export function downloadQuotePDF(quote) {
  const pb = quote.price_breakdown || {};
  const lines = quote.service_lines || [];
  const cc = quote.commercial_conditions || {};
  const qs = quote.quality_services || {};
  const today = new Date().toLocaleDateString('es-ES');
  const validUntil = new Date(Date.now() + (quote.validity_days || 30) * 86400000).toLocaleDateString('es-ES');
  const statusLabel = STATUS_LABELS[quote.status] || 'BORRADOR';

  const statusColors = {
    borrador: '#64748b', enviado: '#2563eb', aprobado: '#16a34a',
    rechazado: '#dc2626', cancelado: '#6b7280',
  };
  const statusColor = statusColors[quote.status] || '#64748b';

  // Generar filas de líneas de servicio
  const serviceRowsHtml = lines.map(line => `
    <tr>
      <td class="code">${line.code}</td>
      <td>
        <strong>${line.concept}</strong><br>
        <span class="small grey">${line.description}</span>
      </td>
      <td class="right">${line.is_fixed ? 'Fijo' : `€${(line.unit_cost || 0).toFixed(4)}`}</td>
      <td class="right">${line.is_fixed ? '1' : (line.quantity || 0).toLocaleString('es-ES')}</td>
      <td class="right bold">€${fmt(line.total)}</td>
    </tr>
  `).join('');

  // Materiales 360
  const ms = quote.materials_supply || {};
  const matItems = [
    ms.envase_primario && { label: 'Envase primario', desc: ms.envase_primario_descripcion, cost: ms.envase_primario_coste },
    ms.cierre && { label: 'Cierre / Tapón', desc: ms.cierre_descripcion, cost: ms.cierre_coste },
    ms.etiqueta && { label: 'Etiqueta', desc: ms.etiqueta_descripcion, cost: ms.etiqueta_coste },
    ms.packaging_secundario && { label: 'Packaging secundario', desc: ms.packaging_secundario_descripcion, cost: ms.packaging_secundario_coste },
    ms.materia_prima && { label: 'Materia prima / Granel', desc: ms.materia_prima_descripcion, cost: ms.materia_prima_coste },
  ].filter(Boolean);

  const matHtml = matItems.length > 0 ? `
    <h2>BLOQUE II – Materiales Gestionados (Servicio 360)</h2>
    <table>
      <thead>
        <tr>
          <th>Material</th>
          <th>Descripción / Especificación</th>
          <th class="right">€ / ud.</th>
          <th class="right">Uds.</th>
          <th class="right">Total + Margen</th>
        </tr>
      </thead>
      <tbody>
        ${matItems.map(m => `
          <tr>
            <td>${m.label}</td>
            <td class="grey">${m.desc || '—'}</td>
            <td class="right">€${(m.cost || 0).toFixed(4)}</td>
            <td class="right">${(quote.volume || 0).toLocaleString('es-ES')}</td>
            <td class="right bold">€${fmt((m.cost || 0) * (quote.volume || 0) * ((ms.margen_gestion || 15) / 100 + 1))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <p class="small grey">Margen de gestión de compras aplicado: ${ms.margen_gestion || 15}%</p>
  ` : '';

  // Calidad
  const qualityItems = [
    qs.microbiological_analysis && `Análisis microbiológico del lote: €${fmt(qs.microbiological_cost || 250)}`,
    qs.stability_test && `Pruebas de estabilidad: €${fmt(qs.stability_cost || 500)}`,
    qs.regulatory_management && `Gestión regulatoria (CPNP/Registro): €${fmt(qs.regulatory_cost || 800)}`,
  ].filter(Boolean);

  const qualityHtml = qualityItems.length > 0 ? `
    <h2>BLOQUE III – Calidad y Regulatorio</h2>
    <table>
      <thead><tr><th>Servicio</th><th class="right">Importe</th></tr></thead>
      <tbody>
        ${qualityItems.map(q => {
          const [label, imp] = q.split(': ');
          return `<tr><td>${label}</td><td class="right bold">${imp}</td></tr>`;
        }).join('')}
      </tbody>
    </table>
  ` : '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Presupuesto ${quote.quote_number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', sans-serif; font-size: 12px; color: #1e293b; padding: 40px; line-height: 1.4; }
    
    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #1e40af; }
    .company-name { font-size: 22px; font-weight: 800; color: #1e40af; letter-spacing: -0.5px; }
    .company-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
    .doc-info { text-align: right; }
    .doc-number { font-size: 18px; font-weight: 700; color: #1e293b; }
    .status-badge { display: inline-block; margin-top: 6px; padding: 3px 12px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: 1px; color: white; background: ${statusColor}; }
    
    /* Client & Product row */
    .meta-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
    .meta-box h3 { font-size: 9px; font-weight: 700; color: #94a3b8; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px; }
    .meta-box p { font-size: 12px; margin-bottom: 3px; }
    .meta-box .main { font-size: 14px; font-weight: 700; color: #1e293b; }
    
    /* Tables */
    h2 { font-size: 11px; font-weight: 700; color: #1e40af; letter-spacing: 1px; text-transform: uppercase; margin: 24px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th { background: #1e293b; color: white; font-size: 10px; font-weight: 600; padding: 8px 10px; text-align: left; }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .code { font-family: monospace; font-size: 10px; color: #2563eb; font-weight: 600; white-space: nowrap; }
    .right { text-align: right; white-space: nowrap; }
    .bold { font-weight: 700; }
    .grey { color: #64748b; }
    .small { font-size: 10px; }
    
    /* Totals */
    .totals-box { margin-top: 20px; border: 2px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
    .total-row.subtotal { background: #f8fafc; font-weight: 600; }
    .total-row.grand { background: #1e293b; color: white; font-size: 16px; font-weight: 800; padding: 14px 16px; }
    .total-row.grand .unit { font-size: 11px; color: #94a3b8; font-weight: 400; }
    .total-row.tax { color: #64748b; }
    
    /* Conditions */
    .conditions { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .cond-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
    .cond-box h4 { font-size: 9px; font-weight: 700; color: #94a3b8; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px; }
    .cond-box ul { list-style: none; }
    .cond-box li { font-size: 11px; padding: 3px 0; display: flex; gap: 6px; }
    .cond-box li::before { content: "▸"; color: #2563eb; flex-shrink: 0; }
    
    /* Notes */
    .notes-box { margin-top: 20px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px; }
    .notes-box h4 { font-size: 10px; font-weight: 700; color: #92400e; margin-bottom: 6px; }
    .notes-box p { font-size: 11px; color: #78350f; }
    
    /* Footer */
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
    .highlight-green { color: #16a34a; font-weight: 700; }
    
    @media print { 
      body { padding: 20px; font-size: 11px; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div>
      <div class="company-name">LABORATORIO / MAQUILA</div>
      <div class="company-sub">Envasado a Terceros · Cosmética, Perfumería, Alimentación, Sanitario</div>
    </div>
    <div class="doc-info">
      <div class="doc-number">${quote.quote_number}</div>
      <div>Fecha: ${today} · Válido hasta: ${validUntil}</div>
      <div class="status-badge">${statusLabel}</div>
    </div>
  </div>

  <!-- Cliente + Producto -->
  <div class="meta-row">
    <div class="meta-box">
      <h3>Cliente</h3>
      <p class="main">${quote.client_company || quote.client_name}</p>
      ${quote.client_company ? `<p>${quote.client_name}</p>` : ''}
      ${quote.client_email ? `<p class="grey">${quote.client_email}</p>` : ''}
      ${quote.client_phone ? `<p class="grey">${quote.client_phone}</p>` : ''}
      ${quote.client_address ? `<p class="grey">${quote.client_address}</p>` : ''}
    </div>
    <div class="meta-box">
      <h3>Producto</h3>
      <p class="main">${quote.product_description || PRODUCT_TYPE_LABELS[quote.product_type] || '—'}</p>
      <p>${TEXTURE_LABELS[quote.product_texture] || ''} · ${CONTAINER_LABELS[quote.container_type] || ''}</p>
      <p><strong>Cantidad (MOQ):</strong> ${(quote.volume || 0).toLocaleString('es-ES')} unidades</p>
      ${quote.unit_volume_ml ? `<p>Contenido por unidad: ${quote.unit_volume_ml} ml/gr</p>` : ''}
      <p><strong>Modalidad:</strong> ${quote.quote_type === 'ENVASADO_SOLO' ? 'Maquila Pura' : 'Servicio 360 / Llave en Mano'}</p>
    </div>
  </div>

  <!-- BLOQUE I: Servicios -->
  <h2>BLOQUE I – Servicios de Producción</h2>
  <table>
    <thead>
      <tr>
        <th style="width:70px">Código</th>
        <th>Concepto / Descripción</th>
        <th class="right" style="width:90px">Coste u.</th>
        <th class="right" style="width:80px">Cantidad</th>
        <th class="right" style="width:100px">Total</th>
      </tr>
    </thead>
    <tbody>
      ${serviceRowsHtml}
    </tbody>
  </table>

  ${matHtml}
  ${qualityHtml}

  <!-- Totales -->
  <div class="totals-box">
    <div class="total-row"><span>Subtotal servicios de producción</span><span>€${fmt(pb.services_subtotal)}</span></div>
    ${pb.materials_cost > 0 ? `<div class="total-row"><span>Materiales gestionados (incl. margen gestión)</span><span>€${fmt(pb.materials_cost)}</span></div>` : ''}
    ${pb.quality_cost > 0 ? `<div class="total-row"><span>Calidad y Regulatorio</span><span>€${fmt(pb.quality_cost)}</span></div>` : ''}
    ${pb.distribution_cost > 0 ? `<div class="total-row"><span>Distribución</span><span>€${fmt(pb.distribution_cost)}</span></div>` : ''}
    <div class="total-row subtotal"><span>Subtotal (sin IVA)</span><span>€${fmt(pb.subtotal)}</span></div>
    <div class="total-row tax"><span>IVA (${pb.tax_percentage || 21}%)</span><span>€${fmt(pb.tax_amount)}</span></div>
    <div class="total-row grand">
      <span>TOTAL PRESUPUESTO</span>
      <span>
        <span class="highlight-green">€${fmt(pb.total)}</span>
        ${pb.unit_price > 0 ? `<br><span class="unit">€${pb.unit_price.toFixed(4)} / unidad (s/IVA)</span>` : ''}
      </span>
    </div>
  </div>

  <!-- Condiciones -->
  <div class="conditions">
    <div class="cond-box">
      <h4>Condiciones Comerciales</h4>
      <ul>
        <li>MOQ: ${(quote.volume || 0).toLocaleString('es-ES')} unidades</li>
        <li>Validez: ${quote.validity_days || 30} días desde la fecha de emisión</li>
        <li>Plazo entrega: ${quote.delivery_days || '15-20'} días laborables tras recepción de materiales</li>
        <li>Incoterm: ${cc.incoterm || 'EXW'} (${cc.incoterm === 'EXW' ? 'cliente recoge en fábrica' : 'entrega en destino'})</li>
        <li>Condiciones de pago: ${cc.payment_terms || '50% anticipo, 50% contra entrega'}</li>
      </ul>
    </div>
    <div class="cond-box">
      <h4>Condiciones Técnicas</h4>
      <ul>
        <li>Merma técnica aceptada: ${cc.waste_percentage || 3}% (el cliente debe enviar excedente)</li>
        <li>Almacenaje gratuito: ${cc.storage_days_free || 15} días tras fin de producción</li>
        ${cc.storage_cost_per_pallet ? `<li>Almacenaje adicional: €${cc.storage_cost_per_pallet}/palet/día</li>` : ''}
        ${quote.special_requirements ? `<li>Normativa: ${quote.special_requirements}</li>` : ''}
        <li>El suministro del material gráfico (arte final) es responsabilidad del cliente</li>
      </ul>
    </div>
  </div>

  ${quote.notes ? `
  <div class="notes-box">
    <h4>⚠ Notas y Condiciones Adicionales</h4>
    <p>${quote.notes}</p>
  </div>
  ` : ''}

  <div class="footer">
    <span>${quote.quote_number} · Emitido el ${today}</span>
    <span>Este documento es confidencial y tiene validez de ${quote.validity_days || 30} días.</span>
    <span>Sujeto a cambios en costes de materias primas y energía.</span>
  </div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=1000,height=750');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}