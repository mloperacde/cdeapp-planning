import { useMemo } from "react";
import { useAppData } from "../data/DataProvider";

const ROLE_PERMISSIONS = {
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
  },
};

export function usePermissions() {
  const { user, rolesConfig } = useAppData();

  return useMemo(() => {
    if (!user) {
      return {
        isAuthenticated: false,
        isAdmin: false,
        canViewSalary: false,
        canViewPersonalData: false,
        canViewBankingData: false,
        canEditEmployees: false,
        canApproveAbsences: false,
        canManageMachines: false,
        canViewReports: false,
        canConfigureSystem: false,
      };
    }

    // 1. Determinar el rol efectivo
    let role = "user"; // Default

    // Prioridad A: Asignación explícita en roles_config (si existe)
    if (rolesConfig?.user_assignments?.[user.email]) {
      role = rolesConfig.user_assignments[user.email];
    }
    // Prioridad B: Rol nativo de Base44
    else if (user.role) {
      role = user.role;
    }

    // 2. Obtener permisos para ese rol
    let permissions = ROLE_PERMISSIONS.user; // Default permissions

    // Intento A: Configuración dinámica (si existe el rol)
    if (rolesConfig?.roles?.[role]) {
      permissions = rolesConfig.roles[role].permissions;
    }
    // Intento B: Configuración estática (fallback)
    else if (ROLE_PERMISSIONS[role]) {
      permissions = ROLE_PERMISSIONS[role];
    }

    const base = {
      isAuthenticated: true,
      role, // El ID del rol efectivo
      userEmail: user.email,
      userName: user.full_name,
      ...permissions,
      canAccessPage: (path) => {
        if (permissions.isAdmin) return true;
         
         // Hard security check: Solo admin puede ver RolesConfig
         if (path.includes('RolesConfig')) return false;

         // Configuración dinámica de páginas
         const roleConfig = rolesConfig?.roles?.[role];
         if (roleConfig?.page_permissions) {
            const perm = roleConfig.page_permissions[path];
            if (perm !== undefined) return perm;
            
            // Si no está definido en la configuración dinámica (ruta no listada en menú):
            // Aplicar reglas de seguridad mínimas para rutas críticas no listadas
            if (path.startsWith('/Configuration') || path.includes('Config')) return false;
            
            return true;
         }
         
         // Fallback estático (Legacy)
        // Bloquear configuración para no admins
        if (path.startsWith('/Configuration') || path.includes('Config')) return false;
        
        return true;
      }
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
