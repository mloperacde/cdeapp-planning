import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Factory, 
  Calendar,
  Settings,
  UserCircle,
  LogOut
} from 'lucide-react';

// Simulación de autenticación - después vendrá de Base44
const useAuth = () => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Simular usuario
    setUser({
      email: 'admin@empresa.com',
      full_name: 'Administrador',
      role: 'admin'
    });
  }, []);
  
  return { user };
};

export default function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  
  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, color: 'blue' },
    { path: '/hr-dashboard', label: 'RRHH', icon: <Users className="w-5 h-5" />, color: 'purple' },
    { path: '/employees', label: 'Empleados', icon: <Users className="w-5 h-5" />, color: 'green' },
    { path: '/machines', label: 'Máquinas', icon: <Factory className="w-5 h-5" />, color: 'orange' },
    { path: '/timeline', label: 'Timeline', icon: <Calendar className="w-5 h-5" />, color: 'indigo' },
    { path: '/settings', label: 'Configuración', icon: <Settings className="w-5 h-5" />, color: 'gray' },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r shadow-lg flex flex-col">
        {/* Logo y título */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">CDE App</h1>
              <p className="text-xs text-gray-500">Planificación</p>
            </div>
          </div>
        </div>

        {/* Menú de navegación */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  location.pathname === item.path
                    ? `bg-${item.color}-50 text-${item.color}-700 font-semibold border-l-4 border-${item.color}-500`
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className={`text-${item.color}-500`}>
                  {item.icon}
                </div>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Información de usuario */}
        {user && (
          <div className="p-4 border-t">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <UserCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{user.full_name}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('¿Cerrar sesión?')) {
                    window.location.reload();
                  }
                }}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
