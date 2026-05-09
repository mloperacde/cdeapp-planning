import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertCircle, Calendar, CheckCircle, Edit2, Plus, Trash2, Clock, AlertTriangle, Zap } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, differenceInDays, isPast } from "date-fns";
import { es } from "date-fns/locale";

const PERIODICITIES = {
  'Diaria': 1,
  'Semanal': 7,
  'Quincenal': 15,
  'Mensual': 30,
  'Trimestral': 90,
  'Semestral': 180,
  'Anual': 365
};

export default function GmaoMaintenancePlans({ machine }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    periodicidad: 'Mensual',
    dias_intervalo: 30,
    ultima_ejecucion: new Date().toISOString().split('T')[0]
  });
  const queryClient = useQueryClient();

  // Obtener planes para esta máquina específica
  const { data: machinePlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['gmao-plans', machine.id],
    queryFn: async () => {
      try {
        const allPlans = await base44.entities.MaintenancePlan.list(undefined, 100);
        return allPlans.filter(p => p.machine_id === machine.id);
      } catch (err) {
        console.error('Error loading plans:', err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const createPlanMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenancePlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmao-plans', machine.id] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
      setShowDialog(false);
      resetForm();
      toast.success('Plan de mantenimiento creado');
    },
    onError: (error) => {
      toast.error('Error al crear plan: ' + error.message);
    }
  });

  const updatePlanMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenancePlan.update(editingPlan.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmao-plans', machine.id] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
      setShowDialog(false);
      setEditingPlan(null);
      resetForm();
      toast.success('Plan actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar: ' + error.message);
    }
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenancePlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmao-plans', machine.id] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
      toast.success('Plan eliminado');
    },
    onError: (error) => {
      toast.error('Error al eliminar: ' + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      periodicidad: 'Mensual',
      dias_intervalo: 30,
      ultima_ejecucion: new Date().toISOString().split('T')[0]
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const diasIntervalo = PERIODICITIES[formData.periodicidad] || 30;
    const proximaFecha = addDays(new Date(formData.ultima_ejecucion), diasIntervalo);

    const planData = {
      periodicidad: formData.periodicidad,
      dias_intervalo: diasIntervalo,
      ultima_ejecucion: formData.ultima_ejecucion + 'T00:00:00.000Z',
      proxima_fecha: proximaFecha.toISOString().split('T')[0],
      activo: true
    };

    if (editingPlan) {
      updatePlanMutation.mutate(planData);
    } else {
      createPlanMutation.mutate({
        machine_id: machine.id,
        machine_name: machine.nombre_maquina || machine.nombre || getMachineDisplay(),
        nombre_plan: `Plan ${formData.periodicidad} - ${machine.nombre_maquina || machine.nombre}`,
        descripcion: `Plan de mantenimiento preventivo ${formData.periodicidad.toLowerCase()} para ${machine.nombre_maquina || machine.nombre}`,
        tipo: 'Preventivo',
        ...planData,
        tareas: []
      });
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      periodicidad: plan.periodicidad || 'Mensual',
      dias_intervalo: plan.dias_intervalo || 30,
      ultima_ejecucion: plan.ultima_ejecucion ? plan.ultima_ejecucion.split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setShowDialog(true);
  };

  const getMachineDisplay = () => {
    return machine.nombre_maquina || machine.nombre || machine.codigo_maquina || machine.id;
  };

  const getPlanStatus = (plan) => {
    if (!plan.activo) {
      return { status: 'inactivo', color: 'bg-slate-100 text-slate-700', icon: AlertCircle, label: 'Inactivo' };
    }

    const proximaDate = new Date(plan.proxima_fecha);
    const ahora = new Date();
    const dias = differenceInDays(proximaDate, ahora);

    if (isPast(proximaDate)) {
      return { status: 'vencido', color: 'bg-red-100 text-red-700', icon: AlertTriangle, label: 'VENCIDO', days: dias };
    } else if (dias <= 7) {
      return { status: 'urgente', color: 'bg-orange-100 text-orange-700', icon: Clock, label: 'PRÓXIMO', days: dias };
    } else {
      return { status: 'activo', color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Activo', days: dias };
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumen de Planes */}
      {machinePlans.length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                Planes de Mantenimiento Configurados
              </div>
              <Badge variant="outline" className="bg-white">{machinePlans.length} plan(es)</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {machinePlans.map((plan) => {
                const { status, color, icon: IconComponent, label, days } = getPlanStatus(plan);
                const isOverdue = isPast(new Date(plan.proxima_fecha));

                return (
                  <div
                    key={plan.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isOverdue
                        ? 'bg-red-50 border-red-300 dark:bg-red-900/20'
                        : 'bg-white dark:bg-slate-800 border-green-300 dark:border-green-900'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{plan.nombre_plan}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{plan.descripcion}</p>
                      </div>
                      <Badge className={color}>
                        <IconComponent className="w-3 h-3 mr-1" />
                        {label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-3 bg-slate-50 dark:bg-slate-700/50 p-2 rounded">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block">Periodicidad</span>
                        <p className="font-semibold">{plan.periodicidad}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block">Intervalo</span>
                        <p className="font-semibold">{plan.dias_intervalo}d</p>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block">Último</span>
                        <p className="font-semibold">
                          {format(new Date(plan.ultima_ejecucion), 'dd/MM/yy', { locale: es })}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block">Próximo</span>
                        <p className={`font-semibold ${isOverdue ? 'text-red-600' : ''}`}>
                          {format(new Date(plan.proxima_fecha), 'dd/MM/yy', { locale: es })}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(plan)}
                        className="flex-1"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deletePlanMutation.mutate(plan.id)}
                        className="hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sin planes */}
      {machinePlans.length === 0 && !plansLoading && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 mb-4">No hay planes de mantenimiento configurados</p>
              <Button onClick={() => setShowDialog(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botón Agregar Plan */}
      {machinePlans.length > 0 && (
        <Button onClick={() => setShowDialog(true)} className="w-full gap-2">
          <Plus className="w-4 h-4" />
          Agregar Otro Plan
        </Button>
      )}

      {/* Dialog para crear/editar */}
      {showDialog && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? 'Editar Plan de Mantenimiento' : 'Nuevo Plan de Mantenimiento'}
              </DialogTitle>
              <DialogDescription>
                Máquina: {getMachineDisplay()}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="periodicidad">Periodicidad</Label>
                <Select
                  value={formData.periodicidad}
                  onValueChange={(value) => {
                    setFormData({
                      ...formData,
                      periodicidad: value,
                      dias_intervalo: PERIODICITIES[value] || 30
                    });
                  }}
                >
                  <SelectTrigger id="periodicidad">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(PERIODICITIES).map((period) => (
                      <SelectItem key={period} value={period}>
                        {period}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dias">Intervalo (días)</Label>
                <Input
                  id="dias"
                  type="number"
                  min="1"
                  value={formData.dias_intervalo}
                  onChange={(e) => setFormData({
                    ...formData,
                    dias_intervalo: parseInt(e.target.value) || 30
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ultima_ejecucion">Última Ejecución</Label>
                <Input
                  id="ultima_ejecucion"
                  type="date"
                  value={formData.ultima_ejecucion}
                  onChange={(e) => setFormData({
                    ...formData,
                    ultima_ejecucion: e.target.value
                  })}
                />
                <p className="text-xs text-slate-500">
                  Próximo mantenimiento: {format(addDays(new Date(formData.ultima_ejecucion), PERIODICITIES[formData.periodicidad]), 'dd/MM/yyyy', { locale: es })}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  {editingPlan ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}