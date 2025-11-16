import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, AlertCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { updateEmployeeAbsenteeismDaily } from "../absences/AbsenteeismCalculator";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function AbsenteeismCard({ employee }) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: () => updateEmployeeAbsenteeismDaily(employee.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success("Tasa de absentismo actualizada");
    }
  });

  const tasaAbsentismo = employee.tasa_absentismo || 0;
  
  const getAbsenteeismLevel = (tasa) => {
    if (tasa <= 3) return { label: "Bajo", color: "green", bg: "bg-green-50", text: "text-green-800", border: "border-green-200" };
    if (tasa <= 7) return { label: "Medio", color: "yellow", bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-200" };
    if (tasa <= 12) return { label: "Alto", color: "orange", bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200" };
    return { label: "Crítico", color: "red", bg: "bg-red-50", text: "text-red-800", border: "border-red-200" };
  };

  const level = getAbsenteeismLevel(tasaAbsentismo);

  return (
    <Card className={`border-2 ${level.border} ${level.bg}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Tasa de Absentismo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center">
          <div className={`text-4xl font-bold ${level.text}`}>
            {tasaAbsentismo.toFixed(2)}%
          </div>
          <Badge className={`mt-2 bg-${level.color}-600 text-white`}>
            {level.label}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white p-2 rounded border">
            <p className="text-slate-600">Horas No Trabajadas</p>
            <p className="font-bold text-slate-900">{(employee.horas_no_trabajadas || 0).toFixed(1)}h</p>
          </div>
          <div className="bg-white p-2 rounded border">
            <p className="text-slate-600">Horas Esperadas</p>
            <p className="font-bold text-slate-900">{(employee.horas_deberian_trabajarse || 0).toFixed(1)}h</p>
          </div>
        </div>

        {employee.ultima_actualizacion_absentismo && (
          <p className="text-xs text-slate-600 text-center">
            Última actualización: {format(new Date(employee.ultima_actualizacion_absentismo), "dd/MM/yyyy", { locale: es })}
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="w-full"
        >
          <RefreshCw className={`w-3 h-3 mr-2 ${updateMutation.isPending ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>

        <div className="bg-white p-3 rounded border text-xs">
          <p className="text-slate-600 font-medium mb-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Cálculo del Año en Curso
          </p>
          <p className="text-slate-500">
            Excluye vacaciones, festivos y fines de semana
          </p>
        </div>
      </CardContent>
    </Card>
  );
}