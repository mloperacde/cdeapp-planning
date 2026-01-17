import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, GitBranch, Clock, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const NATIVE_ROLES = [
  { id: 'admin', role_name: 'Administrador' },
  { id: 'user', role_name: 'Usuario' },
];

export default function ApprovalFlowManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingFlow, setEditingFlow] = useState(null);
  const queryClient = useQueryClient();

  const { data: absenceTypes = [] } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.list('orden'),
    initialData: [],
  });

  const { data: flows = [] } = useQuery({
    queryKey: ['approvalFlows'],
    queryFn: () => base44.entities.AbsenceApprovalFlow.list(),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AbsenceApprovalFlow.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalFlows'] });
      toast.success("Flujo eliminado");
    }
  });

  const handleEdit = (flow) => {
    setEditingFlow(flow);
    setShowForm(true);
  };

  const handleDelete = (flow) => {
    if (window.confirm("¿Eliminar flujo de aprobación?")) {
      deleteMutation.mutate(flow.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-blue-600" />
          Flujos de Aprobación
        </h2>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Flujo
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {flows.map(flow => {
          const absenceType = absenceTypes.find(at => at.id === flow.absence_type_id);
          
          return (
            <Card key={flow.id} className="border-2 border-blue-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <GitBranch className="w-5 h-5 text-blue-600" />
                      {absenceType?.nombre || "Tipo desconocido"}
                    </CardTitle>
                    <p className="text-sm text-slate-600 mt-1">
                      {flow.niveles_aprobacion?.length || 0} nivel(es) de aprobación
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(flow)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(flow)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  {flow.requiere_todos_niveles && (
                    <Badge className="bg-purple-100 text-purple-800">Todos los Niveles</Badge>
                  )}
                  {flow.notificar_al_crear && (
                    <Badge className="bg-blue-100 text-blue-800">Notificación Automática</Badge>
                  )}
                  {flow.notificar_antes_escalado && (
                    <Badge className="bg-orange-100 text-orange-800">Recordatorios</Badge>
                  )}
                </div>

                <div className="space-y-2">
                  {flow.niveles_aprobacion?.map((nivel, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Badge className="bg-blue-600 text-white">Nivel {nivel.nivel}</Badge>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{nivel.descripcion}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {nivel.roles_aprobadores?.map((roleId, rIdx) => {
                            const role = NATIVE_ROLES.find(r => r.id === roleId);
                            return role ? (
                              <Badge key={rIdx} variant="outline" className="text-xs">
                                {role.role_name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                      {nivel.plazo_horas && (
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Clock className="w-3 h-3" />
                          {nivel.plazo_horas}h
                        </div>
                      )}
                      {idx < flow.niveles_aprobacion.length - 1 && (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {flows.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <GitBranch className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-4">No hay flujos de aprobación configurados</p>
              <Button onClick={() => setShowForm(true)}>Crear Primer Flujo</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {showForm && (
          <ApprovalFlowForm
          flow={editingFlow}
          absenceTypes={absenceTypes}
          roles={NATIVE_ROLES}
          onClose={() => {
            setShowForm(false);
            setEditingFlow(null);
          }}
        />
      )}
    </div>
  );
}

function ApprovalFlowForm({ flow, absenceTypes, roles, onClose }) {
  const [formData, setFormData] = useState(flow || {
    absence_type_id: "",
    niveles_aprobacion: [
      {
        nivel: 1,
        roles_aprobadores: [],
        descripcion: "Primer nivel de aprobación",
        plazo_horas: 48,
        escalado_automatico: true
      }
    ],
    requiere_todos_niveles: false,
    notificar_al_crear: true,
    notificar_antes_escalado: true,
    horas_recordatorio: 24,
    activo: true
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (flow?.id) {
        return base44.entities.AbsenceApprovalFlow.update(flow.id, data);
      }
      return base44.entities.AbsenceApprovalFlow.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalFlows'] });
      toast.success(flow ? "Flujo actualizado" : "Flujo creado");
      onClose();
    }
  });

  const addLevel = () => {
    const newLevel = {
      nivel: formData.niveles_aprobacion.length + 1,
      roles_aprobadores: [],
      descripcion: `Nivel ${formData.niveles_aprobacion.length + 1}`,
      plazo_horas: 48,
      escalado_automatico: true
    };
    setFormData({
      ...formData,
      niveles_aprobacion: [...formData.niveles_aprobacion, newLevel]
    });
  };

  const removeLevel = (index) => {
    const updated = formData.niveles_aprobacion.filter((_, i) => i !== index);
    setFormData({ ...formData, niveles_aprobacion: updated });
  };

  const updateLevel = (index, field, value) => {
    const updated = [...formData.niveles_aprobacion];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, niveles_aprobacion: updated });
  };

  const toggleRole = (levelIndex, roleId) => {
    const level = formData.niveles_aprobacion[levelIndex];
    const roles = level.roles_aprobadores || [];
    const updated = roles.includes(roleId)
      ? roles.filter(r => r !== roleId)
      : [...roles, roleId];
    updateLevel(levelIndex, 'roles_aprobadores', updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.absence_type_id) {
      toast.error("Selecciona un tipo de ausencia");
      return;
    }
    if (formData.niveles_aprobacion.length === 0) {
      toast.error("Añade al menos un nivel de aprobación");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{flow ? "Editar Flujo" : "Nuevo Flujo de Aprobación"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Ausencia *</Label>
            <Select value={formData.absence_type_id} onValueChange={(value) => setFormData({...formData, absence_type_id: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {absenceTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Niveles de Aprobación</Label>
              <Button type="button" onClick={addLevel} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Añadir Nivel
              </Button>
            </div>

            {formData.niveles_aprobacion.map((nivel, idx) => (
              <Card key={idx} className="border-2 border-slate-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-blue-600 text-white">Nivel {nivel.nivel}</Badge>
                    {formData.niveles_aprobacion.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLevel(idx)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Input
                      value={nivel.descripcion}
                      onChange={(e) => updateLevel(idx, 'descripcion', e.target.value)}
                      placeholder="ej. Aprobación de Supervisor"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Roles Aprobadores *</Label>
                    <div className="border rounded p-3 space-y-2 max-h-32 overflow-y-auto">
                      {roles.map(role => (
                        <div key={role.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={nivel.roles_aprobadores?.includes(role.id)}
                            onCheckedChange={() => toggleRole(idx, role.id)}
                          />
                          <label className="text-sm cursor-pointer" onClick={() => toggleRole(idx, role.id)}>
                            {role.role_name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Plazo (horas)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={nivel.plazo_horas}
                        onChange={(e) => updateLevel(idx, 'plazo_horas', parseInt(e.target.value) || 48)}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-7">
                      <Checkbox
                        checked={nivel.escalado_automatico}
                        onCheckedChange={(checked) => updateLevel(idx, 'escalado_automatico', checked)}
                      />
                      <label className="text-sm">Escalado Automático</label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.requiere_todos_niveles}
                onCheckedChange={(checked) => setFormData({...formData, requiere_todos_niveles: checked})}
              />
              <label className="text-sm">Requiere aprobación de todos los niveles</label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.notificar_al_crear}
                onCheckedChange={(checked) => setFormData({...formData, notificar_al_crear: checked})}
              />
              <label className="text-sm">Notificar al crear solicitud</label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.notificar_antes_escalado}
                onCheckedChange={(checked) => setFormData({...formData, notificar_antes_escalado: checked})}
              />
              <label className="text-sm">Enviar recordatorio antes de escalar</label>
            </div>

            {formData.notificar_antes_escalado && (
              <div className="ml-6 space-y-2">
                <Label>Horas antes del escalado para recordatorio</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.horas_recordatorio}
                  onChange={(e) => setFormData({...formData, horas_recordatorio: parseInt(e.target.value) || 24})}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : flow ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
