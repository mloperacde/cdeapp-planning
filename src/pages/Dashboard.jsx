import { useMemo, lazy, Suspense, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users, CalendarDays, Wrench, Settings, LayoutDashboard, AlertCircle,
  BarChart3, ClipboardCheck, Factory, Clock, FileText
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAppData } from "../components/data/DataProvider";
import NotificationCenter from "../components/notifications/NotificationCenter";
import AnnouncementBoard from "@/components/dashboard/AnnouncementBoard";
import CalendarDetails from "@/components/dashboard/CalendarDetails";

const ShiftSwapWidget = lazy(() => import("@/components/dashboard/ShiftSwapWidget"));
const WorkCalendar = lazy(() => import("@/components/absences/WorkCalendar"));

function SectionSkeleton({ height = "h-48" }) {
  return <div className={`${height} rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse`} aria-hidden="true" />;
}

const ALL_QUICK_ACTIONS = [
  { title: "Empleados",       description: "Gestión de empleados",       icon: Users,          color: "blue",   url: "MasterEmployeeDatabase",    roles: ["admin"] },
  { title: "Ausencias",       description: "Gestionar ausencias",        icon: CalendarDays,   color: "green",  url: "AbsenceManagement",         roles: ["admin", "user"] },
  { title: "Mantenimiento",   description: "Seguimiento mantenimiento",  icon: Wrench,         color: "orange", url: "MaintenanceTracking",       roles: ["admin"] },
  { title: "Planificación",   description: "Planificador de órdenes",    icon: Factory,        color: "teal",   url: "ProductionPlanning",        roles: ["admin"] },
  { title: "Configuración",   description: "Ajustes del sistema",        icon: Settings,       color: "purple", url: "Configuration",             roles: ["admin"] },
  { title: "Control Calidad", description: "Inspecciones y calidad",     icon: ClipboardCheck, color: "red",    url: "QualityControl",            roles: ["admin"] },
  { title: "Turnos",          description: "Asignación de turnos",       icon: Clock,          color: "indigo", url: "ShiftAssignmentsPage",      roles: ["admin"] },
  { title: "Informes",        description: "Análisis e informes",        icon: BarChart3,      color: "slate",  url: "Reports",                   roles: ["admin"] },
  { title: "Mi Ausencia",     description: "Solicitar ausencia",         icon: CalendarDays,   color: "green",  url: "EmployeeAbsenceInfo",       roles: ["user"] },
  { title: "Intervenciones",  description: "Parte de intervención",      icon: FileText,       color: "orange", url: "MaintenanceInterventions",  roles: ["user"] },
];

const COLOR_CLASSES = {
  blue:   "from-blue-500 to-blue-600",
  green:  "from-green-500 to-green-600",
  orange: "from-orange-500 to-orange-600",
  teal:   "from-teal-500 to-teal-600",
  purple: "from-purple-500 to-purple-600",
  red:    "from-red-500 to-red-600",
  indigo: "from-indigo-500 to-indigo-600",
  slate:  "from-slate-500 to-slate-600",
};

