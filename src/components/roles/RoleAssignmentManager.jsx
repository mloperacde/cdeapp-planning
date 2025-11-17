import React, { useState, useMemo } from "react";
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
import { Plus, Trash2, Search, UserPlus, Filter } from "lucide-react";
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
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterPuesto, setFilterPuesto] = useState("all");
  const [filterEquipo, setFilterEquipo] = useState("all");
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

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
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

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp?.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const puestos = useMemo(() => {
    const pts = new Set();
    employees.forEach(emp => {
      if (emp?.puesto) pts.add(emp.puesto);
    });
    return Array.from(pts).sort();
  }, [employees]);

  const handleAssignRole = () => {
    if (!selectedUserId || !selectedRoleId) {
      toast.error("Selecciona un empleado y un rol");
      return;
    }

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

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp?.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = filterDepartment === "all" || emp?.departamento === filterDepartment;
      const matchesPuesto = filterPuesto === "all" || emp?.puesto === filterPuesto;
      const matchesEquipo = filterEquipo === "all" || emp?.equipo === filterEquipo;
      
      return matchesSearch && matchesDepartment && matchesPuesto && matchesEquipo;
    });
  }, [employees, searchTerm, filterDepartment, filterPuesto, filterEquipo]);

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4 text-blue-600" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Puesto</Label>
              <Select value={filterPuesto} onValueChange={setFilterPuesto}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {puestos.map((puesto) => (
                    <SelectItem key={puesto} value={puesto}>{puesto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Equipo</Label>
              <Select value={filterEquipo} onValueChange={setFilterEquipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team?.id} value={team?.team_name || ""}>{team?.team_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-600">
          Mostrando {filteredEmployees.length} de {employees.length} empleados
        </p>
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
                <TableHead>Departamento</TableHead>
                <TableHead>Puesto</TableHead>
                <TableHead>Roles Asignados</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => {
                const userRoles = getUserRoles(employee?.id);
                
                return (
                  <TableRow key={employee?.id}>
                    <TableCell className="font-medium">{employee?.nombre}</TableCell>
                    <TableCell className="text-sm text-slate-600">{employee?.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {employee?.departamento || "Sin departamento"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {employee?.puesto || "Sin puesto"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {userRoles.length === 0 ? (
                          <Badge variant="outline" className="text-xs text-slate-400">Sin roles</Badge>
                        ) : (
                          userRoles.map((ur) => (
                            <Badge 
                              key={ur?.id} 
                              className={ur?.role?.is_admin ? "bg-red-600 text-white" : "bg-blue-600 text-white"}
                            >
                              {ur?.role?.role_name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {userRoles.map((ur) => (
                          <Button
                            key={ur?.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`¿Eliminar rol "${ur?.role?.role_name}" de ${employee?.nombre}?`)) {
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

      {showAssignDialog && (
        <Dialog open={true} onOpenChange={setShowAssignDialog}>
          <DialogContent 
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
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
                      <SelectItem key={emp?.id} value={emp?.id || ""}>
                        {emp?.nombre} ({emp?.email})
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
                      <SelectItem key={role?.id} value={role?.id || ""}>
                        {role?.role_name} {role?.is_admin && "(Admin)"}
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
      )}
    </div>
  );
}