
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Cog, CalendarRange, Wrench, Settings } from "lucide-react";
import { useQuery } from '@tanstack/react-query'; // Assuming @tanstack/react-query for useQuery
import { base44 } from '@/lib/base44'; // Assuming path for base44
import { isOnline } from '@/lib/network'; // Assuming path for isOnline utility
import { offlineStorage } from '@/lib/offlineStorage'; // Assuming path for offlineStorage utility

export default function MachinesPage() {
  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await base44.entities.Machine.list('orden');
      if (isOnline()) {
        offlineStorage.saveMachines(data);
      }
      return data;
    },
    initialData: () => {
      if (!isOnline()) {
        return offlineStorage.getMachines();
      }
      return []; // Return empty array if online and no initial data from query cache
    },
  });

  const { data: maintenanceLogs = [] } = useQuery({
    queryKey: ['maintenanceLogs'],
    queryFn: async () => {
      const data = await base44.entities.MaintenanceSchedule.list('-created_date', 50);
      if (isOnline()) {
        offlineStorage.saveMaintenanceLogs(data);
      }
      return data;
    },
    enabled: isOnline(), // Only fetch if online
    initialData: () => offlineStorage.getMaintenanceLogs(), // Provide initial data from offline storage regardless of online status
  });

  const subPages = [
    {
      title: "Gestión de Máquinas",
      description: "Añadir, editar y gestionar máquinas",
      icon: Cog,
      url: createPageUrl("MachineManagement"),
      color: "blue"
    },
    {
      title: "Configuración de Procesos",
      description: "Configura procesos y asigna a máquinas",
      icon: Settings,
      url: createPageUrl("ProcessConfiguration"),
      color: "purple"
    },
    {
      title: "Planificación de Máquinas",
      description: "Activa máquinas para planning diario",
      icon: CalendarRange,
      url: createPageUrl("MachinePlanning"),
      color: "green"
    },
    {
      title: "Seguimiento de Mantenimiento",
      description: "Gestiona mantenimientos y reparaciones",
      icon: Wrench,
      url: createPageUrl("MaintenanceTracking"),
      color: "orange"
    }
  ];

  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    orange: "from-orange-500 to-orange-600",
    purple: "from-purple-500 to-purple-600"
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Cog className="w-8 h-8 text-blue-600" />
            Gestión de Máquinas
          </h1>
          <p className="text-slate-600 mt-1">
            Administra máquinas, procesos y mantenimiento
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subPages.map((page) => {
            const Icon = page.icon;
            return (
              <Link key={page.title} to={page.url}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer group">
                  <CardContent className="p-6">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${colorClasses[page.color]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-bold text-xl text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {page.title}
                    </h3>
                    <p className="text-sm text-slate-600">{page.description}</p>
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
