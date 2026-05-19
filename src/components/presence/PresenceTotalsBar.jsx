/**
 * PresenceTotalsBar - Barra de resumen de presencia con KPIs visuales
 */
import React from "react";

export default function PresenceTotalsBar({ totals, label, variant = "shift" }) {
  const { expected, present, absent, predicted, pending } = totals;
  const available = present;
  const pct = expected > 0 ? Math.round((available / expected) * 100) : 0;

  const isGlobal = variant === "global";

  return (
    <div className={`flex flex-wrap items-center gap-3 ${isGlobal ? "py-2" : ""}`}>
      {/* Personas disponibles / esperadas */}
      <div className="flex items-center gap-1.5">
        <div className={`rounded-lg px-3 py-1 ${isGlobal ? "bg-slate-100 dark:bg-slate-800" : "bg-white/60 dark:bg-slate-900/40"}`}>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{available}</span>
          <span className="text-xs text-slate-400 font-normal"> / {expected}</span>
          <span className="text-[10px] text-slate-400 ml-1">disponibles</span>
        </div>
        {expected > 0 && (
          <div className={`rounded-lg px-2 py-1 text-xs font-semibold ${
            pct >= 90 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : pct >= 70 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}>
            {pct}%
          </div>
        )}
      </div>

      {/* Mini indicadores */}
      <div className="flex items-center gap-2 flex-wrap">
        {absent > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              <strong className="text-red-600 dark:text-red-400">{absent}</strong> ausente{absent !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        {predicted > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              <strong className="text-orange-600 dark:text-orange-400">~{predicted}</strong> posible{predicted !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        {pending > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-slate-300" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              <strong>{pending}</strong> sin verificar
            </span>
          </div>
        )}
      </div>

      {/* Barra visual */}
      {expected > 0 && (
        <div className="flex-1 min-w-[80px] h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex gap-px">
          {present > 0 && (
            <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${(present / expected) * 100}%` }} />
          )}
          {absent > 0 && (
            <div className="bg-red-500 h-full transition-all" style={{ width: `${(absent / expected) * 100}%` }} />
          )}
          {predicted > 0 && (
            <div className="bg-orange-400 h-full transition-all" style={{ width: `${(predicted / expected) * 100}%` }} />
          )}
        </div>
      )}
    </div>
  );
}