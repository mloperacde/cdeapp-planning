import { useMemo } from "react";
import { useAppData } from "../data/DataProvider";

// Módulos disponibles por página
export const MODULE_DEFINITIONS = {
  Dashboard: {
    viewMetrics: "Ver métricas y KPIs",
    viewTrends: "Ver tendencias y gráficos",
    viewAlerts: "Ver alertas y notificaciones",
    exportData: "Exportar datos del dashboard"
  },
  MachineDailyPlanning: {
    viewPlanning: "Ver planificación",
    editPlanning: "Editar planificación",
    viewMachineStatus: "Ver estado de máquinas",
    editMachineStatus: "Editar estado de máquinas",
    assignOperators: "Asignar operadores a máquinas"
  },
  AbsenceManagement: {
    viewOwnAbsences: "Ver ausencias propias",
    createAbsences: "Crear ausencias",
    viewAllAbsences: "Ver todas las ausencias",
    approveAbsences: "Aprobar/Rechazar ausencias",
    deleteAbsences: "Eliminar ausencias"
  },
  MachineManagement: {
    viewMachines: "Ver información de máquinas",
    editMachines: "Editar configuración de máquinas",
    viewMaintenance: "Ver mantenimiento",
    scheduleMaintenance: "Programar mantenimiento"
  },
  Reports: {
    viewBasicReports: "Ver informes básicos",
    viewAdvancedReports: "Ver informes avanzados",
    exportReports: "Exportar informes",
    viewFinancialData: "Ver datos financieros"
  },
  ShiftManagers: {
    viewDashboard: "Ver dashboard principal",
    viewKPIs: "Ver KPIs y métricas",
    viewTeamStatus: "Ver estado de equipos",
    viewAlerts: "Ver alertas",
    employeesManagement: "Gestión de Empleados",
    machineAssignments: "Asignaciones de Máquinas",
    lockerManagement: "Gestión de Vestuarios/Taquillas",
    performance: "Rendimiento",
    absencesManagement: "Gestión de Ausencias",
    viewRequests: "Ver solicitudes y cumpleaños",
    shiftHandover: "Traspaso de Turnos",
    breaksManagement: "Gestión de Descansos",
    support: "Apoyos",
    manageAbsences: "Gestión avanzada de ausencias"
  },
  Breaks: {
    viewBreaks: "Ver descansos",
    editBreaks: "Editar descansos",
    generateBreaks: "Generar descansos"
  },
  BreaksDebug: {
    viewDebug: "Ver debug de descansos"
  },
  MachineAssignments: {
    viewAssignments: "Ver asignaciones de máquinas",
    editAssignments: "Editar asignaciones",
    viewMachineStatus: "Ver estado de máquinas",
    assignOperators: "Asignar operadores"
  },
  MaintenanceInterventions: {
    viewInterventions: "Ver intervenciones",
    createInterventions: "Crear intervenciones",
    editInterventions: "Editar intervenciones",
    deleteInterventions: "Eliminar intervenciones",
    generatePDF: "Generar PDF de orden de trabajo"
  },
  DocumentManagement: {
    viewDocuments: "Ver documentos",
    createDocuments: "Subir documentos",
    editDocuments: "Editar documentos",
    deleteDocuments: "Eliminar documentos",
    viewHistory: "Ver historial de versiones"
  }
};

