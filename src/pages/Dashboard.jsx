import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Users, UserX, TrendingUp, Eye } from "lucide-react";
import DashboardKPIs from "../components/dashboard/DashboardKPIs";
import DashboardWidgets from "../components/dashboard/DashboardWidgets";

export default function DashboardPage() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: userRoleAssignments = [] } = useQuery({
    queryKey: ['userRoleAssignments'],
    queryFn: () => base44.entities.UserRoleAssignment.list(),
    initialData: [],
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.list(),
    initialData: [],
  });

  const userRole = useMemo(() => {
    if (!currentUser?.id) return null;
    const assignment = userRoleAssignments.find(ra => ra.user_id === currentUser.id && ra.activo);
    if (!assignment) return null;
    return roles.find(r => r.id === assignment.role_id);
  }, [currentUser, userRoleAssignments, roles]);

  const { data: dashboardConfig } = useQuery({
    queryKey: ['dashboardRoleConfig', userRole?.id],
    queryFn: async () => {
      if (!userRole?.id) return null;
      const configs = await base44.entities.DashboardRoleConfig.filter({ role_id: userRole.id });
      return configs[0] || {
        widgets_visibles: ["tareas", "cumpleanos", "vacaciones", "departamentos", "solicitudes_ausencia"],
        kpis_visibles: ["total_empleados", "empleados_disponibles", "ausencias_activas", "solicitudes_pendientes"],
        mostrar_kpis: true,
        layout: "grid"
      };
    },
    enabled: !!userRole?.id
  });

  if (!dashboardConfig && userRole) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <Eye className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Cargando configuración del dashboard...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Dashboard Principal
          </h1>
          <p className="text-slate-600 mt-1">
            Resumen de información clave del sistema
          </p>
        </div>

        <div className="space-y-6">
          <DashboardKPIs dashboardConfig={dashboardConfig} employees={employees} />
          <DashboardWidgets dashboardConfig={dashboardConfig} employees={employees} />
        </div>
      </div>
    </div>
  );
}