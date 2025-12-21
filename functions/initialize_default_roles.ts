import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const DEFAULT_ROLES = [
  {
    name: "Administrador",
    code: "ADMIN",
    description: "Acceso completo al sistema",
    level: 100,
    is_system_role: true,
    active: true,
    permissions: {
      dashboard: { view: true, view_all_teams: true },
      employees: { view: true, create: true, edit: true, delete: true, view_sensitive: true, export: true },
      absences: { view: true, create: true, edit: true, delete: true, approve: true, view_all: true },
      planning: { view: true, edit: true, create: true, confirm: true },
      machines: { view: true, create: true, edit: true, delete: true, configure_processes: true },
      maintenance: { view: true, create: true, edit: true, complete: true },
      reports: { view: true, export: true, advanced: true },
      configuration: { view: true, edit_general: true, manage_roles: true, manage_users: true, manage_teams: true },
      hrm: { view: true, manage_contracts: true, manage_onboarding: true, manage_performance: true },
      incentives: { view: true, configure: true, evaluate: true },
      documents: { view: true, upload: true, manage: true }
    }
  },
  {
    name: "Jefe de Turno",
    code: "SHIFT_MANAGER",
    description: "Gestión de equipo y planificación de turno",
    level: 50,
    is_system_role: true,
    active: true,
    permissions: {
      dashboard: { view: true, view_all_teams: false },
      employees: { view: true, create: false, edit: false, delete: false, view_sensitive: false, export: false },
      absences: { view: true, create: true, edit: false, delete: false, approve: true, view_all: false },
      planning: { view: true, edit: true, create: true, confirm: false },
      machines: { view: true, create: false, edit: false, delete: false, configure_processes: false },
      maintenance: { view: true, create: true, edit: false, complete: false },
      reports: { view: true, export: false, advanced: false },
      configuration: { view: false, edit_general: false, manage_roles: false, manage_users: false, manage_teams: false },
      hrm: { view: false, manage_contracts: false, manage_onboarding: false, manage_performance: false },
      incentives: { view: true, configure: false, evaluate: false },
      documents: { view: true, upload: false, manage: false }
    }
  },
  {
    name: "Supervisor de Producción",
    code: "PROD_SUPERVISOR",
    description: "Supervisión de producción y máquinas",
    level: 40,
    is_system_role: true,
    active: true,
    permissions: {
      dashboard: { view: true, view_all_teams: false },
      employees: { view: true, create: false, edit: false, delete: false, view_sensitive: false, export: false },
      absences: { view: true, create: true, edit: false, delete: false, approve: false, view_all: false },
      planning: { view: true, edit: true, create: false, confirm: false },
      machines: { view: true, create: false, edit: true, delete: false, configure_processes: true },
      maintenance: { view: true, create: true, edit: true, complete: false },
      reports: { view: true, export: true, advanced: false },
      configuration: { view: false, edit_general: false, manage_roles: false, manage_users: false, manage_teams: false },
      hrm: { view: false, manage_contracts: false, manage_onboarding: false, manage_performance: false },
      incentives: { view: true, configure: false, evaluate: false },
      documents: { view: true, upload: true, manage: false }
    }
  },
  {
    name: "Responsable RRHH",
    code: "HR_MANAGER",
    description: "Gestión completa de recursos humanos",
    level: 60,
    is_system_role: true,
    active: true,
    permissions: {
      dashboard: { view: true, view_all_teams: true },
      employees: { view: true, create: true, edit: true, delete: false, view_sensitive: true, export: true },
      absences: { view: true, create: true, edit: true, delete: true, approve: true, view_all: true },
      planning: { view: true, edit: false, create: false, confirm: false },
      machines: { view: true, create: false, edit: false, delete: false, configure_processes: false },
      maintenance: { view: false, create: false, edit: false, complete: false },
      reports: { view: true, export: true, advanced: true },
      configuration: { view: true, edit_general: true, manage_roles: false, manage_users: true, manage_teams: true },
      hrm: { view: true, manage_contracts: true, manage_onboarding: true, manage_performance: true },
      incentives: { view: true, configure: true, evaluate: true },
      documents: { view: true, upload: true, manage: true }
    }
  },
  {
    name: "Técnico de Mantenimiento",
    code: "MAINTENANCE_TECH",
    description: "Gestión de mantenimiento de máquinas",
    level: 30,
    is_system_role: true,
    active: true,
    permissions: {
      dashboard: { view: true, view_all_teams: false },
      employees: { view: false, create: false, edit: false, delete: false, view_sensitive: false, export: false },
      absences: { view: false, create: true, edit: false, delete: false, approve: false, view_all: false },
      planning: { view: true, edit: false, create: false, confirm: false },
      machines: { view: true, create: false, edit: true, delete: false, configure_processes: false },
      maintenance: { view: true, create: true, edit: true, complete: true },
      reports: { view: true, export: false, advanced: false },
      configuration: { view: false, edit_general: false, manage_roles: false, manage_users: false, manage_teams: false },
      hrm: { view: false, manage_contracts: false, manage_onboarding: false, manage_performance: false },
      incentives: { view: false, configure: false, evaluate: false },
      documents: { view: true, upload: true, manage: false }
    }
  },
  {
    name: "Operario",
    code: "OPERATOR",
    description: "Acceso básico de consulta",
    level: 10,
    is_system_role: true,
    active: true,
    permissions: {
      dashboard: { view: true, view_all_teams: false },
      employees: { view: false, create: false, edit: false, delete: false, view_sensitive: false, export: false },
      absences: { view: true, create: true, edit: false, delete: false, approve: false, view_all: false },
      planning: { view: true, edit: false, create: false, confirm: false },
      machines: { view: true, create: false, edit: false, delete: false, configure_processes: false },
      maintenance: { view: false, create: false, edit: false, complete: false },
      reports: { view: false, export: false, advanced: false },
      configuration: { view: false, edit_general: false, manage_roles: false, manage_users: false, manage_teams: false },
      hrm: { view: false, manage_contracts: false, manage_onboarding: false, manage_performance: false },
      incentives: { view: true, configure: false, evaluate: false },
      documents: { view: true, upload: false, manage: false }
    }
  }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticación
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ 
        error: 'No autorizado. Solo administradores pueden ejecutar esta función.' 
      }, { status: 403 });
    }

    // Verificar si ya existen roles
    const existingRoles = await base44.asServiceRole.entities.Role.list();
    if (existingRoles.length > 0) {
      return Response.json({ 
        message: 'Ya existen roles en el sistema',
        existing_count: existingRoles.length
      });
    }

    // Crear roles predeterminados
    const createdRoles = [];
    for (const roleData of DEFAULT_ROLES) {
      const role = await base44.asServiceRole.entities.Role.create(roleData);
      createdRoles.push(role);
    }

    return Response.json({
      success: true,
      message: `Se crearon ${createdRoles.length} roles predeterminados`,
      roles: createdRoles.map(r => ({ name: r.name, code: r.code }))
    });

  } catch (error) {
    console.error('Error initializing roles:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});