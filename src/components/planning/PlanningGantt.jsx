import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMachineAlias } from "@/utils/machineAlias";
import { addDays, format, isSameDay, isWeekend, isValid } from "date-fns";
import { parseDateES } from "@/utils/parseDateES";
import { es } from "date-fns/locale";
import { AlertCircle, CalendarClock, Users } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// Devuelve el nº de operarios requeridos para una orden:
// prioriza la configuración granular por actividad (personal_requerido),
// luego operadores_requeridos, finalmente null si no hay info.
const getRequiredOperators = (order) => {
  if (Array.isArray(order.personal_requerido) && order.personal_requerido.length > 0) {
    return order.personal_requerido.reduce((s, r) => s + (Number(r.cantidad_operarios) || 0), 0);
  }
  if (order.operadores_requeridos && order.operadores_requeridos > 0) return order.operadores_requeridos;
  return null;
};

// Lista detallada de actividades/personel para el tooltip
const getStaffDetail = (order) => {
  if (Array.isArray(order.personal_requerido) && order.personal_requerido.length > 0) {
    return order.personal_requerido
      .map(r => `${r.actividad || 'Actividad'}: ${r.cantidad_operarios || 0}`)
      .join(', ');
  }
  return null;
};

const ZOOM_CONFIG = {
  compact:  { dayWidth: 96,  rowHeight: 60 },
  normal:   { dayWidth: 128, rowHeight: 72 },
  detailed: { dayWidth: 160, rowHeight: 88 },
};

