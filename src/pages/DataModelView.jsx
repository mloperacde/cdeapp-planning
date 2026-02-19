import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GitBranch } from "lucide-react";
import DataModelDiagram from "@/components/audit/DataModelDiagram";

export default function DataModelView() {
  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
            <GitBranch className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Modelo de Datos — Relaciones entre Entidades
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Fase 1 del Plan de Mejora Arquitectural · employee_id estandarizado
            </p>
          </div>
        </div>
        <Link to="/Configuration">
          <Button variant="ghost" size="sm" className="h-8 gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Configuración</span>
          </Button>
        </Link>
      </div>

      <DataModelDiagram />
    </div>
  );
}