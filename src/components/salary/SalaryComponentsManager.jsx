import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash2, Search, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function SalaryComponentsManager() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "Fijo",
    category: "Complementos Salariales",
    is_taxable: true,
    is_social_security_contributory: true,
    calculation_method: "Fijo",
    default_value: 0,
    periodicity: "Mensual",
    description: "",
    is_active: true,
    order: 0
  });

  const { data: components = [] } = useQuery({
    queryKey: ['salaryComponents'],
    queryFn: () => base44.entities.SalaryComponent.list('order'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingComponent) {
        return base44.entities.SalaryComponent.update(editingComponent.id, data);
      }
      return base44.entities.SalaryComponent.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaryComponents'] });
      toast.success(editingComponent ? "Componente actualizado" : "Componente creado");
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SalaryComponent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaryComponents'] });
      toast.success("Componente eliminado");
    },
  });

  const handleOpenDialog = (component = null) => {
    if (component) {
      setEditingComponent(component);
      setFormData(component);
    } else {
      setEditingComponent(null);
      setFormData({
        name: "",
        code: "",
        type: "Fijo",
        category: "Complementos Salariales",
        is_taxable: true,
        is_social_security_contributory: true,
        calculation_method: "Fijo",
        default_value: 0,
        periodicity: "Mensual",
        description: "",
        is_active: true,
        order: components.length
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingComponent(null);
  };

  const handleSave = () => {
    if (!formData.name || !formData.code) {
      toast.error("Nombre y código son obligatorios");
      return;
    }
    saveMutation.mutate(formData);
  };

  const filteredComponents = components.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type) => {
    const colors = {
      "Fijo": "bg-blue-100 text-blue-700",
      "Variable": "bg-purple-100 text-purple-700",
      "Deducción": "bg-red-100 text-red-700",
      "Beneficio": "bg-green-100 text-green-700",
      "Plus": "bg-amber-100 text-amber-700",
      "Complemento": "bg-indigo-100 text-indigo-700"
    };
    return colors[type] || "bg-slate-100 text-slate-700";
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Componentes Salariales
            </CardTitle>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Componente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar componentes..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="space-y-3">
              {filteredComponents.map((component) => (
                <Card key={component.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{component.name}</h3>
                          <Badge variant="outline" className="font-mono text-xs">
                            {component.code}
                          </Badge>
                          <Badge className={getTypeColor(component.type)}>
                            {component.type}
                          </Badge>
                          {!component.is_active && (
                            <Badge variant="destructive">Inactivo</Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Categoría:</span>
                            <p className="font-medium">{component.category}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Método:</span>
                            <p className="font-medium">{component.calculation_method}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Valor por defecto:</span>
                            <p className="font-medium">{component.default_value}€</p>
                          </div>
                        </div>

                        <div className="flex gap-4 mt-2">
                          {component.is_taxable && (
                            <Badge variant="outline" className="text-xs">IRPF</Badge>
                          )}
                          {component.is_social_security_contributory && (
                            <Badge variant="outline" className="text-xs">Cotiza SS</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {component.periodicity}
                          </Badge>
                        </div>

                        {component.description && (
                          <p className="text-sm text-slate-600 mt-2">{component.description}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(component)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("¿Eliminar este componente?")) {
                              deleteMutation.mutate(component.id);
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

              {filteredComponents.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No hay componentes salariales configurados</p>
                  <Button variant="link" onClick={() => handleOpenDialog()}>
                    Crear el primero
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingComponent ? "Editar Componente" : "Nuevo Componente Salarial"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre del Componente *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej. Plus Productividad"
                />
              </div>
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="Ej. PROD"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fijo">Fijo</SelectItem>
                    <SelectItem value="Variable">Variable</SelectItem>
                    <SelectItem value="Deducción">Deducción</SelectItem>
                    <SelectItem value="Beneficio">Beneficio</SelectItem>
                    <SelectItem value="Plus">Plus</SelectItem>
                    <SelectItem value="Complemento">Complemento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Salario Base">Salario Base</SelectItem>
                    <SelectItem value="Complementos Salariales">Complementos Salariales</SelectItem>
                    <SelectItem value="Pluses">Pluses</SelectItem>
                    <SelectItem value="Deducciones">Deducciones</SelectItem>
                    <SelectItem value="Beneficios Sociales">Beneficios Sociales</SelectItem>
                    <SelectItem value="Otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Método de Cálculo</Label>
                <Select value={formData.calculation_method} onValueChange={(v) => setFormData({...formData, calculation_method: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fijo">Fijo</SelectItem>
                    <SelectItem value="Porcentaje Salario Base">% Salario Base</SelectItem>
                    <SelectItem value="Fórmula Personalizada">Fórmula Personalizada</SelectItem>
                    <SelectItem value="Por Horas">Por Horas</SelectItem>
                    <SelectItem value="Por Días">Por Días</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor por Defecto</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.default_value}
                  onChange={(e) => setFormData({...formData, default_value: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>Periodicidad</Label>
                <Select value={formData.periodicity} onValueChange={(v) => setFormData({...formData, periodicity: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mensual">Mensual</SelectItem>
                    <SelectItem value="Trimestral">Trimestral</SelectItem>
                    <SelectItem value="Semestral">Semestral</SelectItem>
                    <SelectItem value="Anual">Anual</SelectItem>
                    <SelectItem value="Única">Única</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descripción del componente salarial..."
                rows={3}
              />
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_taxable"
                  checked={formData.is_taxable}
                  onCheckedChange={(checked) => setFormData({...formData, is_taxable: checked})}
                />
                <label htmlFor="is_taxable" className="text-sm font-medium">
                  Sujeto a IRPF
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_contributory"
                  checked={formData.is_social_security_contributory}
                  onCheckedChange={(checked) => setFormData({...formData, is_social_security_contributory: checked})}
                />
                <label htmlFor="is_contributory" className="text-sm font-medium">
                  Cotiza a Seguridad Social
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <label htmlFor="is_active" className="text-sm font-medium">
                  Activo
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