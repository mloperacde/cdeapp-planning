import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingDown, TrendingUp } from "lucide-react";
import { addDays, format, isValid } from "date-fns";
import { es } from "date-fns/locale";

const OPERARIOS_POR_MAQUINA = 6; // Media temporal hasta disponer del dato real

const normalize = (str) =>
  str ? str.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

const isProductionDept = (emp) => {
  const d = normalize(emp?.departamento);
  return d === "produccion" || d === "producción" || d === "fabricacion" || d === "fabricación";
};

const isShiftLeader = (emp) => {
  const p = normalize(emp?.puesto);
  if (!p) return false;
  if (p.includes("jefe") && (p.includes("turno") || p.includes("produccion") || p.includes("producción"))) return true;
  if (p.includes("responsable") && p.includes("turno")) return true;
  return false;
};

export default function ResourceForecast({ orders, employees, selectedTeam, dateRange }) {
  // Días del rango
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

  // Empleados de Producción asignables (misma lógica que Jefes de Turno)
  const employeesAssignable = useMemo(() => {
    return (employees || []).filter(e => {
      if ((e.estado_empleado || "Alta") !== "Alta") return false;
      if (!isProductionDept(e)) return false;
      if (isShiftLeader(e)) return false;
      if (selectedTeam !== "all") {
        const empTeam = normalize(e.equipo);
        const target = normalize(selectedTeam);
        if (empTeam !== target) return false;
      }
      return true;
    });
  }, [employees, selectedTeam]);

  // Forecast por día
  const forecast = useMemo(() => {
    return days.map(day => {
      const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);

      // --- DEMANDA: máquinas únicas activas ese día × 6 operarios ---
      const activeMachineIds = new Set();
      orders.forEach(order => {
        if (!order.effective_start_date) return;
        const oStart = new Date(order.effective_start_date);
        const oEnd = order.effective_delivery_date
          ? new Date(order.effective_delivery_date)
          : new Date(order.committed_delivery_date || order.start_date || order.effective_start_date);
        if (isNaN(oStart.getTime())) return;
        // Orden activa si solapa con el día
        if (oStart <= dayEnd && oEnd >= dayStart) {
          if (order.machine_id) activeMachineIds.add(order.machine_id);
        }
      });
      // Si no hay filtro de equipo → día completo = 2 turnos → demanda doble
      const turnos = selectedTeam === "all" ? 2 : 1;
      const demand = activeMachineIds.size * OPERARIOS_POR_MAQUINA * turnos;

      // --- OFERTA: operarios disponibles ese día (sin ausencias) ---
      const supply = employeesAssignable.filter(emp => {
        // Ausencia con fechas explícitas
        if (emp.ausencia_inicio) {
          const absStart = new Date(emp.ausencia_inicio); absStart.setHours(0, 0, 0, 0);
          if (emp.ausencia_fin) {
            const absEnd = new Date(emp.ausencia_fin); absEnd.setHours(23, 59, 59, 999);
            if (dayStart >= absStart && dayStart <= absEnd) return false;
          } else {
            if (dayStart >= absStart) return false;
          }
        }
        return true;
      }).length;

      return {
        date: day,
        machines: activeMachineIds.size,
        demand,
        supply,
        balance: supply - demand,
      };
    });
  }, [days, orders, employeesAssignable]);

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
              ({totalAssignable} operarios prod.)
            </span>
          </div>
          <Badge variant={Number(avgBalance) >= 0 ? "outline" : "destructive"}>
            Balance Promedio: {Number(avgBalance) > 0 ? `+${avgBalance}` : avgBalance}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-auto">
        <div className="min-w-max">
          {/* Header de fechas */}
          <div className="flex border-b sticky top-0 bg-white dark:bg-slate-900 z-10">
            <div className="w-40 p-3 font-semibold text-sm border-r bg-slate-50 dark:bg-slate-800">
              Métrica
            </div>
            {forecast.map(day => (
              <div key={day.date.toISOString()} className="w-32 p-2 border-r text-center">
                <div className="text-xs text-slate-500 uppercase">{format(day.date, 'EEE', { locale: es })}</div>
                <div className="text-sm font-bold">{format(day.date, 'dd MMM')}</div>
              </div>
            ))}
          </div>

          {/* Máquinas activas */}
          <div className="flex border-b bg-slate-50/50 dark:bg-slate-800/20">
            <div className="w-40 p-3 font-medium text-xs border-r flex items-center gap-2 text-slate-500">
              Máquinas activas
            </div>
            {forecast.map((day, i) => (
              <div key={i} className="w-32 p-3 border-r text-center text-xs text-slate-500">
                {day.machines} máq.
              </div>
            ))}
          </div>

          {/* Demanda */}
          <div className="flex border-b">
            <div className="w-40 p-3 font-medium text-sm border-r flex items-center gap-2 text-blue-600">
              <TrendingDown className="w-4 h-4 flex-shrink-0" />
              <div>
                <div>Demanda</div>
                <div className="text-[10px] font-normal text-slate-400">~{OPERARIOS_POR_MAQUINA} op/máq.</div>
              </div>
            </div>
            {forecast.map((day, i) => (
              <div key={i} className="w-32 p-3 border-r text-center font-bold text-blue-600 bg-blue-50/30">
                {day.demand}
              </div>
            ))}
          </div>

          {/* Oferta */}
          <div className="flex border-b">
            <div className="w-40 p-3 font-medium text-sm border-r flex items-center gap-2 text-green-600">
              <Users className="w-4 h-4 flex-shrink-0" />
              <div>
                <div>Oferta</div>
                <div className="text-[10px] font-normal text-slate-400">Op. prod. disponibles</div>
              </div>
            </div>
            {forecast.map((day, i) => (
              <div key={i} className="w-32 p-3 border-r text-center font-bold text-green-600 bg-green-50/30">
                {day.supply}
              </div>
            ))}
          </div>

          {/* Balance */}
          <div className="flex">
            <div className="w-40 p-3 font-medium text-sm border-r flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <TrendingUp className="w-4 h-4 flex-shrink-0" /> Balance
            </div>
            {forecast.map((day, i) => (
              <div
                key={i}
                className={`w-32 p-3 border-r text-center font-bold ${
                  day.balance < 0
                    ? 'bg-red-100 text-red-700'
                    : day.balance === 0
                    ? 'bg-yellow-50 text-yellow-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {day.balance > 0 ? `+${day.balance}` : day.balance}
              </div>
            ))}
          </div>
        </div>

        {/* Nota explicativa */}
        <div className="p-3 border-t bg-amber-50 dark:bg-amber-900/10">
          <p className="text-[10px] text-amber-700 dark:text-amber-400">
            ⚠️ Demanda estimada temporalmente: {OPERARIOS_POR_MAQUINA} operarios por máquina activa (proyección). 
            Oferta = operarios de producción en activo sin ausencia registrada (proyección futura).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}