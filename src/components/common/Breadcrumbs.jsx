import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function Breadcrumbs({ items = [], auto = true, showBack = false, onBack }) {
  const location = useLocation();

  const labelMap = {
    Dashboard: "Dashboard",
    Configuration: "Configuración",
    QualityControl: "Control de Calidad",
    ProductionDashboard: "Dashboard de Producción",
    MachineManagement: "Consulta de Máquinas",
    MachineMaster: "Maestro de Máquinas",
    ProcessConfiguration: "Configuración de Procesos",
    Reports: "Informes",
    DocumentManagement: "Gestión Documental",
    DailyShiftPlanning: "Planificación Diaria",
    MaintenanceTracking: "Seguimiento de Mantenimiento",
    ProductionPlanning: "Planificación de Producción",
    ShiftHandover: "Entrega de Turno",
    AbsenceManagement: "Gestión de Ausencias",
    MobileHome: "Móvil",
    MobilePlanning: "Mi Planificación"
  };
  labelMap.ShiftManagement = "Intercambios";
  labelMap.EmployeesShiftManager = "Personal de Fabricación";
  labelMap.ShiftPlanning = "Planificación de Equipos";
  labelMap.MachineAssignments = "Asignaciones de Máquinas";

  const formatLabel = (segment) => {
    if (labelMap[segment]) return labelMap[segment];
    const s = segment.replace(/[-_]/g, " ");
    return s.replace(/([A-Z])/g, " $1").trim().replace(/\s+/g, " ").replace(/^./, (c) => c.toUpperCase());
  };

  const autoItems = React.useMemo(() => {
    if (!auto || items.length > 0) return items;
    const path = location.pathname.replace(/^\//, "");
    if (!path) return [];
    const segments = path.split("/").filter(Boolean);
    return segments.map((seg, idx) => ({
      label: formatLabel(seg),
      url: idx < segments.length - 1 ? `/${segments.slice(0, idx + 1).join("/")}` : undefined
    }));
  }, [auto, items, location.pathname]);

  const finalItems = items.length > 0 ? items : autoItems;

  return (
    <nav className="flex items-center gap-2 text-sm mb-4">
      <Link 
        to={createPageUrl("Dashboard")} 
        className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <Home className="w-4 h-4" />
        <span>Inicio</span>
      </Link>
      {finalItems.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600" />
          {item.url && index < finalItems.length - 1 ? (
            <Link 
              to={item.url} 
              className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="ml-auto text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
        >
          Volver
        </button>
      )}
    </nav>
  );
}
