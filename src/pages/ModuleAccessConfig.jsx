import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Smartphone, Monitor, Shield, Save, RefreshCw, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import Breadcrumbs from "../components/common/Breadcrumbs";
import ProtectedPage from "../components/roles/ProtectedPage";

const MODULES = [
  { key: "dashboard", name: "Dashboard General", category: "Principal" },
  { key: "hr_dashboard", name: "Dashboard RRHH", category: "RRHH" },
  { key: "employees", name: "Base de Empleados", category: "RRHH" },
  { key: "absences", name: "Gestión Ausencias", category: "RRHH" },
  { key: "ett_temporary", name: "ETT y Temporales", category: "RRHH" },
  { key: "onboarding", name: "Onboarding", category: "RRHH" },
  { key: "attendance", name: "Control Presencia", category: "RRHH" },
  { key: "committee", name: "Comités y PRL", category: "RRHH" },
  { key: "incentives", name: "Plan Incentivos", category: "RRHH" },
  { key: "timeline", name: "Timeline Recursos", category: "Planificación" },
  { key: "daily_planning", name: "Planning Diario", category: "Planificación" },
  { key: "shift_planning", name: "Planning Turnos", category: "Planificación" },
  { key: "shift_managers", name: "Jefes de Turno", category: "Planificación" },
  { key: "production_dashboard", name: "Dashboard Producción", category: "Producción" },
  { key: "production_planning", name: "Planificador Órdenes", category: "Producción" },
  { key: "process_config", name: "Config. Procesos", category: "Producción" },
  { key: "machine_management", name: "Consulta Máquinas", category: "Producción" },
  { key: "machine_master", name: "Archivo Maestro", category: "Mantenimiento" },
  { key: "maintenance", name: "Seguimiento", category: "Mantenimiento" },
  { key: "quality_control", name: "Control de Calidad", category: "Calidad" },
  { key: "messaging", name: "Mensajería", category: "Comunicación" },
  { key: "notifications", name: "Notificaciones", category: "Comunicación" },
  { key: "reports", name: "Informes", category: "Análisis" },
  { key: "ml_insights", name: "Análisis Predictivo", category: "Análisis" },
  { key: "configuration", name: "General", category: "Configuración" },
  { key: "roles", name: "Gestión Roles", category: "Configuración" },
  { key: "user_roles", name: "Asignación Roles", category: "Configuración" },
  { key: "mobile_config", name: "Config. App Móvil", category: "Configuración" },
  { key: "data_migration", name: "Migración Datos", category: "Configuración" },
  { key: "system_health", name: "Salud Sistema", category: "Configuración" },
  { key: "user_manual", name: "Manual Usuario", category: "Configuración" }
];

export default function ModuleAccessConfigPage() {
  return (
    <ProtectedPage module="configuration" action="edit_general">
      <ModuleAccessConfigContent />
    </ProtectedPage>
  );
}

