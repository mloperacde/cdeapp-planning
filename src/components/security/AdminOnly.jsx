import React from "react";
import { usePermissions } from "../permissions/usePermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

/**
 * Wrapper simple para contenido solo de administrador
 */
export default function AdminOnly({ children, message = "Solo administradores pueden acceder a esta funcionalidad" }) {
  const { isAdmin } = usePermissions();

  if (!isAdmin) {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <Lock className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-900">
          {message}
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}