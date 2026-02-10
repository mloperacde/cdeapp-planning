import React, { useState, useMemo } from "react";
import { useAppData } from "@/components/data/DataProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Shield, Users, Save, Plus, Trash2, AlertCircle, RotateCcw, Factory, Search, X, Lock, CheckCircle, ArrowLeft, UserCog, Eye, Key, Copy, GitBranch, Database } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MENU_STRUCTURE } from '@/config/menuConfig';
import { useRolesManager } from '@/components/hooks/useRolesManager';
import { ROLE_PERMISSIONS } from '@/components/permissions/usePermissions';
import { toast } from "sonner";

// Definición de permisos y sus etiquetas legibles - ORGANIZADOS POR CATEGORÍAS
const PERMISSION_CATEGORIES = {
  system: {
    label: "Sistema y Administración",
    permissions: {
      isAdmin: "Administrador Total (Full Access)",
      canConfigureSystem: "Configurar Sistema",
      canManageUsers: "Gestionar Usuarios y Roles",
      canViewAuditLogs: "Ver Registros de Auditoría",
      canModifySecuritySettings: "Modificar Configuración de Seguridad",
      canAccessBackendFunctions: "Acceder a Funciones Backend"
    }
  },
  hr: {
    label: "Recursos Humanos",
    permissions: {
      canViewPersonalData: "Ver Datos Personales",
      canEditPersonalData: "Editar Datos Personales",
      canViewSalary: "Ver Información Salarial",
      canEditSalary: "Editar Información Salarial",
      canViewBankingData: "Ver Datos Bancarios",
      canEditBankingData: "Editar Datos Bancarios",
      canEditEmployees: "Editar Perfiles de Empleados",
      canViewSensitiveDocuments: "Ver Documentos Confidenciales",
      canManageContracts: "Gestionar Contratos",
      canViewPerformanceReviews: "Ver Evaluaciones de Desempeño",
      canEditPerformanceReviews: "Editar Evaluaciones de Desempeño",
      canManageTraining: "Gestionar Formación y Capacitación"
    }
  },
  absences: {
    label: "Ausencias y Asistencia",
    permissions: {
      canViewOwnAbsences: "Ver Ausencias Propias",
      canCreateOwnAbsences: "Crear Ausencias Propias",
      canViewAllAbsences: "Ver Todas las Ausencias",
      canApproveAbsences: "Aprobar/Rechazar Ausencias",
      canDeleteAbsences: "Eliminar Ausencias",
      canViewAttendance: "Ver Registros de Asistencia",
      canManageVacationBalance: "Gestionar Saldos de Vacaciones",
      canOverrideAbsenceRules: "Sobrepasar Reglas de Ausencias"
    }
  },
  production: {
    label: "Producción y Planificación",
    permissions: {
      canViewPlanning: "Ver Planificación",
      canEditPlanning: "Editar Planificación",
      canScheduleProduction: "Programar Órdenes de Producción",
      canModifyProductionOrders: "Modificar Órdenes Activas",
      canViewProductionCosts: "Ver Costos de Producción",
      canAccessShiftPlanning: "Acceder a Planificación de Turnos",
      canAssignOperators: "Asignar Operadores a Máquinas"
    }
  },
  machines: {
    label: "Máquinas y Mantenimiento",
    permissions: {
      canViewMachines: "Ver Información de Máquinas",
      canManageMachines: "Gestionar Configuración de Máquinas",
      canViewMachineCosts: "Ver Costos de Máquinas",
      canScheduleMaintenance: "Programar Mantenimiento",
      canApproveMaintenance: "Aprobar Mantenimiento",
      canViewMaintenanceHistory: "Ver Historial de Mantenimiento",
      canEditMaintenanceRecords: "Editar Registros de Mantenimiento",
      canAccessMachineDiagnostics: "Acceder a Diagnósticos de Máquinas"
    }
  },
  quality: {
    label: "Calidad y Control",
    permissions: {
      canViewQualityData: "Ver Datos de Calidad",
      canRecordQualityInspections: "Registrar Inspecciones de Calidad",
      canApproveQualityReports: "Aprobar Informes de Calidad",
      canAccessNonConformities: "Acceder a No Conformidades"
    }
  },
  warehouse: {
    label: "Almacén e Inventario",
    permissions: {
      canViewInventory: "Ver Inventario",
      canManageInventory: "Gestionar Inventario",
      canViewInventoryCosts: "Ver Costos de Inventario",
      canApproveOrders: "Aprobar Pedidos",
      canReceiveGoods: "Recepcionar Mercancía",
      canShipGoods: "Despachar Mercancía"
    }
  },
  reports: {
    label: "Informes y Análisis",
    permissions: {
      canViewReports: "Ver Informes Básicos",
      canViewAdvancedReports: "Ver Informes Avanzados",
      canViewFinancialReports: "Ver Informes Financieros",
      canAccessAnalytics: "Acceder a Analytics y KPIs",
      canExportData: "Exportar Datos",
      canAccessRealTimeData: "Acceder a Datos en Tiempo Real"
    }
  }
};

