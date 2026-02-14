import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, History, AlertCircle, Edit } from "lucide-react";
import SalaryAuditHistory from "./SalaryAuditHistory";
import { useAppData } from "@/components/data/DataProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";

export default function EmployeeSalaryDetail({ employee, onBack }) {
  const queryClient = useQueryClient();
  const { user } = useAppData();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [formData, setFormData] = useState({
    component_id: "",
    amount: 0,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    change_reason: ""
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
    mutationFn: async (data) => {
      const component = components.find(c => c.id === data.component_id);
      
      // Crear solicitud de cambio
      const request = await base44.entities.SalaryChangeRequest.create({
        employee_id: employee.id,
        employee_name: employee.nombre,
        request_type: "Nuevo Componente",
        component_id: data.component_id,
        component_name: component.name,
        current_amount: 0,
        requested_amount: data.amount,
        change_reason: data.change_reason || "Nuevo componente salarial",
        effective_date: data.start_date,
        requested_by: user.id,
        requested_by_name: user.full_name,
        request_date: new Date().toISOString(),
        status: "Pendiente"
      });

      // Log de auditoría
      await base44.entities.SalaryAuditLog.create({
        entity_type: "EmployeeSalary",
        entity_id: request.id,
        action: "create",
        employee_id: employee.id,
        employee_name: employee.nombre,
        new_value: `${component.name}: ${data.amount}€`,
        change_amount: data.amount,
        change_reason: data.change_reason || "Nuevo componente salarial",
        changed_by: user.id,
        changed_by_name: user.full_name,
        change_date: new Date().toISOString(),
        request_id: request.id
      });

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['salaryChangeRequests'] });
      toast.success("Solicitud de cambio creada y pendiente de aprobación");
      setIsAddDialogOpen(false);
      setFormData({ component_id: "", amount: 0, start_date: format(new Date(), 'yyyy-MM-dd'), change_reason: "" });
    },
  });

  const [editingComponent, setEditingComponent] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    amount: 0,
    change_reason: ""
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

  const editComponentMutation = useMutation({
    mutationFn: async (data) => {
      // Crear solicitud de cambio
      const request = await base44.entities.SalaryChangeRequest.create({
        employee_id: employee.id,
        employee_name: employee.nombre,
        request_type: "Modificación Componente",
        component_id: editingComponent.component_id,
        component_name: editingComponent.component_name,
        current_amount: editingComponent.amount,
        requested_amount: data.amount,
        change_reason: data.change_reason,
        effective_date: format(new Date(), 'yyyy-MM-dd'),
        requested_by: user.id,
        requested_by_name: user.full_name,
        request_date: new Date().toISOString(),
        status: "Pendiente"
      });

      // Log de auditoría
      await base44.entities.SalaryAuditLog.create({
        entity_type: "EmployeeSalary",
        entity_id: request.id,
        action: "update",
        employee_id: employee.id,
        employee_name: employee.nombre,
        old_value: `${editingComponent.component_name}: ${editingComponent.amount}€`,
        new_value: `${editingComponent.component_name}: ${data.amount}€`,
        change_amount: data.amount - editingComponent.amount,
        change_reason: data.change_reason,
        changed_by: user.id,
        changed_by_name: user.full_name,
        change_date: new Date().toISOString(),
        request_id: request.id
      });

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeSalaries'] });
      queryClient.invalidateQueries({ queryKey: ['salaryChangeRequests'] });
      toast.success("Solicitud de cambio creada y pendiente de aprobación");
      setIsEditDialogOpen(false);
      setEditingComponent(null);
    },
  });

  const handleEditComponent = (salary) => {
    setEditingComponent(salary);
    setEditFormData({
      amount: salary.amount,
      change_reason: ""
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editFormData.amount <= 0) {
      toast.error("El importe debe ser mayor que 0");
      return;
    }
    if (!editFormData.change_reason?.trim()) {
      toast.error("Debes justificar el cambio");
      return;
    }
    editComponentMutation.mutate(editFormData);
  };

  const handleAddComponent = () => {
    if (!formData.component_id || formData.amount <= 0) {
      toast.error("Selecciona un componente y un importe válido");
      return;
    }
    if (!formData.change_reason?.trim()) {
      toast.error("Debes justificar el cambio");
      return;
    }
    addComponentMutation.mutate(formData);
  };

  const totalSalary = useMemo(() => currentSalaries.reduce((sum, s) => sum + (s.amount || 0), 0), [currentSalaries]);
  const hoursPerDay = useMemo(() => {
    if (typeof employee.num_horas_jornada === 'number' && employee.num_horas_jornada > 0) return employee.num_horas_jornada;
    const parsed = parseFloat(employee.num_horas_jornada);
    return isNaN(parsed) || parsed <= 0 ? 8 : parsed;
  }, [employee]);
  const jornadaFactor = useMemo(() => Math.max(0, hoursPerDay / 8), [hoursPerDay]);
  const adjustedTotal = useMemo(() => totalSalary * jornadaFactor, [totalSalary, jornadaFactor]);

  if (showHistory) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setShowHistory(false)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Detalles
        </Button>
        <SalaryAuditHistory employeeId={employee.id} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
        <Button variant="outline" onClick={() => setShowHistory(true)} className="gap-2">
          <History className="w-4 h-4" />
          Ver Historial
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-slate-500 mb-1">Salario Ajustado (Mensual)</div>
            <div className="text-3xl font-bold text-emerald-600">{adjustedTotal.toFixed(2)}€</div>
            <div className="text-xs text-slate-500 mt-1">Base 8h: {totalSalary.toFixed(2)}€ • Jornada: {hoursPerDay}h/día</div>
            <div className="text-xs text-slate-500 mt-1">Anual: {(adjustedTotal * 14).toFixed(2)}€</div>
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
                    <div className="text-[11px] text-slate-500">Anual: {(salary.amount * 14).toFixed(2)}€</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditComponent(salary)}
                  >
                    <Edit className="w-4 h-4 text-blue-500" />
                  </Button>
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

            <div className="space-y-2">
              <Label>Justificación del Cambio *</Label>
              <Textarea
                value={formData.change_reason}
                onChange={(e) => setFormData({...formData, change_reason: e.target.value})}
                placeholder="Explica el motivo de este nuevo componente..."
                rows={3}
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Flujo de Aprobación</p>
                <p>Esta solicitud será enviada para aprobación antes de aplicarse al empleado.</p>
              </div>
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Componente Salarial</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
              <div className="font-medium mb-1">{editingComponent?.component_name}</div>
              <div className="text-sm text-slate-500">
                Importe actual: <span className="font-semibold text-emerald-600">{editingComponent?.amount}€</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nuevo Importe (€) *</Label>
              <Input
                type="number"
                step="0.01"
                value={editFormData.amount}
                onChange={(e) => setEditFormData({...editFormData, amount: parseFloat(e.target.value) || 0})}
              />
            </div>

            <div className="space-y-2">
              <Label>Justificación del Cambio *</Label>
              <Textarea
                value={editFormData.change_reason}
                onChange={(e) => setEditFormData({...editFormData, change_reason: e.target.value})}
                placeholder="Explica el motivo de este cambio..."
                rows={3}
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Flujo de Aprobación</p>
                <p>Esta solicitud será enviada para aprobación antes de aplicarse.</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={editComponentMutation.isPending}>
              {editComponentMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
