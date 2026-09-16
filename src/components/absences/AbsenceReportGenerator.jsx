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
  Users, User, Clock, TrendingDown, CheckCircle2, XCircle, AlertCircle, Bot, Baby, HeartHandshake,
} from "lucide-react";
import { format, differenceInCalendarDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { exportToExcel } from "@/utils/lockerExport";
import { isAutoAbsence, wasAutoDetected, clipInterval, countWorkingDays } from "@/utils/absenceUtils";
import PayrollExportButton from "./PayrollExportButton";
import IndividualAbsenceReport from "./IndividualAbsenceReport";

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
  const [viewMode, setViewMode] = useState('global');

  const { data: absences = [], isLoading } = useQuery({
    queryKey: ['absences-report'],
    queryFn: () => base44.entities.Absence.list('-fecha_inicio', 5000),
    staleTime: 0,
  });

  // Informe de ausencias calculado en backend (usa DailyPresence como fuente de verdad)
  const { data: reportResponse, isLoading: reportLoading } = useQuery({
    queryKey: ['absenceReport', filterDept],
    queryFn: async () => {
      const resp = await base44.functions.invoke('getAbsenceReport', {
        department: filterDept === 'all' ? null : filterDept,
      });
      return resp.data;
    },
    staleTime: 60 * 1000,
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

  // Intervalo de una ausencia recortado al rango del informe (null si fuera de rango)
  const getAbsenceInterval = (abs) => clipInterval(abs, rangeBounds.start, rangeBounds.end);

  // KPIs agregados desde el informe backend (DailyPresence como fuente de verdad)
  const globalStats = useMemo(() => {
    const emps = reportResponse?.employees || [];
    const total = emps.length;
    const withAbsences12m = emps.filter(e => e.days12 > 0).length;
    const totalDays12 = emps.reduce((sum, e) => sum + (e.days12 || 0), 0);
    const totalDaysMonth = emps.reduce((sum, e) => sum + (e.daysMonth || 0), 0);
    const absentToday = emps.filter(e => e.estado === 'Ausente').length;
    const maternityCount = emps.filter(e => e.hasMaternity).length;
    return { total, withAbsences12m, totalDays12, totalDaysMonth, absentToday, maternityCount };
  }, [reportResponse]);

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
      if (!deptAgg[dept]) deptAgg[dept] = { employees: 0, withAbsences: 0, days12: 0 };
      deptAgg[dept].employees += 1;
      deptAgg[dept].days12 += emp.days12 || 0;
      if (emp.days12 > 0) deptAgg[dept].withAbsences += 1;
    }
    return Object.entries(deptAgg)
      .map(([dept, data]) => ({ dept, ...data }))
      .sort((a, b) => b.days12 - a.days12);
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
      "Antigüedad": e.antiguedad,
      "Estado empleado": e.estado_empleado,
      "Días ausente 12m": e.days12,
      "Episodios 12m": e.episodes12 || 0,
      "Episodio más largo 12m": e.longest12 || 0,
      "Días ausencia mes en curso": e.daysMonth,
      "Episodios mes en curso": e.episodesMonth || 0,
      "Maternidad": e.hasMaternity ? "Sí" : "No",
      "Matrimonio": e.hasMarriage ? "Sí" : "No",
      "Estado actual": e.estado,
      "Desglose por tipos (12m)": Object.entries(e.typeCounts).map(([t, c]) => `${t}: ${c}`).join("; "),
    }));
    exportToExcel(rows, "resumen_ausencias_empleados", "Resumen");
    toast.success(`Exportados ${rows.length} empleados a Excel`);
  };

  const kpis = [
    { label: "Empleados evaluados", value: globalStats.total, icon: Users, color: "text-slate-700", bg: "bg-slate-50" },
    { label: "Con ausencias 12m", value: globalStats.withAbsences12m, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Días ausentes 12m", value: globalStats.totalDays12, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Días mes en curso", value: globalStats.totalDaysMonth, icon: CalendarDays, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Ausentes hoy", value: globalStats.absentToday, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Maternidad/Patern.", value: globalStats.maternityCount, icon: Baby, color: "text-pink-600", bg: "bg-pink-50" },
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

      {/* Toggle de vista */}
      <div className="flex gap-2">
        <Button size="sm" variant={viewMode === 'global' ? 'default' : 'outline'} onClick={() => setViewMode('global')} className="text-xs h-8">
          <Users className="w-3.5 h-3.5 mr-1" /> Informe Global
        </Button>
        <Button size="sm" variant={viewMode === 'individual' ? 'default' : 'outline'} onClick={() => setViewMode('individual')} className="text-xs h-8">
          <User className="w-3.5 h-3.5 mr-1" /> Informe Individual
        </Button>
      </div>

      {viewMode === 'global' && (
      <>
      <p className="text-xs text-slate-400 px-1">
        Datos basados en fichajes reales (DailyPresence) — últimos 12 meses y mes en curso. El filtro de departamento aplica al informe global; los filtros de fecha/tipo/estado aplican al informe individual y a las exportaciones.
      </p>
      {/* KPIs */}
      {reportLoading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : (
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
      )}

      {/* Resumen por tipo y departamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Ausencias por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {reportLoading ? (
              <div className="flex items-center justify-center py-6">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            ) : byType.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Sin datos</p>
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
            {reportLoading ? (
              <div className="flex items-center justify-center py-6">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            ) : byDepartment.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Sin datos</p>
            ) : (
              <div className="space-y-1.5">
                {byDepartment.map(d => (
                  <div key={d.dept} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 truncate flex-1">{d.dept}</span>
                    <span className="text-slate-400 text-[10px] whitespace-nowrap mr-2">{d.withAbsences}/{d.employees}</span>
                    <Badge className="bg-blue-100 text-blue-700">{d.days12} días</Badge>
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
          {reportLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : employeeSummary.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Sin datos</p>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                  <TableRow>
                    <TableHead className="text-xs">Empleado</TableHead>
                    <TableHead className="text-xs">Departamento</TableHead>
                    <TableHead className="text-xs">Puesto</TableHead>
                    <TableHead className="text-xs text-center">Antig.</TableHead>
                    <TableHead className="text-xs text-center">Est. emp.</TableHead>
                    <TableHead className="text-xs text-center">Días ausente 12m</TableHead>
                    <TableHead className="text-xs text-center">Episodios 12m</TableHead>
                    <TableHead className="text-xs text-center">Ep. más largo 12m</TableHead>
                    <TableHead className="text-xs text-center">Días mes</TableHead>
                    <TableHead className="text-xs text-center">Ep. mes</TableHead>
                    <TableHead className="text-xs text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeSummary.map(e => (
                    <TableRow key={e.empId} className={e.hasMaternity ? "bg-pink-50 dark:bg-pink-950/30" : e.hasMarriage ? "bg-purple-50 dark:bg-purple-950/30" : ""}>
                      <TableCell className="text-xs font-medium">
                        <div className="flex items-center gap-1">
                          {e.hasMaternity && <Baby className="w-3 h-3 text-pink-500 flex-shrink-0" />}
                          {e.hasMarriage && <HeartHandshake className="w-3 h-3 text-purple-500 flex-shrink-0" />}
                          {e.nombre}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{e.departamento}</TableCell>
                      <TableCell className="text-xs">{e.puesto}</TableCell>
                      <TableCell className="text-xs text-center text-slate-500">{e.antiguedad}</TableCell>
                      <TableCell className="text-xs text-center">
                        <Badge className={e.estado_empleado === "Alta" ? "bg-green-100 text-green-700 text-[10px]" : e.estado_empleado === "Baja" ? "bg-red-100 text-red-700 text-[10px]" : "bg-amber-100 text-amber-700 text-[10px]"}>
                          {e.estado_empleado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-center font-semibold">{e.days12}</TableCell>
                      <TableCell className="text-xs text-center">{e.episodes12 || 0}</TableCell>
                      <TableCell className="text-xs text-center text-slate-600">{e.longest12 || 0}</TableCell>
                      <TableCell className="text-xs text-center font-semibold">{e.daysMonth}</TableCell>
                      <TableCell className="text-xs text-center">{e.episodesMonth || 0}</TableCell>
                      <TableCell className="text-xs text-center">
                        <Badge className={e.estado === "Ausente" ? "bg-red-100 text-red-700 text-[10px]" : "bg-green-100 text-green-700 text-[10px]"}>
                          {e.estado}
                        </Badge>
                      </TableCell>
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

      {viewMode === 'individual' && (
        <IndividualAbsenceReport
          employees={employees}
          filteredAbsences={filtered}
          absenceTypes={absenceTypes}
          holidaySet={holidaySet}
          globalVacationSet={globalVacationSet}
          employeeVacationMap={employeeVacationMap}
          rangeBounds={rangeBounds}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      )}
    </div>
  );
}