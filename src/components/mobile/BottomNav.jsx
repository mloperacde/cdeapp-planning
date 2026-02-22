import { useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, User } from 'lucide-react';

const TABS = [
  { label: 'Inicio',    path: '/Dashboard',              icon: Home },
  { label: 'Ausencias', path: '/AbsenceManagement',      icon: Calendar },
  { label: 'Perfil',   path: '/MasterEmployeeDatabase',  icon: User },
];

// Preserve scroll position per tab
const scrollPositions = {};

export default function BottomNav() {
  const { pathname } = useLocation();
  const prevPath = useRef(pathname);

  useEffect(() => {
    const prev = prevPath.current;
    prevPath.current = pathname;

    // Save scroll position of the page we just left
    const mainContent = document.getElementById('main-content');
    if (mainContent && prev !== pathname) {
      scrollPositions[prev] = mainContent.scrollTop;
      // Restore scroll for the new path (after a tick so content has rendered)
      requestAnimationFrame(() => {
        if (mainContent) {
          mainContent.scrollTop = scrollPositions[pathname] ?? 0;
        }
      });
    }
  }, [pathname]);

  return (
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
    </nav>
  );
}