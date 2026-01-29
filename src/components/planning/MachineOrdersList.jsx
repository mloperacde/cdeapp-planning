import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Factory, Calendar, AlertCircle, Edit } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default function MachineOrdersList({ machines = [], orders, processes, onEditOrder }) {
  // Machines are already sorted by 'orden' from query - use them directly

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 1: return "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
      case 2: return "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100";
      case 3: return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100";
      case 4: return "bg-green-50 text-green-700 border-green-200 hover:bg-green-100";
      default: return "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100";
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch(priority) {
      case 1: return "bg-red-600 hover:bg-red-700";
      case 2: return "bg-orange-500 hover:bg-orange-600";
      case 3: return "bg-blue-500 hover:bg-blue-600";
      case 4: return "bg-green-500 hover:bg-green-600";
      default: return "bg-slate-500 hover:bg-slate-600";
    }
  };

  const getMachineOrders = (machineId) => {
    return orders.filter(o => o.machine_id === machineId);
  };

  return (
    <Card className="flex flex-col shadow-none border-0 bg-transparent">
      <CardHeader className="py-2 px-0 pb-4">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Factory className="w-5 h-5 text-slate-600" />
          Tablero de Órdenes por Máquina
        </CardTitle>
      </CardHeader>
      <div className="pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {machines.map(machine => {
          const machineOrders = getMachineOrders(machine.id);
          // Show machine card even if empty, to visualize capacity/availability
          // if (machineOrders.length === 0) return null;

          return (
            <div key={machine.id} className="flex flex-col bg-white dark:bg-slate-950 rounded-lg border shadow-sm h-fit flex-shrink-0">
              {/* Machine Header */}
              <div className="p-3 border-b bg-slate-50/80 dark:bg-slate-900 sticky top-0 z-10 backdrop-blur-sm rounded-t-lg">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">
                    {machine.descripcion || machine.nombre}
                  </h3>
                  <Badge variant="secondary" className="bg-white dark:bg-slate-800 shadow-sm border text-xs font-mono shrink-0">
                    {machineOrders.length}
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                   <span className="truncate max-w-[150px]">{machine.ubicacion || 'Sin ubicación'}</span>
                </div>
              </div>

              {/* Orders List */}
              <div className="p-2 space-y-2 min-h-[100px]">
                {machineOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-md">
                        <Calendar className="w-8 h-8 mb-2 opacity-20" />
                        <span className="text-xs">Sin órdenes asignadas</span>
                    </div>
                ) : (
                    machineOrders.map(order => {
                    const process = processes.find(p => p.id === order.process_id);
                    const isLate = order.committed_delivery_date && new Date(order.committed_delivery_date) < new Date();
                    
                    return (
                        <div 
                            key={order.id} 
                            onClick={() => onEditOrder(order)}
                            className={`
                                relative p-2 rounded-md border cursor-pointer transition-all group hover:shadow-md
                                ${getPriorityColor(order.priority)}
                            `}
                        >
                            {/* Línea 1: Pry, Orden, Artículo, Nombre, Cliente */}
                            <div className="flex items-center gap-2 mb-1.5 text-xs overflow-hidden whitespace-nowrap">
                                <Badge className={`${getPriorityBadgeColor(order.priority)} text-[10px] px-1.5 py-0 h-4 border-0 text-white shrink-0`}>
                                    P{order.priority}
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

                            {/* Línea 2: Cantidad, Materiales, Fechas */}
                            <div className="flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400 overflow-hidden whitespace-nowrap border-t border-black/5 dark:border-white/5 pt-1.5">
                                <span className="font-semibold shrink-0" title="Cantidad">
                                    {order.quantity ? `${order.quantity} uds` : 'Sin cantidad'}
                                </span>
                                
                                {order.material_type && (
                                    <>
                                        <span className="text-slate-300 shrink-0">•</span>
                                        <span className="truncate max-w-[100px]" title={`Material: ${order.material_type}`}>{order.material_type}</span>
                                    </>
                                )}

                                <div className="ml-auto flex items-center gap-2 shrink-0">
                                    {(order.new_delivery_date || order.committed_delivery_date) && (
                                        <span className={`flex items-center gap-1 ${isLate ? 'text-red-700 font-bold' : ''}`} title="Fecha Entrega">
                                           Ent: {format(parseISO(order.new_delivery_date || order.committed_delivery_date), 'dd/MM')}
                                        </span>
                                    )}
                                    
                                    {order.start_date && (
                                        <span className="text-slate-500" title="Fecha Inicio Límite">
                                           Ini: {format(parseISO(order.start_date), 'dd/MM')}
                                        </span>
                                    )}

                                    {order.planned_end_date && (
                                        <span className="text-slate-500" title="Fecha Fin">
                                           Fin: {format(parseISO(order.planned_end_date), 'dd/MM')}
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