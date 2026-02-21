
import React, { useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, TrendingUp, AlertCircle, ChevronRight, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { recalculateVacationPendingBalances } from "./VacationPendingCalculator";

export default function VacationPendingBalancePanel({ employees = [], compact = false }) {
  const queryClient = useQueryClient();

  const { data: balances = [] } = useQuery({
    queryKey: ["vacationPendingBalances"],
    queryFn: () => base44.entities.VacationPendingBalance.list(),
    initialData: [],
  });

  const recalcMutation = useMutation({
    mutationFn: recalculateVacationPendingBalances,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vacationPendingBalances"] });
      await queryClient.invalidateQueries({ queryKey: ["employeeMasterDatabase"] });
      toast.success("Saldo de vacaciones pendientes recalculado");
    },
    onError: (error) => {
      toast.error(
        "Error al recalcular saldo: " + (error?.message || "desconocido")
      );
    },
  });

  const didAutoRecalc = useRef(false);

  useEffect(() => {
    if (compact) return;
    if (didAutoRecalc.current) return;
    if (recalcMutation.isPending) return;
    didAutoRecalc.current = true;
    recalcMutation.mutate();
  }, [compact, recalcMutation]);

  const protectionBalances = useMemo(() => {
    return Array.isArray(balances)
      ? balances.filter(
          (b) => b && (b.tipo_saldo === "proteccion_vacaciones" || !b.tipo_saldo)
        )
      : [];
  }, [balances]);

  const festivoBalances = useMemo(() => {
    return Array.isArray(balances)
      ? balances.filter((b) => b && b.tipo_saldo === "compensacion_festivos")
      : [];
  }, [balances]);

  const buildEmployeesWithBalance = (sourceBalances) => {
    if (!Array.isArray(employees) || employees.length === 0 || !Array.isArray(sourceBalances)) return [];

    const employeeYearMap = new Map();
    const employeeDetailMap = new Map();
    const extraTotals = new Map(); // balances sin año válido
    const employeeConsumptionMap = new Map();

    sourceBalances.forEach((balance) => {
      if (!balance || !balance.employee_id) return;

      const employee = employees.find((e) => e?.id === balance.employee_id);
      if (!employee) return;

      const diasPendientes = balance.dias_pendientes || 0;
      const diasConsumidos = balance.dias_consumidos || 0;
      const rawYear = balance.anio;
      const year = typeof rawYear === "number" ? rawYear : parseInt(rawYear || "0", 10);
      if (!year) {
        const totals = extraTotals.get(balance.employee_id) || { p: 0, c: 0 };
        totals.p += diasPendientes;
        totals.c += diasConsumidos;
        extraTotals.set(balance.employee_id, totals);
        const existingCons = employeeConsumptionMap.get(balance.employee_id) || [];
        if (Array.isArray(balance.detalle_consumos) && balance.detalle_consumos.length > 0) {
          employeeConsumptionMap.set(balance.employee_id, [...existingCons, ...balance.detalle_consumos]);
        } else if (!employeeConsumptionMap.has(balance.employee_id)) {
          employeeConsumptionMap.set(balance.employee_id, existingCons);
        }
        return;
      }

      let yearMap = employeeYearMap.get(balance.employee_id);
      if (!yearMap) {
        yearMap = new Map();
        employeeYearMap.set(balance.employee_id, yearMap);
      }

      const existingYearData = yearMap.get(year) || {
        dias_pendientes: 0,
        dias_consumidos: 0,
      };

      existingYearData.dias_pendientes += diasPendientes;
      existingYearData.dias_consumidos += diasConsumidos;

      yearMap.set(year, existingYearData);

      const existingDetails = employeeDetailMap.get(balance.employee_id) || [];
      if (Array.isArray(balance.detalle_ausencias) && balance.detalle_ausencias.length > 0) {
        employeeDetailMap.set(balance.employee_id, [
          ...existingDetails,
          ...balance.detalle_ausencias,
        ]);
      } else if (!employeeDetailMap.has(balance.employee_id)) {
        employeeDetailMap.set(balance.employee_id, existingDetails);
      }

      const existingCons = employeeConsumptionMap.get(balance.employee_id) || [];
      if (Array.isArray(balance.detalle_consumos) && balance.detalle_consumos.length > 0) {
        employeeConsumptionMap.set(balance.employee_id, [...existingCons, ...balance.detalle_consumos]);
      } else if (!employeeConsumptionMap.has(balance.employee_id)) {
        employeeConsumptionMap.set(balance.employee_id, existingCons);
      }
    });

    const result = [];

    employeeYearMap.forEach((yearMap, employeeId) => {
      const employee = employees.find((e) => e?.id === employeeId);
      if (!employee) return;

      let totalPendientes = 0;
      let totalConsumidos = 0;
      const yearBreakdown = [];

      yearMap.forEach((data, year) => {
        const disponibles = data.dias_pendientes - data.dias_consumidos;

        yearBreakdown.push({
          year,
          dias_pendientes: data.dias_pendientes,
          dias_consumidos: data.dias_consumidos,
          dias_disponibles: disponibles,
        });

        totalPendientes += data.dias_pendientes;
        totalConsumidos += data.dias_consumidos;
      });
      const extras = extraTotals.get(employeeId);
      if (extras) {
        totalPendientes += extras.p;
        totalConsumidos += extras.c;
      }

      const diasDisponibles = totalPendientes - totalConsumidos;

      if (diasDisponibles <= 0) {
        return;
      }

      yearBreakdown.sort((a, b) => a.year - b.year);

      const detalleAusencias = employeeDetailMap.get(employeeId) || [];
      const detalleConsumos = (employeeConsumptionMap.get(employeeId) || []).slice().sort((a, b) => {
        const da = (a?.fecha_registro || "").toString();
        const db = (b?.fecha_registro || "").toString();
        return db.localeCompare(da);
      });

      result.push({
        employee_id: employeeId,
        employee,
        dias_pendientes: totalPendientes,
        dias_consumidos: totalConsumidos,
        dias_disponibles: diasDisponibles,
        year_breakdown: yearBreakdown,
        detalle_ausencias: detalleAusencias,
        detalle_consumos: detalleConsumos,
      });
    });

    return result
      .filter((b) => b.dias_disponibles > 0)
      .sort((a, b) => b.dias_disponibles - a.dias_disponibles);
  };

  const employeesWithProtectionBalance = useMemo(
    () => buildEmployeesWithBalance(protectionBalances),
    [protectionBalances, employees]
  );

  const employeesWithFestivoBalance = useMemo(
    () => buildEmployeesWithBalance(festivoBalances),
    [festivoBalances, employees]
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [minDays, setMinDays] = useState("");
  const [festivoEmployeeId, setFestivoEmployeeId] = useState("");
  const [festivoStart, setFestivoStart] = useState("");
  const [festivoEnd, setFestivoEnd] = useState("");

  const departments = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => {
      if (e?.departamento) set.add(e.departamento);
    });
    return ["all", ...Array.from(set).sort((a, b) => (a || "").localeCompare(b || ""))];
  }, [employees]);

  const filteredBalances = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const min = parseFloat(minDays) || 0;
    return employeesWithProtectionBalance.filter((b) => {
      const name = (b.employee?.nombre || b.employee?.full_name || b.employee?.display_name || "").toLowerCase();
      const matchesName = !term || name.includes(term);
      const matchesDept =
        departmentFilter === "all" ||
        (b.employee?.departamento || "") === departmentFilter;
      const matchesMin = b.dias_disponibles >= min;
      return matchesName && matchesDept && matchesMin;
    });
  }, [employeesWithProtectionBalance, searchTerm, departmentFilter, minDays]);

  const totalDiasPendientes = useMemo(() => {
    return filteredBalances.reduce((sum, b) => sum + b.dias_disponibles, 0);
  }, [filteredBalances]);

  const festivoMutation = useMutation({
    mutationFn: async ({ employeeId, startDate, endDate }) => {
      if (!employeeId || !startDate || !endDate) {
        throw new Error("Faltan datos para calcular la compensación por festivos.");
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        throw new Error("Rango de fechas de trabajo en festivos no válido.");
      }

      const [holidays, existingBalances] = await Promise.all([
        base44.entities.Holiday.list(),
        base44.entities.VacationPendingBalance.filter({ employee_id: employeeId }),
      ]);

      const holidayDates = holidays
        .map((h) => new Date(h.date))
        .filter((d) => !Number.isNaN(d.getTime()) && d >= start && d <= end);

      const diasCompensar = holidayDates.length;
      if (diasCompensar <= 0) {
        throw new Error("No se han encontrado festivos en el rango seleccionado.");
      }

      const perYear = new Map();
      holidayDates.forEach((d) => {
        const year = d.getFullYear();
        perYear.set(year, (perYear.get(year) || 0) + 1);
      });

      for (const [year, days] of perYear.entries()) {
        const rawYear = year;
        const existing = existingBalances.find((b) => {
          const by = typeof b.anio === "number" ? b.anio : parseInt(b.anio || "0", 10);
          return b.tipo_saldo === "compensacion_festivos" && by === rawYear;
        });

        if (existing) {
          const diasPendientes = (existing.dias_pendientes || 0) + days;
          const diasConsumidos = existing.dias_consumidos || 0;
          const diasDisponibles = diasPendientes - diasConsumidos;
          const detalleFestivos = Array.isArray(existing.detalle_festivos)
            ? existing.detalle_festivos
            : [];
          const nuevoDetalle = {
            fecha_inicio_trabajos_festivos: startDate,
            fecha_fin_trabajos_festivos: endDate,
            dias_generados: days,
          };
          await base44.entities.VacationPendingBalance.update(existing.id, {
            dias_pendientes: diasPendientes,
            dias_disponibles: diasDisponibles,
            detalle_festivos: [...detalleFestivos, nuevoDetalle],
            tipo_saldo: "compensacion_festivos",
          });
        } else {
          await base44.entities.VacationPendingBalance.create({
            employee_id: employeeId,
            anio: rawYear,
            dias_pendientes: days,
            dias_consumidos: 0,
            dias_disponibles: days,
            detalle_festivos: [
              {
                fecha_inicio_trabajos_festivos: startDate,
                fecha_fin_trabajos_festivos: endDate,
                dias_generados: days,
              },
            ],
            tipo_saldo: "compensacion_festivos",
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["vacationPendingBalances"] });
      await queryClient.invalidateQueries({ queryKey: ["employeeMasterDatabase"] });
    },
    onSuccess: () => {
      toast.success("Saldo por compensación de festivos actualizado");
      setFestivoStart("");
      setFestivoEnd("");
    },
    onError: (error) => {
      toast.error(
        "Error al actualizar saldo de festivos: " + (error?.message || "desconocido")
      );
    },
  });

  if (compact) {
    return (
      <Card className="shadow-lg border-0 bg-gradient-to-br from-amber-50 to-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="w-5 h-5 text-orange-600" />
            Saldo Vacaciones Pendientes por Protección de Vacaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <div>
              <p className="text-xs text-slate-600">Total Empleados</p>
              <p className="text-2xl font-bold text-orange-900">{employeesWithProtectionBalance.length}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-600">Total Días</p>
              <p className="text-2xl font-bold text-orange-900">{totalDiasPendientes}</p>
            </div>
          </div>

          {employeesWithProtectionBalance.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {employeesWithProtectionBalance.slice(0, 5).map((balance) => (
                <div
                  key={balance.employee_id}
                  className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-orange-50 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-900">
                    {balance.employee?.nombre}
                  </span>
                  <Badge className="bg-orange-600 text-white font-semibold">
                    {balance.dias_disponibles} días
                  </Badge>
                </div>
              ))}
                {employeesWithProtectionBalance.length > 5 && (
                <Link to={createPageUrl("AbsenceManagement")}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-orange-700 hover:text-orange-800 hover:bg-orange-50"
                  >
                    Ver todos ({employeesWithProtectionBalance.length})
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-slate-500">No hay saldo pendiente</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-2 border-orange-200">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-orange-600" />
              Saldo vacaciones pendientes por Protección de Vacaciones
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-600">Empleados</p>
                <p className="text-2xl font-bold text-orange-900">{filteredBalances.length}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-600">Total Días</p>
                <p className="text-2xl font-bold text-orange-900">{totalDiasPendientes}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => recalcMutation.mutate()}
                disabled={recalcMutation.isPending}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                {recalcMutation.isPending ? "Recalculando" : "Recalcular"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="relative">
              <Input
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d === "all" ? "Todos los departamentos" : d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input
                type="number"
                min={0}
                step={0.5}
                placeholder="Mín. días disponibles"
                value={minDays}
                onChange={(e) => setMinDays(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 mb-1">
                  ¿Qué son las Vacaciones Pendientes?
                </h4>
                <p className="text-sm text-amber-800">
                  Son días de vacaciones que el empleado tiene derecho a disfrutar aparte de su
                  bolsa anual habitual. Se generan cuando no pudo disfrutar vacaciones
                  colectivas por estar ausente (ej. baja médica, permisos que no consumen
                  vacaciones) o cuando trabajó en festivos, fines de semana o días marcados
                  como vacaciones y se acordó su compensación en días libres.
                </p>
              </div>
            </div>
          </div>

          {filteredBalances.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">
                No hay empleados con saldo de vacaciones pendientes
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBalances.map((balance) => (
                <Card
                  key={balance.employee_id}
                  className="border-2 border-orange-100 hover:border-orange-300 transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 mb-1">
                          {balance.employee?.nombre}
                        </h4>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {balance.employee?.departamento || "Sin departamento"}
                          </Badge>
                          {balance.employee?.equipo && (
                            <Badge variant="outline" className="text-xs">
                              {balance.employee.equipo}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-sm mt-3">
                          <div className="bg-orange-50 p-2 rounded">
                            <p className="text-xs text-orange-700">Pendientes</p>
                            <p className="font-bold text-orange-900">
                              {balance.dias_pendientes} días
                            </p>
                          </div>
                          <div className="bg-green-50 p-2 rounded">
                            <p className="text-xs text-green-700">Consumidos</p>
                            <p className="font-bold text-green-900">
                              {balance.dias_consumidos} días
                            </p>
                          </div>
                          <div className="bg-blue-50 p-2 rounded">
                            <p className="text-xs text-blue-700">Disponibles</p>
                            <p className="font-bold text-blue-900">
                              {balance.dias_disponibles} días
                            </p>
                          </div>
                        </div>

                        {balance.year_breakdown && balance.year_breakdown.length > 0 && (
                          <div className="mt-3 text-xs text-slate-700">
                            <p className="font-semibold mb-1">Desglose por año</p>
                            <div className="space-y-1">
                              {balance.year_breakdown.map((yb) => (
                                <div key={yb.year} className="flex justify-between">
                                  <span>{yb.year}</span>
                                  <span>{yb.dias_disponibles} días disponibles</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {balance.detalle_ausencias?.length > 0 && (
                          <details className="mt-3">
                            <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                              Ver detalle de {balance.detalle_ausencias.length} ausencia(s)
                            </summary>
                            <div className="mt-2 space-y-2 pl-4">
                              {balance.detalle_ausencias.map((det, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs p-2 bg-slate-50 rounded border"
                                >
                                  <p className="font-medium">{det.tipo_ausencia}</p>
                                  <p className="text-slate-600">
                                    {det.dias_coincidentes} día(s) coincidentes con
                                    vacaciones
                                  </p>
                                  {det.periodos_vacaciones?.map((vac, vIdx) => (
                                    <p key={vIdx} className="text-slate-500 ml-2">
                                      • {vac.nombre}
                                    </p>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                        {balance.detalle_consumos?.length > 0 && (
                          <details className="mt-3">
                            <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                              Historial de consumos ({balance.detalle_consumos.length})
                            </summary>
                            <div className="mt-2 space-y-2 pl-4">
                              {balance.detalle_consumos.map((cons, idx) => (
                                <div key={idx} className="text-xs p-2 bg-slate-50 rounded border">
                                  <p className="font-medium">Consumo de {cons.dias} día(s)</p>
                                  <p className="text-slate-600">
                                    Fecha registro: {(cons.fecha_registro || "").toString().slice(0, 10)}
                                  </p>
                                  {Array.isArray(cons.fechas_concedidas) && cons.fechas_concedidas.length > 0 && (
                                    <p className="text-slate-600">
                                      Fechas concedidas: {cons.fechas_concedidas.join(", ")}
                                    </p>
                                  )}
                                  {cons.comentario && (
                                    <p className="text-slate-500">{cons.comentario}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>

                      <Badge className="bg-orange-600 text-white text-lg px-4 py-2 ml-4">
                        +{balance.dias_disponibles}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-xl border-2 border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-blue-600" />
              Saldo vacaciones por compensación de festivos
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <p className="text-xs text-slate-600 mb-1">Empleado</p>
              <Select value={festivoEmployeeId} onValueChange={setFestivoEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .slice()
                    .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))
                    .map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {festivoEmployeeId && (
                <div className="mt-1 text-xs text-slate-600">
                  {(() => {
                    const emp = employees.find((e) => e.id === festivoEmployeeId);
                    if (!emp) return null;
                    return (
                      <>
                        <div>{emp.departamento || "Sin departamento"}</div>
                        <div>{emp.puesto || emp.cargo || ""}</div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-600 mb-1">Fecha inicio trabajo festivos</p>
              <Input
                type="date"
                value={festivoStart}
                onChange={(e) => setFestivoStart(e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs text-slate-600 mb-1">Fecha fin trabajo festivos</p>
              <Input
                type="date"
                value={festivoEnd}
                onChange={(e) => setFestivoEnd(e.target.value)}
              />
            </div>
            <div>
              <Button
                className="w-full"
                disabled={
                  festivoMutation.isPending || !festivoEmployeeId || !festivoStart || !festivoEnd
                }
                onClick={() =>
                  festivoMutation.mutate({
                    employeeId: festivoEmployeeId,
                    startDate: festivoStart,
                    endDate: festivoEnd,
                  })
                }
              >
                {festivoMutation.isPending ? "Calculando..." : "Calcular y sumar saldo"}
              </Button>
            </div>
          </div>

          {employeesWithFestivoBalance.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-500 text-sm">
                No hay empleados con saldo por compensación de festivos
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {employeesWithFestivoBalance.map((balance) => (
                <div
                  key={balance.employee_id}
                  className="flex items-center justify-between p-2 border rounded-lg bg-white"
                >
                  <div>
                    <p className="font-medium text-slate-900">{balance.employee?.nombre}</p>
                    <p className="text-xs text-slate-600">
                      {balance.employee?.departamento || "Sin departamento"}{" "}
                      {balance.employee?.puesto || balance.employee?.cargo
                        ? `· ${balance.employee.puesto || balance.employee.cargo}`
                        : ""}
                    </p>
                  </div>
                  <Badge className="bg-blue-600 text-white font-semibold">
                    {balance.dias_disponibles} días
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
