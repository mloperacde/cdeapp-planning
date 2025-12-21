import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  Cog, 
  FileText, 
  Settings, 
  TrendingUp,
  Shield,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const PERMISSION_MODULES = {
  dashboard: {
    icon: TrendingUp,
    label: "Dashboard",
    color: "text-blue-600",
    permissions: {
      view: "Ver dashboard",
      view_all_teams: "Ver todos los equipos"
    }
  },
  employees: {
    icon: Users,
    label: "Empleados",
    color: "text-green-600",
    permissions: {
      view: "Ver empleados",
      create: "Crear empleado",
      edit: "Editar empleado",
      delete: "Eliminar empleado",
      view_sensitive: "Ver datos sensibles",
      export: "Exportar datos"
    }
  },
  absences: {
    icon: Calendar,
    label: "Ausencias",
    color: "text-orange-600",
    permissions: {
      view: "Ver ausencias",
      create: "Crear ausencia",
      edit: "Editar ausencia",
      delete: "Eliminar ausencia",
      approve: "Aprobar ausencias",
      view_all: "Ver todas las ausencias"
    }
  },
  planning: {
    icon: Calendar,
    label: "Planificación",
    color: "text-purple-600",
    permissions: {
      view: "Ver planificación",
      edit: "Editar planificación",
      create: "Crear planificación",
      confirm: "Confirmar planificación"
    }
  },
  machines: {
    icon: Cog,
    label: "Máquinas",
    color: "text-slate-600",
    permissions: {
      view: "Ver máquinas",
      create: "Crear máquina",
      edit: "Editar máquina",
      delete: "Eliminar máquina",
      configure_processes: "Configurar procesos"
    }
  },
  maintenance: {
    icon: Settings,
    label: "Mantenimiento",
    color: "text-red-600",
    permissions: {
      view: "Ver mantenimiento",
      create: "Crear tarea",
      edit: "Editar tarea",
      complete: "Completar tarea"
    }
  },
  reports: {
    icon: FileText,
    label: "Informes",
    color: "text-indigo-600",
    permissions: {
      view: "Ver informes",
      export: "Exportar informes",
      advanced: "Informes avanzados"
    }
  },
  configuration: {
    icon: Shield,
    label: "Configuración",
    color: "text-amber-600",
    permissions: {
      view: "Ver configuración",
      edit_general: "Editar configuración general",
      manage_roles: "Gestionar roles",
      manage_users: "Gestionar usuarios",
      manage_teams: "Gestionar equipos"
    }
  },
  hrm: {
    icon: Users,
    label: "Recursos Humanos",
    color: "text-teal-600",
    permissions: {
      view: "Ver RRHH",
      manage_contracts: "Gestionar contratos",
      manage_onboarding: "Gestionar onboarding",
      manage_performance: "Gestionar evaluaciones"
    }
  },
  incentives: {
    icon: TrendingUp,
    label: "Incentivos",
    color: "text-emerald-600",
    permissions: {
      view: "Ver incentivos",
      configure: "Configurar planes",
      evaluate: "Evaluar resultados"
    }
  },
  documents: {
    icon: FileText,
    label: "Documentos",
    color: "text-cyan-600",
    permissions: {
      view: "Ver documentos",
      upload: "Subir documentos",
      manage: "Gestionar documentos"
    }
  }
};

export default function PermissionsEditor({ permissions, onChange, disabled = false }) {
  const [openModules, setOpenModules] = React.useState({});

  const toggleModule = (moduleKey) => {
    setOpenModules(prev => ({ ...prev, [moduleKey]: !prev[moduleKey] }));
  };

  const handlePermissionChange = (moduleKey, permissionKey, value) => {
    const updatedPermissions = {
      ...permissions,
      [moduleKey]: {
        ...permissions[moduleKey],
        [permissionKey]: value
      }
    };
    onChange(updatedPermissions);
  };

  const handleSelectAll = (moduleKey, value) => {
    const modulePerms = PERMISSION_MODULES[moduleKey].permissions;
    const updatedModulePerms = {};
    Object.keys(modulePerms).forEach(key => {
      updatedModulePerms[key] = value;
    });
    
    const updatedPermissions = {
      ...permissions,
      [moduleKey]: updatedModulePerms
    };
    onChange(updatedPermissions);
  };

  const getModulePermissionCount = (moduleKey) => {
    const modulePerms = permissions[moduleKey] || {};
    return Object.values(modulePerms).filter(Boolean).length;
  };

  return (
    <div className="space-y-3">
      {Object.entries(PERMISSION_MODULES).map(([moduleKey, moduleData]) => {
        const Icon = moduleData.icon;
        const activeCount = getModulePermissionCount(moduleKey);
        const totalCount = Object.keys(moduleData.permissions).length;
        
        return (
          <Card key={moduleKey} className="border-2">
            <Collapsible open={openModules[moduleKey]} onOpenChange={() => toggleModule(moduleKey)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors pb-3 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {openModules[moduleKey] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <Icon className={`w-5 h-5 ${moduleData.color}`} />
                      <CardTitle className="text-base">{moduleData.label}</CardTitle>
                      <Badge variant={activeCount > 0 ? "default" : "outline"}>
                        {activeCount}/{totalCount}
                      </Badge>
                    </div>
                    <Checkbox
                      checked={activeCount === totalCount && totalCount > 0}
                      onCheckedChange={(checked) => handleSelectAll(moduleKey, checked)}
                      onClick={(e) => e.stopPropagation()}
                      disabled={disabled}
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0">
                  {Object.entries(moduleData.permissions).map(([permKey, permLabel]) => (
                    <div key={permKey} className="flex items-center space-x-2 p-2 rounded hover:bg-slate-50">
                      <Checkbox
                        id={`${moduleKey}-${permKey}`}
                        checked={permissions[moduleKey]?.[permKey] || false}
                        onCheckedChange={(checked) => handlePermissionChange(moduleKey, permKey, checked)}
                        disabled={disabled}
                      />
                      <label
                        htmlFor={`${moduleKey}-${permKey}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {permLabel}
                      </label>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}