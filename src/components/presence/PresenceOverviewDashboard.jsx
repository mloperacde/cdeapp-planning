import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "../../api/base44Client";
import { useAppData } from "../data/DataProvider";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Users, UserX, Clock, AlertTriangle, CheckCircle2,
  TrendingDown, RefreshCw, ArrowRight, Zap, UserCheck,
  Timer
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_CONFIG = {
  "Presente":              { label: "Presente",              color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800" },
  "Retraso":               { label: "Con retraso",           color: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50 dark:bg-amber-900/20",   border: "border-amber-200 dark:border-amber-800" },
  "Potencialmente Ausente":{ label: "Potenc. Ausente",       color: "bg-orange-500",  text: "text-orange-700",  bg: "bg-orange-50 dark:bg-orange-900/20",  border: "border-orange-200 dark:border-orange-800" },
  "Ausente Auto":          { label: "Ausente (auto)",         color: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50 dark:bg-red-900/20",     border: "border-red-200 dark:border-red-800" },
  "Ausente":               { label: "Ausente",               color: "bg-red-600",     text: "text-red-800",     bg: "bg-red-50 dark:bg-red-900/20",     border: "border-red-200 dark:border-red-800" },
  "No Aplica":             { label: "Fuera de turno",        color: "bg-slate-300",   text: "text-slate-500",   bg: "bg-slate-50 dark:bg-slate-800/50",  border: "border-slate-200 dark:border-slate-700" },
};

// eslint-disable-next-line no-unused-vars
function StatCard({ icon: StatIcon, label, value, sub, colorClass, onClick }) {
  const Icon = StatIcon;
  return (
    <Card
      className={`border shadow-sm cursor-pointer hover:shadow-md transition-shadow ${onClick ? "hover:border-blue-300" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
          {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeeStatusRow({ emp, absence }) {
  const cfg = STATUS_CONFIG[emp.estado_presencia] || STATUS_CONFIG["No Aplica"];
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{emp.nombre}</p>
        <p className="text-[11px] text-slate-500 truncate">{emp.departamento || "—"} · {emp.tipo_turno || "—"}</p>
      </div>
      <Badge className={`text-[10px] px-2 py-0.5 whitespace-nowrap ${cfg.text} border ${cfg.border} bg-white dark:bg-slate-900`}>
        {cfg.label}
      </Badge>
    </div>
  );
}

export default function PresenceOverviewDashboard({ onNavigate }) {
  const { employees = [], absences = [] } = useAppData();
  const today = format(new Date(), "yyyy-MM-dd");
  const todayDisplay = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es });

  // Fichajes de hoy
  const { data: todayRecords = [], isLoading: loadingRecords, refetch } = useQuery({
    queryKey: ["attendanceRecords", today],
    queryFn: () => base44.entities.AttendanceRecord.filter({ record_date: today }, "record_time", 2000),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const activeEmployees = useMemo(() =>
    employees.filter(e => e.estado_empleado === "Alta" && e.sujeto_a_control_horario !== false),
    [employees]
  );

  const nowDate = new Date();
  const activeAbsencesMap = useMemo(() => {
    const map = {};
    for (const abs of absences) {
      if (abs.estado_aprobacion === "Rechazada" || abs.estado_aprobacion === "Cancelada") continue;
      const start = new Date(abs.fecha_inicio);
      const end = abs.fecha_fin_desconocida ? new Date("2099-12-31") : new Date(abs.fecha_fin);
      if (start <= nowDate && nowDate <= end) {
        if (!map[abs.employee_id]) map[abs.employee_id] = abs;
      }
    }
    return map;
  }, [absences]);

  const pendingAbsences = useMemo(() =>
    absences.filter(a => a.estado_aprobacion === "Pendiente"), [absences]
  );

  // Stats de presencia usando estado_presencia del empleado
  const statusGroups = useMemo(() => {
    const groups = { presente: [], retraso: [], potAusente: [], ausenteAuto: [], ausente: [], noAplica: [] };
    for (const emp of activeEmployees) {
      switch (emp.estado_presencia) {
        case "Presente":               groups.presente.push(emp); break;
        case "Retraso":                groups.retraso.push(emp); break;
        case "Potencialmente Ausente": groups.potAusente.push(emp); break;
        case "Ausente Auto":           groups.ausenteAuto.push(emp); break;
        case "Ausente":                groups.ausente.push(emp); break;
        default:                       groups.noAplica.push(emp); break;
      }
    }
    return groups;
  }, [activeEmployees]);

  const totalCubiertos = statusGroups.presente.length + statusGroups.retraso.length;
  const totalProblema = statusGroups.potAusente.length + statusGroups.ausenteAuto.length + statusGroups.ausente.length;
  const tasaPresencia = activeEmployees.length > 0
    ? ((totalCubiertos / activeEmployees.length) * 100).toFixed(1)
    : "—";

  const problemEmployees = [
    ...statusGroups.ausenteAuto,
    ...statusGroups.ausente,
    ...statusGroups.potAusente,
    ...statusGroups.retraso,
  ].slice(0, 8);

  const handleSync = async () => {
    try {
      await base44.functions.invoke("cucoSyncV2", {});
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header fecha */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{todayDisplay}</p>
          <p className="text-xs text-slate-400">Última actualización automática cada hora</p>
        </div>
        <Button size="sm" variant="outline" onClick={refetch} className="gap-1.5 text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${loadingRecords ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Empleados controlados"
          value={activeEmployees.length}
          sub={`${todayRecords.filter(r => r.direction === "E").length > 0 ? todayRecords.filter(r => r.direction === "E").length : "—"} marcajes hoy`}
          colorClass="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={UserCheck}
          label="En planta ahora"
          value={totalCubiertos}
          sub={`${tasaPresencia}% tasa de presencia`}
          colorClass="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
          onClick={() => onNavigate?.("presencia", "realtime")}
        />
        <StatCard
          icon={AlertTriangle}
          label="Incidencias activas"
          value={totalProblema}
          sub={`${statusGroups.ausenteAuto.length} ausencias auto + ${statusGroups.potAusente.length} posibles`}
          colorClass="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          onClick={() => onNavigate?.("presencia", "monitor")}
        />
        <StatCard
          icon={Timer}
          label="Pendientes aprobación"
          value={pendingAbsences.length}
          sub="Solicitudes de ausencia"
          colorClass="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
          onClick={() => onNavigate?.("ausencias", "approval")}
        />
      </div>

      {/* Barra visual de presencia */}
      {activeEmployees.length > 0 && (
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Estado de presencia global</p>
              <span className="text-xs text-slate-400">{activeEmployees.length} empleados</span>
            </div>
            <div className="flex h-4 rounded-full overflow-hidden gap-px">
              {statusGroups.presente.length > 0 && (
                <div
                  className="bg-emerald-500 transition-all"
                  style={{ width: `${(statusGroups.presente.length / activeEmployees.length) * 100}%` }}
                  title={`Presentes: ${statusGroups.presente.length}`}
                />
              )}
              {statusGroups.retraso.length > 0 && (
                <div
                  className="bg-amber-400 transition-all"
                  style={{ width: `${(statusGroups.retraso.length / activeEmployees.length) * 100}%` }}
                  title={`Retraso: ${statusGroups.retraso.length}`}
                />
              )}
              {statusGroups.potAusente.length > 0 && (
                <div
                  className="bg-orange-400 transition-all"
                  style={{ width: `${(statusGroups.potAusente.length / activeEmployees.length) * 100}%` }}
                  title={`Pot. ausente: ${statusGroups.potAusente.length}`}
                />
              )}
              {statusGroups.ausenteAuto.length > 0 && (
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${(statusGroups.ausenteAuto.length / activeEmployees.length) * 100}%` }}
                  title={`Ausente auto: ${statusGroups.ausenteAuto.length}`}
                />
              )}
              {statusGroups.ausente.length > 0 && (
                <div
                  className="bg-red-700 transition-all"
                  style={{ width: `${(statusGroups.ausente.length / activeEmployees.length) * 100}%` }}
                  title={`Ausente formal: ${statusGroups.ausente.length}`}
                />
              )}
              {statusGroups.noAplica.length > 0 && (
                <div
                  className="bg-slate-200 dark:bg-slate-600 transition-all"
                  style={{ width: `${(statusGroups.noAplica.length / activeEmployees.length) * 100}%` }}
                  title={`Fuera de turno: ${statusGroups.noAplica.length}`}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {[
                { label: "Presente", count: statusGroups.presente.length, color: "bg-emerald-500" },
                { label: "Retraso", count: statusGroups.retraso.length, color: "bg-amber-400" },
                { label: "Pot. Ausente", count: statusGroups.potAusente.length, color: "bg-orange-400" },
                { label: "Ausente auto", count: statusGroups.ausenteAuto.length, color: "bg-red-500" },
                { label: "Ausente", count: statusGroups.ausente.length, color: "bg-red-700" },
                { label: "Fuera turno", count: statusGroups.noAplica.length, color: "bg-slate-300" },
              ].filter(s => s.count > 0).map(s => (
                <div key={s.label} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${s.color}`} />
                  <span className="text-[11px] text-slate-500">{s.label}: <strong>{s.count}</strong></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incidencias que requieren atención */}
      {problemEmployees.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Empleados con incidencias
            </h3>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs gap-1 text-blue-600"
              onClick={() => onNavigate?.("presencia", "monitor")}
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {problemEmployees.map(emp => (
              <EmployeeStatusRow
                key={emp.id}
                emp={emp}
                absence={activeAbsencesMap[emp.id]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => onNavigate?.("ausencias", "new")}
          className="flex items-center gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left"
        >
          <div className="p-2 bg-blue-600 rounded-lg">
            <UserX className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Nueva Ausencia</p>
            <p className="text-xs text-blue-500">Registrar manualmente</p>
          </div>
        </button>
        <button
          onClick={() => onNavigate?.("presencia", "daily")}
          className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
        >
          <div className="p-2 bg-slate-600 rounded-lg">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Marcajes del día</p>
            <p className="text-xs text-slate-500">Ver fichajes de hoy</p>
          </div>
        </button>
        <button
          onClick={() => onNavigate?.("informes", "absenteeism")}
          className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
        >
          <div className="p-2 bg-purple-600 rounded-lg">
            <TrendingDown className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Informes</p>
            <p className="text-xs text-slate-500">Análisis de absentismo</p>
          </div>
        </button>
      </div>
    </div>
  );
}