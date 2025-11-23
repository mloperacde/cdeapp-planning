import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Users, Building } from "lucide-react";
import SearchableSelect from "../common/SearchableSelect";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function DocumentPermissions({ document, roles = [], departments = [] }) {
  const [isPublic, setIsPublic] = useState(document.es_publico || false);
  const [selectedRoles, setSelectedRoles] = useState(document.roles_acceso || []);
  const [selectedDepartments, setSelectedDepartments] = useState(document.departamentos_acceso || []);
  const queryClient = useQueryClient();

  const updatePermissionsMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.Document.update(document.id, {
        es_publico: isPublic,
        roles_acceso: isPublic ? [] : selectedRoles,
        departamentos_acceso: isPublic ? [] : selectedDepartments
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success("Permisos actualizados correctamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar permisos: " + error.message);
    }
  });

  const toggleRole = (roleId) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const toggleDepartment = (dept) => {
    setSelectedDepartments(prev => 
      prev.includes(dept) 
        ? prev.filter(d => d !== dept)
        : [...prev, dept]
    );
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          Permisos de Acceso
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="es_publico"
            checked={isPublic}
            onCheckedChange={setIsPublic}
          />
          <label htmlFor="es_publico" className="text-sm font-medium">
            Documento público (visible para todos)
          </label>
        </div>

        {!isPublic && (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold">Roles con Acceso</span>
              </div>
              <div className="space-y-2 pl-6">
                {roles.map(role => (
                  <div key={role.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={selectedRoles.includes(role.id)}
                      onCheckedChange={() => toggleRole(role.id)}
                    />
                    <label htmlFor={`role-${role.id}`} className="text-sm">
                      {role.role_name}
                    </label>
                  </div>
                ))}
                {roles.length === 0 && (
                  <p className="text-xs text-slate-500">No hay roles configurados</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Building className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold">Departamentos con Acceso</span>
              </div>
              <div className="space-y-2 pl-6">
                {departments.map(dept => (
                  <div key={dept} className="flex items-center space-x-2">
                    <Checkbox
                      id={`dept-${dept}`}
                      checked={selectedDepartments.includes(dept)}
                      onCheckedChange={() => toggleDepartment(dept)}
                    />
                    <label htmlFor={`dept-${dept}`} className="text-sm">
                      {dept}
                    </label>
                  </div>
                ))}
                {departments.length === 0 && (
                  <p className="text-xs text-slate-500">No hay departamentos</p>
                )}
              </div>
            </div>

            {(selectedRoles.length > 0 || selectedDepartments.length > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Acceso concedido a:</strong>
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedRoles.map(roleId => {
                    const role = roles.find(r => r.id === roleId);
                    return role ? (
                      <Badge key={roleId} className="bg-blue-600 text-xs">
                        {role.role_name}
                      </Badge>
                    ) : null;
                  })}
                  {selectedDepartments.map(dept => (
                    <Badge key={dept} className="bg-green-600 text-xs">
                      {dept}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <Button 
          onClick={() => updatePermissionsMutation.mutate()}
          className="w-full bg-purple-600 hover:bg-purple-700"
          disabled={updatePermissionsMutation.isPending}
        >
          {updatePermissionsMutation.isPending ? "Guardando..." : "Guardar Permisos"}
        </Button>
      </CardContent>
    </Card>
  );
}