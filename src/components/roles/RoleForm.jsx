import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const modulosDisponibles = [
  "Dashboard", "Empleados", "Planning", "Maquinas", "Mantenimiento", 
  "Ausencias", "Comites", "PRL", "Taquillas", "Habilidades", "Informes", 
  "Configuracion", "Usuarios"
];

export default function RoleForm({ role, onClose }) {
  const [formData, setFormData] = useState(role || {
    role_name: "",
    description: "",
    is_admin: false,
    nivel_prioridad: 1,
    permissions: {
      modulos_acceso: [],
      acciones_empleados: { ver: false, crear: false, editar: false, eliminar: false },
      acciones_ausencias: { ver_propias: true, crear_propias: true, ver_todas: false, aprobar: false },
      acciones_maquinas: { ver: false, actualizar_estado: false, planificar: false },
      acciones_mantenimiento: { ver: false, crear: false, actualizar: false, completar: false },
      acciones_comites: { ver: false, gestionar_miembros: false, gestionar_documentos: false }
    }
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (role?.id) {
        return await base44.entities.UserRole.update(role.id, data);
      }
      return await base44.entities.UserRole.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      toast.success(role ? "Rol actualizado" : "Rol creado correctamente");
      onClose();
    }
  });

  const toggleModulo = (modulo) => {
    const current = formData.permissions?.modulos_acceso || [];
    const updated = current.includes(modulo)
      ? current.filter(m => m !== modulo)
      : [...current, modulo];
    
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        modulos_acceso: updated
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.role_name) {
      toast.error("El nombre del rol es requerido");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? "Editar Rol" : "Crear Nuevo Rol"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre del Rol *</Label>
              <Input
                value={formData.role_name}
                onChange={(e) => setFormData({...formData, role_name: e.target.value})}
                placeholder="Ej: Coordinador"
              />
            </div>

            <div className="space-y-2">
              <Label>Nivel de Prioridad (1-10)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={formData.nivel_prioridad}
                onChange={(e) => setFormData({...formData, nivel_prioridad: parseInt(e.target.value)})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.is_admin}
              onCheckedChange={(checked) => setFormData({...formData, is_admin: checked})}
            />
            <Label>Es Administrador (acceso completo)</Label>
          </div>

          <div className="space-y-2">
            <Label>Módulos de Acceso</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 border rounded max-h-48 overflow-y-auto">
              {modulosDisponibles.map(modulo => (
                <div key={modulo} className="flex items-center gap-2">
                  <Checkbox
                    checked={(formData.permissions?.modulos_acceso || []).includes(modulo)}
                    onCheckedChange={() => toggleModulo(modulo)}
                    disabled={formData.is_admin}
                  />
                  <label className="text-sm cursor-pointer" onClick={() => !formData.is_admin && toggleModulo(modulo)}>
                    {modulo}
                  </label>
                </div>
              ))}
            </div>
            {formData.is_admin && (
              <p className="text-xs text-blue-600">Los administradores tienen acceso a todos los módulos</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}