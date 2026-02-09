import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";
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
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      <div className="w-full flex flex-col gap-6">
        {/* Header Estándar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Dashboard Avanzado de RRHH
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Análisis de tendencias, métricas y visualizaciones personalizadas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={createPageUrl("HRDashboard")}>
              <Button variant="ghost" size="sm" className="h-8 gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Volver</span>
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowCustomizer(true)}
              className="h-8 gap-2 border-blue-300"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Personalizar</span>
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
