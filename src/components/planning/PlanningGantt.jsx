import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMachineAlias } from "@/utils/machineAlias";
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
      
      // Scheduled: Has effective_start_date — sorted by start date, then priority
      const scheduled = machineOrders
        .filter(o => o.effective_start_date)
        .sort((a, b) => {
          const dateA = new Date(a.effective_start_date);
          const dateB = new Date(b.effective_start_date);
          if (dateA - dateB !== 0) return dateA - dateB;
          // Same date: sort by priority (1=most urgent first, 0=sin prioridad last)
          const pA = a.priority === 0 ? 99 : (a.priority || 99);
          const pB = b.priority === 0 ? 99 : (b.priority || 99);
          return pA - pB;
        });

      // Backlog: No effective_start_date — sorted by priority then committed_delivery_date
      const backlog = machineOrders
        .filter(o => !o.effective_start_date)
        .sort((a, b) => {
          const pA = a.priority === 0 ? 99 : (a.priority || 99);
          const pB = b.priority === 0 ? 99 : (b.priority || 99);
          if (pA - pB !== 0) return pA - pB;
          const dateA = new Date(a.committed_delivery_date || a.effective_delivery_date || '9999');
          const dateB = new Date(b.committed_delivery_date || b.effective_delivery_date || '9999');
          return dateA - dateB;
        });

      return {
        ...machine,
        scheduled,
        backlog
      };
    });
  }, [machines, orders]);

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
                    <div className="font-bold text-slate-800 dark:text-slate-200" title={getMachineAlias(machine)}>
                        {getMachineAlias(machine)}
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
Cant: ${order.quantity || '-'} | Multi: ${order.multi_qty || '-'} | Mat: ${order.material_type || '-'}
Ent: ${order.effective_delivery_date || '-'}`;
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
                                  <div className="truncate text-[9px] text-slate-600 dark:text-slate-400 font-medium" title={order.product_article_code}>
                                     {order.product_article_code || '—'}
                                  </div>
                                  {order.product_name && (
                                    <div className="truncate text-[8px] text-slate-500 italic" title={order.product_name}>
                                      {order.product_name}
                                    </div>
                                  )}
                                  {order.client_name && (
                                    <div className="truncate text-[8px] text-slate-400" title={order.client_name}>
                                      👤 {order.client_name}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {(order.multi_qty || order.quantity) && (
                                      <span className="text-[8px] text-slate-500 font-medium">{order.multi_qty || order.quantity} uds</span>
                                    )}
                                    {order.material_type && (
                                      <span className="text-[8px] text-slate-400 truncate">| {order.material_type}</span>
                                    )}
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
                            className={`w-32 border-r bg-transparent transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                            style={{ minHeight: `${Math.max(8, machine.scheduled.length) * 56 + 16}px` }}
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

                  {/* Scheduled Orders - Positioned as time blocks */}
                  <div className="absolute inset-0 overflow-visible pointer-events-none">
                   {machine.scheduled.map((order, idx) => {
                     // Fecha inicio vigente: modified_start_date > start_date
                     const startStr = order.effective_start_date;
                     let startDate = parseISO(startStr);
                     if (!isValid(startDate)) startDate = new Date(startStr);
                     if (!isValid(startDate)) return null;

                     // Fecha fin vigente: new_delivery_date > committed_delivery_date > planned_end_date
                     const endStr = order.effective_delivery_date || order.planned_end_date;
                     let endDate = endStr ? parseISO(endStr) : startDate;
                     if (!isValid(endDate)) endDate = startDate;

                     // Calcular índice de columna inicio
                     let startIndex = days.findIndex(d => isSameDay(d, startDate));
                     if (startIndex === -1) {
                       if (startDate < days[0]) startIndex = 0;
                       else return null; // Fuera de rango (futuro)
                     }

                     // Calcular índice de columna fin
                     let endIndex = days.findIndex(d => isSameDay(d, endDate));
                     if (endIndex === -1) {
                       if (endDate > days[days.length - 1]) endIndex = days.length - 1;
                       else if (endDate < days[0]) return null;
                       else {
                         // Buscar el día más cercano anterior
                         for (let i = days.length - 1; i >= 0; i--) {
                           if (days[i] <= endDate) { endIndex = i; break; }
                         }
                       }
                     }

                     const durationCols = Math.max(1, endIndex - startIndex + 1);

                     const isLate = order.effective_delivery_date && new Date(order.effective_delivery_date) < new Date();
                     const qty = order.multi_qty || order.quantity || '';
                     const statusLabel = {
                       'En Progreso': 'EP',
                       'Completada': '✓',
                       'Retrasada': 'RET',
                       'Cancelada': 'CAN'
                     }[order.status] || '';

                     const tooltipText = [
                       `Nº ${order.order_number} | ${order.priority === 0 ? 'Sin Pry' : `Pry ${order.priority}`}`,
                       `Artículo: ${order.product_article_code || '-'}`,
                       `Nombre: ${order.product_name || '-'}`,
                       `Cliente: ${order.client_name || '-'}`,
                       `Cantidad: ${qty || '-'} | Material: ${order.material_type || '-'}`,
                       `Estado: ${order.status || '-'}`,
                       `Inicio: ${startStr || '-'} | Entrega: ${endStr || '-'}`,
                     ].join('\n');

                     return (
                       <div
                        key={order.id}
                        onClick={() => onEditOrder(order)}
                        className={`absolute rounded shadow-md border-2 cursor-pointer flex flex-col justify-start gap-0.5 text-white pointer-events-auto hover:shadow-lg hover:brightness-110 transition-all hover:z-30 ${getPriorityColor(order.priority)} ${isLate ? 'border-yellow-400' : 'border-white/20'}`}
                        style={{
                          left: `${startIndex * 128 + 4}px`,
                          width: `${durationCols * 128 - 8}px`,
                          top: `${idx * 56 + 4}px`,
                          minHeight: '52px',
                          padding: '4px 8px',
                          overflow: 'hidden',
                          zIndex: 10,
                        }}
                        title={tooltipText}
                      >
                        {/* Línea 1: Nº Orden + Estado + Alerta */}
                        <div className="flex items-center gap-1 min-w-0 w-full">
                          <span className="font-bold text-[10px] shrink-0 bg-black/20 rounded px-1 leading-tight">
                            {order.priority === 0 ? 'S/P' : `P${order.priority}`}
                          </span>
                          <span className="font-bold text-[10px] truncate flex-1">{order.order_number}</span>
                          {statusLabel && (
                            <span className="text-[8px] bg-black/20 rounded px-1 shrink-0 leading-tight">{statusLabel}</span>
                          )}
                          {isLate && <AlertCircle className="w-3 h-3 text-yellow-300 shrink-0" />}
                        </div>
                        {/* Línea 2: Código artículo */}
                        <div className="truncate text-[9px] opacity-95 leading-tight font-medium w-full">
                          {order.product_article_code || '—'}
                        </div>
                        {/* Línea 3: Nombre artículo */}
                        {order.product_name && (
                          <div className="truncate text-[8px] opacity-90 leading-tight w-full italic">
                            {order.product_name}
                          </div>
                        )}
                        {/* Línea 4: Cliente */}
                        {order.client_name && (
                          <div className="truncate text-[8px] opacity-80 leading-tight w-full">
                            👤 {order.client_name}
                          </div>
                        )}
                        {/* Línea 5: Cantidad + Material */}
                        <div className="flex items-center gap-1 min-w-0 w-full">
                          {qty && (
                            <span className="text-[8px] bg-black/20 rounded px-1 shrink-0 leading-tight">
                              {qty} uds
                            </span>
                          )}
                          {order.material_type && (
                            <span className="truncate text-[8px] opacity-85 leading-tight">{order.material_type}</span>
                          )}
                        </div>
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