export const ROLE_PERMISSIONS = {
  admin: {
    isAdmin: true,
    canViewSalary: true,
    canViewPersonalData: true,
    canViewBankingData: true,
    canEditEmployees: true,
    canApproveAbsences: true,
    canManageMachines: true,
    canViewReports: true,
    canConfigureSystem: true,
    DocumentManagement: {
      viewDocuments: true,
      createDocuments: true,
      editDocuments: true,
      deleteDocuments: true,
      viewHistory: true
    }
  },
  hr_manager: {
    isAdmin: false,
    canViewSalary: true,
    canViewPersonalData: true,
    canViewBankingData: true,
    canEditEmployees: true,
    canApproveAbsences: true,
    canManageMachines: false,
    canViewReports: true,
    canConfigureSystem: false,
  },
  shift_manager_production: {
    isAdmin: false,
    canViewSalary: false,
    canViewPersonalData: true,
    canViewBankingData: false,
    canEditEmployees: false,
    canApproveAbsences: true,
    canManageMachines: true,
    canViewReports: true,
    canConfigureSystem: false,
  },
  shift_manager_quality: {
    isAdmin: false,
    canViewSalary: false,
    canViewPersonalData: true,
    canViewBankingData: false,
    canEditEmployees: false,
    canApproveAbsences: true,
    canManageMachines: false,
    canViewReports: true,
    canConfigureSystem: false,
  },
  shift_manager_maintenance: {
    isAdmin: false,
    canViewSalary: false,
    canViewPersonalData: true,
    canViewBankingData: false,
    canEditEmployees: false,
    canApproveAbsences: true,
    canManageMachines: true,
    canViewReports: true,
    canConfigureSystem: false,
  },
  prod_supervisor: {
    isAdmin: false,
    canViewSalary: false,
    canViewPersonalData: true,
    canViewBankingData: false,
    canEditEmployees: false,
    canApproveAbsences: true,
    canManageMachines: true,
    canViewReports: true,
    canConfigureSystem: false,
  },
  maintenance_tech: {
    isAdmin: false,
    canViewSalary: false,
    canViewPersonalData: false,
    canViewBankingData: false,
    canEditEmployees: false,
    canApproveAbsences: false,
    canManageMachines: true,
    canViewReports: true,
    canConfigureSystem: false,
  },
  operator: {
    isAdmin: false,
    canViewSalary: false,
    canViewPersonalData: false,
    canViewBankingData: false,
    canEditEmployees: false,
    canApproveAbsences: false,
    canManageMachines: false,
    canViewReports: true,
    canConfigureSystem: false,
  },
  user: {
    isAdmin: false,
    canViewSalary: false,
    canViewPersonalData: false,
    canViewBankingData: false,
    canEditEmployees: false,
    canApproveAbsences: false,
    canManageMachines: false,
    canViewReports: true,
    canConfigureSystem: false,
    DocumentManagement: {
      viewDocuments: true,
      createDocuments: false,
      editDocuments: false,
      deleteDocuments: false,
      viewHistory: false
    }
  },
};

