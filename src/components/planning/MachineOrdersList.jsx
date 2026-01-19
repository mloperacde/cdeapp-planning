import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Factory, Calendar, AlertCircle, Edit } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default function MachineOrdersList({ machines = [], orders, processes, onEditOrder }) {
  // Machines are already sorted by 'orden' from query - use them directly

  const getPriorityBadge = (priority) => {
    const colors = {
      1: "bg-red-500 text-white",
      2: "bg-orange-500 text-white",
      3: "bg-blue-500 text-white",
      4: "bg-green-500 text-white",
      5: "bg-slate-500 text-white"
    };
    return colors[priority] || colors[5];
  };

  const getMachineOrders = (machineId) => {
    return orders.filter(o => o.machine_id === machineId && o.start_date);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Factory className="w-4 h-4" />
          Órdenes Programadas por Máquina
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-4 space-y-4">
        {machines.map(machine => {
          const machineOrders = getMachineOrders(machine.id);
          if (machineOrders.length === 0) return null;

          return (
            <div key={machine.id} className="border rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 font-semibold text-sm flex items-center justify-between">
                <span>{machine.nombre}</span>
                <Badge variant="outline">{machineOrders.length} órdenes</Badge>
              </div>
              <div className="divide-y">
                {machineOrders.map(order => {
                  const process = processes.find(p => p.id === order.process_id);
                  const isLate = order.committed_delivery_date && new Date(order.committed_delivery_date) < new Date();
                  
                  return (
                    <div key={order.id} className="p-3 hover:bg-slate-50 transition-colors group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`${getPriorityBadge(order.priority)} text-xs px-2`}>
                              P{order.priority}
                            </Badge>
                            <span className="font-bold text-sm">{order.order_number}</span>
                            {isLate && (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-xs">Retrasada</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-sm text-slate-700 truncate mb-1">
                            {order.product_name || order.product_article_code || 'Sin nombre'}
                          </div>

                          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                            {order.client_name && (
                              <span>Cliente: {order.client_name}</span>
                            )}
                            {order.quantity && (
                              <span>Cantidad: {order.quantity}</span>
                            )}
                            {process && (
                              <span>Proceso: {process.nombre}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 mt-2 text-xs">
                            {order.start_date && (
                              <div className="flex items-center gap-1 text-blue-600">
                                <Calendar className="w-3 h-3" />
                                <span>Inicio: {format(parseISO(order.start_date), 'dd MMM yyyy', { locale: es })}</span>
                              </div>
                            )}
                            {order.committed_delivery_date && (
                              <div className={`flex items-center gap-1 ${isLate ? 'text-red-600 font-semibold' : 'text-green-600'}`}>
                                <Calendar className="w-3 h-3" />
                                <span>Entrega: {format(parseISO(order.committed_delivery_date), 'dd MMM yyyy', { locale: es })}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEditOrder(order)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}