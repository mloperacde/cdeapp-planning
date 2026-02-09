 
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wrench } from "lucide-react";
import MaintenanceTrackingPage from "./MaintenanceTracking";

export default function MachineMaintenancePage() {
  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header Estándar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Mantenimiento de Máquinas
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Seguimiento y registro de mantenimiento
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={createPageUrl("Machines")}>
            <Button variant="ghost" size="sm" className="h-8 gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver</span>
            </Button>
          </Link>
        </div>
      </div>
      <MaintenanceTrackingPage />
    </div>
  );
}