export default function PlanningGantt({ orders = [], machines = [], dateRange, onEditOrder, onOrderDrop, holidays = [], zoomLevel = "compact" }) {
  const zoom = ZOOM_CONFIG[zoomLevel] || ZOOM_CONFIG.compact;

  const days = useMemo(() => {
    if (!dateRange?.start || !dateRange?.end) return [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    if (!isValid(start) || !isValid(end)) return [];
    const holidaySet = new Set(holidays.map(h => h.date));
    const dayList = [];
    let current = start;
    while (current <= end) {
      const dateStr = format(current, 'yyyy-MM-dd');
      if (!isWeekend(current) && !holidaySet.has(dateStr)) dayList.push(new Date(current));
      current = addDays(current, 1);
    }
    return dayList;
  }, [dateRange, holidays]);

  // Group + row-pack: orders with non-overlapping dates share the same row
  const machineRows = useMemo(() => {
    if (!Array.isArray(machines) || machines.length === 0) return [];
    const DAY_MS = 86400000;

    return machines.map(machine => {
      const mId = String(machine.id);
      const machineOrders = orders.filter(o => o.machine_id && String(o.machine_id) === mId);

      const scheduled = machineOrders
        .filter(o => o.start_date)
        .sort((a, b) => {
          const dA = parseDateES(a.start_date), dB = parseDateES(b.start_date);
          if (dA - dB !== 0) return dA - dB;
          const pA = a.priority === 0 ? 99 : (a.priority || 99);
          const pB = b.priority === 0 ? 99 : (b.priority || 99);
          return pA - pB;
        });

      const backlog = machineOrders
        .filter(o => !o.start_date)
        .sort((a, b) => {
          const pA = a.priority === 0 ? 99 : (a.priority || 99);
          const pB = b.priority === 0 ? 99 : (b.priority || 99);
          if (pA !== pB) return pA - pB;
          return new Date(a.committed_delivery_date || '9999') - new Date(b.committed_delivery_date || '9999');
        });

      // Row packing by timestamp — works regardless of visible date range
      const rowEndTs = [];
      const packedScheduled = scheduled.map(order => {
        const startDate = parseDateES(order.start_date);
        const endStr = order.planned_end_date || order.committed_delivery_date;
        const endDate = parseDateES(endStr) || startDate;
        const startTs = startDate ? startDate.getTime() : 0;
        const endTs = endDate ? Math.max(endDate.getTime(), startTs + DAY_MS) : startTs + DAY_MS;
        const rowIdx = rowEndTs.findIndex(last => last <= startTs);
        const assignedRow = rowIdx !== -1 ? rowIdx : rowEndTs.length;
        rowEndTs[assignedRow] = endTs;
        return { ...order, _row: assignedRow };
      });

      return {
        ...machine,
        scheduled: packedScheduled,
        backlog,
        numRows: Math.max(1, rowEndTs.length),
      };
    });
  }, [machines, orders]);

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 0: return "bg-gray-500 hover:bg-gray-600";
      case 1: return "bg-red-500 hover:bg-red-600";
      case 2: return "bg-orange-500 hover:bg-orange-600";
      case 3: return "bg-blue-500 hover:bg-blue-600";
      case 4: return "bg-green-500 hover:bg-green-600";
      default: return "bg-slate-500 hover:bg-slate-600";
    }
  };

  const handleDragEnd = (result) => {
    const { destination, draggableId, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    if (destination.droppableId.startsWith("timeline|")) {
      const [, machineId, dateStr] = destination.droppableId.split("|");
      const order = orders.find(o => o.id === draggableId);
      if (order && onOrderDrop) onOrderDrop(order, dateStr, machineId);
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
            {/* Header */}
            <div className="flex border-b sticky top-0 bg-white dark:bg-slate-900 z-30 shadow-sm">
              <div className="w-64 flex-shrink-0 p-2.5 font-bold text-xs border-r bg-slate-50 dark:bg-slate-800 sticky left-0 z-40">
                Máquina / Ubicación
              </div>
              <div className="flex">
                {days.map(day => (
                  <div
                    key={day.toISOString()}
                    className="border-r text-center flex flex-col items-center justify-center py-1.5"
                    style={{ width: `${zoom.dayWidth}px`, minWidth: `${zoom.dayWidth}px`, flexShrink: 0 }}
                  >
                    <div className="text-[10px] font-semibold uppercase text-slate-500">
                      {format(day, 'EEE', { locale: es })}
                    </div>
                    <div className={`text-xs font-bold ${isSameDay(day, new Date()) ? 'text-blue-600' : ''}`}>
                      {format(day, 'dd MMM')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Machine Rows */}
            {machineRows.map(machine => {
              const rowHeightPx = machine.numRows * zoom.rowHeight + 12;
              return (
                <div key={machine.id} className="flex border-b transition-colors group">
                  {/* Left Column */}
                  <div className="w-64 flex-shrink-0 border-r sticky left-0 bg-white dark:bg-slate-900 z-20 flex flex-col shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div className="p-3 font-medium text-sm border-b bg-slate-50/50 dark:bg-slate-800/50">
                      <div className="font-bold text-slate-800 dark:text-slate-200" title={getMachineAlias(machine)}>
                        {getMachineAlias(machine)}
                      </div>
                    </div>
                    <div className="flex-1 bg-slate-100/50 dark:bg-slate-900/50 p-1.5 min-h-[40px]">
                      <div className="text-[9px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                        Sin Programar ({machine.backlog.length})
                      </div>
                      <Droppable droppableId={`backlog|${machine.id}`}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1 min-h-[20px]">
                            {machine.backlog.map((order, index) => (
                              <Draggable key={order.id} draggableId={order.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-white dark:bg-slate-800 px-1.5 py-1 rounded border shadow-sm text-[10px] cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'opacity-80 ring-2 ring-blue-500 z-50' : ''}`}
                                    style={provided.draggableProps.style}
                                  >
                                    <div className="flex justify-between items-center gap-1">
                                      <span className="font-bold text-blue-700 dark:text-blue-400">{order.order_number}</span>
                                      <Badge variant="outline" className="h-3 px-1 text-[8px]">
                                        {order.priority === 0 ? 'S/P' : `P${order.priority}`}
                                      </Badge>
                                    </div>
                                    {order.client_name && <div className="truncate text-[9px] text-slate-500 italic">{order.client_name}</div>}
                                    <div className="truncate text-[9px] text-slate-600 dark:text-slate-400">
                                      {order.product_article_code || '—'}
                                    </div>
                                    {order.product_name && <div className="truncate text-[8px] text-slate-500 italic">{order.product_name}</div>}
                                    <div className="flex items-center gap-1 text-[8px] text-slate-500 mt-0.5">
                                      {(order.quantity || order.multi_qty) && <span>{order.multi_qty || order.quantity} uds</span>}
                                      {(() => {
                                        const ops = getRequiredOperators(order);
                                        return ops !== null && (
                                          <span className="flex items-center gap-0.5 text-blue-600 font-medium">
                                            <Users className="w-2 h-2" />{ops}
                                          </span>
                                        );
                                      })()}
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
                  <div className="flex relative flex-shrink-0">
                    {days.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      return (
                        <Droppable key={dateStr} droppableId={`timeline|${machine.id}|${dateStr}`}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`border-r transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'bg-transparent'}`}
                              style={{ width: `${zoom.dayWidth}px`, minWidth: `${zoom.dayWidth}px`, minHeight: `${rowHeightPx}px` }}
                            >
                              <div className="opacity-0 pointer-events-none">{provided.placeholder}</div>
                            </div>
                          )}
                        </Droppable>
                      );
                    })}

                    {/* Scheduled orders — absolutely positioned */}
                    <div className="absolute inset-0 overflow-visible pointer-events-none">
                      {machine.scheduled.map((order) => {
                        const startStr = order.start_date;
                        const startDate = parseDateES(startStr);
                        if (!startDate || !isValid(startDate)) return null;

                        const endStr = order.planned_end_date || order.committed_delivery_date;
                        const endDate = parseDateES(endStr) || startDate;

                        const WORK_START_H = 7, WORK_HOURS = 15;
                        const dayFrac = (d) => {
                          const h = d.getHours() + d.getMinutes() / 60;
                          return (Math.min(Math.max(h, WORK_START_H), WORK_START_H + WORK_HOURS) - WORK_START_H) / WORK_HOURS;
                        };

                        let startIdx = days.findIndex(d => isSameDay(d, startDate));
                        let startFrac = 0;
                        if (startIdx === -1) {
                          if (startDate < days[0]) { startIdx = 0; }
                          else if (startDate > days[days.length - 1]) return null;
                          else { const ni = days.findIndex(d => d > startDate); if (ni !== -1) startIdx = ni; else return null; }
                        } else { startFrac = dayFrac(startDate); }

                        let endIdx = days.findIndex(d => isSameDay(d, endDate));
                        let endFrac = 1;
                        if (endIdx === -1) {
                          if (endDate < days[0]) return null;
                          else if (endDate > days[days.length - 1]) { endIdx = days.length - 1; }
                          else { for (let i = days.length - 1; i >= 0; i--) { if (days[i] < endDate) { endIdx = i; break; } } if (endIdx === -1) { endIdx = 0; endFrac = 0; } }
                        } else { endFrac = dayFrac(endDate); }

                        const leftPx = startIdx * zoom.dayWidth + startFrac * zoom.dayWidth;
                        const rightPx = endIdx * zoom.dayWidth + endFrac * zoom.dayWidth;
                        const widthPx = Math.max(zoom.dayWidth * 0.5, rightPx - leftPx);
                        const isLate = (endStr) && new Date(endStr) < new Date();
                        const qty = order.multi_qty || order.quantity || '';

                        const requiredOps = getRequiredOperators(order);
                        const staffDetail = getStaffDetail(order);
                        const tooltipText = [
                          `Nº ${order.order_number} | ${order.priority === 0 ? 'Sin Pry' : `Pry ${order.priority}`}`,
                          `Artículo: ${order.product_article_code || '-'} — ${order.product_name || '-'}`,
                          `Cliente: ${order.client_name || '-'}`,
                          `Cantidad: ${qty || '-'}`,
                          `Inicio: ${startStr} | Entrega: ${endStr || '-'}`,
                          requiredOps !== null
                            ? `Operarios req.: ${requiredOps}${staffDetail ? ` (${staffDetail})` : ''}`
                            : 'Operarios req.: no configurado',
                        ].join('\n');

                        return (
                          <div
                            key={order.id}
                            onClick={() => onEditOrder(order)}
                            className={`absolute rounded shadow border cursor-pointer flex flex-col justify-start gap-0.5 text-white pointer-events-auto hover:brightness-110 hover:shadow-lg hover:z-30 transition-all ${getPriorityColor(order.priority)} ${isLate ? 'ring-1 ring-yellow-400' : ''}`}
                            style={{
                              left: `${leftPx + 2}px`,
                              width: `${widthPx - 4}px`,
                              top: `${order._row * zoom.rowHeight + 4}px`,
                              minHeight: `${zoom.rowHeight - 8}px`,
                              padding: '3px 6px',
                              overflow: 'hidden',
                              zIndex: 10,
                            }}
                            title={tooltipText}
                          >
                            {/* Row 1: badge + order + client + icon */}
                            <div className="flex items-center gap-1 min-w-0 w-full">
                              <span className="font-bold text-[9px] shrink-0 bg-black/25 rounded px-1 leading-tight">
                                {order.priority === 0 || !order.priority ? 'S/P' : `P${order.priority}`}
                              </span>
                              <span className="font-bold text-[10px] truncate flex-1">{order.order_number}</span>
                              {order.client_name && <span className="text-[9px] opacity-80 italic truncate max-w-[60px] shrink-0">{order.client_name}</span>}
                              {isLate && <AlertCircle className="w-2.5 h-2.5 text-yellow-300 shrink-0" />}
                            </div>
                            {/* Row 2: article + name */}
                            {(order.product_article_code || order.product_name) && (
                              <div className="truncate text-[9px] opacity-90 leading-tight w-full">
                                {order.product_article_code && <span className="font-mono opacity-75 mr-1">{order.product_article_code}</span>}
                                {order.product_name}
                              </div>
                            )}
                            {/* Row 3: qty + operators + dates */}
                            <div className="flex items-center gap-1 min-w-0 w-full text-[8px] opacity-80 border-t border-white/10 pt-0.5 mt-0.5">
                              {qty && <span className="bg-black/20 rounded px-1 shrink-0">{qty} uds</span>}
                              {requiredOps !== null && (
                                <span className="bg-black/25 rounded px-1 shrink-0 flex items-center gap-0.5">
                                  <Users className="w-2 h-2" />{requiredOps}
                                </span>
                              )}
                              {startStr && <span>▶ {format(startDate, 'dd/MM')}</span>}
                              {endStr && endDate && (
                                <span className={isLate ? 'text-yellow-300 font-semibold' : ''}>✓ {format(endDate, 'dd/MM')}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </DragDropContext>
  );
}