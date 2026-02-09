import { Card, CardContent } from "@/components/ui/card";
import { Settings, Users, Calendar, FileText, Shield, Bell, Wrench, DollarSign, Award, MessageSquare, Package, ArrowLeft, UserCog, FolderOpen, Activity, Database, Palette, Factory, Gavel, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import AdminOnly from "@/components/security/AdminOnly";
export default function ConfigurationPage() {
  const configModules = {
    rrhh: {
      title: "Recursos Humanos",
      modules: [
        {
          title: "Ausencias Avanzado",
          description: "Flujos de aprobación, notificaciones y acumulación",
          icon: FileText,
          url: "/AbsenceConfiguration",
          color: "purple"
        },

        {
          title: "Calendario Laboral",
          description: "Configuración de festivos y vacaciones",
          icon: Calendar,
          url: "/WorkCalendarConfig",
          color: "green"
        },
        {
          title: "Taquillas",
          description: "Gestión de taquillas y vestuarios",
          icon: FileText,
          url: "/LockerManagement",
          color: "indigo"
        },


        {
          title: "Matriz de Habilidades",
          description: "Gestión de competencias y formación",
          icon: Award,
          url: "/SkillMatrix",
          color: "amber"
        },
        {
          title: "Plan de Incentivos",
          description: "Configura objetivos y bonificaciones",
          icon: DollarSign,
          url: "/IncentiveManagement",
          color: "emerald"
        }
      ]
    },
    produccion: {
      title: "Producción",
      modules: [
        {
          title: "Configuración de Fabricación",
          description: "Áreas, Salas, Jefes de Turno y Tareas",
          icon: Factory,
          url: "/OrganizationalStructure?tab=manufacturing",
          color: "blue"
        },
        {
          title: "Configuración de Procesos",
          description: "Define procesos y requisitos por máquina",
          icon: Settings,
          url: "/ProcessConfiguration",
          color: "purple"
        },
        {
          title: "Control de Calidad",
          description: "Gestión de inspecciones y no conformidades",
          icon: Shield,
          url: "/QualityControl",
          color: "red"
        },
        {
          title: "Mantenimiento",
          description: "Tipos de mantenimiento y configuración",
          icon: Wrench,
          url: "/MaintenanceTracking",
          color: "slate"
        },

      ]
    },
    maestras: {
      title: "Bases de Datos Maestras",
      modules: [
        {
          title: "Base de Datos Maestra de Empleados",
          description: "Importar, sincronizar y gestionar archivo maestro de empleados",
          icon: Users,
          url: "/MasterEmployeeDatabase",
          color: "blue"
        },
        {
          title: "Archivo Maestro de Máquinas",
          description: "Gestión centralizada del catálogo de máquinas",
          icon: Database,
          url: "/MachineMaster",
          color: "blue"
        },
        {
          title: "Catálogo de Artículos",
          description: "Gestión de artículos/productos fabricables",
          icon: Package,
          url: "/ArticleManagement",
          color: "teal"
        }
      ]
    },
    sistema: {
      title: "Sistema",
      modules: [
        {
          title: "Estructura Organizativa",
          description: "Departamentos, Equipos y Fabricación",
          icon: Building2,
          url: "/OrganizationalStructure",
          color: "blue"
        },
        {
          title: "Diagnóstico y Migración",
          description: "Herramientas de salud de datos y migración legacy",
          icon: Activity,
          url: "/MigrationDashboard",
          color: "red"
        },
        {
          title: "Reglas y Plantillas",
          description: "Reglas de negocio, notificaciones y plantillas",
          icon: Gavel,
          url: "/RulesAndTemplates",
          color: "emerald"
        },
        {
          title: "Apariencia y Marca",
          description: "Personaliza logotipo, nombre y colores",
          icon: Palette,
          url: "/BrandingConfig",
          color: "purple"
        },
        {
          title: "Gestión de Usuarios",
          description: "Invita usuarios y gestiona roles (Admin/User)",
          icon: UserCog,
          url: "/AppUserManagement",
          color: "blue"
        },
        {
          title: "Gestión Documental",
          description: "Repositorio y gestión de documentos",
          icon: FolderOpen,
          url: "/DocumentManagement",
          color: "orange"
        },
        {
          title: "Notificaciones",
          description: "Configura preferencias de notificaciones",
          icon: Bell,
          url: "/EmailNotifications",
          color: "purple"
        },
        {
          title: "Mensajería",
          description: "Configura tipos de mensajes y permisos de envío",
          icon: MessageSquare,
          url: "/MessagingConfiguration",
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
    teal: "from-teal-500 to-teal-600"
  };

  return (
    <AdminOnly message="Solo administradores pueden acceder al módulo de configuración">
      <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
        {/* Standard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Configuración del Sistema
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Accede a los diferentes módulos de configuración
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/Dashboard">
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
          </div>
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
    </AdminOnly>
  );
}
