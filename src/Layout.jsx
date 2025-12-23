import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Users,
  Clock,
  Settings,
  Activity,
  Database,
  Coffee,
  Cog,
  ArrowLeftRight,
  BarChart3,
  FileText,
  Bell,
  Smartphone,
  Upload,
  UsersRound,
  ChevronDown,
  ChevronRight,
  Wrench,
  UserPlus,
  ClipboardCheck,
  Award,
  Shield,
  MessageSquare,
  TrendingUp,
  UserX,
  Calendar as CalendarIcon,
  LayoutDashboard,
  Factory,
  Settings2,
  BookOpen,
  CheckCircle,
  LogOut,
  UserCircle,
  Key,
  Boxes,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ThemeProvider } from "../components/common/ThemeProvider";
import ThemeToggle from "../components/common/ThemeToggle";
import ChatbotButton from "../components/chatbot/ChatbotButton";
import { Button } from "@/components/ui/button";
import NotificationBell from "../components/notifications/NotificationBell";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { useModuleAccess } from "../components/roles/useModuleAccess";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const { canAccessModule, isMobile } = useModuleAccess();

  const { data: currentUser,isLoading: userLoading, isError: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  // Detect mobile and redirect to MobileHome
  React.useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isMobilePage = location.pathname.includes('Mobile');
    
    if (isMobile && !isMobilePage && currentUser) {
      window.location.href = createPageUrl('MobileHome');
    }
  }, [location.pathname, currentUser]);

  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ['currentEmployee', currentUser?.email],
    queryFn: async () => {
      const emps = await base44.entities.EmployeeMasterDatabase.list();
      return emps.find(e => e.email === currentUser?.email) || null;
    },
    enabled: !!currentUser?.email,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const isActive = (url) => location.pathname === url;

  const isParentActive = (urls) => urls.some(url => location.pathname === url);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-background dark:to-background dark:bg-background">
          <Sidebar className="border-r border-border bg-card/80 dark:bg-card/95 backdrop-blur-sm">
            <SidebarHeader className="border-b border-border p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
                      <CalendarIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-slate-900 dark:text-slate-100">CdeApp Planning</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Gestión de Empleados y Planificador</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <NotificationBell />
                    <ThemeToggle />
                  </div>
                </div>
                {currentUser && (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <UserCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                          {currentUser.full_name || currentUser.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => base44.auth.logout()}
                      title="Cerrar Sesión"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </SidebarHeader>

          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider px-3 py-2">
                📊 Principal
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={`hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 rounded-lg mb-1 ${
                        isActive(createPageUrl("Dashboard")) ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold' : ''
                      }`}
                    >
                      <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3 px-3 py-2.5">
                        <BarChart3 className="w-5 h-5" />
                        <span className="text-sm">Dashboard General</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
          </SidebarGroup>

          {/* MÓDULO RRHH */}
          <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider px-3 py-2 mt-2">
            👥 Recursos Humanos
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {canAccessModule('hr_dashboard') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className={`hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-all duration-200 rounded-lg mb-1 ${
                      isActive(createPageUrl("AdvancedHRDashboard")) ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold' : ''
                    }`}
                  >
                    <Link to={createPageUrl("AdvancedHRDashboard")} className="flex items-center gap-3 px-3 py-2">
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard RRHH
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {canAccessModule('employees') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className={`hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-all duration-200 rounded-lg mb-1 ${
                      isActive(createPageUrl("MasterEmployeeDatabase")) ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold' : ''
                    }`}
                  >
                    <Link to={createPageUrl("MasterEmployeeDatabase")} className="flex items-center gap-3 px-3 py-2">
                      <Users className="w-4 h-4" />
                      Base de Empleados
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {canAccessModule('absences') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className={`hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-all duration-200 rounded-lg mb-1 ${
                      isActive(createPageUrl("AbsenceManagement")) ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold' : ''
                    }`}
                  >
                    <Link to={createPageUrl("AbsenceManagement")} className="flex items-center gap-3 px-3 py-2">
                      <UserX className="w-4 h-4" />
                      Gestión Ausencias
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={`hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-all duration-200 rounded-lg mb-1 ${
                    isActive(createPageUrl("ETTTemporaryEmployees")) ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold' : ''
                  }`}
                >
                  <Link to={createPageUrl("ETTTemporaryEmployees")} className="flex items-center gap-3 px-3 py-2">
                    <Clock className="w-4 h-4" />
                    ETT y Temporales
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={`hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-all duration-200 rounded-lg mb-1 ${
                    isActive(createPageUrl("EmployeeOnboarding")) ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold' : ''
                  }`}
                >
                  <Link to={createPageUrl("EmployeeOnboarding")} className="flex items-center gap-3 px-3 py-2">
                    <UserPlus className="w-4 h-4" />
                    Onboarding
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={`hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-all duration-200 rounded-lg mb-1 ${
                    isActive(createPageUrl("AttendanceManagement")) ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold' : ''
                  }`}
                >
                  <Link to={createPageUrl("AttendanceManagement")} className="flex items-center gap-3 px-3 py-2">
                    <ClipboardCheck className="w-4 h-4" />
                    Control Presencia
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={`hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-all duration-200 rounded-lg mb-1 ${
                    isActive(createPageUrl("CommitteeManagement")) ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold' : ''
                  }`}
                >
                  <Link to={createPageUrl("CommitteeManagement")} className="flex items-center gap-3 px-3 py-2">
                    <Shield className="w-4 h-4" />
                    Comités y PRL
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={`hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-all duration-200 rounded-lg mb-1 ${
                    isActive(createPageUrl("IncentiveManagement")) ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold' : ''
                  }`}
                >
                  <Link to={createPageUrl("IncentiveManagement")} className="flex items-center gap-3 px-3 py-2">
                    <TrendingUp className="w-4 h-4" />
                    Plan Incentivos
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
          </SidebarGroup>

          {/* MÓDULO PLANIFICACIÓN */}
          <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider px-3 py-2 mt-2">
            📅 Planificación
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("Timeline")) ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("Timeline")} className="flex items-center gap-3 px-3 py-2">
      <Activity className="w-4 h-4" />
      Timeline Recursos
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("DailyPlanning")) ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("DailyPlanning")} className="flex items-center gap-3 px-3 py-2">
      <CalendarIcon className="w-4 h-4" />
      Planning Diario
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("ShiftPlanning")) ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("ShiftPlanning")} className="flex items-center gap-3 px-3 py-2">
      <UsersRound className="w-4 h-4" />
      Planning Turnos
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("ShiftManagers")) ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("ShiftManagers")} className="flex items-center gap-3 px-3 py-2">
      <UsersRound className="w-4 h-4" />
      Jefes de Turno
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>

