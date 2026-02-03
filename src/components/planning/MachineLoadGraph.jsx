import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Activity } from "lucide-react";
import { addDays, format, isSameDay, isValid, startOfDay, endOfDay, max, min, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";

export default function MachineLoadGraph({ orders, machines, dateRange }) {
  // Generate days array
  const days = useMemo(() => {
    if (!dateRange?.start || !dateRange?.end) return [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    if (!isValid(start) || !isValid(end)) return [];

    const dayList = [];
    let current = start;
    while (current <= end) {
      dayList.push(new Date(current));
      current = addDays(current, 1);
    }
    return dayList;
  }, [dateRange]);

  // Load Calculation Logic
  const machineLoadMap = useMemo(() => {
    const loadMap = {}; // { machine_id: { day_iso: hours } }

    orders.forEach(order => {
        if (!order.machine_id) return;
        
        // Use effective dates
        const start = order.effective_start_date ? new Date(order.effective_start_date) : null;
        const endStr = order.planned_end_date || order.effective_delivery_date;
        const end = endStr ? new Date(endStr) : null;

        if (!isValid(start) || !isValid(end)) return;
        if (end < start) return;

        // Iterate days in order range
        // Optimization: Only iterate days that are within the VIEW range
        const viewStart = new Date(dateRange.start);
        const viewEnd = new Date(dateRange.end);
        
        // Intersection of Order Interval and View Interval
        const effectiveStart = max([start, viewStart]);
        const effectiveEnd = min([end, viewEnd]);
        
        if (effectiveStart > effectiveEnd) return;

        let currentDay = startOfDay(effectiveStart);
        const loopEnd = startOfDay(effectiveEnd);

        while (currentDay <= loopEnd) {
            const dayIso = format(currentDay, 'yyyy-MM-dd');
            
            // Calculate overlap for this specific day
            const dayStart = startOfDay(currentDay);
            const dayEnd = endOfDay(currentDay);
            
            const overlapStart = max([start, dayStart]);
            const overlapEnd = min([end, dayEnd]);
            
            const hours = Math.max(0, differenceInHours(overlapEnd, overlapStart));
            
            if (hours > 0) {
                if (!loadMap[order.machine_id]) loadMap[order.machine_id] = {};
                if (!loadMap[order.machine_id][dayIso]) loadMap[order.machine_id][dayIso] = 0;
                
                loadMap[order.machine_id][dayIso] += hours;
            }
            
            currentDay = addDays(currentDay, 1);
        }
    });

    return loadMap;
  }, [orders, dateRange]);

  return (
    <Card className="shadow-md h-full flex flex-col">
      <CardHeader className="py-3 border-b bg-slate-50 dark:bg-slate-800">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Gráfico de Carga de Máquina (Horas Ocupadas / 24h)
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
              &lt; 80%
            </Badge>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
              80-100%
            </Badge>
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
              &gt; 100%
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-auto">
        <div className="min-w-max">
          {/* Header Row */}
          <div className="flex border-b sticky top-0 bg-white dark:bg-slate-900 z-10">
            <div className="w-40 p-3 font-semibold text-sm border-r bg-slate-50 dark:bg-slate-800 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
              Máquina
            </div>
            {days.map(day => (
              <div key={day.toISOString()} className="w-20 p-2 border-r text-center bg-slate-50">
                <div className="text-[10px] text-slate-500 uppercase">{format(day, 'EEE', { locale: es })}</div>
                <div className="text-xs font-bold">{format(day, 'dd/MM')}</div>
              </div>
            ))}
          </div>

          {/* Machine Rows */}
          {machines.map(machine => {
              const machineLoad = machineLoadMap[machine.id] || {};
              
              return (
                <div key={machine.id} className="flex border-b hover:bg-slate-50 transition-colors">
                    <div className="w-40 p-2 text-sm font-medium border-r sticky left-0 bg-white dark:bg-slate-900 z-10 flex items-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="truncate" title={machine.name}>{machine.name}</div>
                    </div>
                    {days.map(day => {
                        const dayIso = format(day, 'yyyy-MM-dd');
                        const hours = machineLoad[dayIso] || 0;
                        const percentage = (hours / 24) * 100;
                        
                        let bgClass = "bg-white";
                        let textClass = "text-slate-300";
                        
                        if (hours > 0) {
                            if (percentage > 100) {
                                bgClass = "bg-red-500";
                                textClass = "text-white font-bold";
                            } else if (percentage >= 80) {
                                bgClass = "bg-yellow-400";
                                textClass = "text-yellow-900 font-bold";
                            } else {
                                bgClass = "bg-green-400";
                                textClass = "text-green-900 font-bold";
                            }
                        }

                        return (
                            <div key={dayIso} className={`w-20 p-2 border-r text-center text-xs flex items-center justify-center ${bgClass} ${textClass}`}>
                                {hours > 0 ? `${Math.round(hours)}h` : '-'}
                            </div>
                        );
                    })}
                </div>
              );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
