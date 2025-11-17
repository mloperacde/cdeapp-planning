import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Plus, Edit, Users, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import RoleForm from "../components/roles/RoleForm";
import RoleAssignmentManager from "../components/roles/RoleAssignmentManager";
import { toast } from "sonner";

export default function RoleManagementPage() {
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const queryClient = useQueryClient();

  const { data: roles } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.list('-nivel_prioridad'),
    initialData: [],
  });

  const { data: roleAssignments } = useQuery({
    queryKey: ['userRoleAssignments'],
    queryFn: () => base44.entities.UserRoleAssignment.list(),
    initialData: [],
  });

  const initializeRolesMutation = useMutation({
    mutationFn: async () => {
      const defaultRoles = [
        {
          role_name: "Admin",
          description: "Acceso completo a todos los módulos del sistema",
          is_admin: true,
          nivel_prioridad: 10,
          permissions: {
            modulos_acceso: ["Dashboard", "Empleados", "Planning", "Maquinas", "Mantenimiento", "Ausencias", "Comites", "PRL", "Taquillas", "Habilidades", "Informes", "Configuracion", "Usuarios"],
            acciones_empleados: { ver: true, crear: true, editar: true, eliminar: true },
            acciones_ausencias: { ver_propias: true, crear_propias: true, ver_todas: true, aprobar: true },
            acciones_maquinas: { ver: true, actualizar_estado: true, planificar: true },
            acciones_mantenimiento: { ver: true, crear: true, actualizar: true, completar: true },
            acciones_comites: { ver: true, gestionar_miembros: true, gestionar_documentos: true }
          }
        },
        {
          role_name: "Supervisor",
          description: "Gestión de empleados y planificación general",
          nivel_prioridad: 8,
          permissions: {
            modulos_acceso: ["Dashboard", "Empleados", "Planning", "Maquinas", "Ausencias", "Informes"],
            acciones_empleados: { ver: true, crear: true, editar: true, eliminar: false },
            acciones_ausencias: { ver_propias: true, crear_propias: true, ver_todas: true, aprobar: true },
            acciones_maquinas: { ver: true, actualizar_estado: true, planificar: true },
            acciones_mantenimiento: { ver: true, crear: false, actualizar: false, completar: false }
          }
        },
        {
          role_name: "Jefe de Turno",
          description: "Gestión de su equipo y planificación de turno",
          nivel_prioridad: 6,
          permissions: {
            modulos_acceso: ["Dashboard", "Planning", "Ausencias", "Maquinas"],
            acciones_empleados: { ver: true, crear: false, editar: false, eliminar: false },
            acciones_ausencias: { ver_propias: true, crear_propias: true, ver_todas: true, aprobar: true },
            acciones_maquinas: { ver: true, actualizar_estado: false, planificar: true }
          }
        },
        {
          role_name: "Técnico Mantenimiento",
          description: "Gestión de mantenimiento y máquinas",
          nivel_prioridad: 5,
          permissions: {
            modulos_acceso: ["Dashboard", "Maquinas", "Mantenimiento", "Ausencias"],
            acciones_maquinas: { ver: true, actualizar_estado: true, planificar: false },
            acciones_mantenimiento: { ver: true, crear: true, actualizar: true, completar: true },
            acciones_ausencias: { ver_propias: true, crear_propias: true, ver_todas: false, aprobar: false }
          }
        },
        {
          role_name: "Miembro Comité",
          description: "Acceso a documentación PRL y gestión de comités",
          nivel_prioridad: 4,
          permissions: {
            modulos_acceso: ["Dashboard", "Comites", "PRL", "Ausencias"],
            acciones_comites: { ver: true, gestionar_miembros: false, gestionar_documentos: true },
            acciones_ausencias: { ver_propias: true, crear_propias: true, ver_todas: false, aprobar: false }
          }
        },
        {
          role_name: "Operario",
          description: "Acceso limitado a información personal y asignaciones",
          nivel_prioridad: 2,
          permissions: {
            modulos_acceso: ["Dashboard", "Ausencias"],
            acciones_ausencias: { ver_propias: true, crear_propias: true, ver_todas: false, aprobar: false },
            acciones_maquinas: { ver: true, actualizar_estado: false, planificar: false }
          }
        },
        {
          role_name: "Empleado",
          description: "Acceso básico solo a información personal",
          nivel_prioridad: 1,
          permissions: {
            modulos_acceso: ["Dashboard"],
            acciones_ausencias: { ver_propias: true, crear_propias: true, ver_todas: false, aprobar: false }
          }
        }
      ];

      return Promise.all(defaultRoles.map(role => base44.entities.UserRole.create(role)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      toast.success("Roles inicializados correctamente");
    }
  });

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              Gestión de Roles y Permisos
            </h1>
            <p className="text-slate-600 mt-1">
              Configura roles y asigna permisos a usuarios
            </p>
          </div>
          {roles.length === 0 && (
            <Button onClick={() => initializeRolesMutation.mutate()} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Inicializar Roles Predefinidos
            </Button>
          )}
        </div>

        <Tabs defaultValue="roles">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="roles">
              <Shield className="w-4 h-4 mr-2" />
              Roles del Sistema
            </TabsTrigger>
            <TabsTrigger value="assignments">
              <Users className="w-4 h-4 mr-2" />
              Asignación de Roles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="space-y-4 mt-6">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowRoleForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Crear Rol Personalizado
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map(role => (
                <Card key={role.id} className={role.is_admin ? "border-2 border-blue-400" : ""}>
                  <CardHeader className="border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{role.role_name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-600">Nivel {role.nivel_prioridad}</Badge>
                        {role.is_admin && <Badge className="bg-red-600">ADMIN</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-600 mb-3">{role.description}</p>
                    
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-700">Módulos de Acceso:</h4>
                      <div className="flex flex-wrap gap-1">
                        {(role.permissions?.modulos_acceso || []).map((mod, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {mod}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditingRole(role);
                        setShowRoleForm(true);
                      }}>
                        <Edit className="w-3 h-3 mr-2" />
                        Editar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="assignments" className="mt-6">
            <RoleAssignmentManager roles={roles} />
          </TabsContent>
        </Tabs>
      </div>

      {showRoleForm && (
        <RoleForm
          role={editingRole}
          onClose={() => {
            setShowRoleForm(false);
            setEditingRole(null);
          }}
        />
      )}
    </div>
  );
}