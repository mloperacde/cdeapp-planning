import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Dashboard', color: 'blue' },
    { path: '/hr-dashboard', label: 'RRHH Dashboard', color: 'purple' },
    { path: '/employees', label: 'Empleados', color: 'green' },
    { path: '/machines', label: 'Máquinas', color: 'orange' },
    { path: '/timeline', label: 'Timeline', color: 'indigo' },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r shadow-sm">
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-white">
          <h1 className="text-xl font-bold text-gray-800">CDE App</h1>
          <p className="text-sm text-gray-600">Gestión de Empleados</p>
        </div>
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                location.pathname === item.path
                  ? `bg-${item.color}-50 text-${item.color}-700 font-semibold border-l-4 border-${item.color}-500`
                  : 'text-gray-700 hover:bg-gray-100 hover:pl-6'
              }`}
            >
              <div className={`w-3 h-3 rounded-full bg-${item.color}-400 mr-3`}></div>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Contenido principal */}
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
