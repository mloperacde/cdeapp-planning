import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Settings, 
  Calendar, 
  Plane, 
  Building2, 
  Coffee, 
  UsersRound, 
  Cog as CogIcon, 
  Wrench, 
  TrendingUp, 
  ListTree, 
  Shield, 
  Mail, 
  Smartphone,
  Users,
} from "lucide-react";

export default function ConfigurationPage() {
  const configSections = [
    {
      title: "Gestión de Empleados",
      description: "Administra la base de datos de empleados",
      icon: Users,
      link: createPageUrl("Employees"),
      color: "blue",
    },
    {
      title: "Gestión de Rendimiento",
      description: "Evaluaciones y planes de mejora",
      icon: TrendingUp,
      link: createPageUrl("PerformanceManagement"),
      color: "emerald",
    },
    {
      title: "Equipos de Turno",
      description: "Configura equipos y turnos rotativos",
      icon: UsersRound,
      link: createPageUrl("TeamConfiguration"),
      color: "purple",
    },
    {
      title: "Gestión de Máquinas",
      description: "Administra máquinas y equipos",
      icon: CogIcon,
      link: createPageUrl("Machines"),
      color: "orange",
    },
    {
      title: "Configuración de Procesos",
      description: "Gestiona procesos productivos",
      icon: ListTree,
      link: createPageUrl("ProcessConfiguration"),
      color: "green",
    },
    {
      title: "Seguimiento de Mantenimiento",
      description: "Mantenimiento planificado y reparaciones",
      icon: Wrench,
      link: createPageUrl("MaintenanceTracking"),
      color: "orange",
    },
    {
      title: "Configuración de Descansos",
      description: "Gestiona turnos de descanso",
      icon: Coffee,
      link: createPageUrl("Breaks"),
      color: "amber",
    },
    {
      title: "Días Festivos",
      description: "Configura días festivos del año",
      icon: Calendar,
      link: createPageUrl("Timeline"),
      color: "sky",
    },
    {
      title: "Períodos de Vacaciones",
      description: "Gestiona períodos vacacionales",
      icon: Plane,
      link: createPageUrl("Timeline"),
      color: "indigo",
    },
    {
      title: "Gestión de Usuarios",
      description: "Administra usuarios, roles y permisos del sistema",
      icon: Shield,
      link: createPageUrl("UserManagement"),
      color: "red",
    },
    {
      title: "Notificaciones Email/SMS",
      description: "Configura notificaciones automáticas por email y SMS",
      icon: Mail,
      link: createPageUrl("EmailNotifications"),
      color: "green",
    },
    {
      title: "Aplicación Móvil",
      description: "Información y configuración de la app móvil",
      icon: Smartphone,
      link: createPageUrl("MobileAppConfig"),
      color: "blue",
    },
  ];

  const colorClasses = {
    red: "from-red-500 to-red-600",
    emerald: "from-emerald-500 to-emerald-600",
    purple: "from-purple-500 to-purple-600",
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    orange: "from-orange-500 to-orange-600",
    amber: "from-amber-500 to-amber-600",
    sky: "from-sky-500 to-sky-600",
    indigo: "from-indigo-500 to-indigo-600",
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
            Accede a todas las configuraciones y ajustes del sistema
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.title} to={section.link}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer group">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[section.color]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {section.title}
                    </h3>
                    <p className="text-sm text-slate-600">{section.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Información del Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <span className="font-medium">Versión:</span> 2.0.0
            </div>
            <div>
              <span className="font-medium">Última Actualización:</span> {new Date().toLocaleDateString('es-ES')}
            </div>
            <div>
              <span className="font-medium">Estado:</span> <span className="text-green-600 font-semibold">Operativo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}