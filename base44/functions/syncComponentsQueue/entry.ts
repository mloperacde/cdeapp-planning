import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CDE_BASE_URL = 'https://cdeapp.es';
const BATCH_SIZE = 15;
const BATCH_DELAY_MS = 400;

async function cdeApiFetch(endpoint, apiKey) {
  const url = `${CDE_BASE_URL}/api/v1/${endpoint}`;
  const response = await fetch(url, {
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`CDEApp API Error ${response.status}: ${text || response.statusText}`);
  }
  return response.json();
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { action, job_id } = body;

    // ── GET STATUS ──────────────────────────────────────────────
    if (action === 'get-status') {
      if (!job_id) return Response.json({ error: 'job_id required' }, { status: 400 });
      const jobs = await base44.asServiceRole.entities.SyncJob.filter({ id: job_id });
      const job = jobs?.[0] || null;
      return Response.json({ success: true, job });
    }

    // ── START SYNC ───────────────────────────────────────────────
    if (action === 'start-sync-components') {
      const apiKey = Deno.env.get('CdeApp');
      if (!apiKey) return Response.json({ error: 'API Key de CDEApp no configurada' }, { status: 500 });

      // Crear el job
      const job = await base44.asServiceRole.entities.SyncJob.create({
        job_type: 'sync-components',
        status: 'running',
        total: 0,
        processed: 0,
        created_count: 0,
        updated_count: 0,
        started_at: new Date().toISOString(),
        triggered_by: user.email || user.full_name
      });

      const jobId = job.id;

      // Procesar en background (sin await - fire & forget)
      processComponentsInBackground(base44, apiKey, jobId).catch(async (err) => {
        await base44.asServiceRole.entities.SyncJob.update(jobId, {
          status: 'error',
          error_message: err.message,
          completed_at: new Date().toISOString()
        });
      });

      return Response.json({ success: true, job_id: jobId });
    }

    return Response.json({ error: `Acción desconocida: ${action}` }, { status: 400 });

  } catch (error) {
    console.error('syncComponentsQueue error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function processComponentsInBackground(base44, apiKey, jobId) {
  // 1. Fetch desde CDEApp
  const rows = await cdeApiFetch('sync-component-articles', apiKey);
  const allRows = Array.isArray(rows) ? rows : (rows?.data || []);

  await base44.asServiceRole.entities.SyncJob.update(jobId, {
    total: allRows.length,
    processed: 0,
    status: 'running'
  });

  // 2. Fetch existentes para upsert
  const existing = await base44.asServiceRole.entities.ArticleComponent.list(undefined, 50000) || [];
  const existingMap = new Map(existing.map(c => [`${c.article_cde_id}_${c.code_component}`, c]));

  const toCreate = [];
  const toUpdate = [];

  allRows.forEach(r => {
    const key = `${r.article_id}_${r.code_component}`;
    const payload = {
      cde_id: r.id,
      article_cde_id: r.article_id,
      code_component: r.code_component,
      name_component: r.name_component,
      reference_component: r.reference_component || '',
      is_active: r.is_active !== false,
      updated_at_cde: r.updated_at || null
    };
    const ex = existingMap.get(key);
    if (ex) toUpdate.push({ id: ex.id, payload });
    else toCreate.push(payload);
  });

  const allOps = [
    ...toCreate.map(p => ({ type: 'create', data: p })),
    ...toUpdate.map(u => ({ type: 'update', id: u.id, data: u.payload }))
  ];

  let processed = 0;
  let createdCount = 0;
  let updatedCount = 0;

  // 3. Procesar en batches actualizando progreso
  for (let i = 0; i < allOps.length; i += BATCH_SIZE) {
    const batch = allOps.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(op => {
      if (op.type === 'create') {
        createdCount++;
        return base44.asServiceRole.entities.ArticleComponent.create(op.data);
      } else {
        updatedCount++;
        return base44.asServiceRole.entities.ArticleComponent.update(op.id, op.data);
      }
    }));

    processed += batch.length;

    // Actualizar progreso en BD cada batch
    await base44.asServiceRole.entities.SyncJob.update(jobId, {
      processed,
      created_count: createdCount,
      updated_count: updatedCount
    });

    if (i + BATCH_SIZE < allOps.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  // 4. Marcar como completado
  await base44.asServiceRole.entities.SyncJob.update(jobId, {
    status: 'completed',
    processed: allRows.length,
    created_count: createdCount,
    updated_count: updatedCount,
    completed_at: new Date().toISOString()
  });
}