export default function Dashboard() {
  const { user, employees, absences, maintenance: maintenanceSchedules, isAdmin } = useAppData();
  const [searchParams] = useSearchParams();
  const showNotifications = searchParams.get("notifications") === "true";
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const stats = useMemo(() => {
    const now = new Date();
    // Ausencias formales aprobadas vigentes hoy (excluye auto-detectadas, deduplicadas por empleado)
    const isAutoAbs = (a) =>
      a.motivo === 'Ausencia no comunicada - detección automática' ||
      a.motivo === 'Ausencia detectada automáticamente por análisis de presencia' ||
      (a.notas && (a.notas.startsWith('[SISTEMA]') || a.notas.startsWith('[shiftAudit]') || a.notas.startsWith('Creado automáticamente')));

    // Solo empleados en estado Alta
    const activeEmployeeIds = new Set(employees.filter(e => e.estado_empleado === 'Alta').map(e => e.id));

    const activeAbsenceEmpIds = new Set();
    absences.forEach(a => {
      if (!activeEmployeeIds.has(a.employee_id)) return;
      if (a.estado_aprobacion !== "Aprobada") return;
      if (isAutoAbs(a)) return;
      const start = new Date(a.fecha_inicio);
      const end = a.fecha_fin_desconocida ? new Date('2099-12-31') : a.fecha_fin ? new Date(a.fecha_fin) : new Date('2099-12-31');
      if (start <= now && end >= now) activeAbsenceEmpIds.add(a.employee_id);
    });
    const activeAbsences = activeAbsenceEmpIds.size;
    // Solo pendientes manuales de empleados en Alta
    const pendingAbsences = absences.filter(a => activeEmployeeIds.has(a.employee_id) && !isAutoAbs(a) && a.estado_aprobacion === "Pendiente").length;
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
    const upcomingMaintenance = maintenanceSchedules.filter(m => {
      const scheduled = new Date(m.fecha_programada);
      const diffDays = Math.ceil((scheduled - todayMidnight) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7 && m.estado !== "Completado";
    }).length;
    return { totalEmployees: activeEmployeeIds.size, activeAbsences, pendingAbsences, upcomingMaintenance };
  }, [employees, absences, maintenanceSchedules]);

  const quickActions = useMemo(() => {
    const role = isAdmin ? "admin" : "user";
    return ALL_QUICK_ACTIONS.filter(a => a.roles.includes(role));
  }, [isAdmin]);

  return (
    <div className="h-full flex flex-col p-3 md:p-6 gap-4 md:gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header */}
      <header className="flex items-center gap-3 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <LayoutDashboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">Panel de Control</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
            Bienvenido{user?.full_name ? `, ${user.full_name}` : ""}
          </p>
        </div>
      </header>

      {showNotifications && user && <NotificationCenter currentEmployee={user} />}

      <div className="flex flex-col gap-4 md:gap-6">
        {/* Stats – admins only */}
        {isAdmin && (
          <section aria-label="Estadísticas generales" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <StatCard label="Total Empleados"       value={stats.totalEmployees}      icon={Users}         colorFrom="from-blue-50"   colorTo="to-blue-100"   borderColor="border-blue-200"   textColor="text-blue-700"   valueColor="text-blue-900"   iconColor="text-blue-600" />
            <StatCard label="Ausencias Activas"     value={stats.activeAbsences}      icon={CalendarDays}  colorFrom="from-green-50"  colorTo="to-green-100"  borderColor="border-green-200"  textColor="text-green-700"  valueColor="text-green-900"  iconColor="text-green-600" />
            <StatCard label="Pendientes Aprobación" value={stats.pendingAbsences}     icon={AlertCircle}   colorFrom="from-orange-50" colorTo="to-orange-100" borderColor="border-orange-200" textColor="text-orange-700" valueColor="text-orange-900" iconColor="text-orange-600" />
            <StatCard label="Mantenimiento (7d)"    value={stats.upcomingMaintenance} icon={Wrench}        colorFrom="from-purple-50" colorTo="to-purple-100" borderColor="border-purple-200" textColor="text-purple-700" valueColor="text-purple-900" iconColor="text-purple-600" />
          </section>
        )}

        {/* Quick Actions */}
        <section aria-label="Accesos rápidos">
          <h2 className="text-base md:text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">Accesos Rápidos</h2>
          <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:overflow-visible scrollbar-hide">
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <Link key={action.title} to={createPageUrl(action.url)} className="flex-shrink-0 w-36 md:w-auto">
                  <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 bg-white dark:bg-slate-800 cursor-pointer group active:scale-95">
                    <CardContent className="p-4 md:p-6">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br ${COLOR_CLASSES[action.color]} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                        <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-0.5 group-hover:text-blue-600 transition-colors leading-tight">{action.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block">{action.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Tablones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="min-h-[380px]">
            <Suspense fallback={<SectionSkeleton height="h-full" />}>
              <ShiftSwapWidget />
            </Suspense>
          </div>
          <div className="min-h-[380px]">
            <AnnouncementBoard isAdmin={isAdmin} />
          </div>
        </div>

        {/* Calendario Laboral */}
        <section aria-label="Calendario Laboral">
          <h2 className="text-base md:text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">Calendario Laboral</h2>
          <Suspense fallback={<SectionSkeleton height="h-64" />}>
            <WorkCalendar year={calendarYear} onYearChange={setCalendarYear} />
          </Suspense>
        </section>

        {/* Detalle festivos + vacaciones bajo el calendario */}
        <CalendarDetails year={calendarYear} />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, colorFrom, colorTo, borderColor, textColor, valueColor, iconColor }) {
  return (
    <Card className={`bg-gradient-to-br ${colorFrom} ${colorTo} ${borderColor}`}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-xs md:text-sm ${textColor} font-medium leading-tight`}>{label}</p>
            <p className={`text-2xl md:text-3xl font-bold ${valueColor} mt-1`}>{value}</p>
          </div>
          <Icon className={`w-8 h-8 md:w-12 md:h-12 ${iconColor} flex-shrink-0`} />
        </div>
      </CardContent>
    </Card>
  );
}