import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Menu, X, Home, Users, Calendar, Wrench, Settings, FileText, Shield, DollarSign, Cog, Package } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // ✅ MENÚ SINCRONIZADO CON RUTAS (pages/index.jsx)
  const MENU_STRUCTURE = React.useMemo(() => [
    // Principal
    { name: 'Dashboard', icon: Home, path: '/Dashboard', category: 'Principal' },
    
    // Recursos Humanos
    { name: 'Base de Empleados', icon: Users, path: '/MasterEmployeeDatabase', category: 'Recursos Humanos' },
    { name: 'Gestión Ausencias', icon: Calendar, path: '/AbsenceManagement', category: 'Recursos Humanos' },
    { name: 'ETT y Temporales', icon: Users, path: '/ETTTemporaryEmployees', category: 'Recursos Humanos' },
    { name: 'Onboarding', icon: Users, path: '/EmployeeOnboarding', category: 'Recursos Humanos' },
    { name: 'Control Presencia', icon: Calendar, path: '/AttendanceManagement', category: 'Recursos Humanos' },
    { name: 'Comités y PRL', icon: Shield, path: '/CommitteeManagement', category: 'Recursos Humanos' },
    { name: 'Plan Incentivos', icon: DollarSign, path: '/IncentiveManagement', category: 'Recursos Humanos' },
    
    // Planificación
    { name: 'Planning Diario', icon: Calendar, path: '/DailyPlanning', category: 'Planificación' },
    { name: 'Planning Turnos', icon: Users, path: '/ShiftManagement', category: 'Planificación' },
    { name: 'Jefes de Turno', icon: Users, path: '/ShiftManagers', category: 'Planificación' },
    { name: 'Planificador Órdenes', icon: Package, path: '/ProductionPlanning', category: 'Planificación' },
    
    // Producción
    { name: 'Consulta Máquinas', icon: Wrench, path: '/MachineManagement', category: 'Producción' },
    { name: 'Config. Procesos', icon: Cog, path: '/ProcessConfiguration', category: 'Producción' },
    
    // Mantenimiento
    { name: 'Seguimiento', icon: Wrench, path: '/MaintenanceTracking', category: 'Mantenimiento' },
    
    // Análisis
    { name: 'Informes', icon: FileText, path: '/Reports', category: 'Análisis' },
    { name: 'Análisis Predictivo', icon: FileText, path: '/MLInsights', category: 'Análisis' },
    { name: 'Dashboard RRHH', icon: Users, path: '/AdvancedHRDashboard', category: 'Análisis' },
    
    // Configuración
    { name: 'Configuración', icon: Settings, path: '/Configuration', category: 'Configuración' },
  ], []);

  const menuItems = MENU_STRUCTURE;

  return (
    <div className="flex h-screen bg-white dark:bg-slate-900 w-screen overflow-hidden">
      {/* Sidebar - Mobile */}
      {menuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setMenuOpen(false)}
        />
      )}
      
      <div className={`${menuOpen ? 'w-64' : 'w-0'} md:w-64 bg-slate-900 text-white transition-all duration-300 overflow-y-auto md:overflow-y-auto fixed md:relative z-40 h-full flex-shrink-0`}>
        <div className="p-4 flex items-center justify-between md:justify-center">
          <h1 className="font-bold text-lg md:text-xl">Base44</h1>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-white ml-auto"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        <nav className="mt-8 space-y-1">
          {Object.entries(
            menuItems.reduce((grouped, item) => {
              const category = item.category || 'Otros';
              if (!grouped[category]) grouped[category] = [];
              grouped[category].push(item);
              return grouped;
            }, {})
          ).map(([category, items]) => (
            <div key={category}>
              {menuOpen && <div className="px-4 py-2 text-xs font-semibold text-slate-400 mt-4">{category}</div>}
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-sm whitespace-nowrap ${
                      currentPageName === item.name ? 'bg-blue-600' : ''
                    }`}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span className="text-xs">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-slate-900">
        <div className="md:hidden p-4 border-b border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => setMenuOpen(true)}
            className="text-slate-900 dark:text-slate-100"
          >
            <Menu size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}