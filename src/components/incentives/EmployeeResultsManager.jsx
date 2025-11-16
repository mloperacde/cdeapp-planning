import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Plus, User } from "lucide-react";
import { toast } from "sonner";

export default function EmployeeResultsManager() {
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [uploadingFile, setUploadingFile] = useState(false);
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ['incentivePlans'],
    queryFn: () => base44.entities.IncentivePlan.filter({ activo: true }),
    initialData: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
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

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  const handleProductivityImport = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedPlanData) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const productivityParam = selectedPlanData.parametros_disponibles?.find(p => 
        p.nombre.toLowerCase().includes("productividad") && p.importable_excel
      );

      if (!productivityParam) {
        toast.error("No hay parámetro de productividad importable configurado");
        setUploadingFile(false);
        return;
      }

      const extractionSchema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            codigo_empleado: { type: "string" },
            nombre_empleado: { type: "string" },
            productividad: { type: "number" },
            departamento: { type: "string" }
          }
        }
      };

      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: extractionSchema
      });

      if (extractionResult.status === "error") {
        toast.error("Error al extraer datos del archivo");
        setUploadingFile(false);
        return;
      }

      const extractedData = extractionResult.output || [];
      let updated = 0;

      for (const row of extractedData) {
        const employee = employees.find(e => 
          e.codigo_empleado === row.codigo_empleado || 
          e.nombre.toLowerCase() === row.nombre_empleado?.toLowerCase()
        );

        if (!employee) continue;

        const deptConfig = configs.find(c => c.departamento === employee.departamento);
        if (!deptConfig) continue;

        const objetivo = deptConfig.objetivos?.find(obj => obj.parametro === productivityParam.nombre);
        if (!objetivo) continue;

        const valorObtenido = row.productividad;
        const porcentajeCumplimiento = (valorObtenido / objetivo.meta_objetivo) * 100;
        const puntosObtenidos = (porcentajeCumplimiento * objetivo.peso_porcentaje) / 100;

        const existingResult = results.find(r => 
          r.employee_id === employee.id && 
          r.incentive_plan_id === selectedPlan
        );

        const resultData = existingResult ? { ...existingResult } : {
          incentive_plan_id: selectedPlan,
          employee_id: employee.id,
          departamento: employee.departamento,
          periodo_evaluacion: `${selectedPlanData.anio}`,
          resultados: []
        };

        const paramIndex = resultData.resultados.findIndex(r => r.parametro === productivityParam.nombre);
        const paramResult = {
          parametro: productivityParam.nombre,
          valor_obtenido: valorObtenido,
          meta_objetivo: objetivo.meta_objetivo,
          peso_porcentaje: objetivo.peso_porcentaje,
          porcentaje_cumplimiento: porcentajeCumplimiento,
          puntos_obtenidos: puntosObtenidos
        };

        if (paramIndex >= 0) {
          resultData.resultados[paramIndex] = paramResult;
        } else {
          resultData.resultados.push(paramResult);
        }

        if (existingResult) {
          await base44.entities.EmployeeIncentiveResult.update(existingResult.id, resultData);
        } else {
          await base44.entities.EmployeeIncentiveResult.create(resultData);
        }

        updated++;
      }

      queryClient.invalidateQueries({ queryKey: ['employeeIncentiveResults'] });
      toast.success(`${updated} empleado(s) actualizado(s) con datos de productividad`);
      e.target.value = null;
    } catch (error) {
      console.error("Error importing:", error);
      toast.error("Error al importar archivo");
    } finally {
      setUploadingFile(false);
    }
  };

  const downloadTemplate = () => {
    const csv = "codigo_empleado,nombre_empleado,productividad,departamento\nEMP001,Juan Pérez,95.5,Producción\nEMP002,María García,87.3,Producción";
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_productividad.csv';
    link.click();
  };

  const filteredResults = useMemo(() => {
    return results.filter(r => 
      selectedDepartment === "all" || r.departamento === selectedDepartment
    );
  }, [results, selectedDepartment]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Gestión de Resultados</h2>

      <Card>
        <CardContent className="p-6 space-y-4">
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
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedPlan && (
            <div className="flex gap-2 pt-4 border-t">
              <input
                type="file"
                id="productivity-import"
                accept=".xlsx,.xls,.csv"
                onChange={handleProductivityImport}
                className="hidden"
              />
              <Button
                onClick={() => document.getElementById('productivity-import').click()}
                disabled={uploadingFile}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadingFile ? "Importando..." : "Importar Productividad (Excel)"}
              </Button>
              <Button onClick={downloadTemplate} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Plantilla
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPlan && (
        <div className="grid grid-cols-1 gap-3">
          {filteredResults.map(result => {
            const employee = employees.find(e => e.id === result.employee_id);
            
            return (
              <Card key={result.id} className="border-2 border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-5 h-5 text-blue-600" />
                        <h4 className="font-bold text-slate-900">{employee?.nombre}</h4>
                        <Badge variant="outline">{result.departamento}</Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {result.resultados?.map((r, idx) => (
                          <Card key={idx} className="bg-slate-50">
                            <CardContent className="p-2">
                              <p className="text-xs text-slate-600">{r.parametro}</p>
                              <p className="text-lg font-bold text-slate-900">{r.valor_obtenido}</p>
                              <p className="text-xs text-slate-500">Meta: {r.meta_objetivo}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredResults.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-slate-500">No hay resultados registrados</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}