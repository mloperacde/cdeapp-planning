import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ResidualDaysManager({ employees = [] }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const queryClient = useQueryClient();

  const { data: absenceDaysBalances = [] } = useQuery({
    queryKey: ['absenceDaysBalances', selectedYear],
    queryFn: () => base44.entities.AbsenceDaysBalance.filter({ anio: selectedYear }),
    initialData: [],
  });

  const { data: absences = [] } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: [],
  });

  const calculateResidualMutation = useMutation({
    mutationFn: async ({ employeeId }) => {
      const employeeAbsences = absences.filter(a => 
        a.employee_id === employeeId && 
        new Date(a.fecha_inicio).getFullYear() === selectedYear
      );

      const permitTypes = [
        "Vacaciones",
        "Asuntos Propios",
        "Permiso Matrimonio",
        "Permiso Paternidad/Maternidad",
        "Permiso Lactancia",
        "Permiso Médico Familiar"
      ];

      const balances = [];

      for (const permitType of permitTypes) {
        const typeAbsences = employeeAbsences.filter(a => a.motivo === permitType);
        
        let diasDisfrutados = 0;
        const periodosDisfrutados = [];

        typeAbsences.forEach(abs => {
          const start = new Date(abs.fecha_inicio);
          const end = new Date(abs.fecha_fin);
          let days = 0;
          
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
              days++;
            }
          }
          
          diasDisfrutados += days;
          periodosDisfrutados.push({
            fecha_inicio: format(start, 'yyyy-MM-dd'),
            fecha_fin: format(end, 'yyyy-MM-dd'),
            dias_consumidos: days,
            absence_id: abs.id
          });
        });

        if (diasDisfrutados > 0) {
          const existingBalance = absenceDaysBalances.find(
            b => b.employee_id === employeeId && b.tipo_permiso === permitType && b.anio === selectedYear
          );

          const defaultDays = permitType === "Vacaciones" ? 22 : permitType === "Asuntos Propios" ? 4 : 0;

          const balanceData = {
            employee_id: employeeId,
            anio: selectedYear,
            tipo_permiso: permitType,
            dias_totales_derecho: defaultDays,
            dias_disfrutados: diasDisfrutados,
            dias_pendientes: Math.max(0, defaultDays - diasDisfrutados),
            periodos_disfrutados: periodosDisfrutados
          };

          if (existingBalance) {
            await base44.entities.AbsenceDaysBalance.update(existingBalance.id, balanceData);
          } else {
            await base44.entities.AbsenceDaysBalance.create(balanceData);
          }

          balances.push(balanceData);
        }
      }

      return balances;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absenceDaysBalances'] });
      toast.success("Días residuales calculados correctamente");
    },
  });

  const employeeBalances = useMemo(() => {
    if (!selectedEmployee) return [];
    return absenceDaysBalances.filter(b => b.employee_id === selectedEmployee);
  }, [absenceDaysBalances, selectedEmployee]);

  const totalResidual = useMemo(() => {
    return employeeBalances.reduce((sum, b) => sum + (b.dias_pendientes || 0), 0);
  }, [employeeBalances]);

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Gestión de Días Residuales de Permisos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Este sistema calcula automáticamente los días de permisos no consumidos basándose en las ausencias registradas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Año</Label>
            <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Empleado</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedEmployee && (
          <div className="space-y-4">
            <Button
              onClick={() => calculateResidualMutation.mutate({ employeeId: selectedEmployee })}
              disabled={calculateResidualMutation.isPending}
              className="w-full bg-blue-600"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {calculateResidualMutation.isPending ? "Calculando..." : "Calcular Días Residuales"}
            </Button>

            {employeeBalances.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <span className="text-sm font-semibold text-green-900">Total Días Residuales</span>
                  <Badge className="bg-green-600 text-white text-2xl px-4 py-1">
                    {totalResidual}
                  </Badge>
                </div>

                {employeeBalances.map(balance => (
                  <Card key={balance.id} className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{balance.tipo_permiso}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <div className="font-bold text-blue-900">{balance.dias_totales_derecho}</div>
                          <div className="text-xs text-blue-700">Derecho</div>
                        </div>
                        <div className="text-center p-2 bg-red-50 rounded">
                          <div className="font-bold text-red-900">{balance.dias_disfrutados}</div>
                          <div className="text-xs text-red-700">Consumidos</div>
                        </div>
                        <div className="text-center p-2 bg-green-50 rounded">
                          <div className="font-bold text-green-900">{balance.dias_pendientes}</div>
                          <div className="text-xs text-green-700">Pendientes</div>
                        </div>
                      </div>

                      {balance.periodos_disfrutados?.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-semibold text-slate-700">Períodos disfrutados:</p>
                          {balance.periodos_disfrutados.map((periodo, idx) => (
                            <div key={idx} className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                              {format(new Date(periodo.fecha_inicio), "d MMM", { locale: es })} - 
                              {format(new Date(periodo.fecha_fin), "d MMM", { locale: es })}
                              {' '}({periodo.dias_consumidos} días)
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {employeeBalances.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No hay balances calculados para este empleado</p>
                <p className="text-sm text-slate-400 mt-1">Haz clic en "Calcular Días Residuales"</p>
              </div>
            )}
          </div>
        )}

        {!selectedEmployee && (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Selecciona un empleado para ver sus días residuales</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}