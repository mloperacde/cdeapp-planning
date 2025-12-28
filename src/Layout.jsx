// LayoutSimplificado.jsx - Versión temporal
import React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogOut, UserCircle, LayoutDashboard, Factory, CalendarIcon, Users, Settings } from "lucide-react";
import ErrorBoundary from "../components/common/ErrorBoundary";

// Función temporal para URLs
const createPageUrl = (pageName) => `/${pageName}`;

export default function LayoutSimplificado({ children }) {
  const location = useLocation();

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Solo mostrar módulos básicos hasta que verifiquemos las entidades
  const basicModules = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { path: '/machines', label: 'Máquinas', icon: <Factory className="w-4 h-4" /> },
    { path: '/employees', label: 'Empleados', icon: <Users className="w-4 h-4" /> },
    { path: '/timeline', label: 'Timeline', icon: <CalendarIcon className="w-4 h-4" /> },
    { path: '/settings', label: 'Configuración', icon: <Settings className="w-4 h-4" /> },
  ];

  const isActive = (path) => location.pathname === path;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex w-full bg-gray-50">
        <Sidebar className="border-r bg-white">
          <SidebarHeader className="border-b p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">CdeApp</h2>
                  <p className="text-xs text-gray-500">Versión simplificada</p>
                </div>
              </div>
            </div>
            
            {currentUser && (
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{currentUser.full_name || currentUser.email}</p>
                    <p className="text-xs text-gray-500">{currentUser.role || 'Usuario'}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => base44.auth.logout()}
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </SidebarHeader>

          <SidebarContent className="p-4">
            <SidebarMenu>
              {basicModules.map((module) => (
                <SidebarMenuItem key={module.path}>
                  <SidebarMenuButton
                    asChild
                    className={isActive(module.path) ? 'bg-blue-50 text-blue-700 font-semibold' : ''}
                  >
                    <Link to={module.path} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100">
                      {module.icon}
                      <span>{module.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </ErrorBoundary>
  );
}
