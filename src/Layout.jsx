import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [openSections, setOpenSections] = useState({});

  // Consultas a la API
  const { 
    data: brandingConfig, 
    isLoading: brandingLoading,
    error: brandingError 
  } = useQuery({
    queryKey: ['appConfig', 'branding'],
    queryFn: async () => {
      try {
        const configs = await base44.entities.AppConfig.filter({ config_key: 'branding' });
        return configs[0] || null;
      } catch (error) {
        console.error("Error loading branding config:", error);
        return null;
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  const { 
    data: currentUser,
    isLoading: userLoading, 
    isError: userError,
    error: userErrorDetail
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        return user;
      } catch (error) {
        console.error("Error fetching current user:", error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isMobilePage = location.pathname.includes('Mobile');
    
    if (isMobile && !isMobilePage && currentUser) {
      navigate(createPageUrl('MobileHome'));
    }
  }, [location.pathname, currentUser, navigate]);

  const { 
    data: employee, 
    isLoading: employeeLoading,
    error: employeeError 
  } = useQuery({
    queryKey: ['currentEmployee', currentUser?.email],
    queryFn: async () => {
      try {
        const emps = await base44.entities.EmployeeMasterDatabase.list();
        return emps.find(e => e.email === currentUser?.email) || null;
      } catch (error) {
        console.error("Error fetching employee:", error);
        return null;
      }
    },
    enabled: !!currentUser?.email,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ 
      ...prev, 
      [section]: !prev[section] 
    }));
  };

  const isActive = (url) => location.pathname === url;

  // Manejo de estados de carga
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  if (userError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserX className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Error de autenticación
          </h2>
          <p className="text-slate-600 mb-4">
            No se pudo cargar la información del usuario. 
            {userErrorDetail?.message && (
              <span className="text-sm text-red-500 block mt-2">
                Error: {userErrorDetail.message}
              </span>
            )}
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

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
                      {brandingLoading ? (
                        <div className="w-10 h-10 rounded-xl bg-slate-200 animate-pulse"></div>
                      ) : brandingConfig?.logo_url ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg bg-white dark:bg-slate-800 flex items-center justify-center p-1">
                          <img 
                            src={brandingConfig.logo_url} 
                            alt="Logo" 
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = `
                                <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                                  <CalendarIcon class="w-6 h-6 text-white" />
                                </div>
                              `;
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
                          <CalendarIcon className="w-6 h-6 text-white" />
                        </div>
                      )}
                      
                      <div>
                        <h2 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                          {brandingLoading ? (
                            <span className="h-6 w-40 bg-slate-200 rounded animate-pulse block"></span>
                          ) : (
                            brandingConfig?.app_name || 'CdeApp Planning'
                          )}
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
                        onClick={() => {
                          base44.auth.logout().then(() => {
                            window.location.href = '/login';
                          }).catch(error => {
                            console.error("Logout error:", error);
                            window.location.href = '/login';
                          });
                        }}
                        title="Cerrar Sesión"
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </SidebarHeader>

              {/* 🚨 AQUÍ FALTA TODO EL CONTENIDO DEL SIDEBAR 🚨 */}
              {/* Necesitas añadir SidebarContent con los grupos de menú */}
              
              <SidebarContent className="p-2">
                {/* MÓDULO RRHH */}
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider px-3 py-2">
                    👥 Recursos Humanos
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
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
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>

            <main className="flex-1 flex flex-col">
              <header className="bg-card/80 backdrop-blur-sm border-b border-border px-6 py-4 md:hidden">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
                  <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    CdeApp Planning
                  </h1>
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
