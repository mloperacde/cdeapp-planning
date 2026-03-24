import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }

    // Ejecutar auditoría llamando a la otra función
    const auditResult = await base44.functions.invoke('auditEntities');
    
    return Response.json({
      status: 'success',
      audit: auditResult.data
    });
  } catch (error) {
    return Response.json({ 
      status: 'error', 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});