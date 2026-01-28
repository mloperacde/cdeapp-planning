import React, { useState, useEffect, useMemo } from "react";
import { useAppData } from "@/components/data/DataProvider";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Shield, Users, Save, Plus, Trash2, AlertTriangle, RotateCcw, Factory, Search, Filter, X, Lock, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { MENU_STRUCTURE } from '@/config/menuConfig';

// Definición de permisos y sus etiquetas legibles
const PERMISSION_LABELS = {
  isAdmin: "Administrador Total",
  canViewSalary: "Ver Salarios",
  canViewPersonalData: "Ver Datos Personales",
  canViewBankingData: "Ver Datos Bancarios",
  canEditEmployees: "Editar Empleados",
  canApproveAbsences: "Aprobar Ausencias",
  canManageMachines: "Gestionar Máquinas",
  canViewReports: "Ver Informes",
  canConfigureSystem: "Configurar Sistema",
};

// Roles por defecto (copia de seguridad del sistema anterior)
const DEFAULT_ROLES_CONFIG = {
  roles: {
    admin: {
      name: "Administrador",
      permissions: {
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
      isSystem: true
    },
    hr_manager: {
      name: "Gerente RRHH",
      permissions: {
        isAdmin: false,
        canViewSalary: true,
        canViewPersonalData: true,
        canViewBankingData: true,
        canEditEmployees: true,
        canApproveAbsences: true,
        canManageMachines: false,
        canViewReports: true,
        canConfigureSystem: false,
      }
    },
    shift_manager_production: {
      name: "Jefe Turno Producción",
      permissions: {
        isAdmin: false,
        canViewSalary: false,
        canViewPersonalData: true,
        canViewBankingData: false,
        canEditEmployees: false,
        canApproveAbsences: true,
        canManageMachines: true,
        canViewReports: true,
        canConfigureSystem: false,
      }
    },
    shift_manager_quality: {
      name: "Jefe Turno Calidad",
      permissions: {
        isAdmin: false,
        canViewSalary: false,
        canViewPersonalData: true,
        canViewBankingData: false,
        canEditEmployees: false,
        canApproveAbsences: true,
        canManageMachines: false,
        canViewReports: true,
        canConfigureSystem: false,
      }
    },
    shift_manager_maintenance: {
      name: "Jefe Turno Mantenimiento",
      permissions: {
        isAdmin: false,
        canViewSalary: false,
        canViewPersonalData: true,
        canViewBankingData: false,
        canEditEmployees: false,
        canApproveAbsences: true,
        canManageMachines: true,
        canViewReports: true,
        canConfigureSystem: false,
      }
    },
    prod_supervisor: {
      name: "Supervisor Producción",
      permissions: {
        isAdmin: false,
        canViewSalary: false,
        canViewPersonalData: true,
        canViewBankingData: false,
        canEditEmployees: false,
        canApproveAbsences: true,
        canManageMachines: true,
        canViewReports: true,
        canConfigureSystem: false,
      }
    },
    maintenance_tech: {
      name: "Técnico Mantenimiento",
      permissions: {
        isAdmin: false,
        canViewSalary: false,
        canViewPersonalData: false,
        canViewBankingData: false,
        canEditEmployees: false,
        canApproveAbsences: false,
        canManageMachines: true,
        canViewReports: true,
        canConfigureSystem: false,
      }
    },
    operator: {
      name: "Operario",
      permissions: {
        isAdmin: false,
        canViewSalary: false,
        canViewPersonalData: false,
        canViewBankingData: false,
        canEditEmployees: false,
        canApproveAbsences: false,
        canManageMachines: false,
        canViewReports: true,
        canConfigureSystem: false,
      }
    },
    user: {
      name: "Usuario Estándar",
      permissions: {
        isAdmin: false,
        canViewSalary: false,
        canViewPersonalData: false,
        canViewBankingData: false,
        canEditEmployees: false,
        canApproveAbsences: false,
        canManageMachines: false,
        canViewReports: false,
        canConfigureSystem: false,
      },
      isSystem: true
    },
  },
  user_assignments: {} // email -> role_id
};

export default function AppUserManagement() {
  const { employees, rolesConfig, refetchRolesConfig } = useAppData();
  const queryClient = useQueryClient();
  
  // Estado local para edición
  const [localConfig, setLocalConfig] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados para nuevo rol
  const [isNewRoleOpen, setIsNewRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleId, setNewRoleId] = useState("");

  // Estados de filtrado y búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("users");

  // Inicializar estado local cuando cargan los datos
  useEffect(() => {
    if (rolesConfig && !isDirty) {
      // Deep copy para evitar mutaciones directas y referencias compartidas
      setLocalConfig(JSON.parse(JSON.stringify(rolesConfig)));
    } else if (!rolesConfig && !isDirty) {
      setLocalConfig(JSON.parse(JSON.stringify(DEFAULT_ROLES_CONFIG)));
    }
  }, [rolesConfig, isDirty]);

  // Derived state: Roles keys
  const roleKeys = useMemo(() => {
    return localConfig ? Object.keys(localConfig.roles) : [];
  }, [localConfig]);

  // Derived state: Departments list for filter
  const departments = useMemo(() => {
    if (!employees) return [];
    const depts = new Set(employees.map(e => e.departamento).filter(Boolean));
    return Array.from(depts).sort();
  }, [employees]);

  // Derived state: Filtered Employees
  const filteredEmployees = useMemo(() => {
    if (!employees || !localConfig) return [];
    
    return employees.filter(emp => {
      // Search term filter
      const searchMatch = !searchTerm || 
        (emp.nombre && emp.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Department filter
      const deptMatch = departmentFilter === "all" || emp.departamento === departmentFilter;
      
      // Role filter
      const userRole = emp.email ? (localConfig.user_assignments?.[emp.email.toLowerCase()] || "none") : "none";
      const roleMatch = roleFilter === "all" || 
                       (roleFilter === "none" && (!userRole || userRole === "none")) ||
                       userRole === roleFilter;

      return searchMatch && deptMatch && roleMatch;
    }).sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  }, [employees, localConfig, searchTerm, departmentFilter, roleFilter]);

  // Stats for Diagnostics
  const stats = useMemo(() => {
    if (!employees || !localConfig) return { totalEmployees: 0, withRole: 0, missingRole: 0 };
    
    const withRole = Object.keys(localConfig.user_assignments || {}).length;
    // Count employees with email who don't have a role assignment
    const missingRole = employees.filter(e => e.email && !localConfig.user_assignments?.[e.email.toLowerCase()]).length;
    
    return {
      totalEmployees: employees.length,
      withRole,
      missingRole
    };
  }, [employees, localConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const configString = JSON.stringify(localConfig);
      
      // Robust Save Logic: Check both key and config_key AND cleanup duplicates
      // 1. Try to find existing config with high limit
      let allConfigs = await base44.entities.AppConfig.list(null, 1000);
      let matches = allConfigs.filter(c => c.config_key === 'roles_config' || c.key === 'roles_config');

      // 2. If not found in list, try specific filter
      if (matches.length === 0) {
          try {
             const f1 = await base44.entities.AppConfig.filter({ config_key: 'roles_config' });
             const f2 = await base44.entities.AppConfig.filter({ key: 'roles_config' });
             matches = [...(f1 || []), ...(f2 || [])];
             // Deduplicate by ID
             matches = matches.filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);
          } catch(e) {
             console.warn("Filter failed during save check", e);
          }
      }
      
      if (matches.length > 0) {
        // Use the first one as target
        const targetId = matches[0].id;
        
        // Delete duplicates if any
        if (matches.length > 1) {
          console.warn(`Found ${matches.length} duplicate roles_config entries. Cleaning up...`);
          const deletePromises = matches.slice(1).map(m => base44.entities.AppConfig.delete(m.id));
          await Promise.all(deletePromises);
        }
        
        // Update target
        console.log(`Updating AppConfig ${targetId} with size: ${configString.length} chars`);
        await base44.entities.AppConfig.update(targetId, { 
          config_key: 'roles_config',
          key: 'roles_config', // Asegurar compatibilidad
          value: configString 
        });
      } else {
        console.log(`Creating new AppConfig with size: ${configString.length} chars`);
        await base44.entities.AppConfig.create({ 
          config_key: 'roles_config', 
          key: 'roles_config', // Asegurar compatibilidad
          value: configString 
        });
      }

      // Small delay to allow backend propagation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Invalidar query globalmente para asegurar que DataProvider se entere
      await queryClient.invalidateQueries({ queryKey: ['rolesConfig'] });
      
      // Intentar refrescar vía contexto si está disponible
      if (refetchRolesConfig) {
        await refetchRolesConfig();
      }
      
      setIsDirty(false);
      toast.success("Configuración guardada y aplicada correctamente");
    } catch (error) {
      console.error("Error saving roles config:", error);
      toast.error("Error al guardar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("¿Estás seguro de descartar los cambios no guardados?")) {
      setLocalConfig(JSON.parse(JSON.stringify(rolesConfig || DEFAULT_ROLES_CONFIG)));
      setIsDirty(false);
      toast.info("Cambios descartados");
    }
  };

  const handleUserAssignment = (email, roleId) => {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();
    
    setLocalConfig(prev => {
      const newAssignments = { ...prev.user_assignments };
      if (roleId === "none") {
        delete newAssignments[cleanEmail];
      } else {
        newAssignments[cleanEmail] = roleId;
      }
      return { ...prev, user_assignments: newAssignments };
    });
    setIsDirty(true);
  };

  const handlePermissionChange = (roleId, permKey, checked) => {
    setLocalConfig(prev => {
      const role = prev.roles[roleId];
      return {
        ...prev,
        roles: {
          ...prev.roles,
          [roleId]: {
            ...role,
            permissions: {
              ...role.permissions,
              [permKey]: checked
            }
          }
        }
      };
    });
    setIsDirty(true);
  };

  const handlePagePermissionChange = (roleId, path, checked) => {
    setLocalConfig(prev => {
      const role = prev.roles[roleId];
      return {
        ...prev,
        roles: {
          ...prev.roles,
          [roleId]: {
            ...role,
            page_permissions: {
              ...(role.page_permissions || {}),
              [path]: checked
            }
          }
        }
      };
    });
    setIsDirty(true);
  };

  const handleAddRole = () => {
    if (!newRoleName || !newRoleId) return;
    
    // Clean ID
    const cleanId = newRoleId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    if (localConfig.roles[cleanId]) {
      toast.error("El ID del rol ya existe");
      return;
    }

    setLocalConfig(prev => ({
      ...prev,
      roles: {
        ...prev.roles,
        [cleanId]: {
          name: newRoleName,
          permissions: { ...DEFAULT_ROLES_CONFIG.roles.user.permissions },
          isSystem: false
        }
      }
    }));
    
    setIsNewRoleOpen(false);
    setNewRoleName("");
    setNewRoleId("");
    setIsDirty(true);
    toast.success("Rol creado provisionalmente. Recuerda guardar.");
  };

  const handleDeleteRole = (roleId) => {
    if (localConfig.roles[roleId]?.isSystem) {
      toast.error("No se pueden eliminar roles del sistema");
      return;
    }

    if (window.confirm(`¿Estás seguro de eliminar el rol "${localConfig.roles[roleId].name}"?`)) {
      setLocalConfig(prev => {
        const newRoles = { ...prev.roles };
        delete newRoles[roleId];
        return { ...prev, roles: newRoles };
      });
      setIsDirty(true);
    }
  };

  // Agrupar menú para visualización en pestaña Navegación
  const groupedMenu = useMemo(() => {
    return MENU_STRUCTURE.reduce((acc, item) => {
      const category = item.category || 'Otros';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {});
  }, []);

  if (!localConfig) return <div className="p-8 text-center">Cargando configuración...</div>;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb className="mb-2">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Inicio</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={createPageUrl("Configuration")}>Configuración</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Gestión de Usuarios y Accesos</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost" size="icon" className="text-slate-600">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Gestión de Usuarios y Accesos
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Configura roles, permisos y asignaciones de usuarios
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <Button variant="outline" onClick={handleReset} disabled={isSaving} className="text-amber-600 border-amber-200 hover:bg-amber-50">
              <RotateCcw className="w-4 h-4 mr-2" />
              Descartar Cambios
            </Button>
          )}
          <Button onClick={handleSave} disabled={!isDirty || isSaving} className={isDirty ? "bg-green-600 hover:bg-green-700" : ""}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Guardando..." : "Guardar Configuración"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Usuarios
          </TabsTrigger>
          <TabsTrigger value="matrix" className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> Roles
          </TabsTrigger>
          <TabsTrigger value="navigation" className="flex items-center gap-2">
            <Factory className="w-4 h-4" /> Navegación
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Diagnóstico
          </TabsTrigger>
        </TabsList>

        {/* --- PESTAÑA USUARIOS --- */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asignación de Roles a Usuarios</CardTitle>
              <CardDescription>
                Gestiona qué rol tiene cada empleado. Los empleados sin email no pueden acceder.
              </CardDescription>
              <div className="flex flex-col md:flex-row gap-4 mt-4 pt-4 border-t">
                <div className="flex-1 relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o email..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Dept.</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtro por Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Roles</SelectItem>
                    <SelectItem value="none">Sin Rol Asignado</SelectItem>
                    {roleKeys.map(key => (
                      <SelectItem key={key} value={key}>{localConfig.roles[key].name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(searchTerm || departmentFilter !== "all" || roleFilter !== "all") && (
                  <Button variant="ghost" size="icon" onClick={() => { setSearchTerm(""); setDepartmentFilter("all"); setRoleFilter("all"); }}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Email (ID de Acceso)</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Rol Asignado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                          No se encontraron empleados con los filtros actuales
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.map(emp => {
                        const email = emp.email ? emp.email.toLowerCase() : null;
                        const currentRole = email ? (localConfig.user_assignments?.[email] || "none") : "none";
                        
                        return (
                          <TableRow key={emp.id}>
                            <TableCell className="font-medium">{emp.nombre}</TableCell>
                            <TableCell>
                              {email ? (
                                <span className="font-mono text-xs">{email}</span>
                              ) : (
                                <span className="text-slate-400 italic text-xs">Sin email configurado</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-normal">{emp.departamento || "N/A"}</Badge>
                            </TableCell>
                            <TableCell>
                              <Select 
                                value={currentRole} 
                                onValueChange={(val) => handleUserAssignment(email, val)}
                                disabled={!email}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="Seleccionar rol" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none" className="text-slate-500 italic">-- Sin Acceso --</SelectItem>
                                  {roleKeys.map(key => (
                                    <SelectItem key={key} value={key}>
                                      {localConfig.roles[key].name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 text-xs text-slate-500 text-center">
                Mostrando {filteredEmployees.length} de {employees?.length || 0} empleados
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA ROLES (MATRIZ) --- */}
        <TabsContent value="matrix">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Matriz de Roles y Permisos</CardTitle>
                <CardDescription>Define qué puede hacer cada rol en la aplicación</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsNewRoleOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Nuevo Rol
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] bg-slate-50 dark:bg-slate-900 sticky left-0 z-10">Permiso</TableHead>
                    {roleKeys.map(roleId => (
                      <TableHead key={roleId} className="text-center min-w-[100px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-bold">{localConfig.roles[roleId].name}</span>
                          {!localConfig.roles[roleId].isSystem && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => handleDeleteRole(roleId)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(PERMISSION_LABELS).map(([permKey, label]) => (
                    <TableRow key={permKey}>
                      <TableCell className="font-medium bg-slate-50 dark:bg-slate-900 sticky left-0 z-10">
                        {label}
                      </TableCell>
                      {roleKeys.map(roleId => {
                        const role = localConfig.roles[roleId];
                        const isChecked = role.permissions[permKey];
                        const isLocked = roleId === 'admin' && permKey === 'isAdmin'; // Prevent locking admin out

                        return (
                          <TableCell key={`${roleId}-${permKey}`} className="text-center">
                            <Checkbox 
                              checked={isChecked}
                              disabled={isLocked}
                              onCheckedChange={(checked) => handlePermissionChange(roleId, permKey, checked)}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA NAVEGACIÓN --- */}
        <TabsContent value="navigation">
          <Card>
            <CardHeader>
              <CardTitle>Permisos de Navegación</CardTitle>
              <CardDescription>Controla a qué páginas puede acceder cada rol</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px] bg-slate-50 dark:bg-slate-900 sticky left-0 z-10">Página / Módulo</TableHead>
                    {roleKeys.map(roleId => (
                      <TableHead key={roleId} className="text-center min-w-[100px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-bold">{localConfig.roles[roleId].name}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedMenu).map(([category, items]) => (
                    <React.Fragment key={category}>
                      <TableRow className="bg-slate-100 dark:bg-slate-800">
                        <TableCell colSpan={roleKeys.length + 1} className="font-bold py-2">
                          {category}
                        </TableCell>
                      </TableRow>
                      {items.map(item => (
                        <TableRow key={item.path}>
                          <TableCell className="pl-6 bg-slate-50 dark:bg-slate-900 sticky left-0 z-10 border-r">
                            <div className="flex items-center gap-2">
                              <span>{item.name}</span>
                            </div>
                            <p className="text-xs text-slate-400 font-normal ml-6 truncate max-w-[200px]">{item.path}</p>
                          </TableCell>
                          {roleKeys.map(roleId => {
                            const role = localConfig.roles[roleId];
                            
                            // Lógica de visualización del estado actual
                            let effectiveValue;
                            if (role.page_permissions === undefined) {
                                // Default legacy behavior
                                if (roleId === 'admin') effectiveValue = true;
                                else if (item.category === 'Configuración') effectiveValue = false;
                                else effectiveValue = true;
                            } else {
                                effectiveValue = !!role.page_permissions[item.path];
                            }
                            
                            const isLocked = roleId === 'admin';

                            return (
                              <TableCell key={`${roleId}-${item.path}`} className="text-center">
                                <Checkbox 
                                  checked={effectiveValue}
                                  disabled={isLocked}
                                  onCheckedChange={(checked) => handlePagePermissionChange(roleId, item.path, checked)}
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA DIAGNÓSTICO --- */}
        <TabsContent value="diagnostics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-500" /> Resumen de Seguridad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between p-3 bg-slate-50 rounded">
                  <span>Roles Definidos</span>
                  <span className="font-bold">{roleKeys.length}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded">
                  <span>Usuarios con Acceso</span>
                  <span className="font-bold text-green-600">{stats.withRole}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded">
                  <span>Usuarios Pendientes</span>
                  <span className={`font-bold ${stats.missingRole > 0 ? "text-amber-600" : "text-slate-600"}`}>
                    {stats.missingRole}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className={`border-l-4 ${stats.missingRole > 0 ? "border-l-amber-500" : "border-l-green-500"}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> Acción Requerida
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.missingRole > 0 ? (
                  <div className="space-y-3">
                    <p className="text-amber-700">
                      Hay <strong>{stats.missingRole} empleados</strong> con email que no tienen rol asignado. 
                      No podrán acceder a ninguna función.
                    </p>
                    <Button size="sm" onClick={() => { setActiveTab("users"); setRoleFilter("none"); }} variant="secondary">
                      Ir a asignar roles pendientes
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4 text-green-600">
                    <CheckCircle className="w-10 h-10 mb-2" />
                    <p>Todos los usuarios tienen acceso configurado.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog para Nuevo Rol */}
      <Dialog open={isNewRoleOpen} onOpenChange={setIsNewRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Rol</DialogTitle>
            <DialogDescription>
              Define un nombre y un identificador único para el nuevo rol.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Nombre del Rol</Label>
              <Input 
                id="roleName" 
                value={newRoleName} 
                onChange={(e) => setNewRoleName(e.target.value)} 
                placeholder="Ej. Supervisor de Planta"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleId">ID del Rol</Label>
              <Input 
                id="roleId" 
                value={newRoleId} 
                onChange={(e) => setNewRoleId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} 
                placeholder="Ej. plant_supervisor"
              />
              <p className="text-xs text-slate-500">Solo minúsculas y guiones bajos</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewRoleOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddRole} disabled={!newRoleName || !newRoleId}>Crear Rol</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