{canAccessModule('daily_planning') && (
  <SidebarMenuItem>
    <SidebarMenuButton
      asChild
      className={`hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all duration-200 rounded-lg mb-1 ${
        isActive(createPageUrl("MachineDailyPlanning")) ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold' : ''
      }`}
    >
      <Link to={createPageUrl("MachineDailyPlanning")} className="flex items-center gap-3 px-3 py-2">
        <Boxes className="w-4 h-4" />
        Planning Máquinas
      </Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
)}
</SidebarMenu>
</SidebarGroupContent>
</SidebarGroup>

{/* MÓDULO PRODUCCIÓN */}
<SidebarGroup>
<SidebarGroupLabel className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider px-3 py-2 mt-2">
🏭 Producción
</SidebarGroupLabel>
<SidebarGroupContent>
<SidebarMenu>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("ProductionDashboard")) ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("ProductionDashboard")} className="flex items-center gap-3 px-3 py-2">
      <BarChart3 className="w-4 h-4" />
      Dashboard Producción
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("ProductionPlanning")) ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("ProductionPlanning")} className="flex items-center gap-3 px-3 py-2">
      <CalendarIcon className="w-4 h-4" />
      Planificador Órdenes
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("ProcessConfiguration")) ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("ProcessConfiguration")} className="flex items-center gap-3 px-3 py-2">
      <Settings2 className="w-4 h-4" />
      Config. Procesos
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("MachineManagement")) ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("MachineManagement")} className="flex items-center gap-3 px-3 py-2">
      <Activity className="w-4 h-4" />
      Consulta Máquinas
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
</SidebarMenu>
</SidebarGroupContent>
</SidebarGroup>

{/* MÓDULO MANTENIMIENTO */}
<SidebarGroup>
<SidebarGroupLabel className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wider px-3 py-2 mt-2">
🔧 Mantenimiento
</SidebarGroupLabel>
<SidebarGroupContent>
<SidebarMenu>
<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-700 dark:hover:text-orange-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("MachineMaster")) ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("MachineMaster")} className="flex items-center gap-3 px-3 py-2">
      <Database className="w-4 h-4" />
      Archivo Maestro
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-700 dark:hover:text-orange-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("MaintenanceTracking")) ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("MaintenanceTracking")} className="flex items-center gap-3 px-3 py-2">
      <Wrench className="w-4 h-4" />
      Seguimiento
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
</SidebarMenu>
</SidebarGroupContent>
</SidebarGroup>

{/* MÓDULO CALIDAD */}
<SidebarGroup>
<SidebarGroupLabel className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider px-3 py-2 mt-2">
✓ Calidad
</SidebarGroupLabel>
<SidebarGroupContent>
<SidebarMenu>
<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("QualityControl")) ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("QualityControl")} className="flex items-center gap-3 px-3 py-2">
      <CheckCircle className="w-4 h-4" />
      Control de Calidad
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
</SidebarMenu>
</SidebarGroupContent>
</SidebarGroup>

