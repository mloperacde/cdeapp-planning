
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Smartphone, CheckCircle, Users, Download,
  AlertCircle, Zap, Bell, Calendar, ArrowLeft,
  CheckCircle2, MessageSquare, Clock, FileText, User, Award
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MobileAppConfigPage() {
  const [activeTab, setActiveTab] = useState("overview");

  const features = [
    {
      title: "Gestión de Ausencias",
      description: "Solicitud y consulta de ausencias, permisos y vacaciones",
      icon: Calendar,
      enabled: true,
      color: "green"
    },
    {
      title: "Consulta de Planning",
      description: "Visualización de turnos, horarios y asignaciones",
      icon: Clock,
      enabled: true,
      color: "blue"
    },
    {
      title: "Mensajería Interna",
      description: "Chat directo y canales de equipo/departamento",
      icon: MessageSquare,
      enabled: true,
      color: "purple"
    },
    {
      title: "Notificaciones Push",
      description: "Alertas en tiempo real sobre mensajes, calendario y documentos",
      icon: Bell,
      enabled: true,
      highlighted: true,
      color: "red"
    },
    {
      title: "Documentos",
      description: "Acceso a documentación, manuales y políticas",
      icon: FileText,
      enabled: true,
      color: "orange"
    },
    {
      title: "Perfil de Empleado",
      description: "Consulta y actualización de datos personales",
      icon: User,
      enabled: true,
      color: "indigo"
    }
  ];

  const setupSteps = [
    {
      number: 1,
      title: "Configurar Notificaciones Push",
      description: "El sistema enviará automáticamente notificaciones push para:",
      items: [
        "Nuevos mensajes en chats directos y canales",
        "Festivos y períodos de vacaciones próximos",
        "Vencimiento de documentos importantes",
        "Formaciones pendientes o caducadas",
        "Cambios en el planning o turnos"
      ],
      status: "active"
    },
    {
      number: 2,
      title: "Invitar Usuarios",
      description: "Accede a Configuración > Gestión de Usuarios App para invitar empleados",
      status: "pending"
    },
    {
      number: 3,
      title: "Configurar Roles",
      description: "Define qué puede ver y hacer cada usuario desde Configuración > Roles y Permisos",
      status: "pending"
    }
  ];

  const pushNotificationTypes = [
    {
      tipo: "Mensajes",
      icon: MessageSquare,
      color: "blue",
      triggers: [
        "Mensaje directo recibido",
        "Mención en canal de equipo",
        "Respuesta en conversación"
      ]
    },
    {
      tipo: "Calendario Laboral",
      icon: Calendar,
      color: "purple",
      triggers: [
        "Festivo próximo (7 días antes)",
        "Inicio de período de vacaciones",
        "Fin de semana largo"
      ]
    },
    {
      tipo: "Documentos",
      icon: FileText,
      color: "orange",
      triggers: [
        "Documento próximo a caducar (30 días)",
        "Nuevo documento disponible",
        "Versión actualizada de documento"
      ]
    },
    {
      tipo: "Formaciones",
      icon: Award,
      color: "green",
      triggers: [
        "Formación asignada pendiente",
        "Certificado próximo a caducar (60 días)",
        "Nueva formación disponible"
      ]
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Vista General</TabsTrigger>
            <TabsTrigger value="setup">Configuración</TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notificaciones Push
            </TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="guide">Guía</TabsTrigger>
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
                  <div key={step.number} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full ${step.status === 'active' ? 'bg-green-600' : 'bg-blue-600'} text-white font-bold flex items-center justify-center`}>
                        {step.number}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 mb-1">{step.title}</h4>
                      <p className="text-sm text-slate-600 mb-2">{step.description}</p>
                      {step.items && (
                        <ul className="text-sm text-slate-700 space-y-1 ml-4 list-disc">
                          {step.items.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      )}
                      {step.status === "active" && (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 mt-2">Activo</Badge>
                      )}
                      {step.status === "pending" && (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 mt-2">Pendiente</Badge>
                      )}
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

          <TabsContent value="notifications" className="space-y-6 mt-6">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-6 h-6 text-blue-600" />
                  Sistema de Notificaciones Push
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <h3 className="font-bold text-blue-900 mb-2">✓ Sistema Activo y Configurado</h3>
                  <p className="text-sm text-blue-800 mb-3">
                    Las notificaciones push se envían automáticamente a la app móvil de los empleados cuando ocurren eventos importantes.
                  </p>
                  <p className="text-xs text-blue-700">
                    Los usuarios pueden gestionar sus preferencias de notificación desde la app móvil en Configuración &gt; Notificaciones.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pushNotificationTypes.map((type) => {
                    const Icon = type.icon;
                    const colorClasses = {
                      blue: "from-blue-500 to-blue-600",
                      purple: "from-purple-500 to-purple-600",
                      orange: "from-orange-500 to-orange-600",
                      green: "from-green-500 to-green-600"
                    };

                    return (
                      <Card key={type.tipo} className="border-2 border-slate-200">
                        <CardContent className="p-4">
                          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[type.color]} flex items-center justify-center mb-3 shadow-lg`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="font-bold text-slate-900 mb-2">{type.tipo}</h3>
                          <div className="space-y-1">
                            {type.triggers.map((trigger, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-slate-600">{trigger}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <Card className="bg-amber-50 border-2 border-amber-300">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-amber-900 mb-2">📱 Configuración en la App Móvil</h4>
                    <p className="text-sm text-amber-800">
                      Los empleados pueden personalizar qué notificaciones recibir desde:
                    </p>
                    <p className="text-sm text-amber-800 font-mono mt-1 ml-4">
                      App Móvil → Configuración → Notificaciones
                    </p>
                  </CardContent>
                </Card>
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
