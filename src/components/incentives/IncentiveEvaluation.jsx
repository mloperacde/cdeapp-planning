import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, Award, DollarSign, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function IncentiveEvaluation() {
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ['incentivePlans'],
    queryFn: () => base44.entities.IncentivePlan.filter({ activo: true }),
    initialData: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    initialData: [],
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['departmentIncentiveConfigs', selectedPlan],
    queryFn: () => selectedPlan 
      ? base44.entities.DepartmentIncentiveConfig.filter({ incentive_plan_id: selectedPlan })
      : Promise.resolve([]),
    initialData: [],
    enabled: !!selectedPlan,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['employeeIncentiveResults', selectedPlan],
    queryFn: () => selectedPlan 
      ? base44.entities.EmployeeIncentiveResult.filter({ incentive_plan_id: selectedPlan })
      : Promise.resolve([]),
    initialData: [],
    enabled: !!selectedPlan,
  });

  const calculateMutation = useMutation({
    mutationFn: async () => {
      for (const result of results) {
        const config = configs.find(c => 
          c.departamento === result.departamento &&
          (!c.empleados_aplicables?.length || c.empleados_aplicables.includes(result.employee_id))
        );
        
        if (!config) continue;

        let cumplimientoTotal = 0;

        if (config.formula_calculo === "Promedio Ponderado") {
          cumplimientoTotal = result.resultados?.reduce((sum, r) => sum + (r.puntos_obtenidos || 0), 0) || 0;
        } else if (config.formula_calculo === "Cumplimiento Total") {
          const allMet = result.resultados?.every(r => r.valor_obtenido >= r.meta_objetivo);
          cumplimientoTotal = allMet ? 100 : 0;
        } else if (config.formula_calculo === "Mínimo Requerido") {
          const minMet = result.resultados?.every(r => r.valor_obtenido >= (config.objetivos?.find(o => o.parametro === r.parametro)?.umbral_minimo || 0));
          cumplimientoTotal = minMet ? 100 : 0;
        }

        const incentivoCalculado = (config.incentivo_base || 0) * (cumplimientoTotal / 100);

        await base44.entities.EmployeeIncentiveResult.update(result.id, {
          cumplimiento_total: cumplimientoTotal,
          incentivo_calculado: incentivoCalculado,
          fecha_evaluacion: new Date().toISOString()
        });
      }

      return results.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['employeeIncentiveResults'] });
      toast.success(`${count} evaluación(es) calculada(s)`);
    }
  });

  const departments2 = useMemo(() => {
    const depts = new Set();
    results.forEach(r => {
      if (r.departamento) depts.add(r.departamento);
    });
    return Array.from(depts).sort();
  }, [results]);

  const filteredResults = useMemo(() => {
    return results.filter(r => 
      selectedDepartment === "all" || r.departamento === selectedDepartment
    ).sort((a, b) => (b.cumplimiento_total || 0) - (a.cumplimiento_total || 0));
  }, [results, selectedDepartment]);

  const totalIncentivos = useMemo(() => {
    return filteredResults.reduce((sum, r) => sum + (r.incentivo_calculado || 0), 0);
  }, [filteredResults]);

  const exportCSV = () => {
    const csv = [
      "Empleado,Departamento,Puesto,Cumplimiento Total (%),Incentivo Calculado (€),Estado",
      ...filteredResults.map(result => {
        const emp = employees.find(e => e.id === result.employee_id);
        return [
          emp?.nombre || "Desconocido",
          result.departamento,
          emp?.puesto || "-",
          (result.cumplimiento_total || 0).toFixed(2),
          (result.incentivo_calculado || 0).toFixed(2),
          result.estado || "Pendiente"
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `evaluacion_incentivos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success("CSV exportado");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Evaluación de Cumplimiento</h2>
        <div className="flex gap-2">
          {selectedPlan && results.length > 0 && (
            <>
              <Button onClick={exportCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <Button onClick={() => calculateMutation.mutate()} className="bg-emerald-600">
                <TrendingUp className="w-4 h-4 mr-2" />
                Calcular Evaluaciones
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plan de Incentivos</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.nombre} - {plan.anio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departments2.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedPlan && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-emerald-50 border-2 border-emerald-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-700 font-medium">Total Incentivos</p>
                    <p className="text-3xl font-bold text-emerald-900">{totalIncentivos.toFixed(2)}€</p>
                  </div>
                  <DollarSign className="w-10 h-10 text-emerald-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-2 border-blue-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-700 font-medium">Empleados Evaluados</p>
                    <p className="text-3xl font-bold text-blue-900">{filteredResults.length}</p>
                  </div>
                  <Award className="w-10 h-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-2 border-purple-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-700 font-medium">Promedio Cumplimiento</p>
                    <p className="text-3xl font-bold text-purple-900">
                      {filteredResults.length > 0 
                        ? (filteredResults.reduce((sum, r) => sum + (r.cumplimiento_total || 0), 0) / filteredResults.length).toFixed(1)
                        : 0
                      }%
                    </p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            {filteredResults.map(result => {
              const employee = employees.find(e => e.id === result.employee_id);
              const cumplimiento = result.cumplimiento_total || 0;
              
              return (
                <Card key={result.id} className="border-2 border-slate-200 hover:border-emerald-300 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg text-slate-900">{employee?.nombre}</h4>
                          <Badge variant="outline">{result.departamento}</Badge>
                          {employee?.puesto && <Badge variant="outline">{employee.puesto}</Badge>}
                        </div>
                        <Badge className="mt-2">{result.periodo_evaluacion}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Incentivo a Percibir</p>
                        <p className="text-3xl font-bold text-emerald-900">
                          {result.incentivo_calculado?.toFixed(2) || "0.00"}€
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 font-medium">Cumplimiento Total</span>
                        <span className="font-bold text-slate-900">{cumplimiento.toFixed(1)}%</span>
                      </div>
                      <Progress value={cumplimiento} className="h-3" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {result.resultados?.map((r, idx) => (
                        <Card key={idx} className="bg-slate-50 border">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-1 mb-1">
                              <Target className="w-3 h-3 text-blue-600" />
                              <p className="text-xs font-medium text-slate-700">{r.parametro}</p>
                            </div>
                            <div className="flex items-baseline gap-1 mb-1">
                              <span className="text-lg font-bold text-slate-900">{r.valor_obtenido}</span>
                              <span className="text-xs text-slate-500">/ {r.meta_objetivo}</span>
                            </div>
                            <Progress value={r.porcentaje_cumplimiento} className="h-1.5 mb-1" />
                            <div className="flex justify-between items-center">
                              <p className="text-xs text-slate-600">{r.porcentaje_cumplimiento?.toFixed(1)}%</p>
                              <Badge variant="outline" className="text-xs">{r.peso_porcentaje}%</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredResults.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No hay resultados para evaluar</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}