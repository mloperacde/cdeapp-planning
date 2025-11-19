import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, Users, Calendar, FileText, Shield, Bell, Wrench, DollarSign, Award, MessageSquare, Cog, Package, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ConfigurationPage() {
  const configModules = {
    rrhh: {
      title: "Recursos Humanos",
      modules: [
        {
          title: "Tipos de Ausencias",
          description: "Configura tipos de ausencias y permisos",
          icon: Calendar,
          url: createPageUrl("AbsenceTypeConfig"),
          color: "red"
        },
        {
          title: "Configuración de Equipos",
          description: "Gestiona equipos y turnos rotativos",
          icon: Users,
          url: createPageUrl("TeamConfiguration"),
          color: "green"
        },
        {
          title: "Calendario Laboral",
          description: "Configuración de festivos y vacaciones",
          icon: Calendar,
          url: createPageUrl("WorkCalendarConfig"),
          color: "green"
        },
        {
          title: "Taquillas",
          description: "Gestión de taquillas y vestuarios",
          icon: FileText,
          url: createPageUrl("LockerManagement"),
          color: "indigo"
        },
        {
          title: "Matriz de Habilidades",
          description: "Gestión de competencias y formación",
          icon: Award,
          url: createPageUrl("SkillMatrix"),
          color: "amber"
        },
        {
          title: "Plan de Incentivos",
          description: "Configura objetivos y bonificaciones",
          icon: DollarSign,
          url: createPageUrl("IncentiveManagement"),
          color: "emerald"
        },
        {
          title: "Gestión de Puestos",
          description: "Configura puestos de trabajo",
          icon: Award,
          url: createPageUrl("PositionManagement"),
          color: "blue"
        },
        {
          title: "Gestión de Departamentos",
          description: "Configura departamentos de la empresa",
          icon: Users,
          url: createPageUrl("DepartmentManagement"),
          color: "indigo"
        },
        {
          title: "Gestión de Turnos",
          description: "Configura turnos de trabajo y horarios",
          icon: Clock,
          url: createPageUrl("ShiftManagement"),
          color: "amber"
        }
      ]
    },
    produccion: {
      title: "Producción",
      modules: [
        {
          title: "Archivo Maestro de Máquinas",
          description: "Gestión centralizada del catálogo de máquinas",
          icon: Cog,
          url: createPageUrl("MasterMachineView"),
          color: "slate"
        },
        {
          title: "Configuración de Procesos",
          description: "Define procesos y requisitos por máquina",
          icon: Settings,
          url: createPageUrl("ProcessConfiguration"),
          color: "purple"
        },
        {
          title: "Catálogo de Artículos",
          description: "Gestión de artículos/productos fabricables",
          icon: Package,
          url: createPageUrl("ArticleManagement"),
          color: "teal"
        },
        {
          title: "Mantenimiento",
          description: "Tipos de mantenimiento y configuración",
          icon: Wrench,
          url: createPageUrl("MaintenanceTracking"),
          color: "slate"
        }
      ]
    },
    sistema: {
      title: "Sistema",
      modules: [
        {
          title: "Roles y Permisos",
          description: "Gestiona roles de usuario y permisos de acceso",
          icon: Shield,
          url: createPageUrl("RoleManagement"),
          color: "blue"
        },
        {
          title: "Notificaciones",
          description: "Configura preferencias de notificaciones",
          icon: Bell,
          url: createPageUrl("Notifications"),
          color: "purple"
        },
        {
          title: "Mensajería",
          description: "Configura tipos de mensajes y permisos de envío",
          icon: MessageSquare,
          url: createPageUrl("MessagingConfig"),
          color: "indigo"
        }
      ]
    }
  };

  const colorClasses = {
    red: "from-red-500 to-red-600",
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    indigo: "from-indigo-500 to-indigo-600",
    slate: "from-slate-500 to-slate-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
    teal: "from-teal-500 to-teal-600",
    green: "from-green-500 to-green-600"
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            Configuración del Sistema
          </h1>
          <p className="text-slate-600 mt-1">
            Accede a los diferentes módulos de configuración
          </p>
        </div>

        <div className="space-y-8">
          {Object.entries(configModules).map(([key, category]) => (
            <div key={key}>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">{category.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <Link key={module.title} to={module.url}>
                      <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer group">
                        <CardContent className="p-4">
                          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[module.color]} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                            {module.title}
                          </h3>
                          <p className="text-xs text-slate-600">{module.description}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}