import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, TrendingDown } from "lucide-react";
import { addDays, format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

export default function ResourceForecast({ orders, processes, machineProcesses, employees, selectedTeam, dateRange }) {
  // Generate days array
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

  // Forecast Logic
  const forecast = useMemo(() => {
    return days.map(day => {
      // 1. Calculate Demand
      // Sum operators_required for all orders active on this day
      let demand = 0;
      orders.forEach(order => {
        const start = new Date(order.start_date);
        const end = new Date(order.committed_delivery_date);
        
        if (day >= start && day <= end) {
          // Try to find specific machine-process assignment first
          const mp = machineProcesses.find(
            item => item.machine_id === order.machine_id && item.process_id === order.process_id
          );
          
          if (mp && mp.operadores_requeridos) {
            demand += mp.operadores_requeridos;
          } else {
             const process = processes.find(p => p.id === order.process_id);
             if (process) {
               demand += (process.operadores_requeridos || 1);
             }
          }
        }
      });

      // 2. Calculate Supply
      // Count available employees. Filter by team if selected.
      // Roles considered: "OPERARIO DE LINEA", "OPERARIA DE LINEA", "2ª DE LINEA", "RESPONSABLE DE LINEA"
      // Status: "Alta" (Active)
      // Availability: "Disponible" (This is static in DB, for real forecast we'd check absences on that specific day)
      // NOTE: For 'availability' on a specific future date, we should ideally check the Absences table. 
      // Simplified here: we check basic "disponibilidad" field + static check. 
      // Better: Check if `employee.ausencia_inicio` and `ausencia_fin` overlap `day`.
      
      const targetRoles = ["OPERARIO DE LINEA", "OPERARIA DE LINEA", "2ª DE LINEA", "RESPONSABLE DE LINEA"];
      
      const availableEmployees = employees.filter(emp => {
        // Status check
        if ((emp.estado_empleado || "Alta") !== "Alta") return false;
        
        // Role check
        if (!targetRoles.includes(emp.puesto)) return false;
        
        // Team check
        if (selectedTeam !== "all" && emp.equipo !== selectedTeam) return false;
        
        // Availability on this specific day
        // Check if there is an active absence on this day
        if (emp.ausencia_inicio && emp.ausencia_fin) {
          const absStart = new Date(emp.ausencia_inicio);
          const absEnd = new Date(emp.ausencia_fin);
          if (day >= absStart && day <= absEnd) return false;
        } else if (emp.ausencia_inicio && !emp.ausencia_fin) {
             // Unknown end date -> assume absent
             const absStart = new Date(emp.ausencia_inicio);
             if (day >= absStart) return false;
        }
        
        // Fallback to general flag if dates are missing but status is Ausente (mostly for today)
        if (isSameDay(day, new Date()) && emp.disponibilidad === "Ausente") return false;

        return true;
      });

      const supply = availableEmployees.length;

      return {
        date: day,
        demand,
        supply,
        balance: supply - demand
      };
    });
  }, [days, orders, processTypes, employees, selectedTeam]);

  // Aggregate totals
  const totalDemand = forecast.reduce((sum, d) => sum + d.demand, 0);
  const totalSupply = forecast.reduce((sum, d) => sum + d.supply, 0);
  const avgBalance = forecast.length ? (forecast.reduce((sum, d) => sum + d.balance, 0) / forecast.length).toFixed(1) : 0;

  return (
    <Card className="shadow-md h-full flex flex-col">
      <CardHeader className="py-3 border-b bg-slate-50 dark:bg-slate-800">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Previsión de Recursos Humanos
          </div>
          <Badge variant={avgBalance >= 0 ? "outline" : "destructive"}>
            Balance Promedio: {avgBalance > 0 ? `+${avgBalance}` : avgBalance}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-auto">
        <div className="min-w-max">
          <div className="flex border-b sticky top-0 bg-white dark:bg-slate-900 z-10">
            <div className="w-32 p-3 font-semibold text-sm border-r bg-slate-50 dark:bg-slate-800">
              Métrica
            </div>
            {forecast.map(day => (
              <div key={day.date.toISOString()} className="w-32 p-2 border-r text-center">
                <div className="text-xs text-slate-500 uppercase">{format(day.date, 'EEE', { locale: es })}</div>
                <div className="text-sm font-bold">{format(day.date, 'dd MMM')}</div>
              </div>
            ))}
          </div>

          <div className="flex border-b">
            <div className="w-32 p-3 font-medium text-sm border-r flex items-center gap-2 text-blue-600">
              <TrendingDown className="w-4 h-4" /> Demanda
            </div>
            {forecast.map((day, i) => (
              <div key={i} className="w-32 p-3 border-r text-center font-bold text-blue-600 bg-blue-50/30">
                {day.demand}
              </div>
            ))}
          </div>

          <div className="flex border-b">
            <div className="w-32 p-3 font-medium text-sm border-r flex items-center gap-2 text-green-600">
              <Users className="w-4 h-4" /> Oferta
            </div>
            {forecast.map((day, i) => (
              <div key={i} className="w-32 p-3 border-r text-center font-bold text-green-600 bg-green-50/30">
                {day.supply}
              </div>
            ))}
          </div>

          <div className="flex">
            <div className="w-32 p-3 font-medium text-sm border-r flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <TrendingUp className="w-4 h-4" /> Balance
            </div>
            {forecast.map((day, i) => (
              <div 
                key={i} 
                className={`w-32 p-3 border-r text-center font-bold ${
                  day.balance < 0 ? 'bg-red-100 text-red-700' : 
                  day.balance === 0 ? 'bg-yellow-50 text-yellow-700' : 
                  'bg-emerald-100 text-emerald-700'
                }`}
              >
                {day.balance > 0 ? `+${day.balance}` : day.balance}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}