import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Users, 
  Mail, 
  Link as LinkIcon, 
  CheckCircle, 
  ArrowRight,
  Copy,
  Settings,
  UserPlus,
  BookOpen,
  Key,
  Server,
  Smartphone,
  Download,
  FileText,
  AlertCircle,
  Video,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

export default function AdminDeploymentGuidePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const appUrl = window.location.origin;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Guía de Implementación para Administradores</CardTitle>
              <p className="text-slate-600 mt-1">Manual completo paso a paso</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="setup" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="setup">Configuración Inicial</TabsTrigger>
          <TabsTrigger value="roles">Gestión de Roles</TabsTrigger>
          <TabsTrigger value="users">Invitar Usuarios</TabsTrigger>
          <TabsTrigger value="mobile">App Móvil</TabsTrigger>
          <TabsTrigger value="support">Soporte</TabsTrigger>
        </TabsList>

        {/* CONFIGURACIÓN INICIAL */}
        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Paso 1: Configuración Inicial del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <div className="p-2 bg-blue-600 rounded-lg shrink-0">
                    <Server className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">1.1 Inicializar Roles del Sistema</h4>
                    <p className="text-sm text-slate-700 mb-3">
                      Este paso crea automáticamente 6 roles predefinidos en el sistema:
                    </p>
                    <ul className="text-sm space-y-1 mb-4 text-slate-700">
                      <li>• <strong>Administrador</strong> - Acceso total al sistema</li>
                      <li>• <strong>Responsable RRHH</strong> - Gestión completa de empleados y ausencias</li>
                      <li>• <strong>Jefe de Turno</strong> - Gestión de equipo y planificación</li>
                      <li>• <strong>Supervisor de Producción</strong> - Control de producción y máquinas</li>
                      <li>• <strong>Técnico de Mantenimiento</strong> - Gestión de mantenimiento</li>
                      <li>• <strong>Operario</strong> - Acceso básico de consulta</li>
                    </ul>
                    <Button
                      onClick={initializeRoles}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Inicializar Roles Ahora
                    </Button>
                    <p className="text-xs text-slate-500 mt-2">
                      ⚠️ Solo necesitas hacer esto una vez. Si ya lo hiciste, puedes continuar al siguiente paso.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border">
                  <div className="p-2 bg-slate-600 rounded-lg shrink-0">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">1.2 Verificar Roles Creados</h4>
                    <p className="text-sm text-slate-700 mb-3">
                      Después de inicializar, verifica que los roles se hayan creado correctamente.
                    </p>
                    <Link to={createPageUrl("RoleManagement")}>
                      <Button variant="outline">
                        <Shield className="w-4 h-4 mr-2" />
                        Ver Roles Creados
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-amber-800 mb-1">Importante</h4>
                    <p className="text-sm text-amber-700">
                      Los roles predefinidos son de "Sistema" y no se pueden eliminar ni modificar sus permisos principales. 
                      Puedes crear roles personalizados adicionales según tus necesidades.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paso 2: URL de Acceso a la Aplicación</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">
                Esta es la URL que compartirás con tus usuarios para acceder a la aplicación:
              </p>
              <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <LinkIcon className="w-5 h-5 text-blue-600 shrink-0" />
                <code className="flex-1 text-sm font-mono break-all">{appUrl}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(appUrl)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="mt-4 p-3 bg-slate-50 rounded border">
                <p className="text-sm font-medium mb-2">💡 Guarda esta URL para:</p>
                <ul className="text-sm space-y-1 text-slate-600">
                  <li>• Enviarla por email a los usuarios</li>
                  <li>• Añadirla a la intranet de la empresa</li>
                  <li>• Crear un marcador/favorito en los navegadores</li>
                  <li>• Incluirla en documentación interna</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GESTIÓN DE ROLES */}
        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                Gestión de Roles y Permisos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-lg border">
                  <h4 className="font-semibold mb-3">Matriz de Roles y Permisos</h4>
                  <div className="space-y-3">
                    {[
                      {
                        name: "Administrador",
                        code: "admin",
                        level: 100,
                        color: "red",
                        permissions: "Acceso completo a todos los módulos, configuración y seguridad"
                      },
                      {
                        name: "Responsable RRHH",
                        code: "hr_manager",
                        level: 70,
                        color: "blue",
                        permissions: "Gestión completa de empleados, ausencias, datos sensibles y evaluaciones"
                      },
                      {
                        name: "Jefe de Turno Producción",
                        code: "shift_manager_production",
                        level: 60,
                        color: "green",
                        permissions: "Gestionar planificación y ausencias de su equipo de producción, ver máquinas de su área"
                      },
                      {
                        name: "Jefe de Turno Calidad",
                        code: "shift_manager_quality",
                        level: 55,
                        color: "emerald",
                        permissions: "Gestionar planificación y ausencias de calidad, acceso a informes de calidad"
                      },
                      {
                        name: "Jefe de Turno Mantenimiento",
                        code: "shift_manager_maintenance",
                        level: 55,
                        color: "orange",
                        permissions: "Gestionar planificación y ausencias de mantenimiento, coordinar órdenes de trabajo"
                      },
                      {
                        name: "Supervisor de Producción",
                        code: "prod_supervisor",
                        level: 50,
                        color: "purple",
                        permissions: "Visión global de producción, informes, seguimiento de máquinas y rendimiento"
                      },
                      {
                        name: "Técnico de Mantenimiento",
                        code: "maintenance_tech",
                        level: 40,
                        color: "amber",
                        permissions: "Gestionar mantenimientos, estados de máquina y órdenes de trabajo asignadas"
                      },
                      {
                        name: "Operario",
                        code: "operator",
                        level: 10,
                        color: "slate",
                        permissions: "Ver su planificación personal, solicitar ausencias, ver documentos asignados"
                      }
                    ].map((role) => (
                      <Card
                        key={role.name}
                        className="border-l-4"
                        style={{ borderLeftColor: `rgb(var(--${role.color}-500))` }}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">{role.name}</span>
                                <Badge>Nivel {role.level}</Badge>
                              </div>
                              <p className="text-xs text-slate-600 mb-1">
                                Código en Base44:{" "}
                                <span className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">
                                  {role.code}
                                </span>
                              </p>
                              <p className="text-xs text-slate-600">{role.permissions}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Cómo configurar estos roles en Base44
                  </h4>
                  <p className="text-sm text-slate-700 mb-3">
                    En el Dashboard de Base44 crea los roles usando los códigos indicados en la tabla anterior.
                  </p>
                  <ol className="text-sm space-y-2 text-slate-700 mb-4">
                    <li>1. Ve a <strong>Dashboard de Base44 → Users / Roles</strong></li>
                    <li>2. Crea un nuevo rol e introduce el código (por ejemplo, <span className="font-mono text-xs">hr_manager</span>)</li>
                    <li>3. Asigna los permisos de acceso a la aplicación según su responsabilidad</li>
                    <li>4. Guarda el rol y asígnalo a los usuarios correspondientes</li>
                  </ol>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => window.open("https://dashboard.base44.com", "_blank")}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Abrir Dashboard de Base44
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVITAR USUARIOS */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-green-600" />
                Proceso Completo: Invitar y Dar Acceso a Usuarios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-800 mb-1">Prerrequisito Importante</h4>
                    <p className="text-sm text-amber-700">
                      Los usuarios deben estar registrados en la entidad <strong>EmployeeMasterDatabase</strong> con su email corporativo 
                      antes de poder asignarles roles. Si un usuario no aparece en la lista, primero debes crear su registro de empleado.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Método 1: Sistema de Invitaciones de Base44 (Recomendado)</h3>
                
                <Card className="border-2 border-green-200">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-100 rounded-lg shrink-0">
                          <span className="font-bold text-green-700">1</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2">Acceder al Panel de Gestión de Usuarios</h4>
                          <p className="text-sm text-slate-600 mb-2">
                            Ve al <strong>Dashboard de Base44</strong> (panel de administración de la plataforma)
                          </p>
                          <Button variant="outline" size="sm" onClick={() => window.open('https://dashboard.base44.com', '_blank')}>
                            <Server className="w-4 h-4 mr-2" />
                            Abrir Dashboard Base44
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-100 rounded-lg shrink-0">
                          <span className="font-bold text-green-700">2</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2">Invitar Usuario por Email</h4>
                          <p className="text-sm text-slate-600 mb-2">
                            En el dashboard de Base44:
                          </p>
                          <ol className="text-sm space-y-1 text-slate-600 list-decimal list-inside">
                            <li>Ve a la sección <strong>"Users"</strong> o <strong>"Usuarios"</strong></li>
                            <li>Haz clic en <strong>"Invite User"</strong></li>
                            <li>Introduce el <strong>email corporativo</strong> del usuario</li>
                            <li>Envía la invitación</li>
                          </ol>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-100 rounded-lg shrink-0">
                          <span className="font-bold text-green-700">3</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2">Usuario Recibe Email de Invitación</h4>
                          <p className="text-sm text-slate-600 mb-2">
                            El usuario recibirá un email automático de Base44 con:
                          </p>
                          <ul className="text-sm space-y-1 text-slate-600 list-disc list-inside">
                            <li>Un <strong>enlace de activación</strong> único y seguro</li>
                            <li>Instrucciones para crear su cuenta</li>
                            <li>El enlace expira en 7 días</li>
                          </ul>
                          <div className="mt-3 p-3 bg-blue-50 rounded border">
                            <p className="text-xs font-semibold mb-1">📧 Ejemplo de Email que recibirá:</p>
                            <p className="text-xs text-slate-600">
                              "Has sido invitado a CdeApp Planning. Haz clic en el enlace para activar tu cuenta y establecer tu contraseña..."
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-100 rounded-lg shrink-0">
                          <span className="font-bold text-green-700">4</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2">Usuario Activa su Cuenta</h4>
                          <p className="text-sm text-slate-600 mb-2">
                            El usuario debe:
                          </p>
                          <ol className="text-sm space-y-1 text-slate-600 list-decimal list-inside">
                            <li>Hacer clic en el enlace del email</li>
                            <li>Establecer una <strong>contraseña segura</strong></li>
                            <li>Confirmar su email</li>
                            <li>Ya puede acceder a la aplicación</li>
                          </ol>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-100 rounded-lg shrink-0">
                          <span className="font-bold text-green-700">5</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2">Asignar Rol al Usuario</h4>
                          <p className="text-sm text-slate-600 mb-3">
                            Una vez el usuario ha activado su cuenta, asígnale un rol:
                          </p>
                          <ol className="text-sm space-y-1 text-slate-600 list-decimal list-inside">
                            <li>Ve a <strong>Dashboard de Base44 → Users</strong></li>
                            <li>Busca el usuario</li>
                            <li>Selecciona el rol apropiado (ej. <strong>admin</strong> o <strong>user</strong>)</li>
                            <li>Guarda los cambios</li>
                          </ol>
                        </div>
                          <ol className="text-sm space-y-1 text-slate-600 list-decimal list-inside mb-3">
                            <li>Ve a <strong>Configuración → Asignación de Roles</strong></li>
                            <li>Busca al usuario en la lista</li>
                            <li>Haz clic en <strong>"Asignar Rol"</strong></li>
                            <li>Selecciona el rol apropiado</li>
                            <li>Opcionalmente, añade fecha de expiración y notas</li>
                            <li>Guarda la asignación</li>
                          </ol>
                          <Link to={createPageUrl("UserRoleAssignment")}>
                            <Button className="bg-green-600 hover:bg-green-700">
                              <UserPlus className="w-4 h-4 mr-2" />
                              Asignar Roles Ahora
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <h3 className="font-semibold text-lg mt-6">Método 2: Acceso Directo (Para usuarios existentes)</h3>
                
                <Card className="border-2 border-blue-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-600 mb-4">
                      Si el usuario ya tiene cuenta en Base44 (por ejemplo, de otra aplicación):
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                          <span className="font-bold text-blue-700">1</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2">Compartir URL de la Aplicación</h4>
                          <p className="text-sm text-slate-600 mb-2">
                            Envía la URL al usuario:
                          </p>
                          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded border">
                            <code className="text-xs flex-1 break-all">{appUrl}</code>
                            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(appUrl)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                          <span className="font-bold text-blue-700">2</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2">Usuario Inicia Sesión</h4>
                          <p className="text-sm text-slate-600">
                            El usuario accede con sus credenciales existentes de Base44
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                          <span className="font-bold text-blue-700">3</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2">Asignar Rol</h4>
                          <p className="text-sm text-slate-600">
                            Asigna el rol correspondiente desde el Dashboard de Base44 (sección Users)
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-slate-50">
                <CardHeader>
                  <CardTitle className="text-base">📋 Plantilla de Email para Invitar Usuarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-white rounded border font-mono text-sm space-y-2">
                    <p><strong>Asunto:</strong> Acceso a CdeApp Planning - Sistema de Gestión</p>
                    <p className="pt-2">Hola [Nombre],</p>
                    <p>Te damos la bienvenida a <strong>CdeApp Planning</strong>, nuestra plataforma de gestión de empleados, planificación y producción.</p>
                    <p><strong>Pasos para acceder:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 pl-4">
                      <li>Recibirás un email de Base44 con un enlace de activación</li>
                      <li>Haz clic en el enlace y establece tu contraseña</li>
                      <li>Accede a la aplicación en: {appUrl}</li>
                      <li>Usa tu email corporativo y la contraseña que creaste</li>
                    </ol>
                    <p className="pt-2"><strong>Tu rol asignado:</strong> [Nombre del Rol]</p>
                    <p><strong>Funciones disponibles:</strong> [Descripción breve de lo que puede hacer]</p>
                    <p className="pt-2">Si tienes problemas para acceder, contacta con [Responsable IT/RRHH].</p>
                    <p className="pt-2">Saludos,<br/>[Tu nombre]<br/>[Tu cargo]</p>
                  </div>
                  <Button
                    className="mt-3"
                    variant="outline"
                    onClick={() => copyToClipboard(`Asunto: Acceso a CdeApp Planning

Hola [Nombre],

Te damos la bienvenida a CdeApp Planning, nuestra plataforma de gestión.

Pasos para acceder:
1. Recibirás un email de Base44 con un enlace de activación
2. Haz clic en el enlace y establece tu contraseña
3. Accede en: ${appUrl}
4. Usa tu email corporativo y la contraseña que creaste

Tu rol asignado: [Nombre del Rol]

Saludos`)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Plantilla
                  </Button>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* APP MÓVIL */}
        <TabsContent value="mobile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-600" />
                Configuración de la Aplicación Móvil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
                <h4 className="font-semibold mb-2">📱 Cómo Funciona</h4>
                <p className="text-sm text-slate-700">
                  La aplicación móvil es una <strong>Progressive Web App (PWA)</strong>. No requiere instalación desde 
                  tiendas de aplicaciones. Los usuarios pueden agregar un acceso directo a su pantalla de inicio que 
                  funciona como una app nativa.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Instrucciones para iOS (iPhone/iPad)</h3>
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-indigo-600">1</Badge>
                      <div>
                        <p className="text-sm text-slate-700">
                          Abre <strong>Safari</strong> y accede a la URL de la aplicación
                        </p>
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded block mt-1">{appUrl}</code>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-indigo-600">2</Badge>
                      <p className="text-sm text-slate-700">
                        Toca el botón <strong>Compartir</strong> (cuadrado con flecha hacia arriba) en la barra inferior
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-indigo-600">3</Badge>
                      <p className="text-sm text-slate-700">
                        Desplázate hacia abajo y selecciona <strong>"Añadir a pantalla de inicio"</strong>
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-indigo-600">4</Badge>
                      <p className="text-sm text-slate-700">
                        Confirma y verás el icono de la app en tu pantalla de inicio
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <h3 className="font-semibold text-lg mt-6">Instrucciones para Android</h3>
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-green-600">1</Badge>
                      <div>
                        <p className="text-sm text-slate-700">
                          Abre <strong>Chrome</strong> y accede a la URL de la aplicación
                        </p>
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded block mt-1">{appUrl}</code>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-green-600">2</Badge>
                      <p className="text-sm text-slate-700">
                        Verás un mensaje emergente: <strong>"Añadir [App] a la pantalla de inicio"</strong>
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-green-600">3</Badge>
                      <p className="text-sm text-slate-700">
                        Toca <strong>"Añadir"</strong> o, si no aparece el mensaje, toca el menú (⋮) y selecciona <strong>"Instalar aplicación"</strong>
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-green-600">4</Badge>
                      <p className="text-sm text-slate-700">
                        La app se instalará y aparecerá en tu pantalla de inicio
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 border-2 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-base">Funcionalidades Móviles Disponibles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                        <span><strong>Solicitud de Ausencias:</strong> Los empleados pueden solicitar ausencias/vacaciones desde el móvil</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                        <span><strong>Consulta de Planificación:</strong> Ver horarios y asignaciones personales</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                        <span><strong>Notificaciones:</strong> Recibir alertas de cambios y aprobaciones</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                        <span><strong>Perfil Personal:</strong> Ver y actualizar información personal</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                        <span><strong>Mensajería:</strong> Comunicación con el equipo</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                        <span><strong>Documentos:</strong> Acceso a manuales y documentación</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Link to={createPageUrl("MobileAppConfig")}>
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Configurar Preferencias Móviles
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SOPORTE */}
        <TabsContent value="support" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                Recursos y Soporte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Card className="border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Manuales de Usuario
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link to={createPageUrl("UserManual")}>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="w-4 h-4 mr-2" />
                      Manual de Usuario Completo
                    </Button>
                  </Link>
                  <Link to={createPageUrl("QuickStartGuide")}>
                    <Button variant="outline" className="w-full justify-start">
                      <Clock className="w-4 h-4 mr-2" />
                      Guía de Inicio Rápido
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-2 border-green-200">
                <CardHeader>
                  <CardTitle className="text-base">Problemas Comunes y Soluciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-1">❓ El usuario no recibe el email de invitación</h4>
                      <p className="text-xs text-slate-600">
                        • Verificar carpeta de spam/correo no deseado<br/>
                        • Confirmar que el email es correcto<br/>
                        • Reenviar la invitación desde el dashboard de Base44<br/>
                        • Agregar no-reply@base44.com a contactos seguros
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">❓ El usuario no aparece en la lista para asignar rol</h4>
                      <p className="text-xs text-slate-600">
                        • El usuario debe estar registrado en EmployeeMasterDatabase<br/>
                        • Verificar que el email coincida exactamente<br/>
                        • Crear el registro de empleado si no existe
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">❓ El usuario no ve ciertas secciones</h4>
                      <p className="text-xs text-slate-600">
                        • Verificar que tiene un rol asignado<br/>
                        • Revisar los permisos del rol asignado<br/>
                        • El usuario debe cerrar sesión y volver a entrar
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">❓ La app móvil no se instala</h4>
                      <p className="text-xs text-slate-600">
                        • En iOS, debe usarse Safari (no otros navegadores)<br/>
                        • En Android, debe usarse Chrome<br/>
                        • Verificar conexión a internet estable<br/>
                        • Actualizar el navegador a la última versión
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">📞 Contacto para Soporte</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 mb-3">
                    Para soporte técnico o consultas sobre la plataforma Base44:
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" onClick={() => window.open('https://base44.com/docs', '_blank')}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Documentación de Base44
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => window.open('https://base44.com/support', '_blank')}>
                      <Mail className="w-4 h-4 mr-2" />
                      Contactar Soporte Base44
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
