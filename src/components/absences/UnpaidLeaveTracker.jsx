import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Save, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

const DEFAULT_MAX_HOURS_PER_YEAR = 0; // Por defecto 0, debe configurarse

export default function UnpaidLeaveTracker({ employees = [] }) {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [requestDate, setRequestDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [hoursRequested, setHoursRequested] = useState("");
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [newLimit, setNewLimit] = useState("");

  // Usamos UnpaidLeaveBalance como almacenamiento del historial (logs)
  // Aunque los totales reales se sincronizan con la ficha de empleado
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

  const employeeLimit = useMemo(() => {
    if (!selectedEmployee) return DEFAULT_MAX_HOURS_PER_YEAR;
    // Prioridad: campo específico en ficha de empleado
    return selectedEmployee.horas_causa_mayor_limite ?? DEFAULT_MAX_HOURS_PER_YEAR;
  }, [selectedEmployee]);

  const employeeConsumed = useMemo(() => {
    if (!selectedEmployee) return 0;
    return selectedEmployee.horas_causa_mayor_consumidas || 0;
  }, [selectedEmployee]);

  const remainingHours = useMemo(() => {
    return Math.max(0, employeeLimit - employeeConsumed);
  }, [employeeLimit, employeeConsumed]);

  // Historial desde UnpaidLeaveBalance (tratando 'dias' como 'horas' en la estructura existente)
  const employeeHistory = useMemo(() => {
    if (!selectedEmployeeId) return [];
    const balance = balances.find(b => b.employee_id === selectedEmployeeId);
    return balance?.consumos || [];
  }, [balances, selectedEmployeeId]);

  const updateLimitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployeeId) return;
      
      await base44.entities.EmployeeMasterDatabase.update(selectedEmployeeId, {
        horas_causa_mayor_limite: parseFloat(newLimit) || 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employeeMasterDatabase"] });
      setIsEditingLimit(false);
      toast.success("Límite de horas actualizado correctamente");
    },
    onError: () => toast.error("Error al actualizar límite")
  });

  const trackMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployeeId) throw new Error("Selecciona un empleado");

      const amount = Number(hoursRequested);
      if (!amount || amount <= 0) throw new Error("Introduce un número de horas válido");
      if (amount > remainingHours) throw new Error(`No puedes registrar más de ${remainingHours} horas disponibles`);

      const updatedConsumed = (selectedEmployee.horas_causa_mayor_consumidas || 0) + amount;

      // 1. Actualizar ficha de empleado (Consolidación)
      await base44.entities.EmployeeMasterDatabase.update(selectedEmployeeId, {
        horas_causa_mayor_consumidas: updatedConsumed,
        ultimo_reset_causa_mayor: new Date().toISOString().slice(0, 10)
      });

      // 2. Guardar historial en UnpaidLeaveBalance (reutilizando entidad)
      // Buscamos si existe balance para este año
      const existingBalance = balances.find(b => b.employee_id === selectedEmployeeId);
      
      const newEntry = {
        fecha: requestDate,
        dias: amount, // Usamos el campo 'dias' para guardar 'horas'
        concepto: "Causa Mayor"
      };

      if (existingBalance) {
        await base44.entities.UnpaidLeaveBalance.update(existingBalance.id, {
          dias_consumidos: updatedConsumed, // Sincronizamos también aquí por redundancia
          dias_disponibles: Math.max(0, employeeLimit - updatedConsumed),
          consumos: [...(existingBalance.consumos || []), newEntry]
        });
      } else {
        await base44.entities.UnpaidLeaveBalance.create({
          employee_id: selectedEmployeeId,
          anio: currentYear,
          dias_consumidos: updatedConsumed,
          dias_disponibles: Math.max(0, employeeLimit - updatedConsumed),
          consumos: [newEntry]
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employeeMasterDatabase"] });
      queryClient.invalidateQueries({ queryKey: ["unpaidLeaveBalances"] });
      toast.success("Consumo de horas registrado correctamente");
      setHoursRequested("");
    },
    onError: (error) => {
      toast.error(error?.message || "Error al registrar consumo");
    },
  });

  return (
    <Card className="shadow-lg border-2 border-amber-200">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <Clock className="w-5 h-5" />
          Gestión de Ausencias por Causa Mayor
        </CardTitle>
        <p className="text-sm text-amber-700 mt-1">
          Control de bolsa de horas por causa mayor (Fuerza Mayor) anuales
        </p>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Empleado</Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={(val) => {
                setSelectedEmployeeId(val);
                setNewLimit(""); 
              }}
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
            <Label>Fecha de consumo</Label>
            <Input
              type="date"
              value={requestDate}
              onChange={(e) => setRequestDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Horas a registrar (Disp: {remainingHours}h)
            </Label>
            <Input
              type="number"
              min={0.5}
              step={0.5}
              max={remainingHours}
              value={hoursRequested}
              onChange={(e) => setHoursRequested(e.target.value)}
              disabled={!selectedEmployee}
            />
          </div>
        </div>

        {selectedEmployee && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-slate-50 p-3 rounded border flex flex-col justify-between">
                <p className="text-xs text-slate-600">Límite Anual Configurable</p>
                <div className="flex justify-between items-end">
                  <p className="font-semibold text-slate-900 text-lg">
                    {employeeLimit} horas
                  </p>
                  <Dialog open={isEditingLimit} onOpenChange={setIsEditingLimit}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setNewLimit(employeeLimit.toString())}>
                        <Edit2 className="w-3 h-3 text-slate-700" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Configurar Límite de Horas</DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        <Label>Nuevo límite anual (horas)</Label>
                        <Input 
                          type="number" 
                          step="0.5" 
                          value={newLimit} 
                          onChange={(e) => setNewLimit(e.target.value)} 
                          className="mt-2"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditingLimit(false)}>Cancelar</Button>
                        <Button onClick={() => updateLimitMutation.mutate()} disabled={updateLimitMutation.isPending}>
                          Guardar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="bg-red-50 p-3 rounded border border-red-100">
                <p className="text-xs text-red-700">Horas Consumidas</p>
                <p className="font-bold text-red-900 text-lg">
                  {employeeConsumed} h
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded border border-green-100">
                <p className="text-xs text-green-700">Horas Disponibles</p>
                <p className="font-bold text-green-900 text-lg">
                  {remainingHours} h
                </p>
              </div>
            </div>

            {employeeHistory.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-slate-500" />
                  Historial de consumos (Causa Mayor)
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {employeeHistory.map((c, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-slate-700 bg-slate-50 border rounded px-2 py-1 flex justify-between"
                    >
                      <span>
                        {format(new Date(c.fecha), "dd/MM/yyyy", { locale: es })}
                      </span>
                      <span className="font-semibold">
                        {c.dias} horas
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
              !hoursRequested ||
              trackMutation.isPending ||
              Number(hoursRequested) <= 0
            }
            className="bg-amber-600 hover:bg-amber-700 gap-2"
          >
            <Save className="w-4 h-4" />
            {trackMutation.isPending ? "Guardando..." : "Registrar Consumo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
