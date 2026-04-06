import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingDown, TrendingUp } from "lucide-react";
import { addDays, format, isValid } from "date-fns";
import { parseDateES } from "@/utils/parseDateES";
import { es } from "date-fns/locale";
import { normalize, isProductionOperator } from "@/utils/employeeFilters";

const OPERARIOS_POR_MAQUINA = 4; // Media temporal hasta disponer del dato real

export default function ResourceForecast({ orders, employees, machines = [], selectedTeam, dateRange }) {
  // Días del rango
  const days = useMemo(() => {
    if (!dateRange?.start || !dateRange?.end) return [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    if (!isValid(start) || !isValid(end)) return [];
    const dayList = [];
    let current = start;
    while (current <= end) {
      const dow = current.getDay(); // 0=Dom, 6=Sáb
      if (dow !== 0 && dow !== 6) dayList.push(new Date(current));
      current = addDays(current, 1);
    }
    return dayList;
  }, [dateRange]);

  // Empleados de Producción asignables (misma lógica que Jefes de Turno)
  const employeesAssignable = useMemo(() => {
    return (employees || []).filter(e => {
      if (!isProductionOperator(e)) return false;
      
      if (selectedTeam !== "all") {
        const empTeam = normalize(e.equipo);
        const target = normalize(selectedTeam);
        if (empTeam !== target) return false;
      }
      return true;
    });
  }, [employees, selectedTeam]);


  // Oferta: número fijo de operarios asignables (proyección estática, sin datos futuros de ausencias)
  const supply = employeesAssignable.length;

  // Forecast por día
  const forecast = useMemo(() => {
    return days.map(day => {
      const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);

      // --- DEMANDA: máquinas únicas activas ese día × 6 operarios ---
      const activeMachineIds = new Set();
      
      orders.forEach(order => {
        if (!order.start_date || !order.machine_id) return;

        const oStart = parseDateES(order.start_date);
        const oEnd = parseDateES(order.planned_end_date) || parseDateES(order.committed_delivery_date);
          
        if (isNaN(oStart.getTime())) return;
        
        if (oStart <= dayEnd && oEnd >= dayStart) {
          activeMachineIds.add(order.machine_id);
        }
      });
      
      // Si no hay filtro de equipo → día completo = 2 turnos → demanda doble
      // Si hay filtro (Mañana/Tarde/Noche) → demanda simple
      const turnos = selectedTeam === "all" ? 2 : 1;
      const demand = activeMachineIds.size * OPERARIOS_POR_MAQUINA * turnos;

      return {
        date: day,
        machines: activeMachineIds.size,
        demand,
        supply, 
        balance: supply - demand,
      };
    });
  }, [days, orders, supply, selectedTeam]);

  const avgBalance = forecast.length
    ? (forecast.reduce((s, d) => s + d.balance, 0) / forecast.length).toFixed(1)
    : 0;

  const totalAssignable = employeesAssignable.length;

  return (
    <Card className="shadow-md h-full flex flex-col">
      <CardHeader className="py-3 border-b bg-slate-50 dark:bg-slate-800">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Previsión de Recursos Humanos
            <span className="text-xs font-normal text-slate-500 ml-1">
              ({totalAssignable} operarios / {OPERARIOS_POR_MAQUINA} por máquina)
            </span>
          </div>
          <Badge variant={Number(avgBalance) >= 0 ? "outline" : "destructive"}>
            Balance Promedio: {Number(avgBalance) > 0 ? `+${avgBalance}` : avgBalance}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-auto flex-1">
        <div className="min-w-[600px]">
          {/* Header */}
          <div className="grid grid-cols-5 border-b bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
             <div className="p-2 text-xs font-bold border-r">Fecha</div>
             <div className="p-2 text-xs font-bold text-center border-r">Máq. Activas</div>
             <div className="p-2 text-xs font-bold text-center border-r">Demanda (Pers)</div>
             <div className="p-2 text-xs font-bold text-center border-r">Oferta (Disp)</div>
             <div className="p-2 text-xs font-bold text-center">Balance</div>
          </div>
          
          {/* Rows */}
          {forecast.map((dayData, i) => (
             <div key={i} className="grid grid-cols-5 border-b hover:bg-slate-50 transition-colors">
                <div className="p-2 text-xs border-r font-medium">
                   {format(dayData.date, 'dd/MM/yyyy')}
                </div>
                <div className="p-2 text-xs text-center border-r">{dayData.machines}</div>
                <div className="p-2 text-xs text-center border-r font-mono">{dayData.demand}</div>
                <div className="p-2 text-xs text-center border-r font-mono text-slate-500">{dayData.supply}</div>
                <div className={`p-2 text-xs text-center font-bold ${dayData.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                   {dayData.balance > 0 ? `+${dayData.balance}` : dayData.balance}
                </div>
             </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}