import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook para verificar si un módulo es accesible según el dispositivo y rol del usuario
 */
export function useModuleAccess() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userRoleAssignments = [] } = useQuery({
    queryKey: ['userRoleAssignments', currentUser?.email],
    queryFn: () => base44.entities.UserRoleAssignment.filter({ user_email: currentUser?.email }),
    enabled: !!currentUser?.email,
  });

  const { data: accessConfigs = [] } = useQuery({
    queryKey: ['moduleAccessConfigs'],
    queryFn: () => base44.entities.ModuleAccessConfig.list(),
  });

  const isMobile = useMemo(() => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }, []);

  const canAccessModule = useMemo(() => {
    return (moduleKey) => {
      if (!currentUser) return false;
      
      // Admin siempre tiene acceso
      if (currentUser.role === 'admin') return true;

      // Si no hay configuración, permitir acceso por defecto
      if (accessConfigs.length === 0) return true;

      const userRoleIds = userRoleAssignments.map(a => a.role_id);
      
      // Buscar configuración específica del rol
      const roleConfigs = accessConfigs.filter(c => 
        c.module_key === moduleKey && 
        c.active &&
        userRoleIds.includes(c.role_id)
      );

      // Si hay config específica de rol, usarla
      if (roleConfigs.length > 0) {
        return roleConfigs.some(c => 
          isMobile ? c.mobile_access : c.web_access
        );
      }

      // Si no, buscar configuración global (sin role_id)
      const globalConfig = accessConfigs.find(c => 
        c.module_key === moduleKey && 
        c.active &&
        !c.role_id
      );

      if (globalConfig) {
        return isMobile ? globalConfig.mobile_access : globalConfig.web_access;
      }

      // Por defecto, permitir acceso web, denegar móvil
      return !isMobile;
    };
  }, [currentUser, userRoleAssignments, accessConfigs, isMobile]);

  return {
    canAccessModule,
    isMobile,
    isAdmin: currentUser?.role === 'admin'
  };
}