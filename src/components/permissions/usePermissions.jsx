import { useMemo } from "react";
import { useAppData } from "@/components/data/DataProvider";

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
        canAccessPage: () => false,
      };
    }

    // 1. Determinar el rol efectivo
    let role = "user"; // Default

    // Prioridad A: Asignación explícita en roles_config (si existe)
    // Normalizar email para evitar problemas de casing
    const userEmail = user.email?.toLowerCase();
    if (rolesConfig?.user_assignments?.[userEmail]) {
      role = rolesConfig.user_assignments[userEmail];
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

    // 1. Intentar obtener configuración del rol
    // Normalización robusta para evitar errores de case/tipo
    let roleConfig = rolesConfig?.roles?.[role];
    if (!roleConfig && typeof role === 'string') {
        // Intentar buscar case-insensitive si no se encuentra exacto
        const roleLower = role.toLowerCase();
        const foundKey = Object.keys(rolesConfig?.roles || {}).find(k => k.toLowerCase() === roleLower);
        if (foundKey) {
            roleConfig = rolesConfig.roles[foundKey];
        }
    }

    // DIAGNOSTIC LOG (Solo en desarrollo o si hay problemas)
    // console.log(`usePermissions Check: Role=${role}, Path=${path}, FoundConfig=${!!roleConfig}, IsAdmin=${permissions.isAdmin}`);
    
    // Si el rol existe en la configuración dinámica (es un rol gestionado), 
    // aplicamos política de "Deny by Default" (Lista blanca) SOLO si hay permisos de página configurados
    // O si está explícitamente marcado como estricto (is_strict).
    if (roleConfig) {
       const pagePerms = roleConfig.page_permissions || {};
       const keys = Object.keys(pagePerms);
       const hasConfiguredPages = keys.length > 0;
       const isStrict = roleConfig.is_strict === true;

       // Si NO hay ninguna página configurada (ni true ni false) Y NO es estricto, 
       // asumimos que es un rol nuevo/legacy y aplicamos modo PERMISIVO.
       if (!hasConfiguredPages && !isStrict) {
           // Bloquear configuración para no admins por seguridad básica
           if (path.startsWith('/Configuration') || path.includes('Config')) return false;
           return true;
       }

       // Si HAY configuración o es ESTRICTO:
       // Normalizar path de entrada (quitar query params y trailing slash)
       const cleanPath = path.split('?')[0].replace(/\/$/, '');
       
       // 1. Coincidencia exacta (Key lookup rápido)
       if (pagePerms[path] === true) return true;
       if (pagePerms[cleanPath] === true) return true;
       
       // 2. Búsqueda por coincidencia normalizada (robustez)
       // Busca si alguna key configurada coincide con el path solicitado
       const matchedKey = keys.find(key => {
          // Normalizar la key de configuración
          const cleanKey = key.split('?')[0].replace(/\/$/, '');
          
          // Coincidencia exacta de path
          if (cleanKey === cleanPath) return true;
          
          // Coincidencia de sub-ruta (ej. /NewProcessConfigurator/*)
          if (cleanPath.startsWith(cleanKey + '/')) return true;
          
          return false;
       });

       if (matchedKey && pagePerms[matchedKey] === true) return true;

       // Si no está definido explícitamente en un rol gestionado -> DENEGAR
       return false;
    }
    
    // FALLBACK (Roles NO gestionados o Configuración no cargada)
    // CAMBIO DE SEGURIDAD: Deny by Default (Modo Estricto)
    // Antes era permisivo (return true), ahora cerramos el acceso si no hay config explícita.
    
    // 1. Siempre permitir Dashboard
    if (path === '/Dashboard' || path === '/') return true;

    // 2. Bloquear todo lo demás si no se encontró configuración del rol
    // Esto evita que roles mal configurados o huérfanos vean toda la app.
    // console.warn(`Access Denied (Fallback): Role=${role} Path=${path} - No configuration found for role.`);
    return false;
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
