import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Factory, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMachineAlias } from "@/utils/machineAlias";
import { computeAvailableOperators } from "@/utils/shiftAvailability";

/**
 * Panel que renderiza la planificación de un turno concreto:
 * - Zonas de área con sus máquinas
 * - Indicadores visuales de sugerencia Gantt
 * - Totalizadores del turno
 */
export default function ProductionShiftPanel({
  shift,
  selectedDate,
  selectedTeam,
  machines,
  areasWithMachines,
  ganttSuggestions,
  plannings,
  employees,
  teams,
  dailyPlansHistory,
  onAddMachine,
  onDeletePlanning,
  onOperatorChange,
}) {
  // --- Plannings de este turno ---
  const activePlanningsMap = useMemo(() => {
    const map = new Map();
    (plannings || []).forEach(p => {
      if (p.turno !== shift) return;
      map.set(String(p.machine_id), p);
    });
    return map;
  }, [plannings, shift]);

  // --- Operadores disponibles para este turno ---
  const availableOperators = useMemo(
    () => computeAvailableOperators(employees, teams, selectedTeam, selectedDate, shift),
    [employees, teams, selectedTeam, selectedDate, shift]
  );

  // --- Operadores requeridos (solo manuales) ---
  const totalRequiredOperators = useMemo(() => {
    let total = 0;
    activePlanningsMap.forEach(p => {
      const machineExists = machines.some(m => String(m.id) === String(p.machine_id));
      if (!machineExists) return;
      total += Number(p.operadores_necesarios) || 0;
    });
    return total;
  }, [activePlanningsMap, machines]);

  // --- Media histórica de operadores por máquina para este turno ---
  const avgOperatorsByMachine = useMemo(() => {
    const sums = new Map();
    const counts = new Map();
    const norm = (s) => s ? s.toString().trim().toLowerCase() : '';
    const targetShift = norm(shift);

    (dailyPlansHistory || []).forEach(r => {
      if (!r || r.team_key !== selectedTeam) return;
      const recordShift = norm(r.turno || r.shift);
      if (recordShift && recordShift !== targetShift) return;
      if (!r.machine_id) return;
      const mid = String(r.machine_id);
      const op = Number(r.operadores_necesarios) || 0;
      sums.set(mid, (sums.get(mid) || 0) + op);
      counts.set(mid, (counts.get(mid) || 0) + 1);
    });

    const avg = new Map();
    sums.forEach((sum, mid) => {
      const c = counts.get(mid) || 1;
      avg.set(mid, sum / c);
    });
    return avg;
  }, [dailyPlansHistory, selectedTeam, shift]);

  const deficit = totalRequiredOperators - availableOperators;
  const shiftColor = shift === "Mañana" ? "amber" : "violet";
  const shiftBg = shift === "Mañana" ? "bg-amber-50 border-amber-200" : "bg-violet-50 border-violet-200";
  const shiftText = shift === "Mañana" ? "text-amber-700" : "text-violet-700";
  const shiftIcon = shift === "Mañana" ? "☀️" : "🌙";

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Totalizador del turno */}
      <div className={cn("rounded-lg border p-3 flex items-center justify-between flex-shrink-0", shiftBg)}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{shiftIcon}</span>
          <div>
            <p className={cn("text-sm font-bold", shiftText)}>{shift}</p>
            <p className="text-[10px] text-slate-500">
              {activePlanningsMap.size} máquinas · {totalRequiredOperators} operarios
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-slate-500">Requeridos</p>
            <p className="text-lg font-bold text-slate-800">{totalRequiredOperators}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500">Disponibles</p>
            <p className={cn("text-lg font-bold", deficit > 0 ? "text-red-600" : "text-green-600")}>
              {availableOperators}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500">Balance</p>
            <p className={cn("text-lg font-bold", deficit > 0 ? "text-red-600" : "text-green-600")}>
              {deficit > 0 ? `+${deficit}` : deficit}
            </p>
          </div>
          <div className={cn(
            "w-3 h-3 rounded-full border shadow-sm",
            deficit > 0
              ? "bg-red-500 border-red-600 animate-pulse"
              : "bg-green-500 border-green-600"
          )} />
        </div>
      </div>

      {/* Alerta de déficit */}
      {deficit > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700 flex-shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Faltan {deficit} operadores para cubrir la demanda del turno de {shift}.</span>
        </div>
      )}

      {/* Zonas de área */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
        {areasWithMachines.map(group => {
          const totalInArea = group.machines.length;
          const activeInArea = group.machines.filter(m => activePlanningsMap.has(String(m.id))).length;
          const ganttInArea = group.machines.filter(m => ganttSuggestions.has(String(m.id))).length;

          return (
            <div
              key={group.areaId}
              className="border border-slate-200 rounded-lg bg-white overflow-hidden"
            >
              {/* Cabecera de zona */}
              <div className="px-3 py-2 flex items-center justify-between bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center">
                    <Factory className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-800">
                      {group.areaName || "Sin Área"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {totalInArea} máquinas · {activeInArea} activas
                      {ganttInArea > 0 && <span className="text-amber-600"> · {ganttInArea} Gantt</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid de máquinas */}
              <div className="p-2">
                {group.machines.length === 0 ? (
                  <div className="text-[11px] text-slate-400 italic px-1 py-3">
                    No hay máquinas asignadas a esta área.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1.5">
                    {group.machines.map(machine => {
                      const planning = activePlanningsMap.get(String(machine.id));
                      const isActive = !!planning;
                      const ganttSuggestion = ganttSuggestions.get(String(machine.id));
                      const hasGantt = !!ganttSuggestion;
                      const ganttOperators = ganttSuggestion?.operators || 0;

                      const operatorsValue =
                        planning && planning.operadores_necesarios !== undefined && planning.operadores_necesarios !== null
                          ? planning.operadores_necesarios
                          : "";

                      const avgVal = avgOperatorsByMachine.get(String(machine.id));
                      const avgDisplay = typeof avgVal === 'number' ? avgVal.toFixed(1) : null;

                      return (
                        <div
                          key={machine.id}
                          className={cn(
                            "flex items-center gap-2 rounded-md border px-2 py-1.5 bg-white transition-colors",
                            isActive
                              ? "border-green-400 bg-green-50/60"
                              : hasGantt
                                ? "border-amber-300 bg-amber-50/40"
                                : "border-slate-200"
                          )}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Checkbox
                              id={`machine-${shift}-${group.areaId}-${machine.id}`}
                              checked={isActive}
                              onCheckedChange={checked => {
                                if (checked) {
                                  if (!isActive) onAddMachine(machine, shift);
                                } else if (planning) {
                                  onDeletePlanning(planning.id);
                                }
                              }}
                            />
                            <div className="flex flex-col flex-1 min-w-0">
                              <label
                                htmlFor={`machine-${shift}-${group.areaId}-${machine.id}`}
                                className="text-[11px] font-medium text-slate-800 truncate cursor-pointer"
                                title={getMachineAlias(machine)}
                              >
                                {getMachineAlias(machine)}
                              </label>
                              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                {machine.codigo_maquina && (
                                  <span className="font-mono bg-slate-50 border border-slate-200 rounded px-1">
                                    {machine.codigo_maquina}
                                  </span>
                                )}
                                {(machine.room_name || machine.ubicacion) && (
                                  <span className="truncate">
                                    {machine.room_name || machine.ubicacion}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Indicador Gantt (visual, no prevalece sobre manual) */}
                            {hasGantt && !isActive && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 flex items-center gap-0.5"
                                title={`Gantt sugiere: ${ganttOperators} operador(es) para ${selectedDate}`}
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                {ganttOperators}op
                              </span>
                            )}
                            {hasGantt && isActive && (
                              <span
                                className="text-[9px] px-1 py-0.5 rounded-full bg-amber-50 text-amber-500 border border-amber-200 flex items-center gap-0.5"
                                title="Máquina con orden en Gantt"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                              </span>
                            )}

                            {/* Input de operadores (solo si está activa manualmente) */}
                            {isActive ? (
                              <>
                                <span className="text-[10px] text-slate-400">Op.</span>
                                <Input
                                  type="number"
                                  min="0"
                                  className="h-6 w-12 px-1 text-center text-[11px] font-semibold bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                  value={operatorsValue}
                                  onChange={e => {
                                    if (planning) {
                                      onOperatorChange(planning.id, e.target.value);
                                    }
                                  }}
                                />
                                {avgDisplay && (
                                  <span className="text-[9px] text-slate-400 ml-0.5" title="Media histórica">
                                    avg {avgDisplay}
                                  </span>
                                )}
                              </>
                            ) : hasGantt ? (
                              <button
                                onClick={() => onAddMachine(machine, shift, ganttOperators)}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300"
                                title="Activar con operadores sugeridos por Gantt"
                              >
                                Activar
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}