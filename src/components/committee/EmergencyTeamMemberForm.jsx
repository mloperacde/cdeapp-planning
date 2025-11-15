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

export default function EmergencyTeamMemberForm({ member, selectedRole, employees, onClose }) {
  const [formData, setFormData] = useState(member || {
    employee_id: "",
    rol_emergencia: selectedRole || "",
    es_suplente: false,
    fecha_nombramiento: "",
    zona_asignada: "",
    telefono_emergencia: "",
    observaciones: ""
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (member?.id) {
        return await base44.entities.EmergencyTeamMember.update(member.id, data);
      }
      return await base44.entities.EmergencyTeamMember.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergencyTeamMembers'] });
      toast.success(member ? "Miembro actualizado" : "Miembro añadido al equipo de emergencia");
      onClose();
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.employee_id || !formData.rol_emergencia || !formData.fecha_nombramiento) {
      toast.error("Completa todos los campos requeridos");
      return;
    }
    
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {member ? 'Editar Miembro' : 'Añadir Miembro'} - Equipo de Emergencia
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Empleado *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nombre} - {emp.departamento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rol en Emergencia *</Label>
              <Select
                value={formData.rol_emergencia}
                onValueChange={(value) => setFormData({ ...formData, rol_emergencia: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Jefe de Emergencias">Jefe de Emergencias</SelectItem>
                  <SelectItem value="Jefe de Intervención">Jefe de Intervención</SelectItem>
                  <SelectItem value="Equipo Primera Intervención (EPI)">EPI - Primera Intervención</SelectItem>
                  <SelectItem value="Equipo Segunda Intervención (ESI)">ESI - Segunda Intervención</SelectItem>
                  <SelectItem value="Equipo Primeros Auxilios (EPA)">EPA - Primeros Auxilios</SelectItem>
                  <SelectItem value="Equipo Alarma y Evacuación (EAE)">EAE - Alarma y Evacuación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha de Nombramiento *</Label>
              <Input
                type="date"
                value={formData.fecha_nombramiento || ""}
                onChange={(e) => setFormData({ ...formData, fecha_nombramiento: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Zona Asignada</Label>
              <Input
                value={formData.zona_asignada || ""}
                onChange={(e) => setFormData({ ...formData, zona_asignada: e.target.value })}
                placeholder="Ej: Planta Baja, Zona Producción..."
              />
            </div>

            <div className="space-y-2">
              <Label>Teléfono Emergencia</Label>
              <Input
                value={formData.telefono_emergencia || ""}
                onChange={(e) => setFormData({ ...formData, telefono_emergencia: e.target.value })}
                placeholder="Teléfono de contacto"
              />
            </div>

            <div className="space-y-2 flex items-center gap-2 pt-6">
              <Checkbox
                checked={formData.es_suplente}
                onCheckedChange={(checked) => setFormData({ ...formData, es_suplente: checked })}
              />
              <Label>Es Suplente</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              value={formData.observaciones || ""}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={3}
            />
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