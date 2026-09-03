import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CDE_BASE_URL = 'https://cdeapp.es';

async function cdeApiFetch(endpoint, apiKey, params = {}) {
  const url = new URL(`${CDE_BASE_URL}/api/v1/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.append(k, String(v));
  });
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    }
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`CDEApp API Error ${response.status}: ${text || response.statusText}`);
  }
  return response.json();
}

async function fetchAllProductions(apiKey) {
  const LIMIT = 500;
  const allOrders = [];
  let skip = 0;
  while (true) {
    const data = await cdeApiFetch('sync-productions', apiKey, { limit: LIMIT, skip });
    const page = Array.isArray(data) ? data : (data?.data || data?.results || []);
    allOrders.push(...page);
    if (page.length < LIMIT) break;
    skip += LIMIT;
    await sleep(300);
  }
  return allOrders;
}

function parseMachineCode(machineName) {
  if (!machineName) return null;
  const s = String(machineName).trim();
  const match = s.match(/^\S+\s+(\d+[A-Z]?)\s*-/i);
  if (match) return match[1];
  const match2 = s.match(/^(\d+[A-Z]?)\s*-/i);
  if (match2) return match2[1];
  return null;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function retry(fn, retries = 4, baseDelay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      const isRate = e?.message?.includes('Rate limit') || e?.message?.includes('429');
      if (isRate && i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await sleep(delay);
        continue;
      }
      throw e;
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: allow admins or system/automation calls (no user token)
    try {
      const user = await base44.auth.me().catch(() => null);
      const userRole = (user?.role || '').toLowerCase();
      if (user && user.email && userRole !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch {
      // No authenticated user — this is a scheduled automation call, allow it
    }

    const apiKey = Deno.env.get('CdeApp');
    if (!apiKey) {
      return Response.json({ error: 'CdeApp secret no configurado' }, { status: 500 });
    }

    // Accept raw orders from the request body (frontend-fetched) to bypass
    // Cloudflare blocks on backend server IPs. If not provided, fetch from CDEApp.
    const body = await req.json().catch(() => ({}));
    let rawOrders = Array.isArray(body.rawOrders) ? body.rawOrders : null;

    console.log(`[scheduledOrderSync] Iniciando - ${new Date().toISOString()}`);

    if (!rawOrders) {
      rawOrders = await fetchAllProductions(apiKey);
    }
    console.log(`[scheduledOrderSync] ${rawOrders.length} órdenes recibidas${body.rawOrders ? ' (desde frontend)' : ' (desde CDEApp)'}`);

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

    // 3. Preservar la configuración de personal (personal_requerido / operadores_requeridos)
    // de las órdenes existentes antes de borrarlas, y recopilar IDs para el borrado posterior.
    const staffByOrderNumber = new Map();
    let skipDel = 0;
    const allExistingIds = [];
    while (true) {
      const page = await retry(() =>
        base44.asServiceRole.entities.WorkOrder.list('-created_date', 500, skipDel)
      );
      const items = Array.isArray(page) ? page : (page?.items || []);
      for (const o of items) {
        allExistingIds.push(o.id);
        const key = String(o.order_number || o.id).trim().toUpperCase().replace(/\s+/g, ' ');
        const hasStaff = (Array.isArray(o.personal_requerido) && o.personal_requerido.length > 0)
          || (o.operadores_requeridos && o.operadores_requeridos > 0);
        if (hasStaff && !staffByOrderNumber.has(key)) {
          staffByOrderNumber.set(key, {
            personal_requerido: Array.isArray(o.personal_requerido) ? o.personal_requerido : [],
            operadores_requeridos: o.operadores_requeridos ?? null,
          });
        }
      }
      if (items.length < 500) break;
      skipDel += 500;
      await sleep(200);
    }
    console.log(`[scheduledOrderSync] ${allExistingIds.length} registros existentes; ${staffByOrderNumber.size} con personal configurado`);

    // 4. Map & deduplicate incoming orders by order_number
    const newOrders = [];
    const seen = new Set();
    for (const raw of rawOrders) {
      const orderNumber = String(raw['Orden'] || raw['orden'] || '').trim().toUpperCase().replace(/\s+/g, ' ');
      if (!orderNumber || orderNumber === '0' || seen.has(orderNumber)) continue;
      seen.add(orderNumber);

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
        estimated_duration: (cadence > 0 && quantity > 0) ? Math.round((quantity / cadence) * 100) / 100 : null,
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

      // Restaurar la configuración de personal conservada de la orden previa
      const preservedStaff = staffByOrderNumber.get(orderNumber);
      if (preservedStaff) {
        newOrders[newOrders.length - 1].personal_requerido = preservedStaff.personal_requerido;
        newOrders[newOrders.length - 1].operadores_requeridos = preservedStaff.operadores_requeridos
          ?? (Array.isArray(preservedStaff.personal_requerido)
            ? preservedStaff.personal_requerido.reduce((s, r) => s + (Number(r.cantidad_operarios) || 0), 0)
            : null);
      }
    }
    console.log(`[scheduledOrderSync] ${newOrders.length} órdenes únicas a importar`);

    // 5. Delete existing records (IDs recopilados en el paso 3) in parallel batches.
    // Se verifica cada resultado de allSettled y se reintenta los fallidos, porque un
    // borrado fallido (500/transitorio) dejaría el registro vivo y generaría duplicados
    // al recrear la orden en el siguiente paso.
    let deleted = 0;
    let failedIds = [...allExistingIds];
    const DEL_BATCH = 50;
    for (let attempt = 0; attempt < 4 && failedIds.length > 0; attempt++) {
      const nextFailed = [];
      for (let i = 0; i < failedIds.length; i += DEL_BATCH) {
        const chunk = failedIds.slice(i, i + DEL_BATCH);
        const results = await Promise.allSettled(
          chunk.map(id => retry(() => base44.asServiceRole.entities.WorkOrder.delete(id), 4, 800))
        );
        results.forEach((r, idx) => {
          if (r.status === 'fulfilled') deleted += 1;
          else nextFailed.push(chunk[idx]);
        });
        await sleep(800);
      }
      failedIds = nextFailed;
      if (failedIds.length > 0) {
        console.log(`[scheduledOrderSync] ${failedIds.length} borrados fallidos; reintentando (intento ${attempt + 1})...`);
        await sleep(1500);
      }
    }
    console.log(`[scheduledOrderSync] ${deleted} eliminados, ${failedIds.length} fallidos definitivos.`);

    // Verificación: re-consultar órdenes restantes y eliminarlas para garantizar
    // un estado limpio antes de crear (evita duplicados por borrados fallidos).
    let verifySkip = 0;
    let leftover = [];
    while (true) {
      const page = await retry(() =>
        base44.asServiceRole.entities.WorkOrder.list('-created_date', 500, verifySkip)
      );
      const items = Array.isArray(page) ? page : (page?.items || []);
      leftover.push(...items);
      if (items.length < 500) break;
      verifySkip += 500;
      await sleep(200);
    }
    if (leftover.length > 0) {
      console.log(`[scheduledOrderSync] ${leftover.length} registros persisten tras borrado; forzando eliminación.`);
      for (let i = 0; i < leftover.length; i += DEL_BATCH) {
        const chunk = leftover.slice(i, i + DEL_BATCH);
        await Promise.allSettled(
          chunk.map(o => retry(() => base44.asServiceRole.entities.WorkOrder.delete(o.id), 4, 800))
        );
        deleted += chunk.length;
        await sleep(800);
      }
    }
    console.log(`[scheduledOrderSync] Estado limpio. Iniciando creación...`);
    if (deleted > 0) await sleep(500);

    // 5. BulkCreate all new orders in chunks of 200
    let created = 0, errors = 0;
    const BULK_CHUNK = 200;
    for (let i = 0; i < newOrders.length; i += BULK_CHUNK) {
      const chunk = newOrders.slice(i, i + BULK_CHUNK);
      try {
        await retry(() => base44.asServiceRole.entities.WorkOrder.bulkCreate(chunk), 5, 1000);
        created += chunk.length;
        console.log(`[scheduledOrderSync] Creadas ${created}/${newOrders.length}`);
      } catch (e) {
        console.error(`[scheduledOrderSync] Error bulkCreate:`, e.message);
        errors += chunk.length;
      }
      await sleep(300);
    }

    const summary = `Sync completado: ${deleted} eliminadas, ${created} creadas, ${errors} errores`;
    console.log(`[scheduledOrderSync] ${summary}`);
    return Response.json({ success: true, message: summary, deleted, created, errors, total: newOrders.length });

  } catch (error) {
    console.error('[scheduledOrderSync] Error crítico:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});