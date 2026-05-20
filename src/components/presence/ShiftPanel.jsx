/**
 * ShiftPanel - Panel de un turno con agrupación por departamento
 * Muestra personas esperadas, hora esperada, verificación de presencia y predicciones
 */
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon, ChevronDown, ChevronRight, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import PresenceTotalsBar from "./PresenceTotalsBar";
import DepartmentPresenceBlock from "./DepartmentPresenceBlock";

function timeToMinutes(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Devuelve "before" | "active" | "closed"
function getShiftLifecycle(timeRange, nowMins) {
  const match = timeRange.match(/(\d{2}:\d{2})\s*[–\-]\s*(\d{2}:\d{2})/);
  if (!match) return "active";
  const start = timeToMinutes(match[1]);
  const end = timeToMinutes(match[2]);
  if (nowMins < start) return "before";
  if (nowMins >= end) return "closed";
  return "active";
}

export default function ShiftPanel({ shiftKey, label, timeRange, employees, nowMinutes, isAnalysisDate }) {
  const [expandedDepts, setExpandedDepts] = useState({});

  // Agrupar por departamento
  const byDepartment = useMemo(() => {
    const map = {};
    for (const emp of employees) {
      const dept = emp.departamento || "Sin Departamento";
      if (!map[dept]) map[dept] = [];
      map[dept].push(emp);
    }
    // Ordenar departamentos alfabéticamente
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [employees]);

  // Totales del turno — absent_no_record suma como ausente
  const shiftTotals = useMemo(() => ({
    expected: employees.length,
    present: employees.filter(e => e.presenceStatus === "present" || e.presenceStatus === "late").length,
    absent: employees.filter(e => e.presenceStatus === "absent_confirmed" || e.presenceStatus === "absent_no_record").length,
    predicted: employees.filter(e => e.presenceStatus === "absent_predicted").length,
    pending: employees.filter(e => e.presenceStatus === "pending").length,
  }), [employees]);

  // Ciclo del turno basado en hora actual
  const shiftLifecycle = isAnalysisDate
    ? getShiftLifecycle(timeRange, nowMinutes ?? 0)
    : "closed";

  const isMorning = shiftKey === "manana";
  const ShiftIcon = isMorning ? Sun : Moon;
  const headerColor = isMorning
    ? "from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800"
    : "from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-indigo-200 dark:border-indigo-800";
  const iconColor = isMorning ? "text-amber-500" : "text-indigo-400";

  const toggleDept = (dept) => {
    setExpandedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
  };

  // Por defecto expandir todos los departamentos
  const isDeptExpanded = (dept) => expandedDepts[dept] !== false;

  return (
    <Card className={`border shadow-sm overflow-hidden`}>
      {/* Header del turno */}
      <CardHeader className={`bg-gradient-to-r ${headerColor} border-b px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShiftIcon className={`w-4 h-4 ${iconColor}`} />
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">{label}</CardTitle>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{timeRange}</span>
            {isAnalysisDate && shiftLifecycle === "active" && (
              <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 animate-pulse">
                EN CURSO
              </Badge>
            )}
            {isAnalysisDate && shiftLifecycle === "closed" && (
              <Badge className="bg-slate-500 text-white text-[10px] px-1.5 py-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                FINALIZADO
              </Badge>
            )}
            {isAnalysisDate && shiftLifecycle === "before" && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-slate-500">
                PRÓXIMO
              </Badge>
            )}
            {!isAnalysisDate && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-slate-500">
                Histórico
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">{employees.length} personas</span>
          </div>
        </div>

        {/* Barra de totales del turno */}
        <div className="mt-2">
          <PresenceTotalsBar totals={shiftTotals} label={label} variant="shift" />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {employees.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            <Clock className="w-6 h-6 mx-auto mb-2 text-slate-300" />
            No hay empleados asignados a este turno
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {byDepartment.map(([dept, deptEmployees]) => {
              const expanded = isDeptExpanded(dept);
              const deptTotals = {
                expected: deptEmployees.length,
                present: deptEmployees.filter(e => e.presenceStatus === "present" || e.presenceStatus === "late").length,
                absent: deptEmployees.filter(e => e.presenceStatus === "absent_confirmed").length,
                predicted: deptEmployees.filter(e => e.presenceStatus === "absent_predicted").length,
                pending: deptEmployees.filter(e => e.presenceStatus === "pending").length,
              };
              const hasIssues = deptTotals.absent > 0 || deptTotals.predicted > 0;

              return (
                <div key={dept}>
                  {/* Cabecera de departamento */}
                  <button
                    onClick={() => toggleDept(dept)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {expanded
                        ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      }
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1 truncate">{dept}</span>
                      {hasIssues && (
                        <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      )}
                      {/* Contadores por estado */}
                      <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                        <span className="text-[11px] text-slate-500 font-mono">
                          <span className="font-bold text-emerald-600">{deptTotals.present}</span>
                          <span className="text-slate-400">/{deptTotals.expected}</span>
                        </span>
                        {deptTotals.absent > 0 && (
                          <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full font-semibold leading-none">
                            {deptTotals.absent} aus
                          </span>
                        )}
                        {deptTotals.predicted > 0 && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-semibold leading-none">
                            ~{deptTotals.predicted}
                          </span>
                        )}
                        {deptTotals.pending > 0 && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 px-1.5 py-0.5 rounded-full font-semibold leading-none">
                            {deptTotals.pending} pend
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Barra de progreso del departamento */}
                    {deptTotals.expected > 0 && (
                      <div className="mt-1.5 ml-5 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-300"
                          style={{ width: `${(deptTotals.present / deptTotals.expected) * 100}%` }}
                        />
                        <div
                          className="bg-red-400 h-full transition-all duration-300"
                          style={{ width: `${(deptTotals.absent / deptTotals.expected) * 100}%` }}
                        />
                        <div
                          className="bg-amber-400 h-full transition-all duration-300"
                          style={{ width: `${(deptTotals.predicted / deptTotals.expected) * 100}%` }}
                        />
                      </div>
                    )}
                  </button>

                  {/* Empleados del departamento */}
                  {expanded && (
                    <DepartmentPresenceBlock
                      employees={deptEmployees}
                      isCurrentShift={shiftLifecycle === "active"}
                      isAnalysisDate={isAnalysisDate}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}