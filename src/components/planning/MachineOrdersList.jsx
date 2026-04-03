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
    return filtered.filter(o => {
      const key = String(o.order_number || o.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
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
                    const isLate = order.effective_delivery_date && new Date(order.effective_delivery_date) < new Date();
                    const hasPriorityConflict = conflictingOrders.has(String(order.order_number));
                    
                    return (
                        <div 
                            key={order.id} 
                            onClick={() => onEditOrder(order)}
                            className={`
                                relative p-2 rounded-md border cursor-pointer transition-all group hover:shadow-md
                                ${order.missing_components_flag
                                  ? 'border-red-400 bg-red-50 dark:bg-red-950/30'
                                  : hasPriorityConflict ? 'border-amber-400 bg-amber-50' : getPriorityColor(order.priority)}
                            `}
                        >
                            {order.missing_components_flag && (
                              <div className="flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-100 border border-red-200 rounded px-1.5 py-0.5 mb-1.5 w-fit">
                                <PackageX className="w-3 h-3" /> FALTAN COMPONENTES
                              </div>
                            )}
                            {/* Línea 1: Pry, Orden, Artículo, Nombre, Cliente */}
                            <div className="flex items-center gap-2 mb-1.5 text-xs overflow-hidden whitespace-nowrap">
                                <Badge className={`${getPriorityBadgeColor(order.priority)} text-[10px] px-1.5 py-0 h-4 border-0 text-white shrink-0`}>
                                    {order.priority === 0 ? 'S/P' : `P${order.priority}`}
                                </Badge>
                                <span className="font-bold shrink-0">{order.order_number}</span>
                                {order.product_article_code && (
                                    <>
                                        <span className="text-slate-400 shrink-0">|</span>
                                        <span className="font-medium shrink-0" title="Artículo">{order.product_article_code}</span>
                                    </>
                                )}
                                {order.product_name && (
                                    <>
                                        <span className="text-slate-400 shrink-0">|</span>
                                        <span className="truncate font-medium flex-1" title={order.product_name}>{order.product_name}</span>
                                    </>
                                )}
                                {order.client_name && (
                                    <>
                                        <span className="text-slate-400 shrink-0">|</span>
                                        <span className="italic truncate max-w-[80px]" title={order.client_name}>{order.client_name}</span>
                                    </>
                                )}
                                {isLate && (
                                    <div className="text-red-600 animate-pulse ml-auto shrink-0" title="Retrasada">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                    </div>
                                )}
                            </div>

                            {/* Línea 2: Cantidad, Multiplo, Materiales, Fechas */}
                            <div className="flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400 overflow-hidden whitespace-nowrap border-t border-black/5 dark:border-white/5 pt-1.5">
                                <span className="font-semibold shrink-0" title="Cantidad">
                                    {order.quantity ? `${order.quantity} uds` : 'Sin cantidad'}
                                </span>

                                {order.multi_qty && (
                                    <>
                                        <span className="text-slate-300 shrink-0">•</span>
                                        <span className="truncate max-w-[80px]" title={`Multiplo: ${order.multi_qty}`}>Multi: {order.multi_qty}</span>
                                    </>
                                )}
                                
                                {order.material_type && (
                                    <>
                                        <span className="text-slate-300 shrink-0">•</span>
                                        <span className="truncate max-w-[100px]" title={`Material: ${order.material_type}`}>{order.material_type}</span>
                                    </>
                                )}

                                <div className="ml-auto flex items-center gap-2 shrink-0">
                                    {order.effective_delivery_date && (
                                        <span className={`flex items-center gap-1 ${isLate ? 'text-red-700 font-bold' : ''}`} title="Fecha Entrega (Vigente)">
                                           Ent: {formatDateSafe(order.effective_delivery_date) || '-'}
                                        </span>
                                    )}
                                    
                                    {order.effective_start_date && (
                                        <span className="text-slate-500" title="Fecha Inicio (Vigente)">
                                           Ini: {formatDateSafe(order.effective_start_date) || '-'}
                                        </span>
                                    )}

                                    {order.planned_end_date && (
                                        <span className="text-slate-500" title="Fecha Fin">
                                           Fin: {formatDateSafe(order.planned_end_date) || '-'}
                                        </span>
                                    )}
                                </div>
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