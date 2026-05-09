import { useRef, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, User, Menu, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { usePermissions } from '@/components/permissions/usePermissions';
import { MENU_STRUCTURE } from '@/components/config/menuConfig';

const TABS = [
  { label: 'Inicio',    path: '/Dashboard',         icon: Home },
  { label: 'Ausencias', path: '/AbsenceManagement', icon: Calendar },
  { label: 'Perfil',    path: '/MasterEmployeeDatabase', icon: User },
];

// Preserve scroll position per tab
const scrollPositions = {};

export default function BottomNav() {
  const { pathname } = useLocation();
  const prevPath = useRef(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const { canAccessPage } = usePermissions();

  useEffect(() => {
    const prev = prevPath.current;
    prevPath.current = pathname;

    const mainContent = document.getElementById('main-content');
    if (mainContent && prev !== pathname) {
      scrollPositions[prev] = mainContent.scrollTop;
      requestAnimationFrame(() => {
        if (mainContent) {
          mainContent.scrollTop = scrollPositions[pathname] ?? 0;
        }
      });
    }
  }, [pathname]);

  // Close sheet when navigating
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const menuItems = MENU_STRUCTURE.filter(item => canAccessPage(item.path));

  const groupedMenu = menuItems.reduce((acc, item) => {
    const category = item.category || 'Otros';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-slate-900 border-t border-slate-700"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map(({ label, path, icon: Icon }) => {
          const active = pathname === path || pathname.startsWith(path + '/');
          return (
            <Link
              key={path}
              to={path}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors select-none min-h-[52px] ${
                active ? 'text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.7} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}

        {/* Menú tab */}
        <button
          onClick={() => setMenuOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors select-none min-h-[52px] text-slate-400 hover:text-white"
        >
          <Menu size={22} strokeWidth={1.7} />
          <span className="text-[10px] font-medium">Menú</span>
        </button>
      </nav>

      {/* Full menu sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto bg-slate-900 text-white border-t border-slate-700 rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-white text-base">Navegación</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pb-8">
            {Object.entries(groupedMenu).map(([category, items]) => (
              <div key={category}>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 mb-1">{category}</p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm ${
                          active
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <Icon size={16} className="shrink-0" />
                        <span className="flex-1 text-sm">{item.name}</span>
                        {!active && <ChevronRight size={14} className="text-slate-500" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}