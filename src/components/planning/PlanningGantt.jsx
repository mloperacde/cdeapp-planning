import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { addDays, format, differenceInDays, isSameDay, parseISO, isWeekend } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, CalendarClock, GripVertical, AlertTriangle } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function PlanningGantt({ orders, machines, processes, dateRange, onEditOrder, onOrderDrop, holidays = [] }) {
  // 1. Calculate Working Days (Skip weekends and holidays)
  const days = useMemo(() => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const dayList = [];
    let current = start;
    
    // Create a set of holiday strings for fast lookup
    const holidaySet = new Set(holidays.map(h => h.date));

    while (current <= end) {
      const dateStr = format(current, 'yyyy-MM-dd');
      // Skip weekends (0=Sun, 6=Sat) and holidays
      if (!isWeekend(current) && !holidaySet.has(dateStr)) {
         dayList.push(new Date(current));
      }
      current = addDays(current, 1);
    }
    return dayList;
  }, [dateRange, holidays]);

  // 2. Group orders by machine
  const machineRows = useMemo(() => {
    return machines.map(machine => {
      const machineOrders = orders.filter(o => o.machine_id === machine.id);
      
      // Separate scheduled vs unscheduled (backlog)
      // Unscheduled: No start_date OR explicitly cleared
      // Scheduled: Has start_date
      const scheduled = machineOrders.filter(o => o.start_date);
      const backlog = machineOrders.filter(o => !o.start_date); // Pry 1 & 2 from CSV will be here

      return {
        ...machine,
        scheduled,
        backlog
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

  const handleDragEnd = (result) => {
    const { destination, draggableId, source } = result;
    
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // We only handle dropping onto a Timeline Day (droppableId format: "timeline|machineId|date")
    if (destination.droppableId.startsWith("timeline|")) {
       const [, machineId, dateStr] = destination.droppableId.split("|");
       
       // Find order
       let order = null;
       // We need to find the order in the whole list or pass it. 
       // draggableId is usually orderId.
       order = orders.find(o => o.id === draggableId);
       
       if (order && onOrderDrop) {
          onOrderDrop(order, dateStr, machineId);
       }
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Card className="h-full flex flex-col shadow-md overflow-hidden bg-white dark:bg-slate-950">
        <CardHeader className="py-3 border-b bg-slate-50 dark:bg-slate-900">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            Cronograma de Producción ({days.length} días laborables)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-auto relative">
          <div className="min-w-max">
            {/* Header Row */}
            <div className="flex border-b sticky top-0 bg-white dark:bg-slate-900 z-30 shadow-sm">
              <div className="w-64 p-3 font-bold text-sm border-r bg-slate-50 dark:bg-slate-800 sticky left-0 z-40">
                Máquina / Ubicación
              </div>
              {days.map(day => (
                <div key={day.toISOString()} className="w-32 p-2 border-r text-center min-w-[8rem]">
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
              <div key={machine.id} className="flex border-b transition-colors group">
                {/* Left Column: Machine Info + Backlog */}
                <div className="w-64 border-r sticky left-0 bg-white dark:bg-slate-900 z-20 flex flex-col shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="p-3 font-medium text-sm border-b bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="font-bold text-slate-800 dark:text-slate-200">{machine.nombre}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                       {machine.ubicacion || 'Sin ubicación'}
                    </div>
                  </div>
                  
                  {/* Backlog Area */}
                  <div className="flex-1 bg-slate-100/50 dark:bg-slate-900/50 p-2 min-h-[60px]">
                     <div className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                       Sin Programar ({machine.backlog.length})
                     </div>
                     <Droppable droppableId={`backlog|${machine.id}`}>
                       {(provided) => (
                         <div 
                           ref={provided.innerRef} 
                           {...provided.droppableProps}
                           className="space-y-2 min-h-[20px]"
                         >
                           {machine.backlog.map((order, index) => (
                             <Draggable key={order.id} draggableId={order.id} index={index}>
                               {(provided, snapshot) => (
                                 <div
                                   ref={provided.innerRef}
                                   {...provided.draggableProps}
                                   {...provided.dragHandleProps}
                                   className={`bg-white dark:bg-slate-800 p-2 rounded border shadow-sm text-xs cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${snapshot.isDragging ? 'opacity-80 ring-2 ring-blue-500 z-50' : ''}`}
                                   style={provided.draggableProps.style}
                                 >
                                   <div className="flex justify-between items-start mb-1">
                                      <span className="font-bold text-blue-700 dark:text-blue-400">{order.order_number}</span>
                                      <Badge variant="outline" className={`h-4 px-1 text-[9px] ${order.priority <= 2 ? 'bg-red-50 text-red-600 border-red-200' : ''}`}>
                                        P{order.priority}
                                      </Badge>
                                   </div>
                                   <div className="truncate font-medium" title={order.product_article_code}>
                                      {order.product_article_code || 'Sin art.'}
                                   </div>
                                   <div className="text-muted-foreground truncate" title={order.product_name}>
                                      {order.product_name || 'Sin nombre'}
                                   </div>
                                   <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                                      <span>Cant: {order.quantity}</span>
                                   </div>
                                 </div>
                               )}
                             </Draggable>
                           ))}
                           {provided.placeholder}
                         </div>
                       )}
                     </Droppable>
                  </div>
                </div>

                {/* Timeline Grid */}
                <div className="flex relative">
                  {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    return (
                      <Droppable key={dateStr} droppableId={`timeline|${machine.id}|${dateStr}`}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`w-32 border-r min-h-[8rem] bg-transparent transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                          >
                             {/* Droppable placeholder needs to be here even if empty */}
                             <div className="w-full h-full opacity-0 pointer-events-none">
                               {provided.placeholder}
                             </div>
                          </div>
                        )}
                      </Droppable>
                    );
                  })}

                  {/* Scheduled Orders Overlay */}
                  {machine.scheduled.map(order => {
                    const startDate = parseISO(order.start_date);
                    // committed_delivery_date might be far in future, but we show BAR based on planned duration or committed?
                    // User said "estimación de fecha fin" in dialog. Assuming committed_delivery_date IS the end date.
                    const endDate = parseISO(order.committed_delivery_date);
                    
                    // We need to map dates to grid positions (skipping weekends/holidays)
                    // This is tricky with CSS absolute positioning if the grid skips days.
                    // Solution: Calculate "Index" in the filtered `days` array.
                    const startIndex = days.findIndex(d => isSameDay(d, startDate));
                    // If start date is not in view (e.g. weekend or outside range), we might have issues.
                    // If start date is a weekend, maybe snap to next working day?
                    
                    let effectiveStartIndex = startIndex;
                    let effectiveEndIndex = days.findIndex(d => isSameDay(d, endDate));
                    
                    // If completely outside view
                    if (effectiveStartIndex === -1 && effectiveEndIndex === -1) {
                         // Check if spanning over the view
                         if (startDate < days[0] && endDate > days[days.length-1]) {
                             effectiveStartIndex = 0;
                             effectiveEndIndex = days.length - 1;
                         } else {
                             return null; 
                         }
                    }

                    // Clip start
                    if (effectiveStartIndex === -1) {
                        if (startDate < days[0]) effectiveStartIndex = 0;
                        else return null; // Starts after view
                    }
                    
                    // Clip end
                    if (effectiveEndIndex === -1) {
                        if (endDate > days[days.length-1]) effectiveEndIndex = days.length - 1;
                        else {
                            // Ends before view starts?
                            if (endDate < days[0]) return null;
                            // Ends after view?
                            // Logic handles by finding index. If not found and > last, set to last.
                            // If we are here, it means endDate is not in `days`. Could be weekend.
                            // Find nearest previous working day?
                            // Or just find index of LAST day <= endDate
                            effectiveEndIndex = days.length - 1; 
                            for (let i = days.length - 1; i >= 0; i--) {
                                if (days[i] <= endDate) {
                                    effectiveEndIndex = i;
                                    break;
                                }
                            }
                        }
                    }

                    const durationCols = effectiveEndIndex - effectiveStartIndex + 1;
                    if (durationCols <= 0) return null;

                    const process = processes.find(p => p.id === order.process_id);
                    const isLate = new Date(order.committed_delivery_date) < new Date(order.start_date);

                    return (
                      <div
                        key={order.id}
                        onClick={() => onEditOrder(order)}
                        className={`absolute top-2 bottom-2 rounded-md shadow-sm border-l-4 cursor-pointer p-2 flex flex-col justify-center overflow-hidden transition-all text-white group-hover/item:scale-105 z-10 ${getPriorityColor(order.priority)}`}
                        style={{
                          left: `${effectiveStartIndex * 128 + 4}px`, // 128px = w-32
                          width: `${durationCols * 128 - 8}px`,
                        }}
                        title={`${order.order_number} - ${process?.nombre}`}
                      >
                        <div className="text-xs font-bold truncate flex items-center gap-1">
                          {order.order_number}
                          {isLate && <AlertCircle className="w-3 h-3 text-yellow-300" />}
                        </div>
                        <div className="text-[10px] opacity-90 truncate">
                          {process?.nombre || 'Proceso desconocido'}
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
    </DragDropContext>
  );
}