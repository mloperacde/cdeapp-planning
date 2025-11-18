import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function usePermissions() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000, // Cache 10 minutos
  });

  const { data: userRoleAssignments = [] } = useQuery({
    queryKey: ['userRoleAssignments', currentUser?.email],
    queryFn: () => base44.entities.UserRoleAssignment.filter({ user_email: currentUser.email }),
    enabled: !!currentUser?.email,
    staleTime: 5 * 60 * 1000,
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.list(),
    staleTime: 10 * 60 * 1000,
  });

  const activeRoles = userRoles.filter(role => 
    userRoleAssignments.some(assignment => assignment.role_id === role.id)
  );

  const hasPermission = (module, action) => {
    if (currentUser?.role === 'admin') return true;
    
    return activeRoles.some(role => {
      const modulePerms = role.permissions?.modules?.[module];
      if (!modulePerms) return false;
      return action === 'view' ? modulePerms.view : modulePerms.edit;
    });
  };

  const hasAction = (actionName) => {
    if (currentUser?.role === 'admin') return true;
    
    return activeRoles.some(role => 
      role.permissions?.actions?.[actionName] === true
    );
  };

  const canViewUI = (uiElement) => {
    if (currentUser?.role === 'admin') return true;
    
    return activeRoles.some(role => 
      role.permissions?.ui?.[uiElement] !== false
    );
  };

  return {
    currentUser,
    activeRoles,
    hasPermission,
    hasAction,
    canViewUI,
    isAdmin: currentUser?.role === 'admin',
  };
}