import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function IncentivePlanConfiguration() {
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ['incentivePlans'],
    queryFn: () => base44.entities.IncentivePlan.list('-anio'),
    initialData: [],
    staleTime: 10 * 60 * 1000, // Cache por 10 minutos
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.IncentivePlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incentivePlans'] });
      toast.success("Plan eliminado");
    }
  });

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const handleDelete = (plan) => {
    if (window.confirm("¿Eliminar plan de incentivos?")) {
      deleteMutation.mutate(plan.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Planes de Incentivos</h2>
        <Button onClick={() => setShowForm(true)} className="bg-emerald-600">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {plans.map(plan => (
          <Card key={plan.id} className={`border-2 ${plan.activo ? 'border-emerald-200' : 'border-slate-200'}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    {plan.nombre}
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">{plan.descripcion}</p>
                </div>
                <div className="flex gap-1">
                  {plan.activo && (
                    <Badge className="bg-emerald-600">Activo</Badge>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(plan)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Año</p>
                  <p className="font-semibold">{plan.anio}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Período</p>
                  <p className="font-semibold">{plan.periodo}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Vigencia</p>
                  <p className="font-semibold text-xs">
                    {format(new Date(plan.fecha_inicio), "dd/MM/yyyy", { locale: es })} - {format(new Date(plan.fecha_fin), "dd/MM/yyyy", { locale: es })}
                  </p>
                </div>
              </div>

              {plan.parametros_disponibles?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Parámetros Configurados:</p>
                  <div className="flex flex-wrap gap-2">
                    {plan.parametros_disponibles.map((param, idx) => (
                      <Badge key={idx} variant="outline">
                        {param.nombre}
                        {param.importable_excel && " 📊"}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {plans.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-4">No hay planes de incentivos configurados</p>
              <Button onClick={() => setShowForm(true)}>Crear Primer Plan</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {showForm && (
        <PlanForm
          plan={editingPlan}
          onClose={() => {
            setShowForm(false);
            setEditingPlan(null);
          }}
        />
      )}
    </div>
  );
}

function PlanForm({ plan, onClose }) {
  const [formData, setFormData] = useState(plan || {
    nombre: "",
    anio: new Date().getFullYear(),
    periodo: "Trimestral",
    fecha_inicio: format(new Date(), 'yyyy-MM-dd'),
    fecha_fin: format(new Date(new Date().getFullYear(), 11, 31), 'yyyy-MM-dd'),
    descripcion: "",
    parametros_disponibles: [
      { nombre: "Productividad", descripcion: "Unidades producidas por hora", unidad_medida: "unidades/h", importable_excel: true },
      { nombre: "Calidad", descripcion: "Porcentaje de productos sin defectos", unidad_medida: "%", importable_excel: false },
      { nombre: "Asistencia", descripcion: "Porcentaje de asistencia", unidad_medida: "%", importable_excel: false },
      { nombre: "Seguridad", descripcion: "Días sin incidentes", unidad_medida: "días", importable_excel: false },
    ],
    activo: true
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (plan?.id) {
        return base44.entities.IncentivePlan.update(plan.id, data);
      }
      return base44.entities.IncentivePlan.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incentivePlans'] });
      toast.success(plan ? "Plan actualizado" : "Plan creado");
      onClose();
    }
  });

  const addParameter = () => {
    setFormData({
      ...formData,
      parametros_disponibles: [
        ...(formData.parametros_disponibles || []),
        { nombre: "", descripcion: "", unidad_medida: "", importable_excel: false }
      ]
    });
  };

  const updateParameter = (index, field, value) => {
    const updated = [...formData.parametros_disponibles];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, parametros_disponibles: updated });
  };

  const removeParameter = (index) => {
    const updated = formData.parametros_disponibles.filter((_, i) => i !== index);
    setFormData({ ...formData, parametros_disponibles: updated });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.parametros_disponibles.length > 6) {
      toast.error("Máximo 6 parámetros permitidos");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? "Editar Plan" : "Nuevo Plan de Incentivos"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre del Plan *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Año *</Label>
              <Input
                type="number"
                value={formData.anio}
                onChange={(e) => setFormData({...formData, anio: parseInt(e.target.value)})}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Período *</Label>
              <Select value={formData.periodo} onValueChange={(value) => setFormData({...formData, periodo: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mensual">Mensual</SelectItem>
                  <SelectItem value="Trimestral">Trimestral</SelectItem>
                  <SelectItem value="Semestral">Semestral</SelectItem>
                  <SelectItem value="Anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha Inicio *</Label>
              <Input
                type="date"
                value={formData.fecha_inicio}
                onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Fin *</Label>
              <Input
                type="date"
                value={formData.fecha_fin}
                onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Parámetros a Medir (máx. 6)</Label>
              {formData.parametros_disponibles.length < 6 && (
                <Button type="button" onClick={addParameter} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir Parámetro
                </Button>
              )}
            </div>

            {formData.parametros_disponibles?.map((param, idx) => (
              <Card key={idx} className="border-2 border-slate-200">
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Nombre *</Label>
                      <Input
                        value={param.nombre}
                        onChange={(e) => updateParameter(idx, 'nombre', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Unidad de Medida *</Label>
                      <Input
                        value={param.unidad_medida}
                        onChange={(e) => updateParameter(idx, 'unidad_medida', e.target.value)}
                        placeholder="ej. %, unidades, días"
                        required
                      />
                    </div>

                    <div className="flex items-end gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Checkbox
                          checked={param.importable_excel}
                          onCheckedChange={(checked) => updateParameter(idx, 'importable_excel', checked)}
                        />
                        <label className="text-sm">Importable Excel</label>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeParameter(idx)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Input
                      value={param.descripcion}
                      onChange={(e) => updateParameter(idx, 'descripcion', e.target.value)}
                      placeholder="Descripción del parámetro"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.activo}
              onCheckedChange={(checked) => setFormData({...formData, activo: checked})}
            />
            <label className="text-sm">Plan activo</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : plan ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}