import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAppData } from '@/components/data/DataProvider';
import { 
  Menu, X, Home, Users, Calendar, Wrench, Settings, FileText, Shield, 
  DollarSign, Cog, Package, ChevronDown, ChevronRight, LogOut, 
  User as UserIcon, Moon, Sun, Key, Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ThemeToggle from '@/components/common/ThemeToggle';

export default function Layout({ children, currentPageName }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({
    'Principal': true,
    'Recursos Humanos': true,
    'Planificación': true,
    'Producción': true,
    'Mantenimiento': true,
    'Análisis': true,
    'Configuración': true
  });
  
  const { user, isAdmin } = useAppData();

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  // Dark mode ya no se maneja aquí - lo hace ThemeProvider

  // Estructura del menú organizada por categorías
  const MENU_STRUCTURE = [
    // Principal
    { name: 'Dashboard', icon: Home, path: '/Dashboard', category: 'Principal' },
    
    // Recursos Humanos
    { name: 'Dashboard RRHH', icon: Users, path: '/AdvancedHRDashboard', category: 'Recursos Humanos' },
    { name: 'Base de Empleados', icon: Users, path: '/MasterEmployeeDatabase', category: 'Recursos Humanos' },
    { name: 'Gestión Ausencias', icon: Calendar, path: '/AbsenceManagement', category: 'Recursos Humanos' },
    { name: 'ETT y Temporales', icon: Users, path: '/ETTTemporaryEmployees', category: 'Recursos Humanos' },
    { name: 'Onboarding', icon: Users, path: '/EmployeeOnboarding', category: 'Recursos Humanos' },
    { name: 'Control Presencia', icon: Calendar, path: '/AttendanceManagement', category: 'Recursos Humanos' },
    { name: 'Comités y PRL', icon: Shield, path: '/CommitteeManagement', category: 'Recursos Humanos' },
    { name: 'Plan Incentivos', icon: DollarSign, path: '/IncentiveManagement', category: 'Recursos Humanos' },
    
    // Planificación
    { name: 'Jefes de Turno', icon: Users, path: '/ShiftManagers', category: 'Planificación' },
    { name: 'Planning Diario', icon: Calendar, path: '/DailyPlanning', category: 'Planificación' },
    { name: 'Planificador Órdenes', icon: Package, path: '/ProductionPlanning', category: 'Planificación' },
    
    // Producción
    { name: 'Consulta Máquinas', icon: Wrench, path: '/MachineManagement', category: 'Producción' },
    { name: 'Config. Procesos', icon: Cog, path: '/ProcessConfiguration', category: 'Producción' },
    
    // Mantenimiento
    { name: 'Seguimiento', icon: Wrench, path: '/MaintenanceTracking', category: 'Mantenimiento' },
    
    // Análisis
    { name: 'Informes', icon: FileText, path: '/Reports', category: 'Análisis' },
    { name: 'Análisis Predictivo', icon: FileText, path: '/MLInsights', category: 'Análisis' },
    
    // Configuración
    { name: 'Configuración', icon: Settings, path: '/Configuration', category: 'Configuración' },
  ];

  // Agrupar items por categoría
  const groupedMenu = MENU_STRUCTURE.reduce((acc, item) => {
    const category = item.category || 'Otros';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  const getUserInitials = () => {
    if (!user?.full_name) return 'U';
    const names = user.full_name.split(' ');
    return names.length > 1 
      ? `${names[0][0]}${names[1][0]}`.toUpperCase()
      : names[0][0].toUpperCase();
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 w-screen overflow-hidden">
      {/* Overlay móvil */}
      {menuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${menuOpen ? 'w-64' : 'w-0'} md:w-64 bg-slate-900 dark:bg-slate-950 text-white transition-all duration-300 overflow-y-auto fixed md:relative z-40 h-full flex-shrink-0 flex flex-col`}>
        {/* Logo y título */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
              <Cog className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">CDE PlanApp</h1>
              <p className="text-xs text-slate-400">Sistema de Gestión</p>
            </div>
          </div>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Info del usuario */}
        <div className="p-4 border-b border-slate-800">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 hover:bg-slate-800 p-2 rounded-lg transition-colors">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-blue-600 text-white font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white">{user?.full_name || 'Usuario'}</p>
                  <p className="text-xs text-slate-400">{isAdmin ? 'Administrador' : 'Usuario'}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuItem className="cursor-pointer">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Mi Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Key className="mr-2 h-4 w-4" />
                <span>Cambiar Contraseña</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <div className="flex items-center w-full">
                  <ThemeToggle />
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navegación por categorías */}
        <nav className="mt-4 flex-1 overflow-y-auto px-2 pb-4">
          {Object.entries(groupedMenu).map(([category, items]) => (
            <div key={category} className="mb-2">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <span>{category}</span>
                {expandedCategories[category] ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              
              {expandedCategories[category] && (
                <div className="mt-1 space-y-1 ml-2">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPageName === item.name;
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm ${
                          isActive 
                            ? 'bg-blue-600 text-white shadow-lg' 
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <Icon size={16} className="flex-shrink-0" />
                        <span className="text-xs">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900">
        {/* Header móvil */}
        <div className="md:hidden p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <button 
            onClick={() => setMenuOpen(true)}
            className="text-slate-900 dark:text-slate-100"
          >
            <Menu size={24} />
          </button>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {currentPageName}
          </h2>
        </div>
        
        {/* Contenido de la página */}
        <div className="h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
