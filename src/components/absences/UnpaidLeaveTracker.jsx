import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const DEFAULT_MAX_UNPAID_DAYS_PER_YEAR = 5;

export default function UnpaidLeaveTracker({ employees = [] }) {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [requestDate, setRequestDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [daysRequested, setDaysRequested] = useState("");

  const { data: balances = [] } = useQuery({
    queryKey: ["unpaidLeaveBalances", currentYear],
    queryFn: () =>
      base44.entities.UnpaidLeaveBalance.filter({
        anio: currentYear,
      }),
    initialData: [],
  });

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employees.find((e) => e.id === selectedEmployeeId) || null;
  }, [employees, selectedEmployeeId]);

  const employeeMaxUnpaidDays = useMemo(() => {
    if (!selectedEmployee) return DEFAULT_MAX_UNPAID_DAYS_PER_YEAR;

    const perEmployeeLimitA =
      typeof selectedEmployee.max_permisos_no_remunerados_anuales === "number"
        ? selectedEmployee.max_permisos_no_remunerados_anuales
        : undefined;

    const perEmployeeLimitB =
      typeof selectedEmployee.limite_permisos_no_remunerados === "number"
        ? selectedEmployee.limite_permisos_no_remunerados
        : undefined;

    if (typeof perEmployeeLimitA === "number") {
      return perEmployeeLimitA;
    }

    if (typeof perEmployeeLimitB === "number") {
      return perEmployeeLimitB;
    }

    return DEFAULT_MAX_UNPAID_DAYS_PER_YEAR;
  }, [selectedEmployee]);

  const employeeBalance = useMemo(() => {
    if (!selectedEmployeeId) return null;
    const existing = balances.find(
      (b) => b.employee_id === selectedEmployeeId
    );

    if (existing) {
      return existing;
    }

    return {
      employee_id: selectedEmployeeId,
      anio: currentYear,
      dias_consumidos: 0,
      dias_disponibles: employeeMaxUnpaidDays,
      consumos: [],
    };
  }, [balances, selectedEmployeeId, currentYear, employeeMaxUnpaidDays]);

  const remainingDays = useMemo(() => {
    if (!employeeBalance) return employeeMaxUnpaidDays;
    const used = employeeBalance.dias_consumidos || 0;
    return Math.max(0, employeeMaxUnpaidDays - used);
  }, [employeeBalance, employeeMaxUnpaidDays]);

  const trackMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployeeId) {
        throw new Error("Selecciona un empleado");
      }

      const amount = Number(daysRequested);

      if (!amount || amount <= 0) {
        throw new Error("Introduce un número de días válido");
      }

      if (amount > remainingDays) {
        throw new Error(
          `No puedes registrar más de ${remainingDays} día(s) disponibles`
        );
      }

      const updatedConsumed =
        (employeeBalance.dias_consumidos || 0) + amount;

      const newEntry = {
        fecha: requestDate,
        dias: amount,
      };

      if (employeeBalance.id) {
        const updatedEntries = [
          ...(employeeBalance.consumos || []),
          newEntry,
        ];

        await base44.entities.UnpaidLeaveBalance.update(
          employeeBalance.id,
          {
            dias_consumidos: updatedConsumed,
            dias_disponibles: Math.max(
              0,
              employeeMaxUnpaidDays - updatedConsumed
            ),
            consumos: updatedEntries,
          }
        );
      } else {
        await base44.entities.UnpaidLeaveBalance.create({
          employee_id: selectedEmployeeId,
          anio: currentYear,
          dias_consumidos: updatedConsumed,
          dias_disponibles: Math.max(
            0,
            employeeMaxUnpaidDays - updatedConsumed
          ),
          consumos: [newEntry],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["unpaidLeaveBalances"],
      });
      toast.success("Permiso no remunerado registrado");
      setDaysRequested("");
    },
    onError: (error) => {
      toast.error(error?.message || "Error al registrar permiso");
    },
  });

  return (
    <Card className="shadow-lg border-2 border-amber-200">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-amber-600" />
          Permisos No Remunerados (
          {selectedEmployee
            ? employeeMaxUnpaidDays
            : DEFAULT_MAX_UNPAID_DAYS_PER_YEAR}{" "}
          días/año)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Empleado</Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fecha de solicitud</Label>
            <Input
              type="date"
              value={requestDate}
              onChange={(e) => setRequestDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Días a registrar (disponibles: {remainingDays})
            </Label>
            <Input
              type="number"
              min={1}
              max={remainingDays}
              value={daysRequested}
              onChange={(e) => setDaysRequested(e.target.value)}
            />
          </div>
        </div>

        {selectedEmployee && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-slate-50 p-3 rounded border">
                <p className="text-xs text-slate-600">Empleado</p>
                <p className="font-semibold text-slate-900">
                  {selectedEmployee.nombre}
                </p>
              </div>
              <div className="bg-red-50 p-3 rounded border border-red-100">
                <p className="text-xs text-red-700">Consumidos</p>
                <p className="font-bold text-red-900">
                  {employeeBalance?.dias_consumidos || 0} días
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded border border-green-100">
                <p className="text-xs text-green-700">Disponibles</p>
                <p className="font-bold text-green-900">
                  {remainingDays} días
                </p>
              </div>
            </div>

            {employeeBalance?.consumos &&
              employeeBalance.consumos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-slate-500" />
                    Historial de permisos no remunerados
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {employeeBalance.consumos.map((c, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-slate-700 bg-slate-50 border rounded px-2 py-1 flex justify-between"
                      >
                        <span>
                          {format(
                            new Date(c.fecha),
                            "dd/MM/yyyy",
                            { locale: es }
                          )}
                        </span>
                        <span className="font-semibold">
                          {c.dias} día(s)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={() => trackMutation.mutate()}
            disabled={
              !selectedEmployeeId ||
              !daysRequested ||
              trackMutation.isPending
            }
            className="bg-amber-600 hover:bg-amber-700"
          >
            {trackMutation.isPending ? "Guardando..." : "Registrar permiso"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
