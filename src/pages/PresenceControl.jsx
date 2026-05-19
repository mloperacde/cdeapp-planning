/**
 * PresenceControl - Módulo de Control de Presencia por Turno
 * Vista diaria por turno (mañana/tarde), agrupada por departamento,
 * con verificación en tiempo real y predicción de ausencias.
 */
import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAppData } from "@/components/data/DataProvider";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Zap, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ShiftPanel from "@/components/presence/ShiftPanel";
import PresenceTotalsBar from "@/components/presence/PresenceTotalsBar";

// Límite de turno: mañana < 13:00, tarde >= 13:00
const SHIFT_CUTOFF = "13:00";

function getExpectedShift(emp) {
  // Determina a qué turno pertenece el empleado según su horario
  const turno = emp.tipo_turno;
  if (turno === "Fijo Mañana") return "manana";
  if (turno === "Fijo Tarde") return "tarde";
  if (turno === "Turno Partido") {
    // Turno partido: entra por la mañana
    const entrada = emp.turno_partido_entrada1 || emp.horario_manana_inicio || "";
    return entrada < SHIFT_CUTOFF ? "manana" : "tarde";
  }
  if (turno === "Rotativo") {
    // Rotativo: depende del equipo y si es team_1 o team_2 (simplificado por hora de inicio)
    const inicio = emp.horario_manana_inicio || emp.horario_tarde_inicio || "";
    return inicio >= SHIFT_CUTOFF ? "tarde" : "manana";
  }
  // Fallback: por hora de inicio
  const inicio = emp.horario_manana_inicio || emp.horario_tarde_inicio || "";
  return inicio >= SHIFT_CUTOFF ? "tarde" : "manana";
}

function getExpectedTime(emp) {
  const turno = emp.tipo_turno;
  if (turno === "Fijo Mañana") return emp.horario_manana_inicio || "—";
  if (turno === "Fijo Tarde") return emp.horario_tarde_inicio || "—";
  if (turno === "Turno Partido") return emp.turno_partido_entrada1 || emp.horario_manana_inicio || "—";
  if (turno === "Rotativo") {
    const inicio = emp.horario_manana_inicio || "";
    return inicio >= SHIFT_CUTOFF ? emp.horario_tarde_inicio : emp.horario_manana_inicio || "—";
  }
  return emp.horario_manana_inicio || emp.horario_tarde_inicio || "—";
}

function getCurrentShift() {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return hhmm < SHIFT_CUTOFF ? "manana" : "tarde";
}

