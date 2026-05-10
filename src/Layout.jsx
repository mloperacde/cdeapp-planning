import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useAppData } from './components/data/DataProvider';
import { usePermissions } from '@/components/permissions/usePermissions';
import { MENU_STRUCTURE } from '@/components/config/menuConfig';
import { 
  Menu, X, Cog, ChevronDown, ChevronRight, ChevronLeft, LogOut, 
  User as UserIcon, Key, Shield, Trash2
} from 'lucide-react';
import BottomNav from '@/components/mobile/BottomNav';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import DeleteAccountDialog from '@/components/mobile/DeleteAccountDialog';
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
import NotificationBadge from '@/components/notifications/NotificationBadge';

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const isRoot = location.pathname === '/' || location.pathname === '/Dashboard';

  const handleGlobalRefresh = useCallback(async () => {
    await queryClient.refetchQueries({ type: 'active' });
  }, [queryClient]);
  
  const { canAccessPage } = usePermissions();
  
  // Validar acceso a la ruta actual
  const currentPath = location.pathname === '/' ? '/Dashboard' : location.pathname;
  // Normalizar: quitar query params y trailing slash
  const normalizedPath = currentPath.split('?')[0].replace(/\/$/, '') || '/Dashboard';
  
  const isFullScreenDisplay = normalizedPath === '/ShiftAssignmentsDisplay' || normalizedPath === '/ManufacturingKiosk' || normalizedPath === '/ManufacturingKioskList';
  const hasAccess = canAccessPage(normalizedPath) || normalizedPath === '/BreaksDebug' || normalizedPath === '/Breaks';

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const prevPathRef = useRef(location.pathname);
  const [pageKey, setPageKey] = useState(0);

  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      setPageKey(k => k + 1);
    }
  }, [location.pathname]);

  const handleDeleteAccount = async () => {
    // Placeholder – extend with real account deletion logic if needed
    await base44.auth.logout();
  };

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
  
  const { user, isAdmin, branding, userLoading, rolesConfig } = useAppData();
  const { role: effectiveRole } = usePermissions();

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

  if (isFullScreenDisplay) {
    return (
      <div className="min-h-screen w-full bg-slate-900">
        {hasAccess ? children : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-background w-full max-w-full overflow-x-hidden">
      {/* Overlay móvil */}
      {menuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${menuOpen ? 'w-64' : 'w-0'} md:w-64 bg-slate-900 dark:bg-slate-950 text-white transition-all duration-300 overflow-visible overflow-x-hidden fixed md:fixed z-40 h-screen flex-shrink-0 flex flex-col border-r border-slate-800 dark:border-slate-800`}>
        {/* Logo y título */}
        <div className="p-4 border-b border-slate-800 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {branding?.logo_url ? (
              <img 
                src={branding.logo_url} 
                alt="Logo" 
                className="w-9 h-9 object-contain rounded-md bg-white/10 p-0.5 flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 bg-blue-600 rounded-md flex items-center justify-center flex-shrink-0">
                <Cog className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="overflow-hidden min-w-0">
              <h1 className="font-bold text-sm text-white leading-tight truncate">{branding?.app_name || 'CDE PlanApp'}</h1>
              <p className="text-xs text-slate-400 leading-snug truncate">{branding?.app_subtitle || 'Sistema de Gestión'}</p>
            </div>
            </div>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-white flex-shrink-0 ml-2"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info del usuario */}
        <div className="p-4 border-b border-slate-800 dark:border-border">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex-1 flex items-center gap-3 hover:bg-slate-800 dark:hover:bg-accent/10 p-2 rounded-lg transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-600 text-white font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-white">{user?.full_name || 'Usuario'}</p>
                    <p className="text-xs text-slate-400">
                      {isAdmin ? 'Administrador' : (rolesConfig?.roles?.[effectiveRole]?.name || 'Usuario')}
                    </p>
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
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Eliminar Cuenta</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
            <NotificationBadge currentEmployee={user} />
            </div>
            </div>

        {/* Navegación por categorías */}
        <nav className="mt-4 flex-1 px-2 pb-4 overflow-y-auto overflow-x-hidden space-y-1">
          {Object.entries(groupedMenu).map(([category, items]) => (
            <div key={category} className="mb-1">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-lg transition-colors duration-150"
              >
                <span>{category}</span>
                {expandedCategories[category] ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              
              {expandedCategories[category] && (
                <div className="mt-1 space-y-0.5 ml-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPageName === item.name;
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-all duration-150 ${
                          isActive 
                            ? 'bg-blue-600 text-white' 
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <Icon size={15} className="flex-shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteAccount}
      />

      {/* Bottom nav - mobile only */}
      <BottomNav />

      {/* Contenido principal */}
      <div className="flex-1 min-w-0 bg-slate-50 dark:bg-background overflow-visible md:ml-64 pb-safe-bottom" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 56px)' }}>
        {/* Header móvil */}
        <div className="md:hidden p-3 bg-white dark:bg-card border-b border-slate-200 dark:border-border flex items-center gap-3 min-h-[56px]">
          {!isRoot && (
            <button
              onClick={() => navigate(-1)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-900 dark:text-foreground rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Volver"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <h2 className="flex-1 text-base font-semibold text-slate-900 dark:text-foreground truncate">
            {currentPageName}
          </h2>
          <button 
            onClick={() => setMenuOpen(true)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-900 dark:text-foreground rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Menú"
          >
            <Menu size={24} />
          </button>
        </div>
        
        {/* Contenido de la página */}
          {hasAccess ? (
            <PullToRefresh onRefresh={handleGlobalRefresh} className="h-full" id="main-content">
            <div className="h-full flex flex-col">
              <div className="hidden lg:block px-4 pt-4 pb-2">
                 <Breadcrumbs auto={true} />
              </div>
              <div key={pageKey} className="flex-1 min-h-0 page-enter">
                 {children}
              </div>
            </div>
            </PullToRefresh>
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