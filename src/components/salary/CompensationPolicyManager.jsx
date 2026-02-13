import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash2, TrendingUp, Target } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CompensationPolicyManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);

  const [formData, setFormData] = useState({
    policy_name: "",
    code: "",
    description: "",
    applies_to: "Todos",
    target_departments: [],
    target_positions: [],
    target_categories: [],
    salary_ranges: { min_salary: 0, max_salary: 0, target_salary: 0 },
    valid_from: format(new Date(), 'yyyy-MM-dd'),
    valid_to: "",
    is_active: true,
    auto_apply: false
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['compensationPolicies'],
    queryFn: () => base44.entities.CompensationPolicy.list('-valid_from'),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: positions = [] } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingPolicy) {
        return base44.entities.CompensationPolicy.update(editingPolicy.id, data);
      }
      return base44.entities.CompensationPolicy.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensationPolicies'] });
      toast.success(editingPolicy ? "Política actualizada" : "Política creada");
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CompensationPolicy.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensationPolicies'] });
      toast.success("Política eliminada");
    },
  });

  const handleOpenDialog = (policy = null) => {
    if (policy) {
      setEditingPolicy(policy);
      setFormData({
        ...policy,
        salary_ranges: policy.salary_ranges || { min_salary: 0, max_salary: 0, target_salary: 0 },
        target_departments: policy.target_departments || [],
        target_positions: policy.target_positions || [],
        target_categories: policy.target_categories || []
      });
    } else {
      setEditingPolicy(null);
      setFormData({
        policy_name: "",
        code: "",
        description: "",
        applies_to: "Todos",
        target_departments: [],
        target_positions: [],
        target_categories: [],
        salary_ranges: { min_salary: 0, max_salary: 0, target_salary: 0 },
        valid_from: format(new Date(), 'yyyy-MM-dd'),
        valid_to: "",
        is_active: true,
        auto_apply: false
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPolicy(null);
  };

  const handleSave = () => {
    if (!formData.policy_name || !formData.code || !formData.valid_from) {
      toast.error("Nombre, código y fecha de inicio son obligatorios");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Políticas Retributivas
          </CardTitle>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Política
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-3">
            {policies.map((policy) => (
              <Card key={policy.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{policy.policy_name}</h3>
                        <Badge variant="outline" className="font-mono text-xs">
                          {policy.code}
                        </Badge>
                        {!policy.is_active && (
                          <Badge variant="destructive">Inactiva</Badge>
                        )}
                        {policy.auto_apply && (
                          <Badge className="bg-green-100 text-green-700">Auto-aplicar</Badge>
                        )}
                      </div>

                      {policy.description && (
                        <p className="text-sm text-slate-600 mb-3">{policy.description}</p>
                      )}

                      <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                        <div>
                          <span className="text-xs text-slate-500 block mb-1">Aplica a:</span>
                          <Badge variant="secondary">{policy.applies_to}</Badge>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 block mb-1">Rango Salarial:</span>
                          <span className="text-sm font-semibold">
                            {policy.salary_ranges?.min_salary || 0}€ - {policy.salary_ranges?.max_salary || 0}€
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 block mb-1">Vigencia:</span>
                          <span className="text-sm">
                            {policy.valid_from ? format(new Date(policy.valid_from), 'dd/MM/yyyy') : '-'}
                            {policy.valid_to ? ` - ${format(new Date(policy.valid_to), 'dd/MM/yyyy')}` : ' - ∞'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(policy)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("¿Eliminar esta política?")) {
                            deleteMutation.mutate(policy.id);
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

            {policies.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No hay políticas retributivas configuradas</p>
                <Button variant="link" onClick={() => handleOpenDialog()}>
                  Crear la primera
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPolicy ? "Editar Política" : "Nueva Política Retributiva"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre de la Política *</Label>
                <Input
                  value={formData.policy_name}
                  onChange={(e) => setFormData({...formData, policy_name: e.target.value})}
                  placeholder="Ej. Política Comerciales"
                />
              </div>
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="Ej. POL-COM"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descripción de la política..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Aplica a:</Label>
              <Select value={formData.applies_to} onValueChange={(v) => setFormData({...formData, applies_to: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos los empleados</SelectItem>
                  <SelectItem value="Por Departamento">Por Departamento</SelectItem>
                  <SelectItem value="Por Puesto">Por Puesto</SelectItem>
                  <SelectItem value="Por Categoría">Por Categoría</SelectItem>
                  <SelectItem value="Personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Rangos Salariales (€)</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Mínimo</Label>
                  <Input
                    type="number"
                    step="100"
                    value={formData.salary_ranges.min_salary}
                    onChange={(e) => setFormData({
                      ...formData,
                      salary_ranges: { ...formData.salary_ranges, min_salary: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Objetivo</Label>
                  <Input
                    type="number"
                    step="100"
                    value={formData.salary_ranges.target_salary}
                    onChange={(e) => setFormData({
                      ...formData,
                      salary_ranges: { ...formData.salary_ranges, target_salary: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Máximo</Label>
                  <Input
                    type="number"
                    step="100"
                    value={formData.salary_ranges.max_salary}
                    onChange={(e) => setFormData({
                      ...formData,
                      salary_ranges: { ...formData.salary_ranges, max_salary: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Inicio *</Label>
                <Input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Fin (opcional)</Label>
                <Input
                  type="date"
                  value={formData.valid_to}
                  onChange={(e) => setFormData({...formData, valid_to: e.target.value})}
                  placeholder="Sin fecha de fin"
                />
              </div>
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
                  Política Activa
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}