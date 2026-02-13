import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash2, Award, Gift } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function SeniorityBandManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBand, setEditingBand] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    min_years: 0,
    max_years: null,
    description: "",
    benefits: [],
    auto_apply: false,
    is_active: true,
    order: 0
  });

  const { data: bands = [] } = useQuery({
    queryKey: ['seniorityBands'],
    queryFn: () => base44.entities.SeniorityBand.list('min_years'),
  });

  const { data: components = [] } = useQuery({
    queryKey: ['salaryComponents'],
    queryFn: () => base44.entities.SalaryComponent.filter({ is_active: true }),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingBand) {
        return base44.entities.SeniorityBand.update(editingBand.id, data);
      }
      return base44.entities.SeniorityBand.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seniorityBands'] });
      toast.success(editingBand ? "Banda actualizada" : "Banda creada");
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SeniorityBand.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seniorityBands'] });
      toast.success("Banda eliminada");
    },
  });

  const handleOpenDialog = (band = null) => {
    if (band) {
      setEditingBand(band);
      setFormData({
        ...band,
        benefits: band.benefits || []
      });
    } else {
      setEditingBand(null);
      setFormData({
        name: "",
        code: "",
        min_years: 0,
        max_years: null,
        description: "",
        benefits: [],
        auto_apply: false,
        is_active: true,
        order: bands.length
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBand(null);
  };

  const handleSave = () => {
    if (!formData.name || !formData.code) {
      toast.error("Nombre y código son obligatorios");
      return;
    }
    saveMutation.mutate(formData);
  };

  const addBenefit = () => {
    setFormData({
      ...formData,
      benefits: [
        ...(formData.benefits || []),
        { benefit_type: "Días Vacaciones Extra", value: 0, description: "" }
      ]
    });
  };

  const removeBenefit = (index) => {
    const newBenefits = formData.benefits.filter((_, i) => i !== index);
    setFormData({ ...formData, benefits: newBenefits });
  };

  const updateBenefit = (index, field, value) => {
    const newBenefits = [...formData.benefits];
    newBenefits[index] = { ...newBenefits[index], [field]: value };
    setFormData({ ...formData, benefits: newBenefits });
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Bandas de Antigüedad
            </CardTitle>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva Banda
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-3">
              {bands.map((band) => (
                <Card key={band.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{band.name}</h3>
                          <Badge variant="outline" className="font-mono text-xs">
                            {band.code}
                          </Badge>
                          {!band.is_active && (
                            <Badge variant="destructive">Inactivo</Badge>
                          )}
                          {band.auto_apply && (
                            <Badge className="bg-green-100 text-green-700">Auto-aplicar</Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <span className="text-sm text-slate-500">Rango de Antigüedad:</span>
                            <p className="font-medium">
                              {band.min_years} - {band.max_years || '∞'} años
                            </p>
                          </div>
                          <div>
                            <span className="text-sm text-slate-500">Beneficios:</span>
                            <p className="font-medium">{(band.benefits || []).length} configurados</p>
                          </div>
                        </div>

                        {band.description && (
                          <p className="text-sm text-slate-600 mb-3">{band.description}</p>
                        )}

                        {band.benefits && band.benefits.length > 0 && (
                          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Gift className="w-4 h-4 text-amber-600" />
                              <span className="text-sm font-medium">Beneficios:</span>
                            </div>
                            <div className="space-y-1">
                              {band.benefits.map((benefit, idx) => (
                                <div key={idx} className="text-sm flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {benefit.benefit_type}
                                  </Badge>
                                  <span className="font-medium">{benefit.value}</span>
                                  {benefit.description && (
                                    <span className="text-slate-500">- {benefit.description}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(band)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("¿Eliminar esta banda?")) {
                              deleteMutation.mutate(band.id);
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

              {bands.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Award className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No hay bandas de antigüedad configuradas</p>
                  <Button variant="link" onClick={() => handleOpenDialog()}>
                    Crear la primera
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBand ? "Editar Banda de Antigüedad" : "Nueva Banda de Antigüedad"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej. 5-10 años"
                />
              </div>
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="Ej. ANT-5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Años Mínimos *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.min_years}
                  onChange={(e) => setFormData({...formData, min_years: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>Años Máximos (vacío = sin límite)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.max_years || ""}
                  onChange={(e) => setFormData({...formData, max_years: e.target.value ? parseInt(e.target.value) : null})}
                  placeholder="Sin límite"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descripción de la banda..."
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Beneficios Asociados</Label>
                <Button type="button" size="sm" variant="outline" onClick={addBenefit}>
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir Beneficio
                </Button>
              </div>

              {formData.benefits && formData.benefits.length > 0 && (
                <div className="space-y-2">
                  {formData.benefits.map((benefit, idx) => (
                    <Card key={idx} className="p-3">
                      <div className="grid grid-cols-12 gap-2 items-start">
                        <div className="col-span-4">
                          <Select
                            value={benefit.benefit_type}
                            onValueChange={(v) => updateBenefit(idx, 'benefit_type', v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Días Vacaciones Extra">Días Vacaciones Extra</SelectItem>
                              <SelectItem value="Plus Antigüedad">Plus Antigüedad</SelectItem>
                              <SelectItem value="Bonus Fijo">Bonus Fijo</SelectItem>
                              <SelectItem value="Otros">Otros</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={benefit.value}
                            onChange={(e) => updateBenefit(idx, 'value', parseFloat(e.target.value) || 0)}
                            placeholder="Valor"
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-5">
                          <Input
                            value={benefit.description}
                            onChange={(e) => updateBenefit(idx, 'description', e.target.value)}
                            placeholder="Descripción"
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => removeBenefit(idx)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
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
                  Aplicar automáticamente
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <label htmlFor="is_active" className="text-sm font-medium">
                  Activa
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
    </div>
  );
}