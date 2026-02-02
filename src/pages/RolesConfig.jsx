import React, { useState } from "react";
import { useAppData } from "@/components/data/DataProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Shield, Users, Save, Plus, Trash2, RotateCcw, Factory } from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { MENU_STRUCTURE } from '@/config/menuConfig';
import { useRolesManager } from '@/hooks/useRolesManager';

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

export default function RolesConfig() {
  const { employees } = useAppData();
  
  // Use centralized hook for all logic
  const {
    localConfig,
    isDirty,
    isSaving,
    isLoading,
    updatePermission,
    updatePagePermission,
    addRole,
    deleteRole,
    saveConfig,
    resetConfig
  } = useRolesManager();
  
  // UI State
  const [isNewRoleOpen, setIsNewRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleId, setNewRoleId] = useState("");

  // Derived data for filters (safe access)
  const departments = employees ? [...new Set(employees.map(e => e.departamento).filter(Boolean))].sort() : [];
  const positions = employees ? [...new Set(employees.map(e => e.puesto).filter(Boolean))].sort() : [];

  // Agrupar menú para visualización
  const groupedMenu = MENU_STRUCTURE.reduce((acc, item) => {
    const category = item.category || 'Otros';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  const handleAddRoleWrapper = () => {
    if (!newRoleName || !newRoleId) return;
    try {
        addRole(newRoleName, newRoleId);
        setIsNewRoleOpen(false);
        setNewRoleName("");
        setNewRoleId("");
        toast.success("Rol creado provisionalmente. Recuerda guardar.");
    } catch (error) {
        toast.error(error.message);
    }
  };

  const handleDeleteRoleWrapper = (roleId) => {
    const role = localConfig.roles[roleId];
    if (confirm(`¿Estás seguro de eliminar el rol "${role.name}"? Los usuarios asignados perderán sus permisos.`)) {
      try {
        deleteRole(roleId);
      } catch (error) {
        toast.error(error.message);
      }
    }
  };

  const handleResetWrapper = () => {
    if (confirm("¿Restablecer a la configuración guardada? Perderás los cambios no guardados.")) {
      resetConfig();
    }
  };

  if (isLoading || !localConfig) return <div className="p-8 text-center">Cargando configuración...</div>;

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
                <Button variant="outline" onClick={handleResetWrapper} disabled={isSaving}>
                    <RotateCcw className="w-4 h-4 mr-2" /> Deshacer
                </Button>
            )}
            <Button onClick={saveConfig} disabled={!isDirty || isSaving} className={isDirty ? "bg-green-600 hover:bg-green-700" : ""}>
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

        <TabsContent value="navigation">
          <Card>
            <CardHeader>
              <CardTitle>Permisos de Navegación</CardTitle>
              <CardDescription>Controla a qué páginas puede acceder cada rol</CardDescription>
              {/* Controles de Acción Masiva */}
              <div className="flex gap-2 mt-2 p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                <span className="text-sm text-slate-500 self-center mr-2">Acciones Rápidas:</span>
                {roleKeys.map(roleId => {
                    const isLocked = roleId === 'admin';
                    if (isLocked) return null;
                    return (
                        <div key={roleId} className="flex flex-col gap-1 items-center min-w-[100px]">
                             <span className="text-xs font-bold truncate max-w-[100px]">{localConfig.roles[roleId].name}</span>
                             <div className="flex gap-1">
                                 <Button 
                                    variant="outline" 
                                    size="xs" 
                                    className="h-6 text-[10px]"
                                    title="Permitir Todo"
                                    onClick={() => {
                                        if (confirm(`¿Permitir acceso a TODAS las páginas para ${localConfig.roles[roleId].name}?`)) {
                                            MENU_STRUCTURE.forEach(item => {
                                                if (item.category !== 'Configuración') {
                                                    updatePagePermission(roleId, item.path, true);
                                                }
                                            });
                                        }
                                    }}
                                 >
                                    Todo
                                 </Button>
                                 <Button 
                                    variant="outline" 
                                    size="xs" 
                                    className="h-6 text-[10px] text-red-600 hover:text-red-700"
                                    title="Bloquear Todo"
                                    onClick={() => {
                                        if (confirm(`¿BLOQUEAR acceso a TODAS las páginas para ${localConfig.roles[roleId].name}?`)) {
                                            MENU_STRUCTURE.forEach(item => {
                                                updatePagePermission(roleId, item.path, false);
                                            });
                                        }
                                    }}
                                 >
                                    Nada
                                 </Button>
                             </div>
                        </div>
                    )
                })}
              </div>
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
                            
                            // Visualización explícita para el usuario
                            const isConfigured = role.page_permissions !== undefined;
                            const isLegacyMode = !isConfigured;

                            return (
                              <TableCell key={`${roleId}-${item.path}`} className="text-center relative">
                                <div className="flex justify-center items-center gap-2">
                                    <Checkbox 
                                      checked={effectiveValue}
                                      disabled={isLocked}
                                      onCheckedChange={(checked) => updatePagePermission(roleId, item.path, checked)}
                                      className={cn(
                                        isLegacyMode && !isLocked && "opacity-50 data-[state=checked]:bg-slate-400"
                                      )}
                                    />
                                    {/* Etiqueta explícita para claridad */}
                                    {!isLocked && (
                                        <span className={cn(
                                            "text-[10px] font-mono px-1 rounded",
                                            effectiveValue 
                                                ? "text-green-600 bg-green-50 border border-green-100" 
                                                : "text-red-600 bg-red-50 border border-red-100"
                                        )}>
                                            {effectiveValue ? "SÍ" : "NO"}
                                        </span>
                                    )}
                                </div>
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
            <div className="text-center py-8 text-slate-500">
                La asignación de usuarios se ha movido a la página de "Usuarios y Accesos"
            </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isNewRoleOpen} onOpenChange={setIsNewRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Rol</DialogTitle>
            <DialogDescription>Define un nuevo rol con permisos personalizados.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="roleName" className="text-right">Nombre</Label>
              <Input id="roleName" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} className="col-span-3" placeholder="Ej. Supervisor de Logística" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="roleId" className="text-right">ID Único</Label>
              <Input id="roleId" value={newRoleId} onChange={(e) => setNewRoleId(e.target.value)} className="col-span-3" placeholder="Ej. logistics_supervisor" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewRoleOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddRoleWrapper}>Crear Rol</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
