import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CDE_BASE_URL = 'https://cdeapp.es';

async function cdeApiFetch(endpoint, apiKey, params = {}) {
  const url = new URL(`${CDE_BASE_URL}/api/v1/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.append(k, v);
  });
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`CDEApp API Error ${response.status}: ${text || response.statusText}`);
  }
  return response.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const apiKey = Deno.env.get('CdeApp');
    if (!apiKey) {
      console.error('API Key de CDEApp no configurada');
      return Response.json({ error: 'CdeApp secret no configurado' }, { status: 500 });
    }

    console.log(`[scheduledOrderSync] Iniciando sincronización automática - ${new Date().toISOString()}`);

    // Fetch productions from CDEApp
    const productionsData = await cdeApiFetch('sync-productions', apiKey, {});
    const rawOrders = Array.isArray(productionsData) ? productionsData : (productionsData?.data || productionsData?.results || []);

    console.log(`[scheduledOrderSync] ${rawOrders.length} órdenes recibidas de CDEApp`);

    if (rawOrders.length === 0) {
      return Response.json({ success: true, message: 'Sin órdenes que sincronizar', synced: 0 });
    }

    // Get existing WorkOrders for upsert
    const existing = await base44.asServiceRole.entities.WorkOrder.list('-created_date', 500);
    const existingByOrderNumber = {};
    existing.forEach(o => { if (o.order_number) existingByOrderNumber[o.order_number] = o; });

    // Build strict CDE-ID map: only match machines with explicit cde_machine_id
    // This prevents false positives from numeric token collisions (e.g. machine_id=51 matching
    // a machine that has "51" as part of its name/description but is a different machine)
    const machinesAll = await base44.asServiceRole.entities.MachineMasterDatabase.list('-created_date', 2000);
    const cdeIdMap = new Map();
    (machinesAll || []).forEach(m => {
      if (m.cde_machine_id) cdeIdMap.set(String(m.cde_machine_id).trim(), m.id);
    });

    let created = 0, updated = 0, errors = 0;

    for (const raw of rawOrders) {
      try {
        const orderNumber = String(raw.orden || raw.order_number || raw.id || '').trim();
        if (!orderNumber) continue;

        // Resolve machine via strict CDE ID map only
        const cdeSourceId = String(raw.machine_id || raw.maquina || '').trim();
        let machineId = null;
        if (cdeSourceId) machineId = cdeIdMap.get(cdeSourceId) || null;
        // If not found by CDE ID, try by machine name field
        if (!machineId) {
          const machineName = String(raw.machine_name || raw['Sala / Máquina'] || '').trim();
          if (machineName) {
            const found = (machinesAll || []).find(m => m.nombre === machineName || m.codigo_maquina === machineName);
            if (found) machineId = found.id;
          }
        }

        const quantity = parseFloat(raw.cantidad || raw.quantity || 0) || 0;
        const cadence = parseFloat(raw.cadencia || raw.cadence || raw.production_cadence || 0) || 0;
        const estimatedDuration = (cadence > 0 && quantity > 0) ? Math.round((quantity / cadence) * 100) / 100 : (raw.estimated_duration || null);

        const orderData = {
          order_number: orderNumber,
          machine_id: machineId,
          product_article_code: String(raw.articulo || raw.article_code || raw.codigo_articulo || '').trim(),
          product_name: String(raw.nombre || raw.product_name || raw.nombre_articulo || '').trim(),
          client_name: String(raw.cliente || raw.client_name || '').trim(),
          quantity,
          production_cadence: cadence,
          estimated_duration: estimatedDuration,
          priority: parseInt(raw.prioridad || raw.priority || 3) || 3,
          start_date: raw.fecha_inicio || raw.start_date || null,
          committed_delivery_date: raw.fecha_entrega || raw.nueva_fecha_entrega || raw.committed_delivery_date || null,
          status: raw.estado || raw.status || 'Pendiente',
          notes: raw.observacion || raw.notes || '',
          material_type: raw.material || raw.material_type || '',
          machine_location: raw.sala || raw.machine_location || '',
          external_order_reference: String(raw.pedido || raw.external_order_reference || '').trim(),
          customer_order_reference: String(raw.su_pedido || raw.customer_order_reference || '').trim(),
          missing_components_flag: !!(raw.faltas || raw.missing_components_flag),
          has_customer_delay_note: !!(raw.retraso_cliente || raw.has_customer_delay_note),
        };

        if (existingByOrderNumber[orderNumber]) {
          await base44.asServiceRole.entities.WorkOrder.update(existingByOrderNumber[orderNumber].id, orderData);
          updated++;
        } else {
          await base44.asServiceRole.entities.WorkOrder.create(orderData);
          created++;
        }
      } catch (err) {
        console.error(`Error procesando orden:`, err.message);
        errors++;
      }
    }

    const summary = `Sync completado: ${created} creadas, ${updated} actualizadas, ${errors} errores`;
    console.log(`[scheduledOrderSync] ${summary}`);
    return Response.json({ success: true, message: summary, created, updated, errors, total: rawOrders.length });

  } catch (error) {
    console.error('[scheduledOrderSync] Error crítico:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});