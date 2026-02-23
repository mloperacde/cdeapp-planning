import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { syncEmployeeVacationProtection } from "./VacationPendingCalculator";
import { format } from "date-fns";

export default function VacationWorkCompensationManager({ employees = [] }) {
  const queryClient = useQueryClient();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [days, setDays] = useState("1");
  const [reason, setReason] = useState("");

  const { data: balances = [] } = useQuery({
    queryKey: ["vacationPendingBalances"],
    queryFn: () => base44.entities.VacationPendingBalance.list(),
    initialData: [],
  });

  const employeesWithBalance = useMemo(() => {
    const map = new Map();

    balances.forEach((balance) => {
      if (!balance || !balance.employee_id) return;
      const employee = employees.find((e) => e.id === balance.employee_id);
      if (!employee) return;

      const diasPendientes = balance.dias_pendientes || 0;
      const diasConsumidos = balance.dias_consumidos || 0;
      const disponibles = diasPendientes - diasConsumidos;
      if (disponibles <= 0) return;

      const current = map.get(balance.employee_id) || { employee, dias_disponibles: 0 };
      current.dias_disponibles += disponibles;
      map.set(balance.employee_id, current);
    });

    return Array.from(map.values()).sort((a, b) => b.dias_disponibles - a.dias_disponibles);
  }, [balances, employees]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployeeId) {
        throw new Error("Selecciona un empleado");
      }
      if (!workDate) {
        throw new Error("Selecciona la fecha trabajada");
      }
      const amount = Number(days);
      if (!amount || amount <= 0) {
        throw new Error("Introduce un número de días válido");
      }

      const employeeId = selectedEmployeeId;
      const dateObj = new Date(workDate);
      if (isNaN(dateObj.getTime())) {
        throw new Error("Fecha trabajada no válida");
      }
      const year = dateObj.getFullYear();

      const balancesForEmployeeYear = await base44.entities.VacationPendingBalance.filter({
        employee_id: employeeId,
        anio: year,
      });

      const detalleItem = {
        absence_id: `COMP-${employeeId}-${workDate}-${Date.now()}`,
        tipo_ausencia: "Compensación trabajo festivo/fin de semana",
        fecha_inicio: format(dateObj, "yyyy-MM-dd"),
        fecha_fin: format(dateObj, "yyyy-MM-dd"),
        dias_coincidentes: amount,
        periodos_vacaciones: [],
        origen: "compensacion_trabajo",
        motivo: reason || "",
      };

      if (balancesForEmployeeYear.length > 0) {
        const balance = balancesForEmployeeYear[0];
        const detalleAusencias = Array.isArray(balance.detalle_ausencias)
          ? [...balance.detalle_ausencias, detalleItem]
          : [detalleItem];

        const totalDiasPendientes = detalleAusencias.reduce(
          (sum, d) => sum + (d.dias_coincidentes || 0),
          0
        );
        const diasDisponibles = totalDiasPendientes - (balance.dias_consumidos || 0);

        await base44.entities.VacationPendingBalance.update(balance.id, {
          dias_pendientes: totalDiasPendientes,
          dias_disponibles: diasDisponibles,
          detalle_ausencias: detalleAusencias,
        });
      } else {
        const totalDiasPendientes = amount;
        await base44.entities.VacationPendingBalance.create({
          employee_id: employeeId,
          anio: year,
          dias_pendientes: totalDiasPendientes,
          dias_consumidos: 0,
          dias_disponibles: totalDiasPendientes,
          detalle_ausencias: [detalleItem],
        });
      }

      await syncEmployeeVacationProtection(employeeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vacationPendingBalances"] });
      queryClient.invalidateQueries({ queryKey: ["employeeMasterDatabase"] });
      toast.success("Día(s) compensatorios registrados en el saldo de vacaciones");
      setWorkDate("");
      setDays("1");
      setReason("");
    },
    onError: (error) => {
      toast.error(error?.message || "Error al registrar compensación");
    },
  });

  return (
    <Card className="shadow-lg border-2 border-blue-100">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-blue-600" />
          Compensación por trabajo en festivos/fin de semana
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fecha trabajada</Label>
            <Input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Días a compensar</Label>
            <Input
              type="number"
              min={0.25}
              step={0.25}
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Motivo / detalle</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Trabajo en festivo local"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !selectedEmployeeId || !workDate}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {mutation.isPending ? "Guardando..." : "Añadir al saldo de vacaciones"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

