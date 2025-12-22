import React from "react";
import { Shield, Lock } from "lucide-react";
import { usePermissions } from "./usePermissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProtectedPage({ module, action, children, fallbackMessage }) {
  const { hasPermission, isAdmin, userRole } = usePermissions();
  
  // Admin siempre tiene acceso
  if (isAdmin) return <>{children}</>;
  
  // Usuario sin rol asignado
  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="max-w-md w-full shadow-2xl border-amber-200">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
              <Shield className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Sin Rol Asignado</h2>
            <p className="text-slate-600 mb-4">
              Tu cuenta no tiene un rol asignado. Contacta con el administrador del sistema.
            </p>
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline">Volver al Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Usuario con rol pero sin permiso específico
  if (!hasPermission(module, action)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <Card className="max-w-md w-full shadow-2xl border-red-200">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500 rounded-full flex items-center justify-center">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso Denegado</h2>
            <p className="text-slate-600 mb-4">
              {fallbackMessage || `No tienes permisos suficientes para acceder a esta sección.`}
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Tu rol actual: <span className="font-semibold">{userRole.name}</span>
            </p>
            <Link to={createPageUrl("Dashboard")}>
              <Button>Volver al Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return <>{children}</>;
}