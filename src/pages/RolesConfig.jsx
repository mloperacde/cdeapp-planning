import React, { useState, useEffect } from "react";
import { useAppData } from "@/components/data/DataProvider";
import { base44 } from "@/api/base44Client";
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
import { Shield, Users, Save, Plus, Trash2, AlertTriangle, RotateCcw, Factory, Search, Filter, X } from "lucide-react";
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

export default function RolesConfig() {
  const { rolesConfig, refetchRolesConfig, employees, isLoading } = useAppData();
  const [localConfig, setLocalConfig] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for new role dialog
  const [isNewRoleOpen, setIsNewRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleId, setNewRoleId] = useState("");

  // Filters state
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  // Derived data for filters
  const departments = [...new Set(employees.map(e => e.departamento).filter(Boolean))].sort();
  const positions = [...new Set(employees.map(e => e.puesto).filter(Boolean))].sort();

  // Load config on mount or when data changes
  useEffect(() => {
    if (rolesConfig) {
      setLocalConfig(rolesConfig);
    } else if (!isLoading) {
      // Initialize with default if no config exists
      setLocalConfig(DEFAULT_ROLES_CONFIG);
    }
  }, [rolesConfig, isLoading]);

  const handlePermissionChange = (roleId, permissionKey, checked) => {
    setLocalConfig(prev => ({
      ...prev,
      roles: {
        ...prev.roles,
        [roleId]: {
          ...prev.roles[roleId],
          permissions: {
            ...prev.roles[roleId].permissions,
            [permissionKey]: checked
          }
        }
      }
    }));
    setIsDirty(true);
  };

  const handlePagePermissionChange = (roleId, path, checked) => {
    setLocalConfig(prev => {
      const role = prev.roles[roleId];
      const currentPagePermissions = role.page_permissions || {};
      
      return {
        ...prev,
        roles: {
          ...prev.roles,
          [roleId]: {
            ...role,
            page_permissions: {
              ...currentPagePermissions,
              [path]: checked
            }
          }
        }
      };
    });
    setIsDirty(true);
  };

  // Agrupar menú para visualización
  const groupedMenu = MENU_STRUCTURE.reduce((acc, item) => {
    const category = item.category || 'Otros';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

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
          permissions: { ...DEFAULT_ROLES_CONFIG.roles.user.permissions }, // Start with user permissions
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
    const role = localConfig.roles[roleId];
    if (role.isSystem) {
      toast.error("No se pueden eliminar roles de sistema");
      return;
    }

    if (confirm(`¿Estás seguro de eliminar el rol "${role.name}"? Los usuarios asignados perderán sus permisos.`)) {
      const newRoles = { ...localConfig.roles };
      delete newRoles[roleId];
      
      setLocalConfig(prev => ({
        ...prev,
        roles: newRoles
      }));
      setIsDirty(true);
    }
  };

  const handleUserAssignment = (email, roleId) => {
    setLocalConfig(prev => ({
      ...prev,
      user_assignments: {
        ...prev.user_assignments,
        [email]: roleId
      }
    }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const configString = JSON.stringify(localConfig);

      // Estrategia robusta: Buscar por key usando list para asegurar que encontramos la configuración correcta
      // findUnique suele requerir ID, y no queremos depender de que la key sea el ID
      const allConfigs = await base44.entities.AppConfig.list();
      const current = allConfigs.find(c => c.key === 'roles_config');
      
      if (current) {
        await base44.entities.AppConfig.update(current.id, { value: configString });
      } else {
        await base44.entities.AppConfig.create({ key: 'roles_config', value: configString });
      }

      await refetchRolesConfig();
      setIsDirty(false);
      toast.success("Configuración guardada correctamente");
    } catch (error) {
      console.error("Error saving roles config:", error);
      toast.error("Error al guardar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("¿Restablecer a la configuración guardada? Perderás los cambios no guardados.")) {
      setLocalConfig(rolesConfig || DEFAULT_ROLES_CONFIG);
      setIsDirty(false);
    }
  };

  if (!localConfig) return <div className="p-8 text-center">Cargando configuración...</div>;

  const roleKeys = Object.keys(localConfig.roles);
  const permissionKeys = Object.keys(PERMISSION_LABELS);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <Shield className="h-8 w-8 text-indigo-600" />
            Gestión de Roles y Permisos
          </h1>
          <p className="text-slate-500 mt-2">Configura los niveles de acceso y asigna roles a los usuarios</p>
        </div>
        <div className="flex gap-2">
            {isDirty && (
                <Button variant="outline" onClick={handleReset} disabled={isSaving}>
                    <RotateCcw className="w-4 h-4 mr-2" /> Deshacer
                </Button>
            )}
            <Button onClick={handleSave} disabled={!isDirty || isSaving} className={isDirty ? "bg-green-600 hover:bg-green-700" : ""}>
                <Save className="w-4 h-4 mr-2" /> 
                {isSaving ? "Guardando..." : (isDirty ? "Guardar Cambios" : "Guardado")}
            </Button>
        </div>
      </div>

      <Tabs defaultValue="matrix" className="space-y-4">
        <TabsList>
          <TabsTrigger value="matrix" className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> Matriz de Permisos
          </TabsTrigger>
          <TabsTrigger value="navigation" className="flex items-center gap-2">
            <Factory className="w-4 h-4" /> Navegación
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Asignación de Usuarios
          </TabsTrigger>
        </TabsList>

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
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-red-400 hover:text-red-600"
                              onClick={() => handleDeleteRole(roleId)}
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
                  {permissionKeys.map(permKey => (
                    <TableRow key={permKey}>
                      <TableCell className="font-medium bg-slate-50 dark:bg-slate-900 sticky left-0 z-10 border-r">
                        {PERMISSION_LABELS[permKey]}
                        <p className="text-xs text-slate-400 font-normal">{permKey}</p>
                      </TableCell>
                      {roleKeys.map(roleId => {
                        const isChecked = localConfig.roles[roleId].permissions[permKey];
                        // Admin role always has all permissions
                        const isLocked = roleId === 'admin'; 
                        
                        return (
                          <TableCell key={`${roleId}-${permKey}`} className="text-center">
                            <Checkbox 
                              checked={isLocked ? true : isChecked}
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
                            // Si page_permissions es undefined, mostramos el valor por defecto (Legacy)
                            let effectiveValue;
                            if (role.page_permissions === undefined) {
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

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Asignación de Roles a Usuarios</CardTitle>
                  <CardDescription>Asigna roles específicos a los empleados registrados</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                   <Badge variant="outline" className="h-8 px-3">
                     {employees.filter(e => e.email).length} con Email
                   </Badge>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-3 mt-4 pt-4 border-t">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Buscar por nombre o email..."
                    className="pl-9"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                  />
                  {userSearchTerm && (
                    <button 
                      onClick={() => setUserSearchTerm("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Filter className="w-3 h-3" />
                      <span className="truncate">{deptFilter === 'all' ? 'Departamento' : deptFilter}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Departamentos</SelectItem>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Filter className="w-3 h-3" />
                      <span className="truncate">{positionFilter === 'all' ? 'Puesto' : positionFilter}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Puestos</SelectItem>
                    {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Shield className="w-3 h-3" />
                      <span className="truncate">{roleFilter === 'all' ? 'Rol Asignado' : (localConfig?.roles[roleFilter]?.name || roleFilter)}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Roles</SelectItem>
                    <SelectItem value="unassigned">Sin Asignar (Usuario)</SelectItem>
                    {roleKeys.map(r => (
                        <SelectItem key={r} value={r}>{localConfig?.roles[r]?.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(deptFilter !== 'all' || positionFilter !== 'all' || roleFilter !== 'all' || userSearchTerm) && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                            setDeptFilter('all');
                            setPositionFilter('all');
                            setRoleFilter('all');
                            setUserSearchTerm('');
                        }}
                        title="Limpiar filtros"
                    >
                        <X className="w-4 h-4" />
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
                    <TableHead className="hidden md:table-cell">Detalles</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol Asignado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees
                    .filter(e => {
                        // Filter Logic
                        const matchesSearch = !userSearchTerm || 
                            e.nombre?.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                            e.apellidos?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                            e.email?.toLowerCase().includes(userSearchTerm.toLowerCase());
                        
                        const matchesDept = deptFilter === 'all' || e.departamento === deptFilter;
                        const matchesPos = positionFilter === 'all' || e.puesto === positionFilter;
                        
                        // Role filter logic
                        let matchesRole = true;
                        if (roleFilter !== 'all') {
                            const assigned = localConfig.user_assignments[e.email];
                            if (roleFilter === 'unassigned') {
                                matchesRole = !assigned;
                            } else {
                                matchesRole = assigned === roleFilter;
                            }
                        }

                        // Only show employees with email for assignment mostly, but user might want to see all to debug
                        // Let's show all but highlight missing emails
                        return matchesSearch && matchesDept && matchesPos && matchesRole;
                    })
                    .slice(0, 100) // Limit render for performance
                    .map(employee => {
                     // Determine current role: check assignment -> fallback to employee role -> fallback to user
                     const assignedRoleId = localConfig.user_assignments[employee.email];
                     // If no assignment, try to match employee.role (from legacy field) to our roles, else 'user'
                     const currentRole = assignedRoleId || (localConfig.roles[employee.role] ? employee.role : 'user');
                     const hasEmail = !!employee.email;

                     return (
                      <TableRow key={employee.id} className={!hasEmail ? "opacity-50 bg-slate-50" : ""}>
                        <TableCell className="font-medium">
                            <div>{employee.nombre} {employee.apellidos}</div>
                            {!hasEmail && <span className="text-[10px] text-red-500 font-bold">Sin Email</span>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            <div className="flex flex-col text-xs text-slate-500">
                                <span>{employee.departamento || '-'}</span>
                                <span>{employee.puesto || '-'}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">{employee.email || '-'}</TableCell>
                        <TableCell>
                          <Select 
                            value={currentRole} 
                            onValueChange={(val) => handleUserAssignment(employee.email, val)}
                            disabled={!hasEmail}
                          >
                            <SelectTrigger className="w-[200px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roleKeys.map(roleId => (
                                <SelectItem key={roleId} value={roleId}>
                                  {localConfig.roles[roleId].name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                     );
                  })}
                  {employees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                        No hay empleados cargados en el sistema.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                Mostrando primeros 100 resultados coincidentes. Usa los filtros para refinar.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isNewRoleOpen} onOpenChange={setIsNewRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Rol</DialogTitle>
            <DialogDescription>
              Define un nuevo rol para asignar permisos personalizados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre del Rol</Label>
              <Input 
                placeholder="Ej. Auditor Externo" 
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>ID del Rol (Sistema)</Label>
              <Input 
                placeholder="Ej. auditor_externo" 
                value={newRoleId}
                onChange={(e) => setNewRoleId(e.target.value)}
              />
              <p className="text-xs text-slate-500">Usado internamente. Solo letras minúsculas y guiones bajos.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewRoleOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddRole}>Crear Rol</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
