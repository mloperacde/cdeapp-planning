import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, LogOut, TrendingDown, CheckCircle2, FileSpreadsheet, RefreshCw, AlertCircle, Users } from "lucide-react";
import { toast } from "sonner";
import {
  WORKDAY_INCIDENT_FIELDS, WORKDAY_INCIDENT_STATUSES, WORKDAY_STATUS_STYLES,
  buildComplianceStatsFromEmployees, buildEmployeeComplianceRows, exportComplianceExcel, fmtHours, isWorkday,
} from "@/utils/workdayCompliance";

/**
 * Jornada parcial no cumplida (han acudido pero no completan su turno).
 * Las cifras provienen del informe de ausencias, de modo que usan exactamente el mismo
 * calendario laboral que las ausencias; el detalle diario se filtra con esa misma regla.
 */
export default function WorkdayComplianceReport({
  employees = [], holidaySet, globalVacationSet, employeeVacationMap,
  dateFrom, dateTo, periodLabel, department = "all", loading,
}) {
  const stats = useMemo(() => buildComplianceStatsFromEmployees(employees), [employees]);
  const employeeRows = useMemo(() => buildEmployeeComplianceRows(employees), [employees]);
  const scopedIds = useMemo(() => employees.map(e => String(e.empId)), [employees]);
  const enabled = Boolean(dateFrom) && Boolean(dateTo) && scopedIds.length > 0;

  // Detalle diario de los días que no cumplen jornada (solo días laborables del calendario)
  const { data: rawIncidents = [], isLoading: loadingIncidents, error: detailError } = useQuery({
    queryKey: ["workdayComplianceIncidents", dateFrom, dateTo, department],
    queryFn: async () => {
      const page = await base44.entities.DailyPresence.filter(
        {
          record_date: { $gte: dateFrom, $lte: dateTo },
          employee_id: { $in: scopedIds },
          $or: WORKDAY_INCIDENT_STATUSES.map((s) => ({ compliance_status: s })),
        },
        { sort: "-record_date", limit: 3000, fields: WORKDAY_INCIDENT_FIELDS }
      );
      return page.items || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const incidents = useMemo(() => rawIncidents.filter(r =>
    isWorkday(r.record_date, holidaySet, globalVacationSet, employeeVacationMap?.[String(r.employee_id)])
  ), [rawIncidents, holidaySet, globalVacationSet, employeeVacationMap]);

  const busy = loading || loadingIncidents;

  const handleExport = () => {
    if (employeeRows.length === 0) {
      toast.warning("No hay desviaciones de jornada para exportar");
      return;
    }
    exportComplianceExcel({ employeeRows, incidents, periodLabel, dateFrom, dateTo });
    toast.success(`Exportados ${employeeRows.length} empleados y ${incidents.length} días`);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 px-1">
        Empleados que <strong className="font-semibold">sí han acudido</strong> pero no han completado la jornada de su turno
        (retraso, salida anticipada, jornada incompleta o sin salida registrada). Se calcula sobre los mismos días laborables
        del calendario laboral que el informe de ausencias: no se evalúan festivos, vacaciones, fines de semana, días sin
        turno asignado ni turnos en curso.
      </p>

      {/* KPIs del periodo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-slate-500">Cumplimiento de jornada</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.complianceRate}%</p>
            <p className="text-xs text-slate-400 mt-0.5">{stats.completeDays} de {stats.evaluatedDays} días laborables evaluados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-slate-500">Días con retraso</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.delayDays}</p>
            <p className="text-xs text-slate-400 mt-0.5">entradas tardías</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <LogOut className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-medium text-slate-500">Días con salida anticipada</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.earlyDays}</p>
            <p className="text-xs text-slate-400 mt-0.5">{stats.noExitDays} días sin salida registrada</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-xs font-medium text-slate-500">Horas no trabajadas</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{fmtHours(stats.missingMinutes)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{stats.daysNotCompliant} días sin cumplir jornada</p>
          </CardContent>
        </Card>
      </div>

      {detailError && (
        <div className="flex items-center gap-2 text-xs text-red-600 px-1">
          <AlertCircle className="w-3.5 h-3.5" />
          No se ha podido cargar el detalle diario de incumplimientos.
        </div>
      )}

      {/* Resumen por empleado */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              Días sin cumplir jornada por Empleado ({employeeRows.length})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={handleExport} disabled={employeeRows.length === 0} className="text-xs h-7">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Exportar Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {busy ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : employeeRows.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              No hay desviaciones de jornada en el periodo seleccionado.
            </p>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                  <TableRow>
                    <TableHead className="text-xs">Empleado</TableHead>
                    <TableHead className="text-xs">Departamento</TableHead>
                    <TableHead className="text-xs text-center" title="Días del periodo con jornada evaluada: excluye festivos, vacaciones, fines de semana, días sin turno y turnos en curso">Días evaluados</TableHead>
                    <TableHead className="text-xs text-center">Días sin cumplir</TableHead>
                    <TableHead className="text-xs text-center">Retrasos</TableHead>
                    <TableHead className="text-xs text-center">Salidas ant.</TableHead>
                    <TableHead className="text-xs text-center">Sin salida</TableHead>
                    <TableHead className="text-xs text-center">Cumplimiento</TableHead>
                    <TableHead className="text-xs text-center">Horas no trabajadas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeRows.map(e => (
                    <TableRow key={e.employee_id}>
                      <TableCell className="text-xs font-medium">{e.nombre}</TableCell>
                      <TableCell className="text-xs text-slate-500">{e.departamento || "—"}</TableCell>
                      <TableCell className="text-xs text-center text-slate-500">{e.evaluatedDays}</TableCell>
                      <TableCell className="text-xs text-center font-semibold">{e.daysNotCompliant}</TableCell>
                      <TableCell className="text-xs text-center text-amber-600">{e.delayDays}</TableCell>
                      <TableCell className="text-xs text-center text-orange-600">{e.earlyDays}</TableCell>
                      <TableCell className="text-xs text-center text-purple-600">{e.noExitDays}</TableCell>
                      <TableCell className="text-xs text-center">{e.complianceRate}%</TableCell>
                      <TableCell className="text-xs text-center font-semibold text-red-600">{fmtHours(e.missingMinutes)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalle diario */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            Detalle diario de incumplimientos ({incidents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {busy ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : incidents.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Sin incidencias de jornada en el periodo.</p>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                  <TableRow>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Empleado</TableHead>
                    <TableHead className="text-xs">Turno</TableHead>
                    <TableHead className="text-xs text-center">Entrada esp./real</TableHead>
                    <TableHead className="text-xs text-center">Salida esp./real</TableHead>
                    <TableHead className="text-xs text-center">Retraso</TableHead>
                    <TableHead className="text-xs text-center">Salida ant.</TableHead>
                    <TableHead className="text-xs text-center">No trabajado</TableHead>
                    <TableHead className="text-xs text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">{r.record_date}</TableCell>
                      <TableCell className="text-xs font-medium whitespace-nowrap">{r.employee_name || "—"}</TableCell>
                      <TableCell className="text-xs text-slate-500">{r.shift || "—"}</TableCell>
                      <TableCell className="text-xs text-center text-slate-500">
                        {r.expected_start || "—"} / {r.first_entry || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-center text-slate-500">
                        {r.expected_end || "—"} / {r.last_exit || "—"}
                      </TableCell>
                      <TableCell className={`text-xs text-center ${(r.minutes_late || 0) > 0 ? "text-amber-600 font-medium" : "text-slate-400"}`}>
                        {(r.minutes_late || 0) > 0 ? fmtHours(r.minutes_late) : "—"}
                      </TableCell>
                      <TableCell className={`text-xs text-center ${(r.minutes_early || 0) > 0 ? "text-orange-600 font-medium" : "text-slate-400"}`}>
                        {(r.minutes_early || 0) > 0 ? fmtHours(r.minutes_early) : "—"}
                      </TableCell>
                      <TableCell className={`text-xs text-center ${(r.missing_minutes || 0) > 0 ? "text-red-600 font-semibold" : "text-slate-400"}`}>
                        {(r.missing_minutes || 0) > 0 ? fmtHours(r.missing_minutes) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-center">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${WORKDAY_STATUS_STYLES[r.compliance_status] || ""}`}>
                          {r.compliance_status}
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
    </div>
  );
}