
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
  ClipboardCheck, // Added ClipboardCheck icon
  Award // Added Award icon for Skill Matrix
} from "lucide-react";
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

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [openSections, setOpenSections] = useState({
    empleados: false,
    informes: false,
    maquinas: false,
    planning: false,
    habilidades: false // Added habilidades section
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const isActive = (url) => location.pathname === url;
  
  const isParentActive = (urls) => urls.some(url => location.pathname === url);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <Sidebar className="border-r border-slate-200 bg-white/80 backdrop-blur-sm">
          <SidebarHeader className="border-b border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-slate-900">CDE PlanApp</h2>
                <p className="text-xs text-slate-500">Gestión de Empleados y Planificador</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                Menú Principal
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {/* Panel de Control */}
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

                  {/* Planning/Línea de Tiempo (Collapsible) */}
                  <Collapsible open={openSections.planning} onOpenChange={() => toggleSection('planning')}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton 
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                            isParentActive([
                              createPageUrl("Timeline"),
                              createPageUrl("DailyPlanning")
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
                        </div>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  {/* Empleados (Collapsible) */}
                  <Collapsible open={openSections.empleados} onOpenChange={() => toggleSection('empleados')}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton 
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                            isParentActive([
                              createPageUrl("Employees"),
                              createPageUrl("EmployeeOnboarding"),
                              createPageUrl("AttendanceManagement")
                            ]) ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <Users className="w-5 h-5" />
                              <span className="text-sm">Empleados</span>
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
                              isActive(createPageUrl("Employees")) ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <Link to={createPageUrl("Employees")} className="flex items-center gap-2 px-3 py-2">
                              <Users className="w-4 h-4" />
                              Gestión de Empleados
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
                        </div>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  {/* Máquinas (Collapsible) */}
                  <Collapsible open={openSections.maquinas} onOpenChange={() => toggleSection('maquinas')}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton 
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                            isParentActive([
                              createPageUrl("Machines"),
                              createPageUrl("MachineManagement"),
                              createPageUrl("MachinePlanning"),
                              createPageUrl("ProcessConfiguration"),
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
                        </div>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  {/* Habilidades (Nuevo) */}
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild 
                      className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                        isActive(createPageUrl("SkillMatrix")) ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                      }`}
                    >
                      <Link to={createPageUrl("SkillMatrix")} className="flex items-center gap-3 px-3 py-2.5">
                        <Award className="w-5 h-5" />
                        <span className="text-sm">Matriz de Habilidades</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Jefes de Turno */}
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

                  {/* Importar Datos */}
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild 
                      className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                        isActive(createPageUrl("DataImport")) ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                      }`}
                    >
                      <Link to={createPageUrl("DataImport")} className="flex items-center gap-3 px-3 py-2.5">
                        <Upload className="w-5 h-5" />
                        <span className="text-sm">Importar Datos</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Informes (Collapsible) */}
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

                  {/* Notificaciones */}
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild 
                      className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                        isActive(createPageUrl("Notifications")) ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                      }`}
                    >
                      <Link to={createPageUrl("Notifications")} className="flex items-center gap-3 px-3 py-2.5">
                        <Bell className="w-5 h-5" />
                        <span className="text-sm">Notificaciones</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* App Móvil */}
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

                  {/* Configuración */}
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild 
                      className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                        isActive(createPageUrl("Configuration")) ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                      }`}
                    >
                      <Link to={createPageUrl("Configuration")} className="flex items-center gap-3 px-3 py-2.5">
                        <Settings className="w-5 h-5" />
                        <span className="text-sm">Configuración</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-semibold text-slate-900">CDE PlanApp</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