// Función helper para obtener todos los permisos en formato plano
const getAllPermissions = () => {
  const allPerms = {};
  Object.values(PERMISSION_CATEGORIES).forEach(category => {
    Object.assign(allPerms, category.permissions);
  });
  return allPerms;
};

// Legacy compatibility
const PERMISSION_LABELS = getAllPermissions();

// Helper para calcular permisos efectivos (Simulación)
const calculateEffectivePermissions = (roleId, rolesConfig) => {
    let permissions = { ...ROLE_PERMISSIONS.user }; // Default safe

    // 1. Configuración dinámica
    if (rolesConfig?.roles?.[roleId]) {
        permissions = { ...rolesConfig.roles[roleId].permissions };
    }
    // 2. Configuración estática fallback
    else if (ROLE_PERMISSIONS[roleId]) {
        permissions = { ...ROLE_PERMISSIONS[roleId] };
    }

    return permissions;
};

// Helper para obtener páginas accesibles
const getAccessiblePages = (roleId, rolesConfig) => {
    const roleConfig = rolesConfig?.roles?.[roleId];
    if (!roleConfig) return [];
    
    // Si es admin, todo
    if (roleConfig.permissions?.isAdmin) return MENU_STRUCTURE.map(i => i.path);

    // Si es strict
    if (roleConfig.is_strict) {
        return Object.keys(roleConfig.page_permissions || {}).filter(k => roleConfig.page_permissions[k]);
    }

    // Legacy fallback (should not happen in strict mode)
    return ["/Dashboard"];
};

