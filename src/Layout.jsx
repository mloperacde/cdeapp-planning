import React, { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
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
import { ThemeProvider } from "@/components/common/ThemeProvider";
import ThemeToggle from "@/components/common/ThemeToggle";
import ChatbotButton from "@/components/chatbot/ChatbotButton";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/notifications/NotificationBell";
import ErrorBoundary from "@/components/common/ErrorBoundary";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [openSections, setOpenSections] = useState({});

  const { data: brandingConfig } = useQuery({
    queryKey: ['appConfig', 'branding'],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ config_key: 'branding' });
      return configs[0] || null;
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: currentUser,isLoading: userLoading, isError: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Función temporal para URLs si no tienes utils
  const createPageUrl = (pageName) => {
    const pageMap = {
      'AdvancedHRDashboard': '/hr-dashboard',
      'MasterEmployeeDatabase': '/employees',
      'AbsenceManagement': '/absences',
      'Timeline': '/timeline',
      'MachineManagement': '/machines',
      'Configuration': '/settings',
      'ProductionDashboard': '/production',
      'Reports': '/reports',
      'MaintenanceTracking': '/maintenance',
      'QualityControl': '/quality',
      'Messaging': '/messaging',
      'NotificationCenter': '/notifications',
      'UserManual': '/manual',
      'ShiftManagers': '/shift-managers',
      'MachineDailyPlanning': '/machine-planning',
      'ProcessConfiguration': '/process-config',
      'MachineMaster': '/machine-master',
      'IncentiveManagement': '/incentives',
      'CommitteeManagement': '/committee',
      'EmployeeOnboarding': '/onboarding',
      'AttendanceManagement': '/attendance',
      'ETTTemporaryEmployees': '/ett',
      'UserInvitations': '/invitations',
      'SystemHealth': '/system-health',
      'SystemAudit': '/audit',
      'DataMigration': '/data-migration',
    };
    
    return pageMap[pageName] || `/${pageName}`;
  };

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
                    {brandingConfig?.logo_url ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg bg-white dark:bg-slate-800 flex items-center justify-center p-1">
                        <img 
                          src={brandingConfig.logo_url} 
                          alt="Logo" 
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
                        <CalendarIcon className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div>
                      <h2 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                        {brandingConfig?.app_name || 'CdeApp Planning'}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {brandingConfig?.app_subtitle || 'Gestión de Empleados y Planificador'}
                      </p>
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
                        isActive('/') ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold' : ''
                      }`}
                    >
                      <Link to="/" className="flex items-center gap-3 px-3 py-2">
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard Principal
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
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={`hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-all duration-200 rounded-lg mb-1 ${
                        isActive('/hr-dashboard') ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold' : ''
                      }`}
                    >
                      <Link to="/hr-dashboard" className="flex items-center gap-3 px-3 py-2">
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard RRHH
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={`hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-all duration-200 rounded-lg mb-1 ${
                        isActive('/employees') ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold' : ''
                      }`}
                    >
                      <Link to="/employees" className="flex items-center gap-3 px-3 py-2">
                        <Users className="w-4 h-4" />
                        Base de Empleados
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={`hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-all duration-200 rounded-lg mb-1 ${
                        isActive('/absences') ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold' : ''
                      }`}
                    >
                      <Link to="/absences" className="flex items-center gap-3 px-3 py-2">
                        <UserX className="w-4 h-4" />
                        Gestión Ausencias
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
                        isActive('/timeline') ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold' : ''
                      }`}
                    >
                      <Link to="/timeline" className="flex items-center gap-3 px-3 py-2">
                        <Activity className="w-4 h-4" />
                        Timeline Recursos
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
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
                        isActive('/production') ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold' : ''
                      }`}
                    >
                      <Link to="/production" className="flex items-center gap-3 px-3 py-2">
                        <BarChart3 className="w-4 h-4" />
                        Dashboard Producción
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={`hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all duration-200 rounded-lg mb-1 ${
                        isActive('/machines') ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold' : ''
                      }`}
                    >
                      <Link to="/machines" className="flex items-center gap-3 px-3 py-2">
                        <Activity className="w-4 h-4" />
                        Consulta Máquinas
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
                        isActive('/settings') ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold' : ''
                      }`}
                    >
                      <Link to="/settings" className="flex items-center gap-3 px-3 py-2">
                        <Settings className="w-4 h-4" />
                        General
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
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
              <Outlet />
            </div>
          </main>

          <ChatbotButton />
          </div>
        </SidebarProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
