import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FileSpreadsheet, Baby, HeartHandshake, Bot, CalendarDays, Clock,
  CheckCircle2, AlertCircle, XCircle, TrendingDown, User,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { exportToExcel } from "@/utils/lockerExport";
import { wasAutoDetected, clipInterval, countWorkingDays } from "@/utils/absenceUtils";

const STATUS_CONFIG = {
  Pendiente: { color: "bg-amber-100 text-amber-800" },
  Aprobada: { color: "bg-green-100 text-green-800" },
  Rechazada: { color: "bg-red-100 text-red-800" },
  Cancelada: { color: "bg-slate-100 text-slate-500" },
};

export default function IndividualAbsenceReport({
  employees,
  filteredAbsences,
  absenceTypes,
  holidaySet,
  globalVacationSet,
  employeeVacationMap,
  rangeBounds,
  dateFrom,
  dateTo,
}) {
  const [selectedEmpId, setSelectedEmpId] = useState("");

  const employeesWithAbsences = useMemo(() => {
    const ids = new Set(filteredAbsences.map(a => a.employee_id).filter(Boolean));
    return employees
      .filter(e => ids.has(String(e.id)))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [filteredAbsences, employees]);

  const effectiveEmpId = selectedEmpId || (employeesWithAbsences.length > 0 ? String(employeesWithAbsences[0].id) : "");
  const selectedEmployee = employees.find(e => String(e.id) === effectiveEmpId);

  const empAbsences = useMemo(() => {
    if (!effectiveEmpId) return [];
    return filteredAbsences.filter(a => String(a.employee_id) === effectiveEmpId);
  }, [filteredAbsences, effectiveEmpId]);

  const empStats = useMemo(() => {
    const total = empAbsences.length;
    const approved = empAbsences.filter(a => a.estado_aprobacion === 'Aprobada').length;
    const pending = empAbsences.filter(a => a.estado_aprobacion === 'Pendiente').length;
    const rejected = empAbsences.filter(a => a.estado_aprobacion === 'Rechazada').length;

    const intervals = [];
    for (const abs of empAbsences) {
      if (abs.estado_aprobacion === 'Cancelada' || abs.estado_aprobacion === 'Rechazada') continue;
      const interval = clipInterval(abs, rangeBounds.start, rangeBounds.end);
      if (interval) intervals.push(interval);
    }
    const daysLost = countWorkingDays(intervals, effectiveEmpId, holidaySet, globalVacationSet, employeeVacationMap);

    const remunerated = empAbsences.filter(a => {
      if (a.estado_aprobacion === 'Cancelada' || a.estado_aprobacion === 'Rechazada') return false;
      const type = absenceTypes.find(t => t.id === a.absence_type_id);
      return type?.remunerada === true || a.remunerada === true;
    }).length;

    return { total, approved, pending, rejected, daysLost, remunerated };
  }, [empAbsences, absenceTypes, rangeBounds, holidaySet, globalVacationSet, employeeVacationMap, effectiveEmpId]);

  const hasMaternity = empAbsences.some(a => {
    const t = (a.tipo || '').toLowerCase();
    return t.includes('maternidad') || t.includes('paternidad') || t.includes('riesgo durante') || t.includes('lactancia') || t.includes('nacimiento');
  });
  const hasMarriage = empAbsences.some(a => {
    const t = (a.tipo || '').toLowerCase();
    return t.includes('matrimonio') || t.includes('boda');
  });

  const handleExport = () => {
    if (empAbsences.length === 0) {
      toast.warning("No hay ausencias para este empleado en el periodo seleccionado");
      return;
    }
    const rows = empAbsences.map(abs => {
      const type = absenceTypes.find(t => t.id === abs.absence_type_id);
      const start = new Date(abs.fecha_inicio);
      const end = abs.fecha_fin_desconocida ? null : (abs.fecha_fin ? new Date(abs.fecha_fin) : null);
      const interval = clipInterval(abs, rangeBounds.start, rangeBounds.end);
      const workingDays = interval ? countWorkingDays([interval], effectiveEmpId, holidaySet, globalVacationSet, employeeVacationMap) : 0;
      return {
        "Empleado": selectedEmployee?.nombre || "",
        "Código": selectedEmployee?.codigo_empleado || "",
        "Departamento": selectedEmployee?.departamento || "",
        "Tipo": abs.tipo || "",
        "Motivo": abs.motivo || "",
        "Fecha Inicio": format(start, "dd/MM/yyyy"),
        "Fecha Fin": end ? format(end, "dd/MM/yyyy") : "Indefinida",
        "Días laborables": workingDays,
        "Estado": abs.estado_aprobacion || "",
        "Remunerada": (type?.remunerada !== undefined ? type.remunerada : abs.remunerada) ? "Sí" : "No",
        "Origen": wasAutoDetected(abs) ? "Detección automática" : "Manual",
        "Notas": abs.notas || "",
      };
    });
    const period = `${dateFrom}_al_${dateTo}`;
    exportToExcel(rows, `ausencias_${selectedEmployee?.codigo_empleado || 'empleado'}_${period}`, "Ausencias");
    toast.success(`Exportadas ${rows.length} ausencias a Excel`);
  };

  const kpis = [
    { label: "Total ausencias", value: empStats.total, icon: CalendarDays, color: "text-slate-700", bg: "bg-slate-50" },
    { label: "Días laborables", value: empStats.daysLost, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Aprobadas", value: empStats.approved, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
    { label: "Pendientes", value: empStats.pending, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Rechazadas", value: empStats.rejected, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Remuneradas", value: empStats.remunerated, icon: TrendingDown, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  if (employeesWithAbsences.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No hay ausencias con los filtros seleccionados</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" />
            Informe Individual por Empleado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Seleccionar empleado</Label>
              <Select value={effectiveEmpId} onValueChange={setSelectedEmpId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecciona un empleado" /></SelectTrigger>
                <SelectContent>
                  {employeesWithAbsences.map(e => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.nombre} ({e.codigo_empleado || '—'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedEmployee && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge className="bg-slate-100 text-slate-700">{selectedEmployee.departamento || 'Sin departamento'}</Badge>
              <Badge className="bg-slate-100 text-slate-700">{selectedEmployee.puesto || 'Sin puesto'}</Badge>
              {selectedEmployee.estado_empleado && (
                <Badge className={selectedEmployee.estado_empleado === "Alta" ? "bg-green-100 text-green-700" : selectedEmployee.estado_empleado === "Baja" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                  {selectedEmployee.estado_empleado}
                </Badge>
              )}
              {hasMaternity && <Badge className="bg-pink-100 text-pink-700 flex items-center gap-1"><Baby className="w-3 h-3" />Maternidad/Paternidad</Badge>}
              {hasMarriage && <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1"><HeartHandshake className="w-3 h-3" />Matrimonio</Badge>}
            </div>
          )}
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              Ausencias del periodo ({empAbsences.length})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={handleExport} disabled={empAbsences.length === 0} className="text-xs h-7">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Exportar Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {empAbsences.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">Sin ausencias en el periodo seleccionado</p>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                  <TableRow>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Motivo</TableHead>
                    <TableHead className="text-xs">Inicio</TableHead>
                    <TableHead className="text-xs">Fin</TableHead>
                    <TableHead className="text-xs text-center">Días lab.</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs text-center">Remun.</TableHead>
                    <TableHead className="text-xs text-center">Origen</TableHead>
                    <TableHead className="text-xs">Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empAbsences.map(abs => {
                    const type = absenceTypes.find(t => t.id === abs.absence_type_id);
                    const interval = clipInterval(abs, rangeBounds.start, rangeBounds.end);
                    const workingDays = interval ? countWorkingDays([interval], effectiveEmpId, holidaySet, globalVacationSet, employeeVacationMap) : 0;
                    const auto = wasAutoDetected(abs);
                    const cfg = STATUS_CONFIG[abs.estado_aprobacion] || STATUS_CONFIG.Pendiente;
                    return (
                      <TableRow key={abs.id} className={hasMaternity ? "bg-pink-50/50 dark:bg-pink-950/20" : ""}>
                        <TableCell className="text-xs font-medium">{abs.tipo || "—"}</TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[150px] truncate">{abs.motivo || "—"}</TableCell>
                        <TableCell className="text-xs">{format(new Date(abs.fecha_inicio), "dd/MM/yy", { locale: es })}</TableCell>
                        <TableCell className="text-xs">
                          {abs.fecha_fin_desconocida ? "Indef." : format(new Date(abs.fecha_fin), "dd/MM/yy", { locale: es })}
                        </TableCell>
                        <TableCell className="text-xs text-center font-semibold">{workingDays}</TableCell>
                        <TableCell>
                          <Badge className={`${cfg.color} text-[10px]`}>{abs.estado_aprobacion}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          {(type?.remunerada !== undefined ? type.remunerada : abs.remunerada) ? "Sí" : "No"}
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          {auto ? <span className="text-amber-600 flex items-center gap-0.5 justify-center"><Bot className="w-3 h-3" />Auto</span> : <span className="text-slate-400">Manual</span>}
                        </TableCell>
                        <TableCell className="text-xs text-slate-400 max-w-[200px] truncate">{abs.notas || "—"}</TableCell>
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