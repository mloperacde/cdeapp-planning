import React, { useState, useMemo } from "react";
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
  Users, Clock, TrendingDown, CheckCircle2, XCircle, AlertCircle, Bot, AlertTriangle,
} from "lucide-react";
import { format, differenceInCalendarDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { exportToExcel } from "@/utils/lockerExport";
import { isAutoAbsence, wasAutoDetected } from "@/utils/absenceUtils";
import PayrollExportButton from "./PayrollExportButton";

const STATUS_CONFIG = {
  Pendiente:  { color: "bg-amber-100 text-amber-800", icon: AlertCircle },
  Aprobada:   { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  Rechazada:  { color: "bg-red-100 text-red-800", icon: XCircle },
  Cancelada:  { color: "bg-slate-100 text-slate-500", icon: XCircle },
};

export default function AbsenceReportGenerator({ employees: propEmployees, absenceTypes: propTypes }) {
  const now = new Date();
  const firstDay = startOfMonth(now);
  const lastDay = endOfMonth(now);

  const [dateFrom, setDateFrom] = useState(format(firstDay, "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(lastDay, "yyyy-MM-dd"));
  const [filterDept, setFilterDept] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: absences = [], isLoading } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-fecha_inicio', 2000),
    staleTime: 0,
  });

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
    const from = parseISO(dateFrom + "T00:00:00");
    const to = parseISO(dateTo + "T23:59:59");
    return absences.filter(abs => {
      if (!abs.fecha_inicio) return false;
      const start = new Date(abs.fecha_inicio);
      return start >= from && start <= to;
    });
  }, [absences, dateFrom, dateTo]);

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
    const rawEnd = parseISO(dateTo + "T23:59:59");
    return {
      start: parseISO(dateFrom + "T00:00:00"),
      end: rawEnd > endOfToday ? endOfToday : rawEnd,
    };
  }, [dateFrom, dateTo]);

  // Recorta una ausencia a una ventana de fechas (null si fuera de rango)
  const clipInterval = (abs, winStart, winEnd) => {
    if (!abs.fecha_inicio) return null;
    const absStart = new Date(abs.fecha_inicio);
    const absEnd = (abs.fecha_fin_desconocida || !abs.fecha_fin) ? winEnd : new Date(abs.fecha_fin);
    const start = absStart < winStart ? winStart : absStart;
    const end = absEnd > winEnd ? winEnd : absEnd;
    if (end < start) return null;
    return [start, end];
  };
  // Intervalo de una ausencia recortado al rango del informe (null si fuera de rango)
  const getAbsenceInterval = (abs) => clipInterval(abs, rangeBounds.start, rangeBounds.end);

  // Fusiona intervalos solapados y cuenta días LABORABLES únicos (L-V, excluyendo festivos y vacaciones)
  const countWorkingDays = (intervals, employeeId) => {
    if (!intervals || intervals.length === 0) return 0;
    const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
    const merged = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1];
      if (sorted[i][0] <= last[1]) {
        last[1] = last[1] > sorted[i][1] ? last[1] : sorted[i][1];
      } else {
        merged.push(sorted[i]);
      }
    }
    const empVac = employeeId ? employeeVacationMap[String(employeeId)] : null;
    let count = 0;
    for (const [s, e] of merged) {
      const cur = new Date(s);
      cur.setHours(0, 0, 0, 0);
      const endDay = new Date(e);
      endDay.setHours(0, 0, 0, 0);
      while (cur <= endDay) {
        const dow = cur.getDay();
        const dateStr = format(cur, "yyyy-MM-dd");
        if (dow >= 1 && dow <= 5 && !holidaySet.has(dateStr) && !globalVacationSet.has(dateStr) && !(empVac && empVac.has(dateStr))) {
          count++;
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    return count;
  };

  // KPIs
  const stats = useMemo(() => {
    const total = filtered.length;
    const approved = filtered.filter(a => a.estado_aprobacion === 'Aprobada').length;
    const pending = filtered.filter(a => a.estado_aprobacion === 'Pendiente').length;
    const rejected = filtered.filter(a => a.estado_aprobacion === 'Rechazada').length;
    const cancelled = filtered.filter(a => a.estado_aprobacion === 'Cancelada').length;
    const autoPending = filtered.filter(a => isAutoAbsence(a)).length;

    // Días perdidos: suma de días únicos por empleado (sin duplicar solapamientos ni exceder el rango)
    const intervalsByEmp = {};
    for (const abs of filtered) {
      if (abs.estado_aprobacion === 'Cancelada' || abs.estado_aprobacion === 'Rechazada') continue;
      const interval = getAbsenceInterval(abs);
      if (!interval) continue;
      const key = abs.employee_id || 'unknown';
      if (!intervalsByEmp[key]) intervalsByEmp[key] = [];
      intervalsByEmp[key].push(interval);
    }
    let daysLost = 0;
    for (const key of Object.keys(intervalsByEmp)) {
      daysLost += countWorkingDays(intervalsByEmp[key], key);
    }

    const remunerated = filtered.filter(a => {
      if (a.estado_aprobacion === 'Cancelada' || a.estado_aprobacion === 'Rechazada') return false;
      const type = getType(a);
      return type?.remunerada === true || a.remunerada === true;
    }).length;

    return { total, approved, pending, rejected, cancelled, autoPending, daysLost, remunerated };
  }, [filtered, absenceTypes, rangeBounds, holidaySet, globalVacationSet, employeeVacationMap]);

  // Agrupaciones para gráficos/tablas
  // Días laborables por tipo (agrupando por empleado para aplicar vacaciones individuales)
  const byType = useMemo(() => {
    const intervalsByEmpType = {};
    const countByType = {};
    for (const abs of filtered) {
      if (abs.estado_aprobacion === 'Cancelada' || abs.estado_aprobacion === 'Rechazada') continue;
      const tipo = abs.tipo || "Sin especificar";
      countByType[tipo] = (countByType[tipo] || 0) + 1;
      const interval = getAbsenceInterval(abs);
      if (!interval) continue;
      const key = `${abs.employee_id || 'unknown'}||${tipo}`;
      if (!intervalsByEmpType[key]) intervalsByEmpType[key] = [];
      intervalsByEmpType[key].push(interval);
    }
    const daysByType = {};
    for (const key of Object.keys(intervalsByEmpType)) {
      const [empId, tipo] = key.split('||');
      daysByType[tipo] = (daysByType[tipo] || 0) + countWorkingDays(intervalsByEmpType[key], empId);
    }
    return Object.keys(countByType).map(tipo => ({
      tipo, count: countByType[tipo], days: daysByType[tipo] || 0,
    })).sort((a, b) => b.days - a.days);
  }, [filtered, rangeBounds, holidaySet, globalVacationSet, employeeVacationMap]);

  const byDepartment = useMemo(() => {
    const map = {};
    for (const abs of filtered) {
      if (abs.estado_aprobacion === 'Cancelada' || abs.estado_aprobacion === 'Rechazada') continue;
      const emp = getEmp(abs.employee_id);
      const dept = emp?.departamento || "Sin departamento";
      map[dept] = (map[dept] || 0) + 1;
    }
    return Object.entries(map).map(([dept, count]) => ({ dept, count })).sort((a, b) => b.count - a.count);
  }, [filtered, employees]);

  // Resumen por empleado: últimos 12 meses + mes en curso + estado actual + conteo por tipo (dato)
  const employeeSummary = useMemo(() => {
    const now = new Date();
    const win12Start = new Date(now); win12Start.setFullYear(win12Start.getFullYear() - 1); win12Start.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const winEnd = new Date(now); winEnd.setHours(23, 59, 59, 999);
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    // Agrupar ausencias por empleado
    const absByEmp = {};
    absences.forEach(a => {
      const k = String(a.employee_id);
      if (!absByEmp[k]) absByEmp[k] = [];
      absByEmp[k].push(a);
    });

    return employees.map(emp => {
      const empId = String(emp.id);
      // Ausencias formales activas (entidad Absence)
      const formalAbsences = (absByEmp[empId] || []).filter(a => a.estado_aprobacion !== 'Cancelada' && a.estado_aprobacion !== 'Rechazada');
      // Ausencia sintética desde la ficha si está marcada Ausente y no hay registro formal que la cubra
      const allAbsences = [...formalAbsences];
      if (emp.disponibilidad === "Ausente" && emp.ausencia_inicio) {
        const synStart = new Date(emp.ausencia_inicio);
        const synEnd = emp.ausencia_fin ? new Date(emp.ausencia_fin) : winEnd;
        const covered = formalAbsences.some(a => clipInterval(a, synStart, synEnd) !== null);
        if (!covered) {
          allAbsences.push({
            fecha_inicio: emp.ausencia_inicio,
            fecha_fin: emp.ausencia_fin || null,
            fecha_fin_desconocida: !emp.ausencia_fin,
            tipo: emp.ausencia_motivo || "Ausencia (sin registro formal)",
          });
        }
      }
      // Últimos 12 meses
      const active12 = allAbsences.filter(a => clipInterval(a, win12Start, winEnd) !== null);
      const intervals12 = active12.map(a => clipInterval(a, win12Start, winEnd)).filter(Boolean);
      const days12 = countWorkingDays(intervals12, empId);
      const typeCounts = {};
      active12.forEach(a => {
        const t = a.tipo || "Sin especificar";
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      });
      // Mes en curso
      const activeMonth = allAbsences.filter(a => clipInterval(a, monthStart, winEnd) !== null);
      const intervalsMonth = activeMonth.map(a => clipInterval(a, monthStart, winEnd)).filter(Boolean);
      const daysMonth = countWorkingDays(intervalsMonth, empId);
      // Estado actual: ausencia activa hoy (formal o sintética de la ficha)
      const isAbsentToday = allAbsences.some(a => clipInterval(a, todayStart, todayEnd) !== null);
      return {
        empId,
        nombre: emp.nombre || "Desconocido",
        departamento: emp.departamento || "—",
        puesto: emp.puesto || "—",
        count12: active12.length,
        days12,
        countMonth: activeMonth.length,
        daysMonth,
        estado: isAbsentToday ? "Ausente" : "Disponible",
        estadoMaster: emp.disponibilidad || "—",
        typeCounts,
      };
    })
      .filter(e => filterDept === "all" || e.departamento === filterDept)
      .sort((a, b) => b.days12 - a.days12);
  }, [employees, absences, filterDept, holidaySet, globalVacationSet, employeeVacationMap]);

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
      const workingDays = interval ? countWorkingDays([interval], abs.employee_id) : 0;
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
    const period = `${dateFrom}_al_${dateTo}`;
    exportToExcel(rows, `informe_ausencias_${period}`, "Ausencias");
    toast.success(`Exportados ${rows.length} registros a Excel`);
  };

  // Exportar resumen por empleado (incluye desglose por tipo como dato)
  const handleExportSummary = () => {
    if (employeeSummary.length === 0) {
      toast.warning("No hay datos para exportar");
      return;
    }
    const rows = employeeSummary.map(e => ({
      "Empleado": e.nombre,
      "Departamento": e.departamento,
      "Puesto": e.puesto,
      "Nº ausencias últimos 12 meses": e.count12,
      "Días ausente últimos 12 meses": e.days12,
      "Nº ausencias mes en curso": e.countMonth,
      "Días ausencia mes en curso": e.daysMonth,
      "Estado actual": e.estado,
      "Estado según ficha": e.estadoMaster,
      "Desglose por tipos (12m)": Object.entries(e.typeCounts).map(([t, c]) => `${t}: ${c}`).join("; "),
    }));
    exportToExcel(rows, "resumen_ausencias_empleados", "Resumen");
    toast.success(`Exportados ${rows.length} empleados a Excel`);
  };

  const kpis = [
    { label: "Total ausencias", value: stats.total, icon: CalendarDays, color: "text-slate-700", bg: "bg-slate-50" },
    { label: "Aprobadas", value: stats.approved, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
    { label: "Pendientes", value: stats.pending, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Rechazadas", value: stats.rejected, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Días laborables", value: stats.daysLost, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Remuneradas", value: stats.remunerated, icon: TrendingDown, color: "text-purple-600", bg: "bg-purple-50" },
  ];

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
              setDateFrom(format(startOfMonth(now), "yyyy-MM-dd"));
              setDateTo(format(endOfMonth(now), "yyyy-MM-dd"));
              setFilterDept("all"); setFilterType("all"); setFilterStatus("all");
            }} className="text-xs h-8">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Restablecer
            </Button>
            <Button size="sm" onClick={handleExportExcel} disabled={isLoading || filtered.length === 0} className="text-xs h-8 bg-green-600 hover:bg-green-700">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Exportar Excel
            </Button>
            <PayrollExportButton absences={filtered} employees={employees} />
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(k => (
          <Card key={k.label} className={`${k.bg} border-0`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-500">{k.label}</p>
                  <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                </div>
                <k.icon className={`w-5 h-5 ${k.color} opacity-40`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumen por tipo y departamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Ausencias por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {byType.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Sin datos</p>
            ) : (
              <div className="space-y-1.5">
                {byType.map(t => (
                  <div key={t.tipo} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-slate-600 truncate flex-1">{t.tipo}</span>
                    <span className="text-slate-400 text-[10px] whitespace-nowrap">{t.count} regs.</span>
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
            {byDepartment.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Sin datos</p>
            ) : (
              <div className="space-y-1.5">
                {byDepartment.map(d => (
                  <div key={d.dept} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 truncate flex-1">{d.dept}</span>
                    <Badge className="bg-green-100 text-green-700 ml-2">{d.count}</Badge>
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
          {employeeSummary.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Sin datos</p>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                  <TableRow>
                    <TableHead className="text-xs">Empleado</TableHead>
                    <TableHead className="text-xs">Departamento</TableHead>
                    <TableHead className="text-xs">Puesto</TableHead>
                    <TableHead className="text-xs text-center">Ausencias 12m</TableHead>
                    <TableHead className="text-xs text-center">Días ausente 12m</TableHead>
                    <TableHead className="text-xs text-center">Ausencias mes</TableHead>
                    <TableHead className="text-xs text-center">Días mes</TableHead>
                    <TableHead className="text-xs text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeSummary.map(e => (
                    <TableRow key={e.empId}>
                      <TableCell className="text-xs font-medium">{e.nombre}</TableCell>
                      <TableCell className="text-xs">{e.departamento}</TableCell>
                      <TableCell className="text-xs">{e.puesto}</TableCell>
                      <TableCell className="text-xs text-center">{e.count12}</TableCell>
                      <TableCell className="text-xs text-center font-semibold">{e.days12}</TableCell>
                      <TableCell className="text-xs text-center">{e.countMonth}</TableCell>
                      <TableCell className="text-xs text-center font-semibold">{e.daysMonth}</TableCell>
                      <TableCell className="text-xs text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Badge className={e.estado === "Ausente" ? "bg-red-100 text-red-700 text-[10px]" : "bg-green-100 text-green-700 text-[10px]"}>
                            {e.estado}
                          </Badge>
                          {e.estadoMaster === "Ausente" && e.estado === "Disponible" && (
                            <span title={`Ficha dice: ${e.estadoMaster} (posible desactualización)`}>
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla detallada */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Detalle de Ausencias ({filtered.length})</CardTitle>
            <Button size="sm" variant="ghost" onClick={handleExportExcel} disabled={filtered.length === 0} className="text-xs h-7">
              <Download className="w-3.5 h-3.5 mr-1" /> Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No hay ausencias con los filtros seleccionados</p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white dark:bg-slate-800">
                  <TableRow>
                    <TableHead className="text-xs">Empleado</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Inicio</TableHead>
                    <TableHead className="text-xs">Fin</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs text-center">Origen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(abs => {
                    const emp = getEmp(abs.employee_id);
                    const cfg = STATUS_CONFIG[abs.estado_aprobacion] || STATUS_CONFIG.Pendiente;
                    const auto = wasAutoDetected(abs);
                    return (
                      <TableRow key={abs.id}>
                        <TableCell className="text-xs font-medium">
                          <div className="flex items-center gap-1">
                            {auto && <Bot className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                            {emp?.nombre || "Desconocido"}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{abs.tipo || "—"}</TableCell>
                        <TableCell className="text-xs">{format(new Date(abs.fecha_inicio), "dd/MM/yy", { locale: es })}</TableCell>
                        <TableCell className="text-xs">
                          {abs.fecha_fin_desconocida ? "Indef." : format(new Date(abs.fecha_fin), "dd/MM/yy", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${cfg.color} text-[10px]`}>{abs.estado_aprobacion}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          {auto ? <span className="text-amber-600">Auto</span> : <span className="text-slate-400">Manual</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}