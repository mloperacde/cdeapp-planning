import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek, endOfWeek, addWeeks, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { getMachineAlias } from "@/utils/machineAlias";
import { ChevronLeft, ChevronRight, RefreshCw, Maximize2, Calendar, AlertTriangle, PackageX, List, Sun, Moon } from "lucide-react";
import { Link } from "react-router-dom";

const REFRESH_INTERVAL = 5 * 60 * 1000;
const SCROLL_SPEED = 30;
const PAUSE_AT_BOTTOM = 3000;
const THEME_KEY = "kiosk_theme";

function getPriorityBg(priority, dark) {
  if (dark) {
    if (priority == null || priority === 0) return "bg-slate-700/80 border-slate-600";
    if (priority === 1) return "bg-red-900/80 border-red-600";
    if (priority === 2) return "bg-orange-900/80 border-orange-600";
    if (priority === 3) return "bg-blue-900/80 border-blue-600";
    return "bg-green-900/80 border-green-700";
  } else {
    if (priority == null || priority === 0) return "bg-slate-100 border-slate-300";
    if (priority === 1) return "bg-red-50 border-red-400 border-l-4 border-l-red-500";
    if (priority === 2) return "bg-orange-50 border-orange-300 border-l-4 border-l-orange-400";
    if (priority === 3) return "bg-blue-50 border-blue-300 border-l-4 border-l-blue-400";
    return "bg-green-50 border-green-300 border-l-4 border-l-green-400";
  }
}

function getPriorityBadge(priority) {
  if (priority == null || priority === 0) return { label: "S/P", cls: "bg-slate-400 text-white" };
  if (priority === 1) return { label: "P1", cls: "bg-red-600 text-white" };
  if (priority === 2) return { label: "P2", cls: "bg-orange-500 text-white" };
  if (priority === 3) return { label: "P3", cls: "bg-blue-500 text-white" };
  return { label: `P${priority}`, cls: "bg-green-600 text-white" };
}

function formatDT(dateStr) {
  if (!dateStr) return null;
  let d = parseISO(dateStr);
  if (!isValid(d)) d = new Date(dateStr);
  if (!isValid(d)) return null;
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  return format(d, hasTime ? "dd/MM HH:mm" : "dd/MM", { locale: es });
}

function sortOrders(orders) {
  return [...orders].sort((a, b) => {
    const pa = (a.priority == null || a.priority === 0) ? 9999 : a.priority;
    const pb = (b.priority == null || b.priority === 0) ? 9999 : b.priority;
    if (pa !== pb) return pa - pb;
    const da = a.start_date || a.effective_start_date || "";
    const db = b.start_date || b.effective_start_date || "";
    return da.localeCompare(db);
  });
}

function isOverdue(order) {
  const delivery = order.committed_delivery_date || order.planned_end_date || order.effective_delivery_date;
  if (!delivery) return false;
  let d = parseISO(delivery);
  if (!isValid(d)) d = new Date(delivery);
  if (!isValid(d)) return false;
  return d < new Date();
}

