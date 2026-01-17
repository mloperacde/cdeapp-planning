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

export default function EmergencyTeamMemberForm({ member, selectedRole, employees = [], onClose }) {
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="dark:text-slate-100">
            {member ? 'Editar Miembro' : 'Añadir Miembro'} - Equipo de Emergencia
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="dark:text-slate-300">Empleado *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
              >
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  {Array.isArray(employees) && employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} className="dark:text-slate-100 dark:focus:bg-slate-700">
                      {emp.nombre} - {emp.departamento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Rol en Emergencia *</Label>
              <Select
                value={formData.rol_emergencia}
                onValueChange={(value) => setFormData({ ...formData, rol_emergencia: value })}
              >
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectItem value="Jefe de Emergencias" className="dark:text-slate-100 dark:focus:bg-slate-700">Jefe de Emergencias</SelectItem>
                  <SelectItem value="Jefe de Intervención" className="dark:text-slate-100 dark:focus:bg-slate-700">Jefe de Intervención</SelectItem>
                  <SelectItem value="Equipo Primera Intervención (EPI)" className="dark:text-slate-100 dark:focus:bg-slate-700">EPI - Primera Intervención</SelectItem>
                  <SelectItem value="Equipo Segunda Intervención (ESI)" className="dark:text-slate-100 dark:focus:bg-slate-700">ESI - Segunda Intervención</SelectItem>
                  <SelectItem value="Equipo Primeros Auxilios (EPA)" className="dark:text-slate-100 dark:focus:bg-slate-700">EPA - Primeros Auxilios</SelectItem>
                  <SelectItem value="Equipo Alarma y Evacuación (EAE)" className="dark:text-slate-100 dark:focus:bg-slate-700">EAE - Alarma y Evacuación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Fecha de Nombramiento *</Label>
              <Input
                type="date"
                value={formData.fecha_nombramiento || ""}
                onChange={(e) => setFormData({ ...formData, fecha_nombramiento: e.target.value })}
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Zona Asignada</Label>
              <Input
                value={formData.zona_asignada || ""}
                onChange={(e) => setFormData({ ...formData, zona_asignada: e.target.value })}
                placeholder="Ej: Planta Baja, Zona Producción..."
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Teléfono Emergencia</Label>
              <Input
                value={formData.telefono_emergencia || ""}
                onChange={(e) => setFormData({ ...formData, telefono_emergencia: e.target.value })}
                placeholder="Teléfono de contacto"
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2 flex items-center gap-2 pt-6">
              <Checkbox
                checked={formData.es_suplente}
                onCheckedChange={(checked) => setFormData({ ...formData, es_suplente: checked })}
                className="dark:border-slate-500 dark:data-[state=checked]:bg-slate-50 dark:data-[state=checked]:text-slate-900"
              />
              <Label className="dark:text-slate-300">Es Suplente</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="dark:text-slate-300">Observaciones</Label>
            <Textarea
              value={formData.observaciones || ""}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={3}
              className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} className="dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700">
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}