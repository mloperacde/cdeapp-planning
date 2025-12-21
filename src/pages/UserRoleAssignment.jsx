import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Shield, Trash2, Calendar, AlertCircle, Edit, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

const EMPTY_ARRAY = [];

export default function UserRoleAssignmentPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    role_id: "",
    expires_at: "",
    notes: "",
    active: true
  });
  const [filterRole, setFilterRole] = useState("all");

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employees = EMPTY_ARRAY } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
  });

  const { data: roles = EMPTY_ARRAY } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.filter({ active: true }, '-level'),
  });

  const { data: userRoles = EMPTY_ARRAY } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.list(),
  });

  const assignMutation = useMutation({
    mutationFn: async (data) => {
      // Deactivate existing roles
      const existingRoles = userRoles.filter(ur => 
        ur.user_email === selectedUser.email && ur.active
      );
      for (const role of existingRoles) {
        await base44.entities.UserRole.update(role.id, { active: false });
      }
      
      return await base44.entities.UserRole.create({
        ...data,
        user_email: selectedUser.email,
        assigned_by: currentUser?.email,
        assigned_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserRoles'] });
      handleClose();
      toast.success("Rol asignado. Los cambios se aplicarán inmediatamente.");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => base44.entities.UserRole.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserRoles'] });
      toast.success("Rol revocado. Los cambios se aplicarán inmediatamente.");
    },
  });

  const handleAssign = (employee) => {
    setSelectedUser(employee);
    setFormData({
      role_id: "",
      expires_at: "",
      notes: "",
      active: true
    });
    setShowDialog(true);
  };

  const handleChangeRole = (employee, currentRoleId) => {
    setSelectedUser(employee);
    setFormData({
      role_id: currentRoleId,
      expires_at: "",
      notes: "",
      active: true
    });
    setShowDialog(true);
  };

  const handleRevoke = (userRoleId) => {
    if (window.confirm('¿Revocar este rol? Se eliminarán todos los permisos asociados.')) {
      revokeMutation.mutate(userRoleId);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
    setSelectedUser(null);
    setFormData({
      role_id: "",
      expires_at: "",
      notes: "",
      active: true
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    assignMutation.mutate(formData);
  };

  const getUserRoles = (email) => {
    return userRoles.filter(ur => ur.user_email === email && ur.active);
  };

  const getRoleName = (roleId) => {
    return roles.find(r => r.id === roleId)?.name || "Rol desconocido";
  };

  const getEmployeesWithRoles = () => {
    return employees.map(emp => ({
      ...emp,
      assignedRoles: getUserRoles(emp.email)
    })).filter(emp => {
      if (filterRole === "all") return true;
      if (filterRole === "none") return emp.assignedRoles.length === 0;
      return emp.assignedRoles.some(ur => ur.role_id === filterRole);
    });
  };

  const filteredEmployees = getEmployeesWithRoles();

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Asignación de Roles a Usuarios
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Gestiona los roles y permisos de cada usuario
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Filtrar por rol:</Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  <SelectItem value="none">Sin roles asignados</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {filteredEmployees.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>No se encontraron usuarios con los filtros seleccionados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Roles Asignados</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="font-medium">{employee.nombre}</div>
                      {employee.puesto && (
                        <div className="text-xs text-slate-500">{employee.puesto}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{employee.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{employee.departamento || "N/A"}</Badge>
                    </TableCell>
                    <TableCell>
                      {employee.assignedRoles.length === 0 ? (
                        <Badge variant="secondary" className="bg-slate-100">
                          Sin roles
                        </Badge>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {employee.assignedRoles.map((ur) => (
                            <div key={ur.id} className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
                              <span className="text-xs font-medium text-blue-800">
                                {getRoleName(ur.role_id)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 hover:bg-blue-100"
                                onClick={() => handleChangeRole(employee, ur.role_id)}
                                title="Cambiar rol"
                              >
                                <Edit className="w-3 h-3 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 hover:bg-red-100"
                                onClick={() => handleRevoke(ur.id)}
                                title="Revocar rol"
                              >
                                <X className="w-3 h-3 text-red-600" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssign(employee)}
                        className="text-blue-600"
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Asignar Rol
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showDialog && selectedUser && (
        <Dialog open={true} onOpenChange={handleClose}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Asignar Rol a {selectedUser.nombre}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Rol *</Label>
                <Select 
                  value={formData.role_id} 
                  onValueChange={(value) => setFormData({ ...formData, role_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          {role.name}
                          <Badge variant="outline" className="ml-2">
                            Nivel {role.level}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha de Expiración (opcional)</Label>
                <Input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-slate-500">
                  Deja vacío para que no expire
                </p>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Agrega notas sobre esta asignación..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <label htmlFor="active" className="text-sm">
                  Asignación activa
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={assignMutation.isPending || !formData.role_id}
                >
                  {assignMutation.isPending ? "Asignando..." : "Asignar Rol"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}