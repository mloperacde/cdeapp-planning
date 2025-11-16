import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Building2, Target, Users, Briefcase, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function DepartmentObjectiveConfig() {
  const [selectedPlan, setSelectedPlan] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
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

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DepartmentIncentiveConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departmentIncentiveConfigs'] });
      toast.success("Configuración eliminada");
    }
  });

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  const handleEdit = (config) => {
    setEditingConfig(config);
    setShowForm(true);
  };

  const handleDelete = (config) => {
    if (window.confirm("¿Eliminar configuración?")) {
      deleteMutation.mutate(config.id);
    }
  };

  const groupedConfigs = useMemo(() => {
    const grouped = {};
    configs.forEach(config => {
      const key = config.departamento;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(config);
    });
    return grouped;
  }, [configs]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Configuración por Departamento y Puesto</h2>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label>Seleccionar Plan de Incentivos</Label>
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
            {selectedPlan && (
              <Button onClick={() => setShowForm(true)} className="bg-emerald-600">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Configuración
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedPlan && (
        <div className="space-y-4">
          {Object.entries(groupedConfigs).map(([dept, deptConfigs]) => (
            <Card key={dept} className="border-2 border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  {dept}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {deptConfigs.map(config => {
                  const applicableEmployees = config.empleados_aplicables?.length > 0
                    ? employees.filter(e => config.empleados_aplicables.includes(e.id))
                    : employees.filter(e => 
                        e.departamento === config.departamento && 
                        (!config.puesto || e.puesto === config.puesto)
                      );

                  return (
                    <Card key={config.id} className="border bg-white">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Briefcase className="w-4 h-4 text-purple-600" />
                              <span className="font-bold text-slate-900">
                                {config.puesto || "Todos los puestos"}
                              </span>
                              <Badge className="bg-emerald-600 text-white">
                                {config.incentivo_base}€
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Users className="w-3 h-3" />
                              {applicableEmployees.length} empleado(s) aplicable(s)
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(config)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(config)}>
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {config.objetivos?.map((obj, idx) => (
                            <Card key={idx} className="bg-slate-50 border">
                              <CardContent className="p-2">
                                <div className="flex items-center gap-1 mb-1">
                                  <Target className="w-3 h-3 text-blue-600" />
                                  <span className="text-xs font-semibold">{obj.parametro}</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                  <Badge variant="outline" className="text-xs">{obj.peso_porcentaje}%</Badge>
                                  <span className="text-xs text-slate-600">Meta: {obj.meta_objetivo}</span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {applicableEmployees.length > 0 && (
                          <details className="mt-3">
                            <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                              Ver empleados ({applicableEmployees.length})
                            </summary>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {applicableEmployees.map(emp => (
                                <Badge key={emp.id} variant="outline" className="text-xs">
                                  {emp.nombre}
                                </Badge>
                              ))}
                            </div>
                          </details>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>
          ))}

          {configs.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-4">No hay configuraciones para este plan</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {showForm && selectedPlanData && (
        <ConfigForm
          config={editingConfig}
          plan={selectedPlanData}
          departments={departments}
          employees={employees}
          onClose={() => {
            setShowForm(false);
            setEditingConfig(null);
          }}
        />
      )}
    </div>
  );
}

function ConfigForm({ config, plan, departments, employees, onClose }) {
  const [formData, setFormData] = useState(config || {
    incentive_plan_id: plan.id,
    departamento: "",
    puesto: "",
    empleados_aplicables: [],
    objetivos: [],
    incentivo_base: 0,
    formula_calculo: "Promedio Ponderado",
    activo: true
  });

  const queryClient = useQueryClient();

  const puestos = useMemo(() => {
    if (!formData.departamento) return [];
    const psts = new Set();
    employees.forEach(emp => {
      if (emp.departamento === formData.departamento && emp.puesto) {
        psts.add(emp.puesto);
      }
    });
    return Array.from(psts).sort();
  }, [formData.departamento, employees]);

  const availableEmployees = useMemo(() => {
    return employees.filter(e => 
      e.departamento === formData.departamento && 
      (!formData.puesto || e.puesto === formData.puesto)
    );
  }, [formData.departamento, formData.puesto, employees]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (config?.id) {
        return base44.entities.DepartmentIncentiveConfig.update(config.id, data);
      }
      return base44.entities.DepartmentIncentiveConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departmentIncentiveConfigs'] });
      toast.success(config ? "Configuración actualizada" : "Configuración creada");
      onClose();
    }
  });

  const addObjective = () => {
    if (formData.objetivos.length >= 6) {
      toast.error("Máximo 6 objetivos permitidos");
      return;
    }
    setFormData({
      ...formData,
      objetivos: [
        ...formData.objetivos,
        { parametro: "", peso_porcentaje: 0, meta_objetivo: 0, umbral_minimo: 0, descripcion: "" }
      ]
    });
  };

  const updateObjective = (index, field, value) => {
    const updated = [...formData.objetivos];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, objetivos: updated });
  };

  const removeObjective = (index) => {
    const updated = formData.objetivos.filter((_, i) => i !== index);
    setFormData({ ...formData, objetivos: updated });
  };

  const toggleEmployee = (empId) => {
    const current = formData.empleados_aplicables || [];
    const updated = current.includes(empId)
      ? current.filter(id => id !== empId)
      : [...current, empId];
    setFormData({ ...formData, empleados_aplicables: updated });
  };

  const totalWeight = formData.objetivos.reduce((sum, obj) => sum + (parseFloat(obj.peso_porcentaje) || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (totalWeight !== 100) {
      toast.error("La suma de los pesos debe ser 100%");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config ? "Editar Configuración" : "Nueva Configuración"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Departamento *</Label>
              <Select value={formData.departamento} onValueChange={(value) => setFormData({...formData, departamento: value, puesto: "", empleados_aplicables: []})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Puesto (opcional)</Label>
              <Select value={formData.puesto} onValueChange={(value) => setFormData({...formData, puesto: value, empleados_aplicables: []})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos los puestos</SelectItem>
                  {puestos.map(puesto => (
                    <SelectItem key={puesto} value={puesto}>{puesto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Incentivo Base (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.incentivo_base}
                onChange={(e) => setFormData({...formData, incentivo_base: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          {formData.departamento && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Empleados Aplicables ({availableEmployees.length})
                  </Label>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-600">
                      {formData.empleados_aplicables?.length > 0 
                        ? `${formData.empleados_aplicables.length} seleccionado(s)` 
                        : "Todos del departamento/puesto"}
                    </span>
                  </div>
                </div>
                
                <div className="border rounded p-3 bg-white max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {availableEmployees.map(emp => (
                      <div key={emp.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.empleados_aplicables?.includes(emp.id)}
                          onCheckedChange={() => toggleEmployee(emp.id)}
                        />
                        <label className="text-sm cursor-pointer flex-1" onClick={() => toggleEmployee(emp.id)}>
                          {emp.nombre} {emp.puesto && `- ${emp.puesto}`}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-blue-700">
                  💡 Si no seleccionas empleados, se aplicará a todos los del {formData.puesto ? "puesto" : "departamento"}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label>Fórmula de Cálculo</Label>
            <Select value={formData.formula_calculo} onValueChange={(value) => setFormData({...formData, formula_calculo: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Promedio Ponderado">Promedio Ponderado</SelectItem>
                <SelectItem value="Cumplimiento Total">Cumplimiento Total</SelectItem>
                <SelectItem value="Mínimo Requerido">Mínimo Requerido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Objetivos (máx. 6)</Label>
                <p className="text-xs text-slate-600">Peso total: {totalWeight}% / 100%</p>
              </div>
              {formData.objetivos.length < 6 && (
                <Button type="button" onClick={addObjective} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir Objetivo
                </Button>
              )}
            </div>

            {formData.objetivos.map((obj, idx) => (
              <Card key={idx} className="border-2 border-slate-200">
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <Label>Parámetro *</Label>
                      <Select value={obj.parametro} onValueChange={(value) => updateObjective(idx, 'parametro', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {plan.parametros_disponibles?.map(param => (
                            <SelectItem key={param.nombre} value={param.nombre}>
                              {param.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Peso % *</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={obj.peso_porcentaje}
                        onChange={(e) => updateObjective(idx, 'peso_porcentaje', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Meta *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={obj.meta_objetivo}
                        onChange={(e) => updateObjective(idx, 'meta_objetivo', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Umbral Mínimo</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={obj.umbral_minimo}
                        onChange={(e) => updateObjective(idx, 'umbral_minimo', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Descripción del objetivo"
                      value={obj.descripcion}
                      onChange={(e) => updateObjective(idx, 'descripcion', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeObjective(idx)}
                      className="text-red-600"
                    >
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || totalWeight !== 100}>
              {saveMutation.isPending ? "Guardando..." : config ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}