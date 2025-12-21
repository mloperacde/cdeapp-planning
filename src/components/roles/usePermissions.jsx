import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function usePermissions() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['currentUserRoles', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.UserRole.filter({ 
        user_email: currentUser.email,
        active: true 
      });
    },
    enabled: !!currentUser?.email,
    staleTime: 1000, // 1 second to refresh immediately
    refetchInterval: 2000, // Refetch every 2 seconds
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
    staleTime: 1000,
    refetchInterval: 2000,
  });

  // Get user's role with highest level
  const userRole = React.useMemo(() => {
    if (userRoles.length === 0) return null;
    
    const roleIds = userRoles.map(ur => ur.role_id);
    const userRoleObjects = roles.filter(r => roleIds.includes(r.id) && r.active);
    
    if (userRoleObjects.length === 0) return null;
    
    // Return role with highest level
    return userRoleObjects.reduce((max, role) => 
      (role.level > max.level) ? role : max
    );
  }, [userRoles, roles]);

  // Check if user has permission
  const hasPermission = React.useCallback((module, action) => {
    if (!userRole) return false;
    
    // Admin always has all permissions
    if (currentUser?.role === 'admin') return true;
    
    return userRole.permissions?.[module]?.[action] === true;
  }, [userRole, currentUser]);

  // Check if user has any permission in module
  const hasModuleAccess = React.useCallback((module) => {
    if (!userRole) return false;
    if (currentUser?.role === 'admin') return true;
    
    const modulePerms = userRole.permissions?.[module];
    if (!modulePerms) return false;
    
    return Object.values(modulePerms).some(val => val === true);
  }, [userRole, currentUser]);

  return {
    userRole,
    hasPermission,
    hasModuleAccess,
    isAdmin: currentUser?.role === 'admin',
    permissions: userRole?.permissions || {}
  };
}

// HOC to protect routes
export function withPermission(Component, requiredModule, requiredAction) {
  return function ProtectedComponent(props) {
    const { hasPermission, isAdmin } = usePermissions();
    
    if (!isAdmin && !hasPermission(requiredModule, requiredAction)) {
      return (
        <div className="flex flex-col items-center justify-center h-screen">
          <Shield className="w-16 h-16 text-slate-300 mb-4" />
          <h2 className="text-2xl font-bold text-slate-700 mb-2">Acceso Denegado</h2>
          <p className="text-slate-500">No tienes permisos para acceder a esta página</p>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
}