export default function ManufacturingKiosk() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isDark, setIsDark] = useState(() => (localStorage.getItem(THEME_KEY) ?? "dark") === "dark");
  const scrollRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(null);
  const pauseRef = useRef(false);

  // Auto-fullscreen on mount
  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(d => {
      const next = !d;
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      return next;
    });
  };

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  weekEnd.setHours(23, 59, 59, 999);

  const { data: machines = [], refetch: refetchMachines } = useQuery({
    queryKey: ["kiosk-machines"],
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
      return data.map(m => ({ ...m, orden: m.orden_visualizacion || 999 })).sort((a, b) => a.orden - b.orden);
    },
    staleTime: 0,
  });

  const { data: workOrders = [], refetch: refetchOrders } = useQuery({
    queryKey: ["kiosk-orders"],
    queryFn: async () => {
      const raw = await base44.entities.WorkOrder.list(undefined, 2000);
      const normDate = (val) => {
        if (!val) return null;
        if (typeof val !== "string") return String(val);
        if (/^\d{4}-/.test(val)) return val;
        if (val.includes("/")) {
          const parts = val.split(" ")[0].split("/");
          if (parts.length === 3) {
            const [d, m, y] = parts;
            if (!isNaN(d) && !isNaN(m) && !isNaN(y))
              return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
          }
        }
        return val;
      };
      return raw.map(o => ({
        ...o,
        start_date: normDate(o.start_date),
        committed_delivery_date: normDate(o.committed_delivery_date),
        planned_end_date: normDate(o.planned_end_date),
        priority: (o.priority !== undefined && o.priority !== null && o.priority !== "") ? o.priority : null,
      }));
    },
    staleTime: 0,
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchMachines(), refetchOrders()]);
    setLastRefresh(new Date());
  }, [refetchMachines, refetchOrders]);

  useEffect(() => {
    const timer = setInterval(handleRefresh, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [handleRefresh]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    lastTimeRef.current = null;
    pauseRef.current = false;
    const step = (ts) => {
      if (!lastTimeRef.current) lastTimeRef.current = ts;
      const dt = ts - lastTimeRef.current;
      lastTimeRef.current = ts;
      if (!pauseRef.current) {
        el.scrollTop += (SCROLL_SPEED * dt) / 1000;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 5) {
          pauseRef.current = true;
          setTimeout(() => { el.scrollTop = 0; pauseRef.current = false; lastTimeRef.current = null; }, PAUSE_AT_BOTTOM);
        }
      }
      animFrameRef.current = requestAnimationFrame(step);
    };
    animFrameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [machines, workOrders]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };

  const weekOrders = workOrders.filter(o => {
    const startStr = o.start_date;
    const endStr = o.planned_end_date || o.committed_delivery_date;
    if (!startStr) return false;
    let start = parseISO(startStr);
    if (!isValid(start)) start = new Date(startStr);
    if (!isValid(start)) return false;
    let end = endStr ? (parseISO(endStr).getTime() ? parseISO(endStr) : new Date(endStr)) : start;
    if (!isValid(end)) end = start;
    return start <= weekEnd && end >= weekStart;
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

  const activeMachines = machines.filter(m => getOrdersForMachine(m.id).length > 0);
  const totalOrders = weekOrders.length;
  const p1 = weekOrders.filter(o => o.priority === 1).length;
  const p2 = weekOrders.filter(o => o.priority === 2).length;
  const p3 = weekOrders.filter(o => o.priority === 3).length;
  const sp = weekOrders.filter(o => !o.priority || o.priority === 0).length;

  // Theme-dependent classes
  const bg = isDark ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900";
  const headerBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const statsBg = isDark ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-50 border-slate-200";
  const machineBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm";
  const machineHeaderBg = isDark ? "bg-slate-700 border-slate-600" : "bg-slate-700 border-slate-600";
  const btnHover = isDark ? "hover:bg-slate-700" : "hover:bg-slate-100";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <div className={`min-h-screen ${bg} flex flex-col`} style={{ height: "100vh", overflow: "hidden" }}>
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-3 ${headerBg} border-b shrink-0`}>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
            <Calendar className="w-5 h-5" />
            <span className="font-bold text-lg tracking-wide uppercase">Objetivo de Fabricación</span>
          </div>
          <div className={`h-5 w-px ${isDark ? "bg-slate-600" : "bg-slate-300"}`} />
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(w => w - 1)} className={`p-1.5 rounded ${btnHover} transition-colors`}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={`text-sm font-semibold min-w-[220px] text-center ${isDark ? "text-white" : "text-slate-700"}`}>
              Semana {format(weekStart, "dd MMM", { locale: es })} – {format(weekEnd, "dd MMM yyyy", { locale: es })}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)} className={`p-1.5 rounded ${btnHover} transition-colors`}>
              <ChevronRight className="w-4 h-4" />
            </button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                Esta semana
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${textMuted}`}>
            Actualizado: {format(lastRefresh, "HH:mm")} · Auto-refresh 5min
          </span>
          <button onClick={handleRefresh} className={`p-1.5 rounded ${btnHover} transition-colors`} title="Actualizar ahora">
            <RefreshCw className={`w-4 h-4 ${textMuted}`} />
          </button>
          <Link to="/ManufacturingKioskList" className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${isDark ? "bg-slate-600 hover:bg-slate-500" : "bg-slate-200 hover:bg-slate-300 text-slate-700"} rounded transition-colors`}>
            <List className="w-3.5 h-3.5" />
            Vista lista
          </Link>
          <button onClick={toggleTheme} className={`p-1.5 rounded ${btnHover} transition-colors`} title="Cambiar tema">
            {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
          </button>
          <button onClick={toggleFullscreen} className={`p-1.5 rounded ${btnHover} transition-colors`} title="Pantalla completa">
            <Maximize2 className={`w-4 h-4 ${textMuted}`} />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className={`flex items-center gap-6 px-6 py-2 ${statsBg} border-b text-xs shrink-0 flex-wrap`}>
        <span><span className={`${isDark ? "text-white" : "text-slate-800"} font-bold`}>{activeMachines.length}</span> <span className={textMuted}>máquinas activas</span></span>
        <span><span className={`${isDark ? "text-white" : "text-slate-800"} font-bold`}>{totalOrders}</span> <span className={textMuted}>órdenes en el periodo</span></span>
        <span className={isDark ? "text-red-400" : "text-red-600"}><span className="font-bold">{p1}</span> P1</span>
        <span className={isDark ? "text-orange-400" : "text-orange-500"}><span className="font-bold">{p2}</span> P2</span>
        <span className={isDark ? "text-blue-400" : "text-blue-600"}><span className="font-bold">{p3}</span> P3</span>
        <span className={textMuted}><span className="font-bold">{sp}</span> S/P</span>
        <span className={isDark ? "text-yellow-400" : "text-yellow-600"}><span className="font-bold">{weekOrders.filter(o => isOverdue(o)).length}</span> con retraso</span>
        <span className={isDark ? "text-red-300" : "text-red-500"}><span className="font-bold">{weekOrders.filter(o => o.missing_components_flag).length}</span> faltan componentes</span>
      </div>

      {/* Machine Grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4">
        {activeMachines.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full ${textMuted}`}>
            <Calendar className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-xl">Sin órdenes para esta semana</p>
            <p className="text-sm mt-2">{workOrders.length} órdenes cargadas en total</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 auto-rows-min">
            {activeMachines.map(machine => {
              const orders = getOrdersForMachine(machine.id);
              return (
                <div key={machine.id} className={`${machineBg} rounded-lg border overflow-hidden flex flex-col`}>
                  <div className={`px-3 py-2 ${machineHeaderBg} border-b flex items-center justify-between`}>
                    <span className="font-bold text-sm text-white truncate" title={getMachineAlias(machine)}>
                      {getMachineAlias(machine)}
                    </span>
                    <span className="ml-2 text-xs font-mono bg-slate-600 text-slate-200 px-1.5 py-0.5 rounded shrink-0">
                      {orders.length}
                    </span>
                  </div>
                  <div className="p-1.5 space-y-1.5 flex-1">
                    {orders.map(order => {
                      const badge = getPriorityBadge(order.priority);
                      const overdue = isOverdue(order);
                      const missing = order.missing_components_flag;
                      const cardBg = isDark
                        ? `${getPriorityBg(order.priority, true)} ${overdue ? "ring-1 ring-yellow-500/60" : ""}`
                        : `${getPriorityBg(order.priority, false)} ${overdue ? "ring-1 ring-yellow-400" : ""}`;
                      const textMain = isDark ? "text-white" : "text-slate-800";
                      const textSub = isDark ? "text-slate-300" : "text-slate-600";
                      const textDim = isDark ? "text-slate-400" : "text-slate-500";
                      const divider = isDark ? "border-white/5" : "border-slate-200";
                      return (
                        <div key={order.id} className={`rounded px-2 py-1.5 border text-xs ${cardBg}`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`font-bold text-[10px] rounded px-1.5 py-0.5 shrink-0 ${badge.cls}`}>
                              {badge.label}
                            </span>
                            <span className={`font-bold truncate ${textMain}`}>{order.order_number}</span>
                            {order.client_name && <span className={`text-[10px] truncate flex-1 italic ${textSub}`}>{order.client_name}</span>}
                            {overdue && <AlertTriangle className="w-3 h-3 text-yellow-400 shrink-0" title="Retraso" />}
                            {missing && <PackageX className="w-3 h-3 text-red-400 shrink-0" title="Faltan componentes" />}
                          </div>
                          <div className={`text-[10px] truncate mb-0.5 ${textSub}`}>
                            {order.product_article_code && <span className={`font-mono mr-1 ${textDim}`}>{order.product_article_code}</span>}
                            {order.product_name}
                          </div>
                          <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] mt-1 border-t ${divider} pt-1 ${textDim}`}>
                            {order.quantity != null && <span className={`font-semibold ${textSub}`}>{order.quantity} uds</span>}
                            {order.start_date && <span>▶ {formatDT(order.start_date)}</span>}
                            {order.committed_delivery_date && (
                              <span className={overdue ? "text-yellow-400 font-semibold" : ""}>
                                ✓ {formatDT(order.committed_delivery_date)}
                              </span>
                            )}
                            {order.planned_end_date && order.planned_end_date !== order.committed_delivery_date && (
                              <span>⏹ {formatDT(order.planned_end_date)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
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