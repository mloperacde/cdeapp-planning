import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, History } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";

export default function EmployeeSalaryDetail({ employee, onBack }) {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    component_id: "",
    amount: 0,
    start_date: format(new Date(), 'yyyy-MM-dd')
  });

  const { data: components = [] } = useQuery({
    queryKey: ['salaryComponents'],
    queryFn: () => base44.entities.SalaryComponent.filter({ is_active: true }),
  });

  const { data: currentSalaries = [] } = useQuery({
    queryKey: ['employeeSalaries', employee.id],
    queryFn: () => base44.entities.EmployeeSalary.filter({ 
      employee_id: employee.id, 
      is_current: true 
    }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['employeeCategories', employee.id],
    queryFn: () => base44.entities.EmployeeCategory.filter({ 
      employee_id: employee.id,
      is_current: true
    }),
  });

  const addComponentMutation = useMutation({
    mutationFn: (data) => base44.entities.EmployeeSalary.create({
      ...data,
      employee_id: employee.id,
      employee_name: employee.nombre,
      employee_code: employee.codigo_empleado,
      is_current: true
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeSalaries'] });
      toast.success("Componente añadido");
      setIsAddDialogOpen(false);
      setFormData({ component_id: "", amount: 0, start_date: format(new Date(), 'yyyy-MM-dd') });
    },
  });

  const removeComponentMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeSalary.update(id, {
      is_current: false,
      end_date: format(new Date(), 'yyyy-MM-dd')
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeSalaries'] });
      toast.success("Componente eliminado");
    },
  });

  const handleAddComponent = () => {
    if (!formData.component_id || formData.amount <= 0) {
      toast.error("Selecciona un componente y un importe válido");
      return;
    }

    const component = components.find(c => c.id === formData.component_id);
    addComponentMutation.mutate({
      ...formData,
      component_name: component.name,
      component_code: component.code
    });
  };

  const totalSalary = currentSalaries.reduce((sum, s) => sum + (s.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{employee.nombre}</h2>
          <p className="text-slate-500">{employee.puesto} - {employee.departamento}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-slate-500 mb-1">Salario Total Mensual</div>
            <div className="text-3xl font-bold text-emerald-600">{totalSalary.toFixed(2)}€</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-slate-500 mb-1">Componentes Activos</div>
            <div className="text-3xl font-bold">{currentSalaries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-slate-500 mb-1">Categoría Actual</div>
            <div className="text-xl font-bold">
              {categories[0]?.category_name || "Sin categoría"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Componentes Salariales Activos</CardTitle>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Añadir Componente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currentSalaries.map((salary) => (
              <div key={salary.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-semibold">{salary.component_name}</h4>
                    <Badge variant="outline" className="text-xs">{salary.component_code}</Badge>
                  </div>
                  <p className="text-sm text-slate-500">
                    Desde: {salary.start_date ? format(new Date(salary.start_date), 'dd/MM/yyyy') : '-'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-600">{salary.amount}€</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("¿Eliminar este componente?")) {
                        removeComponentMutation.mutate(salary.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}

            {currentSalaries.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <p>No hay componentes salariales asignados</p>
                <Button variant="link" onClick={() => setIsAddDialogOpen(true)}>
                  Añadir el primero
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Componente Salarial</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Componente *</Label>
              <Select value={formData.component_id} onValueChange={(v) => {
                const component = components.find(c => c.id === v);
                setFormData({
                  ...formData,
                  component_id: v,
                  amount: component?.default_value || 0
                });
              }}>
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

            <div className="space-y-2">
              <Label>Importe (€) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha de Inicio</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddComponent} disabled={addComponentMutation.isPending}>
              {addComponentMutation.isPending ? "Añadiendo..." : "Añadir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}