import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Shield,
  Users,
  Settings,
  ArrowLeft,
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { usePermissions } from "../components/permissions/usePermissions";

export default function RoleMigrationGuidePage() {
  const permissions = usePermissions();

  const migrationSteps = [
    {
      id: 1,
      title: "✅ Eliminación de Entidades Legacy",
      status: "completed",
      description: "Entidades Role y UserRole eliminadas del sistema",
      actions: [
        "Entidad Role.json eliminada",
        "Entidad UserRole.json eliminada",
        "Referencias eliminadas del código"
      ]
    },
    {
      id: 2,
      title: "✅ Migración al Sistema Nativo",
      status: "completed",
      description: "Todo el sistema usa roles nativos de Base44",
      actions: [
        "Hook usePermissions() implementado",
        "DataProvider actualizado",
        "Componente RoleGuard creado",
        "Todas las páginas migradas"
      ]
    },
    {
      id: 3,
      title: "⚙️ Configurar Permisos en Base44 Dashboard",
      status: "pending",
      description: "Configurar reglas de acceso por entidad",
      actions: [
        "Ir a Base44 Dashboard → Tu App → Seguridad",
        "Configurar permisos para entidades críticas:",
        "  • EmployeeMasterDatabase: Solo admin puede editar",
        "  • Absence: Admin puede aprobar, users solo crear las suyas",
        "  • Machine: Solo admin y mantenimiento",
        "  • MaintenanceSchedule: Solo admin y técnicos"
      ]
    },
    {
      id: 4,
      title: "👥 Asignar Roles a Usuarios",
      status: "pending",
      description: "Asignar rol 'admin' o 'user' a cada usuario",
      actions: [
        "Ir a Base44 Dashboard → Tu App → Usuarios",
        "Para cada usuario, asignar rol:",
        "  • Admin: Responsables, RRHH, Gerencia",
        "  • User: Resto de empleados"
      ]
    },
    {
      id: 5,
      title: "✅ Verificación Final",
      status: "testing",
      description: "Probar accesos con diferentes roles",
      actions: [
        "Iniciar sesión como Admin → Verificar acceso completo",
        "Iniciar sesión como User → Verificar restricciones",
        "Probar creación/edición de ausencias",
        "Verificar permisos de configuración"
      ]
    }
  ];

  const nativeRoles = [
    {
      role: "admin",
      name: "Administrador",
      description: "Acceso completo a todos los módulos",
      permissions: [
        "Ver y editar todos los empleados",
        "Aprobar/rechazar ausencias",
        "Gestionar máquinas y mantenimiento",
        "Configurar el sistema",
        "Ver datos sensibles (salarios, datos personales)",
        "Invitar nuevos usuarios",
        "Acceso a todos los reportes"
      ],
      color: "blue"
    },
    {
      role: "user",
      name: "Usuario",
      description: "Acceso limitado según configuración",
      permissions: [
        "Ver su propia información",
        "Solicitar ausencias propias",
        "Ver calendario de turnos",
        "Ver sus reportes de ausencias",
        "Acceso a chat y notificaciones"
      ],
      color: "green"
    }
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Configuración
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Migración al Sistema Nativo de Roles
          </h1>
          <p className="text-slate-600 mt-1">
            Guía completa de migración de Role/UserRole al sistema nativo de Base44
          </p>
        </div>

        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>Migración Completada:</strong> El sistema ahora usa exclusivamente los roles nativos de Base44 (admin/user). Las entidades Role y UserRole han sido eliminadas.
          </AlertDescription>
        </Alert>

        {/* Roles Nativos */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Roles Nativos de Base44</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nativeRoles.map((roleInfo) => (
              <Card key={roleInfo.role} className={`border-2 ${
                roleInfo.color === 'blue' ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'
              }`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge className={roleInfo.color === 'blue' ? 'bg-blue-600' : 'bg-green-600'}>
                      {roleInfo.role}
                    </Badge>
                    {roleInfo.name}
                  </CardTitle>
                  <p className="text-sm text-slate-600">{roleInfo.description}</p>
                </CardHeader>
                <CardContent>
                  <h4 className="text-sm font-semibold mb-2">Permisos:</h4>
                  <ul className="space-y-1">
                    {roleInfo.permissions.map((perm, idx) => (
                      <li key={idx} className="text-xs flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{perm}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Estado de Migración */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Plan de Migración - Estado Actual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {migrationSteps.map((step, idx) => (
              <div key={step.id} className="relative">
                {idx < migrationSteps.length - 1 && (
                  <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-slate-200"></div>
                )}
                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                    step.status === 'completed' ? 'bg-green-600 text-white' :
                    step.status === 'testing' ? 'bg-blue-600 text-white' :
                    'bg-slate-200 text-slate-600'
                  }`}>
                    {step.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <span className="font-bold text-sm">{step.id}</span>
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{step.title}</h3>
                      <Badge className={
                        step.status === 'completed' ? 'bg-green-600' :
                        step.status === 'testing' ? 'bg-blue-600' :
                        'bg-slate-600'
                      }>
                        {step.status === 'completed' ? 'Completado' :
                         step.status === 'testing' ? 'En Pruebas' :
                         'Pendiente'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{step.description}</p>
                    <ul className="space-y-2">
                      {step.actions.map((action, actionIdx) => (
                        <li key={actionIdx} className="flex items-start gap-2 text-sm">
                          {step.status === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded border-2 border-slate-300 mt-0.5 flex-shrink-0"></div>
                          )}
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Acciones Rápidas */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300">
          <CardHeader>
            <CardTitle className="text-blue-900">Próximos Pasos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Configurar Permisos en Base44</span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="https://base44.com/dashboard" target="_blank" rel="noopener">
                  Abrir Dashboard
                  <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-green-600" />
                <span className="font-medium">Gestionar Usuarios y Roles</span>
              </div>
              <Link to={createPageUrl("AppUserManagement")}>
                <Button variant="outline" size="sm">
                  Ir a Usuarios
                  <ArrowRight className="w-3 h-3 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Estado Actual del Usuario */}
        <Card className="mt-6 bg-slate-50">
          <CardHeader>
            <CardTitle className="text-sm">Tu Información de Acceso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Usuario:</span>
              <span className="font-semibold">{permissions.userEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Rol:</span>
              <Badge className={permissions.isAdmin ? 'bg-blue-600' : 'bg-green-600'}>
                {permissions.role}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Permisos:</span>
              <span className="text-xs text-slate-500">
                {permissions.isAdmin ? 'Acceso Completo' : 'Acceso Limitado'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}