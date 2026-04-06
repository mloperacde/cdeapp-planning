import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CDE_BASE_URL = 'https://cdeapp.es';

async function cdeApiFetch(endpoint, apiKey, params = {}) {
  const url = new URL(`${CDE_BASE_URL}/api/v1/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.append(k, String(v));
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

// Fetch ALL productions paginating until exhausted
async function fetchAllProductions(apiKey) {
  const LIMIT = 500;
  const allOrders = [];
  let skip = 0;
  while (true) {
    const data = await cdeApiFetch('sync-productions', apiKey, { limit: LIMIT, skip });
    const page = Array.isArray(data) ? data : (data?.data || data?.results || []);
    allOrders.push(...page);
    console.log(`[scheduledOrderSync] Página skip=${skip}: ${page.length} registros. Total acumulado: ${allOrders.length}`);
    if (page.length < LIMIT) break; // última página
    skip += LIMIT;
    await sleep(500);
  }
  return allOrders;
}

function parseMachineCode(machineName) {
  if (!machineName) return null;
  const s = String(machineName).trim();
  // Formato: "001A 119 - Nombre" → capturar '119'
  const match = s.match(/^\S+\s+(\d+[A-Z]?)\s*-/i);
  if (match) return match[1];
  // Formato: "119 - Nombre" → capturar '119'
  const match2 = s.match(/^(\d+[A-Z]?)\s*-/i);
  if (match2) return match2[1];
  return null;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function retry(fn, retries = 4, baseDelay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      const isRate = e?.message?.includes('Rate limit') || e?.message?.includes('429');
      if (isRate && i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i); // exponential backoff
        console.log(`[scheduledOrderSync] Rate limit, reintentando en ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      throw e;
    }
  }
}

