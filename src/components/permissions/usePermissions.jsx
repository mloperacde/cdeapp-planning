import { useMemo } from "react";
import { useAppData } from "../data/DataProvider";

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

    // 1. Determinar el rol efectivo (Raw)
    let rawRole = "user"; // Default

    // Prioridad A: Asignación explícita en roles_config (si existe)
    // Normalizar email para evitar problemas de casing
    const userEmail = user.email?.toLowerCase();
    if (rolesConfig?.user_assignments?.[userEmail]) {
      rawRole = rolesConfig.user_assignments[userEmail];
    }
    // Prioridad B: Rol nativo de Base44
    else if (user.role) {
      rawRole = user.role;
    }

    // 2. Resolver a Key de Configuración (Normalization Strategy)
    // Esto conecta el nombre "humano" de Base44 (ej. "Gerente RRHH") con la key interna (ej. "hr_manager")
    let effectiveRoleKey = rawRole;
    let roleConfig = null;

    // Intentar resolver usando rolesConfig si está disponible
    if (rolesConfig?.roles) {
        // A. Match directo (Key exacta)
        if (rolesConfig.roles[rawRole]) {
             effectiveRoleKey = rawRole;
             roleConfig = rolesConfig.roles[rawRole];
        } 
        // B. Match normalizado (Key o Name)
        else if (typeof rawRole === 'string') {
             const roleLower = rawRole.replace(/\s+/g, ' ').trim().toLowerCase();
             
             // 1. Buscar case-insensitive por Key (ID del rol)
             let foundKey = Object.keys(rolesConfig.roles).find(k => k.toLowerCase() === roleLower);
             
             // 2. Si no, buscar por Name (propiedad 'name' del rol - ej. "Gerente RRHH")
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

    // 3. Obtener permisos para ese rol
    let permissions = { ...ROLE_PERMISSIONS.user }; // Start with default safe permissions

    // Intento A: Configuración dinámica (si existe el rol resuelto)
    if (roleConfig) {
      permissions = { ...roleConfig.permissions };
    }
    // Intento B: Configuración estática (fallback usando key resuelta)
    else if (ROLE_PERMISSIONS[effectiveRoleKey]) {
      permissions = { ...ROLE_PERMISSIONS[effectiveRoleKey] };
    }

    // 4. Mergear permisos explícitos de Base44 (si existen)
    // Esto permite usar el campo 'permisos' del usuario en Base44 como override
    if (user.permisos && typeof user.permisos === 'object') {
        permissions = { ...permissions, ...user.permisos };
    }

    const base = {
      isAuthenticated: true,
      role: effectiveRoleKey, // Usamos la key resuelta internamente
      originalRole: rawRole,  // Mantenemos el original por si acaso
      userEmail: user.email,
      userName: user.full_name,
      ...permissions,
      canAccessPage: (path) => {
        if (permissions.isAdmin) return true;
        
        // Hard security check: Solo admin puede ver RolesConfig
        if (path.includes('RolesConfig')) return false;

        // DIAGNOSTIC LOG (Solo en desarrollo o si hay problemas)
        // console.log(`usePermissions Check: Role=${effectiveRoleKey}, Path=${path}, FoundConfig=${!!roleConfig}, IsAdmin=${permissions.isAdmin}`);
        
        // Si el rol existe en la configuración dinámica (es un rol gestionado), 
        // aplicamos política de "Deny by Default" (Lista blanca) SOLO si hay permisos de página configurados
        // O si está explícitamente marcado como estricto (is_strict).
        if (roleConfig) {
           const pagePerms = roleConfig.page_permissions || {};
           const keys = Object.keys(pagePerms);
           const hasConfiguredPages = keys.length > 0;
           const isStrict = roleConfig.is_strict === true;

           // Si NO hay ninguna página configurada (ni true ni false) Y NO es estricto, 
           // asumimos que es un rol nuevo/legacy.
           // CAMBIO DE SEGURIDAD: Ya no aplicamos modo permisivo.
           // Si el rol está en el sistema de gestión, debe tener permisos explícitos.
           if (!hasConfiguredPages && !isStrict) {
               // Solo permitir Dashboard
               if (path === '/Dashboard' || path === '/') return true;
               
               // Bloquear todo lo demás
               // console.warn(`Access Denied (Empty Config): Role=${effectiveRoleKey} Path=${path}`);
               return false;
           }

           // Si HAY configuración o es ESTRICTO:
           // Normalizar path de entrada (quitar query params y trailing slash)
           const cleanPath = path.split('?')[0].replace(/\/$/, '');
           
           // Generar variantes para comparación robusta (con y sin slash inicial)
           const pathNoSlash = cleanPath.replace(/^\//, '');
           const pathWithSlash = '/' + pathNoSlash;
           
           // 1. Coincidencia exacta y variantes (Key lookup rápido)
           if (pagePerms[path] === true) return true;
           if (pagePerms[cleanPath] === true) return true;
           if (pagePerms[pathNoSlash] === true) return true;
           if (pagePerms[pathWithSlash] === true) return true;
           
           // 2. Búsqueda por coincidencia normalizada (robustez y sub-rutas)
           // Busca si alguna key configurada coincide con el path solicitado
           const matchedKey = keys.find(key => {
              // Normalizar la key de configuración
              const cleanKey = key.split('?')[0].replace(/\/$/, '');
              const keyNoSlash = cleanKey.replace(/^\//, '');
              
              // Coincidencia exacta de path (ignorando slash inicial)
              if (keyNoSlash === pathNoSlash) return true;
              
              // Coincidencia de sub-ruta (ej. /NewProcessConfigurator/*)
              // Comprobamos si el path solicitado empieza con la key configurada + '/'
              if (pathWithSlash.startsWith('/' + keyNoSlash + '/')) return true;
              
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
        // console.warn(`Access Denied (Fallback): Role=${effectiveRoleKey} Path=${path} - No configuration found for role.`);
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
