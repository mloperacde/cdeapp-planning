import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Users,
  Clock,
  Settings,
  Activity,
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

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [openSections, setOpenSections] = useState({
    empleados: false,
    informes: false,
    maquinas: false,
    planning: false,
    produccion: false,
    configuracion: false,
  });

  const { data: currentUser,isLoading: userLoading, isError: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

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
                  <ThemeToggle />
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
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">
                Menú Principal
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                        isActive(createPageUrl("Dashboard")) ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                      }`}
                    >
                      <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3 px-3 py-2.5">
                        <BarChart3 className="w-5 h-5" />
                        <span className="text-sm">Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <Collapsible open={openSections.planning} onOpenChange={() => toggleSection('planning')}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                            isParentActive([
                              createPageUrl("Timeline"),
                              createPageUrl("DailyPlanning"),
                              createPageUrl("ShiftPlanning")
                            ]) ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <Activity className="w-5 h-5" />
                              <span className="text-sm">Planning</span>
                            </div>
                            {openSections.planning ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </div>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-6 mt-1 space-y-1">
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("Timeline")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("Timeline")} className="flex items-center gap-2 px-3 py-2">
                              <Activity className="w-4 h-4" />
                              Línea de Tiempo
                            </Link>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("DailyPlanning")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("DailyPlanning")} className="flex items-center gap-2 px-3 py-2">
                              <Clock className="w-4 h-4" />
                              Planning Diario
                            </Link>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("ShiftPlanning")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("ShiftPlanning")} className="flex items-center gap-2 px-3 py-2">
                              <UsersRound className="w-4 h-4" />
                              Planificación de Turnos
                            </Link>
                          </SidebarMenuButton>
                        </div>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  <Collapsible open={openSections.empleados} onOpenChange={() => toggleSection('empleados')}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                            isParentActive([
                              createPageUrl("HRDashboard"), // Added HRDashboard here
                              createPageUrl("MasterEmployeeDatabase"),
                              createPageUrl("ETTTemporaryEmployees"),
                              createPageUrl("EmployeeOnboarding"),
                              createPageUrl("AttendanceManagement"),
                              createPageUrl("CommitteeManagement")
                            ]) ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <Users className="w-5 h-5" />
                              <span className="text-sm">RRHH</span>
                            </div>
                            {openSections.empleados ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </div>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-6 mt-1 space-y-1">
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("AdvancedHRDashboard")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("AdvancedHRDashboard")} className="flex items-center gap-2 px-3 py-2">
                              <LayoutDashboard className="w-4 h-4" />
                              Dashboard RRHH
                            </Link>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("Employees")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("Employees")} className="flex items-center gap-2 px-3 py-2">
                              <Users className="w-4 h-4" />
                              Empleados
                            </Link>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("AbsenceManagement")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("AbsenceManagement")} className="flex items-center gap-2 px-3 py-2">
                              <UserX className="w-4 h-4" />
                              Gestión de Ausencias
                            </Link>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("ETTTemporaryEmployees")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("ETTTemporaryEmployees")} className="flex items-center gap-2 px-3 py-2">
                              <Clock className="w-4 h-4" />
                              ETT y Temporales
                            </Link>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("EmployeeOnboarding")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("EmployeeOnboarding")} className="flex items-center gap-2 px-3 py-2">
                              <UserPlus className="w-4 h-4" />
                              Onboarding
                            </Link>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("AttendanceManagement")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("AttendanceManagement")} className="flex items-center gap-2 px-3 py-2">
                              <ClipboardCheck className="w-4 h-4" />
                              Gestión de Presencia
                            </Link>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("CommitteeManagement")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("CommitteeManagement")} className="flex items-center gap-2 px-3 py-2">
                              <Shield className="w-4 h-4" />
                              Comités y PRL
                            </Link>
                          </SidebarMenuButton>
                        </div>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  <Collapsible open={openSections.maquinas} onOpenChange={() => toggleSection('maquinas')}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                            isParentActive([
                              createPageUrl("Machines"),
                              createPageUrl("MachineManagement"),
                              createPageUrl("MaintenanceTracking")
                            ]) ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <Cog className="w-5 h-5" />
                              <span className="text-sm">Máquinas</span>
                            </div>
                            {openSections.maquinas ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </div>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-6 mt-1 space-y-1">
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("Machines")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("Machines")} className="flex items-center gap-2 px-3 py-2">
                              <Cog className="w-4 h-4" />
                              Gestión de Máquinas
                            </Link>
                            </SidebarMenuButton>
                            <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("MaintenanceTracking")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                            >
                            <Link to={createPageUrl("MaintenanceTracking")} className="flex items-center gap-2 px-3 py-2">
                              <Wrench className="w-4 h-4" />
                              Mantenimiento
                            </Link>
                            </SidebarMenuButton>
                            </div>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                        isActive(createPageUrl("ShiftManagers")) ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                      }`}
                    >
                      <Link to={createPageUrl("ShiftManagers")} className="flex items-center gap-3 px-3 py-2.5">
                        <UsersRound className="w-5 h-5" />
                        <span className="text-sm">Jefes de Turno</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                        isActive(createPageUrl("Messaging")) ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                      }`}
                    >
                      <Link to={createPageUrl("Messaging")} className="flex items-center gap-3 px-3 py-2.5">
                        <MessageSquare className="w-5 h-5" />
                        <span className="text-sm">Mensajería</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                        isActive(createPageUrl("IncentiveManagement")) ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                      }`}
                    >
                      <Link to={createPageUrl("IncentiveManagement")} className="flex items-center gap-3 px-3 py-2.5">
                        <TrendingUp className="w-5 h-5" />
                        <span className="text-sm">Plan de Incentivos</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <Collapsible open={openSections.informes} onOpenChange={() => toggleSection('informes')}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                            isParentActive([
                              createPageUrl("Reports"),
                              createPageUrl("MLInsights")
                            ]) ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5" />
                              <span className="text-sm">Informes</span>
                            </div>
                            {openSections.informes ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </div>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-6 mt-1 space-y-1">
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("Reports")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("Reports")} className="flex items-center gap-2 px-3 py-2">
                              <FileText className="w-4 h-4" />
                              Reportes Generales
                            </Link>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("MLInsights")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("MLInsights")} className="flex items-center gap-2 px-3 py-2">
                              <Activity className="w-4 h-4" />
                              Análisis Predictivo ML
                            </Link>
                          </SidebarMenuButton>
                        </div>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                        isActive(createPageUrl("NotificationCenter")) ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                      }`}
                    >
                      <Link to={createPageUrl("NotificationCenter")} className="flex items-center gap-3 px-3 py-2.5">
                        <Bell className="w-5 h-5" />
                        <span className="text-sm">Centro Notificaciones</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                        isActive(createPageUrl("MobileAppConfig")) ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                      }`}
                    >
                      <Link to={createPageUrl("MobileAppConfig")} className="flex items-center gap-3 px-3 py-2.5">
                        <Smartphone className="w-5 h-5" />
                        <span className="text-sm">App Móvil</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>



                  <Collapsible open={openSections.produccion} onOpenChange={() => toggleSection('produccion')}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                            isParentActive([
                              createPageUrl("ProductionPlanning"),
                              createPageUrl("ProcessConfiguration")
                            ]) ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <Factory className="w-5 h-5" />
                              <span className="text-sm">Producción</span>
                            </div>
                            {openSections.produccion ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </div>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-6 mt-1 space-y-1">
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("ProductionPlanning")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("ProductionPlanning")} className="flex items-center gap-2 px-3 py-2">
                              <CalendarIcon className="w-4 h-4" />
                              Planificador
                            </Link>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("ProcessConfiguration")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("ProcessConfiguration")} className="flex items-center gap-2 px-3 py-2">
                              <Settings2 className="w-4 h-4" />
                              Configurar Procesos
                              </Link>
                              </SidebarMenuButton>
                              <SidebarMenuButton
                              asChild
                              className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("DailyShiftPlanning")) ? 'bg-blue-50 text-blue-700' : ''
                              }`}
                              >
                              <Link to={createPageUrl("DailyShiftPlanning")} className="flex items-center gap-2 px-3 py-2">
                              <CalendarIcon className="w-4 h-4" />
                              Planificación Diaria
                              </Link>
                              </SidebarMenuButton>
                              </div>
                              </CollapsibleContent>
                              </SidebarMenuItem>
                              </Collapsible>

                  <Collapsible open={openSections.configuracion} onOpenChange={() => toggleSection('configuracion')}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                            isParentActive([
                              createPageUrl("Configuration"),
                              createPageUrl("RoleManagement"),
                              createPageUrl("UserRoleAssignment")
                            ]) ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <Settings className="w-5 h-5" />
                              <span className="text-sm">Configuración</span>
                            </div>
                            {openSections.configuracion ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </div>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-6 mt-1 space-y-1">
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("Configuration")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("Configuration")} className="flex items-center gap-2 px-3 py-2">
                              <Settings className="w-4 h-4" />
                              General
                            </Link>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("RoleManagement")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("RoleManagement")} className="flex items-center gap-2 px-3 py-2">
                              <Shield className="w-4 h-4" />
                              Gestión de Roles
                            </Link>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("UserRoleAssignment")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("UserRoleAssignment")} className="flex items-center gap-2 px-3 py-2">
                              <Users className="w-4 h-4" />
                              Asignación de Roles
                            </Link>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("AdminDeploymentGuide")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("AdminDeploymentGuide")} className="flex items-center gap-2 px-3 py-2">
                              <Shield className="w-4 h-4" />
                              Guía de Implementación
                            </Link>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("UserManual")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("UserManual")} className="flex items-center gap-2 px-3 py-2">
                              <BookOpen className="w-4 h-4" />
                              Manual de Usuario
                            </Link>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg text-sm ${
                              isActive(createPageUrl("QuickStartGuide")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("QuickStartGuide")} className="flex items-center gap-2 px-3 py-2">
                              <CheckCircle className="w-4 h-4" />
                              Inicio Rápido
                            </Link>
                          </SidebarMenuButton>
                          </div>
                          </CollapsibleContent>
                          </SidebarMenuItem>
                          </Collapsible>
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
        );
        }