{/* COMUNICACIÓN */}
<SidebarGroup>
<SidebarGroupLabel className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider px-3 py-2 mt-2">
💬 Comunicación
</SidebarGroupLabel>
<SidebarGroupContent>
<SidebarMenu>
<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan-700 dark:hover:text-cyan-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("Messaging")) ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("Messaging")} className="flex items-center gap-3 px-3 py-2">
      <MessageSquare className="w-4 h-4" />
      Mensajería
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan-700 dark:hover:text-cyan-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("NotificationCenter")) ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("NotificationCenter")} className="flex items-center gap-3 px-3 py-2">
      <Bell className="w-4 h-4" />
      Notificaciones
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
</SidebarMenu>
</SidebarGroupContent>
</SidebarGroup>

{/* INFORMES */}
<SidebarGroup>
<SidebarGroupLabel className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider px-3 py-2 mt-2">
📈 Análisis
</SidebarGroupLabel>
<SidebarGroupContent>
<SidebarMenu>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("Reports")) ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("Reports")} className="flex items-center gap-3 px-3 py-2">
      <FileText className="w-4 h-4" />
      Informes
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("MLInsights")) ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("MLInsights")} className="flex items-center gap-3 px-3 py-2">
      <Activity className="w-4 h-4" />
      Análisis Predictivo
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
</SidebarMenu>
</SidebarGroupContent>
</SidebarGroup>

{/* CONFIGURACIÓN */}
<SidebarGroup>
<SidebarGroupLabel className="text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider px-3 py-2 mt-2">
⚙️ Configuración
</SidebarGroupLabel>
<SidebarGroupContent>
<SidebarMenu>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("Configuration")) ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("Configuration")} className="flex items-center gap-3 px-3 py-2">
      <Settings className="w-4 h-4" />
      General
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("RoleManagement")) ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("RoleManagement")} className="flex items-center gap-3 px-3 py-2">
      <Shield className="w-4 h-4" />
      Gestión Roles
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("UserRoleAssignment")) ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("UserRoleAssignment")} className="flex items-center gap-3 px-3 py-2">
      <Users className="w-4 h-4" />
      Asignación Roles
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("MobileAppConfig")) ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("MobileAppConfig")} className="flex items-center gap-3 px-3 py-2">
      <Smartphone className="w-4 h-4" />
      Config. App Móvil
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-all duration-200 rounded-lg mb-1 ${
      isActive(createPageUrl("ModuleAccessConfig")) ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("ModuleAccessConfig")} className="flex items-center gap-3 px-3 py-2">
      <Shield className="w-4 h-4" />
      Acceso a Módulos
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-all duration-200 rounded-lg text-sm ${
      isActive(createPageUrl("DataMigration")) ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("DataMigration")} className="flex items-center gap-3 px-3 py-2">
      <Database className="w-4 h-4" />
      Migración Datos
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-all duration-200 rounded-lg text-sm ${
      isActive(createPageUrl("SystemHealth")) ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("SystemHealth")} className="flex items-center gap-3 px-3 py-2">
      <Activity className="w-4 h-4" />
      Salud Sistema
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    className={`hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-all duration-200 rounded-lg text-sm ${
      isActive(createPageUrl("UserManual")) ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold' : ''
    }`}
  >
    <Link to={createPageUrl("UserManual")} className="flex items-center gap-3 px-3 py-2">
      <BookOpen className="w-4 h-4" />
      Manual Usuario
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
                          </SidebarMenu>
                          </SidebarGroupContent>
                          </SidebarGroup>
                          {currentUser && (
                          <SidebarGroup className="mt-auto border-t border-border pt-4">
                          <SidebarGroupContent>
                          <SidebarMenu>
                          <SidebarMenuItem>
                          <SidebarMenuButton
                          onClick={() => {
                          const newPassword = prompt("Introduce tu nueva contraseña:");
                          if (newPassword) {
                            base44.auth.updateMe({ password: newPassword })
                              .then(() => alert("Contraseña actualizada"))
                              .catch(() => alert("Error al actualizar contraseña"));
                          }
                          }}
                          className="hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm"
                          >
                          <div className="flex items-center gap-3 px-3 py-2">
                          <Key className="w-4 h-4" />
                          <span>Cambiar Contraseña</span>
                          </div>
                          </SidebarMenuButton>
                          </SidebarMenuItem>
                          </SidebarMenu>
                          </SidebarGroupContent>
                          </SidebarGroup>
                          )}
                          </SidebarContent>
                          </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-card/80 backdrop-blur-sm border-b border-border px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-semibold text-slate-900">CdeApp Planning</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>

        <ChatbotButton employeeId={employee?.id} />
        </div>
        </SidebarProvider>
        </ThemeProvider>
        </ErrorBoundary>
        );
        }