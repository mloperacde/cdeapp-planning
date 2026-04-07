import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek, endOfWeek, addWeeks, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { getMachineAlias } from "@/utils/machineAlias";
import { ChevronLeft, ChevronRight, RefreshCw, Maximize2, Calendar, AlertTriangle, PackageX, LayoutGrid } from "lucide-react";
import { Link } from "react-router-dom";

const REFRESH_INTERVAL = 5 * 60 * 1000;
const SCROLL_SPEED = 60; // px per second
const PAUSE_AT_BOTTOM = 3000; // ms pause before reset

function getPriorityStyles(priority) {
  if (priority === 1) return { card: "border-l-4 border-l-red-500 bg-red-50", badge: "bg-red-500 text-white", label: "P1" };
  if (priority === 2) return { card: "border-l-4 border-l-orange-400 bg-orange-50", badge: "bg-orange-400 text-white", label: "P2" };
  if (priority === 3) return { card: "border-l-4 border-l-blue-400 bg-blue-50", badge: "bg-blue-500 text-white", label: "P3" };
  if (priority === 4) return { card: "border-l-4 border-l-green-400 bg-green-50", badge: "bg-green-500 text-white", label: "P4" };
  if (priority === 5) return { card: "border-l-4 border-l-slate-300 bg-slate-50", badge: "bg-slate-400 text-white", label: "P5" };
  return { card: "border-l-4 border-l-slate-200 bg-slate-50", badge: "bg-slate-300 text-slate-700", label: "S/P" };
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  let d = parseISO(dateStr);
  if (!isValid(d)) d = new Date(dateStr);
  if (!isValid(d)) return null;
  return format(d, "dd/MM", { locale: es });
}

function sortOrders(orders) {
  return [...orders].sort((a, b) => {
    const pa = (a.priority == null || a.priority === 0) ? 9999 : a.priority;
    const pb = (b.priority == null || b.priority === 0) ? 9999 : b.priority;
    if (pa !== pb) return pa - pb;
    const da = a.start_date || "";
    const db = b.start_date || "";
    return da.localeCompare(db);
  });
}

function isOverdue(order) {
  const delivery = order.committed_delivery_date || order.planned_end_date;
  if (!delivery) return false;
  let d = parseISO(delivery);
  if (!isValid(d)) d = new Date(delivery);
  return isValid(d) && d < new Date();
}

