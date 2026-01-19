
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Smartphone, Mail, Phone, Lock, LogIn, Calendar, MessageSquare, Bell, Copy, Clock } from "lucide-react";
import { toast } from "sonner";

export default function MobileAppGuide() {
  const appUrl = window.location.origin + "/mobile";

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Enlace copiado al portapapeles");
  };

  const steps = [
    {
      number: 1,
      title: "Configurar Equipos y Empleados",
      icon: Smartphone,
      color: "blue",
      tasks: [
        "Ir a RRHH > Gestión de Empleados",
        "Asegurar que cada empleado tiene configurado: Email y/o Teléfono Móvil",
        "Ir a RRHH > Equipos de Turno y configurar los equipos",
        "Asignar empleados a sus respectivos equipos"
      ]
    },
    {
      number: 2,
      title: "Enviar Invitaciones",
      icon: Mail,
      color: "emerald",
      tasks: [
        "Ir a Configuración > App Móvil",
        "Hacer clic en 'Invitar Empleados'",
        "Seleccionar método: Email o SMS/Teléfono",
        "Buscar y seleccionar empleados",
        "Enviar invitaciones con la guía de acceso"
      ]
    },
    {
      number: 3,
      title: "Empleados Acceden a la App",
      icon: LogIn,
      color: "purple",
      tasks: [
        `Abrir navegador móvil y visitar: ${appUrl}`,
        "Ingresar email o teléfono móvil",
        "Recibir código de verificación",
        "Ingresar código y acceder a la app"
      ]
    },
    {
      number: 4,
      title: "Verificar Funcionalidades",
      icon: CheckCircle2,
      color: "green",
      tasks: [
        "Los empleados pueden solicitar ausencias",
        "Consultar saldo de vacaciones",
        "Ver su planificación diaria/semanal",
        "Chatear con su equipo",
        "Recibir notificaciones push"
      ]
    }
  ];

  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    emerald: "from-emerald-500 to-emerald-600",
    purple: "from-purple-500 to-purple-600",
    green: "from-green-500 to-green-600",
    red: "from-red-500 to-red-600"
  };

  const features = [
    { name: "Gestión de Ausencias", icon: Calendar, enabled: true },
    { name: "Saldo de Vacaciones", icon: CheckCircle2, enabled: true },
    { name: "Consulta de Planning", icon: Clock, enabled: true },
    { name: "Mensajería Interna", icon: MessageSquare, enabled: true },
    { name: "Notificaciones Push", icon: Bell, enabled: true }
  ];

  return (
    <div className="space-y-6">
      <Card className="border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-emerald-900 mb-2">🎉 App Móvil Configurada y Lista</h2>
              <p className="text-emerald-800 mb-4">
                La aplicación móvil está completamente operativa. Los empleados pueden acceder desde cualquier navegador móvil.
              </p>
              
              <div className="bg-white rounded-lg p-4 border-2 border-emerald-200">
                <p className="text-sm font-semibold text-slate-700 mb-2">🔗 Enlace de Acceso para Empleados:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={appUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded text-sm font-mono"
                  />
                  <Button size="sm" onClick={() => copyToClipboard(appUrl)} variant="outline">
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">📋 Guía Paso a Paso - Puesta en Marcha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${colorClasses[step.color]} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-slate-800 text-white text-lg px-3 py-1">
                      Paso {step.number}
                    </Badge>
                    <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
                  </div>
                  <div className="space-y-2">
                    {step.tasks.map((task, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-slate-700">{task}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-2 border-blue-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            Métodos de Autenticación Disponibles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
            <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">Registro por Email</p>
              <p className="text-sm text-slate-600">El empleado ingresa su email y recibe código de verificación</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
            <Phone className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">Registro por Teléfono Móvil</p>
              <p className="text-sm text-slate-600">El empleado ingresa su teléfono y recibe código de verificación por SMS</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-purple-300 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-600" />
            Funcionalidades Activas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.name} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-purple-200">
                  <Icon className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-slate-900">{feature.name}</span>
                  <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-2 border-amber-300">
        <CardContent className="p-6">
          <h3 className="font-bold text-amber-900 mb-3">⚠️ Importante - Requisitos Previos</h3>
          <ul className="space-y-2 text-sm text-amber-800">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>Todos los empleados deben tener configurado email y/o teléfono móvil</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>Los equipos deben estar configurados en Equipos de Turno</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>Las ausencias y vacaciones deben estar registradas en el sistema</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>Los tipos de ausencias deben estar configurados y visibles para empleados</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
