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
    <div className="flex h-screen w-screen bg-slate-50">
      {/* Sidebar - Desktop fijo, móvil flotante */}
      <div className={`
        transition-all duration-300
        ${menuOpen ? 'w-64' : 'w-20'}
        hidden md:flex md:flex-col
        bg-slate-900 text-white
        fixed md:relative
        h-screen md:h-screen
        z-40
        overflow-y-auto
      `}>
        <div className="p-3 flex items-center justify-center">
          <h1 className="font-bold text-lg text-white">B44</h1>
        </div>
        
        <nav className="flex-1 flex flex-col">
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
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-sm whitespace-nowrap ${
                      currentPageName === item.name ? 'bg-blue-600' : ''
                    }`}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    {menuOpen && <span className="text-xs">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 z-50 flex items-center px-4">
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-white"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="ml-4 font-bold text-white">Base44</h1>
      </div>

      {/* Mobile Overlay */}
      {menuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile Menu - Slideout */}
      {menuOpen && (
        <div className="md:hidden fixed top-16 left-0 w-64 h-screen bg-slate-900 text-white z-40 overflow-y-auto">
          <nav className="flex flex-col">
            {Object.entries(
              menuItems.reduce((grouped, item) => {
                const category = item.category || 'Otros';
                if (!grouped[category]) grouped[category] = [];
                grouped[category].push(item);
                return grouped;
              }, {})
            ).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-2 text-xs font-semibold text-slate-400 mt-4">{category}</div>
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
                    >
                      <Icon size={18} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto md:mt-0 mt-16 bg-slate-50">
        {children}
      </div>
    </div>
  );
}