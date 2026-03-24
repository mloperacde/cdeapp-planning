import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = {
      phase: 'Security Consolidation',
      timestamp: new Date().toISOString(),
      actions: []
    };

    // 1. Verificar y documentar entidades Role y UserRole
    try {
      const roles = await base44.asServiceRole.entities.Role.list();
      const userRoles = await base44.asServiceRole.entities.UserRole.list();
      
      results.actions.push({
        action: 'Audit legacy roles',
        status: 'completed',
        details: {
          rolesFound: roles.length,
          userRolesFound: userRoles.length,
          roles: roles,
          userRoles: userRoles
        }
      });
    } catch (error) {
      results.actions.push({
        action: 'Audit legacy roles',
        status: 'error',
        error: error.message
      });
    }

    // 2. Documentar configuración recomendada
    results.actions.push({
      action: 'Security recommendations',
      status: 'completed',
      recommendations: [
        'Configurar permisos nativos en Base44 Dashboard',
        'Roles sugeridos: Admin, Manager, Supervisor, User, ReadOnly',
        'Restringir Employee: solo lectura para users, edición para admin/manager',
        'Restringir Machine: edición solo mantenimiento y admin',
        'Restringir Absence: crear propio, aprobar solo manager/admin',
        'Migrar roles personalizados al sistema nativo manualmente'
      ]
    });

    results.summary = {
      completed: results.actions.filter(a => a.status === 'completed').length,
      total: results.actions.length,
      nextSteps: [
        'Revisar roles y usuarios en el backup generado',
        'Configurar permisos en Base44 Dashboard manualmente',
        'Validar accesos por rol antes de eliminar entidades legacy',
        'Mantener Role y UserRole durante periodo de prueba (2 semanas)'
      ]
    };

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});