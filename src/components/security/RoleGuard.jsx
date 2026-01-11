import React from "react";
import { usePermissions } from "../permissions/usePermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Lock } from "lucide-react";

/**
 * Componente para proteger contenido basado en rol nativo de Base44
 * Reemplaza cualquier lógica de Role/UserRole deprecated
 */
export function RoleGuard({ children, requireAdmin = false, requirePermission = null, fallback = null }) {
  const permissions = usePermissions();

  // Verificar autenticación
  if (!permissions.isAuthenticated) {
    return fallback || (
      <Alert className="border-red-200 bg-red-50">
        <Lock className="w-4 h-4 text-red-600" />
        <AlertDescription className="text-red-900">
          Debes iniciar sesión para acceder a este contenido
        </AlertDescription>
      </Alert>
    );
  }

  // Verificar admin
  if (requireAdmin && !permissions.isAdmin) {
    return fallback || (
      <Alert className="border-amber-200 bg-amber-50">
        <Shield className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-900">
          Solo administradores pueden acceder a este contenido
        </AlertDescription>
      </Alert>
    );
  }

  // Verificar permiso específico
  if (requirePermission && !permissions[requirePermission]) {
    return fallback || (
      <Alert className="border-amber-200 bg-amber-50">
        <Shield className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-900">
          No tienes permisos suficientes para acceder a este contenido
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}

/**
 * HOC para proteger páginas completas
 */
export function withRoleGuard(Component, options = {}) {
  return function ProtectedComponent(props) {
    return (
      <RoleGuard {...options}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}

/**
 * Hook para usar en condicionales
 */
export function useRoleCheck() {
  const permissions = usePermissions();
  
  return {
    isAdmin: permissions.isAdmin,
    isAuthenticated: permissions.isAuthenticated,
    checkPermission: (permission) => permissions[permission] || false,
  };
}