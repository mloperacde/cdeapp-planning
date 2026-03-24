import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CDE_BASE_URL = 'https://cdeapp.es';

async function cdeApiFetch(endpoint, apiKey) {
  const url = `${CDE_BASE_URL}/api/v1/${endpoint}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`CDEApp API Error ${response.status}: ${text || response.statusText}`);
  }
  return response.json();
}

// Parse machine code from CDEApp "Sala / Máquina" field.
// Format: "ROOM_PREFIX MACHINE_CODE - DESCRIPTION" e.g. "109C 201 - PKV VIALES 1.5ML" → "201"
function parseMachineCode(machineName) {
  if (!machineName) return null;
  const match = String(machineName).match(/^\S+\s+(\d+)\s*-/);
  return match ? match[1] : null;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function retry(fn, retries = 3, baseDelay = 1500) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      const isRate = e?.message?.includes('Rate limit') || e?.message?.includes('429');
      if (isRate && i < retries - 1) {
        await sleep(baseDelay * (i + 1));
        continue;
      }
      throw e;
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const apiKey = Deno.env.get('CdeApp');
    if (!apiKey) {
      return Response.json({ error: 'CdeApp secret no configurado' }, { status: 500 });
    }

    console.log(`[scheduledOrderSync] Iniciando - ${new Date().toISOString()}`);

    // 1. Fetch productions from CDEApp
    const productionsData = await cdeApiFetch('sync-productions', apiKey);
    const rawOrders = Array.isArray(productionsData)
      ? productionsData
      : (productionsData?.data || productionsData?.results || []);

    console.log(`[scheduledOrderSync] ${rawOrders.length} órdenes recibidas de CDEApp`);

    if (rawOrders.length === 0) {
      return Response.json({ success: true, message: 'Sin órdenes que sincronizar', synced: 0 });
    }

    // 2. Build machine lookup: codigo_maquina -> record id (exact match, no ambiguity)
    const machinesAll = await base44.asServiceRole.entities.MachineMasterDatabase.list('-created_date', 2000);
    const machineByCode = new Map();
    for (const m of (machinesAll || [])) {
      if (m.codigo_maquina) machineByCode.set(String(m.codigo_maquina).trim(), m.id);
    }
    const unassignedMachine = machinesAll.find(m => m.codigo_maquina === 'ZZ-UNASSIGNED');
    const batchId = `batch_${Date.now()}`;

    // 3. Map all CDEApp orders to WorkOrder format
    const newOrders = [];
    for (const raw of rawOrders) {
      const orderNumber = String(raw['Orden'] || '').trim();
      if (!orderNumber) continue;

      // Machine resolution: extract code from "109C 201 - PKV VIALES 1.5ML" → "201"
      // This prevents wrong assignments when multiple machines share the same room prefix (e.g. 109C)
      const machineName = String(raw['Sala / Máquina'] || '').trim();
      const parsedCode = parseMachineCode(machineName);
      let machineId = parsedCode ? (machineByCode.get(parsedCode) || null) : null;
      if (!machineId && unassignedMachine) machineId = unassignedMachine.id;

      const quantity = parseFloat(raw['Cantidad'] || 0) || 0;
      const cadence = parseFloat(raw['Cadencia'] || 0) || 0;

      newOrders.push({
        order_number: orderNumber,
        machine_id: machineId,
        product_article_code: String(raw['Artículo'] || '').trim(),
        product_name: String(raw['Nombre'] || '').trim(),
        client_name: String(raw['Cliente'] || '').trim(),
        quantity,
        production_cadence: cadence,
        estimated_duration: (cadence > 0 && quantity > 0)
          ? Math.round((quantity / cadence) * 100) / 100
          : null,
        priority: parseInt(raw['Prioridad'] || 3) || 3,
        start_date: raw['Fecha Inicio Limite'] || null,
        committed_delivery_date: raw['Nueva Fecha Entrega'] || raw['Fecha Entrega'] || null,
        status: raw['Estado'] || 'Pendiente',
        material_type: raw['Material'] || '',
        machine_location: machineName,
        external_order_reference: String(raw['Pedido'] || '').trim(),
        customer_order_reference: String(raw['Su Pedido'] || '').trim(),
        missing_components_flag: !!(raw['Faltas'] && raw['Faltas'] !== 'No' && raw['Faltas'] !== ''),
        has_customer_delay_note: !!(raw['Motivo Retraso']),
        notes: JSON.stringify({ ...raw, import_batch_id: batchId }),
      });
    }

    console.log(`[scheduledOrderSync] ${newOrders.length} órdenes mapeadas. Eliminando órdenes antiguas...`);

    // 4. Delete ALL existing WorkOrders in batches of 20
    const existing = await base44.asServiceRole.entities.WorkOrder.list('-created_date', 5000);
    const DELETE_BATCH = 20;
    for (let i = 0; i < existing.length; i += DELETE_BATCH) {
      const chunk = existing.slice(i, i + DELETE_BATCH);
      await Promise.allSettled(chunk.map(o => base44.asServiceRole.entities.WorkOrder.delete(o.id)));
      await sleep(300);
    }
    console.log(`[scheduledOrderSync] ${existing.length} órdenes eliminadas`);

    // 5. BulkCreate all new orders in chunks of 50 (few API calls total)
    const BULK_CHUNK = 50;
    let created = 0;
    let errors = 0;
    for (let i = 0; i < newOrders.length; i += BULK_CHUNK) {
      const chunk = newOrders.slice(i, i + BULK_CHUNK);
      try {
        await retry(() => base44.asServiceRole.entities.WorkOrder.bulkCreate(chunk));
        created += chunk.length;
        console.log(`[scheduledOrderSync] Creadas ${created}/${newOrders.length}`);
      } catch (e) {
        console.error(`[scheduledOrderSync] Error bulkCreate chunk ${i}:`, e.message);
        errors += chunk.length;
      }
      await sleep(600);
    }

    const summary = `Sync completado: ${created} creadas, ${errors} errores (de ${newOrders.length} totales)`;
    console.log(`[scheduledOrderSync] ${summary}`);
    return Response.json({ success: true, message: summary, created, errors, total: newOrders.length });

  } catch (error) {
    console.error('[scheduledOrderSync] Error crítico:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});