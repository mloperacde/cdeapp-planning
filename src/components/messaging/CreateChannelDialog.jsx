import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function CreateChannelDialog({ onClose, employees, currentEmployee }) {
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    tipo: "General",
    equipo: "",
    departamento: "",
    participantes: []
  });
  const queryClient = useQueryClient();

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const createChannelMutation = useMutation({
    mutationFn: async (data) => {
      let participantes = data.participantes;
      
      if (data.tipo === "Equipo" && data.equipo) {
        participantes = employees.filter(e => e.equipo === data.equipo).map(e => e.id);
      } else if (data.tipo === "Departamento" && data.departamento) {
        participantes = employees.filter(e => e.departamento === data.departamento).map(e => e.id);
      }

      if (!participantes.includes(currentEmployee?.id)) {
        participantes.push(currentEmployee?.id);
      }

      return base44.entities.ChatChannel.create({
        ...data,
        participantes,
        admins: [currentEmployee?.id],
        activo: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatChannels'] });
      toast.success("Canal creado");
      onClose();
    }
  });

  const toggleParticipant = (empId) => {
    const current = formData.participantes;
    const updated = current.includes(empId)
      ? current.filter(id => id !== empId)
      : [...current, empId];
    setFormData({ ...formData, participantes: updated });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    createChannelMutation.mutate(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Canal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Canal *</Label>
            <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="General">General</SelectItem>
                <SelectItem value="Equipo">Equipo</SelectItem>
                <SelectItem value="Departamento">Departamento</SelectItem>
                <SelectItem value="Direct">Mensaje Directo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.tipo === "Equipo" && (
            <div className="space-y-2">
              <Label>Equipo *</Label>
              <Select value={formData.equipo} onValueChange={(value) => setFormData({...formData, equipo: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar equipo" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.team_name}>
                      {team.team_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.tipo === "Departamento" && (
            <div className="space-y-2">
              <Label>Departamento *</Label>
              <Select value={formData.departamento} onValueChange={(value) => setFormData({...formData, departamento: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              placeholder="Nombre del canal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              placeholder="Descripción del canal"
              rows={2}
            />
          </div>

          {formData.tipo === "Direct" && (
            <div className="space-y-2">
              <Label>Seleccionar Destinatario *</Label>
              <div className="border rounded p-3 max-h-48 overflow-y-auto space-y-2">
                {employees.filter(e => e.id !== currentEmployee?.id).map(emp => (
                  <div key={emp.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.participantes.includes(emp.id)}
                      onCheckedChange={() => toggleParticipant(emp.id)}
                    />
                    <label className="text-sm cursor-pointer flex-1" onClick={() => toggleParticipant(emp.id)}>
                      {emp.nombre}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createChannelMutation.isPending}>
              {createChannelMutation.isPending ? "Creando..." : "Crear Canal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}