import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Factory, AlertTriangle, Sparkles, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMachineAlias } from "@/utils/machineAlias";
import { computeAvailableOperators } from "@/utils/shiftAvailability";

const SHIFTS = ["Mañana", "Tarde"];

/**
 * Panel unificado: una sola lista de máquinas con dos inputs de operadores
 * (Mañana y Tarde) por cada máquina. Reemplaza las dos columnas paralelas.
 */
export default function UnifiedShiftPanel({
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
  // --- Mapas de planning por turno ---
  const planningsByShift = useMemo(() => {
    const manana = new Map();
    const tarde = new Map();
    (plannings || []).forEach(p => {
      if (p.turno === "Mañana") manana.set(String(p.machine_id), p);
      else if (p.turno === "Tarde") tarde.set(String(p.machine_id), p);
    });
    return { Mañana: manana, Tarde: tarde };
  }, [plannings]);

  // --- Operadores disponibles por turno ---
  const availableByShift = useMemo(() => ({
    Mañana: computeAvailableOperators(employees, teams, selectedTeam, selectedDate, "Mañana"),
    Tarde: computeAvailableOperators(employees, teams, selectedTeam, selectedDate, "Tarde"),
  }), [employees, teams, selectedTeam, selectedDate]);

  // --- Totales requeridos por turno ---
  const totalsByShift = useMemo(() => {
    const totals = { Mañana: 0, Tarde: 0 };
    const machineIds = new Set(machines.map(m => String(m.id)));
    SHIFTS.forEach(shift => {
      planningsByShift[shift].forEach(p => {
        if (machineIds.has(String(p.machine_id))) {
          totals[shift] += Number(p.operadores_necesarios) || 0;
        }
      });
    });
    return totals;
  }, [planningsByShift, machines]);

  // --- Media histórica por máquina y turno ---
  const avgByMachineShift = useMemo(() => {
    const result = { Mañana: new Map(), Tarde: new Map() };
    const norm = (s) => s ? s.toString().trim().toLowerCase() : '';
    (dailyPlansHistory || []).forEach(r => {
      if (!r || r.team_key !== selectedTeam || !r.machine_id) return;
      const shift = norm(r.turno || r.shift);
      const map = shift === "tarde" ? result.Tarde : result.Mañana;
      const mid = String(r.machine_id);
      const cur = map.get(mid) || { sum: 0, count: 0 };
      cur.sum += Number(r.operadores_necesarios) || 0;
      cur.count += 1;
      map.set(mid, cur);
    });
    return result;
  }, [dailyPlansHistory, selectedTeam]);

  // --- Handler unificado: set operadores para un turno ---
  const handleSetOperators = (machine, shift, planning, rawValue) => {
    const num = rawValue === "" ? 0 : parseInt(rawValue);
    if (isNaN(num) || num < 0) return;
    if (num === 0) {
      if (planning) onDeletePlanning(planning.id);
    } else if (planning) {
      onOperatorChange(planning.id, rawValue);
    } else {
      onAddMachine(machine, shift, num);
    }
  };

  const deficitManana = totalsByShift.Mañana - availableByShift.Mañana;
  const deficitTarde = totalsByShift.Tarde - availableByShift.Tarde;

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Totalizador combinado de ambos turnos */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 flex-shrink-0">
        <div className="grid grid-cols-2 gap-3">
          {/* Mañana */}
          <div className="flex items-center justify-between rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <div>
                <p className="text-sm font-bold text-amber-700">Mañana</p>
                <p className="text-[10px] text-slate-500">
                  {planningsByShift.Mañana.size} máquinas · {totalsByShift.Mañana} operarios
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[9px] text-slate-400">Disp.</p>
                <p className="text-sm font-bold text-slate-700">{availableByShift.Mañana}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-400">Balance</p>
                <p className={cn("text-sm font-bold", deficitManana > 0 ? "text-red-600" : "text-green-600")}>
                  {deficitManana > 0 ? `+${deficitManana}` : deficitManana}
                </p>
              </div>
              <div className={cn(
                "w-2.5 h-2.5 rounded-full border shadow-sm",
                deficitManana > 0 ? "bg-red-500 border-red-600 animate-pulse" : "bg-green-500 border-green-600"
              )} />
            </div>
          </div>

          {/* Tarde */}
          <div className="flex items-center justify-between rounded-md bg-violet-50 border border-violet-200 px-3 py-2">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-violet-500" />
              <div>
                <p className="text-sm font-bold text-violet-700">Tarde</p>
                <p className="text-[10px] text-slate-500">
                  {planningsByShift.Tarde.size} máquinas · {totalsByShift.Tarde} operarios
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[9px] text-slate-400">Disp.</p>
                <p className="text-sm font-bold text-slate-700">{availableByShift.Tarde}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-400">Balance</p>
                <p className={cn("text-sm font-bold", deficitTarde > 0 ? "text-red-600" : "text-green-600")}>
                  {deficitTarde > 0 ? `+${deficitTarde}` : deficitTarde}
                </p>
              </div>
              <div className={cn(
                "w-2.5 h-2.5 rounded-full border shadow-sm",
                deficitTarde > 0 ? "bg-red-500 border-red-600 animate-pulse" : "bg-green-500 border-green-600"
              )} />
            </div>
          </div>
        </div>

        {/* Alertas de déficit */}
        <div className="flex gap-2 mt-2">
          {deficitManana > 0 && (
            <div className="flex-1 flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 border border-red-200 text-[10px] text-red-700">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span>Faltan {deficitManana} op. en Mañana</span>
            </div>
          )}
          {deficitTarde > 0 && (
            <div className="flex-1 flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 border border-red-200 text-[10px] text-red-700">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span>Faltan {deficitTarde} op. en Tarde</span>
            </div>
          )}
        </div>
      </div>

      {/* Zonas de área */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
        {areasWithMachines.map(group => {
          const totalInArea = group.machines.length;
          const activeInArea = group.machines.filter(m =>
            planningsByShift.Mañana.has(String(m.id)) || planningsByShift.Tarde.has(String(m.id))
          ).length;
          const ganttInArea = group.machines.filter(m => ganttSuggestions.has(String(m.id))).length;

          return (
            <div key={group.areaId} className="border border-slate-200 rounded-lg bg-white overflow-hidden">
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

              {/* Lista de máquinas */}
              <div className="p-2">
                {group.machines.length === 0 ? (
                  <div className="text-[11px] text-slate-400 italic px-1 py-3">
                    No hay máquinas asignadas a esta área.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Cabecera de columnas */}
                    <div className="hidden md:flex items-center gap-2 px-2 pb-1 border-b border-slate-100">
                      <div className="flex-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Máquina
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 w-[88px]">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600">Mañana</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 w-[88px]">
                        <Moon className="w-3.5 h-3.5 text-violet-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wide text-violet-600">Tarde</span>
                      </div>
                    </div>

                    {group.machines.map(machine => {
                      const idStr = String(machine.id);
                      const planningM = planningsByShift.Mañana.get(idStr);
                      const planningT = planningsByShift.Tarde.get(idStr);
                      const isActiveM = !!planningM;
                      const isActiveT = !!planningT;
                      const isAnyActive = isActiveM || isActiveT;
                      const ganttSuggestion = ganttSuggestions.get(idStr);
                      const hasGantt = !!ganttSuggestion;
                      const ganttOperators = ganttSuggestion?.operators || 0;

                      const opsM = planningM && planningM.operadores_necesarios != null
                        ? planningM.operadores_necesarios : "";
                      const opsT = planningT && planningT.operadores_necesarios != null
                        ? planningT.operadores_necesarios : "";

                      const avgM = avgByMachineShift.Mañana.get(idStr);
                      const avgT = avgByMachineShift.Tarde.get(idStr);
                      const avgMDisplay = avgM ? (avgM.sum / avgM.count).toFixed(1) : null;
                      const avgTDisplay = avgT ? (avgT.sum / avgT.count).toFixed(1) : null;

                      return (
                        <div
                          key={machine.id}
                          className={cn(
                            "flex items-stretch gap-1.5 rounded-md border overflow-hidden transition-colors",
                            isAnyActive
                              ? "border-slate-300 bg-white"
                              : hasGantt
                                ? "border-amber-300 bg-amber-50/30"
                                : "border-slate-200 bg-white"
                          )}
                        >
                          {/* Nombre y código */}
                          <div className="flex flex-col justify-center flex-1 min-w-0 px-2 py-1.5">
                            <span
                              className="text-[11px] font-medium text-slate-800 leading-tight"
                              title={getMachineAlias(machine)}
                            >
                              {getMachineAlias(machine)}
                            </span>
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
                            {hasGantt && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 inline-flex items-center gap-0.5 w-fit mt-0.5"
                                title={`Gantt sugiere: ${ganttOperators} operador(es) para ${selectedDate}`}
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                {ganttOperators}op
                              </span>
                            )}
                          </div>

                          {/* Celda Mañana */}
                          <div
                            className={cn(
                              "flex flex-col items-center justify-center gap-0.5 flex-shrink-0 w-[88px] px-1 border-l-2",
                              isActiveM
                                ? "bg-amber-50 border-amber-400"
                                : "bg-slate-50/50 border-slate-200"
                            )}
                          >
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              className={cn(
                                "h-8 w-full px-1 text-center text-sm font-bold border focus:ring-1",
                                isActiveM
                                  ? "bg-white border-amber-400 text-amber-700 focus:border-amber-500 focus:ring-amber-400"
                                  : "bg-white border-slate-200 text-slate-400 focus:border-amber-400 focus:ring-amber-400"
                              )}
                              value={opsM}
                              onChange={e => handleSetOperators(machine, "Mañana", planningM, e.target.value)}
                            />
                            {avgMDisplay && (
                              <span className="text-[8px] text-amber-400" title="Media histórica Mañana">
                                avg {avgMDisplay}
                              </span>
                            )}
                          </div>

                          {/* Celda Tarde */}
                          <div
                            className={cn(
                              "flex flex-col items-center justify-center gap-0.5 flex-shrink-0 w-[88px] px-1 border-l-2",
                              isActiveT
                                ? "bg-violet-50 border-violet-400"
                                : "bg-slate-50/50 border-slate-200"
                            )}
                          >
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              className={cn(
                                "h-8 w-full px-1 text-center text-sm font-bold border focus:ring-1",
                                isActiveT
                                  ? "bg-white border-violet-400 text-violet-700 focus:border-violet-500 focus:ring-violet-400"
                                  : "bg-white border-slate-200 text-slate-400 focus:border-violet-400 focus:ring-violet-400"
                              )}
                              value={opsT}
                              onChange={e => handleSetOperators(machine, "Tarde", planningT, e.target.value)}
                            />
                            {avgTDisplay && (
                              <span className="text-[8px] text-violet-400" title="Media histórica Tarde">
                                avg {avgTDisplay}
                              </span>
                            )}
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