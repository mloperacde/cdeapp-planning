import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CDE_BASE_URL = 'https://cdeapp.es';

async function cdeApiFetch(endpoint, apiKey, params = {}) {
  const url = new URL(`${CDE_BASE_URL}/api/v1/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.append(k, v);
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    }
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
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get('CdeApp');
    if (!apiKey) return Response.json({ error: 'API Key de CDEApp no configurada en secrets (CdeApp)' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { action, params = {} } = body;

    let data;
    switch (action) {
      case 'sync-machines':
        data = await cdeApiFetch('sync-machines', apiKey);
        break;
      case 'sync-productions':
        data = await cdeApiFetch('sync-productions', apiKey, params);
        break;
      case 'sync-rooms':
        data = await cdeApiFetch('sync-rooms', apiKey);
        break;
      case 'sync-articles':
        data = await cdeApiFetch('sync-articles', apiKey);
        break;
      default:
        return Response.json({ error: `Acción desconocida: ${action}` }, { status: 400 });
    }

    return Response.json({ success: true, data });
  } catch (error) {
    console.error('cdeAppSync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});