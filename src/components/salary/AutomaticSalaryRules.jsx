import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Settings, Zap } from "lucide-react";
import { toast } from "sonner";

export default function AutomaticSalaryRules() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  
  const [formData, setFormData] = useState({
    rule_name: "",
    applies_to: "Por Departamento",
    target_departments: [],
    target_positions: [],
    target_categories: [],
    component_id: "",
    calculation_type: "Fijo",
    amount: 0,
    percentage: 0,
    is_active: true,
    auto_apply: true
  });

  const { data: components = [] } = useQuery({
    queryKey: ['salaryComponents'],
    queryFn: () => base44.entities.SalaryComponent.filter({ is_active: true }),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: positions = [] } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['salaryCategories'],
    queryFn: () => base44.entities.SalaryCategory.filter({ is_active: true }),
  });

  // Simulación de reglas automáticas (normalmente vendrían de una entidad)
  const [rules, setRules] = useState([
    {
      id: "1",
      rule_name: "Plus Producción Fabricación",
      applies_to: "Por Departamento",
      target_departments: ["Fabricación"],
      component_name: "Plus Producción",
      amount: 150,
      is_active: true
    },
    {
      id: "2",
      rule_name: "Plus Responsabilidad Encargados",
      applies_to: "Por Puesto",
      target_positions: ["Encargado"],
      component_name: "Plus Responsabilidad",
      amount: 200,
      is_active: true
    }
  ]);

  const applyRulesMutation = useMutation({
    mutationFn: async () => {
      // Aquí iría la llamada al backend para aplicar reglas
      toast.info("Aplicando reglas automáticas a empleados...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { applied: 15 };
    },
    onSuccess: (data) => {
      toast.success(`Reglas aplicadas a ${data.applied} empleados`);
      queryClient.invalidateQueries({ queryKey: ['employeeSalaries'] });
    },
  });

  const handleSaveRule = () => {
    if (!formData.rule_name || !formData.component_id) {
      toast.error("Nombre de regla y componente son obligatorios");
      return;
    }

    const newRule = {
      id: Date.now().toString(),
      ...formData,
      component_name: components.find(c => c.id === formData.component_id)?.name
    };

    if (editingRule) {
      setRules(rules.map(r => r.id === editingRule.id ? newRule : r));
      toast.success("Regla actualizada");
    } else {
      setRules([...rules, newRule]);
      toast.success("Regla creada");
    }

    setIsDialogOpen(false);
    setEditingRule(null);
  };

  const handleDeleteRule = (id) => {
    setRules(rules.filter(r => r.id !== id));
    toast.success("Regla eliminada");
  };

  const handleOpenDialog = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
      setFormData(rule);
    } else {
      setEditingRule(null);
      setFormData({
        rule_name: "",
        applies_to: "Por Departamento",
        target_departments: [],
        target_positions: [],
        target_categories: [],
        component_id: "",
        calculation_type: "Fijo",
        amount: 0,
        percentage: 0,
        is_active: true,
        auto_apply: true
      });
    }
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-600" />
            Reglas Automáticas de Asignación Salarial
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => applyRulesMutation.mutate()}
              disabled={applyRulesMutation.isPending}
              className="gap-2"
            >
              <Zap className="w-4 h-4" />
              Aplicar Reglas Ahora
            </Button>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva Regla
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-3">
            {rules.map((rule) => (
              <Card key={rule.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{rule.rule_name}</h3>
                        {!rule.is_active && (
                          <Badge variant="destructive">Inactiva</Badge>
                        )}
                        {rule.auto_apply && (
                          <Badge className="bg-green-100 text-green-700">Auto-aplicar</Badge>
                        )}
                      </div>

                      <div className="flex gap-4 text-sm">
                        <Badge variant="outline">{rule.applies_to}</Badge>
                        <span>→</span>
                        <Badge className="bg-blue-100 text-blue-700">
                          {rule.component_name}
                        </Badge>
                        <span className="font-semibold text-emerald-600">
                          {rule.amount}€
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-slate-500">
                        {rule.target_departments?.length > 0 && (
                          <span>Departamentos: {rule.target_departments.join(", ")}</span>
                        )}
                        {rule.target_positions?.length > 0 && (
                          <span>Puestos: {rule.target_positions.join(", ")}</span>
                        )}
                        {rule.target_categories?.length > 0 && (
                          <span>Categorías: {rule.target_categories.join(", ")}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(rule)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("¿Eliminar esta regla?")) {
                            handleDeleteRule(rule.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {rules.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Settings className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No hay reglas automáticas configuradas</p>
                <Button variant="link" onClick={() => handleOpenDialog()}>
                  Crear la primera
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Editar Regla" : "Nueva Regla Automática"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nombre de la Regla *</Label>
              <Input
                value={formData.rule_name}
                onChange={(e) => setFormData({...formData, rule_name: e.target.value})}
                placeholder="Ej. Plus Producción para Fabricación"
              />
            </div>

            <div className="space-y-2">
              <Label>Aplica a:</Label>
              <Select 
                value={formData.applies_to} 
                onValueChange={(v) => setFormData({...formData, applies_to: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Por Departamento">Por Departamento</SelectItem>
                  <SelectItem value="Por Puesto">Por Puesto</SelectItem>
                  <SelectItem value="Por Categoría">Por Categoría</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.applies_to === "Por Departamento" && (
              <div className="space-y-2">
                <Label>Departamentos</Label>
                <Select 
                  onValueChange={(v) => {
                    if (!formData.target_departments.includes(v)) {
                      setFormData({
                        ...formData, 
                        target_departments: [...formData.target_departments, v]
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar departamento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.target_departments.map(dept => (
                    <Badge 
                      key={dept} 
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setFormData({
                        ...formData,
                        target_departments: formData.target_departments.filter(d => d !== dept)
                      })}
                    >
                      {dept} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {formData.applies_to === "Por Puesto" && (
              <div className="space-y-2">
                <Label>Puestos</Label>
                <Select 
                  onValueChange={(v) => {
                    if (!formData.target_positions.includes(v)) {
                      setFormData({
                        ...formData, 
                        target_positions: [...formData.target_positions, v]
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar puesto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map(pos => (
                      <SelectItem key={pos.id} value={pos.name}>{pos.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.target_positions.map(pos => (
                    <Badge 
                      key={pos} 
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setFormData({
                        ...formData,
                        target_positions: formData.target_positions.filter(p => p !== pos)
                      })}
                    >
                      {pos} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {formData.applies_to === "Por Categoría" && (
              <div className="space-y-2">
                <Label>Categorías</Label>
                <Select 
                  onValueChange={(v) => {
                    if (!formData.target_categories.includes(v)) {
                      setFormData({
                        ...formData, 
                        target_categories: [...formData.target_categories, v]
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.target_categories.map(cat => (
                    <Badge 
                      key={cat} 
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setFormData({
                        ...formData,
                        target_categories: formData.target_categories.filter(c => c !== cat)
                      })}
                    >
                      {cat} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Componente Salarial *</Label>
              <Select 
                value={formData.component_id} 
                onValueChange={(v) => setFormData({...formData, component_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar componente..." />
                </SelectTrigger>
                <SelectContent>
                  {components.map(comp => (
                    <SelectItem key={comp.id} value={comp.id}>
                      {comp.name} ({comp.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Cálculo</Label>
                <Select 
                  value={formData.calculation_type} 
                  onValueChange={(v) => setFormData({...formData, calculation_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fijo">Cantidad Fija</SelectItem>
                    <SelectItem value="Porcentaje">Porcentaje del Salario Base</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.calculation_type === "Fijo" ? (
                <div className="space-y-2">
                  <Label>Importe (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Porcentaje (%) *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.percentage}
                    onChange={(e) => setFormData({...formData, percentage: parseFloat(e.target.value) || 0})}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto_apply"
                  checked={formData.auto_apply}
                  onCheckedChange={(checked) => setFormData({...formData, auto_apply: checked})}
                />
                <label htmlFor="auto_apply" className="text-sm font-medium">
                  Aplicar automáticamente a nuevos empleados
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <label htmlFor="is_active" className="text-sm font-medium">
                  Regla Activa
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRule}>
              Guardar Regla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}