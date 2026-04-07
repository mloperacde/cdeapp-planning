import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { getMachineAlias } from "@/utils/machineAlias";
import { ChevronLeft, ChevronRight, RefreshCw, Maximize2, Calendar } from "lucide-react";

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min

function getPriorityBg(priority) {
  if (priority == null || priority === 0) return "bg-slate-700 border-slate-600";
  if (priority === 1) return "bg-red-900/80 border-red-700";
  if (priority === 2) return "bg-orange-900/80 border-orange-700";
  if (priority === 3) return "bg-blue-900/80 border-blue-700";
  return "bg-green-900/80 border-green-700";
}

function getPriorityLabel(priority) {
  if (priority == null || priority === 0) return "S/P";
  return `P${priority}`;
}

function formatDateSafe(dateStr) {
  if (!dateStr) return null;
  let d = parseISO(dateStr);
  if (!isValid(d)) d = new Date(dateStr);
  if (!isValid(d)) return null;
  return format(d, "dd/MM");
}

function sortOrders(orders) {
  return [...orders].sort((a, b) => {
    const pa = (a.priority == null || a.priority === 0) ? 9999 : a.priority;
    const pb = (b.priority == null || b.priority === 0) ? 9999 : b.priority;
    if (pa !== pb) return pa - pb;
    const da = a.effective_start_date || a.start_date || "";
    const db = b.effective_start_date || b.start_date || "";
    return da.localeCompare(db);
  });
}

export default function ManufacturingKiosk() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });

  const { data: machines = [], refetch: refetchMachines } = useQuery({
    queryKey: ["kiosk-machines"],
    queryFn: () => base44.entities.Machine.list("orden", 100),
  });

  const { data: workOrders = [], refetch: refetchOrders } = useQuery({
    queryKey: ["kiosk-orders", weekOffset],
    queryFn: () => base44.entities.WorkOrder.filter({
      status: ["Pendiente", "En Progreso", "Retrasada"],
    }, "-priority", 500),
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchMachines(), refetchOrders()]);
    setLastRefresh(new Date());
  }, [refetchMachines, refetchOrders]);

  // Auto-refresh
  useEffect(() => {
    const timer = setInterval(handleRefresh, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [handleRefresh]);

  // Full screen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Filter orders within the selected week range
  const weekOrders = workOrders.filter(o => {
    const dateStr = o.effective_start_date || o.start_date || o.planned_end_date || o.committed_delivery_date;
    if (!dateStr) return false;
    let d = parseISO(dateStr);
    if (!isValid(d)) d = new Date(dateStr);
    if (!isValid(d)) return false;
    return d >= weekStart && d <= weekEnd;
  });

  const getOrdersForMachine = (machineId) => {
    const mid = String(machineId);
    const filtered = weekOrders.filter(o => String(o.machine_id) === mid);
    const seen = new Set();
    const deduped = filtered.filter(o => {
      const key = String(o.order_number || o.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return sortOrders(deduped);
  };

  const activeMachines = machines.filter(m => {
    const orders = getOrdersForMachine(m.id);
    return orders.length > 0;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-800 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-blue-400">
            <Calendar className="w-5 h-5" />
            <span className="font-bold text-lg tracking-wide uppercase">Objetivo de Fabricación</span>
          </div>
          <div className="h-5 w-px bg-slate-600" />
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded hover:bg-slate-700 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-white min-w-[200px] text-center">
              Semana {format(weekStart, "dd MMM", { locale: es })} – {format(weekEnd, "dd MMM yyyy", { locale: es })}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded hover:bg-slate-700 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors">
                Esta semana
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            Actualizado: {format(lastRefresh, "HH:mm")} · Auto-refresh 5min
          </span>
          <button onClick={handleRefresh} className="p-1.5 rounded hover:bg-slate-700 transition-colors" title="Actualizar ahora">
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
          <button onClick={toggleFullscreen} className="p-1.5 rounded hover:bg-slate-700 transition-colors" title="Pantalla completa">
            <Maximize2 className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-6 py-2 bg-slate-800/50 border-b border-slate-700/50 text-xs shrink-0">
        <span className="text-slate-400">{activeMachines.length} <span className="text-white font-semibold">máquinas activas</span></span>
        <span className="text-slate-400">{weekOrders.length} <span className="text-white font-semibold">órdenes en el periodo</span></span>
        <span className="text-red-400">{weekOrders.filter(o => o.priority === 1).length} <span className="font-semibold">P1</span></span>
        <span className="text-orange-400">{weekOrders.filter(o => o.priority === 2).length} <span className="font-semibold">P2</span></span>
        <span className="text-blue-400">{weekOrders.filter(o => o.priority === 3).length} <span className="font-semibold">P3</span></span>
        <span className="text-slate-400">{weekOrders.filter(o => !o.priority || o.priority === 0).length} <span className="font-semibold">S/P</span></span>
      </div>

      {/* Machine Grid */}
      <div className="flex-1 overflow-auto p-4">
        {activeMachines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Calendar className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-xl">Sin órdenes para esta semana</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 auto-rows-min">
            {activeMachines.map(machine => {
              const orders = getOrdersForMachine(machine.id);
              return (
                <div key={machine.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col">
                  {/* Machine header */}
                  <div className="px-3 py-2 bg-slate-700 border-b border-slate-600 flex items-center justify-between">
                    <span className="font-bold text-sm text-white truncate" title={getMachineAlias(machine)}>
                      {getMachineAlias(machine)}
                    </span>
                    <span className="ml-2 text-xs font-mono bg-slate-600 text-slate-200 px-1.5 py-0.5 rounded shrink-0">
                      {orders.length}
                    </span>
                  </div>
                  {/* Orders list */}
                  <div className="p-1.5 space-y-1 flex-1">
                    {orders.map(order => (
                      <div key={order.id} className={`rounded px-2 py-1.5 border text-xs ${getPriorityBg(order.priority)}`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-bold text-[10px] bg-black/30 rounded px-1 py-0.5 shrink-0">
                            {getPriorityLabel(order.priority)}
                          </span>
                          <span className="font-semibold truncate">{order.order_number}</span>
                        </div>
                        {order.product_name && (
                          <div className="text-[10px] text-slate-300 truncate">{order.product_name}</div>
                        )}
                        <div className="flex items-center justify-between mt-0.5 text-[10px] text-slate-400">
                          <span>{order.quantity ? `${order.quantity} uds` : ""}</span>
                          <span>{formatDateSafe(order.effective_delivery_date || order.committed_delivery_date) || ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}