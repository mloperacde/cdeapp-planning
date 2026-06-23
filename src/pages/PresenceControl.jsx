/**
 * PresenceControl - Módulo de Control de Presencia por Turno
 * Vista diaria por turno (mañana/tarde), agrupada por departamento,
 * con verificación en tiempo real y predicción de ausencias.
 * Usa getExpectedAttendance (backend) para calcular hora esperada con
 * lógica precisa: tipo_turno, horarios fijos, rotativo (calendario de equipo), partido.
 */
import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAppData } from "@/components/data/DataProvider";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Zap, Calendar, AlertCircle, CheckCircle2, Search, X, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ShiftPanel from "@/components/presence/ShiftPanel";
import PresenceTotalsBar from "@/components/presence/PresenceTotalsBar";
import UnmappedEmployeesPanel from "@/components/presence/UnmappedEmployeesPanel";

// Convierte "HH:MM" a minutos desde medianoche
function timeToMinutes(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Estado del turno basado en hora actual vs rango del turno
// Devuelve: "before" | "active" | "closed"
function getShiftLifecycle(timeRange, nowMins) {
  // timeRange formato "HH:MM – HH:MM"
  const match = timeRange.match(/(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/);
  if (!match) return "active";
  const start = timeToMinutes(match[1]);
  const end = timeToMinutes(match[2]);
  if (nowMins < start) return "before";
  if (nowMins >= end) return "closed";
  return "active";
}

export default function PresenceControl() {
  const queryClient = useQueryClient();
  const { absences = [] } = useAppData();
  const [analysisDate, setAnalysisDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const yesterday = subDays(new Date(analysisDate), 1).toISOString().split("T")[0];
  const isToday = analysisDate === today;

  // Reloj dinámico — se actualiza cada minuto
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    };
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, []);

  // Última actualización de datos
  const [lastUpdated, setLastUpdated] = useState(null);

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
  const { data: records = [], isLoading: loadingRecords, refetch: refetchRecords, dataUpdatedAt } = useQuery({
    queryKey: ["attendanceRecords", analysisDate],
    queryFn: async () => {
      const data = await base44.entities.AttendanceRecord.filter({ record_date: analysisDate }, "record_time", 2000);
      setLastUpdated(new Date());
      return data;
    },
    staleTime: 0,           // Siempre datos frescos para presencia
    refetchInterval: isToday ? 120000 : false,  // Auto-refetch cada 2 min si es hoy
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
      const data = result.data;
      if (data?.success === false) {
        toast.error(`Error en sync: ${data.error || "Error desconocido"}`);
      } else {
        const count = data?.count ?? data?.inserted ?? 0;
        const analysis = data?.analysis;
        const msg = analysis
          ? `${count} marcajes · ${analysis.ficharon} ficharon · ${analysis.reactivados} reactivados`
          : `${count} marcajes sincronizados`;
        toast.success(msg);
      }
      queryClient.invalidateQueries({ queryKey: ["attendanceRecords", analysisDate] });
      refetchRecords();
      refetchExpected();
    } catch (err) {
      toast.error("Error al sincronizar: " + (err.message || "Timeout - la función tardó demasiado. Los datos se actualizarán en breve."));
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

  // Empleados que no ficharon ayer (predicción) — solo usamos esto como señal secundaria
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

  // nowMinutes ya es estado dinámico definido arriba

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

  // Empleados sin employee_id válido (no pueden cruzarse con Cuco360)
  const unmappedEmployees = useMemo(() => {
    if (!expectedData?.employees) return [];
    return expectedData.employees.filter(emp => {
      const code = emp.employee_id ? String(emp.employee_id).trim() : null;
      return !code || code === "0" || code === "null" || code === "undefined";
    });
  }, [expectedData]);

  // Enriquecer empleados esperados con datos de presencia real
  const enrichedEmployees = useMemo(() => {
    if (!expectedData?.employees) return [];

    return expectedData.employees.map(emp => {
      // Validar employee_id antes de cruzar — evita falsos ausentes por código mal mapeado
      const rawCode = emp.employee_id ? String(emp.employee_id).trim() : null;
      const isValidCode = rawCode && rawCode !== "0" && rawCode !== "null" && rawCode !== "undefined";
      const code = isValidCode ? rawCode : null;
      const attendance = code ? todayEntriesMap[code] : null;
      const confirmedAbsence = confirmedAbsencesMap[emp.employee_db_id];
      const predictedAbsent = !confirmedAbsence && absentYesterdaySet.has(emp.employee_db_id);


      // Hora esperada de entrada
      const expectedTime = emp.hora_entrada || "—";
      // Turno normalizado para los paneles
      const expectedShift = emp.turno === "Tarde" ? "tarde" : emp.turno === "Partido" ? "manana" : "manana";

      // Determinar el ciclo del turno del empleado para decidir el estado
      // Usamos hora de salida del empleado o la del panel si no está disponible
      const empShiftEnd = emp.hora_salida;
      const shiftTimeRange = emp.turno === "Tarde" ? "15:00 – 22:00" : "07:00 – 15:00";
      const shiftLifecycle = isToday
        ? getShiftLifecycle(
            empShiftEnd ? `${emp.hora_entrada || "07:00"} – ${empShiftEnd}` : shiftTimeRange,
            nowMinutes
          )
        : "closed"; // Días históricos siempre cerrados

      let presenceStatus = "pending";

      const hasRealEntry = attendance?.entries?.length > 0;
      const isApprovedAbsence = confirmedAbsence && confirmedAbsence.estado_aprobacion === "Aprobada";
      // Ausencia auto-generada por el sistema (pendiente de validar por RRHH)
      const isAutoAbsencePending = confirmedAbsence &&
        confirmedAbsence.estado_aprobacion === "Pendiente" &&
        (confirmedAbsence.tipo === "Ausencia No Justificada" || confirmedAbsence.notas?.includes("[SISTEMA]") || confirmedAbsence.notas?.includes("[shiftAudit]"));

      // Si hay marcaje real y la ausencia es solo automática/pendiente → ignorar ausencia
      const effectiveAbsence = (hasRealEntry && isAutoAbsencePending) ? null : confirmedAbsence;

      // REGLA CRÍTICA: Si el turno aún NO ha empezado para este empleado → siempre "pending"
      const expectedMins = timeToMinutes(expectedTime !== "—" ? expectedTime : null);
      const shiftNotStartedYet = isToday && expectedMins !== null && nowMinutes < expectedMins;

      // Detectar ausencia crónica: empleado ausente desde ayer o antes (sin fichar hoy ni ayer)
      const isAbsentYesterday = absentYesterdaySet.has(emp.employee_db_id);

      if (shiftLifecycle === "before" || shiftNotStartedYet) {
        // 0. Turno o hora individual aún no ha llegado → siempre pending
        presenceStatus = "pending";

      } else if (isApprovedAbsence && !hasRealEntry) {
        // 1. Ausencia APROBADA y sin marcaje → ausente confirmado
        presenceStatus = "absent_confirmed";

      } else if (hasRealEntry) {
        // 2. Tiene marcaje de entrada → presente o retraso
        const firstEntry = attendance.entries.sort()[0];
        if (expectedTime !== "—" && firstEntry > expectedTime) {
          const [h, m] = expectedTime.split(":").map(Number);
          const limitMinutes = h * 60 + m + 15; // tolerancia 15 min
          const [eh, em] = firstEntry.split(":").map(Number);
          const entryMinutes = eh * 60 + em;
          presenceStatus = entryMinutes > limitMinutes ? "late" : "present";
        } else {
          presenceStatus = "present";
        }

      } else if (effectiveAbsence && !hasRealEntry) {
        // 3. Ausencia pendiente (auto o manual) y sin marcaje → ausente
        presenceStatus = "absent_confirmed";

      } else if (shiftLifecycle === "closed") {
        // 4. Turno CERRADO y sin marcaje → ausente sin registro (estado definitivo)
        presenceStatus = "absent_no_record";

      } else if (shiftLifecycle === "active") {
        // 5. Turno EN CURSO, sin marcaje
        if (isAbsentYesterday) {
          // Si tampoco fichó ayer → ausente sin registro (ausencia de días anteriores)
          presenceStatus = "absent_no_record";
        } else if (expectedMins !== null && (nowMinutes - expectedMins) >= 30) {
          // Lleva >30 min de retraso → pendiente (puede venir tarde)
          presenceStatus = "pending";
        }
        // Si lleva <30 min o no se sabe hora → pending (puede estar en camino)
      }

      return {
        ...emp,
        nombre: emp.nombre,
        departamento: emp.departamento,
        tipo_turno: emp.tipo_turno,
        expectedShift,
        expectedTime,
        attendance,
        presenceStatus,
        confirmedAbsence: effectiveAbsence,
        predictedAbsent,
        unmapped: !isValidCode,
      };
    });
  }, [expectedData, todayEntriesMap, confirmedAbsencesMap, absentYesterdaySet]);

  // Filtrado por búsqueda
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return enrichedEmployees;
    const q = searchQuery.toLowerCase().trim();
    return enrichedEmployees.filter(e =>
      e.nombre?.toLowerCase().includes(q) ||
      e.departamento?.toLowerCase().includes(q)
    );
  }, [enrichedEmployees, searchQuery]);

  const morningEmployees = useMemo(() => filteredEmployees.filter(e => e.expectedShift === "manana"), [filteredEmployees]);
  const afternoonEmployees = useMemo(() => filteredEmployees.filter(e => e.expectedShift === "tarde"), [filteredEmployees]);

  // Totales globales — incluye absent_no_record como ausente confirmado
  const globalTotals = useMemo(() => {
    const all = enrichedEmployees;
    const todayStr = analysisDate;
    // Ausencias automáticas pendientes de validar hoy (empleados únicos)
    const autoPendingIds = new Set();
    const nowTs = new Date();
    absences.forEach(abs => {
      const isAuto = abs.motivo === 'Ausencia no comunicada - detección automática' ||
        (abs.notas && (abs.notas.startsWith('[SISTEMA]') || abs.notas.startsWith('[shiftAudit]')));
      if (!isAuto || abs.estado_aprobacion !== 'Pendiente') return;
      if (new Date(abs.fecha_inicio) > nowTs) return;
      const d = abs.fecha_inicio ? abs.fecha_inicio.slice(0, 10) : null;
      if (d === todayStr) autoPendingIds.add(abs.employee_id);
    });
    return {
      expected: all.length,
      present: all.filter(e => e.presenceStatus === "present" || e.presenceStatus === "late").length,
      absent: all.filter(e => e.presenceStatus === "absent_confirmed" || e.presenceStatus === "absent_no_record").length,
      predicted: all.filter(e => e.presenceStatus === "absent_predicted").length,
      pending: all.filter(e => e.presenceStatus === "pending").length,
      autoPendingValidation: autoPendingIds.size,
    };
  }, [enrichedEmployees, absences, analysisDate]);

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
            {lastUpdated && (
              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Datos actualizados: {format(lastUpdated, "HH:mm:ss")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <Input
                type="text"
                placeholder="Buscar empleado o departamento..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-7 w-52 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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

        {/* Indicador de detecciones automáticas pendientes de validar */}
        {isToday && globalTotals.autoPendingValidation > 0 && (
          <Link
            to="/AbsenceManagement?tab=validation"
            className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors text-xs text-amber-800 w-fit"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span>
              <strong>{globalTotals.autoPendingValidation}</strong> de los ausentes tienen detección automática pendiente de validar en RRHH
            </span>
            <span className="text-amber-500 font-medium">→ Revisar</span>
          </Link>
        )}
      </div>

      {/* Panel diagnóstico: empleados sin código Cuco360 */}
      <UnmappedEmployeesPanel unmappedEmployees={unmappedEmployees} />

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
              nowMinutes={nowMinutes}
              isAnalysisDate={isToday}
            />

            {/* Turno Tarde */}
            <ShiftPanel
              shiftKey="tarde"
              label="Turno Tarde"
              timeRange="15:00 – 22:00"
              employees={afternoonEmployees}
              nowMinutes={nowMinutes}
              isAnalysisDate={isToday}
            />
          </div>
        )}
      </div>
    </div>
  );
}