export default function PresenceControl() {
  const queryClient = useQueryClient();
  const { employees = [], absences = [] } = useAppData();
  const [analysisDate, setAnalysisDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSyncing, setIsSyncing] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const yesterday = subDays(new Date(analysisDate), 1).toISOString().split("T")[0];
  const currentShift = getCurrentShift();
  const isToday = analysisDate === today;

  // Marcajes del día de análisis
  const { data: records = [], isLoading: loadingRecords, refetch } = useQuery({
    queryKey: ["attendanceRecords", analysisDate],
    queryFn: () => base44.entities.AttendanceRecord.filter({ record_date: analysisDate }, "record_time", 2000),
    staleTime: 30000,
    refetchInterval: isToday ? 60000 : false,
  });

  // Marcajes de ayer (para predicción)
  const { data: yesterdayRecords = [] } = useQuery({
    queryKey: ["attendanceRecords", yesterday],
    queryFn: () => base44.entities.AttendanceRecord.filter({ record_date: yesterday }, "record_time", 2000),
    staleTime: 300000,
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await base44.functions.invoke("cucoSyncV2", { date: analysisDate });
      toast.success(`${result.data?.count || 0} marcajes sincronizados.`);
      queryClient.invalidateQueries({ queryKey: ["attendanceRecords", analysisDate] });
      refetch();
    } catch (err) {
      toast.error("Error al sincronizar: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Empleados activos sujetos a control
  const activeEmployees = useMemo(() =>
    employees.filter(e => e.estado_empleado === "Alta" && e.sujeto_a_control_horario !== false),
    [employees]
  );

  // Mapa de marcajes de hoy por empleado
  const todayEntriesMap = useMemo(() => {
    const map = {};
    for (const r of records) {
      if (!map[r.employee_id]) map[r.employee_id] = { entries: [], exits: [] };
      if (r.direction === "E") map[r.employee_id].entries.push(r.record_time);
      else map[r.employee_id].exits.push(r.record_time);
    }
    return map;
  }, [records]);

  // Empleados que no ficharon ayer (predicción de ausencia)
  const absentYesterdaySet = useMemo(() => {
    const yMap = {};
    for (const r of yesterdayRecords) {
      if (r.direction === "E") yMap[r.employee_id] = true;
    }
    // Empleados activos que NO tienen entrada ayer
    const absentSet = new Set();
    for (const emp of activeEmployees) {
      if (!yMap[emp.codigo_empleado]) absentSet.add(emp.id);
    }
    return absentSet;
  }, [yesterdayRecords, activeEmployees]);

  // Ausencias confirmadas para el día de análisis
  const confirmedAbsencesMap = useMemo(() => {
    const map = {};
    const analysisTs = new Date(analysisDate + "T12:00:00");
    for (const abs of absences) {
      if (abs.estado_aprobacion === "Rechazada" || abs.estado_aprobacion === "Cancelada") continue;
      const start = new Date(abs.fecha_inicio);
      const end = abs.fecha_fin_desconocida ? new Date("2099-12-31") : new Date(abs.fecha_fin);
      if (start <= analysisTs && analysisTs <= end) {
        map[abs.employee_id] = abs;
      }
    }
    return map;
  }, [absences, analysisDate]);

  // Enriquecer empleados con datos de presencia
  const enrichedEmployees = useMemo(() => {
    return activeEmployees.map(emp => {
      const code = emp.codigo_empleado ? String(emp.codigo_empleado) : null;
      const attendance = code ? todayEntriesMap[code] : null;
      const confirmedAbsence = confirmedAbsencesMap[emp.id];
      const predictedAbsent = !confirmedAbsence && absentYesterdaySet.has(emp.id);
      const expectedShift = getExpectedShift(emp);
      const expectedTime = getExpectedTime(emp);

      let presenceStatus = "pending"; // pending, present, late, absent_confirmed, absent_predicted
      if (confirmedAbsence) {
        presenceStatus = "absent_confirmed";
      } else if (attendance?.entries?.length > 0) {
        // Verificar si llegó tarde
        const firstEntry = attendance.entries.sort()[0];
        const limit = expectedTime !== "—" ? expectedTime : null;
        if (limit && firstEntry > limit && firstEntry <= `${limit.split(":")[0]}:${String(parseInt(limit.split(":")[1]) + 15).padStart(2, "0")}`) {
          presenceStatus = "late";
        } else {
          presenceStatus = "present";
        }
      } else if (predictedAbsent) {
        presenceStatus = "absent_predicted";
      }

      return {
        ...emp,
        expectedShift,
        expectedTime,
        attendance,
        presenceStatus,
        confirmedAbsence,
        predictedAbsent,
      };
    });
  }, [activeEmployees, todayEntriesMap, confirmedAbsencesMap, absentYesterdaySet]);

  const morningEmployees = useMemo(() => enrichedEmployees.filter(e => e.expectedShift === "manana"), [enrichedEmployees]);
  const afternoonEmployees = useMemo(() => enrichedEmployees.filter(e => e.expectedShift === "tarde"), [enrichedEmployees]);

  // Totales globales
  const globalTotals = useMemo(() => {
    const all = enrichedEmployees;
    return {
      expected: all.length,
      present: all.filter(e => e.presenceStatus === "present" || e.presenceStatus === "late").length,
      absent: all.filter(e => e.presenceStatus === "absent_confirmed").length,
      predicted: all.filter(e => e.presenceStatus === "absent_predicted").length,
      pending: all.filter(e => e.presenceStatus === "pending").length,
    };
  }, [enrichedEmployees]);

  const todayDisplay = format(new Date(analysisDate + "T12:00:00"), "EEEE d 'de' MMMM yyyy", { locale: es });

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">Control de Presencia</h1>
            <p className="text-xs text-slate-400 capitalize">{todayDisplay}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <Input
                type="date"
                value={analysisDate}
                onChange={e => setAnalysisDate(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
            <Button size="sm" variant="outline" onClick={() => { refetch(); }} className="gap-1.5 h-8 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRecords ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            <Button size="sm" onClick={handleSync} disabled={isSyncing} className="gap-1.5 h-8 text-xs bg-indigo-600 hover:bg-indigo-700">
              <Zap className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Sincronizando..." : "Sync Cuco360"}
            </Button>
          </div>
        </div>

        {/* Barra de totales globales */}
        <div className="mt-3">
          <PresenceTotalsBar totals={globalTotals} label="Total empresa" variant="global" />
        </div>
      </div>

      {/* Contenido: dos columnas de turno */}
      <div className="flex-1 overflow-y-auto p-4">
        {loadingRecords ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-500">Cargando datos de presencia...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Turno Mañana */}
            <ShiftPanel
              shiftKey="manana"
              label="Turno Mañana"
              timeRange="06:00 – 14:00"
              employees={morningEmployees}
              isCurrentShift={isToday && currentShift === "manana"}
              isAnalysisDate={isToday}
            />

            {/* Turno Tarde */}
            <ShiftPanel
              shiftKey="tarde"
              label="Turno Tarde"
              timeRange="14:00 – 22:00"
              employees={afternoonEmployees}
              isCurrentShift={isToday && currentShift === "tarde"}
              isAnalysisDate={isToday}
            />
          </div>
        )}
      </div>
    </div>
  );
}