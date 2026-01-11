import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, Users, Calendar, FileText, Shield, Bell, Wrench, DollarSign, Award, MessageSquare, Cog, Package, Building, ArrowLeft, UserCog, FolderOpen, Activity, Database, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
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
          title: "Ausencias Avanzado",
          description: "Flujos de aprobación, notificaciones y acumulación",
          icon: FileText,
          url: createPageUrl("AdvancedAbsenceConfig"),
          color: "purple"
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
          title: "Base de Datos Maestra",
          description: "Importar, sincronizar y gestionar archivo maestro",
          icon: Users,
          url: createPageUrl("MasterEmployeeDatabase"),
          color: "blue"
        },
        {
          title: "Auditoría de Datos",
          description: "Análisis y consolidación de datos de empleados",
          icon: Database,
          url: createPageUrl("EmployeeDataAudit"),
          color: "indigo"
        },
        {
          title: "Reiniciar Sistema",
          description: "Borrar todo y empezar de cero con archivo maestro",
          icon: Settings,
          url: createPageUrl("SystemReset"),
          color: "red"
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
        }
      ]
    },
    produccion: {
      title: "Producción",
      modules: [

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
        },
        {
          title: "Auditoría de Máquinas y Procesos",
          description: "Análisis de integridad y relaciones",
          icon: Database,
          url: createPageUrl("MachineProcessAudit"),
          color: "purple"
        },
        {
          title: "Archivo Maestro de Máquinas",
          description: "Gestión centralizada del catálogo de máquinas",
          icon: Database,
          url: createPageUrl("MachineMaster"),
          color: "blue"
        }
      ]
    },
    sistema: {
      title: "Sistema",
      modules: [
        {
          title: "Apariencia y Marca",
          description: "Personaliza logotipo, nombre y colores",
          icon: Palette,
          url: createPageUrl("BrandingConfig"),
          color: "purple"
        },
        {
          title: "Gestión de Usuarios",
          description: "Invita usuarios y gestiona roles (Admin/User)",
          icon: UserCog,
          url: createPageUrl("AppUserManagement"),
          color: "blue"
        },
        {
          title: "Gestión Documental",
          description: "Repositorio y gestión de documentos",
          icon: FolderOpen,
          url: createPageUrl("DocumentManagement"),
          color: "orange"
        },

        {
          title: "Auditoría del Sistema",
          description: "Análisis de entidades, seguridad y optimización",
          icon: Shield,
          url: createPageUrl("SystemAudit"),
          color: "red"
        },

        {
          title: "Configuración Avanzada",
          description: "Estructura organizativa, puestos y sincronización",
          icon: Settings,
          url: createPageUrl("AdvancedConfiguration"),
          color: "emerald"
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
        },
        {
          title: "Migración de Datos",
          description: "Migra datos legacy a base maestra",
          icon: Database,
          url: createPageUrl("DataMigration"),
          color: "blue"
        },
        {
          title: "Salud del Sistema",
          description: "Monitoreo y sincronización de datos",
          icon: Activity,
          url: createPageUrl("SystemHealth"),
          color: "green"
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
    teal: "from-teal-500 to-teal-600"
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button type="button" variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            Configuración del Sistema
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Accede a los diferentes módulos de configuración
          </p>
        </div>

        <div className="space-y-8">
          {Object.entries(configModules).map(([key, category]) => (
            <div key={key}>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">{category.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <Link key={module.title} to={module.url}>
                      <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm cursor-pointer group">
                        <CardContent className="p-4">
                          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[module.color]} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-blue-600 transition-colors">
                            {module.title}
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{module.description}</p>
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