import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook para verificar permisos del usuario actual
 */
export const usePermissions = () => {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: roleAssignments = [] } = useQuery({
    queryKey: ['userRoleAssignments'],
    queryFn: () => base44.entities.UserRoleAssignment.list(),
    initialData: [],
    enabled: !!user,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.list(),
    initialData: [],
  });

  const currentEmployee = employees.find(e => e?.email === user?.email);

  const getUserRoles = () => {
    if (!currentEmployee) return [];
    
    const userRoleIds = roleAssignments
      .filter(ra => ra?.user_id === currentEmployee.id && ra?.activo)
      .map(ra => ra?.role_id);
    
    return roles.filter(r => userRoleIds.includes(r?.id));
  };

  const userRoles = getUserRoles();

  // Admin tiene todos los permisos
  const isAdmin = user?.role === 'admin' || userRoles.some(r => r?.is_admin);

  const hasPermission = (module, action = null) => {
    if (isAdmin) return true;
    
    if (!action) {
      // Verificar acceso a módulo
      return userRoles.some(r => 
        r?.permissions?.modulos_acceso?.includes(module)
      );
    }

    // Verificar acción específica
    return userRoles.some(r => {
      const permissions = r?.permissions || {};
      
      // Buscar en las diferentes categorías de acciones
      for (const category of Object.keys(permissions)) {
        if (category.startsWith('acciones_')) {
          const actions = permissions[category] || {};
          if (actions[action]) return true;
        }
      }
      
      return false;
    });
  };

  const hasUIPermission = (module, element) => {
    if (isAdmin) return true;
    
    return userRoles.some(r => 
      r?.permissions?.ui_visibilidad?.[module]?.[element]
    );
  };

  return {
    user,
    currentEmployee,
    userRoles,
    isAdmin,
    hasPermission,
    hasUIPermission,
    isLoading: !user
  };
};

/**
 * Componente para ocultar elementos basados en permisos
 */
export const PermissionGuard = ({ module, action = null, children, fallback = null }) => {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission(module, action)) {
    return fallback;
  }
  
  return children;
};

/**
 * Componente para ocultar elementos UI basados en permisos
 */
export const UIPermissionGuard = ({ module, element, children, fallback = null }) => {
  const { hasUIPermission } = usePermissions();
  
  if (!hasUIPermission(module, element)) {
    return fallback;
  }
  
  return children;
};

export default {
  usePermissions,
  PermissionGuard,
  UIPermissionGuard
};