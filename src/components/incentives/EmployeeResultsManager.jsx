import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Download, Plus, User, Edit2, Save } from "lucide-react";
import { toast } from "sonner";

export default function EmployeeResultsManager() {
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ['incentivePlans'],
    queryFn: () => base44.entities.IncentivePlan.filter({ activo: true }),
    initialData: [],
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    initialData: [],
    staleTime: 5 * 60 * 1000,
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['departmentIncentiveConfigs', selectedPlan],
    queryFn: () => selectedPlan 
      ? base44.entities.DepartmentIncentiveConfig.filter({ incentive_plan_id: selectedPlan })
      : Promise.resolve([]),
    initialData: [],
    enabled: !!selectedPlan,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['employeeIncentiveResults', selectedPlan],
    queryFn: () => selectedPlan 
      ? base44.entities.EmployeeIncentiveResult.filter({ incentive_plan_id: selectedPlan })
      : Promise.resolve([]),
    initialData: [],
    enabled: !!selectedPlan,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const departments = useMemo(() => {
    const depts = new Set();
    configs.forEach(c => {
      if (c.departamento) depts.add(c.departamento);
    });
    return Array.from(depts).sort();
  }, [configs]);

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  const employeesInPlan = useMemo(() => {
    const empList = [];
    configs.forEach(config => {
      const applicable = config.empleados_aplicables?.length > 0
        ? employees.filter(e => config.empleados_aplicables.includes(e.id))
        : employees.filter(e => 
            e.departamento === config.departamento && 
            (!config.puesto || e.puesto === config.puesto)
          );
      
      applicable.forEach(emp => {
        if (!empList.find(e => e.id === emp.id)) {
          empList.push({ ...emp, config });
        }
      });
    });
    return empList;
  }, [configs, employees]);

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

        const deptConfig = configs.find(c => 
          c.departamento === employee.departamento &&
          (!c.puesto || c.puesto === employee.puesto) &&
          (!c.empleados_aplicables?.length || c.empleados_aplicables.includes(employee.id))
        );
        
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
      toast.success(`${updated} empleado(s) actualizado(s)`);
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

  const handleManualEntry = (employee) => {
    setSelectedEmployee(employee);
    setShowManualEntry(true);
  };

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
        <>
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-5 h-5 text-blue-600" />
                Empleados en el Plan ({employeesInPlan.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {employeesInPlan.map(emp => (
                <div key={emp.id} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <span className="font-semibold text-slate-900">{emp.nombre}</span>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{emp.departamento}</Badge>
                      {emp.puesto && <Badge variant="outline" className="text-xs">{emp.puesto}</Badge>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleManualEntry(emp)}>
                    <Edit2 className="w-3 h-3 mr-1" />
                    Ingresar Resultados
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

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
                      <Button size="sm" variant="ghost" onClick={() => handleManualEntry(employee)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
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
        </>
      )}

      {showManualEntry && selectedEmployee && (
        <ManualEntryDialog
          employee={selectedEmployee}
          plan={selectedPlanData}
          configs={configs}
          existingResult={results.find(r => r.employee_id === selectedEmployee.id)}
          onClose={() => {
            setShowManualEntry(false);
            setSelectedEmployee(null);
          }}
        />
      )}
    </div>
  );
}

function ManualEntryDialog({ employee, plan, configs, existingResult, onClose }) {
  const config = configs.find(c => 
    c.departamento === employee.departamento &&
    (!c.puesto || c.puesto === employee.puesto) &&
    (!c.empleados_aplicables?.length || c.empleados_aplicables.includes(employee.id))
  );

  const [formData, setFormData] = useState(() => {
    const base = {
      incentive_plan_id: plan.id,
      employee_id: employee.id,
      departamento: employee.departamento,
      periodo_evaluacion: `${plan.anio}`,
      resultados: []
    };

    if (existingResult) {
      return existingResult;
    }

    if (config) {
      base.resultados = config.objetivos.map(obj => ({
        parametro: obj.parametro,
        valor_obtenido: 0,
        meta_objetivo: obj.meta_objetivo,
        peso_porcentaje: obj.peso_porcentaje,
        porcentaje_cumplimiento: 0,
        puntos_obtenidos: 0
      }));
    }

    return base;
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const calculatedResults = data.resultados.map(r => {
        const porcentajeCumplimiento = (r.valor_obtenido / r.meta_objetivo) * 100;
        const puntosObtenidos = (porcentajeCumplimiento * r.peso_porcentaje) / 100;
        return {
          ...r,
          porcentaje_cumplimiento: porcentajeCumplimiento,
          puntos_obtenidos: puntosObtenidos
        };
      });

      const finalData = {
        ...data,
        resultados: calculatedResults
      };

      if (existingResult?.id) {
        return base44.entities.EmployeeIncentiveResult.update(existingResult.id, finalData);
      }
      return base44.entities.EmployeeIncentiveResult.create(finalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeIncentiveResults'] });
      toast.success("Resultados guardados");
      onClose();
    }
  });

  const updateResult = (index, value) => {
    const updated = [...formData.resultados];
    updated[index] = { ...updated[index], valor_obtenido: parseFloat(value) || 0 };
    setFormData({ ...formData, resultados: updated });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ingresar Resultados - {employee.nombre}</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(formData); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Badge variant="outline">{formData.departamento}</Badge>
            </div>
            <div>
              <Badge>{formData.periodo_evaluacion}</Badge>
            </div>
          </div>

          <div className="space-y-3">
            {formData.resultados?.map((r, idx) => (
              <Card key={idx} className="border-2 border-slate-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4 items-end">
                    <div>
                      <Label className="text-sm font-semibold">{r.parametro}</Label>
                      <p className="text-xs text-slate-600">Peso: {r.peso_porcentaje}%</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Valor Obtenido</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={r.valor_obtenido}
                        onChange={(e) => updateResult(idx, e.target.value)}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Meta: {r.meta_objetivo}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} className="bg-emerald-600">
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Guardando..." : "Guardar Resultados"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}