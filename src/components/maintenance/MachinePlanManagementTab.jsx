import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Calendar, CheckCircle, Edit2, Plus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
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

export default function MachinePlanManagementTab({ machine }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    periodicidad: 'Mensual',
    dias_intervalo: 30,
    ultima_ejecucion: new Date().toISOString().split('T')[0]
  });
  const queryClient = useQueryClient();

  // Obtener tipos de mantenimiento que aplican a esta máquina
  const { data: maintenanceTypes = [] } = useQuery({
    queryKey: ['maintenance-types'],
    queryFn: () => base44.entities.MaintenanceType.list(),
    staleTime: 10 * 60 * 1000,
  });

  // Obtener planes de mantenimiento para esta máquina
  const { data: machinePlans = [] } = useQuery({
    queryKey: ['machine-plans', machine.id],
    queryFn: () => base44.entities.MaintenancePlan.filter({ machine_id: machine.id }),
    staleTime: 5 * 60 * 1000,
  });

  // Tipos de mantenimiento aplicables a esta máquina
  const applicableTypes = maintenanceTypes.filter(mt => 
    mt.machine_ids && mt.machine_ids.includes(machine.id)
  );

  const createPlanMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenancePlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine-plans', machine.id] });
      setShowDialog(false);
      setFormData({
        periodicidad: 'Mensual',
        dias_intervalo: 30,
        ultima_ejecucion: new Date().toISOString().split('T')[0]
      });
      toast.success('Plan de mantenimiento creado');
    },
    onError: (error) => {
      toast.error('Error al crear plan: ' + error.message);
    }
  });

  const updatePlanMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenancePlan.update(editingPlan.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine-plans', machine.id] });
      setShowDialog(false);
      setEditingPlan(null);
      toast.success('Plan actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar: ' + error.message);
    }
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenancePlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine-plans', machine.id] });
      toast.success('Plan eliminado');
    }
  });

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
      const maintenanceType = applicableTypes[0];
      if (!maintenanceType) {
        toast.error('No hay tipos de mantenimiento asignados a esta máquina');
        return;
      }

      createPlanMutation.mutate({
        machine_id: machine.id,
        machine_name: machine.nombre || machine.nombre_maquina,
        nombre_plan: `${maintenanceType.nombre}`,
        descripcion: maintenanceType.descripcion || '',
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

  const handleOpenNew = () => {
    setEditingPlan(null);
    setFormData({
      periodicidad: 'Mensual',
      dias_intervalo: 30,
      ultima_ejecucion: new Date().toISOString().split('T')[0]
    });
    setShowDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Tipos de Mantenimiento Asignados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Tipos de Mantenimiento Asignados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {applicableTypes.length === 0 ? (
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <AlertCircle className="w-5 h-5 text-slate-400" />
              <p className="text-sm text-slate-600">
                No hay tipos de mantenimiento asignados a esta máquina. Configúralos en el gestor de tipos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {applicableTypes.map((type) => (
                <div key={type.id} className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <h4 className="font-semibold text-sm">{type.nombre}</h4>
                  {type.descripcion && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{type.descripcion}</p>
                  )}
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      {[1,2,3,4,5,6].filter(i => type[`tarea_${i}`]?.nombre).length} tarea(s)
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Planes de Mantenimiento Configurados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            Planes Configurados ({machinePlans.length})
          </CardTitle>
          {applicableTypes.length > 0 && (
            <Button size="sm" onClick={handleOpenNew} className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Plan
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {machinePlans.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No hay planes configurados</p>
          ) : (
            <div className="space-y-3">
              {machinePlans.map((plan) => {
                const isOverdue = plan.proxima_fecha && new Date(plan.proxima_fecha) < new Date();
                return (
                  <div 
                    key={plan.id} 
                    className={`p-4 border rounded-lg ${
                      isOverdue 
                        ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900/30' 
                        : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-sm">{plan.nombre_plan}</h4>
                          <Badge className={isOverdue ? 'bg-red-600' : 'bg-green-600'} variant="default">
                            {isOverdue ? 'Vencido' : 'Activo'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-500">Periodicidad:</span>
                            <p className="font-medium">{plan.periodicidad}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Intervalo:</span>
                            <p className="font-medium">{plan.dias_intervalo} días</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Último:</span>
                            <p className="font-medium">
                              {format(new Date(plan.ultima_ejecucion || new Date()), 'dd/MM/yyyy', { locale: es })}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500">Próximo:</span>
                            <p className="font-medium">
                              {format(new Date(plan.proxima_fecha), 'dd/MM/yyyy', { locale: es })}
                            </p>
                          </div>
                        </div>

                        {plan.tareas && plan.tareas.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-semibold mb-2">Tareas ({plan.tareas.length}):</p>
                            <div className="space-y-1">
                              {plan.tareas.slice(0, 3).map((tarea, idx) => (
                                <div key={idx} className="text-xs flex items-start gap-2">
                                  <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="font-medium">{tarea.titulo}</p>
                                    {tarea.subtareas && tarea.subtareas.length > 0 && (
                                      <p className="text-slate-500">{tarea.subtareas.length} subtarea(s)</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(plan)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deletePlanMutation.mutate(plan.id)}
                          className="hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear/editar plan */}
      {showDialog && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? 'Editar Plan de Mantenimiento' : 'Nuevo Plan de Mantenimiento'}
              </DialogTitle>
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
              </div>

              <div className="flex gap-3">
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