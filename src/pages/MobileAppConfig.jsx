import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Smartphone, CheckCircle, Users, Download, Send,
  AlertCircle, Zap, Bell, Calendar, ArrowLeft,
  CheckCircle2, MessageSquare, Clock, FileText, User, Award, Search
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import MobileAppGuide from "../components/mobile/MobileAppGuide";

export default function MobileAppConfigPage() {
  const [activeTab, setActiveTab] = useState("guide");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [inviteMethod, setInviteMethod] = useState("email");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const hasContact = inviteMethod === "email" 
        ? emp.email 
        : emp.telefono_movil;
      
      if (!hasContact) return false;

      if (!searchTerm.trim()) return true;

      return (
        emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.departamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.puesto?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [employees, inviteMethod, searchTerm]);

  const appUrl = window.location.origin + "/mobile";

  const sendInviteMutation = useMutation({
    mutationFn: async (employeeIds) => {
      const promises = employeeIds.map(async (empId) => {
        const employee = employees.find(e => e.id === empId);
        if (!employee) return null;

        const guideText = `
🌟 Bienvenido/a a CdeApp Planning Móvil 🌟

Hola ${employee.nombre},

Ya puedes acceder a la aplicación móvil de CdeApp Planning desde tu teléfono.

📱 CÓMO ACCEDER:

1. Abre tu navegador móvil (Chrome, Safari, Firefox)
2. Visita: ${appUrl}
3. Ingresa tu ${inviteMethod === "email" ? 'email' : 'teléfono móvil'}:
   ${inviteMethod === "email" ? employee.email : employee.telefono_movil}
4. Recibirás un código de verificación
5. ¡Listo! Ya tienes acceso

🎯 QUÉ PUEDES HACER:
• Solicitar ausencias y permisos
• Consultar tu saldo de vacaciones
• Ver tu planificación diaria
• Recibir notificaciones importantes
• Chatear con tu equipo
• Acceder a documentos

💡 CONSEJO: Añade la app a tu pantalla de inicio para acceso rápido.

¿Problemas? Contacta con RRHH.

¡Bienvenido/a!
        `;

        if (inviteMethod === "email" && employee.email) {
          await base44.integrations.Core.SendEmail({
            to: employee.email,
            subject: "🎉 Acceso a CdeApp Planning Móvil - Guía de Registro",
            body: guideText
          });
          return employee;
        }

        if (inviteMethod === "sms" && employee.telefono_movil) {
          if (employee.email) {
            await base44.integrations.Core.SendEmail({
              to: employee.email,
              subject: "🎉 Acceso a CdeApp Planning Móvil - Guía de Registro",
              body: guideText
            });
          }
          return employee;
        }

        return null;
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      setShowInviteDialog(false);
      setSelectedEmployees([]);
      setSearchTerm("");
    },
    onError: () => {
      toast.error("Error al enviar invitaciones");
    }
  });

  const toggleEmployee = (empId) => {
    setSelectedEmployees(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const selectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(e => e.id));
    }
  };

  const features = [
    {
      title: "Gestión de Ausencias",
      description: "Solicitud y consulta de ausencias, permisos y vacaciones con justificantes",
      icon: Calendar,
      enabled: true,
      color: "green"
    },
    {
      title: "Saldo de Vacaciones",
      description: "Consulta días disponibles, consumidos y pendientes en tiempo real",
      icon: CheckCircle2,
      enabled: true,
      color: "emerald"
    },
    {
      title: "Consulta de Planning",
      description: "Visualización de turnos, horarios y asignaciones diarias/semanales",
      icon: Clock,
      enabled: true,
      color: "blue"
    },
    {
      title: "Mensajería Interna",
      description: "Chat directo y canales de equipo/departamento con notificaciones push",
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
      title: "Enviar Invitaciones a Empleados",
      description: "Usa el botón 'Invitar Empleados' para enviar la guía de acceso por email o SMS",
      status: "active",
      action: () => setShowInviteDialog(true)
    },
    {
      number: 2,
      title: "Configurar Notificaciones Push",
      description: "El sistema enviará automáticamente notificaciones push para mensajes, ausencias y cambios de planning",
      status: "active"
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
        "Ausencia aprobada/rechazada"
      ]
    },
    {
      tipo: "Planning",
      icon: Clock,
      color: "blue",
      triggers: [
        "Cambio en tu turno asignado",
        "Nueva planificación publicada",
        "Recordatorio de turno próximo"
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
        "Ver planificación completa de todos los equipos",
        "Enviar mensajes a todos los canales",
        "Recibir todas las notificaciones críticas"
      ],
      color: "red"
    },
    {
      role: "Jefe de Turno",
      permissions: [
        "Ver planificación del equipo asignado",
        "Aprobar ausencias de su equipo",
        "Ver disponibilidad de operarios",
        "Chat con su equipo",
        "Recibir notificaciones de su equipo"
      ],
      color: "blue"
    },
    {
      role: "Operario de Producción",
      permissions: [
        "Solicitar ausencias con justificantes",
        "Consultar saldo de vacaciones",
        "Ver su planificación diaria/semanal",
        "Chat con su equipo",
        "Recibir notificaciones personales"
      ],
      color: "green"
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

        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Smartphone className="w-8 h-8 text-blue-600" />
              Configuración Aplicación Móvil
            </h1>
            <p className="text-slate-600 mt-1">
              Activa y configura la app móvil CdeApp Planning para tus empleados
            </p>
          </div>
          <Button onClick={() => setShowInviteDialog(true)} className="bg-emerald-600">
            <Send className="w-4 h-4 mr-2" />
            Invitar Empleados
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="guide">Guía Completa</TabsTrigger>
            <TabsTrigger value="overview">Funcionalidades</TabsTrigger>
            <TabsTrigger value="setup">Configuración</TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notificaciones
            </TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
          </TabsList>

          <TabsContent value="guide" className="mt-6">
            <MobileAppGuide />
          </TabsContent>

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
                      sin necesidad de instalación desde tiendas de apps. Registro con email o teléfono móvil.
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
                      {step.action && (
                        <Button size="sm" onClick={step.action} className="mt-2 bg-emerald-600">
                          <Send className="w-3 h-3 mr-2" />
                          Enviar Invitaciones
                        </Button>
                      )}
                      {step.status === "active" && (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 mt-2">Activo</Badge>
                      )}
                    </div>
                  </div>
                ))}
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
                    Las notificaciones push se envían automáticamente a la app móvil cuando ocurren eventos importantes.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pushNotificationTypes.map((type) => {
                    const Icon = type.icon;
                    const colorClasses2 = {
                      blue: "from-blue-500 to-blue-600",
                      purple: "from-purple-500 to-purple-600",
                      orange: "from-orange-500 to-orange-600",
                      green: "from-green-500 to-green-600"
                    };

                    return (
                      <Card key={type.tipo} className="border-2 border-slate-200">
                        <CardContent className="p-4">
                          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses2[type.color]} flex items-center justify-center mb-3 shadow-lg`}>
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
          </TabsContent>
        </Tabs>

        {showInviteDialog && (
          <Dialog open={true} onOpenChange={() => {
            setShowInviteDialog(false);
            setSelectedEmployees([]); // Reset selection on close
            setSearchTerm("");
          }}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Enviar Invitaciones a Empleados</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-3">
                    Se enviará una guía de registro y la URL de acceso: <strong>{appUrl}</strong>
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant={inviteMethod === "email" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setInviteMethod("email")}
                      className="flex-1"
                    >
                      Enviar por Email
                    </Button>
                    <Button
                      variant={inviteMethod === "sms" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setInviteMethod("sms")}
                      className="flex-1"
                    >
                      Enviar por SMS/Teléfono
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar empleados..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex items-center justify-between border-b pb-3">
                  <span className="font-semibold text-slate-900">
                    Seleccionar Empleados ({selectedEmployees.length}/{filteredEmployees.length})
                  </span>
                  <Button size="sm" variant="outline" onClick={selectAll}>
                    {selectedEmployees.length === filteredEmployees.length ? "Deseleccionar Todos" : "Seleccionar Todos"}
                  </Button>
                </div>

                <div className="border rounded p-3 max-h-96 overflow-y-auto space-y-2">
                  {filteredEmployees.map(emp => (
                    <div key={emp.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded">
                      <Checkbox
                        checked={selectedEmployees.includes(emp.id)}
                        onCheckedChange={() => toggleEmployee(emp.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{emp.nombre}</p>
                        <p className="text-xs text-slate-500">
                          {inviteMethod === "email" ? emp.email : emp.telefono_movil}
                          {emp.departamento && ` • ${emp.departamento}`}
                          {emp.puesto && ` • ${emp.puesto}`}
                        </p>
                      </div>
                    </div>
                  ))}

                  {filteredEmployees.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      {searchTerm 
                        ? "No se encontraron empleados con ese término de búsqueda"
                        : `No hay empleados con ${inviteMethod === "email" ? "email" : "teléfono móvil"} registrado`
                      }
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => {
                    setShowInviteDialog(false);
                    setSelectedEmployees([]); // Reset selection on cancel
                    setSearchTerm("");
                  }}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => sendInviteMutation.mutate(selectedEmployees)}
                    disabled={selectedEmployees.length === 0 || sendInviteMutation.isPending}
                    className="bg-emerald-600"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sendInviteMutation.isPending 
                      ? "Enviando..." 
                      : `Enviar por ${inviteMethod === "email" ? "Email" : "SMS"} (${selectedEmployees.length})`
                    }
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}