import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Menu, X, Home, Users, Calendar, Wrench, Settings, FileText } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', icon: Home, path: createPageUrl('Dashboard') },
    { name: 'Empleados', icon: Users, path: createPageUrl('MasterEmployeeDatabase') },
    { name: 'Ausencias', icon: Calendar, path: createPageUrl('AbsenceManagement') },
    { name: 'Mantenimiento', icon: Wrench, path: createPageUrl('MaintenanceTracking') },
    { name: 'Máquinas', icon: Wrench, path: createPageUrl('MachineManagement') },
    { name: 'Configuración', icon: Settings, path: createPageUrl('Configuration') },
    { name: 'Informes', icon: FileText, path: createPageUrl('Reports') },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${menuOpen ? 'w-64' : 'w-0 md:w-20'} bg-slate-900 text-white transition-all duration-300 overflow-hidden md:overflow-visible fixed md:relative z-40 h-full md:h-auto`}>
        <div className="p-4 flex items-center justify-between">
          <h1 className={`font-bold text-xl ${!menuOpen && 'hidden md:block text-center w-full'}`}>Base44</h1>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-white"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        <nav className="mt-8">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors ${
                  currentPageName === item.name ? 'bg-blue-600' : ''
                }`}
              >
                <Icon size={20} />
                <span className={`${!menuOpen && 'hidden'} md:inline`}>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Overlay para móvil */}
      {menuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}