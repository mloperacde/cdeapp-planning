import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

export default function VacationPendingConsumptionManager({ employees = [] }) {
  const queryClient = useQueryClient();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [daysToConsume, setDaysToConsume] = useState("");

  const { data: balances = [] } = useQuery({
    queryKey: ["vacationPendingBalances"],
    queryFn: () => base44.entities.VacationPendingBalance.list(),
    initialData: [],
  });

  const employeesWithBalance = useMemo(() => {
    const map = new Map();

    balances.forEach((balance) => {
      const employee = employees.find((e) => e.id === balance.employee_id);
      if (!employee) return;

      const diasPendientes = balance.dias_pendientes || 0;
      const diasConsumidos = balance.dias_consumidos || 0;

      const existing = map.get(balance.employee_id);

      if (existing) {
        const totalPendientes = existing.dias_pendientes + diasPendientes;
        const totalConsumidos = existing.dias_consumidos + diasConsumidos;
        const totalDisponibles = totalPendientes - totalConsumidos;

        map.set(balance.employee_id, {
          ...existing,
          dias_pendientes: totalPendientes,
          dias_consumidos: totalConsumidos,
          dias_disponibles: totalDisponibles,
        });
      } else {
        const diasDisponibles = diasPendientes - diasConsumidos;

        if (diasDisponibles <= 0) return;

        map.set(balance.employee_id, {
          employee_id: balance.employee_id,
          employee,
          dias_pendientes: diasPendientes,
          dias_consumidos: diasConsumidos,
          dias_disponibles: diasDisponibles,
        });
      }
    });

    return Array.from(map.values())
      .filter((b) => b.dias_disponibles > 0)
      .sort((a, b) => b.dias_disponibles - a.dias_disponibles);
  }, [balances, employees]);

  const selectedBalance = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employeesWithBalance.find(
      (b) => b.employee_id === selectedEmployeeId
    );
  }, [employeesWithBalance, selectedEmployeeId]);

  const consumeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBalance) {
        throw new Error("Selecciona un empleado con saldo disponible");
      }

      const amount = Number(daysToConsume);

      if (!amount || amount <= 0) {
        throw new Error("Introduce un número de días válido");
      }

      const max = selectedBalance.dias_disponibles;

      if (amount > max) {
        throw new Error(
          `No puedes consumir más de ${max} día(s) disponibles`
        );
      }

      let remaining = amount;

      const employeeBalances = balances
        .filter((b) => b.employee_id === selectedBalance.employee_id)
        .sort((a, b) => {
          const yearA = typeof a.anio === "number" ? a.anio : parseInt(a.anio || "0", 10);
          const yearB = typeof b.anio === "number" ? b.anio : parseInt(b.anio || "0", 10);
          return yearA - yearB;
        });

      for (const balance of employeeBalances) {
        if (remaining <= 0) {
          break;
        }

        const diasPendientes = balance.dias_pendientes || 0;
        const diasConsumidos = balance.dias_consumidos || 0;
        const disponiblesFila = diasPendientes - diasConsumidos;

        if (disponiblesFila <= 0) {
          continue;
        }

        const toConsume = Math.min(remaining, disponiblesFila);
        const updatedConsumidos = diasConsumidos + toConsume;
        const updatedDisponibles = diasPendientes - updatedConsumidos;

        await base44.entities.VacationPendingBalance.update(balance.id, {
          dias_consumidos: updatedConsumidos,
          dias_disponibles: updatedDisponibles,
        });

        remaining -= toConsume;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vacationPendingBalances"] });
      toast.success("Consumo de vacaciones pendientes registrado");
      setDaysToConsume("");
    },
    onError: (error) => {
      toast.error(error?.message || "Error al registrar consumo");
    },
  });

  return (
    <Card className="shadow-lg border-2 border-emerald-100">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-b">
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-emerald-600" />
          Gestión de Consumo de Vacaciones Pendientes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Empleado con saldo</Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent>
                {employeesWithBalance.map((b) => (
                  <SelectItem key={b.employee_id} value={b.employee_id}>
                    {b.employee?.nombre} ({b.dias_disponibles} días)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Días disponibles</Label>
            <Input
              value={
                selectedBalance ? selectedBalance.dias_disponibles : ""
              }
              readOnly
            />
          </div>

          <div className="space-y-2">
            <Label>Días a consumir</Label>
            <Input
              type="number"
              min={1}
              max={selectedBalance ? selectedBalance.dias_disponibles : 0}
              value={daysToConsume}
              onChange={(e) => setDaysToConsume(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => consumeMutation.mutate()}
            disabled={
              !selectedBalance ||
              !daysToConsume ||
              consumeMutation.isPending
            }
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {consumeMutation.isPending ? "Guardando..." : "Registrar consumo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
