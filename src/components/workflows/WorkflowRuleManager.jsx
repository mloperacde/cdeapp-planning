import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Workflow, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function WorkflowRuleManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const queryClient = useQueryClient();

  const { data: rules = [] } = useQuery({
    queryKey: ['workflowRules'],
    queryFn: () => base44.entities.WorkflowRule.list(),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingRule?.id) {
        return base44.entities.WorkflowRule.update(editingRule.id, data);
      }
      return base44.entities.WorkflowRule.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowRules'] });
      toast.success("Regla guardada correctamente");
      handleClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkflowRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowRules'] });
      toast.success("Regla eliminada");
    }
  });

  const handleClose = () => {
    setShowForm(false);
    setEditingRule(null);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setShowForm(true);
  };

  const handleDelete = (rule) => {
    if (window.confirm(`¿Eliminar regla "${rule.nombre}"?`)) {
      deleteMutation.mutate(rule.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Workflow className="w-6 h-6 text-blue-600" />
            Flujos de Trabajo Automatizados
          </h2>
          <p className="text-slate-600 mt-1">
            Define reglas para automatizar procesos y notificaciones
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Regla
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rules.map(rule => (
          <Card key={rule.id} className={`border-l-4 ${rule.activo ? 'border-green-500' : 'border-slate-300'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{rule.nombre}</CardTitle>
                  <Badge variant="outline" className="mt-2">{rule.tipo_flujo}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(rule)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-slate-600 font-semibold">Acciones:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {rule.acciones?.map((accion, idx) => (
                    <Badge key={idx} className="text-xs bg-blue-100 text-blue-800">
                      {accion.tipo}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Badge className={rule.activo ? "bg-green-600" : "bg-slate-400"}>
                  {rule.activo ? "Activa" : "Inactiva"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rules.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No hay reglas de flujo configuradas</p>
            <Button onClick={() => setShowForm(true)} className="mt-4">
              Crear Primera Regla
            </Button>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <WorkflowRuleForm
          rule={editingRule}
          onClose={handleClose}
          onSave={(data) => saveMutation.mutate(data)}
        />
      )}
    </div>
  );
}

function WorkflowRuleForm({ rule, onClose, onSave }) {
  const [formData, setFormData] = useState(rule || {
    nombre: "",
    tipo_flujo: "ausencia",
    condiciones: {},
    acciones: [],
    activo: true,
    prioridad: 0
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{rule ? "Editar Regla" : "Nueva Regla de Flujo"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Flujo *</Label>
              <Select
                value={formData.tipo_flujo}
                onValueChange={(value) => setFormData({...formData, tipo_flujo: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ausencia">Ausencias</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="contrato">Contratos</SelectItem>
                  <SelectItem value="notificacion">Notificaciones</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Ejemplo:</strong> Para ausencias mayores a 7 días, crear notificación al supervisor.
              Configura las condiciones y acciones en formato JSON.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Condiciones (JSON)</Label>
            <Textarea
              value={JSON.stringify(formData.condiciones, null, 2)}
              onChange={(e) => {
                try {
                  setFormData({...formData, condiciones: JSON.parse(e.target.value)});
                } catch {}
              }}
              rows={4}
              placeholder='{"dias_ausencia_mayor_que": 7}'
            />
          </div>

          <div className="space-y-2">
            <Label>Acciones (JSON)</Label>
            <Textarea
              value={JSON.stringify(formData.acciones, null, 2)}
              onChange={(e) => {
                try {
                  setFormData({...formData, acciones: JSON.parse(e.target.value)});
                } catch {}
              }}
              rows={6}
              placeholder='[{"tipo": "crear_notificacion", "parametros": {...}}]'
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              Guardar Regla
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}