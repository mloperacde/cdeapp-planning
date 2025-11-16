import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function RoleAssignmentManager({ roles = [] }) {
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const { data: roleAssignments = [] } = useQuery({
    queryKey: ['userRoleAssignments'],
    queryFn: () => base44.entities.UserRoleAssignment.list(),
    initialData: [],
  });

  const assignRoleMutation = useMutation({
    mutationFn: (data) => base44.entities.UserRoleAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoleAssignments'] });
      toast.success("Rol asignado correctamente");
      setShowAssignDialog(false);
      setSelectedUserId("");
      setSelectedRoleId("");
    }
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: (id) => base44.entities.UserRoleAssignment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoleAssignments'] });
      toast.success("Rol eliminado");
    }
  });

  const handleAssignRole = () => {
    if (!selectedUserId || !selectedRoleId) {
      toast.error("Selecciona un empleado y un rol");
      return;
    }

    // Verificar si ya existe la asignación
    const exists = roleAssignments.some(
      ra => ra?.user_id === selectedUserId && ra?.role_id === selectedRoleId && ra?.activo
    );

    if (exists) {
      toast.error("Este empleado ya tiene asignado este rol");
      return;
    }

    assignRoleMutation.mutate({
      user_id: selectedUserId,
      role_id: selectedRoleId,
      activo: true,
      fecha_asignacion: new Date().toISOString()
    });
  };

  const getUserRoles = (employeeId) => {
    const userAssignments = roleAssignments.filter(ra => ra?.user_id === employeeId && ra?.activo);
    return userAssignments.map(ra => {
      const role = roles.find(r => r?.id === ra?.role_id);
      return { ...ra, role };
    }).filter(ra => ra.role);
  };

  const filteredEmployees = employees.filter(emp => 
    emp?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar empleados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowAssignDialog(true)} className="bg-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Asignar Rol
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Empleado</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles Asignados</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => {
                const userRoles = getUserRoles(employee.id);
                
                return (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee?.nombre}</TableCell>
                    <TableCell className="text-sm text-slate-600">{employee?.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {userRoles.length === 0 ? (
                          <Badge variant="outline" className="text-xs text-slate-400">Sin roles</Badge>
                        ) : (
                          userRoles.map((ur) => (
                            <Badge 
                              key={ur.id} 
                              className={ur.role?.is_admin ? "bg-red-600 text-white" : "bg-blue-600 text-white"}
                            >
                              {ur.role?.role_name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {userRoles.map((ur) => (
                          <Button
                            key={ur.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`¿Eliminar rol "${ur.role?.role_name}" de ${employee.nombre}?`)) {
                                removeAssignmentMutation.mutate(ur.id);
                              }
                            }}
                            className="hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Asignar Rol a Empleado
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nombre} ({emp.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.role_name} {role.is_admin && "(Admin)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAssignRole}
                disabled={assignRoleMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {assignRoleMutation.isPending ? "Asignando..." : "Asignar Rol"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}