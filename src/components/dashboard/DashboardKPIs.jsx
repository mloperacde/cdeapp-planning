import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserX, TrendingUp, Calendar } from "lucide-react";

export default function DashboardKPIs({ dashboardConfig, employees }) {
  const { data: absences = [] } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: [],
  });

  const disponibles = employees.filter(e => e.disponibilidad === "Disponible").length;
  const ausentes = employees.filter(e => e.disponibilidad === "Ausente").length;
  const pendingAbsences = absences.filter(abs => abs.estado_aprobacion === "Pendiente").length;

  const isKPIVisible = (kpiId) => {
    if (!dashboardConfig) return true;
    return dashboardConfig.mostrar_kpis && dashboardConfig.kpis_visibles?.includes(kpiId);
  };

  if (!dashboardConfig?.mostrar_kpis) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {isKPIVisible("total_empleados") && (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Empleados</p>
                <p className="text-4xl font-bold mt-2">{employees.length}</p>
              </div>
              <Users className="w-12 h-12 text-blue-200" />
            </div>
          </CardContent>
        </Card>
      )}

      {isKPIVisible("empleados_disponibles") && (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Disponibles</p>
                <p className="text-4xl font-bold mt-2">{disponibles}</p>
              </div>
              <Users className="w-12 h-12 text-green-200" />
            </div>
          </CardContent>
        </Card>
      )}

      {isKPIVisible("ausencias_activas") && (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Ausentes</p>
                <p className="text-4xl font-bold mt-2">{ausentes}</p>
              </div>
              <UserX className="w-12 h-12 text-red-200" />
            </div>
          </CardContent>
        </Card>
      )}

      {isKPIVisible("solicitudes_pendientes") && (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Solicitudes Pendientes</p>
                <p className="text-4xl font-bold mt-2">{pendingAbsences}</p>
              </div>
              <Calendar className="w-12 h-12 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}