export function usePermissions() {
  const { user, rolesConfig } = useAppData();

  return useMemo(() => {
    if (!user) {
      return {
        isAuthenticated: false,
        isAdmin: false,
        canAccessPage: () => false,
        canAccessModule: () => false,
        getModulePermissions: () => ({}),
      };
    }

    // 1. Determinar rol efectivo
    // IMPORTANTE: Base44 puede devolver el rol nativo como "Admin" (capital A).
    // Siempre normalizamos a minúsculas para comparaciones consistentes.
    let rawRole = "user";
    const userEmail = user.email?.toLowerCase();

    if (rolesConfig?.user_assignments?.[userEmail]) {
      rawRole = rolesConfig.user_assignments[userEmail];
    } else if (user.role) {
      // Normalizar el rol nativo de Base44 a minúsculas
      rawRole = user.role.trim().toLowerCase();
    }

    // 2. Resolver a configuración de rol
    let effectiveRoleKey = rawRole;
    let roleConfig = null;

    if (rolesConfig?.roles) {
      if (rolesConfig.roles[rawRole]) {
        effectiveRoleKey = rawRole;
        roleConfig = rolesConfig.roles[rawRole];
      } else if (typeof rawRole === 'string') {
        const roleLower = rawRole.replace(/\s+/g, ' ').trim().toLowerCase();
        let foundKey = Object.keys(rolesConfig.roles).find(k => k.toLowerCase() === roleLower);
        if (!foundKey) {
          foundKey = Object.keys(rolesConfig.roles).find(k =>
            rolesConfig.roles[k].name?.replace(/\s+/g, ' ').trim().toLowerCase() === roleLower
          );
        }
        if (foundKey) {
          effectiveRoleKey = foundKey;
          roleConfig = rolesConfig.roles[foundKey];
        }
      }
    }

    // 3. Obtener permisos
    let permissions = { ...ROLE_PERMISSIONS.user };

    if (roleConfig?.permissions) {
      permissions = { ...roleConfig.permissions };
    } else if (ROLE_PERMISSIONS[effectiveRoleKey]) {
      permissions = { ...ROLE_PERMISSIONS[effectiveRoleKey] };
    }

    // Override con permisos explícitos del usuario en Base44
    if (user.permisos && typeof user.permisos === 'object') {
      permissions = { ...permissions, ...user.permisos };
    }

    // CRÍTICO: El admin (isAdmin===true) SIEMPRE tiene acceso a todo
    const isAdminUser = permissions.isAdmin === true;

    const canAccessPage = (path) => {
      // ADMIN: acceso total sin restricciones
      if (isAdminUser) return true;

      // Bloqueo hard: RolesConfig solo admin
      if (path.includes('RolesConfig')) return false;

      if (roleConfig) {
        const pagePerms = roleConfig.page_permissions || {};
        const keys = Object.keys(pagePerms);
        const hasConfiguredPages = keys.length > 0;
        const isStrict = roleConfig.is_strict === true;

        if (!hasConfiguredPages && !isStrict) {
          return path === '/Dashboard' || path === '/';
        }

        const cleanPath = path.split('?')[0].replace(/\/$/, '');
        const pathNoSlash = cleanPath.replace(/^\//, '');
        const pathWithSlash = '/' + pathNoSlash;

        if (pagePerms[path] === true) return true;
        if (pagePerms[cleanPath] === true) return true;
        if (pagePerms[pathNoSlash] === true) return true;
        if (pagePerms[pathWithSlash] === true) return true;

        const matchedKey = keys.find(key => {
          const cleanKey = key.split('?')[0].replace(/\/$/, '');
          const keyNoSlash = cleanKey.replace(/^\//, '');
          if (keyNoSlash === pathNoSlash) return true;
          if (pathWithSlash.startsWith('/' + keyNoSlash + '/')) return true;
          return false;
        });

        if (matchedKey && pagePerms[matchedKey] === true) return true;
        return false;
      }

      // Fallback: solo Dashboard si no hay config de rol
      return path === '/Dashboard' || path === '/';
    };

    const base = {
      isAuthenticated: true,
      role: effectiveRoleKey,
      originalRole: rawRole,
      userEmail: user.email,
      userName: user.full_name,
      ...permissions,
      canAccessPage,
    };

    base.canAccessModule = (pageName, moduleName) => {
      if (isAdminUser) return true;
      if (!canAccessPage(`/${pageName}`)) return false;

      const userModulePerms = user.module_permissions?.[pageName]?.[moduleName];
      if (userModulePerms !== undefined) return userModulePerms;

      const roleModulePerms = roleConfig?.module_permissions?.[pageName];
      if (roleModulePerms && Object.keys(roleModulePerms).length > 0) {
        if (roleModulePerms[moduleName] !== undefined) return roleModulePerms[moduleName];
        return false;
      }
      // Fallback a permisos estáticos (ROLE_PERMISSIONS) si no hay configuración dinámica
      if (ROLE_PERMISSIONS[effectiveRoleKey]?.[pageName]?.[moduleName] !== undefined) {
        return ROLE_PERMISSIONS[effectiveRoleKey][pageName][moduleName];
      }
      return true;
    };

    base.getModulePermissions = (pageName) => {
      // Si es admin, dar todo
      if (isAdminUser) {
        const allPerms = {};
        if (MODULE_DEFINITIONS[pageName]) {
          Object.keys(MODULE_DEFINITIONS[pageName]).forEach(key => { allPerms[key] = true; });
        }
        return allPerms;
      }

      // Mezclar permisos dinámicos con estáticos
      const staticPerms = ROLE_PERMISSIONS[effectiveRoleKey]?.[pageName] || {};
      const userModulePerms = user.module_permissions?.[pageName] || {};
      const roleModulePerms = roleConfig?.module_permissions?.[pageName] || {};
      
      return { ...staticPerms, ...roleModulePerms, ...userModulePerms };
    };

    return base;
  }, [user, rolesConfig]);
}

export function useIsAdmin() {
  const { isAdmin } = useAppData();
  return isAdmin;
}

export function useHasPermission(permission) {
  const permissions = usePermissions();
  return permissions[permission] || false;
}

export function useModulePermissions(pageName) {
  const permissions = usePermissions();
  return useMemo(() => {
    return {
      canAccessModule: (moduleName) => permissions.canAccessModule?.(pageName, moduleName) || false,
      getModulePermissions: () => permissions.getModulePermissions?.(pageName) || {},
      hasAnyModuleAccess: () => {
        const modulePerms = permissions.getModulePermissions?.(pageName) || {};
        return Object.values(modulePerms).some(perm => perm === true);
      }
    };
  }, [permissions, pageName]);
}