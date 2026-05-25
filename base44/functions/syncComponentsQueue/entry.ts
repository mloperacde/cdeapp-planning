import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CDE_BASE_URL = 'https://cdeapp.es';
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 300;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 800;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch con reintentos y backoff exponencial
 */
async function cdeApiFetch(endpoint, apiKey, params = {}, retries = MAX_RETRIES) {
  const url = new URL(`${CDE_BASE_URL}/api/v1/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.append(k, String(v));
  });

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await sleep(delay);
    }

    try {
      const response = await fetch(url.toString(), {
        headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(30000)
      });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
        await sleep(retryAfter * 1000);
        lastError = new Error('Rate limit 429');
        continue;
      }
      if (response.status >= 500) {
        const text = await response.text().catch(() => '');
        lastError = new Error(`Server error ${response.status}: ${text}`);
        continue;
      }
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`CDEApp Error ${response.status}: ${text || response.statusText}`);
      }

      return await response.json();

    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        lastError = new Error(`Timeout en ${endpoint}`);
        continue;
      }
      if (attempt < retries && (err.name === 'TypeError')) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error(`Fallo tras ${retries} reintentos`);
}

/**
 * Ejecutar una operación de BD con reintento (para errores transitorios)
 */
async function withRetry(fn, label = '') {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < 2) await sleep(500 * (i + 1));
    }
  }
  throw new Error(`DB op failed (${label}): ${lastErr.message}`);
}

function normalizeRows(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && data.headers && Array.isArray(data.rows)) {
    return data.rows.map(r => {
      const obj = {};
      data.headers.forEach((h, i) => { obj[h] = r[i]; });
      return obj;
    });
  }
  return [];
}

// ════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role?.toLowerCase() !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { action, job_id } = body;

    // ── GET STATUS ───────────────────────────────────────────
    if (action === 'get-status') {
      if (!job_id) return Response.json({ error: 'job_id required' }, { status: 400 });
      const jobs = await base44.asServiceRole.entities.SyncJob.filter({ id: job_id });
      const job = jobs?.[0] || null;
      return Response.json({ success: true, job });
    }

    // ── START SYNC COMPONENTS ────────────────────────────────
    if (action === 'start-sync-components') {
      const apiKey = Deno.env.get('CdeApp');
      if (!apiKey) return Response.json({ error: 'API Key de CDEApp no configurada' }, { status: 500 });

      const job = await base44.asServiceRole.entities.SyncJob.create({
        job_type: 'sync-components',
        status: 'running',
        total: 0, processed: 0, created_count: 0, updated_count: 0,
        started_at: new Date().toISOString(),
        triggered_by: user.email || user.full_name
      });

      // Fire & forget — procesamiento en background
      processComponentsBackground(base44, apiKey, job.id).catch(async (err) => {
        console.error('[syncComponentsQueue] Background error:', err.message);
        await base44.asServiceRole.entities.SyncJob.update(job.id, {
          status: 'error',
          error_message: err.message,
          completed_at: new Date().toISOString()
        }).catch(() => {});
      });

      return Response.json({ success: true, job_id: job.id });
    }

    // ── START SYNC ARTICLES ──────────────────────────────────
    if (action === 'start-sync-articles') {
      const apiKey = Deno.env.get('CdeApp');
      if (!apiKey) return Response.json({ error: 'API Key de CDEApp no configurada' }, { status: 500 });

      const job = await base44.asServiceRole.entities.SyncJob.create({
        job_type: 'sync-articles',
        status: 'running',
        total: 0, processed: 0, created_count: 0, updated_count: 0,
        started_at: new Date().toISOString(),
        triggered_by: user.email || user.full_name
      });

      processArticlesBackground(base44, apiKey, job.id).catch(async (err) => {
        console.error('[syncArticlesQueue] Background error:', err.message);
        await base44.asServiceRole.entities.SyncJob.update(job.id, {
          status: 'error',
          error_message: err.message,
          completed_at: new Date().toISOString()
        }).catch(() => {});
      });

      return Response.json({ success: true, job_id: job.id });
    }

    return Response.json({ error: `Acción desconocida: ${action}` }, { status: 400 });

  } catch (error) {
    console.error('[syncComponentsQueue] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ════════════════════════════════════════════════════════════
// PROCESAMIENTO BACKGROUND: COMPONENTES
// ════════════════════════════════════════════════════════════
async function processComponentsBackground(base44, apiKey, jobId) {
  // 1. Fetch desde CDEApp con reintentos
  console.log(`[Job ${jobId}] Descargando componentes desde CDEApp...`);
  const rawData = await cdeApiFetch('sync-component-articles', apiKey);
  const allRows = normalizeRows(rawData);

  console.log(`[Job ${jobId}] ${allRows.length} componentes recibidos`);

  await base44.asServiceRole.entities.SyncJob.update(jobId, {
    total: allRows.length,
    processed: 0,
    status: 'running'
  });

  // 2. Obtener todos los existentes para upsert
  const existing = await withRetry(
    () => base44.asServiceRole.entities.ArticleComponent.list(undefined, 100000),
    'list-existing-components'
  ) || [];

  // Mapa: key = article_cde_id + code_component
  const existingMap = new Map(existing.map(c => [`${c.article_cde_id}_${c.code_component}`, c]));

  // 3. Clasificar en creates / updates (sincronización diferencial)
  const toCreate = [];
  const toUpdate = [];
  const errors = [];

  for (const r of allRows) {
    try {
      if (!r.article_id || !r.code_component) continue; // Saltar registros inválidos

      const key = `${r.article_id}_${r.code_component}`;
      const payload = {
        cde_id: r.id ?? null,
        article_cde_id: r.article_id,
        code_component: String(r.code_component).trim(),
        name_component: String(r.name_component || '').trim(),
        reference_component: String(r.reference_component || '').trim(),
        is_active: r.is_active !== false && r.is_active !== 0,
        updated_at_cde: r.updated_at || null
      };

      const ex = existingMap.get(key);
      if (ex) {
        // Solo actualizar si hay cambios (sincronización diferencial)
        const cdeDate = r.updated_at ? new Date(r.updated_at).getTime() : 0;
        const localDate = ex.updated_at_cde ? new Date(ex.updated_at_cde).getTime() : 0;
        if (cdeDate <= localDate && ex.name_component === payload.name_component) {
          // Sin cambios, no actualizar
          continue;
        }
        toUpdate.push({ id: ex.id, payload });
      } else {
        toCreate.push(payload);
      }
    } catch (err) {
      errors.push({ item: r?.code_component, error: err.message });
    }
  }

  console.log(`[Job ${jobId}] Creates: ${toCreate.length}, Updates: ${toUpdate.length}, Skipped (sin cambios): ${allRows.length - toCreate.length - toUpdate.length - errors.length}`);

  // 4. Procesar en batches con reintentos por ítem
  const allOps = [
    ...toCreate.map(p => ({ type: 'create', data: p })),
    ...toUpdate.map(u => ({ type: 'update', id: u.id, data: u.payload }))
  ];

  let processed = 0;
  let createdCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < allOps.length; i += BATCH_SIZE) {
    const batch = allOps.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(batch.map(op => {
      if (op.type === 'create') {
        return withRetry(
          () => base44.asServiceRole.entities.ArticleComponent.create(op.data),
          `create-${op.data.code_component}`
        );
      } else {
        return withRetry(
          () => base44.asServiceRole.entities.ArticleComponent.update(op.id, op.data),
          `update-${op.id}`
        );
      }
    }));

    // Contabilizar resultados y errores
    batchResults.forEach((result, idx) => {
      const op = batch[idx];
      if (result.status === 'fulfilled') {
        if (op.type === 'create') createdCount++;
        else updatedCount++;
      } else {
        errors.push({
          item: op.data?.code_component || op.id,
          error: result.reason?.message || 'Error desconocido'
        });
      }
    });

    processed += batch.length;

    // Actualizar progreso en BD
    await base44.asServiceRole.entities.SyncJob.update(jobId, {
      processed,
      created_count: createdCount,
      updated_count: updatedCount
    }).catch(() => {}); // No bloquear si falla la actualización de progreso

    if (i + BATCH_SIZE < allOps.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  // 5. Marcar completado con resumen de errores
  const finalStatus = errors.length > 0 && createdCount + updatedCount === 0 ? 'error' : 'completed';
  await base44.asServiceRole.entities.SyncJob.update(jobId, {
    status: finalStatus,
    processed: allRows.length,
    created_count: createdCount,
    updated_count: updatedCount,
    completed_at: new Date().toISOString(),
    error_message: errors.length > 0
      ? `${errors.length} errores. Primeros: ${errors.slice(0, 3).map(e => `${e.item}: ${e.error}`).join('; ')}`
      : null
  });

  console.log(`[Job ${jobId}] Completado: +${createdCount} nuevos, ↺${updatedCount} actualizados, ✗${errors.length} errores`);
}

// ════════════════════════════════════════════════════════════
// PROCESAMIENTO BACKGROUND: ARTÍCULOS
// ════════════════════════════════════════════════════════════
async function processArticlesBackground(base44, apiKey, jobId) {
  console.log(`[Job ${jobId}] Descargando artículos desde CDEApp...`);
  const rawData = await cdeApiFetch('sync-articles', apiKey);
  const allRows = normalizeRows(rawData);

  console.log(`[Job ${jobId}] ${allRows.length} artículos recibidos`);

  await base44.asServiceRole.entities.SyncJob.update(jobId, {
    total: allRows.length,
    processed: 0,
    status: 'running'
  });

  // Obtener artículos existentes (entidad Article)
  const existing = await withRetry(
    () => base44.asServiceRole.entities.Article.list(undefined, 100000),
    'list-existing-articles'
  ) || [];

  const existingMap = new Map(existing.map(a => [String(a.cde_id || a.code || ''), a]));
  const errors = [];
  const toCreate = [];
  const toUpdate = [];

  for (const r of allRows) {
    try {
      const cdeId = String(r.id || '').trim();
      const code = String(r.CodeCentral || r.code || r.article_code || '').trim();
      const name = String(r.name || r.article_name || r.Nombre || '').trim();
      if (!code && !name) continue;

      const key = cdeId || code;
      const payload = {
        cde_id: cdeId || null,
        code: code,
        name: name,
        client: String(r.customer_name || r.client || '').trim(),
        reference: String(r.CodeClient || r.reference || '').trim(),
        active: r.status === true || r.status === 'true' || r.status === 1,
        status_article: r.statusArticle || 'PENDIENTE',
        injet: r.injet === true || r.injet === 'true' || r.injet === 1,
        laser: r.laser === true || r.laser === 'true' || r.laser === 1,
        etiquetado: r.etiquetado === true || r.etiquetado === 'true' || r.etiquetado === 1,
        celo: r.celo === true || r.celo === 'true' || r.celo === 1,
        unid_box: parseInt(r.unidBox || 0) || 0,
        unid_pallet: parseInt(r.unidPallet || 0) || 0,
        multi_unid: parseInt(r.multiUnid || 0) || 0,
        updated_at_cde: r.updated_at || null
      };

      const ex = existingMap.get(key);
      if (ex) {
        // Preservar campos locales (proceso, operarios, tiempo)
        payload.process_code = ex.process_code || payload.process_code;
        payload.operators_required = ex.operators_required || payload.operators_required;
        payload.total_time_seconds = ex.total_time_seconds || payload.total_time_seconds;
        toUpdate.push({ id: ex.id, payload });
      } else {
        toCreate.push(payload);
      }
    } catch (err) {
      errors.push({ item: r?.CodeCentral || r?.id, error: err.message });
    }
  }

  const allOps = [
    ...toCreate.map(p => ({ type: 'create', data: p })),
    ...toUpdate.map(u => ({ type: 'update', id: u.id, data: u.payload }))
  ];

  let processed = 0, createdCount = 0, updatedCount = 0;

  for (let i = 0; i < allOps.length; i += BATCH_SIZE) {
    const batch = allOps.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(batch.map(op => {
      if (op.type === 'create') {
        return withRetry(() => base44.asServiceRole.entities.Article.create(op.data), `create-${op.data.code}`);
      } else {
        return withRetry(() => base44.asServiceRole.entities.Article.update(op.id, op.data), `update-${op.id}`);
      }
    }));

    results.forEach((result, idx) => {
      const op = batch[idx];
      if (result.status === 'fulfilled') {
        if (op.type === 'create') createdCount++;
        else updatedCount++;
      } else {
        errors.push({ item: op.data?.code || op.id, error: result.reason?.message });
      }
    });

    processed += batch.length;
    await base44.asServiceRole.entities.SyncJob.update(jobId, {
      processed, created_count: createdCount, updated_count: updatedCount
    }).catch(() => {});

    if (i + BATCH_SIZE < allOps.length) await sleep(BATCH_DELAY_MS);
  }

  const finalStatus = errors.length > 0 && createdCount + updatedCount === 0 ? 'error' : 'completed';
  await base44.asServiceRole.entities.SyncJob.update(jobId, {
    status: finalStatus,
    processed: allRows.length,
    created_count: createdCount,
    updated_count: updatedCount,
    completed_at: new Date().toISOString(),
    error_message: errors.length > 0
      ? `${errors.length} errores. Primeros: ${errors.slice(0, 3).map(e => `${e.item}: ${e.error}`).join('; ')}`
      : null
  });

  console.log(`[Job ${jobId}] Artículos completado: +${createdCount} nuevos, ↺${updatedCount} actualizados, ✗${errors.length} errores`);
}