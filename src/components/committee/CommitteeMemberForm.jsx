import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const tiposComite = [
  "Comité de Empresa",
  "Delegado Personal",
  "Comité Seguridad y Salud",
  "Comité Prevención Acoso",
  "Equipo de Emergencia"
];

export default function CommitteeMemberForm({ member, employees, onClose }) {
  const [formData, setFormData] = useState(member || {
    employee_id: "",
    tipos_comite: [],
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
    mutationFn: async (data) => {
      if (member?.id) {
        return await base44.entities.CommitteeMember.update(member.id, data);
      }
      return await base44.entities.CommitteeMember.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['committeeMembers'] });
      toast.success(member ? "Miembro actualizado correctamente" : "Miembro añadido correctamente");
      onClose();
    },
    onError: (error) => {
      toast.error("Error al guardar: " + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.employee_id || !formData.tipos_comite || formData.tipos_comite.length === 0 || !formData.fecha_inicio) {
      toast.error("Por favor, completa todos los campos requeridos");
      return;
    }
    
    saveMutation.mutate(formData);
  };

  const toggleTipoComite = (tipo) => {
    const current = formData.tipos_comite || [];
    const updated = current.includes(tipo)
      ? current.filter(t => t !== tipo)
      : [...current, tipo];
    setFormData({ ...formData, tipos_comite: updated });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="dark:text-slate-100">{member ? 'Editar Miembro' : 'Añadir Miembro de Comité'}</DialogTitle>
          <DialogDescription className="dark:text-slate-400">
            Define los datos y responsabilidades del miembro del comité.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label className="dark:text-slate-300">Empleado *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
              >
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} className="dark:text-slate-100 dark:focus:bg-slate-700">
                      {emp.nombre} - {emp.departamento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="dark:text-slate-300">Tipos de Comité * (puede seleccionar varios)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 border rounded dark:border-slate-700">
                {tiposComite.map((tipo) => (
                  <div key={tipo} className="flex items-center space-x-2">
                    <Checkbox
                      checked={(formData.tipos_comite || []).includes(tipo)}
                      onCheckedChange={() => toggleTipoComite(tipo)}
                      className="dark:border-slate-500 dark:data-[state=checked]:bg-slate-50 dark:data-[state=checked]:text-slate-900"
                    />
                    <label className="text-sm cursor-pointer dark:text-slate-300" onClick={() => toggleTipoComite(tipo)}>
                      {tipo}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Cargo</Label>
              <Input
                value={formData.cargo || ""}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                placeholder="Presidente, Secretario, Vocal..."
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Fecha de Inicio *</Label>
              <Input
                type="date"
                value={formData.fecha_inicio || ""}
                onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Fecha de Fin</Label>
              <Input
                type="date"
                value={formData.fecha_fin || ""}
                onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Horas Sindicales Mensuales</Label>
              <Input
                type="number"
                value={formData.horas_sindicales_mensuales || 0}
                onChange={(e) => setFormData({ ...formData, horas_sindicales_mensuales: parseFloat(e.target.value) || 0 })}
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Teléfono de Contacto</Label>
              <Input
                value={formData.contacto_emergencia_comite || ""}
                onChange={(e) => setFormData({ ...formData, contacto_emergencia_comite: e.target.value })}
                placeholder="Teléfono para funciones del comité"
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="dark:text-slate-300">Funciones y Responsabilidades</Label>
            <Textarea
              value={formData.funciones || ""}
              onChange={(e) => setFormData({ ...formData, funciones: e.target.value })}
              rows={3}
              className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <Label className="dark:text-slate-300">Notas</Label>
            <Textarea
              value={formData.notas || ""}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              rows={2}
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
