import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Search, Shield, Plus, X } from "lucide-react";
import { toast } from "sonner";
import EmployeeSelect from "../common/EmployeeSelect";

export default function EnhancedRoleAssignment({ roles }) {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
    initialData: []
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('email'),
    initialData: []
  });

  const { data: roleAssignments = [] } = useQuery({
    queryKey: ['userRoleAssignments'],
    queryFn: () => base44.entities.UserRoleAssignment.list(),
    initialData: []
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userEmail, roleIds }) => {
      const existing = roleAssignments.find(a => a.user_email === userEmail);
      
      // Log de auditoría
      const auditLog = {
        tipo_accion: existing ? "modificar_permisos" : "asignar_rol",
        usuario_ejecutor: currentUser?.email,
        usuario_afectado: userEmail,
        role_id: roleIds.join(','),
        role_name: roleIds.map(id => roles.find(r => r.id === id)?.role_name).join(', '),
        descripcion: existing 
          ? `Roles actualizados para ${userEmail}`
          : `Roles asignados a ${userEmail}`,
        fecha_accion: new Date().toISOString(),
        detalles_cambios: {
          antes: existing?.role_ids || [],
          despues: roleIds
        }
      };

      await base44.entities.RoleAuditLog.create(auditLog);

      if (existing) {
        return base44.entities.UserRoleAssignment.update(existing.id, {
          role_ids: roleIds,
          fecha_asignacion: new Date().toISOString()
        });
      } else {
        return base44.entities.UserRoleAssignment.create({
          user_email: userEmail,
          employee_id: employees.find(e => e.email === userEmail)?.id,
          role_ids: roleIds,
          fecha_asignacion: new Date().toISOString(),
          activo: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoleAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['roleAuditLogs'] });
      toast.success("Roles asignados correctamente");
      setSelectedEmployee("");
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    }
  });

  const toggleRoleForEmployee = (userEmail, roleId) => {
    const assignment = roleAssignments.find(a => a.user_email === userEmail);
    const currentRoles = assignment?.role_ids || [];
    
    const newRoles = currentRoles.includes(roleId)
      ? currentRoles.filter(id => id !== roleId)
      : [...currentRoles, roleId];
    
    assignRoleMutation.mutate({ userEmail, roleIds: newRoles });
  };

  const getUserRoles = (userEmail) => {
    const assignment = roleAssignments.find(a => a.user_email === userEmail);
    return assignment?.role_ids || [];
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const lower = searchTerm.toLowerCase();
    return users.filter(u => 
      u.email?.toLowerCase().includes(lower) ||
      u.full_name?.toLowerCase().includes(lower)
    );
  }, [users, searchTerm]);

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50 border-2 border-blue-300">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Información:</strong> Puedes asignar múltiples roles a cada empleado. 
            Los permisos se combinarán (el empleado tendrá todos los permisos de todos sus roles).
          </p>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar usuario por email o nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Asignación de Roles por Usuario ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No se encontraron usuarios
              </div>
            ) : (
              <div className="divide-y">
                {filteredUsers.map(user => {
                  const userRoles = getUserRoles(user.email);
                  const employee = employees.find(e => e.email === user.email);
                  
                  return (
                    <div key={user.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-semibold text-slate-900">{user.full_name}</div>
                          <div className="text-sm text-slate-600">{user.email}</div>
                          {employee && (
                            <div className="text-xs text-slate-500 mt-1">
                              {employee.departamento} • {employee.puesto}
                            </div>
                          )}
                        </div>
                        <Badge className={userRoles.length > 0 ? "bg-green-600" : "bg-slate-400"}>
                          {userRoles.length} rol(es)
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {roles.map(role => {
                          const isAssigned = userRoles.includes(role.id);
                          return (
                            <button
                              key={role.id}
                              onClick={() => toggleRoleForEmployee(user.email, role.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                isAssigned
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {role.role_name}
                              {role.is_admin && " 👑"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}