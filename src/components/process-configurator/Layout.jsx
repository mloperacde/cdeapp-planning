import { Outlet, NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Settings2, 
  Package, 
  GitCompare, 
  Database,
} from "lucide-react";

const navItems = [
  { path: "/NewProcessConfigurator", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/NewProcessConfigurator/articles", icon: Package, label: "Artículos" },
  { path: "/NewProcessConfigurator/configurator", icon: Settings2, label: "Configurador" },
  { path: "/NewProcessConfigurator/compare", icon: GitCompare, label: "Comparar" },
  { path: "/NewProcessConfigurator/data", icon: Database, label: "Datos Excel" },
];

export const Layout = () => {
  return (
    <div className="flex flex-col h-full w-full" data-testid="main-layout">
      {/* Top Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2">
        <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/NewProcessConfigurator"}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 border border-transparent"
                }`
              }
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 p-4 lg:p-6 overflow-auto bg-slate-50/50 dark:bg-slate-950/50">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;