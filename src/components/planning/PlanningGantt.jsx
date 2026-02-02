import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { addDays, format, isSameDay, parseISO, isWeekend, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, CalendarClock } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function PlanningGantt({ orders = [], machines = [], dateRange, onEditOrder, onOrderDrop, holidays = [] }) {
  // 1. Calculate Working Days (Skip weekends and holidays)
  const days = useMemo(() => {
    if (!dateRange?.start || !dateRange?.end) return [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    if (!isValid(start) || !isValid(end)) return [];

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

  // Group orders by machine (machines already sorted by 'orden' from query)
  const machineRows = useMemo(() => {
    if (!Array.isArray(machines) || machines.length === 0) return [];
    return machines.map(machine => {
      const machineOrders = orders.filter(o => o.machine_id === machine.id);
      
      // Separate scheduled vs unscheduled (backlog)
      // Unscheduled: No effective_start_date OR explicitly cleared
      // Scheduled: Has effective_start_date
      const scheduled = machineOrders.filter(o => o.effective_start_date);
      const backlog = machineOrders.filter(o => !o.effective_start_date); // Pry 1 & 2 from CSV will be here

      return {
        ...machine,
        scheduled,
        backlog
      };
    });
  }, [machines, orders]); // machineRows recalculates when machines change (including orden)

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 0: return "bg-gray-500 hover:bg-gray-600 border-gray-700";
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
                    <div className="font-bold text-slate-800 dark:text-slate-200">{machine.descripcion || machine.nombre}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                       {machine.ubicacion || 'Sin ubicación'}
                    </div>
                  </div>
                  
                  {/* Backlog Area - Compact */}
                  <div className="flex-1 bg-slate-100/50 dark:bg-slate-900/50 p-1.5 min-h-[40px]">
                    <div className="text-[9px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                      Sin Programar ({machine.backlog.length})
                    </div>
                    <Droppable droppableId={`backlog|${machine.id}`}>
                      {(provided) => (
                        <div 
                          ref={provided.innerRef} 
                          {...provided.droppableProps}
                          className="space-y-1 min-h-[20px]"
                        >
                          {machine.backlog.map((order, index) => {
                             const tooltipText = `${order.priority === 0 ? 'S/P' : `P${order.priority}`} | ${order.order_number}
Art: ${order.product_article_code || '-'} | ${order.product_name || '-'}
Cli: ${order.client_name || '-'}
Cant: ${order.quantity || '-'} | Mat: ${order.material_type || '-'}
Ent: ${order.committed_delivery_date || '-'}`;
                            return (
                            <Draggable key={order.id} draggableId={order.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white dark:bg-slate-800 px-1.5 py-1 rounded border shadow-sm text-[10px] cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${snapshot.isDragging ? 'opacity-80 ring-2 ring-blue-500 z-50' : ''}`}
                                  style={provided.draggableProps.style}
                                  title={tooltipText}
                                >
                                  <div className="flex justify-between items-center gap-1">
                                     <span className="font-bold text-blue-700 dark:text-blue-400 text-[11px]">{order.order_number}</span>
                                     <Badge variant="outline" className={`h-3 px-1 text-[8px] ${order.priority === 0 ? 'bg-gray-50 text-gray-600 border-gray-200' : (order.priority <= 2 ? 'bg-red-50 text-red-600 border-red-200' : '')}`}>
                                       {order.priority === 0 ? 'S/P' : `P${order.priority}`}
                                     </Badge>
                                  </div>
                                  <div className="truncate text-[9px] text-slate-600" title={order.product_name}>
                                     {order.product_name || order.product_article_code || 'Sin nombre'}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                          })}
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

                  {/* Scheduled Orders - Stacked Compact Cards */}
                  <div className="absolute inset-0 p-2 space-y-1 overflow-visible">
                   {machine.scheduled.map((order, idx) => {
                     let startDate = parseISO(order.effective_start_date);
                     if (!isValid(startDate)) startDate = new Date(order.effective_start_date);
                     if (!isValid(startDate)) return null;

                     // Usar planned_end_date como fecha fin principal, fallback a effective_delivery_date
                     let endDateStr = order.planned_end_date || order.effective_delivery_date;
                     let endDate = endDateStr ? parseISO(endDateStr) : startDate;
                     
                     if (!isValid(endDate) && endDateStr) endDate = new Date(endDateStr);
                     if (!isValid(endDate)) endDate = startDate;

                     const startIndex = days.findIndex(d => isSameDay(d, startDate));
                     let effectiveStartIndex = startIndex;
                     let effectiveEndIndex = days.findIndex(d => isSameDay(d, endDate));

                     if (effectiveStartIndex === -1 && effectiveEndIndex === -1) {
                       if (startDate < days[0] && endDate > days[days.length-1]) {
                         effectiveStartIndex = 0;
                         effectiveEndIndex = days.length - 1;
                       } else {
                         return null; 
                       }
                     }

                     if (effectiveStartIndex === -1) {
                       if (startDate < days[0]) effectiveStartIndex = 0;
                       else return null;
                     }

                     if (effectiveEndIndex === -1) {
                       if (endDate > days[days.length-1]) effectiveEndIndex = days.length - 1;
                       else {
                         if (endDate < days[0]) return null;
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

                     const isLate = order.effective_delivery_date && new Date(order.effective_delivery_date) < new Date();
                     
                     const tooltipText = `${order.priority === 0 ? 'S/P' : `P${order.priority}`} | ${order.order_number}
Art: ${order.product_article_code || '-'} | ${order.product_name || '-'}
Cli: ${order.client_name || '-'}
Cant: ${order.quantity || '-'} | Mat: ${order.material_type || '-'}
Ent: ${order.effective_delivery_date || '-'}
Ini: ${order.effective_start_date || '-'} | Fin: ${order.planned_end_date || '-'}`;

                     return (
                       <div
                        key={order.id}
                        onClick={() => onEditOrder(order)}
                        className={`absolute h-8 rounded shadow-sm border cursor-pointer px-2 py-0.5 flex items-center gap-2 text-xs transition-all hover:shadow-md hover:z-20 ${getPriorityColor(order.priority)} text-white`}
                        style={{
                          left: `${effectiveStartIndex * 128 + 4}px`,
                          width: `${durationCols * 128 - 8}px`,
                          top: `${idx * 36 + 4}px`,
                        }}
                        title={tooltipText}
                      >
                        <div className="flex flex-col min-w-0 flex-1 justify-center h-full">
                          <div className="flex items-center gap-1">
                            <span className="font-bold shrink-0 text-[10px]">{order.priority === 0 ? 'S/P' : `P${order.priority}`}</span>
                            <span className="font-medium truncate text-[10px]">{order.order_number}</span>
                            {isLate && <AlertCircle className="w-3 h-3 text-yellow-300 shrink-0" />}
                          </div>
                          {order.product_name || order.product_article_code ? (
                            <span className="truncate text-[9px] opacity-90 leading-tight">{order.product_name || order.product_article_code}</span>
                          ) : null}
                        </div>
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 shrink-0 bg-white/20 text-white border-none">
                          {order.quantity || 0}
                        </Badge>
                      </div>
                     );
                   })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DragDropContext>
  );
}