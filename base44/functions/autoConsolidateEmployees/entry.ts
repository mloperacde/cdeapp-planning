import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * CONSOLIDACIÓN AUTOMÁTICA - DESACTIVADA
 * La entidad legada 'Employee' ya no existe. La consolidación fue completada.
 * Esta función devuelve un mensaje informativo sin realizar operaciones.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  // Auth: permitir admin, scheduler (sin user) y llamadas internas de servicio (asServiceRole)
  const user = await base44.auth.me().catch(() => null);
  const userRole = (user?.role || '').trim().toLowerCase();
  const isServiceCall = !user || !user.email || user.email.includes('service+') || user.email.includes('@no-reply.base44');
  if (!isServiceCall && userRole !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }
  
  console.log(`autoConsolidateEmployees llamada por: ${user ? `${user.email}` : 'sistema/scheduled'}`);
  console.log('ℹ️  La consolidación Employee→EmployeeMasterDatabase ya fue completada. Esta función es un no-op.');

  return Response.json({
    success: true,
    message: 'Consolidación ya completada. La entidad Employee legacy no existe. Esta tarea puede desactivarse.',
    timestamp: new Date().toISOString(),
    action: 'no-op'
  });
});