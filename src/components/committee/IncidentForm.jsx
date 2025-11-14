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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{incident ? 'Editar Incidente' : 'Registrar Nuevo Incidente'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código de Incidente *</Label>
              <Input
                value={formData.codigo_incidente}
                onChange={(e) => setFormData({ ...formData, codigo_incidente: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Accidente">Accidente</SelectItem>
                  <SelectItem value="Incidente">Incidente</SelectItem>
                  <SelectItem value="Casi Accidente">Casi Accidente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Empleado Afectado *</Label>
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
              <Label>Fecha y Hora *</Label>
              <Input
                type="datetime-local"
                value={formData.fecha_hora}
                onChange={(e) => setFormData({ ...formData, fecha_hora: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Lugar *</Label>
              <Input
                value={formData.lugar}
                onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
                placeholder="Área, línea, máquina..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Gravedad *</Label>
              <Select
                value={formData.gravedad}
                onValueChange={(value) => setFormData({ ...formData, gravedad: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Leve">Leve</SelectItem>
                  <SelectItem value="Grave">Grave</SelectItem>
                  <SelectItem value="Muy Grave">Muy Grave</SelectItem>
                  <SelectItem value="Mortal">Mortal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Parte del Cuerpo Afectada</Label>
              <Input
                value={formData.parte_cuerpo_afectada}
                onChange={(e) => setFormData({ ...formData, parte_cuerpo_afectada: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Días de Baja</Label>
              <Input
                type="number"
                min="0"
                value={formData.dias_baja}
                onChange={(e) => setFormData({ ...formData, dias_baja: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción del Incidente *</Label>
            <Textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Causas Inmediatas</Label>
            <Textarea
              value={formData.causas_inmediatas}
              onChange={(e) => setFormData({ ...formData, causas_inmediatas: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Causas Básicas/Raíz</Label>
            <Textarea
              value={formData.causas_basicas}
              onChange={(e) => setFormData({ ...formData, causas_basicas: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} className="bg-red-600 hover:bg-red-700">
              {saveMutation.isPending ? "Guardando..." : "Guardar y Notificar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}