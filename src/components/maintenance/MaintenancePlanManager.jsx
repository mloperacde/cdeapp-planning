import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toaster';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Plus, Edit2, Trash2, CheckCircle2, X, Play } from 'lucide-react';
import { getMachineAlias } from '@/utils/machineAlias';

export default function MaintenancePlanManager({ machine }) {
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [executingPlanId, setExecutingPlanId] = useState(null);
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ['machine-plans', machine?.id],
    queryFn: async () => {
      const allPlans = await base44.entities.MaintenancePlan.list();
      return allPlans.filter(p => p.machine_id === machine.id);
    },
    enabled: !!machine,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenancePlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine-plans', machine?.id] });
    },
  });

  const executePlanMutation = useMutation({
    mutationFn: (plan_id) => base44.functions.invoke('triggerMaintenanceExecution', { plan_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine-plans', machine?.id] });
      setExecutingPlanId(null);
    },
  });

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este plan de mantenimiento?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleExecutePlan = (planId) => {
    setExecutingPlanId(planId);
    executePlanMutation.mutate(planId);
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  if (!machine) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Selecciona una máquina para ver sus planes
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="font-semibold text-sm">{getMachineAlias(machine)}</h3>
          <p className="text-xs text-slate-500">Planes de Mantenimiento</p>
        </div>
        <Button
          onClick={() => {
            setEditingPlan(null);
            setShowForm(true);
          }}
          size="sm"
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nuevo Plan
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {plans.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No hay planes de mantenimiento para esta máquina
          </div>
        ) : (
          plans.map((plan) => (
            <Card key={plan.id} className="border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{plan.nombre_plan}</h4>
                      <p className="text-xs text-slate-500">{plan.descripcion}</p>
                    </div>
                    {plan.activo && <Badge variant="outline" className="bg-green-50 text-green-700">Activo</Badge>}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500">Tipo</p>
                      <p className="font-medium">{plan.tipo}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Periodicidad</p>
                      <p className="font-medium">{plan.periodicidad}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Tareas</p>
                      <p className="font-medium">{plan.tareas?.length || 0}</p>
                    </div>
                    {plan.ultima_ejecucion && (
                      <div>
                        <p className="text-slate-500">Último mantenimiento</p>
                        <p className="font-medium">{new Date(plan.ultima_ejecucion).toLocaleDateString('es-ES')}</p>
                      </div>
                    )}
                    {plan.proxima_fecha && (
                      <div>
                        <p className="text-slate-500">Próxima fecha</p>
                        <p className="font-medium">{new Date(plan.proxima_fecha).toLocaleDateString('es-ES')}</p>
                      </div>
                    )}
                  </div>

                  {plan.tareas && plan.tareas.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-semibold mb-2">Tareas</p>
                      <ul className="space-y-1 text-xs">
                        {plan.tareas.map((tarea, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>
                              {tarea.titulo}
                              {tarea.subtareas?.length > 0 && (
                                <span className="text-slate-500"> ({tarea.subtareas.length} subtareas)</span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleExecutePlan(plan.id)}
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-2 h-8 text-green-600 border-green-300 hover:bg-green-50"
                      disabled={executingPlanId === plan.id}
                    >
                      <Play className="w-3 h-3" />
                      {executingPlanId === plan.id ? 'Ejecutando...' : 'Ejecutar'}
                    </Button>
                    <Button
                      onClick={() => handleEdit(plan)}
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-2 h-8"
                    >
                      <Edit2 className="w-3 h-3" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleDelete(plan.id)}
                      size="sm"
                      variant="ghost"
                      className="h-8 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {showForm && (
        <MaintenancePlanForm
          plan={editingPlan}
          machine={machine}
          onClose={() => {
            setShowForm(false);
            setEditingPlan(null);
          }}
        />
      )}
    </div>
  );
}

function MaintenancePlanForm({ plan, machine, onClose }) {
  const [formData, setFormData] = useState(plan || {
    machine_id: machine.id,
    machine_name: machine.nombre,
    nombre_plan: '',
    descripcion: '',
    tipo: 'Preventivo',
    periodicidad: 'Mensual',
    dias_intervalo: 30,
    ultima_ejecucion: null,
    tareas: [],
  });

  const [newTask, setNewTask] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => {
      if (plan?.id) {
        return base44.entities.MaintenancePlan.update(plan.id, data);
      }
      return base44.entities.MaintenancePlan.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine-plans', machine.id] });
      onClose();
    },
  });

  const handleAddTask = () => {
    if (newTask.trim()) {
      setFormData({
        ...formData,
        tareas: [...(formData.tareas || []), { id: Date.now(), titulo: newTask, subtareas: [] }],
      });
      setNewTask('');
    }
  };

  const handleRemoveTask = (taskId) => {
    setFormData({
      ...formData,
      tareas: formData.tareas.filter(t => t.id !== taskId),
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const periodicidadDays = {
      'Diaria': 1,
      'Semanal': 7,
      'Quincenal': 15,
      'Mensual': 30,
      'Trimestral': 90,
      'Semestral': 180,
      'Anual': 365,
    };

    const baseDate = formData.ultima_ejecucion ? new Date(formData.ultima_ejecucion) : new Date();
    const proxima = new Date(baseDate.getTime() + periodicidadDays[formData.periodicidad] * 24 * 60 * 60 * 1000);
    
    const submitData = {
      ...formData,
      dias_intervalo: periodicidadDays[formData.periodicidad],
      proxima_fecha: proxima.toISOString().split('T')[0],
    };

    mutation.mutate(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle>{plan ? 'Editar Plan' : 'Nuevo Plan de Mantenimiento'}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre del Plan</label>
              <Input
                value={formData.nombre_plan}
                onChange={(e) => setFormData({ ...formData, nombre_plan: e.target.value })}
                placeholder="Ej: Mantenimiento Mensual"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Descripción</label>
              <Input
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción del plan"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Preventivo">Preventivo</SelectItem>
                    <SelectItem value="Correctivo">Correctivo</SelectItem>
                    <SelectItem value="Predictivo">Predictivo</SelectItem>
                    <SelectItem value="Mixto">Mixto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Periodicidad</label>
                <Select value={formData.periodicidad} onValueChange={(v) => setFormData({ ...formData, periodicidad: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diaria">Diaria</SelectItem>
                    <SelectItem value="Semanal">Semanal</SelectItem>
                    <SelectItem value="Quincenal">Quincenal</SelectItem>
                    <SelectItem value="Mensual">Mensual</SelectItem>
                    <SelectItem value="Trimestral">Trimestral</SelectItem>
                    <SelectItem value="Semestral">Semestral</SelectItem>
                    <SelectItem value="Anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Última ejecución</label>
              <Input
                type="date"
                value={formData.ultima_ejecucion ? formData.ultima_ejecucion.split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, ultima_ejecucion: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <label className="text-sm font-medium block mb-3">Tareas</label>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                  placeholder="Añadir tarea..."
                />
                <Button type="button" onClick={handleAddTask} size="sm" variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {formData.tareas?.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900/50 rounded text-sm">
                    <span>{task.titulo}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveTask(task.id)}
                      className="h-6 w-6"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                {plan ? 'Actualizar' : 'Crear'} Plan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}