import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  FileSpreadsheet, Download, Filter, RefreshCw, CalendarDays,
  Users, User, Clock, TrendingDown, CheckCircle2, XCircle, AlertCircle, Bot, Award,
} from "lucide-react";
import { format, differenceInCalendarDays, subMonths, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { exportToExcel } from "@/utils/lockerExport";
import { isAutoAbsence, wasAutoDetected, clipInterval, countWorkingDays, isNoAbsenceYear } from "@/utils/absenceUtils";
import PayrollExportButton from "./PayrollExportButton";
import IndividualAbsenceReport from "./IndividualAbsenceReport";
import AbsenceReportHeader from "./AbsenceReportHeader";
import NoAbsenceAchievers from "./NoAbsenceAchievers";
import WorkdayComplianceReport from "./WorkdayComplianceReport";
import AbsenceComplianceSummary from "./AbsenceComplianceSummary";
import { SUMMARY_VISIBLE_COLUMNS, toSummaryExportRow } from "./employeeSummaryColumns";

const STATUS_CONFIG = {
  Pendiente:  { color: "bg-amber-100 text-amber-800", icon: AlertCircle },
  Aprobada:   { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  Rechazada:  { color: "bg-red-100 text-red-800", icon: XCircle },
  Cancelada:  { color: "bg-slate-100 text-slate-500", icon: XCircle },
};

export default function AbsenceReportGenerator({ employees: propEmployees, absenceTypes: propTypes }) {
  const now = new Date();
  // Periodo por defecto: últimos 12 meses + mes en curso
  const [dateFrom, setDateFrom] = useState(format(subMonths(now, 12), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(now, "yyyy-MM-dd"));
  const [filterDept, setFilterDept] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState('global');
  // Periodo aplicado al informe. El cálculo en backend recorre los fichajes de todo el
  // periodo, así que se aplica con un breve retardo para no lanzar una ejecución por
  // cada cambio intermedio de fecha.
  const [appliedPeriod, setAppliedPeriod] = useState({
    from: format(subMonths(now, 12), "yyyy-MM-dd"),
    to: format(now, "yyyy-MM-dd"),
  });
  const periodValid = Boolean(dateFrom) && Boolean(dateTo) && dateFrom <= dateTo;

  useEffect(() => {
    if (!periodValid) return;
    if (dateFrom === appliedPeriod.from && dateTo === appliedPeriod.to) return;
    const t = setTimeout(() => setAppliedPeriod({ from: dateFrom, to: dateTo }), 900);
    return () => clearTimeout(t);
  }, [dateFrom, dateTo, periodValid, appliedPeriod]);

  const { data: absences = [], isLoading } = useQuery({
    queryKey: ['absences-report'],
    queryFn: () => base44.entities.Absence.list('-fecha_inicio', 5000),
    staleTime: 0,
  });

  // Informe de ausencias calculado en backend (usa DailyPresence como fuente de verdad)
  const {
    data: reportResponse,
    isLoading: reportLoading,
    isFetching: reportFetching,
    error: reportError,
    refetch: refetchReport,
  } = useQuery({
    queryKey: ['absenceReport', filterDept, appliedPeriod.from, appliedPeriod.to],
    queryFn: async () => {
      const resp = await base44.functions.invoke('getAbsenceReport', {
        department: filterDept === 'all' ? null : filterDept,
        dateFrom: appliedPeriod.from,
        dateTo: appliedPeriod.to,
      });
      const payload = resp?.data;
      if (!payload || !Array.isArray(payload.employees)) {
        throw new Error(payload?.error || 'El informe no ha devuelto datos');
      }
      return payload;
    },
    enabled: periodValid,
    // El cálculo en backend ya reintenta ante límites de lectura del servicio: aquí no se repite
    // para no duplicar la carga. Si aun así falla, se explica el motivo y queda el botón Reintentar.
    staleTime: 5 * 60 * 1000,
    retry: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Cálculo en curso: primera carga, recálculo del periodo o periodo aún sin aplicar
  const periodPending = dateFrom !== appliedPeriod.from || dateTo !== appliedPeriod.to;
  const reportBusy = reportLoading || reportFetching || periodPending;
  const emptyMessage = reportError ? 'No se ha podido cargar el informe' : 'Sin datos';

  const { data: employees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre', 1000),
    initialData: propEmployees || [],
  });

  const { data: absenceTypes = [] } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.list('orden', 500),
    initialData: propTypes || [],
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list('date', 500),
  });

  // Set de festivos (yyyy-MM-dd) para excluir del cómputo de días laborables
  const holidaySet = useMemo(() => {
    const s = new Set();
    holidays.forEach(h => { if (h.date) s.add(h.date); });
    return s;
  }, [holidays]);

  const { data: vacations = [] } = useQuery({
    queryKey: ['vacations'],
    queryFn: () => base44.entities.Vacation.list('start_date', 500),
  });

  // Días de vacaciones: set global (aplica_todos) + map por empleado (vacaciones individuales)
  const { globalVacationSet, employeeVacationMap } = useMemo(() => {
    const globalSet = new Set();
    const empMap = {};
    const expand = (startStr, endStr) => {
      const days = [];
      const cur = new Date(startStr + "T00:00:00");
      const end = new Date(endStr + "T00:00:00");
      while (cur <= end) {
        days.push(format(cur, "yyyy-MM-dd"));
        cur.setDate(cur.getDate() + 1);
      }
      return days;
    };
    vacations.forEach(v => {
      if (!v.start_date || !v.end_date) return;
      const days = expand(v.start_date, v.end_date);
      if (v.aplica_todos) {
        days.forEach(d => globalSet.add(d));
      } else if (v.employee_ids?.length) {
        v.employee_ids.forEach(eid => {
          if (!empMap[eid]) empMap[eid] = new Set();
          days.forEach(d => empMap[eid].add(d));
        });
      }
    });
    return { globalVacationSet: globalSet, employeeVacationMap: empMap };
  }, [vacations]);

  const getEmp = (id) => employees.find(e => String(e.id) === String(id));
  const getType = (abs) => absenceTypes.find(t => t.id === abs.absence_type_id) || null;

  // Filtrar por rango de fechas (fecha_inicio dentro del rango)
  const rangeAbsences = useMemo(() => {
    const from = parseISO(appliedPeriod.from + "T00:00:00");
    const to = parseISO(appliedPeriod.to + "T23:59:59");
    return absences.filter(abs => {
      if (!abs.fecha_inicio) return false;
      const start = new Date(abs.fecha_inicio);
      return start >= from && start <= to;
    });
  }, [absences, appliedPeriod]);

  // Aplicar filtros adicionales
  const filtered = useMemo(() => {
    return rangeAbsences.filter(abs => {
      const emp = getEmp(abs.employee_id);
      const dept = emp?.departamento || "";
      const matchDept = filterDept === "all" || dept === filterDept;
      const matchType = filterType === "all" || abs.tipo === filterType;
      const matchStatus = filterStatus === "all" || abs.estado_aprobacion === filterStatus;
      return matchDept && matchType && matchStatus;
    });
  }, [rangeAbsences, employees, filterDept, filterType, filterStatus]);

  // Límites del rango seleccionado (el fin se acota a hoy: no se cuentan días futuros)
  const rangeBounds = useMemo(() => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const rawEnd = parseISO(appliedPeriod.to + "T23:59:59");
    return {
      start: parseISO(appliedPeriod.from + "T00:00:00"),
      end: rawEnd > endOfToday ? endOfToday : rawEnd,
    };
  }, [appliedPeriod]);

  // Intervalo de una ausencia recortado al rango del informe (null si fuera de rango)
  const getAbsenceInterval = (abs) => clipInterval(abs, rangeBounds.start, rangeBounds.end);

  // KPIs del periodo seleccionado (DailyPresence como fuente de verdad)
  const globalStats = useMemo(() => {
    const emps = reportResponse?.employees || [];
    const total = emps.length;
    const withAbsences = emps.filter(e => (e.daysPeriod || 0) > 0).length;
    const totalDays = emps.reduce((sum, e) => sum + (e.daysPeriod || 0), 0);
    // Días de ausencia de los últimos 12 meses (ventana móvil que termina en el periodo analizado)
    const totalDays12 = emps.reduce((sum, e) => sum + (e.days12 || 0), 0);
    const totalEpisodes = emps.reduce((sum, e) => sum + (e.episodesPeriod || 0), 0);
    const totalWorkDays = emps.reduce((sum, e) => sum + (e.workDaysPeriod || 0), 0);
    const totalDaysMonth = emps.reduce((sum, e) => sum + (e.daysMonth || 0), 0);
    const absentToday = emps.filter(e => e.estado === 'Ausente').length;
    const maternityCount = emps.filter(e => e.hasMaternity).length;
    const noAbsence12m = emps.filter(isNoAbsenceYear).length;
    // Jornada parcial no cumplida (han acudido pero no completan su turno), en los mismos días laborables
    const sumField = (field) => emps.reduce((s, e) => s + (e.compliancePeriod?.[field] || 0), 0);
    const evaluatedDays = sumField('evaluatedDays');
    const completeDays = sumField('completeDays');
    return {
      total,
      withAbsences,
      evaluatedDays,
      completeDays,
      delayDays: sumField('delayDays'),
      earlyDays: sumField('earlyDays'),
      incompleteDays: sumField('incompleteDays'),
      noExitDays: sumField('noExitDays'),
      daysNotCompliant: sumField('daysNotCompliant'),
      missingMinutes: sumField('missingMinutes'),
      employeesNotCompliant: emps.filter(e => (e.compliancePeriod?.daysNotCompliant || 0) > 0).length,
      complianceRate: evaluatedDays > 0 ? Math.round((completeDays / evaluatedDays) * 100) : 0,
      withoutAbsences: total - withAbsences,
      totalDays,
      totalDays12,
      totalEpisodes,
      totalWorkDays,
      absentismo: totalWorkDays > 0 ? Math.round((totalDays / totalWorkDays) * 1000) / 10 : 0,
      avgDaysPerEmployee: total > 0 ? Math.round((totalDays / total) * 10) / 10 : 0,
      totalDaysMonth,
      absentToday,
      maternityCount,
      noAbsence12m,
    };
  }, [reportResponse]);

  // Cabecera del informe: periodo analizado y fecha del análisis
  const etiquetaFecha = (valor, respaldo) => {
    const d = valor ? parseISO(valor + "T00:00:00") : null;
    return format(d && !isNaN(d.getTime()) ? d : respaldo, "dd/MM/yyyy");
  };
  // El periodo mostrado es el confirmado por el backend (el fin se acota a hoy)
  const periodLabel = reportResponse?.meta?.periodStart && reportResponse?.meta?.periodEnd
    ? `${format(parseISO(reportResponse.meta.periodStart + "T00:00:00"), "dd/MM/yyyy")} – ${format(parseISO(reportResponse.meta.periodEnd + "T00:00:00"), "dd/MM/yyyy")}`
    : `${etiquetaFecha(dateFrom, subMonths(now, 12))} – ${etiquetaFecha(dateTo, now)}`;
  const analysisDate = reportResponse?.meta?.generatedAt
    ? format(new Date(reportResponse.meta.generatedAt), "dd/MM/yyyy HH:mm", { locale: es })
    : format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });

  // Días ausentes por tipo (agregado desde el informe backend - typeCounts son días reales sin presencia)
  const byType = useMemo(() => {
    const emps = reportResponse?.employees || [];
    const typeAgg = {};
    for (const emp of emps) {
      if (!emp.typeCounts) continue;
      for (const [tipo, days] of Object.entries(emp.typeCounts)) {
        if (!typeAgg[tipo]) typeAgg[tipo] = { days: 0, employees: 0 };
        typeAgg[tipo].days += days;
        typeAgg[tipo].employees += 1;
      }
    }
    return Object.entries(typeAgg)
      .map(([tipo, data]) => ({ tipo, days: data.days, employees: data.employees }))
      .sort((a, b) => b.days - a.days);
  }, [reportResponse]);

  // Días ausentes por departamento (agregado desde el informe backend)
  const byDepartment = useMemo(() => {
    const emps = reportResponse?.employees || [];
    const deptAgg = {};
    for (const emp of emps) {
      const dept = emp.departamento || "Sin departamento";
      if (!deptAgg[dept]) deptAgg[dept] = { employees: 0, withAbsences: 0, daysPeriod: 0 };
      deptAgg[dept].employees += 1;
      deptAgg[dept].daysPeriod += emp.daysPeriod || 0;
      if ((emp.daysPeriod || 0) > 0) deptAgg[dept].withAbsences += 1;
    }
    return Object.entries(deptAgg)
      .map(([dept, data]) => ({ dept, ...data }))
      .sort((a, b) => b.daysPeriod - a.daysPeriod);
  }, [reportResponse]);

  // Resumen por empleado: calculado en backend con DailyPresence como fuente de verdad
  const employeeSummary = useMemo(() => {
    return reportResponse?.employees || [];
  }, [reportResponse]);

  const deptOptions = useMemo(() => {
    const s = new Set();
    employees.forEach(e => { if (e.departamento) s.add(e.departamento); });
    return Array.from(s).sort();
  }, [employees]);

  const typeOptions = useMemo(() => {
    const s = new Set();
    absences.forEach(a => { if (a.tipo) s.add(a.tipo); });
    return Array.from(s).sort();
  }, [absences]);

  // Cabecera de los Excel exportados: periodo analizado y fecha de análisis
  const exportHeader = (titulo) => [
    [titulo],
    [`Periodo analizado: ${periodLabel}`],
    [`Fecha de análisis: ${analysisDate}`],
  ];

  // Exportar a Excel
  const handleExportExcel = () => {
    if (filtered.length === 0) {
      toast.warning("No hay datos para exportar con los filtros actuales");
      return;
    }
    const rows = filtered.map(abs => {
      const emp = getEmp(abs.employee_id);
      const type = getType(abs);
      const start = new Date(abs.fecha_inicio);
      const end = abs.fecha_fin_desconocida ? null : (abs.fecha_fin ? new Date(abs.fecha_fin) : null);
      const days = end ? differenceInCalendarDays(end, start) + 1 : "Indefinida";
      const interval = getAbsenceInterval(abs);
      const workingDays = interval ? countWorkingDays([interval], abs.employee_id, holidaySet, globalVacationSet, employeeVacationMap) : 0;
      return {
        "Código Empleado": emp?.codigo_empleado || "",
        "Empleado": emp?.nombre || "Desconocido",
        "Departamento": emp?.departamento || "",
        "Puesto": emp?.puesto || "",
        "Tipo": abs.tipo || "",
        "Código Tipo": type?.codigo || "",
        "Motivo": abs.motivo || "",
        "Fecha Inicio": format(start, "dd/MM/yyyy HH:mm"),
        "Fecha Fin": end ? format(end, "dd/MM/yyyy HH:mm") : "Indefinida",
        "Días naturales": days,
        "Días laborables": workingDays,
        "Estado": abs.estado_aprobacion || "",
        "Remunerada": (type?.remunerada !== undefined ? type.remunerada : abs.remunerada) ? "Sí" : "No",
        "Origen": wasAutoDetected(abs) ? "Detección automática" : "Manual",
        "Solicitado por": abs.solicitado_por || "",
        "Aprobado por": abs.aprobado_por || "",
        "Notas": abs.notas || "",
      };
    });
    const period = `${appliedPeriod.from}_al_${appliedPeriod.to}`;
    exportToExcel(rows, `informe_ausencias_${period}`, "Ausencias", exportHeader("Informe de Ausencias · Detalle de Ausencias"));
    toast.success(`Exportados ${rows.length} registros a Excel`);
  };

  // Exportar resumen por empleado (incluye desglose por tipo como dato)
  const handleExportSummary = () => {
    if (employeeSummary.length === 0) {
      toast.warning("No hay datos para exportar");
      return;
    }
    // Mismas columnas y mismo orden que la tabla en pantalla
    const rows = employeeSummary.map(toSummaryExportRow);
    exportToExcel(rows, `resumen_ausencias_empleados_${appliedPeriod.from}_al_${appliedPeriod.to}`, "Resumen", exportHeader("Informe de Ausencias · Resumen por Empleado"));
    toast.success(`Exportados ${rows.length} empleados a Excel`);
  };

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            Filtros de Informe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Departamento</Label>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {deptOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {typeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Estado</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Pendiente">Pendientes</SelectItem>
                  <SelectItem value="Aprobada">Aprobadas</SelectItem>
                  <SelectItem value="Rechazada">Rechazadas</SelectItem>
                  <SelectItem value="Cancelada">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => {
              setDateFrom(format(subMonths(now, 12), "yyyy-MM-dd"));
              setDateTo(format(now, "yyyy-MM-dd"));
              setFilterDept("all"); setFilterType("all"); setFilterStatus("all");
            }} className="text-xs h-8">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Últimos 12 meses
            </Button>
            <Button size="sm" onClick={handleExportExcel} disabled={isLoading || filtered.length === 0} className="text-xs h-8 bg-green-600 hover:bg-green-700">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Exportar Excel
            </Button>
            <PayrollExportButton absences={filtered} employees={employees} />
          </div>
        </CardContent>
      </Card>

      {/* Toggle de vista */}
      <div className="flex gap-2">
        <Button size="sm" variant={viewMode === 'global' ? 'default' : 'outline'} onClick={() => setViewMode('global')} className="text-xs h-8">
          <Users className="w-3.5 h-3.5 mr-1" /> Informe Global
        </Button>
        <Button size="sm" variant={viewMode === 'individual' ? 'default' : 'outline'} onClick={() => setViewMode('individual')} className="text-xs h-8">
          <User className="w-3.5 h-3.5 mr-1" /> Informe Individual
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'achievers' ? 'default' : 'outline'}
          onClick={() => setViewMode('achievers')}
          className={`text-xs h-8 ${viewMode === 'achievers' ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'}`}
        >
          <Award className="w-3.5 h-3.5 mr-1" /> Sin ausencias 12m{globalStats.noAbsence12m > 0 ? ` (${globalStats.noAbsence12m})` : ''}
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'compliance' ? 'default' : 'outline'}
          onClick={() => setViewMode('compliance')}
          className={`text-xs h-8 ${viewMode === 'compliance' ? 'bg-amber-600 hover:bg-amber-700' : 'text-amber-700 border-amber-200 hover:bg-amber-50'}`}
        >
          <Clock className="w-3.5 h-3.5 mr-1" /> Cumplimiento horario
        </Button>
      </div>

      {viewMode === 'global' && (
      <>
      {/* Cabecera del informe: identificación + panel de KPIs del periodo */}
      <AbsenceReportHeader
        periodLabel={periodLabel}
        analysisDate={analysisDate}
        scopeLabel={filterDept === 'all' ? 'Todos los departamentos' : filterDept}
        stats={globalStats}
        loading={reportBusy}
        error={reportError}
        onRetry={refetchReport}
        onShowAchievers={() => setViewMode('achievers')}
      />
      <AbsenceComplianceSummary stats={globalStats} calendar={reportResponse?.meta} loading={reportBusy} />
      <p className="text-xs text-slate-400 px-1">
        Datos basados en fichajes reales (DailyPresence) y solo sobre días laborables del calendario laboral: se excluyen fines de semana, festivos y vacaciones, por lo que no se espera presencia en días no laborables. El periodo seleccionado rige el informe global, los indicadores y las exportaciones; el filtro de departamento aplica al informe global y los filtros de tipo y estado, al informe individual y a la exportación de detalle.
      </p>

      {/* Resumen por tipo y departamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Ausencias por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {reportBusy ? (
              <div className="flex items-center justify-center py-6">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            ) : byType.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">{emptyMessage}</p>
            ) : (
              <div className="space-y-1.5">
                {byType.map(t => (
                  <div key={t.tipo} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-slate-600 truncate flex-1">{t.tipo}</span>
                    <span className="text-slate-400 text-[10px] whitespace-nowrap">{t.employees} emps.</span>
                    <Badge className="bg-blue-100 text-blue-700 whitespace-nowrap">{t.days} días</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Ausencias por Departamento</CardTitle>
          </CardHeader>
          <CardContent>
            {reportBusy ? (
              <div className="flex items-center justify-center py-6">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            ) : byDepartment.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">{emptyMessage}</p>
            ) : (
              <div className="space-y-1.5">
                {byDepartment.map(d => (
                  <div key={d.dept} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 truncate flex-1">{d.dept}</span>
                    <span className="text-slate-400 text-[10px] whitespace-nowrap mr-2">{d.withAbsences}/{d.employees}</span>
                    <Badge className="bg-blue-100 text-blue-700">{d.daysPeriod} días</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detalle por empleado */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              Resumen por Empleado ({employeeSummary.length})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={handleExportSummary} disabled={employeeSummary.length === 0} className="text-xs h-7">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Exportar resumen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {reportBusy ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : employeeSummary.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">{emptyMessage}</p>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                  <TableRow>
                    {SUMMARY_VISIBLE_COLUMNS.map(c => (
                      <TableHead key={c.label} className={c.headClassName} title={c.title}>{c.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeSummary.map(e => (
                    <TableRow key={e.empId} className={e.hasMaternity ? "bg-pink-50 dark:bg-pink-950/30" : e.hasMarriage ? "bg-purple-50 dark:bg-purple-950/30" : ""}>
                      {SUMMARY_VISIBLE_COLUMNS.map(c => (
                        <TableCell key={c.label} className={c.cellClassName}>
                          {c.render ? c.render(e) : c.get(e)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </>
      )}

      {viewMode === 'achievers' && (
        <NoAbsenceAchievers employees={employeeSummary} loading={reportBusy} />
      )}

      {viewMode === 'individual' && (
        <IndividualAbsenceReport
          employees={employees}
          filteredAbsences={filtered}
          absenceTypes={absenceTypes}
          holidaySet={holidaySet}
          globalVacationSet={globalVacationSet}
          employeeVacationMap={employeeVacationMap}
          rangeBounds={rangeBounds}
          dateFrom={appliedPeriod.from}
          dateTo={appliedPeriod.to}
        />
      )}

      {viewMode === 'compliance' && (
        <WorkdayComplianceReport
          dateFrom={appliedPeriod.from}
          dateTo={appliedPeriod.to}
          periodLabel={periodLabel}
          employees={employeeSummary}
          department={filterDept}
          holidaySet={holidaySet}
          globalVacationSet={globalVacationSet}
          employeeVacationMap={employeeVacationMap}
          loading={reportBusy}
        />
      )}
    </div>
  );
}