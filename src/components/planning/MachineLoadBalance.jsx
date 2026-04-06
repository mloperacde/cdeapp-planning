import { useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format, isValid, max, min } from "date-fns";
import { es } from "date-fns/locale";
import { getMachineAlias } from "@/utils/machineAlias";
import { parseDateES } from "@/utils/parseDateES";
import { toast } from "sonner";

const DAILY_CAPACITY_HOURS = 15;
const WORK_START = 7;
const WORK_END = 22;

function calcHoursForDay(order, dayDate) {
  const start = parseDateES(order.start_date);
  const end = parseDateES(order.planned_end_date) || parseDateES(order.committed_delivery_date);
  if (!start || !end || !isValid(start) || !isValid(end)) return 0;

  const dayStartWork = new Date(dayDate); dayStartWork.setHours(WORK_START, 0, 0, 0);
  const dayEndWork = new Date(dayDate); dayEndWork.setHours(WORK_END, 0, 0, 0);

  const overlapStart = max([start, dayStartWork]);
  const overlapEnd = min([end, dayEndWork]);
  if (overlapStart >= overlapEnd) return 0;
  return (overlapEnd - overlapStart) / (1000 * 60 * 60);
}

function getCellColor(hours) {
  if (hours === 0) return { bg: "bg-slate-50", text: "text-slate-300", border: "border-slate-100" };
  const pct = (hours / DAILY_CAPACITY_HOURS) * 100;
  if (pct > 100) return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" };
  if (pct >= 80) return { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-200" };
  return { bg: "bg-green-50", text: "text-green-800", border: "border-green-200" };
}

export default function MachineLoadBalance({ orders, machines, dateRange, onReassignOrder }) {
  const [localOrders, setLocalOrders] = useState(null); // null = use prop orders
  const activeOrders = localOrders ?? orders;

  const days = useMemo(() => {
    if (!dateRange?.start || !dateRange?.end) return [];
    const dayList = [];
    let current = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    while (current <= end) {
      if (current.getDay() !== 0 && current.getDay() !== 6) dayList.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dayList;
  }, [dateRange]);

  // Build: machineId → dayIso → [orders]
  const machineDay = useMemo(() => {
    const map = {};
    machines.forEach(m => {
      map[m.id] = {};
      days.forEach(d => { map[m.id][format(d, 'yyyy-MM-dd')] = []; });
    });
    activeOrders.forEach(order => {
      if (!order.machine_id || !order.start_date) return;
      const start = parseDateES(order.start_date);
      const end = parseDateES(order.planned_end_date) || parseDateES(order.committed_delivery_date);
      if (!start || !end) return;
      days.forEach(day => {
        const h = calcHoursForDay(order, day);
        if (h > 0 && map[order.machine_id]) {
          map[order.machine_id][format(day, 'yyyy-MM-dd')].push(order);
        }
      });
    });
    return map;
  }, [activeOrders, machines, days]);

  const loadPerMachineDay = useMemo(() => {
    const map = {};
    machines.forEach(m => {
      map[m.id] = {};
      days.forEach(d => {
        const dayIso = format(d, 'yyyy-MM-dd');
        const dayOrders = machineDay[m.id]?.[dayIso] || [];
        map[m.id][dayIso] = dayOrders.reduce((sum, o) => sum + calcHoursForDay(o, d), 0);
      });
    });
    return map;
  }, [machineDay, machines, days]);

  const overloadCount = useMemo(() => {
    let count = 0;
    machines.forEach(m => {
      days.forEach(d => {
        const h = loadPerMachineDay[m.id]?.[format(d, 'yyyy-MM-dd')] || 0;
        if (h > DAILY_CAPACITY_HOURS) count++;
      });
    });
    return count;
  }, [loadPerMachineDay, machines, days]);

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    // droppableId format: "machineId__dayIso"
    const [destMachineId] = destination.droppableId.split('__');
    const orderId = draggableId;

    // Optimistic local update
    const updated = (localOrders ?? orders).map(o =>
      o.id === orderId ? { ...o, machine_id: destMachineId } : o
    );
    setLocalOrders(updated);

    // Persist
    onReassignOrder(orderId, destMachineId)
      .then(() => {
        toast.success("Orden reasignada correctamente");
        setLocalOrders(null); // Let parent data take over
      })
      .catch((e) => {
        toast.error("Error al reasignar: " + e.message);
        setLocalOrders(null); // Revert
      });
  };

  return (
    <Card className="shadow-md flex flex-col">
      <CardHeader className="py-3 border-b bg-slate-50 dark:bg-slate-800">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4" />
            Balance de Carga — Arrastra órdenes para nivelar
            <span className="text-xs font-normal text-slate-500">(máx. {DAILY_CAPACITY_HOURS}h/máquina/día)</span>
          </div>
          <div className="flex items-center gap-2">
            {overloadCount > 0 ? (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {overloadCount} celda{overloadCount > 1 ? 's' : ''} saturada{overloadCount > 1 ? 's' : ''}
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="w-3 h-3" />
                Sin saturación
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-auto">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="min-w-max">
            {/* Header */}
            <div className="flex border-b sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="w-44 p-3 font-semibold text-xs border-r bg-slate-50 dark:bg-slate-800 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                Máquina
              </div>
              {days.map(day => (
                <div key={day.toISOString()} className="w-36 p-2 border-r text-center bg-slate-50 dark:bg-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">{format(day, 'EEE', { locale: es })}</div>
                  <div className="text-xs font-bold">{format(day, 'dd/MM')}</div>
                </div>
              ))}
            </div>

            {/* Machine Rows */}
            {machines.map(machine => (
              <div key={machine.id} className="flex border-b">
                <div className="w-44 p-2 text-xs font-medium border-r sticky left-0 bg-white dark:bg-slate-900 z-10 flex items-start pt-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <span className="truncate" title={getMachineAlias(machine)}>{getMachineAlias(machine)}</span>
                </div>

                {days.map(day => {
                  const dayIso = format(day, 'yyyy-MM-dd');
                  const totalHours = loadPerMachineDay[machine.id]?.[dayIso] || 0;
                  const cellOrders = machineDay[machine.id]?.[dayIso] || [];
                  const { bg, text, border } = getCellColor(totalHours);
                  const pct = Math.min(Math.round((totalHours / DAILY_CAPACITY_HOURS) * 100), 999);

                  return (
                    <Droppable key={dayIso} droppableId={`${machine.id}__${dayIso}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`w-36 min-h-[60px] border-r p-1 flex flex-col gap-1 transition-colors ${bg} ${snapshot.isDraggingOver ? 'ring-2 ring-inset ring-blue-400' : ''}`}
                        >
                          {/* Load bar */}
                          {totalHours > 0 && (
                            <div className="flex items-center gap-1 mb-0.5">
                              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${pct > 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-400' : 'bg-green-500'}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className={`text-[10px] font-bold ${text}`}>{totalHours.toFixed(1)}h</span>
                            </div>
                          )}

                          {/* Order chips */}
                          {cellOrders.map((order, idx) => (
                            <Draggable key={order.id} draggableId={order.id} index={idx}>
                              {(prov, snap) => (
                                <div
                                  ref={prov.innerRef}
                                  {...prov.draggableProps}
                                  {...prov.dragHandleProps}
                                  className={`rounded px-1.5 py-0.5 text-[10px] leading-tight cursor-grab active:cursor-grabbing border truncate max-w-full
                                    ${snap.isDragging
                                      ? 'shadow-lg ring-2 ring-blue-400 bg-white z-50'
                                      : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                                    }`}
                                  title={`${order.order_number} — ${order.product_name || ''}`}
                                >
                                  <span className="font-semibold text-slate-700">{order.order_number}</span>
                                  {order.product_name && (
                                    <span className="text-slate-400 ml-1">{order.product_name.slice(0, 18)}</span>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            ))}
          </div>
        </DragDropContext>
      </CardContent>
    </Card>
  );
}