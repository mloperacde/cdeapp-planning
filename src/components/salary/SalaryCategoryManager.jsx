import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash2, Award, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function SalaryCategoryManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    level: 1,
    description: "",
    salary_range: { min: 0, max: 0, target: 0 },
    required_experience_years: 0,
    is_active: true,
    order: 0
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['salaryCategories'],
    queryFn: () => base44.entities.SalaryCategory.list('level'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingCategory) {
        return base44.entities.SalaryCategory.update(editingCategory.id, data);
      }
      return base44.entities.SalaryCategory.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaryCategories'] });
      toast.success(editingCategory ? "Categoría actualizada" : "Categoría creada");
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SalaryCategory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaryCategories'] });
      toast.success("Categoría eliminada");
    },
  });

  const handleOpenDialog = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        ...category,
        salary_range: category.salary_range || { min: 0, max: 0, target: 0 }
      });
    } else {
      setEditingCategory(null);
      const maxLevel = Math.max(0, ...categories.map(c => c.level || 0));
      setFormData({
        name: "",
        code: "",
        level: maxLevel + 1,
        description: "",
        salary_range: { min: 0, max: 0, target: 0 },
        required_experience_years: 0,
        is_active: true,
        order: categories.length
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
  };

  const handleSave = () => {
    if (!formData.name || !formData.code) {
      toast.error("Nombre y código son obligatorios");
      return;
    }
    saveMutation.mutate(formData);
  };

  const getLevelColor = (level) => {
    const colors = [
      "bg-slate-100 text-slate-700",
      "bg-blue-100 text-blue-700",
      "bg-indigo-100 text-indigo-700",
      "bg-purple-100 text-purple-700",
      "bg-pink-100 text-pink-700"
    ];
    return colors[level - 1] || colors[0];
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              Categorías Profesionales
            </CardTitle>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva Categoría
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-3">
              {categories.map((category) => (
                <Card key={category.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className={getLevelColor(category.level)} variant="secondary">
                            Nivel {category.level}
                          </Badge>
                          <h3 className="font-semibold text-lg">{category.name}</h3>
                          <Badge variant="outline" className="font-mono text-xs">
                            {category.code}
                          </Badge>
                          {!category.is_active && (
                            <Badge variant="destructive">Inactivo</Badge>
                          )}
                        </div>

                        {category.description && (
                          <p className="text-sm text-slate-600 mb-3">{category.description}</p>
                        )}

                        <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                          <div>
                            <span className="text-xs text-slate-500 block mb-1">Rango Salarial</span>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-emerald-600" />
                              <span className="font-semibold">
                                {category.salary_range?.min || 0}€ - {category.salary_range?.max || 0}€
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 block mb-1">Salario Objetivo</span>
                            <span className="font-semibold text-emerald-600">
                              {category.salary_range?.target || 0}€
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 block mb-1">Experiencia Requerida</span>
                            <span className="font-semibold">
                              {category.required_experience_years || 0} años
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(category)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("¿Eliminar esta categoría?")) {
                              deleteMutation.mutate(category.id);
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

              {categories.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Award className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No hay categorías profesionales configuradas</p>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoría" : "Nueva Categoría Profesional"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej. Técnico Senior"
                />
              </div>
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="Ej. TEC-SR"
                />
              </div>
              <div className="space-y-2">
                <Label>Nivel</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.level}
                  onChange={(e) => setFormData({...formData, level: parseInt(e.target.value) || 1})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe las responsabilidades y requisitos..."
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>Rango Salarial</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Mínimo (€)</Label>
                  <Input
                    type="number"
                    step="100"
                    value={formData.salary_range.min}
                    onChange={(e) => setFormData({
                      ...formData,
                      salary_range: { ...formData.salary_range, min: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Objetivo (€)</Label>
                  <Input
                    type="number"
                    step="100"
                    value={formData.salary_range.target}
                    onChange={(e) => setFormData({
                      ...formData,
                      salary_range: { ...formData.salary_range, target: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Máximo (€)</Label>
                  <Input
                    type="number"
                    step="100"
                    value={formData.salary_range.max}
                    onChange={(e) => setFormData({
                      ...formData,
                      salary_range: { ...formData.salary_range, max: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Años de Experiencia Requeridos</Label>
              <Input
                type="number"
                min="0"
                value={formData.required_experience_years}
                onChange={(e) => setFormData({...formData, required_experience_years: parseInt(e.target.value) || 0})}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <label htmlFor="is_active" className="text-sm font-medium">
                Categoría Activa
              </label>
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