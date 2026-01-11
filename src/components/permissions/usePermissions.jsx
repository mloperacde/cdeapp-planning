import { useMemo } from "react";
import { useAppData } from "../data/DataProvider";

/**
 * Hook centralizado para permisos basado en sistema nativo de Base44
 * Reemplaza completamente las entidades Role y UserRole (deprecated)
 * 
 * ROLES NATIVOS DE BASE44:
 * - 'admin' → Acceso completo a todo
 * - 'user' → Acceso limitado según configuración
 */
export function usePermissions() {
  const { user, isAdmin } = useAppData();

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

    const role = user.role; // Sistema nativo: 'admin' o 'user'

    // Permisos basados en rol nativo
    if (role === 'admin') {
      return {
        isAuthenticated: true,
        isAdmin: true,
        canViewSalary: true,
        canViewPersonalData: true,
        canViewBankingData: true,
        canEditEmployees: true,
        canApproveAbsences: true,
        canManageMachines: true,
        canViewReports: true,
        canConfigureSystem: true,
        role: 'admin',
        userEmail: user.email,
        userName: user.full_name,
      };
    }

    // Usuario regular - permisos limitados
    return {
      isAuthenticated: true,
      isAdmin: false,
      canViewSalary: false,
      canViewPersonalData: false,
      canViewBankingData: false,
      canEditEmployees: false,
      canApproveAbsences: false,
      canManageMachines: false,
      canViewReports: true, // Pueden ver sus propios reportes
      canConfigureSystem: false,
      role: 'user',
      userEmail: user.email,
      userName: user.full_name,
    };
  }, [user, isAdmin]);
}

/**
 * Hook simplificado para verificar si es administrador
 */
export function useIsAdmin() {
  const { isAdmin } = useAppData();
  return isAdmin;
}

/**
 * Hook para verificar permisos específicos
 */
export function useHasPermission(permission) {
  const permissions = usePermissions();
  return permissions[permission] || false;
}