/**
 * DepartmentPresenceBlock - Lista de empleados de un departamento con estado de presencia
 */
import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, XCircle, HelpCircle, TrendingDown } from "lucide-react";

const STATUS_CONFIG = {
  present: {
    label: "Presente",
    icon: CheckCircle2,
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
    rowClass: "bg-white dark:bg-slate-900",
    iconClass: "text-emerald-500",
  },
  late: {
    label: "Con retraso",
    icon: Clock,
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
    rowClass: "bg-amber-50/30 dark:bg-amber-900/10",
    iconClass: "text-amber-500",
  },
  absent_confirmed: {
    label: "Ausente",
    icon: XCircle,
    badgeClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    rowClass: "bg-red-50/30 dark:bg-red-900/10",
    iconClass: "text-red-500",
  },
  absent_no_record: {
    label: "Sin registro",
    icon: AlertCircle,
    badgeClass: "bg-red-50 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
    rowClass: "bg-red-50/20 dark:bg-red-900/10",
    iconClass: "text-red-400",
  },
  absent_predicted: {
    label: "Posible ausencia",
    icon: TrendingDown,
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
    rowClass: "bg-orange-50/20 dark:bg-orange-900/10",
    iconClass: "text-orange-400",
  },
  pending: {
    label: "Pendiente",
    icon: HelpCircle,
    badgeClass: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700",
    rowClass: "bg-white dark:bg-slate-900",
    iconClass: "text-slate-300",
  },
};

function getShiftTypeLabel(emp) {
  const tipo = emp.tipo_turno;
  if (!tipo) return null;
  if (tipo === "Turno Partido") return "T.Partido";
  if (tipo.includes("Reducción") || emp.tipo_jornada === "Jornada Parcial") return "J.Parcial";
  return null;
}

export default function DepartmentPresenceBlock({ employees, isCurrentShift, isAnalysisDate }) {
  // Ordenar: ausentes primero, luego predicciones, luego presentes, luego pendientes
  const sorted = [...employees].sort((a, b) => {
    const order = { absent_confirmed: 0, absent_no_record: 1, absent_predicted: 2, late: 3, present: 4, pending: 5 };
    return (order[a.presenceStatus] ?? 6) - (order[b.presenceStatus] ?? 6);
  });

  return (
    <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
      {sorted.map(emp => {
        const cfg = STATUS_CONFIG[emp.presenceStatus] || STATUS_CONFIG.pending;
        const StatusIcon = cfg.icon;
        const specialLabel = getShiftTypeLabel(emp);
        const entries = emp.attendance?.entries?.sort() || [];
        const firstEntry = entries[0];

        return (
          <div
            key={emp.id}
            className={`flex items-center gap-3 px-4 py-2 ${cfg.rowClass} hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors`}
          >
            {/* Icono de estado */}
            <StatusIcon className={`w-4 h-4 flex-shrink-0 ${cfg.iconClass}`} />

            {/* Nombre y puesto */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                  {emp.nombre}
                </span>
                {specialLabel && (
                  <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 rounded-full font-medium flex-shrink-0">
                    {specialLabel}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {emp.puesto || emp.categoria || "—"}
              </p>
            </div>

            {/* Hora esperada */}
            <div className="text-center flex-shrink-0 w-14">
              <p className="text-[10px] text-slate-400 leading-tight">Esperado</p>
              <p className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">
                {emp.expectedTime || "—"}
              </p>
            </div>

            {/* Hora de entrada real */}
            <div className="text-center flex-shrink-0 w-14">
              <p className="text-[10px] text-slate-400 leading-tight">Entrada</p>
              <p className={`text-xs font-mono font-semibold ${firstEntry ? "text-emerald-600 dark:text-emerald-400" : "text-slate-300"}`}>
                {firstEntry || (isCurrentShift && isAnalysisDate ? "—" : "·")}
              </p>
            </div>

            {/* Badge de estado */}
            <div className="flex-shrink-0">
              <Badge className={`text-[10px] px-2 py-0.5 border font-medium ${cfg.badgeClass}`}>
                {cfg.label}
              </Badge>
            </div>

            {/* Motivo ausencia si aplica */}
            {emp.confirmedAbsence && (
              <div className="flex-shrink-0 max-w-[80px]">
                <p className="text-[10px] text-red-500 dark:text-red-400 truncate" title={emp.confirmedAbsence.motivo}>
                  {emp.confirmedAbsence.motivo || "Ausencia"}
                </p>
              </div>
            )}
            {emp.presenceStatus === "absent_no_record" && (
              <div className="flex-shrink-0 max-w-[80px]">
                <p className="text-[10px] text-red-500 dark:text-red-400 truncate">
                  Sin fichaje
                </p>
              </div>
            )}
            {emp.predictedAbsent && !emp.confirmedAbsence && emp.presenceStatus === "absent_predicted" && (
              <div className="flex-shrink-0 max-w-[80px]">
                <p className="text-[10px] text-orange-500 dark:text-orange-400 truncate">
                  Ausente ayer
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}