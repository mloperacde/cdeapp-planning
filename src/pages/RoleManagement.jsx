import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Shield, Users, Copy, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import PermissionsEditor from "../components/roles/PermissionsEditor";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const EMPTY_ARRAY = [];

const DEFAULT_PERMISSIONS = {
  dashboard: { view: false, view_all_teams: false },
  employees: { view: false, create: false, edit: false, delete: false, view_sensitive: false, export: false },
  absences: { view: false, create: false, edit: false, delete: false, approve: false, view_all: false },
  planning: { view: false, edit: false, create: false, confirm: false },
  machines: { view: false, create: false, edit: false, delete: false, configure_processes: false },
  maintenance: { view: false, create: false, edit: false, complete: false },
  reports: { view: false, export: false, advanced: false },
  configuration: { view: false, edit_general: false, manage_roles: false, manage_users: false, manage_teams: false },
  hrm: { view: false, manage_contracts: false, manage_onboarding: false, manage_performance: false },
  incentives: { view: false, configure: false, evaluate: false },
  documents: { view: false, upload: false, manage: false }
};

export default function RoleManagementPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    level: 0,
    active: true,
    permissions: DEFAULT_PERMISSIONS
  });

  const queryClient = useQueryClient();

  const { data: roles = EMPTY_ARRAY, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const allRoles = await base44.entities.Role.list('-level');
      // Deduplicate by code, keep the newest
      const uniqueMap = new Map();
      for (const role of allRoles) {
        const existing = uniqueMap.get(role.code);
        if (!existing || new Date(role.created_date) > new Date(existing.created_date)) {
          uniqueMap.set(role.code, role);
        }
      }
      return Array.from(uniqueMap.values());
    },
  });

  const { data: userRoles = EMPTY_ARRAY } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingRole?.id) {
        return await base44.entities.Role.update(editingRole.id, data);
      } else {
        return await base44.entities.Role.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      handleClose();
      toast.success(editingRole ? "Rol actualizado" : "Rol creado");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Role.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success("Rol eliminado");
    },
  });

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      code: role.code,
      description: role.description || "",
      level: role.level || 0,
      active: role.active ?? true,
      permissions: role.permissions || DEFAULT_PERMISSIONS
    });
    setShowDialog(true);
  };

  const handleDelete = (id, role) => {
    if (role.is_system_role) {
      toast.error("No se pueden eliminar roles del sistema");
      return;
    }
    
    const usersWithRole = userRoles.filter(ur => ur.role_id === id && ur.active);
    if (usersWithRole.length > 0) {
      toast.error(`No se puede eliminar: ${usersWithRole.length} usuario(s) tienen este rol asignado`);
      return;
    }

    if (window.confirm('¿Eliminar este rol? Esta acción no se puede deshacer.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDuplicate = (role) => {
    setEditingRole(null);
    setFormData({
      name: `${role.name} (Copia)`,
      code: `${role.code}_copy`,
      description: role.description || "",
      level: role.level || 0,
      active: true,
      permissions: role.permissions || DEFAULT_PERMISSIONS
    });
    setShowDialog(true);
  };

  const handleClose = () => {
    setShowDialog(false);
    setEditingRole(null);
    setFormData({
      name: "",
      code: "",
      description: "",
      level: 0,
      active: true,
      permissions: DEFAULT_PERMISSIONS
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const getUserCount = (roleId) => {
    return userRoles.filter(ur => ur.role_id === roleId && ur.active).length;
  };

  const getPermissionCount = (permissions) => {
    let count = 0;
    Object.values(permissions || {}).forEach(module => {
      count += Object.values(module).filter(Boolean).length;
    });
    return count;
  };

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                Gestión de Roles y Permisos
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Configura roles personalizados y asigna permisos específicos
              </p>
            </div>
            <Button type="button" onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Rol
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500">Cargando roles...</div>
          ) : roles.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Shield className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>No hay roles configurados</p>
              <Button type="button" onClick={() => setShowDialog(true)} variant="link" className="mt-2">
                Crear el primer rol
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rol</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Permisos</TableHead>
                  <TableHead>Usuarios</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {role.name}
                          {role.is_system_role && (
                            <Badge variant="outline" className="text-xs">
                              Sistema
                            </Badge>
                          )}
                        </div>
                        {role.description && (
                          <div className="text-xs text-slate-500 mt-1">{role.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {role.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-purple-100 text-purple-800">
                        Nivel {role.level || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getPermissionCount(role.permissions)} permisos
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{getUserCount(role.id)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {role.active ? (
                        <Badge className="bg-green-100 text-green-800">Activo</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-800">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicate(role)}
                          title="Duplicar rol"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(role)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {!role.is_system_role && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(role.id, role)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showDialog && (
        <Dialog open={true} onOpenChange={handleClose}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {editingRole ? 'Editar Rol' : 'Nuevo Rol'}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
              <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Información General</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nombre del Rol *</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="ej: Supervisor de Producción"
                          required
 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Código *</Label>
                        <Input
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                          placeholder="ej: SUPERVISOR_PROD"
                          required
 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                        placeholder="Describe las responsabilidades de este rol..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nivel Jerárquico</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.level}
                          onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-slate-500">Mayor nivel = más privilegios</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <div className="flex items-center space-x-2 pt-2">
                          <Checkbox
                            id="active"
                            checked={formData.active}
                            onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                          />
                          <label htmlFor="active" className="text-sm">Rol activo</label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Permisos del Rol
                    </CardTitle>
                    <p className="text-xs text-slate-500">
                      Selecciona los permisos que tendrá este rol
                    </p>
                  </CardHeader>
                  <CardContent>
                    <PermissionsEditor
                      permissions={formData.permissions}
                      onChange={(perms) => setFormData({ ...formData, permissions: perms })}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? "Guardando..." : "Guardar Rol"}
                  </Button>
                </div>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}