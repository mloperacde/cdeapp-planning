import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Factory, Calendar, AlertCircle, PackageX, X } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { getMachineAlias } from "@/utils/machineAlias";

export default function MachineOrdersList({ machines = [], orders, processes, onEditOrder }) {
  const [filterMissing, setFilterMissing] = useState(false);

  const missingCount = orders.filter(o => o.missing_components_flag).length;
  const activeOrders = filterMissing ? orders.filter(o => o.missing_components_flag) : orders;

  const formatDateSafe = (dateStr, fmt = 'dd/MM') => {
    if (!dateStr) return null;
    let d = parseISO(dateStr);
    if (!isValid(d)) {
        d = new Date(dateStr);
    }
    if (!isValid(d)) return null;
    return format(d, fmt);
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 0: return "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100";
      case 1: return "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
      case 2: return "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100";
      case 3: return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100";
      case 4: return "bg-green-50 text-green-700 border-green-200 hover:bg-green-100";
      default: return "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100";
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch(priority) {
      case 0: return "bg-gray-500 hover:bg-gray-600";
      case 1: return "bg-red-600 hover:bg-red-700";
      case 2: return "bg-orange-500 hover:bg-orange-600";
      case 3: return "bg-blue-500 hover:bg-blue-600";
      case 4: return "bg-green-500 hover:bg-green-600";
      default: return "bg-slate-500 hover:bg-slate-600";
    }
  };

  const getMachineOrders = (machineId) => {
    const mid = String(machineId);
    const filtered = activeOrders.filter(o => String(o.machine_id) === mid);
    // Deduplicar por order_number (prioridad al primero)
    const seen = new Set();
    const deduped = filtered.filter(o => {
      const key = String(o.order_number || o.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // Ordenar: P1, P2, P3... S/P al final (priority=0 o null/undefined), S/P por fecha inicio
    return deduped.sort((a, b) => {
      const pa = (a.priority == null || a.priority === 0) ? 9999 : a.priority;
      const pb = (b.priority == null || b.priority === 0) ? 9999 : b.priority;
      if (pa !== pb) return pa - pb;
      // Ambos S/P: ordenar por start_date
      const da = a.effective_start_date || a.start_date || '';
      const db = b.effective_start_date || b.start_date || '';
      return da.localeCompare(db);
    });
  };

  // Detectar conflictos de prioridad (misma prioridad asignada a >1 orden en la misma máquina)
  const getPriorityConflicts = (machineOrders) => {
    const byPriority = new Map();
    for (const o of machineOrders) {
      const p = o.priority;
      if (p === null || p === undefined || p === 0) continue;
      if (!byPriority.has(p)) byPriority.set(p, []);
      byPriority.get(p).push(o.order_number);
    }
    const conflicts = new Set();
    for (const [p, nums] of byPriority) {
      if (nums.length > 1) nums.forEach(n => conflicts.add(n));
    }
    return conflicts;
  };

  return (
    <Card className="flex flex-col shadow-none border-0 bg-transparent">
      <CardHeader className="py-2 px-0 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Factory className="w-5 h-5 text-slate-600" />
            Tablero de Órdenes por Máquina
          </CardTitle>
          <div className="flex items-center gap-2">
            {missingCount > 0 && (
              <button
                onClick={() => setFilterMissing(f => !f)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                  filterMissing
                    ? 'bg-red-600 text-white border-red-600 shadow-md'
                    : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                }`}
              >
                <PackageX className="w-4 h-4" />
                {filterMissing ? 'Mostrando faltas' : 'Faltas de material'}
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  filterMissing ? 'bg-white text-red-600' : 'bg-red-600 text-white'
                }`}>{missingCount}</span>
                {filterMissing && <X className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
        {filterMissing && (
          <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Mostrando solo órdenes con componentes faltantes ({missingCount})
          </div>
        )}
      </CardHeader>
      <div className="pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {machines.map(machine => {
          const uniqueOrders = getMachineOrders(machine.id);
          const conflictingOrders = getPriorityConflicts(uniqueOrders);

          return (
            <div key={machine.id} className="flex flex-col bg-white dark:bg-slate-950 rounded-lg border shadow-sm h-fit flex-shrink-0">
              {/* Machine Header */}
              <div className="p-3 border-b bg-slate-50/80 dark:bg-slate-900 sticky top-0 z-10 backdrop-blur-sm rounded-t-lg">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight" title={getMachineAlias(machine)}>
                    {getMachineAlias(machine)}
                  </h3>
                  <Badge variant="secondary" className="bg-white dark:bg-slate-800 shadow-sm border text-xs font-mono shrink-0">
                    {uniqueOrders.length}
                  </Badge>
                </div>
              </div>

              <div className="p-2 space-y-2 min-h-[100px]">
                {conflictingOrders.size > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-700">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    Prioridades duplicadas detectadas
                  </div>
                )}
                {uniqueOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-md">
                        <Calendar className="w-8 h-8 mb-2 opacity-20" />
                        <span className="text-xs">Sin órdenes asignadas</span>
                    </div>
                ) : (
                    uniqueOrders.map(order => {
                    const isLate = (order.committed_delivery_date || order.effective_delivery_date) && new Date(order.committed_delivery_date || order.effective_delivery_date) < new Date();
                    const hasPriorityConflict = conflictingOrders.has(String(order.order_number));
                    const missing = order.missing_components_flag;
                    return (
                        <div
                            key={order.id}
                            onClick={() => onEditOrder(order)}
                            className={`relative px-2 py-1.5 rounded border cursor-pointer transition-all hover:shadow-md text-xs
                                ${missing ? 'border-red-400 bg-red-50 dark:bg-red-950/30'
                                  : hasPriorityConflict ? 'border-amber-400 bg-amber-50'
                                  : getPriorityColor(order.priority)}
                                ${isLate ? 'ring-1 ring-yellow-400' : ''}`}
                        >
                            {/* Row 1: badge + order + client + icons */}
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className={`font-bold text-[10px] rounded px-1.5 py-0.5 shrink-0 text-white ${getPriorityBadgeColor(order.priority)}`}>
                                    {(order.priority === 0 || order.priority == null) ? 'S/P' : `P${order.priority}`}
                                </span>
                                <span className="font-bold truncate">{order.order_number}</span>
                                {order.client_name && <span className="text-[10px] truncate flex-1 italic text-slate-500">{order.client_name}</span>}
                                {isLate && <AlertCircle className="w-3 h-3 text-yellow-500 shrink-0" title="Retraso" />}
                                {missing && <PackageX className="w-3 h-3 text-red-500 shrink-0" title="Faltan componentes" />}
                            </div>
                            {/* Row 2: article + name */}
                            {(order.product_article_code || order.product_name) && (
                                <div className="text-[10px] truncate mb-0.5 text-slate-600">
                                    {order.product_article_code && <span className="font-mono text-slate-400 mr-1">{order.product_article_code}</span>}
                                    {order.product_name}
                                </div>
                            )}
                            {/* Row 3: qty + dates */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 mt-1 border-t border-black/5 pt-1">
                                {order.quantity != null && <span className="font-semibold text-slate-600">{order.quantity} uds</span>}
                                {(order.effective_start_date || order.start_date) && <span>▶ {formatDateSafe(order.effective_start_date || order.start_date)}</span>}
                                {(order.committed_delivery_date || order.effective_delivery_date) && (
                                    <span className={isLate ? 'text-yellow-600 font-semibold' : ''}>
                                        ✓ {formatDateSafe(order.committed_delivery_date || order.effective_delivery_date)}
                                    </span>
                                )}
                                {order.planned_end_date && <span>⏹ {formatDateSafe(order.planned_end_date)}</span>}
                            </div>
                        </div>
                    );
                    })
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </Card>
  );
}