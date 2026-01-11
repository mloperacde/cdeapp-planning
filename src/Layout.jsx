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
    { name: 'Base de Empleados', icon: Users, path: createPageUrl('MasterEmployeeDatabase'), category: 'Recursos Humanos' },
    { name: 'Gestión Ausencias', icon: Calendar, path: createPageUrl('AbsenceManagement'), category: 'Recursos Humanos' },
    { name: 'ETT y Temporales', icon: Users, path: createPageUrl('ETTTemporaryEmployees'), category: 'Recursos Humanos' },
    { name: 'Onboarding', icon: Users, path: createPageUrl('EmployeeOnboarding'), category: 'Recursos Humanos' },
    { name: 'Control Presencia', icon: Calendar, path: createPageUrl('AttendanceManagement'), category: 'Recursos Humanos' },
    { name: 'Comités y PRL', icon: Shield, path: createPageUrl('CommitteeManagement'), category: 'Recursos Humanos' },
    { name: 'Plan Incentivos', icon: DollarSign, path: createPageUrl('IncentiveManagement'), category: 'Recursos Humanos' },
    
    // 📅 PLANIFICACIÓN
    { name: 'Planning Diario', icon: Calendar, path: createPageUrl('DailyPlanning'), category: 'Planificación' },
    { name: 'Planning Turnos', icon: Users, path: createPageUrl('ShiftManagement'), category: 'Planificación' },
    { name: 'Planning Máquinas', icon: Wrench, path: createPageUrl('DailyPlanning'), category: 'Planificación' },
    
    // 🏭 PRODUCCIÓN
    { name: 'Consulta Máquinas', icon: Wrench, path: createPageUrl('MachineManagement'), category: 'Producción' },
    { name: 'Config. Procesos', icon: Cog, path: createPageUrl('ProcessConfiguration'), category: 'Producción' },
    
    // 🔧 MANTENIMIENTO
    { name: 'Seguimiento', icon: Wrench, path: createPageUrl('MaintenanceTracking'), category: 'Mantenimiento' },
    
    // 📈 ANÁLISIS
    { name: 'Informes', icon: FileText, path: createPageUrl('Reports'), category: 'Análisis' },
    { name: 'Análisis Predictivo', icon: FileText, path: createPageUrl('MLInsights'), category: 'Análisis' },
    
    // ⚙️ CONFIGURACIÓN
    { name: 'Configuración', icon: Settings, path: createPageUrl('Configuration'), category: 'Configuración' },
  ];

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-950 w-screen">
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
        {children}
      </div>
    </div>
  );
}