export default function AppUserManagement() {
  const { employees } = useAppData();
  
  const {
    localConfig,
    isDirty,
    isSaving,
    isLoading,
    updatePermission,
    updatePagePermission,
    updateFieldPermission, // NEW
    updateParentRole, // NEW
    setRoleMode,
    updateUserAssignment,
    addRole,
    cloneRole, // NEW
    deleteRole,
    saveConfig,
    resetConfig,
    restoreDefaults,
  } = useRolesManager();
  
  // Estados UI
  const [isNewRoleOpen, setIsNewRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [parentRoleForNew, setParentRoleForNew] = useState(null);
  
  // Estados para clonar
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [roleToClone, setRoleToClone] = useState(null);
  const [cloneName, setCloneName] = useState("");
  const [cloneId, setCloneId] = useState("");
  
  // Estados para field permissions
  const [isFieldPermissionsOpen, setIsFieldPermissionsOpen] = useState(false);
  const [selectedRoleForFields, setSelectedRoleForFields] = useState(null);
  
  // Inspector de Usuario
  const [selectedUser, setSelectedUser] = useState(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("users");

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
      // Robust name retrieval
      const empName = emp.nombre || emp.name || emp.Name || "";
      const empEmail = emp.email || "";

      // Search term filter
      const searchMatch = !searchTerm || 
        (empName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (empEmail.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Department filter
      const deptMatch = departmentFilter === "all" || emp.departamento === departmentFilter;
      
      // Role filter
      const userRole = empEmail ? (localConfig.user_assignments?.[empEmail.toLowerCase()] || "none") : "none";
      const roleMatch = roleFilter === "all" || 
                       (roleFilter === "none" && (!userRole || userRole === "none")) ||
                       userRole === roleFilter;

      return searchMatch && deptMatch && roleMatch;
    }).sort((a, b) => {
        const nameA = a.nombre || a.name || a.Name || "";
        const nameB = b.nombre || b.name || b.Name || "";
        return nameA.localeCompare(nameB);
    });
  }, [employees, localConfig, searchTerm, departmentFilter, roleFilter]);

  const handleInspectUser = (user) => {
      setSelectedUser(user);
      setIsInspectorOpen(true);
  };

  const handleCreateRole = () => {
      try {
          addRole(newRoleName, newRoleId, parentRoleForNew);
          setIsNewRoleOpen(false);
          setNewRoleName("");
          setNewRoleId("");
          setParentRoleForNew(null);
          toast.success("Rol creado provisionalmente. Recuerda guardar.");
      } catch (e) {
          toast.error(e.message);
      }
  };

  const handleCloneRole = () => {
      try {
          cloneRole(roleToClone, cloneName, cloneId);
          setIsCloneDialogOpen(false);
          setRoleToClone(null);
          setCloneName("");
          setCloneId("");
          toast.success("Rol clonado exitosamente. Recuerda guardar.");
      } catch (e) {
          toast.error(e.message);
      }
  };

  const handleDeleteRoleWrapper = (roleId) => {
      if (window.confirm("¿Seguro que quieres eliminar este rol?")) {
        try {
            deleteRole(roleId);
        } catch (e) {
            toast.error(e.message);
        }
      }
  };

  if (isLoading) {
    return (
        <div className="p-8 flex justify-center items-center h-full">
            <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Cargando configuración de roles...</p>
            </div>
        </div>
    );
  }

  if (!localConfig) {
      // Silenciosamente usar defaults si no hay config
      return null;
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-24">
      {/* --- Header & Breadcrumb --- */}
      <div className="flex flex-col space-y-4">
        <Breadcrumb>
            <BreadcrumbList>
            <BreadcrumbItem>
                <BreadcrumbLink asChild>
                <Link to="/">Inicio</Link>
                </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
                <BreadcrumbLink asChild>
                <Link to={createPageUrl("Configuration")}>Configuración</Link>
                </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
                <BreadcrumbPage>Gestión Unificada de Usuarios</BreadcrumbPage>
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
                Gestión Unificada de Usuarios
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                Administración centralizada de accesos, roles y permisos
                </p>
            </div>
            </div>
            <div className="flex items-center gap-2">
            <Button variant="outline" onClick={restoreDefaults} disabled={isSaving} className="text-slate-600 border-slate-200 hover:bg-slate-50">
                <RotateCcw className="w-4 h-4 mr-2" />
                Restaurar Defaults
            </Button>
            {isDirty && (
                <Button variant="outline" onClick={resetConfig} disabled={isSaving} className="text-amber-600 border-amber-200 hover:bg-amber-50">
                <RotateCcw className="w-4 h-4 mr-2" />
                Descartar Cambios
                </Button>
            )}
            <Button onClick={saveConfig} disabled={!isDirty || isSaving} className={isDirty ? "bg-green-600 hover:bg-green-700" : ""}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>
            </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-[900px]">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Usuarios
          </TabsTrigger>
          <TabsTrigger value="matrix" className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> Roles
          </TabsTrigger>
          <TabsTrigger value="navigation" className="flex items-center gap-2">
            <Factory className="w-4 h-4" /> Páginas
          </TabsTrigger>
          <TabsTrigger value="fields" className="flex items-center gap-2">
            <Database className="w-4 h-4" /> Campos
          </TabsTrigger>
          <TabsTrigger value="hierarchy" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" /> Herencia
          </TabsTrigger>
        </TabsList>

        {/* --- PESTAÑA USUARIOS (Unified View) --- */}
        <TabsContent value="users" className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-4">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                    <CardTitle>Directorio de Usuarios</CardTitle>
                    <CardDescription>
                        Asigna roles y verifica permisos efectivos.
                    </CardDescription>
                </div>
                {/* Filters */}
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar..."
                            className="pl-8 w-[200px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Todos los Roles" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los Roles</SelectItem>
                            <SelectItem value="none">Sin Rol</SelectItem>
                            {roleKeys.map(k => (
                                <SelectItem key={k} value={k}>{localConfig.roles[k].name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     {(searchTerm || roleFilter !== "all") && (
                        <Button variant="ghost" size="icon" onClick={() => {setSearchTerm(""); setRoleFilter("all");}}>
                            <X className="w-4 h-4"/>
                        </Button>
                    )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Empleado</TableHead>
                    <TableHead>Email / ID</TableHead>
                    <TableHead>Rol Asignado</TableHead>
                    <TableHead>Estado Efectivo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                            No se encontraron empleados.
                        </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map(emp => {
                        const email = emp.email ? emp.email.toLowerCase() : null;
                        const assignedRoleId = email ? (localConfig.user_assignments?.[email] || "none") : "none";
                        const assignedRoleName = assignedRoleId !== "none" ? localConfig.roles[assignedRoleId]?.name : "Sin Acceso";
                        const displayName = emp.nombre || emp.name || emp.Name || emp.full_name || "Sin Nombre";
                        
                        // Heuristic status check
                        const hasAccess = assignedRoleId !== "none";
                        const isSystemAdmin = assignedRoleId === 'admin';

                        return (
                          <TableRow key={emp.id} className="hover:bg-slate-50/50">
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${hasAccess ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                                        {displayName.charAt(0)}
                                    </div>
                                    <div>
                                        <div>{displayName}</div>
                                        <div className="text-xs text-slate-500">{emp.departamento || "N/A"}</div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                {email ? (
                                    <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{email}</code>
                                ) : (
                                    <span className="text-slate-400 italic text-xs">Sin email</span>
                                )}
                            </TableCell>
                            <TableCell>
                                <Select 
                                    value={assignedRoleId} 
                                    onValueChange={(val) => updateUserAssignment(email, val)}
                                    disabled={!email}
                                >
                                    <SelectTrigger className="w-[180px] h-8">
                                        <SelectValue />
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
                            <TableCell>
                                {isSystemAdmin ? (
                                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200">Admin Total</Badge>
                                ) : hasAccess ? (
                                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Activo</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-slate-400">Inactivo</Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => handleInspectUser(emp)} disabled={!email}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Detalles
                                </Button>
                            </TableCell>
                          </TableRow>
                        );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="bg-slate-50/50 border-t py-2 text-xs text-slate-500 flex justify-between">
                <span>Total Empleados: {employees?.length || 0}</span>
                <span>Mostrando: {filteredEmployees.length}</span>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA ROLES (Legacy Matrix) --- */}
        <TabsContent value="matrix">
            <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Definición de Roles y Permisos</CardTitle>
                <CardDescription>Configura las capacidades funcionales de cada rol.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsNewRoleOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Nuevo Rol
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <ScrollArea className="h-[700px]">
              <div className="space-y-6">
                {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => (
                  <div key={categoryKey} className="border rounded-lg p-4 bg-white">
                    <h3 className="font-bold text-lg mb-4 text-slate-700 flex items-center gap-2 pb-2 border-b">
                      <Shield className="w-5 h-5 text-blue-600" />
                      {category.label}
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[280px] bg-slate-50 dark:bg-slate-900 sticky left-0 z-10">Permiso</TableHead>
                          {roleKeys.map(roleId => (
                            <TableHead key={roleId} className="text-center min-w-[100px]">
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-bold text-xs">{localConfig.roles[roleId].name}</span>
                                {categoryKey === 'system' && !localConfig.roles[roleId].isSystem && (
                                  <div className="flex gap-1 mt-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5 text-blue-400 hover:text-blue-600"
                                      onClick={() => {
                                        setRoleToClone(roleId);
                                        setCloneName(localConfig.roles[roleId].name + " (Copia)");
                                        setCloneId(roleId + "_copy");
                                        setIsCloneDialogOpen(true);
                                      }}
                                      title="Clonar rol"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5 text-red-400 hover:text-red-600"
                                      onClick={() => handleDeleteRoleWrapper(roleId)}
                                      title="Eliminar rol"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(category.permissions).map(([permKey, label]) => (
                          <TableRow key={permKey}>
                            <TableCell className="font-medium bg-slate-50 dark:bg-slate-900 sticky left-0 z-10 border-r">
                              <div className="flex flex-col">
                                <span className="text-sm">{label}</span>
                                <code className="text-[10px] text-slate-400 font-mono">{permKey}</code>
                              </div>
                            </TableCell>
                            {roleKeys.map(roleId => {
                              const isChecked = localConfig.roles[roleId].permissions[permKey];
                              const isLocked = roleId === 'admin' && permKey === 'isAdmin';

                              return (
                                <TableCell key={`${roleId}-${permKey}`} className="text-center">
                                  <Checkbox 
                                    checked={isLocked ? true : (isChecked || false)}
                                    disabled={isLocked}
                                    onCheckedChange={(checked) => updatePermission(roleId, permKey, checked)}
                                  />
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA NAVEGACIÓN --- */}
        <TabsContent value="navigation">
           <Card>
            <CardHeader>
              <CardTitle>Control de Acceso a Páginas</CardTitle>
              <CardDescription>
                Define qué rutas son visibles para cada rol. 
                <span className="ml-2 text-amber-600 font-medium">Política "Deny by Default": Solo se permite lo marcado explícitamente.</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
               <ScrollArea className="h-[600px] pr-4">
                 {/* Reutilizando la lógica de renderizado de pestañas anterior pero simplificada */}
                  <div className="space-y-8">
                    {Object.entries(
                        MENU_STRUCTURE.reduce((acc, item) => {
                            const cat = item.category || 'General';
                            if (!acc[cat]) acc[cat] = [];
                            acc[cat].push(item);
                            return acc;
                        }, {})
                    ).map(([category, items]) => (
                        <div key={category} className="space-y-3">
                            <h3 className="font-semibold text-lg text-slate-800 border-b pb-1 flex items-center gap-2">
                                {category === 'Configuración' ? <UserCog className="w-5 h-5" /> : <Factory className="w-5 h-5" />}
                                {category}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {items.map(menuItem => (
                                    <div key={menuItem.path} className="border rounded-lg p-3 bg-white shadow-sm">
                                        <div className="font-medium mb-2 flex items-center gap-2">
                                            <span className="text-sm">{menuItem.title}</span>
                                            <code className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded">{menuItem.path}</code>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {roleKeys.map(roleId => {
                                                if (roleId === 'admin') return null; // Admin always has access
                                                const role = localConfig.roles[roleId];
                                                // Check exact path or sub-paths
                                                const hasAccess = role.page_permissions?.[menuItem.path] === true;
                                                
                                                return (
                                                    <Badge 
                                                        key={roleId}
                                                        variant={hasAccess ? "default" : "outline"}
                                                        className={`cursor-pointer select-none text-[10px] ${hasAccess ? 'bg-blue-600 hover:bg-blue-700' : 'text-slate-400 hover:border-slate-400'}`}
                                                        onClick={() => updatePagePermission(roleId, menuItem.path, !hasAccess)}
                                                    >
                                                        {role.name}
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                  </div>
               </ScrollArea>
            </CardContent>
           </Card>
        </TabsContent>

        {/* --- PESTAÑA CAMPOS (Field Level Permissions) --- */}
        <TabsContent value="fields">
          <Card>
            <CardHeader>
              <CardTitle>Permisos a Nivel de Campo</CardTitle>
              <CardDescription>
                Define permisos granulares de lectura/escritura para campos específicos de entidades.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select value={selectedRoleForFields || ""} onValueChange={setSelectedRoleForFields}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Selecciona un rol..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roleKeys.map(key => (
                      <SelectItem key={key} value={key}>
                        {localConfig.roles[key].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedRoleForFields && (
                  <div className="border rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold">Configuración de Campos - {localConfig.roles[selectedRoleForFields].name}</h3>
                    
                    {/* Ejemplo: EmployeeMasterDatabase */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-slate-600">EmployeeMasterDatabase</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {['salario_anual', 'iban', 'dni', 'nuss', 'fecha_nacimiento'].map(field => {
                          const fieldPerms = localConfig.roles[selectedRoleForFields].field_permissions?.EmployeeMasterDatabase?.[field] || {};
                          
                          return (
                            <div key={field} className="border rounded p-3 space-y-2">
                              <div className="font-medium text-sm">{field}</div>
                              <div className="flex gap-4 text-xs">
                                <label className="flex items-center gap-2">
                                  <Checkbox
                                    checked={fieldPerms.read || false}
                                    onCheckedChange={(checked) => 
                                      updateFieldPermission(selectedRoleForFields, 'EmployeeMasterDatabase', field, 'read', checked)
                                    }
                                  />
                                  Lectura
                                </label>
                                <label className="flex items-center gap-2">
                                  <Checkbox
                                    checked={fieldPerms.write || false}
                                    onCheckedChange={(checked) => 
                                      updateFieldPermission(selectedRoleForFields, 'EmployeeMasterDatabase', field, 'write', checked)
                                    }
                                  />
                                  Escritura
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Ejemplo: MachineMasterDatabase */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-slate-600">MachineMasterDatabase</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {['codigo_maquina', 'estado_operativo', 'ultimo_mantenimiento'].map(field => {
                          const fieldPerms = localConfig.roles[selectedRoleForFields].field_permissions?.MachineMasterDatabase?.[field] || {};
                          
                          return (
                            <div key={field} className="border rounded p-3 space-y-2">
                              <div className="font-medium text-sm">{field}</div>
                              <div className="flex gap-4 text-xs">
                                <label className="flex items-center gap-2">
                                  <Checkbox
                                    checked={fieldPerms.read || false}
                                    onCheckedChange={(checked) => 
                                      updateFieldPermission(selectedRoleForFields, 'MachineMasterDatabase', field, 'read', checked)
                                    }
                                  />
                                  Lectura
                                </label>
                                <label className="flex items-center gap-2">
                                  <Checkbox
                                    checked={fieldPerms.write || false}
                                    onCheckedChange={(checked) => 
                                      updateFieldPermission(selectedRoleForFields, 'MachineMasterDatabase', field, 'write', checked)
                                    }
                                  />
                                  Escritura
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 bg-blue-50 p-3 rounded border border-blue-200">
                      <strong>Nota:</strong> Los permisos de campo complementan los permisos generales. 
                      Si el rol no tiene acceso general a la entidad, estos permisos no tendrán efecto.
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA HERENCIA (Role Hierarchy) --- */}
        <TabsContent value="hierarchy">
          <Card>
            <CardHeader>
              <CardTitle>Jerarquía y Herencia de Roles</CardTitle>
              <CardDescription>
                Define relaciones padre-hijo entre roles. Los roles hijos heredan automáticamente los permisos del padre.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Visual Hierarchy Tree */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Árbol de Herencia</h3>
                  <div className="border rounded-lg p-4 bg-slate-50">
                    {roleKeys.filter(k => !localConfig.roles[k].parent_role).map(rootRole => (
                      <div key={rootRole} className="space-y-2">
                        <div className="flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm">
                          <Shield className="w-5 h-5 text-blue-600" />
                          <div className="flex-1">
                            <div className="font-bold">{localConfig.roles[rootRole].name}</div>
                            <div className="text-xs text-slate-500">{rootRole}</div>
                          </div>
                          {localConfig.roles[rootRole].isSystem && (
                            <Badge variant="secondary" className="text-xs">Sistema</Badge>
                          )}
                        </div>
                        
                        {/* Children */}
                        <div className="ml-8 space-y-2">
                          {roleKeys.filter(k => localConfig.roles[k].parent_role === rootRole).map(childRole => (
                            <div key={childRole} className="flex items-center gap-3 p-3 bg-white border border-blue-200 rounded-lg">
                              <div className="text-blue-400">└─</div>
                              <GitBranch className="w-4 h-4 text-blue-500" />
                              <div className="flex-1">
                                <div className="font-medium">{localConfig.roles[childRole].name}</div>
                                <div className="text-xs text-slate-500">{childRole}</div>
                              </div>
                              <Select 
                                value={localConfig.roles[childRole].parent_role || "none"}
                                onValueChange={(val) => updateParentRole(childRole, val === "none" ? null : val)}
                              >
                                <SelectTrigger className="w-[200px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Sin padre</SelectItem>
                                  {roleKeys.filter(k => k !== childRole).map(k => (
                                    <SelectItem key={k} value={k}>{localConfig.roles[k].name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {/* Orphan roles (no parent set) */}
                    {roleKeys.filter(k => !localConfig.roles[k].parent_role && !localConfig.roles[k].isSystem).length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        No hay roles personalizados sin padre
                      </div>
                    )}
                  </div>
                </div>

                {/* Config table */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Configuración de Herencia</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rol</TableHead>
                        <TableHead>Rol Padre</TableHead>
                        <TableHead>Permisos Heredados</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roleKeys.map(roleId => {
                        const role = localConfig.roles[roleId];
                        const parentRole = role.parent_role ? localConfig.roles[role.parent_role] : null;
                        const inheritedCount = parentRole ? Object.values(parentRole.permissions).filter(Boolean).length : 0;
                        
                        return (
                          <TableRow key={roleId}>
                            <TableCell className="font-medium">{role.name}</TableCell>
                            <TableCell>
                              {role.isSystem ? (
                                <Badge variant="secondary">Rol del Sistema</Badge>
                              ) : (
                                <Select 
                                  value={role.parent_role || "none"}
                                  onValueChange={(val) => updateParentRole(roleId, val === "none" ? null : val)}
                                >
                                  <SelectTrigger className="w-[200px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">-- Sin Padre --</SelectItem>
                                    {roleKeys.filter(k => k !== roleId && !localConfig.roles[k].isSystem).map(k => (
                                      <SelectItem key={k} value={k}>{localConfig.roles[k].name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                            <TableCell>
                              {parentRole ? (
                                <Badge variant="outline" className="text-green-600 border-green-200">
                                  {inheritedCount} permisos heredados
                                </Badge>
                              ) : (
                                <span className="text-slate-400 text-sm">Sin herencia</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="text-xs text-slate-500 bg-amber-50 p-3 rounded border border-amber-200">
                  <strong>Importante:</strong> Los roles hijos heredan TODOS los permisos del padre automáticamente.
                  Puedes sobrescribir permisos específicos en el rol hijo. No se permiten ciclos de herencia.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* --- INSPECTOR SHEET (Unified Detail View) --- */}
      <Sheet open={isInspectorOpen} onOpenChange={setIsInspectorOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader>
                <SheetTitle>Inspector de Usuario</SheetTitle>
                <SheetDescription>
                    Detalles de acceso y permisos efectivos.
                </SheetDescription>
            </SheetHeader>

            {selectedUser && (
                <div className="py-6 space-y-6">
                    {/* 1. User Info */}
                    <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border">
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold">
                             {(selectedUser.nombre || selectedUser.name || "U").charAt(0)}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <h3 className="font-bold text-lg truncate">{selectedUser.nombre || selectedUser.name || "Sin Nombre"}</h3>
                            <p className="text-sm text-slate-500 truncate">{selectedUser.email}</p>
                            <p className="text-xs text-slate-400 mt-1">{selectedUser.departamento || "Sin Departamento"}</p>
                        </div>
                    </div>

                    {/* 2. Role Resolution Diagnostics */}
                    <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2">
                            <Search className="w-4 h-4" /> Diagnóstico de Resolución de Rol
                        </h4>
                        <div className="bg-slate-50 p-4 rounded-lg border text-sm space-y-3">
                             {(() => {
                                 const email = selectedUser.email?.toLowerCase();
                                 const assignedId = localConfig.user_assignments?.[email];
                                 const nativeRole = selectedUser.role; // Rol que viene de Base44
                                 
                                 // Lógica de resolución (replicando usePermissions)
                                 let resolvedId = "user";
                                 let resolutionSource = "Default";
                                 let configFound = false;

                                 if (assignedId) {
                                     resolvedId = assignedId;
                                     resolutionSource = "Asignación Manual (App)";
                                 } else if (nativeRole) {
                                         const roleLower = String(nativeRole).replace(/\s+/g, ' ').trim().toLowerCase();
                                         
                                         // 1. Buscar por ID
                                         let foundKey = Object.keys(localConfig.roles).find(k => k.toLowerCase() === roleLower);
                                         
                                         // 2. Buscar por Nombre
                                         if (!foundKey) {
                                             foundKey = Object.keys(localConfig.roles).find(k => 
                                                 localConfig.roles[k].name?.replace(/\s+/g, ' ').trim().toLowerCase() === roleLower
                                             );
                                         }

                                         if (foundKey) {
                                             resolvedId = foundKey;
                                             resolutionSource = `Mapeado desde Base44 ("${nativeRole}")`;
                                         } else {
                                             resolvedId = nativeRole; // Fallback, probablemente no tendrá config
                                             resolutionSource = "Nativo Base44 (Sin coincidencia en App)";
                                         }
                                     }

                                     configFound = !!localConfig.roles[resolvedId];
                                     
                                     // Auto-generate safe ID for missing role
                                     const suggestedId = nativeRole ? nativeRole.toString().toLowerCase().trim().replace(/[^a-z0-9_]/g, '_') : "";

                                 return (
                                     <div className="grid gap-2">
                                         <div className="grid grid-cols-2 gap-1 border-b pb-2">
                                             <span className="text-slate-500">Rol Nativo (Base44):</span>
                                             <span className="font-mono font-medium">{nativeRole || "N/A"}</span>
                                         </div>
                                         <div className="grid grid-cols-2 gap-1 border-b pb-2">
                                             <span className="text-slate-500">Asignación Manual:</span>
                                             <span className="font-mono font-medium">
                                                 {assignedId ? (
                                                     <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">{assignedId}</Badge>
                                                 ) : (
                                                     <span className="text-slate-400 italic">Ninguna</span>
                                                 )}
                                             </span>
                                         </div>
                                         <div className="grid grid-cols-2 gap-1 pt-1 bg-blue-50/50 p-2 rounded border border-blue-100">
                                             <span className="text-blue-700 font-semibold">Rol Efectivo:</span>
                                             <span className="font-bold text-blue-800">{resolvedId}</span>
                                             
                                             <span className="text-xs text-blue-500">Fuente:</span>
                                             <span className="text-xs text-blue-600">{resolutionSource}</span>
                                             
                                             <span className="text-xs text-blue-500">Configuración:</span>
                                             <span className="text-xs">
                                                 {configFound ? (
                                                     <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Encontrada</span>
                                                 ) : (
                                                     <span className="text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> No encontrada (Bloqueo Total)</span>
                                                 )}
                                             </span>
                                         </div>
                                         
                                         {/* QUICK FIX ACTION */}
                                         {!configFound && nativeRole && !assignedId && (
                                             <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
                                                 <p className="font-bold text-amber-700 mb-2 flex items-center gap-2">
                                                     <AlertCircle className="w-4 h-4"/> Acción Requerida
                                                 </p>
                                                 <p className="text-amber-800 mb-3">
                                                     El rol nativo <strong>"{nativeRole}"</strong> no existe en la App. El usuario no podrá acceder a nada.
                                                 </p>
                                                 <div className="flex gap-2">
                                                     <Button 
                                                         size="sm" 
                                                         variant="default"
                                                         className="bg-amber-600 hover:bg-amber-700 text-white w-full"
                                                         onClick={() => {
                                                             setNewRoleName(nativeRole);
                                                             setNewRoleId(suggestedId);
                                                             setIsNewRoleOpen(true);
                                                         }}
                                                     >
                                                         <Plus className="w-4 h-4 mr-2"/>
                                                         Crear Configuración para "{nativeRole}"
                                                     </Button>
                                                 </div>
                                             </div>
                                         )}
                                     </div>
                                 );
                             })()}
                        </div>
                    </div>

                    {/* 3. Effective Permissions Simulation - Organizado por Categorías */}
                    <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2">
                            <Shield className="w-4 h-4" /> Permisos Efectivos (Simulación)
                        </h4>
                        <ScrollArea className="h-[500px]">
                        <div className="bg-slate-50 p-4 rounded-lg border text-sm space-y-4">
                            {(() => {
                                // Recalcular ID efectivo para usar en permisos
                                const email = selectedUser.email?.toLowerCase();
                                const assignedId = localConfig.user_assignments?.[email];
                                const nativeRole = selectedUser.role;
                                
                                let effectiveRoleId = "user";
                                if (assignedId) effectiveRoleId = assignedId;
                                else if (nativeRole) {
                                    const roleLower = String(nativeRole).replace(/\s+/g, ' ').trim().toLowerCase();
                                    let foundKey = Object.keys(localConfig.roles).find(k => k.toLowerCase() === roleLower);
                                    if (!foundKey) {
                                        foundKey = Object.keys(localConfig.roles).find(k => 
                                            localConfig.roles[k].name?.replace(/\s+/g, ' ').trim().toLowerCase() === roleLower
                                        );
                                    }
                                    if (foundKey) effectiveRoleId = foundKey;
                                }

                                const perms = calculateEffectivePermissions(effectiveRoleId, localConfig);
                                
                                return (
                                    <div className="space-y-4">
                                        {Object.entries(PERMISSION_CATEGORIES).map(([catKey, category]) => {
                                            const categoryPerms = Object.entries(category.permissions);
                                            const enabledCount = categoryPerms.filter(([key]) => perms[key]).length;
                                            
                                            return (
                                                <div key={catKey} className="border rounded-lg p-3 bg-white">
                                                    <div className="flex items-center justify-between mb-2 pb-2 border-b">
                                                        <h5 className="font-semibold text-xs text-slate-700">{category.label}</h5>
                                                        <Badge variant="outline" className={enabledCount > 0 ? "text-green-600 border-green-200" : "text-slate-400"}>
                                                            {enabledCount}/{categoryPerms.length}
                                                        </Badge>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-1.5">
                                                        {categoryPerms.map(([key, label]) => (
                                                            <div key={key} className="flex items-center justify-between text-xs">
                                                                <span className="truncate">{label}</span>
                                                                {perms[key] ? (
                                                                    <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 ml-2" />
                                                                ) : (
                                                                    <X className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 ml-2" />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                        </ScrollArea>
                    </div>

                    {/* 4. Page Access */}
                    <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2">
                            <Factory className="w-4 h-4" /> Páginas Accesibles
                        </h4>
                        <ScrollArea className="h-[200px] border rounded-lg p-2 bg-slate-50">
                            {(() => {
                                // Recalcular ID efectivo (mismo código, idealmente refactorizar en función helper si fuera posible)
                                const email = selectedUser.email?.toLowerCase();
                                const assignedId = localConfig.user_assignments?.[email];
                                const nativeRole = selectedUser.role;
                                
                                let effectiveRoleId = "user";
                                if (assignedId) effectiveRoleId = assignedId;
                                else if (nativeRole) {
                                    const roleLower = String(nativeRole).replace(/\s+/g, ' ').trim().toLowerCase();
                                    let foundKey = Object.keys(localConfig.roles).find(k => k.toLowerCase() === roleLower);
                                    if (!foundKey) {
                                        foundKey = Object.keys(localConfig.roles).find(k => 
                                            localConfig.roles[k].name?.replace(/\s+/g, ' ').trim().toLowerCase() === roleLower
                                        );
                                    }
                                    if (foundKey) effectiveRoleId = foundKey;
                                }

                                const pages = getAccessiblePages(effectiveRoleId, localConfig);
                                
                                if (pages.length === 0) return <p className="text-slate-400 text-sm text-center py-4">Sin acceso a páginas configuradas</p>;
                                
                                return (
                                    <div className="flex flex-wrap gap-2">
                                        {pages.map(p => (
                                            <Badge key={p} variant="secondary" className="font-mono text-xs">
                                                {p}
                                            </Badge>
                                        ))}
                                    </div>
                                );
                            })()}
                        </ScrollArea>
                    </div>

                </div>
            )}
            <SheetFooter className="mt-8">
                <Button onClick={() => setIsInspectorOpen(false)}>Cerrar Inspector</Button>
            </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* --- DIALOGS --- */}
      <Dialog open={isNewRoleOpen} onOpenChange={setIsNewRoleOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Crear Nuevo Rol</DialogTitle>
                <DialogDescription>Define un identificador único, nombre visible y opcionalmente un rol padre.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Nombre del Rol</Label>
                    <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Ej. Auditor Externo" />
                </div>
                <div className="space-y-2">
                    <Label>Identificador (ID)</Label>
                    <Input value={newRoleId} onChange={(e) => setNewRoleId(e.target.value)} placeholder="Ej. external_auditor" />
                    <p className="text-xs text-slate-500">Solo letras minúsculas y guiones bajos.</p>
                </div>
                <div className="space-y-2">
                    <Label>Rol Padre (Herencia)</Label>
                    <Select value={parentRoleForNew || "none"} onValueChange={(val) => setParentRoleForNew(val === "none" ? null : val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin herencia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Sin Herencia --</SelectItem>
                        {roleKeys.map(key => (
                          <SelectItem key={key} value={key}>{localConfig.roles[key].name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      Si seleccionas un padre, el nuevo rol heredará todos sus permisos automáticamente.
                    </p>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewRoleOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateRole}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Rol
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- CLONE DIALOG --- */}
      <Dialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Clonar Rol</DialogTitle>
                <DialogDescription>
                  Crea una copia exacta del rol "{roleToClone ? localConfig.roles[roleToClone]?.name : ''}" con un nuevo nombre.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Nombre del Nuevo Rol</Label>
                    <Input value={cloneName} onChange={(e) => setCloneName(e.target.value)} placeholder="Ej. Auditor Junior" />
                </div>
                <div className="space-y-2">
                    <Label>Identificador (ID)</Label>
                    <Input value={cloneId} onChange={(e) => setCloneId(e.target.value)} placeholder="Ej. auditor_junior" />
                    <p className="text-xs text-slate-500">Solo letras minúsculas y guiones bajos.</p>
                </div>
                <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm">
                  <strong>Se clonarán:</strong> Todos los permisos, configuración de páginas y campos. 
                  La herencia NO se clona automáticamente.
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsCloneDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCloneRole}>
                  <Copy className="w-4 h-4 mr-2" />
                  Clonar Rol
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}