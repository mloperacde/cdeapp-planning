import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Menu, X, Home, Users, Calendar, Wrench, Settings, FileText, Shield, DollarSign, Cog, Package } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    // 📊 PRINCIPAL
    { name: 'Dashboard', icon: Home, path: createPageUrl('Dashboard'), category: 'Principal' },
    
    // 👥 RECURSOS HUMANOS
    { name: 'Base de Empleados', icon: Users, path: createPageUrl('MasterEmployeeDatabase'), category: 'RRHH' },
    { name: 'Gestión Ausencias', icon: Calendar, path: createPageUrl('AbsenceManagement'), category: 'RRHH' },
    { name: 'ETT y Temporales', icon: Users, path: createPageUrl('ETTTemporaryEmployees'), category: 'RRHH' },
    { name: 'Onboarding', icon: Users, path: createPageUrl('EmployeeOnboarding'), category: 'RRHH' },
    { name: 'Control Presencia', icon: Calendar, path: createPageUrl('AttendanceManagement'), category: 'RRHH' },
    { name: 'Comités y PRL', icon: Shield, path: createPageUrl('CommitteeManagement'), category: 'RRHH' },
    { name: 'Plan Incentivos', icon: DollarSign, path: createPageUrl('IncentiveManagement'), category: 'RRHH' },
    
    // 📅 PLANIFICACIÓN
    { name: 'Planning Diario', icon: Calendar, path: createPageUrl('DailyPlanning'), category: 'Planificación' },
    { name: 'Planning Turnos', icon: Users, path: createPageUrl('ShiftManagement'), category: 'Planificación' },
    { name: 'Jefes de Turno', icon: Users, path: createPageUrl('ShiftManagers'), category: 'Planificación' },
    
    // 🏭 PRODUCCIÓN
    { name: 'Consulta Máquinas', icon: Wrench, path: createPageUrl('MachineManagement'), category: 'Producción' },
    { name: 'Config. Procesos', icon: Cog, path: createPageUrl('ProcessConfiguration'), category: 'Producción' },
    { name: 'Artículos', icon: Package, path: createPageUrl('ArticleManagement'), category: 'Producción' },
    
    // 🔧 MANTENIMIENTO
    { name: 'Seguimiento', icon: Wrench, path: createPageUrl('MaintenanceTracking'), category: 'Mantenimiento' },
    
    // 📈 ANÁLISIS
    { name: 'Informes', icon: FileText, path: createPageUrl('Reports'), category: 'Análisis' },
    
    // ⚙️ CONFIGURACIÓN
    { name: 'Configuración', icon: Settings, path: createPageUrl('Configuration'), category: 'Configuración' },
  ];

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-950">
      {/* Sidebar - Mobile */}
      {menuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setMenuOpen(false)}
        />
      )}
      
      <div className={`${menuOpen ? 'w-64' : 'w-0'} md:w-20 bg-slate-900 text-white transition-all duration-300 overflow-hidden md:overflow-visible fixed md:relative z-40 h-full`}>
        <div className="p-4 flex items-center justify-between">
          <h1 className="font-bold text-xl hidden md:block text-center w-full">Base44</h1>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-white"
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
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-sm ${
                      currentPageName === item.name ? 'bg-blue-600' : ''
                    }`}
                    title={!menuOpen ? item.name : ''}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span className="hidden md:inline text-xs">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto w-full bg-white dark:bg-slate-900">
        {children}
      </div>
    </div>
  );
}