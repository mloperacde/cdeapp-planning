import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen,
  LogIn,
  LayoutDashboard,
  Calendar,
  Users,
  Cog,
  FileText,
  Smartphone,
  Bell,
  UserCircle,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function UserManualPage() {
  const appUrl = window.location.origin;

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-6xl mx-auto">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Manual de Usuario</CardTitle>
              <p className="text-slate-600 mt-1">CdeApp Planning - Guía Completa</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="access" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="access">Acceso</TabsTrigger>
          <TabsTrigger value="navigation">Navegación</TabsTrigger>
          <TabsTrigger value="absences">Ausencias</TabsTrigger>
          <TabsTrigger value="planning">Planificación</TabsTrigger>
          <TabsTrigger value="mobile">App Móvil</TabsTrigger>
          <TabsTrigger value="tips">Consejos</TabsTrigger>
        </TabsList>

        {/* ACCESO */}
        <TabsContent value="access">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="w-5 h-5 text-green-600" />
                Cómo Acceder a la Aplicación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Primera Vez - Activar tu Cuenta</h3>
                <Card className="border-2 border-blue-200">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-blue-600">1</Badge>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">Revisa tu Email</h4>
                        <p className="text-sm text-slate-600">
                          Recibirás un email de <strong>Base44</strong> con el asunto "Invitación a CdeApp Planning"
                        </p>
                        <div className="mt-2 p-2 bg-amber-50 rounded border text-xs text-amber-700">
                          💡 Si no lo ves, revisa la carpeta de spam o correo no deseado
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-blue-600">2</Badge>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">Haz Clic en el Enlace</h4>
                        <p className="text-sm text-slate-600">
                          El email contiene un enlace de activación único. Haz clic en él.
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          ⏰ El enlace expira en 7 días. Si expira, contacta con tu administrador.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-blue-600">3</Badge>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">Establece tu Contraseña</h4>
                        <p className="text-sm text-slate-600 mb-2">
                          Crea una contraseña segura que cumpla con estos requisitos:
                        </p>
                        <ul className="text-xs space-y-1 text-slate-600 list-disc list-inside">
                          <li>Mínimo 8 caracteres</li>
                          <li>Al menos una letra mayúscula</li>
                          <li>Al menos un número</li>
                          <li>Se recomienda incluir caracteres especiales (!@#$%)</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-blue-600">4</Badge>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">¡Cuenta Activada!</h4>
                        <p className="text-sm text-slate-600">
                          Tu cuenta está lista. Ahora puedes iniciar sesión con tu email y contraseña.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <h3 className="font-semibold text-lg mt-6">Iniciar Sesión (Uso Regular)</h3>
                <Card className="border-2 border-green-200">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-green-600">1</Badge>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">Accede a la Aplicación</h4>
                        <p className="text-sm text-slate-600 mb-2">
                          Abre tu navegador y accede a:
                        </p>
                        <code className="text-sm bg-slate-100 px-3 py-2 rounded block">{appUrl}</code>
                        <p className="text-xs text-slate-500 mt-2">
                          💡 Guarda esta URL en tus favoritos para acceder rápidamente
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-green-600">2</Badge>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">Introduce tus Credenciales</h4>
                        <ul className="text-sm space-y-1 text-slate-600">
                          <li>• <strong>Email:</strong> Tu email corporativo</li>
                          <li>• <strong>Contraseña:</strong> La que estableciste al activar tu cuenta</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-green-600">3</Badge>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">Haz Clic en "Iniciar Sesión"</h4>
                        <p className="text-sm text-slate-600">
                          Serás redirigido al dashboard de la aplicación.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-amber-50 border-2 border-amber-200">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      ¿Olvidaste tu Contraseña?
                    </h4>
                    <p className="text-sm text-slate-700 mb-2">
                      En la pantalla de inicio de sesión:
                    </p>
                    <ol className="text-sm space-y-1 text-slate-700 list-decimal list-inside">
                      <li>Haz clic en <strong>"¿Olvidaste tu contraseña?"</strong></li>
                      <li>Introduce tu email</li>
                      <li>Recibirás un email para restablecer tu contraseña</li>
                      <li>Sigue las instrucciones del email</li>
                    </ol>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NAVEGACIÓN */}
        <TabsContent value="navigation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-blue-600" />
                Navegación por la Aplicación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-lg border">
                <h4 className="font-semibold mb-2">📍 Estructura del Menú Principal</h4>
                <p className="text-sm text-slate-700 mb-3">
                  El menú lateral izquierdo contiene todas las secciones de la aplicación:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { icon: LayoutDashboard, name: "Dashboard", desc: "Vista general de datos importantes" },
                    { icon: Calendar, name: "Planning", desc: "Línea de tiempo, planning diario y turnos" },
                    { icon: Users, name: "RRHH", desc: "Empleados, ausencias, onboarding, presencia" },
                    { icon: Cog, name: "Máquinas", desc: "Gestión de máquinas y mantenimiento" },
                    { icon: Users, name: "Jefes de Turno", desc: "Herramientas para responsables de equipo" },
                    { icon: FileText, name: "Informes", desc: "Reportes y análisis predictivo" }
                  ].map((item) => (
                    <div key={item.name} className="flex items-start gap-2 p-2 bg-white rounded border">
                      <item.icon className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">💡 Consejos de Navegación</h3>
                <Card>
                  <CardContent className="p-4 space-y-2 text-sm text-slate-700">
                    <p>• Las secciones con <strong>flecha ▼</strong> se pueden expandir para ver subsecciones</p>
                    <p>• Los elementos <strong>destacados en azul</strong> indican la página actual</p>
                    <p>• En móvil, usa el icono ☰ (hamburguesa) para abrir el menú</p>
                    <p>• Puedes cambiar entre tema claro/oscuro con el icono 🌙/☀️</p>
                  </CardContent>
                </Card>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg border">
                <h4 className="font-semibold mb-2">🎯 Acceso Basado en Roles</h4>
                <p className="text-sm text-slate-700 mb-2">
                  Solo verás las secciones permitidas según tu rol:
                </p>
                <ul className="text-sm space-y-1 text-slate-700">
                  <li>• <strong>Operarios:</strong> Dashboard, Ausencias (solicitar), Planificación (ver)</li>
                  <li>• <strong>Jefes de Turno:</strong> + Aprobar ausencias, Editar planificación</li>
                  <li>• <strong>Supervisores:</strong> + Gestionar máquinas, Configurar procesos</li>
                  <li>• <strong>RRHH:</strong> + Gestión completa de empleados y contratos</li>
                  <li>• <strong>Administradores:</strong> Acceso completo a todo</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUSENCIAS */}
        <TabsContent value="absences">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                Gestión de Ausencias y Vacaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">📝 Solicitar una Ausencia</h3>
                <Card className="border-2 border-orange-200">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-orange-600">1</Badge>
                      <div className="flex-1">
                        <p className="text-sm text-slate-700">
                          Ve a <strong>RRHH → Gestión de Ausencias</strong>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-orange-600">2</Badge>
                      <div className="flex-1">
                        <p className="text-sm text-slate-700">
                          Haz clic en <strong>"Nueva Ausencia"</strong>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-orange-600">3</Badge>
                      <div className="flex-1">
                        <p className="text-sm text-slate-700 mb-2">
                          Completa el formulario:
                        </p>
                        <ul className="text-xs space-y-1 text-slate-600 list-disc list-inside">
                          <li><strong>Tipo de Ausencia:</strong> Selecciona (vacaciones, permiso, baja médica, etc.)</li>
                          <li><strong>Fecha de Inicio:</strong> Cuándo comienza la ausencia</li>
                          <li><strong>Fecha de Fin:</strong> Cuándo termina (o marca "Desconocida" para bajas abiertas)</li>
                          <li><strong>Motivo:</strong> Describe brevemente el motivo</li>
                          <li><strong>Adjuntar Documentos:</strong> Justificantes médicos, etc. (si aplica)</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="shrink-0 bg-orange-600">4</Badge>
                      <div className="flex-1">
                        <p className="text-sm text-slate-700">
                          Haz clic en <strong>"Guardar"</strong>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Tu solicitud quedará en estado "Pendiente" hasta que sea aprobada
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <h3 className="font-semibold text-lg mt-6">✅ Estados de las Ausencias</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-3 flex items-center gap-2">
                      <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
                      <span className="text-sm text-slate-600">Esperando aprobación</span>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">Aprobada</Badge>
                      <span className="text-sm text-slate-600">Confirmada por supervisor</span>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-800">Rechazada</Badge>
                      <span className="text-sm text-slate-600">No aprobada</span>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 flex items-center gap-2">
                      <Badge className="bg-slate-100 text-slate-800">Cancelada</Badge>
                      <span className="text-sm text-slate-600">Cancelada por el usuario</span>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-blue-50 border">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">📅 Consultar tus Ausencias</h4>
                    <ul className="text-sm space-y-1 text-slate-700">
                      <li>• En <strong>"Gestión de Ausencias"</strong> verás todas tus ausencias</li>
                      <li>• Usa los filtros para buscar por estado, tipo o fechas</li>
                      <li>• Puedes ver el calendario de ausencias en la pestaña <strong>"Calendario"</strong></li>
                      <li>• Recibirás notificaciones cuando tu solicitud sea aprobada/rechazada</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PLANIFICACIÓN */}
        <TabsContent value="planning">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Consultar tu Planificación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-purple-50 rounded-lg border">
                <h4 className="font-semibold mb-2">🗓️ Ver tu Horario</h4>
                <p className="text-sm text-slate-700 mb-3">
                  Consulta tu planificación de trabajo en varias secciones:
                </p>
                <div className="space-y-2">
                  <Card>
                    <CardContent className="p-3">
                      <h5 className="font-semibold text-sm mb-1">Planning → Línea de Tiempo</h5>
                      <p className="text-xs text-slate-600">
                        Vista de calendario con todas las ausencias, vacaciones y festivos
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <h5 className="font-semibold text-sm mb-1">Planning → Planning Diario</h5>
                      <p className="text-xs text-slate-600">
                        Detalle día a día de asignaciones a máquinas y turnos
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <h5 className="font-semibold text-sm mb-1">Planning → Planificación de Turnos</h5>
                      <p className="text-xs text-slate-600">
                        Vista de equipos y distribución por turnos (Mañana/Tarde/Noche)
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">🔄 Intercambio de Turnos</h3>
                <Card className="border-2 border-blue-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-700 mb-3">
                      Si necesitas cambiar tu turno con un compañero:
                    </p>
                    <ol className="text-sm space-y-2 text-slate-700 list-decimal list-inside">
                      <li>Contacta directamente con tu compañero para acordar el cambio</li>
                      <li>Informa a tu Jefe de Turno o supervisor</li>
                      <li>El supervisor modificará la planificación si es aprobado</li>
                    </ol>
                    <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                      💡 Próximamente: Sistema automático de intercambio de turnos
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* APP MÓVIL */}
        <TabsContent value="mobile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-600" />
                Uso de la Aplicación Móvil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
                <h4 className="font-semibold mb-2">📱 Instalación en tu Móvil</h4>
                <p className="text-sm text-slate-700 mb-3">
                  La aplicación funciona como PWA (Progressive Web App) - no necesitas descargarla de ninguna tienda.
                </p>
              </div>

              <Tabs defaultValue="ios" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="ios">📱 iPhone (iOS)</TabsTrigger>
                  <TabsTrigger value="android">🤖 Android</TabsTrigger>
                </TabsList>

                <TabsContent value="ios">
                  <Card className="border-2 border-blue-200">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Badge className="shrink-0">1</Badge>
                        <div className="flex-1">
                          <p className="text-sm text-slate-700">
                            Abre <strong>Safari</strong> (navegador de Apple)
                          </p>
                          <p className="text-xs text-amber-600 mt-1">
                            ⚠️ Debe ser Safari, no funciona con Chrome en iOS
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge className="shrink-0">2</Badge>
                        <p className="text-sm text-slate-700">
                          Accede a: <code className="bg-slate-100 px-1 text-xs">{appUrl}</code>
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge className="shrink-0">3</Badge>
                        <p className="text-sm text-slate-700">
                          Inicia sesión normalmente
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge className="shrink-0">4</Badge>
                        <p className="text-sm text-slate-700">
                          Toca el botón <strong>Compartir</strong> 📤 (parte inferior de la pantalla)
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge className="shrink-0">5</Badge>
                        <p className="text-sm text-slate-700">
                          Desplázate hacia abajo y toca <strong>"Añadir a pantalla de inicio"</strong>
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge className="shrink-0">6</Badge>
                        <p className="text-sm text-slate-700">
                          Confirma tocando <strong>"Añadir"</strong>
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge className="shrink-0 bg-green-600">✓</Badge>
                        <p className="text-sm text-slate-700 font-semibold">
                          ¡Listo! Verás el icono de la app en tu pantalla de inicio
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="android">
                  <Card className="border-2 border-green-200">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Badge className="shrink-0">1</Badge>
                        <div className="flex-1">
                          <p className="text-sm text-slate-700">
                            Abre <strong>Chrome</strong> (navegador de Google)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge className="shrink-0">2</Badge>
                        <p className="text-sm text-slate-700">
                          Accede a: <code className="bg-slate-100 px-1 text-xs">{appUrl}</code>
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge className="shrink-0">3</Badge>
                        <p className="text-sm text-slate-700">
                          Inicia sesión normalmente
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge className="shrink-0">4</Badge>
                        <p className="text-sm text-slate-700">
                          Aparecerá un mensaje emergente: <strong>"Añadir a pantalla de inicio"</strong>
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge className="shrink-0">5</Badge>
                        <div className="flex-1">
                          <p className="text-sm text-slate-700 mb-1">
                            Si no aparece el mensaje automático:
                          </p>
                          <ul className="text-xs space-y-1 text-slate-600 list-disc list-inside">
                            <li>Toca el menú <strong>⋮</strong> (tres puntos) arriba a la derecha</li>
                            <li>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong></li>
                          </ul>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge className="shrink-0 bg-green-600">✓</Badge>
                        <p className="text-sm text-slate-700 font-semibold">
                          ¡Instalado! La app funcionará como una aplicación nativa
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="space-y-3">
                <h3 className="font-semibold">📲 Funciones Disponibles en Móvil</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { title: "Solicitar Ausencias", desc: "Pide vacaciones o permisos en cualquier momento" },
                    { title: "Ver Planificación", desc: "Consulta tus turnos y horarios" },
                    { title: "Notificaciones", desc: "Recibe alertas de aprobaciones y cambios" },
                    { title: "Perfil Personal", desc: "Actualiza tu información de contacto" },
                    { title: "Mensajería", desc: "Comunícate con tu equipo" },
                    { title: "Documentos", desc: "Accede a manuales y políticas de empresa" }
                  ].map((feature) => (
                    <Card key={feature.title}>
                      <CardContent className="p-3">
                        <h5 className="font-semibold text-sm mb-1">{feature.title}</h5>
                        <p className="text-xs text-slate-500">{feature.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Card className="bg-green-50 border">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Ventajas de la App Móvil
                  </h4>
                  <ul className="text-sm space-y-1 text-slate-700">
                    <li>✓ No ocupa espacio - funciona desde el navegador</li>
                    <li>✓ Siempre actualizada - sin necesidad de actualizaciones manuales</li>
                    <li>✓ Funciona sin conexión (funcionalidad limitada)</li>
                    <li>✓ Mismo inicio de sesión que la versión web</li>
                    <li>✓ Interfaz optimizada para pantallas pequeñas</li>
                  </ul>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONSEJOS */}
        <TabsContent value="tips">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Consejos y Mejores Prácticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">🔐 Seguridad</h4>
                  <ul className="text-sm space-y-1 text-slate-700">
                    <li>• Nunca compartas tu contraseña con nadie</li>
                    <li>• Usa una contraseña única (no la uses en otros sitios)</li>
                    <li>• Cierra sesión si usas un ordenador compartido</li>
                    <li>• Cambia tu contraseña cada 3-6 meses</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">⏰ Planificación de Ausencias</h4>
                  <ul className="text-sm space-y-1 text-slate-700">
                    <li>• Solicita ausencias con <strong>antelación</strong> (mínimo 15 días para vacaciones)</li>
                    <li>• Verifica disponibilidad de tu equipo antes de solicitar</li>
                    <li>• Adjunta justificantes médicos en bajas</li>
                    <li>• Mantén actualizada tu disponibilidad</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">📱 Uso Móvil</h4>
                  <ul className="text-sm space-y-1 text-slate-700">
                    <li>• Instala la app en tu móvil para acceso rápido</li>
                    <li>• Activa las notificaciones para recibir alertas</li>
                    <li>• Consulta tu planificación regularmente</li>
                    <li>• Usa el chat para comunicarte con tu equipo</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">❓ Ayuda y Soporte</h4>
                  <ul className="text-sm space-y-1 text-slate-700">
                    <li>• Consulta este manual para dudas básicas</li>
                    <li>• Contacta con tu Jefe de Turno para temas operativos</li>
                    <li>• Contacta con RRHH para temas de ausencias y contratos</li>
                    <li>• Reporta problemas técnicos al administrador del sistema</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-2 border-blue-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">🎯 Atajos Útiles</h4>
                  <ul className="text-sm space-y-1 text-slate-700">
                    <li>• <strong>Dashboard:</strong> Vista rápida de lo más importante</li>
                    <li>• <strong>Mi Perfil:</strong> Actualiza tus datos personales</li>
                    <li>• <strong>Notificaciones:</strong> Revisa alertas importantes</li>
                    <li>• <strong>Tema Oscuro:</strong> Actívalo con el icono 🌙 (mejor para la vista nocturna)</li>
                  </ul>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}