/**
 * UnmappedEmployeesPanel - Panel de diagnóstico para empleados sin código Cuco360
 * Muestra empleados que no pueden cruzarse con marcajes por falta de employee_id válido
 */
import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function UnmappedEmployeesPanel({ unmappedEmployees }) {
  const [expanded, setExpanded] = useState(false);

  if (!unmappedEmployees || unmappedEmployees.length === 0) return null;

  return (
    <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 overflow-hidden">
      {/* Header clickable */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-amber-100/60 dark:hover:bg-amber-900/20 transition-colors text-left"
      >
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex-1">
          {unmappedEmployees.length} empleado{unmappedEmployees.length !== 1 ? "s" : ""} sin código Cuco360
        </span>
        <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5">
          {unmappedEmployees.length}
        </Badge>
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        }
      </button>

      {/* Lista expandida */}
      {expanded && (
        <div className="border-t border-amber-200 dark:border-amber-800">
          <p className="px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
            Estos empleados no pueden cruzarse con marcajes de Cuco360 — aparecen como pendientes aunque hayan fichado.
          </p>
          <div className="divide-y divide-amber-100 dark:divide-amber-800/50 max-h-48 overflow-y-auto">
            {unmappedEmployees.map((emp, idx) => (
              <div key={emp.employee_db_id || idx} className="flex items-center gap-2 px-3 py-1.5">
                <X className="w-3 h-3 text-red-400 flex-shrink-0" />
                <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate">
                  {emp.nombre}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[80px]">{emp.departamento}</span>
                <span className="text-[10px] text-amber-600 font-mono bg-amber-100 dark:bg-amber-900/30 px-1.5 rounded">
                  {emp.turno}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}