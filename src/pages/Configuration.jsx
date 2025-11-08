import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings, Calendar, Plane, Building2, Coffee, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ConfigurationPage() {
  const configSections = [
    {
      title: "Empleados",
      description: "Gestiona la base de datos de empleados, tipos de jornada y turnos",
      icon: Building2,
      link: createPageUrl("Employees"),
      color: "blue",
    },
    {
      title: "Equipos de Turno",
      description: "Configura los equipos y sus turnos rotativos semanales",
      icon: UsersRound,
      link: createPageUrl("TeamConfiguration"),
      color: "purple",
    },
    {
      title: "Máquinas",
      description: "Configura las máquinas y asignaciones de operadores",
      icon: Settings,
      link: createPageUrl("Machines"),
      color: "indigo",
    },
    {
      title: "Turnos de Descanso",
      description: "Configura los horarios y grupos de descanso",
      icon: Coffee,
      link: createPageUrl("Breaks"),
      color: "orange",
    },
    {
      title: "Días Festivos",
      description: "Gestiona los días festivos del calendario",
      icon: Calendar,
      link: createPageUrl("Timeline"),
      color: "red",
    },
    {
      title: "Vacaciones",
      description: "Configura períodos de vacaciones por empleado",
      icon: Plane,
      link: createPageUrl("Timeline"),
      color: "sky",
    },
  ];

  const colorClasses = {
    blue: "from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
    purple: "from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
    indigo: "from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700",
    green: "from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
    orange: "from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
    red: "from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
    sky: "from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700",
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-blue-600" />
            Configuración
          </h1>
          <p className="text-slate-600">
            Accede a todos los módulos de configuración de la aplicación
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {configSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.title} to={section.link}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer group">
                  <CardHeader>
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colorClasses[section.color]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                      {section.title}
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                      {section.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>

        <Card className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Información del Sistema</CardTitle>
            <CardDescription className="text-blue-700">
              WorkFlow Pro - Sistema de gestión de turnos y disponibilidad
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-blue-800">
            <ul className="space-y-2">
              <li>• Gestión completa de empleados con campos personalizables</li>
              <li>• Sistema de equipos de turno rotativos configurables</li>
              <li>• Control de descansos por equipos de máquinas</li>
              <li>• Visualización de disponibilidad en tiempo real</li>
              <li>• Gestión de festivos y vacaciones</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}