// Fetch ALL existing WorkOrder IDs paginating through entire dataset
async function fetchAllWorkOrderIds(base44) {
  const PAGE = 500;
  const ids = [];
  let skip = 0;
  while (true) {
    const page = await retry(() =>
      base44.asServiceRole.entities.WorkOrder.list('-created_date', PAGE, skip)
    );
    const items = Array.isArray(page) ? page : (page?.items || []);
    for (const o of items) ids.push(o.id);
    console.log(`[scheduledOrderSync] Paginación delete: obtenidos ${ids.length} IDs (página skip=${skip}, size=${items.length})`);
    if (items.length < PAGE) break;
    skip += PAGE;
    await sleep(500);
  }
  return ids;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const apiKey = Deno.env.get('CdeApp');
    if (!apiKey) {
      return Response.json({ error: 'CdeApp secret no configurado' }, { status: 500 });
    }

    console.log(`[scheduledOrderSync] Iniciando - ${new Date().toISOString()}`);

    // 1. Fetch ALL productions from CDEApp (paginated)
    const rawOrders = await fetchAllProductions(apiKey);

    console.log(`[scheduledOrderSync] ${rawOrders.length} órdenes recibidas de CDEApp`);

    if (rawOrders.length === 0) {
      return Response.json({ success: true, message: 'Sin órdenes que sincronizar', synced: 0 });
    }

    // 2. Build machine lookup
    const machinesAll = await retry(() =>
      base44.asServiceRole.entities.MachineMasterDatabase.list('-created_date', 2000)
    );
    const machineByCode = new Map();
    for (const m of (machinesAll || [])) {
      if (m.codigo_maquina) machineByCode.set(String(m.codigo_maquina).trim(), m.id);
    }
    const unassignedMachine = machinesAll.find(m => m.codigo_maquina === 'ZZ-UNASSIGNED');

    // 3. Map orders (deduplicate strictly by order_number — keep last occurrence)
    // Also validate: within the same machine, priorities must be unique
    const orderMap = new Map();
    for (const raw of rawOrders) {
      const orderNumber = String(raw['Orden'] || raw['orden'] || '').trim();
      if (!orderNumber || orderNumber === '0') continue;

      const machineName = String(raw['Sala / Máquina'] || '').trim();
      const parsedCode = parseMachineCode(machineName);
      let machineId = parsedCode ? (machineByCode.get(parsedCode) || null) : null;
      if (!machineId && unassignedMachine) machineId = unassignedMachine.id;

      const quantity = parseFloat(raw['Cantidad'] || 0) || 0;
      const cadence = parseFloat(raw['Cadencia'] || 0) || 0;

      orderMap.set(orderNumber, {
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
        priority: (raw['Prioridad'] !== undefined && raw['Prioridad'] !== null && raw['Prioridad'] !== '') ? (parseFloat(raw['Prioridad']) || 0) : 0,
        start_date: raw['Fecha Inicio Limite'] || null,
        committed_delivery_date: raw['Nueva Fecha Entrega'] || raw['Fecha Entrega'] || null,
        status: raw['Estado'] || 'Pendiente',
        material_type: raw['Material'] || '',
        machine_location: machineName,
        external_order_reference: String(raw['Pedido'] || '').trim(),
        customer_order_reference: String(raw['Su Pedido'] || '').trim(),
        missing_components_flag: !!(raw['Faltas'] && raw['Faltas'] !== 'No' && raw['Faltas'] !== ''),
        has_customer_delay_note: !!(raw['Motivo Retraso']),
        planned_end_date: raw['Fecha Fin'] || null,
        notes: raw['Observación'] || '',
      });
    }
    const newOrders = Array.from(orderMap.values());
    console.log(`[scheduledOrderSync] ${newOrders.length} órdenes únicas mapeadas`);

    // Validate: detect duplicate priorities per machine (log only, source data issue)
    const machinePriorityMap = new Map();
    let priorityConflicts = 0;
    for (const o of newOrders) {
      if (!o.machine_id || !o.priority || o.priority === 0) continue;
      const key = `${o.machine_id}::${o.priority}`;
      if (machinePriorityMap.has(key)) {
        priorityConflicts++;
        console.warn(`[scheduledOrderSync] CONFLICTO prioridad ${o.priority} en máquina ${o.machine_id}: orden ${o.order_number} vs ${machinePriorityMap.get(key)}`);
      } else {
        machinePriorityMap.set(key, o.order_number);
      }
    }
    if (priorityConflicts > 0) {
      console.warn(`[scheduledOrderSync] Total conflictos de prioridad detectados: ${priorityConflicts} (datos de origen CDEApp)`);
    }

    // 4. Delete ALL existing records (paginated to ensure completeness)
    const allIds = await fetchAllWorkOrderIds(base44);
    console.log(`[scheduledOrderSync] Eliminando ${allIds.length} registros existentes...`);

    const DEL_BATCH = 50;
    let deleted = 0;
    for (let i = 0; i < allIds.length; i += DEL_BATCH) {
      const chunk = allIds.slice(i, i + DEL_BATCH);
      await Promise.allSettled(
        chunk.map(id => retry(() => base44.asServiceRole.entities.WorkOrder.delete(id), 3, 500))
      );
      deleted += chunk.length;
      if (deleted % 200 === 0) {
        console.log(`[scheduledOrderSync] Eliminados ${deleted}/${allIds.length}`);
      }
      await sleep(300);
    }
    if (deleted > 0) await sleep(1000);
    console.log(`[scheduledOrderSync] ${deleted} registros eliminados. Creando nuevos...`);

    // 5. BulkCreate all new orders in batches
    const BULK_CHUNK = 100;
    let created = 0;
    let errors = 0;
    for (let i = 0; i < newOrders.length; i += BULK_CHUNK) {
      const chunk = newOrders.slice(i, i + BULK_CHUNK);
      try {
        await retry(() => base44.asServiceRole.entities.WorkOrder.bulkCreate(chunk), 5, 1500);
        created += chunk.length;
        console.log(`[scheduledOrderSync] Creadas ${created}/${newOrders.length}`);
      } catch (e) {
        console.error(`[scheduledOrderSync] Error bulkCreate chunk ${i}:`, e.message);
        for (const order of chunk) {
          try {
            await retry(() => base44.asServiceRole.entities.WorkOrder.create(order), 3, 1000);
            created++;
            await sleep(100);
          } catch (e2) {
            console.error(`[scheduledOrderSync] Error individual ${order.order_number}:`, e2.message);
            errors++;
          }
        }
      }
      await sleep(500);
    }
    const summary = `Sync completado: ${deleted} eliminadas, ${created} creadas, ${errors} errores`;
    console.log(`[scheduledOrderSync] ${summary}`);
    return Response.json({
      success: true,
      message: summary,
      deleted,
      created,
      errors,
      total: newOrders.length
    });

  } catch (error) {
    console.error('[scheduledOrderSync] Error crítico:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});