import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Plus, Edit, Users, ArrowLeft, CheckCircle2, FileText, AlertTriangle, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import EnhancedRoleForm from "../components/roles/EnhancedRoleForm";
import EnhancedRoleAssignment from "../components/roles/EnhancedRoleAssignment";
import RoleAuditLogViewer from "../components/roles/RoleAuditLogViewer";
import { toast } from "sonner";

export default function RoleManagementPage() {
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: roles, isLoading: loadingRoles, error: rolesError } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.list('-nivel_prioridad'),
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
          es_rol_sistema: true,
          permissions: {
            modulos_acceso: ["Dashboard", "Empleados", "Planning", "Maquinas", "Mantenimiento", "Ausencias", "Comites", "PRL", "Taquillas", "Habilidades", "Informes", "Configuracion", "Usuarios"],
            empleados: { ver: true, crear: true, editar: true, eliminar: true, departamentos_visibles: ["*"] },
            empleados_detalle: {
              pestanas: {
                personal: true, organizacion: true, horarios: true, taquilla: true, contrato: true, absentismo: true, maquinas: true, disponibilidad: true
              }
            },
            campos_empleado: {
              ver_salario: true, ver_bancarios: true, ver_contacto: true, ver_direccion: true, ver_dni: true, editar_sensible: true, editar_contacto: true
            },
            ausencias: { ver_propias: true, crear_propias: true, ver_todas: true, aprobar: true, rechazar: true, eliminar: true },
            maquinas: { ver: true, actualizar_estado: true, planificar: true },
            mantenimiento: { ver: true, crear: true, actualizar: true, completar: true },
            comites: { ver: true, gestionar_miembros: true, gestionar_documentos: true }
          }
        },
        {
          role_name: "Supervisor",
          description: "Gestión de empleados y planificación general",
          nivel_prioridad: 8,
          es_rol_sistema: true,
          permissions: {
            modulos_acceso: ["Dashboard", "Empleados", "Planning", "Maquinas", "Ausencias", "Informes"],
            empleados: { ver: true, crear: true, editar: true, eliminar: false, departamentos_visibles: ["*"] },
            empleados_detalle: {
              pestanas: {
                personal: true, organizacion: true, horarios: true, taquilla: true, contrato: true, absentismo: true, maquinas: true, disponibilidad: true
              }
            },
            campos_empleado: {
              ver_salario: true, ver_bancarios: true, ver_contacto: true, ver_direccion: true, ver_dni: true, editar_sensible: false, editar_contacto: true
            },
            ausencias: { ver_propias: true, crear_propias: true, ver_todas: true, aprobar: true },
            maquinas: { ver: true, actualizar_estado: true, planificar: true },
            mantenimiento: { ver: true, crear: false, actualizar: false, completar: false }
          }
        },
        {
          role_name: "Jefe de Turno",
          description: "Gestión de su equipo y planificación de turno",
          nivel_prioridad: 6,
          es_rol_sistema: true,
          permissions: {
            modulos_acceso: ["Dashboard", "Planning", "Ausencias", "Maquinas", "Empleados"],
            empleados: { ver: true, crear: false, editar: false, eliminar: false, departamentos_visibles: ["FABRICACION"] },
            empleados_detalle: {
              pestanas: {
                personal: true, organizacion: true, horarios: true, taquilla: true, contrato: false, absentismo: true, maquinas: true, disponibilidad: true
              }
            },
            campos_empleado: {
              ver_salario: false, ver_bancarios: false, ver_contacto: true, ver_direccion: false, ver_dni: false, editar_sensible: false, editar_contacto: false
            },
            ausencias: { ver_propias: true, crear_propias: true, ver_todas: true, aprobar: true },
            maquinas: { ver: true, actualizar_estado: false, planificar: true }
          }
        },
        {
          role_name: "Técnico Mantenimiento",
          description: "Gestión de mantenimiento y máquinas",
          nivel_prioridad: 5,
          es_rol_sistema: true,
          permissions: {
            modulos_acceso: ["Dashboard", "Maquinas", "Mantenimiento", "Ausencias"],
            maquinas: { ver: true, actualizar_estado: true, planificar: false },
            mantenimiento: { ver: true, crear: true, actualizar: true, completar: true },
            ausencias: { ver_propias: true, crear_propias: true, ver_todas: false, aprobar: false }
          }
        },
        {
          role_name: "Miembro Comité",
          description: "Acceso a documentación PRL y gestión de comités",
          nivel_prioridad: 4,
          es_rol_sistema: true,
          permissions: {
            modulos_acceso: ["Dashboard", "Comites", "PRL", "Ausencias"],
            comites: { ver: true, gestionar_miembros: false, gestionar_documentos: true },
            ausencias: { ver_propias: true, crear_propias: true, ver_todas: false, aprobar: false }
          }
        },
        {
          role_name: "Operario",
          description: "Acceso limitado a información personal y asignaciones",
          nivel_prioridad: 2,
          es_rol_sistema: true,
          permissions: {
            modulos_acceso: ["Dashboard", "Ausencias"],
            ausencias: { ver_propias: true, crear_propias: true, ver_todas: false, aprobar: false },
            maquinas: { ver: true, actualizar_estado: false, planificar: false }
          }
        },
        {
          role_name: "Empleado",
          description: "Acceso básico solo a información personal",
          nivel_prioridad: 1,
          es_rol_sistema: true,
          permissions: {
            modulos_acceso: ["Dashboard"],
            ausencias: { ver_propias: true, crear_propias: true, ver_todas: false, aprobar: false }
          }
        }
      ];

      // Eliminar roles existentes si es necesario o simplemente crear si no existen
      // Para evitar duplicados, primero verificamos por nombre
      for (const defRole of defaultRoles) {
        const existing = roles.find(r => r.role_name === defRole.role_name);
        if (!existing) {
          await base44.entities.UserRole.create(defRole);
        } else {
          // Opcional: Actualizar permisos de roles del sistema existentes para asegurar consistencia
          if (existing.es_rol_sistema) {
             await base44.entities.UserRole.update(existing.id, { permissions: defRole.permissions, es_rol_sistema: true });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      toast.success("Roles inicializados y actualizados correctamente");
    },
    onError: (err) => {
      toast.error(`Error al inicializar roles: ${err.message}`);
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
          <div className="flex gap-2">
            <Button onClick={() => initializeRolesMutation.mutate()} variant="outline" className="text-slate-600 border-slate-300">
              <RefreshCw className="w-4 h-4 mr-2" />
              Restaurar Roles Sistema
            </Button>
          </div>
        </div>

        {rolesError && (
           <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-800">
             <AlertTriangle className="w-5 h-5" />
             <p>Error cargando roles: {rolesError.message}</p>
           </div>
        )}

        <Tabs defaultValue="roles">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="roles">
              <Shield className="w-4 h-4 mr-2" />
              Roles del Sistema
            </TabsTrigger>
            <TabsTrigger value="assignments">
              <Users className="w-4 h-4 mr-2" />
              Asignación de Roles
            </TabsTrigger>
            <TabsTrigger value="audit">
              <FileText className="w-4 h-4 mr-2" />
              Log de Auditoría
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="space-y-4 mt-6">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowRoleForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Crear Rol Personalizado
              </Button>
            </div>

            {loadingRoles ? (
              <div className="text-center p-8">Cargando roles...</div>
            ) : roles.length === 0 ? (
              <div className="text-center p-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900">No hay roles definidos</h3>
                <p className="text-slate-500 mb-4">Inicializa los roles del sistema para comenzar.</p>
                <Button onClick={() => initializeRolesMutation.mutate()} className="bg-blue-600">
                  Inicializar Roles
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roles.map(role => (
                  <Card key={role.id} className={role.is_admin ? "border-2 border-blue-400" : ""}>
                    <CardHeader className="border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{role.role_name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-600">Nivel {role.nivel_prioridad}</Badge>
                          {role.is_admin && <Badge className="bg-red-600">ADMIN</Badge>}
                          {role.es_rol_sistema && <Badge variant="outline">Sistema</Badge>}
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
                          Editar Permisos
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assignments" className="mt-6">
            <EnhancedRoleAssignment roles={roles} />
          </TabsContent>

          <TabsContent value="audit" className="mt-6">
            <RoleAuditLogViewer />
          </TabsContent>
        </Tabs>
      </div>

      {showRoleForm && (
        <EnhancedRoleForm
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