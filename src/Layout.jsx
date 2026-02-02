import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAppData } from '@/components/data/DataProvider';
import { usePermissions } from '@/components/permissions/usePermissions';
import { MENU_STRUCTURE } from '@/config/menuConfig';
import { 
  Menu, X, Cog, ChevronDown, ChevronRight, LogOut, 
  User as UserIcon, Key, Shield
} from 'lucide-react';
import { Button } from "@/components/ui/button";
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
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  
  const { canAccessPage } = usePermissions();
  
  // Validar acceso a la ruta actual
  const currentPath = location.pathname === '/' ? '/Dashboard' : location.pathname;
  // Normalizar: quitar query params y trailing slash
  const normalizedPath = currentPath.split('?')[0].replace(/\/$/, '') || '/Dashboard';
  
  // Verificar si la ruta está en el menú para aplicar restricción estricta
  // Si no está en el menú, dejamos que usePermissions decida (que permite por defecto salvo Config)
  const hasAccess = canAccessPage(normalizedPath);

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
  
  const { user, isAdmin, branding, userLoading } = useAppData();

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

  const menuItems = MENU_STRUCTURE.filter(item => canAccessPage(item.path));

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
            {branding?.logo_url ? (
              <img 
                src={branding.logo_url} 
                alt="Logo" 
                className="w-10 h-10 object-contain rounded-lg bg-white p-1"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
                <Cog className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="overflow-hidden">
              <h1 className="font-bold text-lg text-white truncate">{branding?.app_name || 'CDE PlanApp'}</h1>
              <p className="text-xs text-slate-400 truncate">{branding?.app_subtitle || 'Sistema de Gestión'}</p>
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
        {hasAccess ? (
          <div className="h-full flex flex-col">
            <div className="px-2 pt-2 pb-0">
               <Breadcrumbs auto={true} />
            </div>
            <div className="flex-1 min-h-0">
               {children}
            </div>
          </div>
        ) : !user ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              {userLoading ? (
                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              ) : (
                <>
                  <Shield className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-6" />
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Bienvenido</h2>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
                    Para acceder a la aplicación, necesitas iniciar sesión con tu cuenta.
                  </p>
                  <Button 
                    onClick={() => base44.auth.login()}
                    className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    Iniciar Sesión
                  </Button>
                </>
              )}
            </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <Shield className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-6" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Acceso Restringido</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md">
              No tienes permisos suficientes para acceder a esta página. Contacta con tu administrador si crees que es un error.
            </p>
            <Link 
              to="/Dashboard" 
              className="mt-8 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Volver al Inicio
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
