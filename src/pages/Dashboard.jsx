import { useMemo, useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  CalendarDays, 
  Wrench, 
  Settings, 
  LayoutDashboard,
  AlertCircle
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAppData } from "../components/data/DataProvider";
import NotificationCenter from "../components/notifications/NotificationCenter";
import { useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/mobile/PullToRefresh";

// Lazy-load heavy sections
const TimelineSection = lazy(() => import("@/components/dashboard/DashboardTimeline"));
const ShiftSwapWidget = lazy(() => import("@/components/dashboard/ShiftSwapWidget"));
const WorkCalendar = lazy(() => import("@/components/absences/WorkCalendar"));

function SectionSkeleton({ height = "h-48" }) {
  return <div className={`${height} rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse`} aria-hidden="true" />;
}

export default function Dashboard() {
  const { user, employees, absences, maintenance: maintenanceSchedules } = useAppData();
  const [searchParams] = useSearchParams();
  const showNotifications = searchParams.get('notifications') === 'true';
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    await queryClient.refetchQueries({ type: 'active' });
  }, [queryClient]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeAbsences = absences.filter(a => {
      const start = new Date(a.fecha_inicio);
      const end = a.fecha_fin ? new Date(a.fecha_fin) : null;
      return start <= today && (!end || end >= today) && a.estado_aprobacion === 'Aprobada';
    }).length;

    const pendingAbsences = absences.filter(a => a.estado_aprobacion === 'Pendiente').length;

    const upcomingMaintenance = maintenanceSchedules.filter(m => {
      const scheduled = new Date(m.fecha_programada);
      const diffDays = Math.ceil((scheduled - today) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7 && m.estado !== 'Completado';
    }).length;

    return {
      totalEmployees: employees.length,
      activeAbsences,
      pendingAbsences,
      upcomingMaintenance
    };
  }, [employees, absences, maintenanceSchedules]);

  const quickActions = [
    {
      title: "Empleados",
      description: "Gestión de empleados",
      icon: Users,
      color: "blue",
      url: createPageUrl("MasterEmployeeDatabase")
    },
    {
      title: "Ausencias",
      description: "Gestionar ausencias",
      icon: CalendarDays,
      color: "green",
      url: createPageUrl("AbsenceManagement")
    },
    {
      title: "Mantenimiento",
      description: "Seguimiento de mantenimiento",
      icon: Wrench,
      color: "orange",
      url: createPageUrl("MaintenanceTracking")
    },
    {
      title: "Timeline",
      description: "Planificación semanal",
      icon: CalendarDays,
      color: "teal",
      url: createPageUrl("Timeline")
    },
    {
      title: "Configuración",
      description: "Ajustes del sistema",
      icon: Settings,
      color: "purple",
      url: createPageUrl("Configuration")
    }
  ];

  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    orange: "from-orange-500 to-orange-600",
    teal: "from-teal-500 to-teal-600",
    purple: "from-purple-500 to-purple-600"
  };

  return (
    <div className="h-full flex flex-col p-3 md:p-6 gap-4 md:gap-6 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg" aria-hidden="true">
            <LayoutDashboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Panel de Control
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Bienvenido{user?.full_name ? `, ${user.full_name}` : ''}
            </p>
          </div>
        </div>
      </header>

      {showNotifications && user && (
        <NotificationCenter currentEmployee={user} />
      )}

      <div className="flex flex-col gap-4 md:gap-6">
        {/* Stats grid – 2 cols on mobile, 4 on desktop */}
        <section aria-label="Estadísticas generales" className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard label="Total Empleados" value={stats.totalEmployees} icon={Users} colorFrom="from-blue-50" colorTo="to-blue-100" borderColor="border-blue-200" textColor="text-blue-700" valueColor="text-blue-900" iconColor="text-blue-600" />
          <StatCard label="Ausencias Activas" value={stats.activeAbsences} icon={CalendarDays} colorFrom="from-green-50" colorTo="to-green-100" borderColor="border-green-200" textColor="text-green-700" valueColor="text-green-900" iconColor="text-green-600" />
          <StatCard label="Pendientes Aprobación" value={stats.pendingAbsences} icon={AlertCircle} colorFrom="from-orange-50" colorTo="to-orange-100" borderColor="border-orange-200" textColor="text-orange-700" valueColor="text-orange-900" iconColor="text-orange-600" />
          <StatCard label="Mantenimiento (7d)" value={stats.upcomingMaintenance} icon={Wrench} colorFrom="from-purple-50" colorTo="to-purple-100" borderColor="border-purple-200" textColor="text-purple-700" valueColor="text-purple-900" iconColor="text-purple-600" />
        </section>

        {/* Quick actions – horizontal scroll on mobile */}
        <section aria-label="Accesos rápidos">
          <h2 className="text-base md:text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">Accesos Rápidos</h2>
          <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:overflow-visible scrollbar-hide">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.title}
                  to={action.url}
                  className="flex-shrink-0 w-36 md:w-auto"
                  aria-label={action.title}
                >
                  <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 bg-white dark:bg-slate-800 cursor-pointer group active:scale-95">
                    <CardContent className="p-4 md:p-6">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br ${colorClasses[action.color]} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg`} aria-hidden="true">
                        <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-0.5 group-hover:text-blue-600 transition-colors leading-tight">
                        {action.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block">{action.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          <div className="lg:col-span-1 min-h-[300px] md:h-[600px]">
            <Suspense fallback={<SectionSkeleton height="h-full" />}>
              <ShiftSwapWidget />
            </Suspense>
          </div>
          <div className="lg:col-span-2">
            <h2 className="text-base md:text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">Calendario Laboral</h2>
            <Suspense fallback={<SectionSkeleton height="h-64" />}>
              <WorkCalendar />
            </Suspense>
          </div>
        </div>

        {/* Timeline – lazy */}
        <Suspense fallback={<SectionSkeleton height="h-64" />}>
          <TimelineSection />
        </Suspense>
      </div>
    </div>
  );
}

// ── Stat card extracted for reuse and clarity ──────────────────────────────────
function StatCard({ label, value, icon: Icon, colorFrom, colorTo, borderColor, textColor, valueColor, iconColor }) {
  return (
    <Card className={`bg-gradient-to-br ${colorFrom} ${colorTo} ${borderColor}`} role="region" aria-label={label}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-xs md:text-sm ${textColor} font-medium leading-tight`}>{label}</p>
            <p className={`text-2xl md:text-3xl font-bold ${valueColor} mt-1`} aria-live="polite">{value}</p>
          </div>
          <Icon className={`w-8 h-8 md:w-12 md:h-12 ${iconColor} flex-shrink-0`} aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}