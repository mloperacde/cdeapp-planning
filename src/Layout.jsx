import { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAppData } from '@/components/data/DataProvider';
import { 
  Menu, X, Home, Users, Calendar, Wrench, Settings, FileText, Shield, 
  DollarSign, Cog, Package, ChevronDown, ChevronRight, LogOut, 
  User as UserIcon, Key, Award, RefreshCw, ClipboardCheck, Briefcase, Factory
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ThemeToggle from '@/components/common/ThemeToggle';
import Breadcrumbs from '@/components/common/Breadcrumbs';

export default function Layout({ children, currentPageName }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({
    'Principal': true,
    'Recursos Humanos': true,
    'Dirección': true,
    'Planificación': true,
    'Fabricación': true,
    'Mantenimiento': true,
    'Almacén': true,
    'Calidad': true,
    'Análisis': true,
    'Configuración': true,
    'Revisión de páginas': true
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

  const MENU_STRUCTURE = [
    // Principal
    { name: 'Dashboard', icon: Home, path: '/Dashboard', category: 'Principal' },
    
    // Recursos Humanos
    { name: 'Dashboard RRHH', icon: Users, path: '/AdvancedHRDashboard', category: 'Recursos Humanos' },
    { name: 'Base de datos de Empleados', icon: Users, path: '/MasterEmployeeDatabase', category: 'Recursos Humanos' },
    { name: 'Gestión Ausencias', icon: Calendar, path: '/AbsenceManagement', category: 'Recursos Humanos' },
    { name: 'Matriz Habilidades', icon: Award, path: '/SkillMatrix', category: 'Recursos Humanos' },
    { name: 'Temporales/ETT/Onboarding', icon: Users, path: '/EmployeeOnboarding', category: 'Recursos Humanos' },
    { name: 'Control Presencia', icon: Calendar, path: '/AttendanceManagement', category: 'Recursos Humanos' },
    { name: 'Comités y PRL', icon: Shield, path: '/CommitteeManagement', category: 'Recursos Humanos' },
    { name: 'Plan Incentivos', icon: DollarSign, path: '/IncentiveManagement', category: 'Recursos Humanos' },

    // Dirección
    { name: 'Dirección - Habilidades', icon: Award, path: '/DireccionSkills', category: 'Dirección' },
    
    // Planificación
    { name: 'Personal Fabricación', icon: Briefcase, path: '/EmployeesShiftManager', category: 'Planificación' },
    { name: 'Planning Diario', icon: Calendar, path: '/DailyPlanning', category: 'Planificación' },
    { name: 'Planificador Órdenes', icon: Package, path: '/ProductionPlanning', category: 'Planificación' },
    { name: 'Planificación - Habilidades', icon: Award, path: '/PlanificacionSkills', category: 'Planificación' },

    // Fabricación
    { name: 'Config. Fabricación', icon: Factory, path: '/ManufacturingConfig', category: 'Fabricación' },
    { name: 'Jefes de Turno', icon: Users, path: '/ShiftManagers', category: 'Fabricación' },
    { name: 'Consulta Máquinas', icon: Wrench, path: '/MachineManagement', category: 'Fabricación' },
    { name: 'Control Calidad', icon: ClipboardCheck, path: '/QualityControl', category: 'Fabricación' },
    { name: 'Config. Procesos', icon: Cog, path: '/ProcessConfiguration', category: 'Fabricación' },
    { name: 'Fabricación - Habilidades', icon: Award, path: '/FabricacionSkills', category: 'Fabricación' },
    
    // Mantenimiento
    { name: 'Seguimiento', icon: Wrench, path: '/MaintenanceTracking', category: 'Mantenimiento' },
    { name: 'Mantenimiento - Habilidades', icon: Award, path: '/MantenimientoSkills', category: 'Mantenimiento' },

    // Almacén
    { name: 'Almacén - Habilidades', icon: Award, path: '/AlmacenSkills', category: 'Almacén' },

    // Calidad
    { name: 'Calidad - Habilidades', icon: Award, path: '/CalidadSkills', category: 'Calidad' },
    
    // Análisis
    { name: 'Informes', icon: FileText, path: '/Reports', category: 'Análisis' },
    { name: 'Análisis Predictivo', icon: FileText, path: '/MLInsights', category: 'Análisis' },
    
    // Configuración
    { name: 'Configuración', icon: Settings, path: '/Configuration', category: 'Configuración' },

    // Revisión de páginas (solo vistas que seguimos revisando)
    { name: 'DailyShiftPlanning', icon: Calendar, path: '/DailyShiftPlanning', category: 'Revisión de páginas' },
    { name: 'EmailNotifications', icon: FileText, path: '/EmailNotifications', category: 'Revisión de páginas' },
    { name: 'EmployeeAbsenceInfo', icon: Users, path: '/EmployeeAbsenceInfo', category: 'Revisión de páginas' },
    { name: 'ArticleManagement', icon: FileText, path: '/ArticleManagement', category: 'Revisión de páginas' },
    { name: 'LockerManagement', icon: Package, path: '/LockerManagement', category: 'Revisión de páginas' },
    { name: 'MachineAssignments', icon: Users, path: '/MachineAssignments', category: 'Revisión de páginas' },
    { name: 'MachineMaintenance', icon: Wrench, path: '/MachineMaintenance', category: 'Revisión de páginas' },
    { name: 'PerformanceManagement', icon: FileText, path: '/PerformanceManagement', category: 'Revisión de páginas' },
    { name: 'SupportManagement1415', icon: FileText, path: '/SupportManagement1415', category: 'Revisión de páginas' },
    { name: 'Timeline', icon: Calendar, path: '/Timeline', category: 'Revisión de páginas' },
    { name: 'Breaks', icon: Calendar, path: '/Breaks', category: 'Revisión de páginas' },
  ];

  const menuItems = isAdmin 
    ? MENU_STRUCTURE 
    : MENU_STRUCTURE.filter(item => item.category !== 'Configuración');

  const groupedMenu = menuItems.reduce((acc, item) => {
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
    <div className="flex h-screen bg-slate-50 dark:bg-background w-screen overflow-hidden">
      {/* Overlay móvil */}
      {menuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${menuOpen ? 'w-64' : 'w-0'} md:w-64 bg-slate-900 dark:bg-card text-white transition-all duration-300 overflow-y-auto fixed md:relative z-40 h-full flex-shrink-0 flex flex-col border-r border-slate-800 dark:border-border`}>
        {/* Logo y título */}
        <div className="p-4 border-b border-slate-800 dark:border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
              <Cog className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">CDE PlanApp</h1>
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
        <div className="p-4 border-b border-slate-800 dark:border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 hover:bg-slate-800 dark:hover:bg-accent/10 p-2 rounded-lg transition-colors">
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
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-accent/10 rounded-lg transition-colors"
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
                            : 'text-slate-300 hover:bg-slate-800 dark:hover:bg-accent/10 hover:text-white'
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
      <div className="flex-1 overflow-auto bg-slate-50 dark:bg-background">
        {/* Header móvil */}
        <div className="md:hidden p-4 bg-white dark:bg-card border-b border-slate-200 dark:border-border flex items-center justify-between">
          <button 
            onClick={() => setMenuOpen(true)}
            className="text-slate-900 dark:text-foreground"
          >
            <Menu size={24} />
          </button>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-foreground">
            {currentPageName}
          </h2>
        </div>
        
        {/* Contenido de la página */}
        <div className="h-full flex flex-col">
          <div className="px-6 pt-6 md:px-8 md:pt-8 pb-0">
             <Breadcrumbs auto={true} />
          </div>
          <div className="flex-1">
             {children}
          </div>
        </div>
      </div>
    </div>
  );
}
