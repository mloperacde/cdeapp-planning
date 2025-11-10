import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Shield, Plus, Edit, Trash2, UserCog } from "lucide-react";

const ROLES_PRESETS = {
  Admin: {
    ver_dashboard: true,
    ver_empleados: true,
    editar_empleados: true,
    eliminar_empleados: true,
    ver_maquinas: true,
    editar_maquinas: true,
    ver_planificacion: true,
    editar_planificacion: true,
    ver_mantenimiento: true,
    editar_mantenimiento: true,
    ver_ausencias: true,
    editar_ausencias: true,
    ver_reportes: true,
    exportar_reportes: true,
    configurar_sistema: true,
    gestionar_usuarios: true,
  },
  Supervisor: {
    ver_dashboard: true,
    ver_empleados: true,
    editar_empleados: true,
    eliminar_empleados: false,
    ver_maquinas: true,
    editar_maquinas: true,
    ver_planificacion: true,
    editar_planificacion: true,
    ver_mantenimiento: true,
    editar_mantenimiento: true,
    ver_ausencias: true,
    editar_ausencias: true,
    ver_reportes: true,
    exportar_reportes: true,
    configurar_sistema: false,
    gestionar_usuarios: false,
  },
  Técnico: {
    ver_dashboard: true,
    ver_empleados: true,
    editar_empleados: false,
    eliminar_empleados: false,
    ver_maquinas: true,
    editar_maquinas: false,
    ver_planificacion: true,
    editar_planificacion: false,
    ver_mantenimiento: true,
    editar_mantenimiento: true,
    ver_ausencias: true,
    editar_ausencias: false,
    ver_reportes: true,
    exportar_reportes: false,
    configurar_sistema: false,
    gestionar_usuarios: false,
  },
  Operario: {
    ver_dashboard: true,
    ver_empleados: false,
    editar_empleados: false,
    eliminar_empleados: false,
    ver_maquinas: true,
    editar_maquinas: false,
    ver_planificacion: true,
    editar_planificacion: false,
    ver_mantenimiento: false,
    editar_mantenimiento: false,
    ver_ausencias: false,
    editar_ausencias: false,
    ver_reportes: false,
    exportar_reportes: false,
    configurar_sistema: false,
    gestionar_usuarios: false,
  },
};

export default function UserManagementPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    employee_id: "",
    role: "Operario",
    telefono_movil: "",
    permisos: ROLES_PRESETS.Operario,
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingUser?.id) {
        return base44.entities.User.update(editingUser.id, data);
      }
      return base44.entities.User.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.User.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleRoleChange = (role) => {
    setFormData({
      ...formData,
      role,
      permisos: ROLES_PRESETS[role],
    });
  };

  const handlePermissionChange = (permission, value) => {
    setFormData({
      ...formData,
      permisos: {
        ...formData.permisos,
        [permission]: value,
      },
    });
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData(user);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({
      employee_id: "",
      role: "Operario",
      telefono_movil: "",
      permisos: ROLES_PRESETS.Operario,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      deleteMutation.mutate(id);
    }
  };

  const getEmployeeName = (employeeId) => {
    return employees.find(e => e.id === employeeId)?.nombre || "Sin vincular";
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "Admin": return "bg-red-100 text-red-800";
      case "Supervisor": return "bg-blue-100 text-blue-800";
      case "Técnico": return "bg-green-100 text-green-800";
      case "Operario": return "bg-slate-100 text-slate-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              Gestión de Usuarios y Permisos
            </h1>
            <p className="text-slate-600 mt-1">
              Administra usuarios, roles y permisos del sistema
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Usuario
          </Button>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Usuarios del Sistema ({users.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">Cargando usuarios...</div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No hay usuarios registrados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Empleado</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Teléfono Móvil</TableHead>
                      <TableHead>Último Acceso</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-slate-50">
                        <TableCell>
                          <span className="font-semibold text-slate-900">
                            {getEmployeeName(user.employee_id)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.telefono_movil || "-"}</TableCell>
                        <TableCell>
                          {user.ultimo_acceso 
                            ? new Date(user.ultimo_acceso).toLocaleDateString('es-ES')
                            : "Nunca"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(user.id)}
                              className="hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Dialog open={true} onOpenChange={handleClose}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_id">Empleado Vinculado</Label>
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rol del Usuario *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={handleRoleChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Supervisor">Supervisor</SelectItem>
                      <SelectItem value="Técnico">Técnico</SelectItem>
                      <SelectItem value="Operario">Operario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono Móvil</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    value={formData.telefono_movil || ""}
                    onChange={(e) => setFormData({ ...formData, telefono_movil: e.target.value })}
                    placeholder="+34 600 000 000"
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-blue-600" />
                  Permisos del Usuario
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(formData.permisos || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={value}
                        onCheckedChange={(checked) => handlePermissionChange(key, checked)}
                      />
                      <label htmlFor={key} className="text-sm cursor-pointer">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}