function ModuleAccessConfigContent() {
  const [selectedRole, setSelectedRole] = useState("all");
  const [configChanges, setConfigChanges] = useState({});
  
  const queryClient = useQueryClient();

  const { data: roles = [] } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.list(),
  });

  const { data: accessConfigs = [] } = useQuery({
    queryKey: ['moduleAccessConfigs'],
    queryFn: () => base44.entities.ModuleAccessConfig.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async (configs) => {
      const promises = configs.map(config => {
        if (config.id) {
          return base44.entities.ModuleAccessConfig.update(config.id, config);
        } else {
          return base44.entities.ModuleAccessConfig.create(config);
        }
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast.success("Configuración guardada");
      queryClient.invalidateQueries({ queryKey: ['moduleAccessConfigs'] });
      setConfigChanges({});
    },
    onError: () => toast.error("Error al guardar")
  });

  const initDefaultsMutation = useMutation({
    mutationFn: async () => {
      const defaultConfigs = MODULES.map(mod => ({
        module_key: mod.key,
        module_name: mod.name,
        module_category: mod.category,
        web_access: true,
        mobile_access: ["absences", "daily_planning", "messaging", "notifications"].includes(mod.key),
        active: true
      }));
      await base44.entities.ModuleAccessConfig.bulkCreate(defaultConfigs);
    },
    onSuccess: () => {
      toast.success("Configuración por defecto creada");
      queryClient.invalidateQueries({ queryKey: ['moduleAccessConfigs'] });
    }
  });

  const handleToggle = (moduleKey, roleId, field, value) => {
    const key = `${moduleKey}_${roleId || 'all'}`;
    setConfigChanges(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        module_key: moduleKey,
        role_id: roleId || null,
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    const configsToSave = Object.values(configChanges).map(change => {
      const existing = accessConfigs.find(c => 
        c.module_key === change.module_key && 
        (c.role_id === change.role_id || (!c.role_id && !change.role_id))
      );
      
      if (existing) {
        return { ...existing, ...change };
      } else {
        const module = MODULES.find(m => m.key === change.module_key);
        return {
          module_key: change.module_key,
          module_name: module?.name || change.module_key,
          module_category: module?.category || "Configuración",
          role_id: change.role_id,
          web_access: change.web_access ?? true,
          mobile_access: change.mobile_access ?? false,
          active: true
        };
      }
    });

    saveMutation.mutate(configsToSave);
  };

  const getConfigValue = (moduleKey, roleId, field) => {
    const key = `${moduleKey}_${roleId || 'all'}`;
    if (configChanges[key]?.[field] !== undefined) {
      return configChanges[key][field];
    }
    
    const existing = accessConfigs.find(c => 
      c.module_key === moduleKey && 
      (c.role_id === roleId || (!c.role_id && !roleId))
    );
    return existing?.[field] ?? (field === 'web_access' ? true : false);
  };

  const filteredModules = useMemo(() => {
    return MODULES;
  }, []);

  const groupedModules = useMemo(() => {
    return filteredModules.reduce((acc, mod) => {
      if (!acc[mod.category]) acc[mod.category] = [];
      acc[mod.category].push(mod);
      return acc;
    }, {});
  }, [filteredModules]);

  const hasChanges = Object.keys(configChanges).length > 0;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs items={[
          { label: "Configuración", url: createPageUrl("Configuration") },
          { label: "Acceso a Módulos" }
        ]} />

        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Shield className="w-6 h-6 md:w-8 md:h-8 text-blue-600 dark:text-blue-400" />
              Control de Acceso a Módulos
            </h1>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-1">
              Configura qué módulos son accesibles desde Web y App Móvil por rol
            </p>
          </div>
          <div className="flex gap-2">
            {accessConfigs.length === 0 && (
              <Button
                onClick={() => initDefaultsMutation.mutate()}
                variant="outline"
                className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Config. Defecto
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Cambios
            </Button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
            <CardContent className="p-4 flex items-center gap-3">
              <Monitor className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Módulos Web</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {MODULES.filter(m => getConfigValue(m.key, selectedRole === 'all' ? null : selectedRole, 'web_access')).length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950">
            <CardContent className="p-4 flex items-center gap-3">
              <Smartphone className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">Módulos Móvil</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {MODULES.filter(m => getConfigValue(m.key, selectedRole === 'all' ? null : selectedRole, 'mobile_access')).length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="w-8 h-8 text-slate-600 dark:text-slate-400" />
              <div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">Roles Configurados</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {roles.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role Filter */}
        <Card className="mb-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium">Filtrar por Rol:</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Roles (Global)</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Modules Table by Category */}
        {Object.entries(groupedModules).map(([category, modules]) => (
          <Card key={category} className="mb-6 shadow-lg border-0 bg-white dark:bg-slate-900">
            <CardHeader className="border-b border-slate-100 dark:border-slate-700 pb-3">
              <CardTitle className="text-lg dark:text-slate-100">{category}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                      <TableHead className="dark:text-slate-300">Módulo</TableHead>
                      <TableHead className="text-center dark:text-slate-300">
                        <div className="flex items-center justify-center gap-2">
                          <Monitor className="w-4 h-4" />
                          Web
                        </div>
                      </TableHead>
                      <TableHead className="text-center dark:text-slate-300">
                        <div className="flex items-center justify-center gap-2">
                          <Smartphone className="w-4 h-4" />
                          Móvil
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.map(module => {
                      const roleId = selectedRole === 'all' ? null : selectedRole;
                      const webAccess = getConfigValue(module.key, roleId, 'web_access');
                      const mobileAccess = getConfigValue(module.key, roleId, 'mobile_access');
                      
                      return (
                        <TableRow key={module.key} className="dark:border-slate-800">
                          <TableCell className="font-medium dark:text-slate-200">
                            {module.name}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Switch
                                checked={webAccess}
                                onCheckedChange={(val) => handleToggle(module.key, roleId, 'web_access', val)}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Switch
                                checked={mobileAccess}
                                onCheckedChange={(val) => handleToggle(module.key, roleId, 'mobile_access', val)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}

        {hasChanges && (
          <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
            <span className="text-sm font-medium">{Object.keys(configChanges).length} cambios pendientes</span>
            <Button
              onClick={handleSave}
              size="sm"
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}