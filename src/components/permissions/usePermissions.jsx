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
  const { user } = useAppData();

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

    const role = user.role || "user";
    const base = {
      isAuthenticated: true,
      isAdmin: false,
      canViewSalary: false,
      canViewPersonalData: false,
      canViewBankingData: false,
      canEditEmployees: false,
      canApproveAbsences: false,
      canManageMachines: false,
      canViewReports: true,
      canConfigureSystem: false,
      role,
      userEmail: user.email,
      userName: user.full_name,
    };

    const config = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;

    return {
      ...base,
      ...config,
    };
  }, [user]);
}

export function useIsAdmin() {
  const { isAdmin } = useAppData();
  return isAdmin;
}
export function useHasPermission(permission) {
  const permissions = usePermissions();
  return permissions[permission] || false;
}
