import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';

export default function MaintenancePlanTemplateForm({ template, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipologia_maquina: '',
    tipo: 'Preventivo',
    periodicidad: 'Mensual',
    dias_intervalo: 30,
    tareas: [],
    activo: true
  });

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTaskIndex, setEditingTaskIndex] = useState(null);

  useEffect(() => {
    if (template) {
      setFormData(template);
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: (data) => 
      template?.id
        ? base44.entities.MaintenancePlanTemplate.update(template.id, data)
        : base44.entities.MaintenancePlanTemplate.create(data),
    onSuccess: () => {
      onSaved?.();
    }
  });

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      setFormData({
        ...formData,
        tareas: [...(formData.tareas || []), {
          id: `tarea-${Date.now()}`,
          titulo: newTaskTitle,
          descripcion: '',
          duracion_minutos: 30,
          subtareas: []
        }]
      });
      setNewTaskTitle('');
    }
  };

  const handleRemoveTask = (index) => {
    setFormData({
      ...formData,
      tareas: formData.tareas.filter((_, i) => i !== index)
    });
  };

  const handleSave = () => {
    if (!formData.nombre.trim()) return;
    saveMutation.mutate(formData);
  };

  const periodicidades = ['Diaria', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral', 'Semestral', 'Anual'];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template?.id ? 'Editar Plantilla' : 'Nueva Plantilla de Mantenimiento'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre de la plantilla"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipología de Máquina</label>
              <Input
                value={formData.tipologia_maquina}
                onChange={(e) => setFormData({ ...formData, tipologia_maquina: e.target.value })}
                placeholder="Ej: Envasadora"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <Textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Descripción detallada del plan"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Periodicidad</label>
              <select
                value={formData.periodicidad}
                onChange={(e) => setFormData({ ...formData, periodicidad: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md"
              >
                {periodicidades.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Intervalo (días)</label>
              <Input
                type="number"
                value={formData.dias_intervalo}
                onChange={(e) => setFormData({ ...formData, dias_intervalo: parseInt(e.target.value) })}
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md"
              >
                <option value="Preventivo">Preventivo</option>
                <option value="Correctivo">Correctivo</option>
                <option value="Predictivo">Predictivo</option>
              </select>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm mb-3">Tareas</h3>
            
            <div className="flex gap-2 mb-4">
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Agregar nueva tarea..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
              />
              <Button onClick={handleAddTask} size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                Agregar
              </Button>
            </div>

            <div className="space-y-2">
              {(formData.tareas || []).map((task, idx) => (
                <Card key={task.id} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{task.titulo}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {task.duracion_minutos} min
                        {task.subtareas?.length > 0 && ` • ${task.subtareas.length} subtareas`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => handleRemoveTask(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || !formData.nombre.trim()}
              className="gap-2"
            >
              {saveMutation.isPending ? 'Guardando...' : 'Guardar Plantilla'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}