import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EmployeeForm({ employee, machines, onClose }) {
  const [formData, setFormData] = useState(employee || {
    nombre: "",
    email: "",
    telefono: "",
    tipo_jornada: "Completa 40h",
    tipo_turno: "Rotativo",
    equipo: "Equipo Turno Isa",
    disponibilidad: "Disponible",
    horario_personalizado_inicio: "",
    horario_personalizado_fin: "",
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (employee?.id) {
        return base44.entities.Employee.update(employee.id, data);
      }
      return base44.entities.Employee.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const machineFields = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {employee ? 'Editar Empleado' : 'Nuevo Empleado'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="schedule">Horario</TabsTrigger>
              <TabsTrigger value="machines">Máquinas</TabsTrigger>
              <TabsTrigger value="availability">Disponibilidad</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre Completo *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono || ""}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipo">Equipo *</Label>
                  <Select
                    value={formData.equipo}
                    onValueChange={(value) => setFormData({ ...formData, equipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Equipo Turno Isa">Equipo Turno Isa</SelectItem>
                      <SelectItem value="Equipo Turno Sara">Equipo Turno Sara</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo_jornada">Tipo de Jornada *</Label>
                  <Select
                    value={formData.tipo_jornada}
                    onValueChange={(value) => setFormData({ ...formData, tipo_jornada: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Completa 40h">Completa 40h</SelectItem>
                      <SelectItem value="Completa 35h">Completa 35h</SelectItem>
                      <SelectItem value="Reducida">Reducida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_turno">Tipo de Turno *</Label>
                  <Select
                    value={formData.tipo_turno}
                    onValueChange={(value) => setFormData({ ...formData, tipo_turno: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rotativo">Rotativo</SelectItem>
                      <SelectItem value="Fijo Mañana">Fijo Mañana</SelectItem>
                      <SelectItem value="Fijo Tarde">Fijo Tarde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.tipo_jornada === "Reducida" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="horario_inicio">Horario Inicio</Label>
                      <Input
                        id="horario_inicio"
                        type="time"
                        value={formData.horario_personalizado_inicio || ""}
                        onChange={(e) => setFormData({ ...formData, horario_personalizado_inicio: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="horario_fin">Horario Fin</Label>
                      <Input
                        id="horario_fin"
                        type="time"
                        value={formData.horario_personalizado_fin || ""}
                        onChange={(e) => setFormData({ ...formData, horario_personalizado_fin: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="machines" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {machineFields.map((num) => (
                  <div key={num} className="space-y-2">
                    <Label htmlFor={`maquina_${num}`}>Máquina {num}</Label>
                    <Select
                      value={formData[`maquina_${num}`] || ""}
                      onValueChange={(value) => setFormData({ ...formData, [`maquina_${num}`]: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Sin asignar</SelectItem>
                        {machines.filter(m => m.estado === "Activa").map((machine) => (
                          <SelectItem key={machine.id} value={machine.id}>
                            {machine.nombre} ({machine.codigo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="availability" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="disponibilidad">Estado de Disponibilidad</Label>
                  <Select
                    value={formData.disponibilidad}
                    onValueChange={(value) => setFormData({ ...formData, disponibilidad: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Disponible">Disponible</SelectItem>
                      <SelectItem value="Ausente">Ausente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.disponibilidad === "Ausente" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ausencia_inicio">Fecha y Hora Inicio</Label>
                        <Input
                          id="ausencia_inicio"
                          type="datetime-local"
                          value={formData.ausencia_inicio || ""}
                          onChange={(e) => setFormData({ ...formData, ausencia_inicio: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ausencia_fin">Fecha y Hora Fin</Label>
                        <Input
                          id="ausencia_fin"
                          type="datetime-local"
                          value={formData.ausencia_fin || ""}
                          onChange={(e) => setFormData({ ...formData, ausencia_fin: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ausencia_motivo">Motivo de Ausencia</Label>
                      <Textarea
                        id="ausencia_motivo"
                        value={formData.ausencia_motivo || ""}
                        onChange={(e) => setFormData({ ...formData, ausencia_motivo: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}