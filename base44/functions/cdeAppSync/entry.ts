import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CDE_BASE_URL = 'https://cdeapp.es';
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

/**
 * Fetch con reintentos y backoff exponencial.
 * Reintenta en errores de red y códigos 429/5xx.
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
      console.log(`[cdeAppSync] Reintento ${attempt}/${retries} para ${endpoint} en ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(30000) // 30s timeout
      });

      // Rate limiting: esperar y reintentar
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
        console.warn(`[cdeAppSync] Rate limit 429 en ${endpoint}. Esperando ${retryAfter}s`);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        lastError = new Error(`Rate limit exceeded (429)`);
        continue;
      }

      // Errores de servidor: reintentar
      if (response.status >= 500) {
        const text = await response.text().catch(() => '');
        lastError = new Error(`CDEApp Server Error ${response.status}: ${text || response.statusText}`);
        continue;
      }

      // Error de cliente: no reintentar
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`CDEApp API Error ${response.status}: ${text || response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        lastError = new Error(`Timeout al conectar con CDEApp (${endpoint})`);
        continue;
      }
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        lastError = new Error(`Error de red conectando con CDEApp: ${err.message}`);
        continue;
      }
      throw err; // Error no recuperable
    }
  }

  throw lastError || new Error(`Fallo tras ${retries} reintentos en ${endpoint}`);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get('CdeApp');
    if (!apiKey) return Response.json({ error: 'API Key de CDEApp no configurada en secrets (CdeApp)' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { action, params = {} } = body;

    console.log(`[cdeAppSync] Acción: ${action} | Usuario: ${user.email}`);

    let data;
    switch (action) {
      case 'sync-machines':
        data = await cdeApiFetch('sync-machines', apiKey, params);
        break;
      case 'sync-productions':
        data = await cdeApiFetch('sync-productions', apiKey, params);
        break;
      case 'sync-rooms':
        data = await cdeApiFetch('sync-rooms', apiKey, params);
        break;
      case 'sync-articles':
        data = await cdeApiFetch('sync-articles', apiKey, params);
        break;
      case 'sync-component-articles':
        data = await cdeApiFetch('sync-component-articles', apiKey, params);
        break;
      default:
        return Response.json({ error: `Acción desconocida: ${action}` }, { status: 400 });
    }

    // Normalizar respuesta
    const rows = normalizeRows(data);
    console.log(`[cdeAppSync] ${action}: ${rows.length} registros recibidos`);

    return Response.json({ success: true, data, count: rows.length });

  } catch (error) {
    console.error('[cdeAppSync] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

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