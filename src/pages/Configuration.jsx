import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, Calendar, Bell, FileText, Users, Search, Database } from "lucide-react";

export default function ConfigurationPage() {
  const configModules = [
    {
      title: "Tipos de Ausencias",
      description: "Configura permisos según el Estatuto de los Trabajadores",
      icon: FileText,
      url: createPageUrl("AbsenceTypeInfo"),
      color: "blue"
    },
    {
      title: "Tipos de Ausencias (Legacy)",
      description: "Configuración básica de tipos de ausencias",
      icon: Calendar,
      url: createPageUrl("AbsenceTypeConfig"),
      color: "purple"
    },
    {
      title: "Notificaciones Email",
      description: "Configura notificaciones automáticas por email",
      icon: Bell,
      url: createPageUrl("EmailNotifications"),
      color: "green"
    },
    {
      title: "Gestión de Usuarios",
      description: "Administra usuarios y roles del sistema",
      icon: Users,
      url: createPageUrl("UserManagement"),
      color: "orange"
    },
    {
      title: "Corrección de Datos",
      description: "Corrige caracteres especiales en datos de empleados",
      icon: Search,
      url: createPageUrl("EmployeeDataCorrection"),
      color: "red"
    },
    {
      title: "Limpieza Taquillas",
      description: "Limpia comillas en identificadores de taquillas",
      icon: Database,
      url: createPageUrl("LockerDataCleanup"),
      color: "cyan"
    }
  ];

  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    green: "from-green-500 to-green-600",
    orange: "from-orange-500 to-orange-600",
    red: "from-red-500 to-red-600",
    cyan: "from-cyan-500 to-cyan-600"
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            Configuración
          </h1>
          <p className="text-slate-600 mt-1">
            Configura los ajustes del sistema
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {configModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.title} to={module.url}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer group">
                  <CardContent className="p-6">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${colorClasses[module.color]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-xl text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-sm text-slate-600">{module.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}