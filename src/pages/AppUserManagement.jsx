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
import { Shield, Users, Save, Plus, Trash2, AlertCircle, RotateCcw, Factory, Search, X, Lock, CheckCircle, ArrowLeft, UserCog, Eye, Key } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MENU_STRUCTURE } from '@/config/menuConfig';
import { useRolesManager } from '@/hooks/useRolesManager';
import { ROLE_PERMISSIONS } from '@/components/permissions/usePermissions';
import { toast } from "sonner";

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
    updatePagePermission, // Usado en la pestaña de navegación (opcional si se mantiene)
    setRoleMode, // Usado para bloqueos masivos
    updateUserAssignment,
    addRole,
    deleteRole,
    saveConfig,
    resetConfig,
    restoreDefaults,
  } = useRolesManager();
  
  // Estados UI
  const [isNewRoleOpen, setIsNewRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  
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
          addRole(newRoleName, newRoleId);
          setIsNewRoleOpen(false);
          setNewRoleName("");
          setNewRoleId("");
          toast.success("Rol creado provisionalmente. Recuerda guardar.");
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
      return <div className="p-8 text-red-500 font-bold">ERROR CRÍTICO: No se pudo cargar la configuración local.</div>;
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
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Usuarios y Accesos
          </TabsTrigger>
          <TabsTrigger value="matrix" className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> Definición de Roles
          </TabsTrigger>
          <TabsTrigger value="navigation" className="flex items-center gap-2">
            <Factory className="w-4 h-4" /> Páginas
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] bg-slate-50 dark:bg-slate-900 sticky left-0 z-10">Permiso</TableHead>
                    {roleKeys.map(roleId => (
                      <TableHead key={roleId} className="text-center min-w-[100px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-bold">{localConfig.roles[roleId].name}</span>
                          {!localConfig.roles[roleId].isSystem && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-red-400 hover:text-red-600"
                              onClick={() => handleDeleteRoleWrapper(roleId)}
                            >
                              <Trash2 className="w-3 h-3" />
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
                      <TableCell className="font-medium bg-slate-50 dark:bg-slate-900 sticky left-0 z-10 border-r">
                        {label}
                        <p className="text-xs text-slate-400 font-normal">{permKey}</p>
                      </TableCell>
                      {roleKeys.map(roleId => {
                        const isChecked = localConfig.roles[roleId].permissions[permKey];
                        const isLocked = roleId === 'admin'; 
                        
                        return (
                          <TableCell key={`${roleId}-${permKey}`} className="text-center">
                            <Checkbox 
                              checked={isLocked ? true : isChecked}
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
      </Tabs>

      {/* --- INSPECTOR SHEET (Unified Detail View) --- */}
      <Sheet open={isInspectorOpen} onOpenChange={setIsInspectorOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader>
                <SheetTitle>Inspector de Usuario</SheetTitle>
                <SheetDescription>
                    Detalle de permisos y accesos efectivos para {selectedUser?.nombre || "Usuario"}
                </SheetDescription>
            </SheetHeader>
            
            {selectedUser && (
                <div className="mt-6 space-y-6">
                    {/* 1. Identity */}
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
                            {(selectedUser.nombre || "U").charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{selectedUser.nombre || "Sin Nombre"}</h3>
                            <p className="text-sm text-slate-500">{selectedUser.email || "No Email"}</p>
                            <Badge variant="outline" className="mt-1">{selectedUser.departamento || "Sin Dept."}</Badge>
                        </div>
                    </div>

                    {/* 2. Role Assignment */}
                    <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2">
                            <Key className="w-4 h-4" /> Asignación de Roles
                        </h4>
                        <div className="grid gap-4 p-4 border rounded-lg">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-slate-500">Rol en App (Configurable)</Label>
                                    <Select 
                                        value={selectedUser.email ? (localConfig.user_assignments?.[selectedUser.email.toLowerCase()] || "none") : "none"} 
                                        onValueChange={(val) => updateUserAssignment(selectedUser.email, val)}
                                        disabled={!selectedUser.email}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                                <SelectItem value="none">-- Sin Rol --</SelectItem>
                                                {roleKeys.map(k => (
                                                    <SelectItem key={k} value={k}>
                                                        <span>{localConfig.roles[k].name}</span>
                                                        <span className="ml-2 text-slate-400 text-xs font-mono">({k})</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Rol Base44 (Nativo)</Label>
                                    <div className="h-10 flex items-center px-3 border rounded bg-slate-50 text-slate-500 text-sm italic">
                                        No visible (Privado)
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        *Los permisos nativos pueden sobrescribir la configuración de la App.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Effective Permissions Simulation */}
                    <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2">
                            <Shield className="w-4 h-4" /> Permisos Efectivos (Simulación)
                        </h4>
                        <div className="bg-slate-50 p-4 rounded-lg border text-sm space-y-2">
                            {(() => {
                                const roleId = selectedUser.email ? (localConfig.user_assignments?.[selectedUser.email.toLowerCase()] || "none") : "none";
                                const perms = calculateEffectivePermissions(roleId, localConfig);
                                
                                return (
                                    <div className="grid grid-cols-1 gap-2">
                                        {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                                            <div key={key} className="flex items-center justify-between">
                                                <span>{label}</span>
                                                {perms[key] ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <X className="w-4 h-4 text-slate-300" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* 4. Page Access */}
                    <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2">
                            <Factory className="w-4 h-4" /> Páginas Accesibles
                        </h4>
                         <ScrollArea className="h-[200px] border rounded-lg p-2 bg-slate-50">
                            {(() => {
                                const roleId = selectedUser.email ? (localConfig.user_assignments?.[selectedUser.email.toLowerCase()] || "none") : "none";
                                const pages = getAccessiblePages(roleId, localConfig);
                                
                                if (pages.length === 0) return <p className="text-slate-400 text-sm text-center py-4">Sin acceso a páginas</p>;
                                
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
                <DialogDescription>Define un identificador único y un nombre visible.</DialogDescription>
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
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewRoleOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateRole}>Crear Rol</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}