import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function CommitteeMemberForm({ member, employees, onClose }) {
  const [formData, setFormData] = useState(member || {
    employee_id: "",
    tipo_comite: "",
    cargo: "",
    fecha_inicio: "",
    fecha_fin: "",
    activo: true,
    horas_sindicales_mensuales: 0,
    funciones: "",
    contacto_emergencia_comite: "",
    notas: ""
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (member?.id) {
        return base44.entities.CommitteeMember.update(member.id, data);
      }
      return base44.entities.CommitteeMember.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['committeeMembers'] });
      toast.success(member ? "Miembro actualizado" : "Miembro añadido");
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{member ? 'Editar Miembro' : 'Añadir Miembro de Comité'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Empleado *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                required
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
              <Label>Tipo de Comité *</Label>
              <Select
                value={formData.tipo_comite}
                onValueChange={(value) => setFormData({ ...formData, tipo_comite: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Comité de Empresa">Comité de Empresa</SelectItem>
                  <SelectItem value="Delegado Personal">Delegado Personal</SelectItem>
                  <SelectItem value="Comité Seguridad y Salud">Comité Seguridad y Salud</SelectItem>
                  <SelectItem value="Comité Prevención Acoso">Comité Prevención Acoso</SelectItem>
                  <SelectItem value="Equipo de Emergencia">Equipo de Emergencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                placeholder="Presidente, Secretario, Vocal..."
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha de Inicio *</Label>
              <Input
                type="date"
                value={formData.fecha_inicio}
                onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha de Fin</Label>
              <Input
                type="date"
                value={formData.fecha_fin}
                onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Horas Sindicales Mensuales</Label>
              <Input
                type="number"
                value={formData.horas_sindicales_mensuales}
                onChange={(e) => setFormData({ ...formData, horas_sindicales_mensuales: parseFloat(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label>Teléfono de Contacto</Label>
              <Input
                value={formData.contacto_emergencia_comite}
                onChange={(e) => setFormData({ ...formData, contacto_emergencia_comite: e.target.value })}
                placeholder="Teléfono para funciones del comité"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Funciones y Responsabilidades</Label>
            <Textarea
              value={formData.funciones}
              onChange={(e) => setFormData({ ...formData, funciones: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              rows={2}
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