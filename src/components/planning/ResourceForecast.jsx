import { useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingDown, TrendingUp } from "lucide-react";
import { addDays, format, isValid } from "date-fns";
import { parseDateES } from "@/utils/parseDateES";
import { es } from "date-fns/locale";
import { normalize } from "@/utils/employeeFilters";
import { base44 } from "@/api/base44Client";

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

  // Oferta: promedio de operarios de Producción presentes por turno (Mañana/Tarde)
  // a partir del histórico de fichajes (últimos 14 días). Mismo criterio que el
  // Control de Presencia (rotativos por TeamWeekSchedule + fijos + partidos).
  const [teamPresent, setTeamPresent] = useState({ team_1: 0, team_2: 0 });
  useEffect(() => {
    let cancelled = false;
    base44.functions.invoke('getTeamPresentAverage', { days: 14 })
      .then((res) => {
        const data = res?.data ?? res;
        if (!cancelled && data && typeof data.team_1 === "number") {
          setTeamPresent({ team_1: data.team_1, team_2: data.team_2 });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Mapa equipo (nombre) -> team_key, a partir de empleados
  const teamKeyForName = useMemo(() => {
    const n = normalize(selectedTeam);
    const emp = (employees || []).find(e => e.equipo && normalize(e.equipo) === n && e.team_key);
    return emp?.team_key || null;
  }, [employees, selectedTeam]);

  // Oferta: media de operarios presentes por turno (Mañana/Tarde). La demanda
  // se calcula para un solo turno, así que "Todos" = media de ambos turnos para
  // poder comparar. Un equipo concreto = su turno esa semana.
  const supply = useMemo(() => {
    if (selectedTeam !== "all" && teamKeyForName) {
      return teamPresent[teamKeyForName] || 0;
    }
    return Math.round((teamPresent.team_1 + teamPresent.team_2) / 2);
  }, [selectedTeam, teamKeyForName, teamPresent]);

  // Forecast por día
  const forecast = useMemo(() => {
    return days.map(day => {
      const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);

      // --- DEMANDA: pico concurrente real a lo largo del día.
      // Una máquina ejecuta UNA orden a la vez. Si una orden termina el día X y
      // la siguiente empieza ese mismo día en la misma máquina, es el MISMO
      // personal que continúa → no se cuenta dos veces. El operario necesario en
      // un instante t = suma, por máquina, del MÁXIMO de sus órdenes activas en
      // t (solapa = anomalía de datos → se toma el máximo, no la suma). La
      // demanda del día = pico de ese total a lo largo del día. ---
      const machineActiveIds = new Set();
      const events = []; // {t, type:'start'|'end', mid, ops}

      orders.forEach(order => {
        if (!order.start_date || !order.machine_id) return;
        if (!order.priority || Number(order.priority) < 1) return; // sin prioridad → no ejecutable

        const oStart = parseDateES(order.start_date);
        const oEnd = parseDateES(order.planned_end_date) || parseDateES(order.committed_delivery_date);
        if (!oStart || isNaN(oStart.getTime())) return;
        if (!oEnd || isNaN(oEnd.getTime())) return;

        if (oStart <= dayEnd && oEnd >= dayStart) {
          machineActiveIds.add(order.machine_id);
          const hasConfig = Array.isArray(order.personal_requerido) && order.personal_requerido.length > 0;
          const ops = hasConfig
            ? order.personal_requerido.reduce((s, r) => s + (Number(r.cantidad_operarios) || 0), 0)
            : (order.operadores_requeridos && order.operadores_requeridos > 0
                ? order.operadores_requeridos
                : OPERARIOS_POR_MAQUINA);
          const s = oStart < dayStart ? dayStart : oStart;
          const e = oEnd > dayEnd ? dayEnd : oEnd;
          if (s < e) {
            events.push({ t: s.getTime(), type: 'start', mid: order.machine_id, ops });
            events.push({ t: e.getTime(), type: 'end', mid: order.machine_id, ops });
          }
        }
      });

      // Sweep line: en cada evento recalcular el total concurrente y guardar el pico
      events.sort((a, b) => a.t - b.t);
      const activeByMachine = {};
      let demand = 0;
      for (const ev of events) {
        if (ev.type === 'start') {
          (activeByMachine[ev.mid] ||= []).push(ev.ops);
        } else {
          const arr = activeByMachine[ev.mid];
          if (arr) {
            const idx = arr.indexOf(ev.ops);
            if (idx >= 0) arr.splice(idx, 1);
            if (!arr.length) delete activeByMachine[ev.mid];
          }
        }
        let total = 0;
        for (const mid in activeByMachine) total += Math.max(...activeByMachine[mid]);
        if (total > demand) demand = total;
      }

      const activeMachineIds = [...machineActiveIds];

      return {
        date: day,
        machines: activeMachineIds.length,
        demand,
        supply,
        balance: supply - demand,
      };
    });
  }, [days, orders, supply, selectedTeam]);

  const avgBalance = forecast.length
    ? (forecast.reduce((s, d) => s + d.balance, 0) / forecast.length).toFixed(1)
    : 0;

  return (
    <Card className="shadow-md h-full flex flex-col">
      <CardHeader className="py-3 border-b bg-slate-50 dark:bg-slate-800">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Previsión de Recursos Humanos
            <span className="text-xs font-normal text-slate-500 ml-1">
              (Oferta = media de turnos · Mañana:{teamPresent.team_1} Tarde:{teamPresent.team_2})
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