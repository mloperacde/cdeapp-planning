import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

/**
 * Componente para mostrar advertencias sobre entidades deprecated
 * ENTIDADES DEPRECATED QUE NO DEBEN USARSE:
 * - Role → Usar base44.auth sistema nativo
 * - UserRole → Usar base44.auth sistema nativo
 * - Employee → Usar EmployeeMasterDatabase
 */
export default function DeprecatedEntityWarning({ entityName }) {
  const deprecatedEntities = {
    'Role': {
      message: 'La entidad Role está deprecated. Usar el sistema nativo de Base44 (user.role)',
      alternative: 'base44.auth.me() → user.role'
    },
    'UserRole': {
      message: 'La entidad UserRole está deprecated. Usar el sistema nativo de Base44',
      alternative: 'base44.auth.me() → user.role'
    },
    'Employee': {
      message: 'La entidad Employee está deprecated. Usar EmployeeMasterDatabase como fuente única',
      alternative: 'base44.entities.EmployeeMasterDatabase'
    }
  };

  const warning = deprecatedEntities[entityName];
  
  if (!warning) return null;

  return (
    <Alert className="border-red-500 bg-red-50 mb-4">
      <AlertTriangle className="w-4 h-4 text-red-600" />
      <AlertDescription className="text-red-900">
        <strong>⚠️ DEPRECATED:</strong> {warning.message}
        <br />
        <span className="text-xs">Alternativa: <code className="bg-red-200 px-1 rounded">{warning.alternative}</code></span>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Hook para detectar uso de entidades deprecated
 */
export function useDeprecatedCheck(entityName) {
  React.useEffect(() => {
    const deprecated = ['Role', 'UserRole', 'Employee'];
    if (deprecated.includes(entityName)) {
      console.warn(`🚨 DEPRECATED: Intentando usar entidad ${entityName}. Ver DeprecatedEntityWarning para alternativas.`);
    }
  }, [entityName]);
}