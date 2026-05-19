/**
 * PresenceControl - Módulo de Control de Presencia por Turno
 * Vista diaria por turno (mañana/tarde), agrupada por departamento,
 * con verificación en tiempo real y predicción de ausencias.
 * Usa getExpectedAttendance (backend) para calcular hora esperada con
 * lógica precisa: tipo_turno, horarios fijos, rotativo (calendario de equipo), partido.
 */
import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAppData } from "@/components/data/DataProvider";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Zap, Calendar, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ShiftPanel from "@/components/presence/ShiftPanel";
import PresenceTotalsBar from "@/components/presence/PresenceTotalsBar";

const SHIFT_CUTOFF = "13:00";

function getCurrentShift() {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return hhmm < SHIFT_CUTOFF ? "manana" : "tarde";
}

export default function PresenceControl() {
  const queryClient = useQueryClient();
  const { absences = [] } = useAppData();
  const [analysisDate, setAnalysisDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSyncing, setIsSyncing] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const yesterday = subDays(new Date(analysisDate), 1).toISOString().split("T")[0];
  const currentShift = getCurrentShift();
  const isToday = analysisDate === today;

  // ── 1. Empleados esperados (backend: lógica precisa con rotación de equipos) ──
  const {
    data: expectedData,
    isLoading: loadingExpected,
    refetch: refetchExpected,
    error: expectedError,
  } = useQuery({
    queryKey: ["expectedAttendance", analysisDate],
    queryFn: async () => {
      const res = await base44.functions.invoke("getExpectedAttendance", { date: analysisDate });
      return res.data;
    },
    staleTime: 300000, // 5 min – el calendario no cambia frecuentemente
    retry: 2,
  });

  // ── 2. Marcajes reales del día ──
  const { data: records = [], isLoading: loadingRecords, refetch: refetchRecords } = useQuery({
    queryKey: ["attendanceRecords", analysisDate],
    queryFn: () => base44.entities.AttendanceRecord.filter({ record_date: analysisDate }, "record_time", 2000),
    staleTime: 30000,
    refetchInterval: isToday ? 60000 : false,
  });

  // ── 3. Marcajes de ayer (predicción de ausencia) ──
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
      refetchRecords();
    } catch (err) {
      toast.error("Error al sincronizar: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefresh = () => {
    refetchExpected();
    refetchRecords();
  };

  // Mapa de marcajes de hoy por employee_id (código Cuco)
  const todayEntriesMap = useMemo(() => {
    const map = {};
    for (const r of records) {
      if (!map[r.employee_id]) map[r.employee_id] = { entries: [], exits: [] };
      if (r.direction === "E") map[r.employee_id].entries.push(r.record_time);
      else map[r.employee_id].exits.push(r.record_time);
    }
    return map;
  }, [records]);

  // Empleados que no ficharon ayer (predicción)
  const absentYesterdaySet = useMemo(() => {
    const yMap = {};
    for (const r of yesterdayRecords) {
      if (r.direction === "E") yMap[r.employee_id] = true;
    }
    const set = new Set();
    for (const emp of (expectedData?.employees || [])) {
      if (!yMap[emp.employee_id]) set.add(emp.employee_db_id);
    }
    return set;
  }, [yesterdayRecords, expectedData]);

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

  // Enriquecer empleados esperados con datos de presencia real
  const enrichedEmployees = useMemo(() => {
    if (!expectedData?.employees) return [];

    return expectedData.employees.map(emp => {
      const code = emp.employee_id ? String(emp.employee_id) : null;
      const attendance = code ? todayEntriesMap[code] : null;
      const confirmedAbsence = confirmedAbsencesMap[emp.employee_db_id];
      const predictedAbsent = !confirmedAbsence && absentYesterdaySet.has(emp.employee_db_id);

      // Hora esperada de entrada
      const expectedTime = emp.hora_entrada || "—";
      // Turno normalizado para los paneles
      const expectedShift = emp.turno === "Tarde" ? "tarde" : emp.turno === "Partido" ? "manana" : "manana";

      let presenceStatus = "pending";
      if (confirmedAbsence) {
        presenceStatus = "absent_confirmed";
      } else if (attendance?.entries?.length > 0) {
        const firstEntry = attendance.entries.sort()[0];
        if (expectedTime !== "—" && firstEntry > expectedTime) {
          // Tolerancia de 15 minutos
          const [h, m] = expectedTime.split(":").map(Number);
          const limitMinutes = h * 60 + m + 15;
          const [eh, em] = firstEntry.split(":").map(Number);
          const entryMinutes = eh * 60 + em;
          presenceStatus = entryMinutes > limitMinutes ? "late" : "present";
        } else {
          presenceStatus = "present";
        }
      } else if (predictedAbsent) {
        presenceStatus = "absent_predicted";
      }

      return {
        ...emp,
        // Campos de compatibilidad con DepartmentPresenceBlock
        nombre: emp.nombre,
        departamento: emp.departamento,
        tipo_turno: emp.tipo_turno,
        expectedShift,
        expectedTime,
        attendance,
        presenceStatus,
        confirmedAbsence,
        predictedAbsent,
      };
    });
  }, [expectedData, todayEntriesMap, confirmedAbsencesMap, absentYesterdaySet]);

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
  const isLoading = loadingExpected || loadingRecords;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">Control de Presencia</h1>
            <p className="text-xs text-slate-400 capitalize">{todayDisplay}</p>
            {expectedData && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                Semana del {expectedData.week_start} · {expectedData.total} empleados esperados
              </p>
            )}
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
            <Button size="sm" variant="outline" onClick={handleRefresh} className="gap-1.5 h-8 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
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

      {/* Error al cargar empleados esperados */}
      {expectedError && (
        <div className="mx-4 mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Error al calcular empleados esperados: {expectedError.message}
        </div>
      )}

      {/* Contenido: dos columnas de turno */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-500">
              {loadingExpected ? "Calculando turnos y horarios..." : "Cargando marcajes..."}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Turno Mañana */}
            <ShiftPanel
              shiftKey="manana"
              label="Turno Mañana"
              timeRange="07:00 – 15:00"
              employees={morningEmployees}
              isCurrentShift={isToday && currentShift === "manana"}
              isAnalysisDate={isToday}
            />

            {/* Turno Tarde */}
            <ShiftPanel
              shiftKey="tarde"
              label="Turno Tarde"
              timeRange="15:00 – 22:00"
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