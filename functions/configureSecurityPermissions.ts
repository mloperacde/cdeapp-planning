import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = {
      phase: 'Configuración de Seguridad',
      timestamp: new Date().toISOString(),
      recommendations: []
    };

    // Configuraciones recomendadas por entidad
    const securityConfig = {
      EmployeeMasterDatabase: {
        entity: 'EmployeeMasterDatabase',
        currentStatus: 'Acceso sin restricciones',
        recommendedPermissions: {
          admin: ['create', 'read', 'update', 'delete'],
          manager: ['read', 'update'],
          user: ['read_own'],
          readonly: ['read']
        },
        priority: 'CRÍTICO',
        notes: 'Datos sensibles de empleados - requiere máxima protección'
      },
      Machine: {
        entity: 'Machine',
        currentStatus: 'Acceso público',
        recommendedPermissions: {
          admin: ['create', 'read', 'update', 'delete'],
          manager: ['read', 'update'],
          mantenimiento: ['read', 'update'],
          user: ['read'],
          readonly: ['read']
        },
        priority: 'ALTO',
        notes: 'Restringir edición a mantenimiento y administración'
      },
      Absence: {
        entity: 'Absence',
        currentStatus: 'Todos pueden ver todo',
        recommendedPermissions: {
          admin: ['create', 'read', 'update', 'delete', 'approve'],
          manager: ['read', 'approve'],
          user: ['create_own', 'read_own', 'update_own'],
          readonly: ['read']
        },
        priority: 'CRÍTICO',
        notes: 'Datos personales - usuarios solo ven/editan sus ausencias'
      },
      MaintenanceSchedule: {
        entity: 'MaintenanceSchedule',
        currentStatus: 'Sin restricciones',
        recommendedPermissions: {
          admin: ['create', 'read', 'update', 'delete'],
          manager: ['read', 'update'],
          mantenimiento: ['create', 'read', 'update'],
          user: ['read'],
          readonly: ['read']
        },
        priority: 'ALTO',
        notes: 'Solo mantenimiento debe crear/editar'
      },
      MachineAssignment: {
        entity: 'MachineAssignment',
        currentStatus: 'Público',
        recommendedPermissions: {
          admin: ['create', 'read', 'update', 'delete'],
          manager: ['create', 'read', 'update'],
          user: ['read'],
          readonly: ['read']
        },
        priority: 'ALTO',
        notes: 'Solo managers y admin asignan operadores'
      }
    };

    for (const [key, config] of Object.entries(securityConfig)) {
      results.recommendations.push({
        ...config,
        actionRequired: 'Configurar en Base44 Dashboard → Security → Permissions',
        implementation: 'Manual via dashboard',
        testingRequired: true
      });
    }

    // Análisis de usuarios y roles actuales
    try {
      const roles = await base44.asServiceRole.entities.Role.list();
      const userRoles = await base44.asServiceRole.entities.UserRole.list();
      
      results.currentRoleSystem = {
        customRoles: roles.length,
        userAssignments: userRoles.length,
        status: 'Duplicado con sistema nativo',
        action: 'Migrar a sistema nativo Base44 y deprecar entidades Role/UserRole'
      };
    } catch (error) {
      results.currentRoleSystem = {
        error: error.message,
        note: 'No se pudieron analizar roles legacy'
      };
    }

    results.implementation = {
      steps: [
        '1. Ir a Base44 Dashboard → Security → Roles',
        '2. Crear roles: Admin, Manager, Supervisor, User, ReadOnly, Mantenimiento',
        '3. Para cada entidad crítica, configurar permisos según tabla de recomendaciones',
        '4. Asignar usuarios a roles apropiados',
        '5. Probar accesos con usuarios de diferentes roles',
        '6. Documentar matriz de permisos para referencia futura'
      ],
      critical: [
        'EmployeeMasterDatabase',
        'Absence',
        'Machine',
        'MaintenanceSchedule',
        'MachineAssignment'
      ]
    };

    results.summary = {
      entitiesAnalyzed: Object.keys(securityConfig).length,
      criticalEntities: Object.values(securityConfig).filter(c => c.priority === 'CRÍTICO').length,
      highPriorityEntities: Object.values(securityConfig).filter(c => c.priority === 'ALTO').length,
      note: 'Configuración debe realizarse manualmente en Base44 Dashboard'
    };

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});