// Single order card (compact, horizontal)
function OrderCard({ order }) {
  const { card, badge, label } = getPriorityStyles(order.priority);
  const overdue = isOverdue(order);
  const missing = order.missing_components_flag;
  return (
    <div className={`rounded-lg border border-slate-200 px-3 py-2 flex flex-col gap-0.5 min-w-0 ${card} ${overdue ? "ring-2 ring-yellow-400" : ""}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 ${badge}`}>{label}</span>
        <span className="font-bold text-slate-800 text-sm truncate">{order.order_number}</span>
        {order.client_name && <span className="text-xs text-slate-400 truncate flex-1 italic">{order.client_name}</span>}
        {overdue && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
        {missing && <PackageX className="w-3.5 h-3.5 text-red-500 shrink-0" />}
      </div>
      <div className="text-xs text-slate-600 truncate">
        {order.product_article_code && <span className="font-mono text-slate-400 mr-1">{order.product_article_code}</span>}
        <span>{order.product_name}</span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
        {order.quantity != null && <span className="font-semibold text-slate-600">{order.quantity} uds</span>}
        {order.start_date && <span>▶ {formatDate(order.start_date)}</span>}
        {order.committed_delivery_date && (
          <span className={overdue ? "text-yellow-600 font-semibold" : ""}>✓ {formatDate(order.committed_delivery_date)}</span>
        )}
      </div>
    </div>
  );
}

// Machine row: up to 5 orders per visual row, wraps into 2 rows if more
function MachineRow({ machine, orders }) {
  const firstRow = orders.slice(0, 5);
  const secondRow = orders.slice(5, 10);
  const extra = orders.length > 10 ? orders.length - 10 : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-3">
      {/* Machine header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-700 text-white">
        <span className="font-bold text-base tracking-wide">{getMachineAlias(machine)}</span>
        <span className="text-xs bg-slate-500 text-slate-200 px-2 py-0.5 rounded-full font-mono">{orders.length} órd.</span>
        {machine.nombre && machine.nombre !== getMachineAlias(machine) && (
          <span className="text-xs text-slate-400 truncate">{machine.nombre}</span>
        )}
      </div>
      {/* Orders grid */}
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-5 gap-2">
          {firstRow.map(o => <OrderCard key={o.id} order={o} />)}
        </div>
        {secondRow.length > 0 && (
          <div className="grid grid-cols-5 gap-2">
            {secondRow.map(o => <OrderCard key={o.id} order={o} />)}
            {extra > 0 && (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 text-sm font-medium">
                +{extra} más
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ManufacturingKioskList() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());
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
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

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

  // Auto-scroll logic
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
        // Reached bottom
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 5) {
          pauseRef.current = true;
          setTimeout(() => {
            el.scrollTop = 0;
            pauseRef.current = false;
            lastTimeRef.current = null;
          }, PAUSE_AT_BOTTOM);
        }
      }
      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [machines, workOrders]);

  const weekOrders = workOrders.filter(o => {
    const startStr = o.start_date;
    const endStr = o.planned_end_date || o.committed_delivery_date;
    if (!startStr) return false;
    let start = parseISO(startStr);
    if (!isValid(start)) start = new Date(startStr);
    if (!isValid(start)) return false;
    let end = endStr ? parseISO(endStr) : start;
    if (!isValid(end)) end = start;
    return start <= weekEnd && end >= weekStart;
  });

  const getOrdersForMachine = (machineId) => {
    const mid = String(machineId);
    const filtered = weekOrders.filter(o => String(o.machine_id) === mid);
    const seen = new Set();
    return sortOrders(filtered.filter(o => {
      const key = String(o.order_number || o.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }));
  };

  const activeMachines = machines.filter(m => getOrdersForMachine(m.id).length > 0);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };

  return (
    <div className="h-screen bg-slate-100 text-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-700">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-lg tracking-wide uppercase text-slate-800">Objetivo de Fabricación</span>
          </div>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded hover:bg-slate-100 transition-colors text-slate-600">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-slate-700 min-w-[220px] text-center">
              Semana {format(weekStart, "dd MMM", { locale: es })} – {format(weekEnd, "dd MMM yyyy", { locale: es })}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded hover:bg-slate-100 transition-colors text-slate-600">
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
          <span className="text-xs text-slate-400">
            {format(lastRefresh, "HH:mm")} · Auto-refresh 5min
          </span>
          <button onClick={handleRefresh} className="p-1.5 rounded hover:bg-slate-100 transition-colors text-slate-500" title="Actualizar">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link to="/ManufacturingKiosk" className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-800 text-white rounded transition-colors">
            <LayoutGrid className="w-3.5 h-3.5" />
            Vista cuadrícula
          </Link>
          <button onClick={toggleFullscreen} className="p-1.5 rounded hover:bg-slate-100 transition-colors text-slate-500" title="Pantalla completa">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-6 py-1.5 bg-slate-50 border-b border-slate-200 text-xs shrink-0 flex-wrap">
        <span><span className="font-bold text-slate-800">{activeMachines.length}</span> <span className="text-slate-500">máquinas activas</span></span>
        <span><span className="font-bold text-slate-800">{weekOrders.length}</span> <span className="text-slate-500">órdenes</span></span>
        <span className="text-red-600"><span className="font-bold">{weekOrders.filter(o => o.priority === 1).length}</span> P1</span>
        <span className="text-orange-500"><span className="font-bold">{weekOrders.filter(o => o.priority === 2).length}</span> P2</span>
        <span className="text-blue-600"><span className="font-bold">{weekOrders.filter(o => o.priority === 3).length}</span> P3</span>
        <span className="text-yellow-600"><span className="font-bold">{weekOrders.filter(isOverdue).length}</span> con retraso</span>
        <span className="text-red-500"><span className="font-bold">{weekOrders.filter(o => o.missing_components_flag).length}</span> faltan componentes</span>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-3">
        {activeMachines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Calendar className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-xl">Sin órdenes para esta semana</p>
          </div>
        ) : (
          <div>
            {activeMachines.map(machine => (
              <MachineRow
                key={machine.id}
                machine={machine}
                orders={getOrdersForMachine(machine.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}