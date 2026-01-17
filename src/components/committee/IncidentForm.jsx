import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function IncidentForm({ incident, employees, onClose }) {
  const [formData, setFormData] = useState(incident || {
    codigo_incidente: `INC-${Date.now()}`,
    tipo: "Incidente",
    employee_id: "",
    fecha_hora: new Date().toISOString().slice(0, 16),
    lugar: "",
    departamento: "",
    descripcion: "",
    gravedad: "Leve",
    parte_cuerpo_afectada: "",
    dias_baja: 0,
    causas_inmediatas: "",
    causas_basicas: "",
    estado_investigacion: "Pendiente",
    notificado_autoridad: false,
    notas: ""
  });

  const queryClient = useQueryClient();

  const { data: committeeMembers } = useQuery({
    queryKey: ['committeeMembers'],
    queryFn: () => base44.entities.CommitteeMember.list(),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let savedIncident;
      
      if (incident?.id) {
        savedIncident = await base44.entities.WorkIncident.update(incident.id, data);
      } else {
        savedIncident = await base44.entities.WorkIncident.create(data);
        
        // Enviar notificaciones automáticas
        const safetyMembers = committeeMembers.filter(m => 
          m.tipo_comite === "Comité Seguridad y Salud" && m.activo
        );
        
        const employee = employees.find(e => e.id === data.employee_id);
        
        for (const member of safetyMembers) {
          const memberEmployee = employees.find(e => e.id === member.employee_id);
          if (memberEmployee?.email) {
            await base44.integrations.Core.SendEmail({
              to: memberEmployee.email,
              subject: `🚨 NUEVO INCIDENTE LABORAL - ${data.tipo}`,
              body: `Se ha registrado un nuevo incidente laboral:\n\n📋 Código: ${data.codigo_incidente}\n👤 Empleado afectado: ${employee?.nombre}\n📍 Lugar: ${data.lugar}\n🏢 Departamento: ${data.departamento}\n⚠️ Gravedad: ${data.gravedad}\n📅 Fecha: ${new Date(data.fecha_hora).toLocaleString('es-ES')}\n\n📝 Descripción:\n${data.descripcion}\n\n${data.dias_baja > 0 ? `🏥 Días de baja: ${data.dias_baja}\n\n` : ''}Por favor, revisa el incidente y asigna las medidas correctoras necesarias desde el sistema de Gestión de Comités y PRL.\n\nEstado: ${data.estado_investigacion}`
            });
          }
        }
        
        toast.success(`Incidente registrado y ${safetyMembers.length} miembros del comité notificados`);
      }
      
      return savedIncident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workIncidents'] });
      if (!incident) {
        toast.success("Incidente registrado y comité notificado");
      } else {
        toast.success("Incidente actualizado");
      }
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="dark:text-slate-100">{incident ? 'Editar Incidente' : 'Registrar Nuevo Incidente'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="dark:text-slate-300">Código de Incidente *</Label>
              <Input
                value={formData.codigo_incidente}
                onChange={(e) => setFormData({ ...formData, codigo_incidente: e.target.value })}
                required
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Tipo *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                required
              >
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectItem value="Accidente" className="dark:text-slate-100 dark:focus:bg-slate-700">Accidente</SelectItem>
                  <SelectItem value="Incidente" className="dark:text-slate-100 dark:focus:bg-slate-700">Incidente</SelectItem>
                  <SelectItem value="Casi Accidente" className="dark:text-slate-100 dark:focus:bg-slate-700">Casi Accidente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Empleado Afectado *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => {
                  const emp = employees.find(e => e.id === value);
                  setFormData({ 
                    ...formData, 
                    employee_id: value,
                    departamento: emp?.departamento || ""
                  });
                }}
                required
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

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Fecha y Hora *</Label>
              <Input
                type="datetime-local"
                value={formData.fecha_hora}
                onChange={(e) => setFormData({ ...formData, fecha_hora: e.target.value })}
                required
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Lugar *</Label>
              <Input
                value={formData.lugar}
                onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
                placeholder="Área, línea, máquina..."
                required
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Gravedad *</Label>
              <Select
                value={formData.gravedad}
                onValueChange={(value) => setFormData({ ...formData, gravedad: value })}
                required
              >
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectItem value="Leve" className="dark:text-slate-100 dark:focus:bg-slate-700">Leve</SelectItem>
                  <SelectItem value="Grave" className="dark:text-slate-100 dark:focus:bg-slate-700">Grave</SelectItem>
                  <SelectItem value="Muy Grave" className="dark:text-slate-100 dark:focus:bg-slate-700">Muy Grave</SelectItem>
                  <SelectItem value="Mortal" className="dark:text-slate-100 dark:focus:bg-slate-700">Mortal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Parte del Cuerpo Afectada</Label>
              <Input
                value={formData.parte_cuerpo_afectada}
                onChange={(e) => setFormData({ ...formData, parte_cuerpo_afectada: e.target.value })}
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Días de Baja</Label>
              <Input
                type="number"
                min="0"
                value={formData.dias_baja}
                onChange={(e) => setFormData({ ...formData, dias_baja: parseInt(e.target.value) || 0 })}
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="dark:text-slate-300">Descripción del Incidente *</Label>
            <Textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={3}
              required
              className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <Label className="dark:text-slate-300">Causas Inmediatas</Label>
            <Textarea
              value={formData.causas_inmediatas}
              onChange={(e) => setFormData({ ...formData, causas_inmediatas: e.target.value })}
              rows={2}
              className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <Label className="dark:text-slate-300">Causas Básicas/Raíz</Label>
            <Textarea
              value={formData.causas_basicas}
              onChange={(e) => setFormData({ ...formData, causas_basicas: e.target.value })}
              rows={2}
              className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 dark:text-white">
              {saveMutation.isPending ? "Guardando..." : "Guardar y Notificar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}