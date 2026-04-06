import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { format, isValid, max, min, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { getMachineAlias } from "@/utils/machineAlias";
import { parseDateES } from "@/utils/parseDateES";

const DAILY_CAPACITY_HOURS = 14;
const WORK_START_HOUR = 7; // 07:00 AM
const WORK_END_HOUR = 22;  // 10:00 PM (15 hours span, but maybe lunch break?)

export default function MachineLoadGraph({ orders, machines, dateRange }) {
  // Generate days array
  const days = useMemo(() => {
    if (!dateRange?.start || !dateRange?.end) return [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    // ... (rest of days logic)
    const dayList = [];
    let current = start;
    while (current <= end) {
       // ... existing logic ...
       const d = new Date(current);
       if (d.getDay() !== 0 && d.getDay() !== 6) dayList.push(d);
       current.setDate(current.getDate() + 1);
    }
    return dayList;
  }, [dateRange]);

  // Load Calculation Logic
  const machineLoadMap = useMemo(() => {
    const loadMap = {}; // { machine_id: { day_iso: hours } }

    orders.forEach(order => {
        if (!order.machine_id) return;

        // Parsear fechas con soporte para formato español DD/MM/YYYY HH:mm
        const start = parseDateES(order.start_date);
        // Usar planned_end_date (fecha/hora real fin de fabricación) con prioridad
        const end = parseDateES(order.planned_end_date) || parseDateES(order.committed_delivery_date);

        if (!isValid(start) || !isValid(end)) return;
        if (end < start) return;

        // Iterate days
        let currentIter = new Date(start);
        currentIter.setHours(0,0,0,0);
        
        const lastDay = new Date(end);
        lastDay.setHours(0,0,0,0);

        while (currentIter <= lastDay) {
            const dayIso = format(currentIter, 'yyyy-MM-dd');
            
            // Calculate overlap for this specific day
            // But CLAMPED to working hours (07:00 - 22:00)
            const dayStartWork = new Date(currentIter);
            dayStartWork.setHours(WORK_START_HOUR, 0, 0, 0);
            
            const dayEndWork = new Date(currentIter);
            dayEndWork.setHours(WORK_END_HOUR, 0, 0, 0);
            
            // Intersection of [OrderStart, OrderEnd] AND [WorkStart, WorkEnd]
            const overlapStart = max([start, dayStartWork]);
            const overlapEnd = min([end, dayEndWork]);
            
            if (overlapStart < overlapEnd) {
                const minutes = (overlapEnd - overlapStart) / (1000 * 60 * 60);
                
                if (minutes > 0) {
                    if (!loadMap[order.machine_id]) loadMap[order.machine_id] = {};
                    if (!loadMap[order.machine_id][dayIso]) loadMap[order.machine_id][dayIso] = 0;
                    loadMap[order.machine_id][dayIso] += minutes;
                }
            }
            
            currentIter.setDate(currentIter.getDate() + 1);
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
            Gráfico de Carga de Máquina (Horas Ocupadas / 14h)
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
                        <div className="truncate" title={getMachineAlias(machine)}>
                            {getMachineAlias(machine)}
                        </div>
                    </div>
                    {days.map(day => {
                        const dayIso = format(day, 'yyyy-MM-dd');
                        const hours = machineLoad[dayIso] || 0;
                        const percentage = (hours / DAILY_CAPACITY_HOURS) * 100;
                        
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