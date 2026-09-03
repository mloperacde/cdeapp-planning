import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

export default async function handler(req: Request) {
  const base44 = createClientFromRequest(req);

  // Only authenticated admins can retrieve the API key
  try {
    const user = await base44.auth.me();
    if (!user || (user.role || '').toLowerCase() !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = Deno.env.get('CdeApp');
  if (!apiKey) {
    return Response.json({ error: 'CdeApp secret no configurado' }, { status: 500 });
  }

  return Response.json({ apiKey });
}