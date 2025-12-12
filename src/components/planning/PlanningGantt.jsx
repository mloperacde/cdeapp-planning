import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { addDays, format, differenceInDays, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, CalendarClock } from "lucide-react";

export default function PlanningGantt({ orders, machines, processTypes, dateRange, onEditOrder }) {
  // Generate days array for the header
  const days = useMemo(() => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const dayList = [];
    let current = start;
    while (current <= end) {
      dayList.push(new Date(current));
      current = addDays(current, 1);
    }
    return dayList;
  }, [dateRange]);

  // Group orders by machine
  const machineRows = useMemo(() => {
    return machines.map(machine => {
      const machineOrders = orders.filter(o => o.machine_id === machine.id);
      return {
        ...machine,
        orders: machineOrders
      };
    });
  }, [machines, orders]);

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 1: return "bg-red-500 hover:bg-red-600 border-red-700";
      case 2: return "bg-orange-500 hover:bg-orange-600 border-orange-700";
      case 3: return "bg-blue-500 hover:bg-blue-600 border-blue-700";
      case 4: return "bg-green-500 hover:bg-green-600 border-green-700";
      default: return "bg-slate-500 hover:bg-slate-600 border-slate-700";
    }
  };

  return (
    <Card className="h-full flex flex-col shadow-md overflow-hidden">
      <CardHeader className="py-3 border-b bg-slate-50 dark:bg-slate-800">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarClock className="w-4 h-4" />
          Cronograma de Producción ({days.length} días)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-auto relative">
        <div className="min-w-max">
          {/* Header Row */}
          <div className="flex border-b sticky top-0 bg-white dark:bg-slate-900 z-10 shadow-sm">
            <div className="w-48 p-3 font-bold text-sm border-r bg-slate-50 dark:bg-slate-800 sticky left-0 z-20">
              Máquina
            </div>
            {days.map(day => (
              <div key={day.toISOString()} className="w-32 p-2 border-r text-center">
                <div className="text-xs font-semibold uppercase text-slate-500">
                  {format(day, 'EEE', { locale: es })}
                </div>
                <div className={`text-sm font-bold ${isSameDay(day, new Date()) ? 'text-blue-600' : ''}`}>
                  {format(day, 'dd MMM')}
                </div>
              </div>
            ))}
          </div>

          {/* Machine Rows */}
          {machineRows.map(machine => (
            <div key={machine.id} className="flex border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="w-48 p-3 border-r font-medium text-sm sticky left-0 bg-white dark:bg-slate-900 z-10 flex items-center">
                {machine.nombre}
              </div>
              <div className="flex relative">
                {/* Grid cells */}
                {days.map(day => (
                  <div key={day.toISOString()} className="w-32 border-r h-24 bg-transparent" />
                ))}

                {/* Orders Overlay */}
                {machine.orders.map(order => {
                  const startDate = parseISO(order.start_date);
                  const endDate = parseISO(order.committed_delivery_date);
                  const viewStart = days[0];
                  
                  // Calculate position and width
                  let startOffset = differenceInDays(startDate, viewStart);
                  let duration = differenceInDays(endDate, startDate) + 1;
                  
                  // Clip if outside view
                  if (startOffset < 0) {
                    duration += startOffset;
                    startOffset = 0;
                  }
                  
                  // Skip if completely outside or invalid duration
                  if (duration <= 0) return null;

                  const processType = processTypes.find(p => p.id === order.process_type_id);
                  const isLate = new Date(order.committed_delivery_date) < new Date(order.start_date);

                  return (
                    <div
                      key={order.id}
                      onClick={() => onEditOrder(order)}
                      className={`absolute top-2 bottom-2 rounded-md shadow-sm border-l-4 cursor-pointer p-2 flex flex-col justify-center overflow-hidden transition-all text-white ${getPriorityColor(order.priority)}`}
                      style={{
                        left: `${startOffset * 128 + 4}px`, // 128px = w-32
                        width: `${duration * 128 - 8}px`,
                      }}
                      title={`${order.order_number} - ${processType?.name}`}
                    >
                      <div className="text-xs font-bold truncate flex items-center gap-1">
                        {order.order_number}
                        {isLate && <AlertCircle className="w-3 h-3 text-yellow-300" />}
                      </div>
                      <div className="text-[10px] opacity-90 truncate">
                        {processType?.name || 'Proceso desconocido'}
                      </div>
                      <div className="text-[10px] opacity-80 mt-1 flex justify-between">
                        <span>P{order.priority}</span>
                        <span>{order.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}