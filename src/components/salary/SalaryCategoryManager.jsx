import React, { useState, useEffect, useMemo } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function SalaryCategoryManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    level: 1,
    description: "",
    salary_range: { min: 0, max: 0, target: 0 },
    required_experience_years: 0,
    is_active: true,
    order: 0,
    department: ""
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const normalizeDeptName = (name) => (name || "").toString().trim().toUpperCase();
  const findDeptByName = (name) => {
    const target = normalizeDeptName(name);
    return departments.find(d => normalizeDeptName(d.name) === target) || null;
  };

  useEffect(() => {
    if (!selectedDepartment && departments.length > 0) {
      setSelectedDepartment(departments[0].name || "");
    }
  }, [departments, selectedDepartment]);

  const { data: categories = [] } = useQuery({
    queryKey: ['salaryCategories', selectedDepartment],
    queryFn: async () => {
      if (!selectedDepartment) return [];
      let res = [];
      try {
        const dept = findDeptByName(selectedDepartment);
        const normalized = normalizeDeptName(selectedDepartment);
        const all = await base44.entities.SalaryCategory.list('level');
        res = all.filter(c => {
          const cDept = c.department || c.department_name || "";
          const cNorm = c.department_normalized || normalizeDeptName(cDept);
          const matchesName = cDept === selectedDepartment || normalizeDeptName(cDept) === normalized;
          const matchesId = !!dept && (c.department_id === dept.id);
          const matchesNorm = cNorm === normalized;
          return matchesName || matchesId || matchesNorm;
        });
      } catch {
        res = [];
      }
      return res;
    },
    enabled: true
  });

  const { data: allCategories = [] } = useQuery({
    queryKey: ['salaryCategoriesAll'],
    queryFn: () => base44.entities.SalaryCategory.list('level'),
  });

  const categoriesByDept = useMemo(() => {
    const map = new Map();
    allCategories.forEach(c => {
      const dept = (c.department || "Sin departamento").toString();
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept).push(c);
    });
    // sort categories by level then name
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => (a.level || 0) - (b.level || 0) || (a.name || "").localeCompare(b.name || ""));
      map.set(k, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allCategories]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const dept = findDeptByName(data.department || data.department_name || selectedDepartment);
      const payload = {
        ...data,
        department: data.department || data.department_name || selectedDepartment,
        department_name: data.department || data.department_name || selectedDepartment,
        department_normalized: normalizeDeptName(data.department || data.department_name || selectedDepartment),
        department_id: dept?.id || data.department_id || null
      };
      if (editingCategory) {
        return base44.entities.SalaryCategory.update(editingCategory.id, payload);
      }
      return base44.entities.SalaryCategory.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && (q.queryKey[0] === 'salaryCategories' || q.queryKey[0] === 'salaryCategoriesAll')
      });
      toast.success(editingCategory ? "Categoría actualizada" : "Categoría creada");
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SalaryCategory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && (q.queryKey[0] === 'salaryCategories' || q.queryKey[0] === 'salaryCategoriesAll')
      });
      toast.success("Categoría eliminada");
    },
  });

  const handleOpenDialog = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        ...category,
        salary_range: category.salary_range || { min: 0, max: 0, target: 0 },
        department: category.department || category.department_name || selectedDepartment || "",
        department_id: category.department_id || findDeptByName(category.department || category.department_name || selectedDepartment || "")?.id || null
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
        order: categories.length,
        department: selectedDepartment || "",
        department_id: findDeptByName(selectedDepartment || "")?.id || null
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
    if (!formData.department) {
      toast.error("Selecciona un departamento");
      return;
    }
    const dept = findDeptByName(formData.department);
    saveMutation.mutate({
      ...formData,
      department: formData.department,
      department_name: formData.department,
      department_normalized: normalizeDeptName(formData.department),
      department_id: dept?.id || null
    });
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
            <div className="flex items-center gap-3">
              <div className="w-64">
                <Label className="text-xs text-slate-500 mb-1 block">Departamento</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => handleOpenDialog()} className="gap-2" disabled={!selectedDepartment}>
                <Plus className="w-4 h-4" />
                Nueva Categoría
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedDepartment && (
            <div className="text-sm text-slate-500">Selecciona un departamento para gestionar sus categorías profesionales.</div>
          )}
          {selectedDepartment && (
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
                            <Badge variant="secondary" className="text-xs">
                              {departments.find(d => d.id === category.department_id)?.name || category.department || category.department_name || selectedDepartment}
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
                    <p>No hay categorías profesionales configuradas para {selectedDepartment}</p>
                    <Button variant="link" onClick={() => handleOpenDialog()}>
                      Crear la primera
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            Estructura: Departamentos y Categorías
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-360px)]">
            <div className="space-y-4">
              {categoriesByDept.map(([dept, cats]) => (
                <div key={dept} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{dept}</Badge>
                      <span className="text-xs text-slate-500">{cats.length} categorías</span>
                    </div>
                    {departments.find(d => d.name === dept) && (
                      <Badge variant="outline" className="text-xs">Configurado</Badge>
                    )}
                  </div>
                  {cats.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {cats.map(c => (
                        <Badge key={c.id} variant="secondary" className="text-xs">
                          {c.level ? `L${c.level} - ` : ""}{c.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">Sin categorías</div>
                  )}
                </div>
              ))}
              {categoriesByDept.length === 0 && (
                <div className="text-sm text-slate-500">No hay categorías registradas.</div>
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
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Departamento *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(v) => {
                    const d = findDeptByName(v);
                    setFormData({ ...formData, department: v, department_id: d?.id || null });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
