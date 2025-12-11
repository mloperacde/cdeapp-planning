import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Shield, Trash2, Users } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

// Importamos el nuevo editor limpio
import RoleEditor from "../components/roles/RoleEditor";
import RoleAssignmentManager from "../components/roles/RoleAssignmentManager";

export default function RoleManagementPage() {
  const [activeTab, setActiveTab] = useState("roles");
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const { data: roles = [], refetch } = useQuery({
    queryKey: ['allRoles'],
    queryFn: () => base44.entities.UserRole.list(),
  });

  const handleDelete = async (id) => {
    if (confirm("¿Seguro que quieres eliminar este rol?")) {
      await base44.entities.UserRole.delete(id);
      toast.success("Rol eliminado");
      refetch();
    }
  };

  const openEditor = (id = null) => {
    setEditingRoleId(id);
    setIsEditorOpen(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Gestión de Roles y Permisos (Sistema V2)
          </h1>
          <p className="text-slate-500 mt-2">
            Configura perfiles de acceso y asígnalos a los usuarios.
          </p>
        </div>
        <div className="flex gap-2">
            <Button 
                variant={activeTab === "roles" ? "default" : "outline"}
                onClick={() => setActiveTab("roles")}
            >
                Configurar Roles
            </Button>
            <Button 
                variant={activeTab === "asignar" ? "default" : "outline"}
                onClick={() => setActiveTab("asignar")}
            >
                Asignar Usuarios
            </Button>
        </div>
      </div>

      {activeTab === "roles" && (
        <>
            <div className="flex justify-end mb-6">
                <Button onClick={() => openEditor(null)} className="bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Crear Nuevo Rol
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map(role => (
                <Card key={role.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{role.role_name}</CardTitle>
                        {role.es_rol_sistema && <Badge variant="secondary">Sistema</Badge>}
                    </div>
                    <CardDescription>{role.description || "Sin descripción"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {role.permissions?.empleados?.ver && <Badge variant="outline" className="text-xs">Ver Empleados</Badge>}
                        {role.permissions?.empleados?.crear && <Badge variant="outline" className="text-xs">Crear Empleados</Badge>}
                        {role.permissions?.campos_empleado?.ver_salario && <Badge variant="outline" className="text-xs border-green-200 bg-green-50 text-green-700">Ver Salarios</Badge>}
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="ghost" size="sm" onClick={() => openEditor(role.id)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Editar
                        </Button>
                        {!role.es_rol_sistema && (
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(role.id)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                        )}
                    </div>
                    </CardContent>
                </Card>
                ))}
            </div>
        </>
      )}

      {activeTab === "asignar" && (
        <Card>
            <CardContent className="pt-6">
                <RoleAssignmentManager />
            </CardContent>
        </Card>
      )}

      {/* Dialogo Full Screen para Edición */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0">
            <RoleEditor 
                roleId={editingRoleId} 
                onClose={() => setIsEditorOpen(false)}
                onSuccess={() => {
                    setIsEditorOpen(false);
                    refetch();
                }}
            />
        </DialogContent>
      </Dialog>
    </div>
  );
}