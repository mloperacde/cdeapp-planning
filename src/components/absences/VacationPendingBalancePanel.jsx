
import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, TrendingUp, AlertCircle, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function VacationPendingBalancePanel({ employees = [], compact = false }) {
  const { data: balances = [] } = useQuery({
    queryKey: ["vacationPendingBalances"],
    queryFn: () => base44.entities.VacationPendingBalance.list(),
    initialData: [],
  });

  const employeesWithBalance = useMemo(() => {
    if (!Array.isArray(employees) || employees.length === 0 || !Array.isArray(balances)) return [];

    const employeeYearMap = new Map();
    const employeeDetailMap = new Map();

    balances.forEach((balance) => {
      if (!balance || !balance.employee_id) return;

      const employee = employees.find((e) => e?.id === balance.employee_id);
      if (!employee) return;

      const diasPendientes = balance.dias_pendientes || 0;
      const diasConsumidos = balance.dias_consumidos || 0;
      const rawYear = balance.anio;
      const year = typeof rawYear === "number" ? rawYear : parseInt(rawYear || "0", 10);
      if (!year) return;

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

      const diasDisponibles = totalPendientes - totalConsumidos;

      if (diasDisponibles <= 0) {
        return;
      }

      yearBreakdown.sort((a, b) => a.year - b.year);

      const detalleAusencias = employeeDetailMap.get(employeeId) || [];

      result.push({
        employee_id: employeeId,
        employee,
        dias_pendientes: totalPendientes,
        dias_consumidos: totalConsumidos,
        dias_disponibles: diasDisponibles,
        year_breakdown: yearBreakdown,
        detalle_ausencias: detalleAusencias,
      });
    });

    return result
      .filter(
        (b) =>
          b.dias_disponibles > 0 &&
          Array.isArray(b.detalle_ausencias) &&
          b.detalle_ausencias.length > 0
      )
      .sort((a, b) => b.dias_disponibles - a.dias_disponibles);
  }, [balances, employees]);

  const totalDiasPendientes = useMemo(() => {
    return employeesWithBalance.reduce((sum, b) => sum + b.dias_disponibles, 0);
  }, [employeesWithBalance]);

  if (compact) {
    return (
      <Card className="shadow-lg border-0 bg-gradient-to-br from-amber-50 to-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="w-5 h-5 text-orange-600" />
            Saldo Vacaciones Pendientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <div>
              <p className="text-xs text-slate-600">Total Empleados</p>
              <p className="text-2xl font-bold text-orange-900">{employeesWithBalance.length}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-600">Total Días</p>
              <p className="text-2xl font-bold text-orange-900">{totalDiasPendientes}</p>
            </div>
          </div>

          {employeesWithBalance.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {employeesWithBalance.slice(0, 5).map((balance) => (
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
              {employeesWithBalance.length > 5 && (
                <Link to={createPageUrl("AbsenceManagement")}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-orange-700 hover:text-orange-800 hover:bg-orange-50"
                  >
                    Ver todos ({employeesWithBalance.length})
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
    <Card className="shadow-xl border-2 border-orange-200">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-orange-600" />
            Saldo de Vacaciones Pendientes
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-600">Empleados</p>
              <p className="text-2xl font-bold text-orange-900">{employeesWithBalance.length}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-600">Total Días</p>
              <p className="text-2xl font-bold text-orange-900">{totalDiasPendientes}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900 mb-1">
                ¿Qué son las Vacaciones Pendientes?
              </h4>
              <p className="text-sm text-amber-800">
                Son días de vacaciones colectivas que no fueron disfrutados porque el
                empleado estaba ausente (ej. baja médica, permiso sin sueldo). Estos días
                se suman a su saldo anual de vacaciones.
              </p>
            </div>
          </div>
        </div>

        {employeesWithBalance.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">
              No hay empleados con saldo de vacaciones pendientes
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {employeesWithBalance.map((balance) => (
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
  );
}
