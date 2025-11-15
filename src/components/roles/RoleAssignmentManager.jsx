import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Save, Shield } from "lucide-react";
import { toast } from "sonner";

export default function RoleAssignmentManager({ roles }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [assignments, setAssignments] = useState({});
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const { data: roleAssignments } = useQuery({
    queryKey: ['userRoleAssignments'],
    queryFn: () => base44.entities.UserRoleAssignment.list(),
    initialData: [],
  });

  const { data: systemUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  React.useEffect(() => {
    const assignmentMap = {};
    employees.forEach(emp => {
      const assignment = roleAssignments.find(ra => ra.employee_id === emp.id);
      assignmentMap[emp.id] = assignment?.role_ids || [];
    });
    setAssignments(assignmentMap);
  }, [employees, roleAssignments]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp =>
      emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises = Object.entries(assignments).map(([employeeId, roleIds]) => {
        const employee = employees.find(e => e.id === employeeId);
        if (!employee?.email) return null;

        const existing = roleAssignments.find(ra => ra.employee_id === employeeId);
        const data = {
          user_email: employee.email,
          employee_id: employeeId,
          role_ids: roleIds,
          fecha_asignacion: new Date().toISOString(),
          activo: true
        };

        if (existing) {
          return base44.entities.UserRoleAssignment.update(existing.id, data);
        }
        return base44.entities.UserRoleAssignment.create(data);
      });

      return Promise.all(promises.filter(p => p !== null));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoleAssignments'] });
      toast.success("Asignaciones guardadas correctamente");
    }
  });

  const handleRoleToggle = (employeeId, roleId) => {
    setAssignments(prev => {
      const current = prev[employeeId] || [];
      const updated = current.includes(roleId)
        ? current.filter(r => r !== roleId)
        : [...current, roleId];
      return { ...prev, [employeeId]: updated };
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Guardar Asignaciones
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Empleado</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles Asignados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map(employee => {
                  const hasUser = systemUsers.some(u => u.email === employee.email);
                  const employeeRoles = assignments[employee.id] || [];

                  return (
                    <TableRow key={employee.id} className={!employee.email ? "opacity-50" : ""}>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{employee.nombre}</div>
                        {!hasUser && employee.email && (
                          <Badge variant="outline" className="text-xs mt-1">Sin usuario</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{employee.departamento || "N/A"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{employee.email || <span className="text-red-600">Sin email</span>}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {roles.map(role => (
                            <Badge
                              key={role.id}
                              className={`cursor-pointer ${
                                employeeRoles.includes(role.id)
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                              }`}
                              onClick={() => handleRoleToggle(employee.id, role.id)}
                            >
                              {role.role_name}
                              {employeeRoles.includes(role.id) && " ✓"}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}