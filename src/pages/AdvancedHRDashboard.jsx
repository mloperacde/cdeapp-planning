import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Settings, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AbsenceTrendsWidget from "../components/dashboard/AbsenceTrendsWidget";
import ApprovalTimesWidget from "../components/dashboard/ApprovalTimesWidget";
import AbsenceDistributionWidget from "../components/dashboard/AbsenceDistributionWidget";
import DashboardCustomizer from "../components/dashboard/DashboardCustomizer";
import HRReportExporter from "../components/reports/HRReportExporter";
import { useAppData } from "../components/data/DataProvider";

export default function AdvancedHRDashboard() {
  const [showCustomizer, setShowCustomizer] = useState(false);
  
  const { user } = useAppData();

  const { data: dashboardConfig } = useQuery({
    queryKey: ['dashboardConfig', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const configs = await base44.entities.DashboardWidgetConfig.filter({ user_id: user.id });
      return configs[0] || null;
    },
    enabled: !!user?.id,
    staleTime: 15 * 60 * 1000, // Config muy estable
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const widgets = dashboardConfig?.widgets || [
    { widget_id: 'absence_trends', enabled: true, size: 'large' },
    { widget_id: 'approval_times', enabled: true, size: 'medium' },
    { widget_id: 'absence_distribution', enabled: true, size: 'medium' },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("HRDashboard")}>
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a RRHH
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Dashboard Avanzado de RRHH</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Análisis de tendencias, métricas y visualizaciones personalizadas
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowCustomizer(true)}
              className="border-blue-300"
            >
              <Settings className="w-4 h-4 mr-2" />
              Personalizar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {widgets.filter(w => w.enabled).map(widget => {
            const colSpan = widget.size === 'large' ? 'lg:col-span-2' : 
                           widget.size === 'full' ? 'lg:col-span-3' : 
                           'lg:col-span-1';
            
            return (
              <div key={widget.widget_id} className={colSpan}>
                {widget.widget_id === 'absence_trends' && (
                  <AbsenceTrendsWidget size={widget.size} />
                )}
                {widget.widget_id === 'approval_times' && (
                  <ApprovalTimesWidget size={widget.size} />
                )}
                {widget.widget_id === 'absence_distribution' && (
                  <AbsenceDistributionWidget size={widget.size} />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <HRReportExporter />
          </div>
        </div>
      </div>

      {showCustomizer && (
        <DashboardCustomizer
          open={showCustomizer}
          onClose={() => setShowCustomizer(false)}
          currentRole={user?.role || 'user'}
        />
      )}
    </div>
  );
}