import { Outlet, NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Settings2, 
  Package, 
  GitCompare, 
  Database,
  Factory
} from "lucide-react";

const navItems = [
  { path: "/NewProcessConfigurator", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/NewProcessConfigurator/configurator", icon: Settings2, label: "Configurador" },
  { path: "/NewProcessConfigurator/articles", icon: Package, label: "Artículos" },
  { path: "/NewProcessConfigurator/compare", icon: GitCompare, label: "Comparar" },
  { path: "/NewProcessConfigurator/data", icon: Database, label: "Datos Excel" },
];

export const Layout = () => {
  return (
    <div className="flex min-h-screen w-full" data-testid="main-layout">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-card" data-testid="sidebar">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b px-6">
          <Factory className="h-7 w-7 text-primary" />
          <span className="font-bold text-lg tracking-tight">ProcessConfig</span>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1" data-testid="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/NewProcessConfigurator"}
              className={({ isActive }) =>
                `sidebar-nav-item flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        
        {/* Footer */}
        <div className="border-t p-4">
          <p className="text-xs text-muted-foreground text-center">
            Configurador de Procesos v1.0
          </p>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-col flex-1">
        <header className="lg:hidden flex h-14 items-center gap-4 border-b bg-card px-4">
          <Factory className="h-6 w-6 text-primary" />
          <span className="font-bold">ProcessConfig</span>
        </header>
        
        {/* Mobile navigation */}
        <nav className="lg:hidden flex items-center gap-1 border-b bg-card px-2 py-2 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-sm px-3 py-2 text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;