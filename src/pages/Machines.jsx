import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Cog, Settings, Activity, Wrench, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProtectedPage from "../components/roles/ProtectedPage";

export default function MachinesPage() {
  return (
    <ProtectedPage module="machines" action="view">
      <MachinesContent />
    </ProtectedPage>
  );
}

function MachinesContent() {
  const subPages = [
    {
      title: "Gestión de Máquinas",
      description: "Administra el inventario completo de máquinas",
      icon: Cog,
      url: createPageUrl("MachineManagement"),
      color: "blue"
    },
    {
      title: "Configuración de Procesos",
      description: "Define procesos y requisitos de máquinas",
      icon: Settings,
      url: createPageUrl("ProcessConfiguration"),
      color: "purple"
    },
    {
      title: "Planning de Máquinas",
      description: "Planifica asignaciones de máquinas por equipo",
      icon: Activity,
      url: createPageUrl("MachinePlanning"),
      color: "emerald"
    },
    {
      title: "Seguimiento de Mantenimiento",
      description: "Programa y rastrea mantenimientos preventivos",
      icon: Wrench,
      url: createPageUrl("MaintenanceTracking"),
      color: "orange"
    }
  ];

  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    emerald: "from-emerald-500 to-emerald-600",
    orange: "from-orange-500 to-orange-600"
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <Cog className="w-8 h-8 text-blue-600" />
            Gestión de Máquinas
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Administra máquinas, procesos, planificación y mantenimiento
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subPages.map((page) => {
            const Icon = page.icon;
            return (
              <Link key={page.title} to={page.url}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm cursor-pointer group">
                  <CardContent className="p-6">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${colorClasses[page.color]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-xl text-slate-900 dark:text-slate-100 mb-2 group-hover:text-blue-600 transition-colors">
                      {page.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{page.description}</p>
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