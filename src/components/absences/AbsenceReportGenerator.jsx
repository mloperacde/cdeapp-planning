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
  Users, Clock, TrendingDown, CheckCircle2, XCircle, AlertCircle, Bot,
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

  // Límites del rango seleccionado
  const rangeBounds = useMemo(() => ({
    start: parseISO(dateFrom + "T00:00:00"),
    end: parseISO(dateTo + "T23:59:59"),
  }), [dateFrom, dateTo]);

  // Intervalo de una ausencia recortado al rango del informe (null si fuera de rango)
  const getAbsenceInterval = (abs) => {
    if (!abs.fecha_inicio) return null;
    const absStart = new Date(abs.fecha_inicio);
    const absEnd = (abs.fecha_fin_desconocida || !abs.fecha_fin) ? rangeBounds.end : new Date(abs.fecha_fin);
    const start = absStart < rangeBounds.start ? rangeBounds.start : absStart;
    const end = absEnd > rangeBounds.end ? rangeBounds.end : absEnd;
    if (end < start) return null;
    return [start, end];
  };

  // Fusiona intervalos solapados y cuenta días naturales únicos (sin duplicar)
  const countUniqueDays = (intervals) => {
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
    return merged.reduce((sum, [s, e]) => sum + differenceInCalendarDays(e, s) + 1, 0);
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
      daysLost += countUniqueDays(intervalsByEmp[key]);
    }

    const remunerated = filtered.filter(a => {
      if (a.estado_aprobacion === 'Cancelada' || a.estado_aprobacion === 'Rechazada') return false;
      const type = getType(a);
      return type?.remunerada === true || a.remunerada === true;
    }).length;

    return { total, approved, pending, rejected, cancelled, autoPending, daysLost, remunerated };
  }, [filtered, absenceTypes, rangeBounds]);

  // Agrupaciones para gráficos/tablas
  const byType = useMemo(() => {
    const map = {};
    for (const abs of filtered) {
      if (abs.estado_aprobacion === 'Cancelada' || abs.estado_aprobacion === 'Rechazada') continue;
      const tipo = abs.tipo || "Sin especificar";
      map[tipo] = (map[tipo] || 0) + 1;
    }
    return Object.entries(map).map(([tipo, count]) => ({ tipo, count })).sort((a, b) => b.count - a.count);
  }, [filtered]);

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

  const byEmployee = useMemo(() => {
    const map = {};
    const intervalsByName = {};
    for (const abs of filtered) {
      if (abs.estado_aprobacion === 'Cancelada' || abs.estado_aprobacion === 'Rechazada') continue;
      const emp = getEmp(abs.employee_id);
      const name = emp?.nombre || "Desconocido";
      if (!map[name]) map[name] = { count: 0, days: 0, auto: 0 };
      map[name].count++;
      if (wasAutoDetected(abs)) map[name].auto++;
      const interval = getAbsenceInterval(abs);
      if (interval) {
        if (!intervalsByName[name]) intervalsByName[name] = [];
        intervalsByName[name].push(interval);
      }
    }
    for (const name of Object.keys(map)) {
      map[name].days = countUniqueDays(intervalsByName[name] || []);
    }
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.days - a.days);
  }, [filtered, employees, rangeBounds]);

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
        "Días": days,
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

  const kpis = [
    { label: "Total ausencias", value: stats.total, icon: CalendarDays, color: "text-slate-700", bg: "bg-slate-50" },
    { label: "Aprobadas", value: stats.approved, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
    { label: "Pendientes", value: stats.pending, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Rechazadas", value: stats.rejected, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Días de ausencia", value: stats.daysLost, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
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
                  <div key={t.tipo} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 truncate flex-1">{t.tipo}</span>
                    <Badge className="bg-blue-100 text-blue-700 ml-2">{t.count}</Badge>
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
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            Resumen por Empleado ({byEmployee.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {byEmployee.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Sin datos</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Empleado</TableHead>
                  <TableHead className="text-xs">Departamento</TableHead>
                  <TableHead className="text-xs text-center">Ausencias</TableHead>
                  <TableHead className="text-xs text-center">Días (rango)</TableHead>
                  <TableHead className="text-xs text-center">Auto-det.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byEmployee.slice(0, 20).map(e => {
                  const emp = employees.find(x => x.nombre === e.name);
                  return (
                    <TableRow key={e.name}>
                      <TableCell className="text-xs font-medium">{e.name}</TableCell>
                      <TableCell className="text-xs">{emp?.departamento || "—"}</TableCell>
                      <TableCell className="text-xs text-center">{e.count}</TableCell>
                      <TableCell className="text-xs text-center font-semibold">{e.days}</TableCell>
                      <TableCell className="text-xs text-center">
                        {e.auto > 0 ? <Badge className="bg-amber-100 text-amber-700 text-[10px]">{e.auto}</Badge> : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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