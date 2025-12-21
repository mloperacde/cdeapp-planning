import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Users, 
  Mail, 
  Link as LinkIcon, 
  CheckCircle, 
  ArrowRight,
  Copy,
  ExternalLink,
  BookOpen,
  Settings,
  UserPlus
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DeploymentGuidePage() {
  const appUrl = window.location.origin;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  const steps = [
    {
      title: "1. Inicializar Roles del Sistema",
      description: "Ejecuta la función para crear los roles predeterminados",
      action: async () => {
        try {
          const { base44 } = await import("@/api/base44Client");
          const response = await base44.functions.invoke('initialize_default_roles');
          if (response.data.success) {
            toast.success("Roles inicializados correctamente");
          } else {
            toast.info(response.data.message);
          }
        } catch (error) {
          toast.error("Error al inicializar roles");
        }
      },
      buttonText: "Inicializar Roles",
      icon: Shield
    },
    {
      title: "2. Configurar Roles Personalizados",
      description: "Crea o modifica roles según las necesidades de tu organización",
      link: createPageUrl("RoleManagement"),
      buttonText: "Gestionar Roles",
      icon: Settings
    },
    {
      title: "3. Asignar Roles a Usuarios",
      description: "Asigna roles a los empleados registrados en el sistema",
      link: createPageUrl("UserRoleAssignment"),
      buttonText: "Asignar Roles",
      icon: UserPlus
    },
    {
      title: "4. Compartir Acceso",
      description: "Proporciona la URL de la aplicación y credenciales a los usuarios",
      content: (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <LinkIcon className="w-4 h-4 text-blue-600" />
            <code className="flex-1 text-sm font-mono">{appUrl}</code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(appUrl)}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ),
      icon: Mail
    }
  ];

  const roles = [
    { name: "Administrador", code: "ADMIN", description: "Acceso completo al sistema", color: "red" },
    { name: "Responsable RRHH", code: "HR_MANAGER", description: "Gestión de recursos humanos", color: "blue" },
    { name: "Jefe de Turno", code: "SHIFT_MANAGER", description: "Gestión de equipo y planificación", color: "green" },
    { name: "Supervisor de Producción", code: "PROD_SUPERVISOR", description: "Supervisión de producción", color: "purple" },
    { name: "Técnico de Mantenimiento", code: "MAINTENANCE_TECH", description: "Gestión de mantenimiento", color: "orange" },
    { name: "Operario", code: "OPERATOR", description: "Acceso básico de consulta", color: "slate" }
  ];

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-6xl mx-auto">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-xl">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Guía de Implementación</CardTitle>
              <p className="text-slate-600 mt-1">Sistema de Roles y Permisos</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Roles Predeterminados
          </CardTitle>
          <p className="text-sm text-slate-500">
            El sistema incluye 6 roles preconfigurados con diferentes niveles de acceso
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((role) => (
              <Card key={role.code} className="border-l-4" style={{ borderLeftColor: `var(--${role.color}-500)` }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{role.name}</h4>
                      <Badge variant="outline" className="mt-1 font-mono text-xs">
                        {role.code}
                      </Badge>
                    </div>
                    <Badge className={`bg-${role.color}-100 text-${role.color}-800`}>
                      Nivel {role.code === 'ADMIN' ? 100 : role.code === 'HR_MANAGER' ? 60 : role.code === 'SHIFT_MANAGER' ? 50 : role.code === 'PROD_SUPERVISOR' ? 40 : role.code === 'MAINTENANCE_TECH' ? 30 : 10}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{role.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Pasos de Configuración
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={index} className="border-2 hover:border-blue-300 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg shrink-0">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                        <p className="text-slate-600 mb-3">{step.description}</p>
                        {step.content}
                        {step.action && (
                          <Button
                            onClick={step.action}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {step.buttonText}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        )}
                        {step.link && (
                          <Link to={step.link}>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                              {step.buttonText}
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Users className="w-5 h-5" />
            Cómo Difundir la Aplicación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">📧 Invitación por Email</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
              <li>Los usuarios deben ser invitados mediante el sistema de invitaciones de Base44</li>
              <li>Cada usuario recibirá un email con un enlace de activación</li>
              <li>Al activar su cuenta, establecerán su contraseña</li>
              <li>Una vez registrados, asígnales un rol desde "Asignación de Roles"</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-2">🔗 Acceso Directo</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
              <li>Comparte la URL de la aplicación con los usuarios</li>
              <li>Los usuarios acceden con su email y contraseña</li>
              <li>El sistema mostrará solo las funciones permitidas según su rol</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-2">🔐 Seguridad</h4>
            <ul className="list-disc list-inside space-y-2 text-sm text-slate-700">
              <li>Los usuarios solo verán las secciones permitidas en su rol</li>
              <li>Los permisos se verifican tanto en frontend como en backend</li>
              <li>Los cambios de rol se aplican inmediatamente</li>
              <li>Puedes desactivar roles temporalmente sin eliminarlos</li>
            </ul>
          </div>

          <div className="p-4 bg-white rounded-lg border border-amber-200">
            <h4 className="font-semibold mb-2 text-amber-800">💡 Recomendaciones</h4>
            <ul className="space-y-1 text-sm text-slate-700">
              <li>• Comienza asignando roles a un grupo pequeño de usuarios</li>
              <li>• Verifica que cada rol tenga los permisos correctos</li>
              <li>• Documenta las responsabilidades de cada rol internamente</li>
              <li>• Revisa periódicamente las asignaciones de roles</li>
              <li>• Usa roles con fecha de expiración para permisos temporales</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}