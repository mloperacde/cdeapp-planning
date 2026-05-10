/**
 * Genera y descarga un PDF del presupuesto usando el DOM + window.print()
 * (sin librerías externas pesadas)
 */
export function downloadQuotePDF(quote) {
  const quoteTypeLabel = quote.quote_type === 'ENVASADO_SOLO' ? 'Solo Envasado' : 'Servicio 360';
  const statusLabel = quote.status ? quote.status.charAt(0).toUpperCase() + quote.status.slice(1) : '';

  const materialRows = quote.quote_type === 'SERVICIO_360' && quote.materials_supply ? `
    <h3>Suministro de Materiales</h3>
    <ul>
      ${quote.materials_supply.blisters ? '<li>✓ Blísteres / Envases primarios</li>' : ''}
      ${quote.materials_supply.printed_cards ? '<li>✓ Tarjetas impresas</li>' : ''}
      ${quote.materials_supply.caps ? '<li>✓ Tapones / Cierres</li>' : ''}
      ${quote.materials_supply.pumps ? '<li>✓ Bombas dosificadoras</li>' : ''}
      ${quote.materials_supply.labels ? '<li>✓ Etiquetas impresas</li>' : ''}
      ${quote.distribution_included ? '<li>✓ Distribución a puntos de venta</li>' : ''}
    </ul>
  ` : '';

  const pb = quote.price_breakdown || {};

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Presupuesto ${quote.quote_number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; padding: 40px; }
    h1 { font-size: 24px; color: #1e40af; margin-bottom: 4px; }
    h2 { font-size: 16px; margin: 24px 0 10px; border-bottom: 2px solid #1e40af; padding-bottom: 4px; color: #1e40af; }
    h3 { font-size: 14px; margin: 16px 0 8px; color: #334155; }
    .subtitle { color: #64748b; margin-bottom: 24px; }
    .badge { display:inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .badge-blue { background:#dbeafe; color:#1e40af; }
    .badge-green { background:#dcfce7; color:#166534; }
    .badge-slate { background:#f1f5f9; color:#334155; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 8px; }
    .field label { font-size: 11px; color: #64748b; display:block; margin-bottom:2px; }
    .field p { font-weight: 600; }
    .price-row { display:flex; justify-content:space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .price-total { display:flex; justify-content:space-between; padding: 12px 0; font-size:16px; font-weight:700; color:#16a34a; border-top: 2px solid #334155; margin-top:4px; }
    ul { list-style:none; padding:0; }
    li { padding: 4px 0; }
    .notes { background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px; margin-top:8px; color:#475569; }
    .footer { margin-top:48px; text-align:center; color:#94a3b8; font-size:11px; border-top:1px solid #e2e8f0; padding-top:16px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>${quote.quote_number}</h1>
  <p class="subtitle">Generado el ${new Date().toLocaleDateString('es-ES')}</p>

  <h2>Información del Cliente</h2>
  <div class="grid">
    <div class="field"><label>Nombre</label><p>${quote.client_name || '-'}</p></div>
    <div class="field"><label>Empresa</label><p>${quote.client_company || '-'}</p></div>
    <div class="field"><label>Email</label><p>${quote.client_email || '-'}</p></div>
    <div class="field"><label>Teléfono</label><p>${quote.client_phone || '-'}</p></div>
  </div>

  <h2>Detalles del Presupuesto</h2>
  <div class="grid">
    <div class="field"><label>Tipo</label><p><span class="badge badge-blue">${quoteTypeLabel}</span></p></div>
    <div class="field"><label>Estado</label><p><span class="badge badge-slate">${statusLabel}</span></p></div>
    <div class="field"><label>Tipo de Producto</label><p style="text-transform:capitalize">${quote.product_type || '-'}</p></div>
    <div class="field"><label>Volumen</label><p>${quote.volume?.toLocaleString('es-ES') || '-'} unidades</p></div>
    <div class="field"><label>Tipo de Envase</label><p style="text-transform:capitalize">${quote.container_type || '-'}</p></div>
    <div class="field"><label>Plazo de Entrega</label><p>${quote.delivery_days ? quote.delivery_days + ' días' : '-'}</p></div>
  </div>

  <h2>Especificaciones de Envasado</h2>
  <div class="grid">
    <div class="field"><label>Sistema de Llenado</label><p>${quote.filling_system?.replace(/_/g, ' ') || '-'}</p></div>
    <div class="field"><label>Etiquetado</label><p>${quote.labeling_system?.replace(/_/g, ' ') || '-'}</p></div>
    <div class="field"><label>Taponado</label><p>${quote.capping_system?.replace(/_/g, ' ') || '-'}</p></div>
    <div class="field"><label>Línea</label><p>${quote.line_type?.replace(/_/g, ' ') || '-'}</p></div>
  </div>

  ${materialRows}

  <h2>Desglose de Precios</h2>
  <div class="price-row"><span>Mano de obra</span><span>€${(pb.labor_cost || 0).toFixed(2)}</span></div>
  <div class="price-row"><span>Máquinas</span><span>€${(pb.machine_cost || 0).toFixed(2)}</span></div>
  ${pb.material_cost > 0 ? `<div class="price-row"><span>Materiales</span><span>€${(pb.material_cost || 0).toFixed(2)}</span></div>` : ''}
  ${pb.distribution_cost > 0 ? `<div class="price-row"><span>Distribución</span><span>€${(pb.distribution_cost || 0).toFixed(2)}</span></div>` : ''}
  <div class="price-row"><span>Subtotal</span><span>€${(pb.subtotal || 0).toFixed(2)}</span></div>
  <div class="price-row"><span>IVA (${pb.tax_percentage || 21}%)</span><span>€${((pb.subtotal || 0) * (pb.tax_percentage || 21) / 100).toFixed(2)}</span></div>
  <div class="price-total"><span>TOTAL</span><span>€${(pb.total || 0).toFixed(2)}</span></div>

  ${quote.notes ? `<h2>Notas</h2><div class="notes">${quote.notes}</div>` : ''}

  <div class="footer">
    ${quote.quote_number} · Documento generado automáticamente
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 500);
}