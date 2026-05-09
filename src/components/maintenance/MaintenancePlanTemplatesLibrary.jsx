import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Brain, Copy, Trash2, Edit, Zap } from 'lucide-react';
import MaintenancePlanTemplateForm from './MaintenancePlanTemplateForm';
import MaintenancePlanTemplateAIGenerator from './MaintenancePlanTemplateAIGenerator';

export default function MaintenancePlanTemplatesLibrary({ onSelectTemplate, open, onOpenChange }) {
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [machineTypeFilter, setMachineTypeFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['maintenance-plan-templates'],
    queryFn: async () => {
      const data = await base44.entities.MaintenancePlanTemplate?.list?.() || [];
      return Array.isArray(data) ? data : [];
    },
    enabled: open,
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenancePlanTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-plan-templates'] });
    },
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template) => {
      const newTemplate = { ...template };
      delete newTemplate.id;
      delete newTemplate.created_date;
      delete newTemplate.updated_date;
      newTemplate.nombre = `${template.nombre} (Copia)`;
      return base44.entities.MaintenancePlanTemplate.create(newTemplate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-plan-templates'] });
    },
  });

  const filteredTemplates = machineTypeFilter === 'all' 
    ? templates 
    : templates.filter(t => t.tipologia_maquina === machineTypeFilter);

  const machineTypes = [...new Set(templates.map(t => t.tipologia_maquina).filter(Boolean))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            Biblioteca de Plantillas de Mantenimiento
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Plantillas Existentes</TabsTrigger>
            <TabsTrigger value="ai-generator">Generar con IA</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4 mt-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipología:</span>
                <select
                  value={machineTypeFilter}
                  onChange={(e) => setMachineTypeFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
                >
                  <option value="all">Todas las tipologías</option>
                  {machineTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <Button
                onClick={() => {
                  setEditingTemplate(null);
                  setShowForm(true);
                }}
                size="sm"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Nueva Plantilla
              </Button>
            </div>

            {filteredTemplates.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <p>No hay plantillas disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm">{template.nombre}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {template.tipologia_maquina || 'Tipología general'}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {template.periodicidad}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {template.descripcion}
                      </p>
                      {template.tareas && (
                        <div className="text-xs text-slate-500">
                          <strong>{template.tareas.length}</strong> tareas incluidas
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectTemplate(template)}
                          className="flex-1 text-xs h-8"
                        >
                          Usar Plantilla
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => duplicateTemplateMutation.mutate(template)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingTemplate(template);
                            setShowForm(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => {
                            if (window.confirm('¿Eliminar esta plantilla?')) {
                              deleteTemplateMutation.mutate(template.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai-generator" className="mt-4">
            <MaintenancePlanTemplateAIGenerator
              onTemplateGenerated={(template) => {
                queryClient.invalidateQueries({ queryKey: ['maintenance-plan-templates'] });
                onSelectTemplate(template);
                onOpenChange(false);
              }}
            />
          </TabsContent>
        </Tabs>

        {showForm && (
          <MaintenancePlanTemplateForm
            template={editingTemplate}
            onClose={() => {
              setShowForm(false);
              setEditingTemplate(null);
            }}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['maintenance-plan-templates'] });
              setShowForm(false);
              setEditingTemplate(null);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}