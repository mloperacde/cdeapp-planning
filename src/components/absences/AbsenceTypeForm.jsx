
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AbsenceTypeForm({ type, onClose }) {
  const [formData, setFormData] = useState(type || {
    nombre: "",
    codigo: "",
    categoria: "Permiso Retribuido",
    descripcion: "",
    remunerada: false,
    no_consume_vacaciones: true, // Added new field
    requiere_aprobacion: true,
    duracion_descripcion: "",
    color: "#3B82F6",
    activo: true,
    visible_empleados: true,
    es_critica: false,
    notificar_admin: false,
    dias_aviso_previo: 0,
    orden: 0
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (type?.id) {
        return base44.entities.AbsenceType.update(type.id, data);
      }
      return base44.entities.AbsenceType.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absenceTypes'] });
      toast.success(type ? "Tipo actualizado" : "Tipo creado");
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.codigo) {
      toast.error("Nombre y código son obligatorios");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{type ? "Editar Tipo de Ausencia" : "Nuevo Tipo de Ausencia"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                placeholder="ej. Maternidad, Baja Médica..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Código *</Label>
              <Input
                value={formData.codigo}
                onChange={(e) => setFormData({...formData, codigo: e.target.value.toUpperCase()})}
                placeholder="ej. MAT, BAJA_MED..."
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select value={formData.categoria} onValueChange={(value) => setFormData({...formData, categoria: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Permiso Retribuido">Permiso Retribuido</SelectItem>
                <SelectItem value="Permiso No Retribuido">Permiso No Retribuido</SelectItem>
                <SelectItem value="Vacaciones">Vacaciones</SelectItem>
                <SelectItem value="Baja Médica">Baja Médica</SelectItem>
                <SelectItem value="Suspensión Contrato">Suspensión Contrato</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              rows={2}
              placeholder="Descripción del tipo de ausencia"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duración</Label>
              <Input
                value={formData.duracion_descripcion}
                onChange={(e) => setFormData({...formData, duracion_descripcion: e.target.value})}
                placeholder="ej. 15 días, tiempo indispensable..."
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  className="w-20"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  placeholder="#3B82F6"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.remunerada}
                onCheckedChange={(checked) => setFormData({...formData, remunerada: checked})}
              />
              <label className="text-sm cursor-pointer">Ausencia Remunerada</label>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Checkbox
                checked={formData.no_consume_vacaciones}
                onCheckedChange={(checked) => setFormData({...formData, no_consume_vacaciones: checked})}
                id="no_consume_vacaciones" // Added ID for better accessibility with label
              />
              <div className="flex-1">
                <label htmlFor="no_consume_vacaciones" className="text-sm font-medium cursor-pointer">
                  NO consume vacaciones (genera saldo pendiente)
                </label>
                <p className="text-xs text-amber-700 mt-1">
                  Si se activa, cuando esta ausencia coincida con vacaciones colectivas, 
                  se sumará al saldo de vacaciones pendientes del empleado.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.requiere_aprobacion}
                onCheckedChange={(checked) => setFormData({...formData, requiere_aprobacion: checked})}
              />
              <label className="text-sm cursor-pointer">Requiere Aprobación</label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.es_critica}
                onCheckedChange={(checked) => setFormData({...formData, es_critica: checked})}
              />
              <label className="text-sm cursor-pointer">Ausencia Crítica (alta prioridad)</label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.notificar_admin}
                onCheckedChange={(checked) => setFormData({...formData, notificar_admin: checked})}
              />
              <label className="text-sm cursor-pointer">Notificar a Administradores</label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.visible_empleados}
                onCheckedChange={(checked) => setFormData({...formData, visible_empleados: checked})}
              />
              <label className="text-sm cursor-pointer">Visible para Empleados (App Móvil)</label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData({...formData, activo: checked})}
              />
              <label className="text-sm cursor-pointer">Tipo Activo</label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Días Aviso Previo</Label>
              <Input
                type="number"
                min="0"
                value={formData.dias_aviso_previo}
                onChange={(e) => setFormData({...formData, dias_aviso_previo: parseInt(e.target.value) || 0})}
              />
            </div>

            <div className="space-y-2">
              <Label>Orden de Visualización</Label>
              <Input
                type="number"
                value={formData.orden}
                onChange={(e) => setFormData({...formData, orden: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : type ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
