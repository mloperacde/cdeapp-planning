import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Smartphone, CheckCircle, Settings, Users, 
  Download, QrCode, AlertCircle, Zap, Lock, 
  Bell, Calendar, Wrench, ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MobileAppConfigPage() {
  const [activeTab, setActiveTab] = useState("overview");

  const features = [
    {
      title: "Autenticación Segura",
      description: "Registro mediante número de teléfono con código SMS temporal",
      icon: Lock,
      color: "blue"
    },
    {
      title: "Solicitud de Ausencias",
      description: "Comunica ausencias con adjuntos de documentos justificativos",
      icon: Calendar,
      color: "green"
    },
    {
      title: "Consulta de Asignaciones",
      description: "Visualiza tu asignación diaria de máquinas y planificación",
      icon: Settings,
      color: "purple"
    },
    {
      title: "Gestión de Mantenimiento",
      description: "Actualiza estado de máquinas y órdenes de trabajo",
      icon: Wrench,
      color: "orange"
    },
    {
      title: "Notificaciones Push",
      description: "Recibe alertas en tiempo real sobre cambios importantes",
      icon: Bell,
      color: "red"
    }
  ];

  const setupSteps = [
    {
      step: 1,
      title: "Prepara los Datos de Empleados",
      description: "Asegúrate de que todos los empleados tienen números de teléfono actualizados en su ficha",
      action: "Ir a Vista Maestra",
      url: createPageUrl("MasterEmployeeView"),
      status: "required"
    },
    {
      step: 2,
      title: "Configura Usuarios del Sistema",
      description: "Invita a los empleados que necesitan acceso a la aplicación",
      action: "Gestionar Usuarios",
      url: createPageUrl("AppUserManagement"),
      status: "required"
    },
    {
      step: 3,
      title: "Activa Notificaciones",
      description: "Configura qué notificaciones se enviarán a la app móvil",
      action: "Configurar Notificaciones",
      url: createPageUrl("EmailNotifications"),
      status: "optional"
    },
    {
      step: 4,
      title: "Comunica a los Empleados",
      description: "Informa a tu equipo sobre la disponibilidad de la app móvil",
      status: "manual"
    }
  ];

  const roles = [
    {
      role: "Admin / Supervisor",
      permissions: [
        "Acceso completo a todos los módulos",
        "Ver y aprobar ausencias de todos los empleados",
        "Actualizar estado de todas las máquinas",
        "Gestionar órdenes de trabajo",
        "Recibir todas las notificaciones críticas",
        "Modificar planificación y asignaciones"
      ],
      color: "red"
    },
    {
      role: "Técnico de Mantenimiento",
      permissions: [
        "Actualizar estado de máquinas asignadas",
        "Registrar y completar órdenes de mantenimiento",
        "Firmar órdenes de trabajo",
        "Solicitar ausencias propias",
        "Ver asignaciones de mantenimiento",
        "Recibir alertas de mantenimiento"
      ],
      color: "orange"
    },
    {
      role: "Jefe de Turno",
      permissions: [
        "Ver planificación del equipo asignado",
        "Aprobar ausencias de su equipo",
        "Ver disponibilidad de operarios",
        "Actualizar asignaciones de su turno",
        "Recibir notificaciones de su equipo"
      ],
      color: "blue"
    },
    {
      role: "Operario de Producción",
      permissions: [
        "Ver su asignación diaria de máquinas",
        "Solicitar ausencias con justificantes",
        "Ver su horario y turno",
        "Consultar su información de taquilla",
        "Recibir notificaciones de cambios en su planificación"
      ],
      color: "green"
    },
    {
      role: "Miembro de Comité",
      permissions: [
        "Acceso a documentación PRL",
        "Gestionar horas sindicales",
        "Ver evaluaciones de riesgo",
        "Acceder a información de emergencias",
        "Solicitar ausencias (permisos sindicales)"
      ],
      color: "purple"
    }
  ];

  const colorClasses = {
    red: "bg-red-100 text-red-800 border-red-300",
    orange: "bg-orange-100 text-orange-800 border-orange-300",
    blue: "bg-blue-100 text-blue-800 border-blue-300",
    green: "bg-green-100 text-green-800 border-green-300",
    purple: "bg-purple-100 text-purple-800 border-purple-300"
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
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
            <Smartphone className="w-8 h-8 text-blue-600" />
            Configuración Aplicación Móvil
          </h1>
          <p className="text-slate-600 mt-1">
            Activa y configura la app móvil CDE PlanApp para tus empleados
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <Smartphone className="w-4 h-4 mr-2" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="setup">
              <Zap className="w-4 h-4 mr-2" />
              Activación
            </TabsTrigger>
            <TabsTrigger value="roles">
              <Users className="w-4 h-4 mr-2" />
              Roles y Permisos
            </TabsTrigger>
            <TabsTrigger value="guide">
              <Download className="w-4 h-4 mr-2" />
              Guía Usuario
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader>
                <CardTitle>Funcionalidades de la App Móvil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.title} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-${feature.color}-500 to-${feature.color}-600 flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{feature.title}</h3>
                        <p className="text-sm text-slate-600">{feature.description}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-green-900 mb-2">Estado: PWA (Progressive Web App)</h3>
                    <p className="text-sm text-green-800">
                      La aplicación móvil funciona como PWA, accesible desde cualquier navegador móvil 
                      sin necesidad de instalación desde tiendas de apps. Los usuarios pueden añadirla 
                      a su pantalla de inicio para una experiencia similar a una app nativa.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="setup" className="space-y-6 mt-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Pasos para Activar la App Móvil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {setupSteps.map((step) => (
                  <div key={step.step} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                        {step.step}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 mb-1">{step.title}</h4>
                          <p className="text-sm text-slate-600 mb-2">{step.description}</p>
                          {step.status === "required" && (
                            <Badge className="bg-red-100 text-red-800 mb-2">Requerido</Badge>
                          )}
                          {step.status === "optional" && (
                            <Badge className="bg-amber-100 text-amber-800 mb-2">Opcional</Badge>
                          )}
                        </div>
                        {step.action && step.url && (
                          <Link to={step.url}>
                            <Button size="sm" className="ml-4">
                              {step.action}
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300">
              <CardContent className="p-6">
                <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Próximas Mejoras Planificadas
                </h3>
                <ul className="text-sm text-purple-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Apps nativas iOS y Android con funcionalidad offline</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Escaneo de códigos QR para fichaje y acceso a máquinas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Geolocalización para control de presencia</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Chat integrado para comunicación de equipo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Firma digital avanzada con certificado</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-6 mt-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Permisos por Rol en la App Móvil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {roles.map((roleInfo) => (
                  <Card key={roleInfo.role} className={`border-2 ${colorClasses[roleInfo.color]}`}>
                    <CardContent className="p-4">
                      <h4 className="font-bold text-lg text-slate-900 mb-3">{roleInfo.role}</h4>
                      <ul className="space-y-2">
                        {roleInfo.permissions.map((perm, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-slate-700">{perm}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-2 border-blue-300">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-900 mb-2">💡 Recomendación de Accesos</h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <p><strong>Acceso Completo:</strong> Gerencia, Jefes de Departamento, RRHH</p>
                  <p><strong>Acceso Técnico:</strong> Departamento de Mantenimiento completo</p>
                  <p><strong>Acceso Limitado:</strong> Jefes de Turno para su equipo específico</p>
                  <p><strong>Acceso Básico:</strong> Operarios solo para consulta y solicitud de ausencias</p>
                  <p><strong>Acceso PRL:</strong> Miembros de comités de seguridad y prevención</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guide" className="space-y-6 mt-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Guía de Registro para Empleados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                  <Badge className="bg-blue-600 text-white text-lg px-3 py-1 flex-shrink-0">1</Badge>
                  <div>
                    <h4 className="font-semibold text-slate-900">Accede desde tu Móvil</h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Abre el navegador en tu teléfono móvil (Chrome, Safari, Firefox)
                    </p>
                    <p className="text-xs text-slate-500 mt-2 font-mono bg-white p-2 rounded border">
                      URL: [TU_DOMINIO]/app
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                  <Badge className="bg-blue-600 text-white text-lg px-3 py-1 flex-shrink-0">2</Badge>
                  <div>
                    <h4 className="font-semibold text-slate-900">Ingresa tu Email o Teléfono</h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Debe coincidir exactamente con el registrado en tu ficha de empleado
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                  <Badge className="bg-blue-600 text-white text-lg px-3 py-1 flex-shrink-0">3</Badge>
                  <div>
                    <h4 className="font-semibold text-slate-900">Verifica tu Identidad</h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Recibirás un código de verificación por email o SMS (válido 10 minutos)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                  <Badge className="bg-blue-600 text-white text-lg px-3 py-1 flex-shrink-0">4</Badge>
                  <div>
                    <h4 className="font-semibold text-slate-900">Añade a Pantalla de Inicio (Opcional)</h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Para una mejor experiencia, añade la app a tu pantalla de inicio:
                    </p>
                    <ul className="text-xs text-slate-600 mt-2 space-y-1 ml-4">
                      <li><strong>iOS Safari:</strong> Menú → Añadir a Pantalla de Inicio</li>
                      <li><strong>Android Chrome:</strong> Menú → Añadir a Pantalla de Inicio</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border-2 border-green-300">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-green-900">¡Listo!</h4>
                    <p className="text-sm text-green-800">
                      Ya tienes acceso a la app móvil. Verás las funciones disponibles según tu rol.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-50 border-2 border-amber-300">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-900 mb-2">Soporte Técnico</h3>
                    <p className="text-sm text-amber-800">
                      Si tienes problemas para acceder:
                    </p>
                    <ul className="text-sm text-amber-800 mt-2 space-y-1 list-disc list-inside ml-4">
                      <li>Verifica que tu email/teléfono está actualizado en tu ficha</li>
                      <li>Asegúrate de tener buena conexión a internet</li>
                      <li>Prueba desde otro navegador móvil</li>
                      <li>Contacta con RRHH o tu supervisor</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}