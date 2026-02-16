import React from 'react';
import { useModulePermissions } from '@/components/permissions/usePermissions';
import { AlertCircle, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Componente que envuelve módulos y verifica permisos antes de renderizarlos
 * @param {string} pageName - Nombre de la página (debe coincidir con MODULE_DEFINITIONS)
 * @param {string} moduleName - Nombre del módulo específico dentro de la página
 * @param {React.ReactNode} children - Contenido a mostrar si tiene permisos
 * @param {React.ReactNode} fallback - Contenido alternativo si no tiene permisos (opcional)
 * @param {boolean} silent - Si es true, no muestra nada cuando no tiene permisos (default: false)
 */
export default function ModuleGuard({ pageName, moduleName, children, fallback, silent = false }) {
  const { canAccessModule } = useModulePermissions(pageName);
  const hasAccess = canAccessModule(moduleName);

  if (!hasAccess) {
    if (silent) return null;
    
    if (fallback) return fallback;
    
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-amber-700">
            <Lock className="w-5 h-5" />
            <div>
              <p className="font-medium">Acceso Restringido</p>
              <p className="text-sm text-amber-600">No tienes permisos para acceder a este módulo.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

/**
 * Hook para verificar si el usuario puede ver al menos un módulo de la página
 * Útil para decidir si mostrar la página completa o un mensaje de "sin acceso"
 */
export function useHasAnyModuleAccess(pageName) {
  const { hasAnyModuleAccess } = useModulePermissions(pageName);
  return hasAnyModuleAccess();
}