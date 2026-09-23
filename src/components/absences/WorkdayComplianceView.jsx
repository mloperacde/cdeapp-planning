import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Clock, Download, RefreshCw, AlertCircle, CheckCircle2,
  Timer, LogOut, TrendingDown, Users
} from "lucide-react";
import * as XLSX from "xlsx";

const STATUS_CONFIG = {
  "Completa": { color: "bg-green-100 text-green-700 border-green-300", icon: CheckCircle2 },
  "Retraso": { color: "bg-amber-100 text-amber-700 border-amber-300", icon: Clock },
  "Salida Anticipada": { color: "bg-orange-100 text-orange-700 border-orange-300", icon: LogOut },
  "Incompleta": { color: "bg-red-100 text-red-700 border-red-300", icon: AlertCircle },
  "En Curso": { color: "bg-blue-100 text-blue-700 border-blue-300", icon: Clock },
  "Sin Turno": { color: "bg-slate-100 text-slate-500 border-slate-300", icon: Clock },
  "Ausente": { color: "bg-red-100 text-red-700 border-red-300", icon: AlertCircle },
  "Sin Datos": { color: "bg-slate-100 text-slate-400 border-slate-300", icon: Clock },
};

function fmtMinutes(min) {
  if (!min || min === 0) return "0h 0m";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

export default function WorkdayComplianceView({ employees = [] }) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split("T")[0];
  }, []);

  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [recalculating, setRecalculating] = useState(false);

  // Generar lista de fechas en el rango
  const dates = useMemo(() => {
    const result = [];
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().split("T")[0];
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) result.push(ds);
    }
    return result;
  }, [startDate, endDate]);

  // Mapa de empleados por id y por código
  const empById = useMemo(() => {
    const m = {};
    for (const e of employees) m[e.id] = e;
    return m;
  }, [employees]);

  const empByCode = useMemo(() => {
    const m = {};
    for (const e of employees) {
      if (e.codigo_empleado) m[String(e.codigo_empleado).trim()] = e;
    }
    return m;
  }, [employees]);

  const departments = useMemo(() => {
    const s = new Set();
    for (const e of employees) if (e.departamento) s.add(e.departamento);
    return [...s].sort();
  }, [employees]);

  // Cargar DailyPresence por fecha (paralelo)
  const { data: dailyPresence = [], isLoading } = useQuery({
    queryKey: ["dailyPresence", dates],
    queryFn: async () => {
      const results = await Promise.all(
        dates.map(d =>
          base44.entities.DailyPresence.filter({ record_date: d }, "-record_date", 1000).catch(() => [])
        )
      );
      return results.flat();
    },
    staleTime: 60000,
  });

  // Filtrar y enriquecer registros
  const filteredRecords = useMemo(() => {
    return dailyPresence
      .filter(r => {
        if (!r.compliance_status || r.compliance_status === "Sin Datos") return false;
        const emp = empById[r.employee_id] || empByCode[r.employee_code];
        if (departmentFilter !== "all" && emp?.departamento !== departmentFilter) return false;
        return true;
      })
      .sort((a, b) => (b.record_date || "").localeCompare(a.record_date || "") || (a.employee_name || "").localeCompare(b.employee_name || ""));
  }, [dailyPresence, empById, empByCode, departmentFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const totalRecords = filteredRecords.length;
    const totalMissingMin = filteredRecords.reduce((s, r) => s + (r.missing_minutes || 0), 0);
    const delays = filteredRecords.filter(r => (r.minutes_late || 0) > 0).length;
    const earlyExits = filteredRecords.filter(r => (r.minutes_early || 0) > 0).length;
    const complete = filteredRecords.filter(r => r.compliance_status === "Completa").length;
    const complianceRate = totalRecords > 0 ? Math.round((complete / totalRecords) * 100) : 0;
    const affectedEmployees = new Set(filteredRecords.filter(r => (r.missing_minutes || 0) > 0).map(r => r.employee_id)).size;
    return { totalRecords, totalMissingMin, delays, earlyExits, complete, complianceRate, affectedEmployees };
  }, [filteredRecords]);

  // Resumen por empleado
  const employeeSummary = useMemo(() => {
    const map = {};
    for (const r of filteredRecords) {
      const key = r.employee_id || r.employee_code;
      if (!map[key]) {
        const emp = empById[r.employee_id] || empByCode[r.employee_code];
        map[key] = {
          employee_id: r.employee_id,
          employee_name: r.employee_name,
          employee_code: r.employee_code,
          departamento: emp?.departamento || "",
          days: 0,
          total_late: 0,
          total_early: 0,
          total_missing: 0,
          total_expected: 0,
          total_actual: 0,
          complete_days: 0,
          delay_days: 0,
          early_days: 0,
        };
      }
      const e = map[key];
      e.days++;
      e.total_late += r.minutes_late || 0;
      e.total_early += r.minutes_early || 0;
      e.total_missing += r.missing_minutes || 0;
      e.total_expected += r.expected_minutes || 0;
      e.total_actual += r.actual_minutes || 0;
      if (r.compliance_status === "Completa") e.complete_days++;
      if ((r.minutes_late || 0) > 0) e.delay_days++;
      if ((r.minutes_early || 0) > 0) e.early_days++;
    }
    return Object.values(map).sort((a, b) => b.total_missing - a.total_missing);
  }, [filteredRecords, empById, empByCode]);

  const exportToExcel = () => {
    const data = filteredRecords.map(r => {
      const emp = empById[r.employee_id] || empByCode[r.employee_code];
      return {
        "Fecha": r.record_date,
        "Empleado": r.employee_name,
        "Código": r.employee_code,
        "Departamento": emp?.departamento || "",
        "Turno": r.shift || "",
        "Entrada Esperada": r.expected_start || "",
        "Salida Esperada": r.expected_end || "",
        "Primera Entrada": r.first_entry || "",
        "Última Salida": r.last_exit || "",
        "Min Retraso": r.minutes_late || 0,
        "Min Salida Anticipada": r.minutes_early || 0,
        "Min Esperados": r.expected_minutes || 0,
        "Min Reales": r.actual_minutes || 0,
        "Min No Trabajados": r.missing_minutes || 0,
        "Estado": r.compliance_status || "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 12 }, { wch: 28 }, { wch: 8 }, { wch: 18 }, { wch: 10 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 16 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cumplimiento");
    XLSX.writeFile(wb, `cumplimiento_horario_${startDate}_${endDate}.xlsx`);
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await base44.functions.invoke("cucoSyncV2", {
        start_date: startDate,
        end_date: endDate,
        skip_analysis: true,
      });
      queryClient.invalidateQueries({ queryKey: ["dailyPresence"] });
    } catch (e) {
      console.error("Error recalculando:", e);
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="bg-white dark:bg-slate-800">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Desde</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 w-36 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Hasta</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 w-36 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Departamento</label>
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="h-8 w-48 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 px-2"
              >
                <option value="all">Todos</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleRecalculate} disabled={recalculating}>
                <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? "animate-spin" : ""}`} />
                {recalculating ? "Recalculando..." : "Recalcular"}
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={exportToExcel} disabled={filteredRecords.length === 0}>
                <Download className="w-3.5 h-3.5" />
                Exportar Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-white dark:bg-slate-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-xs font-medium text-slate-500">Horas no trabajadas</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{fmtMinutes(kpis.totalMissingMin)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{kpis.totalRecords} registros</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-slate-500">Cumplimiento</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.complianceRate}%</p>
            <p className="text-xs text-slate-400 mt-0.5">{kpis.complete} días completos</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-slate-500">Días con retraso</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.delays}</p>
            <p className="text-xs text-slate-400 mt-0.5">entradas tardías</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-medium text-slate-500">Empleados afectados</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.affectedEmployees}</p>
            <p className="text-xs text-slate-400 mt-0.5">con horas no trabajadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Resumen por empleado */}
      {employeeSummary.length > 0 && (
        <Card className="bg-white dark:bg-slate-800">
          <CardContent className="pt-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" /> Resumen por empleado
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                    <th className="text-left py-2 px-2 font-medium">Empleado</th>
                    <th className="text-left py-2 px-2 font-medium">Dpto</th>
                    <th className="text-center py-2 px-2 font-medium">Días</th>
                    <th className="text-center py-2 px-2 font-medium">Completos</th>
                    <th className="text-center py-2 px-2 font-medium">Retrasos</th>
                    <th className="text-center py-2 px-2 font-medium">Salidas Ant.</th>
                    <th className="text-center py-2 px-2 font-medium">Retraso total</th>
                    <th className="text-center py-2 px-2 font-medium">Salida Ant. total</th>
                    <th className="text-center py-2 px-2 font-medium font-bold text-red-600">No trabajado</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeSummary.filter(e => e.total_missing > 0).slice(0, 15).map((e, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-1.5 px-2 font-medium text-slate-700 dark:text-slate-300">{e.employee_name}</td>
                      <td className="py-1.5 px-2 text-slate-500">{e.departamento}</td>
                      <td className="py-1.5 px-2 text-center">{e.days}</td>
                      <td className="py-1.5 px-2 text-center text-green-600">{e.complete_days}</td>
                      <td className="py-1.5 px-2 text-center text-amber-600">{e.delay_days}</td>
                      <td className="py-1.5 px-2 text-center text-orange-600">{e.early_days}</td>
                      <td className="py-1.5 px-2 text-center text-amber-600">{fmtMinutes(e.total_late)}</td>
                      <td className="py-1.5 px-2 text-center text-orange-600">{fmtMinutes(e.total_early)}</td>
                      <td className="py-1.5 px-2 text-center font-bold text-red-600">{fmtMinutes(e.total_missing)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalle diario */}
      <Card className="bg-white dark:bg-slate-800">
        <CardContent className="pt-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Timer className="w-4 h-4" /> Detalle diario
          </h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No hay datos de cumplimiento para el rango seleccionado.
              <br />
              Pulsa <strong>Recalcular</strong> para sincronizar y calcular el cumplimiento horario.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                    <th className="text-left py-2 px-2 font-medium">Fecha</th>
                    <th className="text-left py-2 px-2 font-medium">Empleado</th>
                    <th className="text-center py-2 px-2 font-medium">Turno</th>
                    <th className="text-center py-2 px-2 font-medium">Entr. Esp.</th>
                    <th className="text-center py-2 px-2 font-medium">Sal. Esp.</th>
                    <th className="text-center py-2 px-2 font-medium">Entrada</th>
                    <th className="text-center py-2 px-2 font-medium">Salida</th>
                    <th className="text-center py-2 px-2 font-medium">Retraso</th>
                    <th className="text-center py-2 px-2 font-medium">Sal. Ant.</th>
                    <th className="text-center py-2 px-2 font-medium">Esperado</th>
                    <th className="text-center py-2 px-2 font-medium">Real</th>
                    <th className="text-center py-2 px-2 font-medium text-red-600">No trab.</th>
                    <th className="text-center py-2 px-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r, i) => {
                    const sc = STATUS_CONFIG[r.compliance_status] || STATUS_CONFIG["Sin Datos"];
                    const StatusIcon = sc.icon;
                    return (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{r.record_date}</td>
                        <td className="py-1.5 px-2 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">{r.employee_name}</td>
                        <td className="py-1.5 px-2 text-center text-slate-500">{r.shift || "—"}</td>
                        <td className="py-1.5 px-2 text-center text-slate-500">{r.expected_start || "—"}</td>
                        <td className="py-1.5 px-2 text-center text-slate-500">{r.expected_end || "—"}</td>
                        <td className="py-1.5 px-2 text-center text-slate-600 dark:text-slate-400">{r.first_entry || "—"}</td>
                        <td className="py-1.5 px-2 text-center text-slate-600 dark:text-slate-400">{r.last_exit || "—"}</td>
                        <td className={`py-1.5 px-2 text-center ${(r.minutes_late || 0) > 0 ? "text-amber-600 font-medium" : "text-slate-400"}`}>
                          {(r.minutes_late || 0) > 0 ? fmtMinutes(r.minutes_late) : "—"}
                        </td>
                        <td className={`py-1.5 px-2 text-center ${(r.minutes_early || 0) > 0 ? "text-orange-600 font-medium" : "text-slate-400"}`}>
                          {(r.minutes_early || 0) > 0 ? fmtMinutes(r.minutes_early) : "—"}
                        </td>
                        <td className="py-1.5 px-2 text-center text-slate-500">{r.expected_minutes ? fmtMinutes(r.expected_minutes) : "—"}</td>
                        <td className="py-1.5 px-2 text-center text-slate-500">{r.actual_minutes ? fmtMinutes(r.actual_minutes) : "—"}</td>
                        <td className={`py-1.5 px-2 text-center font-medium ${(r.missing_minutes || 0) > 0 ? "text-red-600" : "text-slate-400"}`}>
                          {(r.missing_minutes || 0) > 0 ? fmtMinutes(r.missing_minutes) : "—"}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${sc.color}`}>
                            <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                            {r.compliance_status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}