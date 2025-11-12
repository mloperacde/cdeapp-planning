import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { 
  UserCog, 
  UsersRound, 
  RefreshCw,
  Users as UsersIcon,
  Clock,
  KeyRound
} from "lucide-react";

export default function ShiftManagersPage() {
  const subPages = [
    {
      title: "Equipos de Turno",
      description: "Configura equipos y turnos rotativos",
      icon: UsersRound,
      url: createPageUrl("TeamConfiguration"),
      color: "purple"
    },
    {
      title: "Asignaciones Operarios Máquinas",
      description: "Asigna operarios a máquinas por equipo",
      icon: UserCog,
      url: createPageUrl("MachineAssignments"),
      color: "blue"
    },
    {
      title: "Intercambio de Turnos",
      description: "Gestiona solicitudes de intercambio entre operarios",
      icon: RefreshCw,
      url: createPageUrl("ShiftManagement"),
      color: "green"
    },
    {
      title: "Gestión de Taquillas",
      description: "Asigna y gestiona taquillas de vestuarios",
      icon: KeyRound,
      url: createPageUrl("LockerManagement"),
      color: "orange"
    }
  ];

  const colorClasses = {
    purple: "from-purple-500 to-purple-600",
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    orange: "from-orange-500 to-orange-600"
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <UsersIcon className="w-8 h-8 text-blue-600" />
            Jefes de Turno
          </h1>
          <p className="text-slate-600 mt-1">
            Gestión completa de equipos, asignaciones e intercambios de turnos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {subPages.map((page) => {
            const Icon = page.icon;
            return (
              <Link key={page.title} to={page.url}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer group">
                  <CardContent className="p-6">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${colorClasses[page.color]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-xl text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {page.title}
                    </h3>
                    <p className="text-sm text-slate-600">{page.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Información para Jefes de Turno
          </h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• <strong>Equipos de Turno:</strong> Configura los equipos rotativos y sus horarios semanales</p>
            <p>• <strong>Asignaciones:</strong> Distribuye operarios en máquinas según habilidades y disponibilidad</p>
            <p>• <strong>Intercambios:</strong> Gestiona y aprueba solicitudes de cambio de turno entre operarios</p>
            <p>• <strong>Taquillas:</strong> Asigna taquillas de vestuarios y gestiona reasignaciones</p>
            <p>• Todas las acciones se sincronizan automáticamente con el sistema de planning</p>
          </div>
        </div>
      </div>
    </div>
  );
}