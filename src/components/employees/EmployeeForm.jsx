
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
    telefono_movil: "",
    contacto_emergencia_nombre: "",
    contacto_emergencia_telefono: "",
    departamento: "",
    puesto: "",
    categoria: "",
    tipo_jornada: "Completa 40h",
    tipo_turno: "Rotativo",
    equipo: "",
    disponibilidad: "Disponible",
    horario_personalizado_inicio: "",
    horario_personalizado_fin: "",
    salario_anual: 0,
    evaluacion_responsable: "",
    propuesta_cambio_categoria: "",
    objetivos: {
      periodo: "",
      objetivo_1: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_2: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_3: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_4: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_5: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_6: { descripcion: "", peso: 0, resultado: 0 },
    }
  });

  const queryClient = useQueryClient();

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const { data: absences } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Si cambiamos el estado a "Disponible", limpiar campos de ausencia y eliminar ausencias registradas
      if (data.disponibilidad === "Disponible") {
        data.ausencia_inicio = null;
        data.ausencia_fin = null;
        data.ausencia_motivo = null;
        
        // Si había ausencias registradas para este empleado, eliminarlas
        if (employee?.id) {
          const employeeAbsences = absences.filter(abs => abs.employee_id === employee.id);
          await Promise.all(
            employeeAbsences.map(abs => base44.entities.Absence.delete(abs.id))
          );
        }
      }
      
      if (employee?.id) {
        return base44.entities.Employee.update(employee.id, data);
      }
      return base44.entities.Employee.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['absences'] }); // Invalidate absences query
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const machineFields = Array.from({ length: 10 }, (_, i) => i + 1);

  const updateObjective = (objNum, field, value) => {
    setFormData({
      ...formData,
      objetivos: {
        ...formData.objetivos,
        [`objetivo_${objNum}`]: {
          ...formData.objetivos[`objetivo_${objNum}`],
          [field]: value
        }
      }
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {employee ? 'Editar Empleado' : 'Nuevo Empleado'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="datos" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="datos">Datos</TabsTrigger>
              <TabsTrigger value="schedule">Horario</TabsTrigger>
              <TabsTrigger value="machines">Máquinas</TabsTrigger>
              <TabsTrigger value="availability">Disponibilidad</TabsTrigger>
              <TabsTrigger value="rrhh">Gestión RRHH</TabsTrigger>
            </TabsList>

            <TabsContent value="datos" className="space-y-4 mt-4">
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
                  <Label htmlFor="telefono_movil">Teléfono Móvil</Label>
                  <Input
                    id="telefono_movil"
                    value={formData.telefono_movil || ""}
                    onChange={(e) => setFormData({ ...formData, telefono_movil: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contacto_emergencia_nombre">Contacto de Emergencia</Label>
                  <Input
                    id="contacto_emergencia_nombre"
                    placeholder="Nombre"
                    value={formData.contacto_emergencia_nombre || ""}
                    onChange={(e) => setFormData({ ...formData, contacto_emergencia_nombre: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contacto_emergencia_telefono">Teléfono de Emergencia</Label>
                  <Input
                    id="contacto_emergencia_telefono"
                    placeholder="Teléfono"
                    value={formData.contacto_emergencia_telefono || ""}
                    onChange={(e) => setFormData({ ...formData, contacto_emergencia_telefono: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento</Label>
                  <Input
                    id="departamento"
                    value={formData.departamento || ""}
                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="puesto">Puesto</Label>
                  <Input
                    id="puesto"
                    value={formData.puesto || ""}
                    onChange={(e) => setFormData({ ...formData, puesto: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría</Label>
                  <Input
                    id="categoria"
                    value={formData.categoria || ""}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipo">Equipo *</Label>
                  <Select
                    value={formData.equipo}
                    onValueChange={(value) => setFormData({ ...formData, equipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar equipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.team_name}>
                          {team.team_name}
                        </SelectItem>
                      ))}
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
                        {machines.filter(m => m.estado === "Disponible").map((machine) => (
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

                {formData.disponibilidad === "Disponible" && employee?.disponibilidad === "Ausente" && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      <strong>Nota:</strong> Al cambiar el estado a "Disponible", se eliminarán automáticamente todas las ausencias registradas para este empleado.
                    </p>
                  </div>
                )}

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

            <TabsContent value="rrhh" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Input value={formData.categoria || ""} disabled className="bg-slate-50" />
                  <p className="text-xs text-slate-500">Desde pestaña Datos</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salario_anual">Salario Anual (€)</Label>
                  <Input
                    id="salario_anual"
                    type="number"
                    value={formData.salario_anual || 0}
                    onChange={(e) => setFormData({ ...formData, salario_anual: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Tipo de Jornada</Label>
                  <Input value={formData.tipo_jornada || ""} disabled className="bg-slate-50" />
                  <p className="text-xs text-slate-500">Desde pestaña Horario</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="evaluacion_responsable">Evaluación de Responsable</Label>
                  <Textarea
                    id="evaluacion_responsable"
                    value={formData.evaluacion_responsable || ""}
                    onChange={(e) => setFormData({ ...formData, evaluacion_responsable: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="propuesta_cambio_categoria">Propuesta de Cambio de Categoría</Label>
                  <Textarea
                    id="propuesta_cambio_categoria"
                    value={formData.propuesta_cambio_categoria || ""}
                    onChange={(e) => setFormData({ ...formData, propuesta_cambio_categoria: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold text-lg mb-4">Sistema de Objetivos</h4>
                
                <div className="space-y-2 mb-4">
                  <Label htmlFor="periodo">Período de Objetivos</Label>
                  <Input
                    id="periodo"
                    placeholder="ej. Q1 2024, Anual 2024..."
                    value={formData.objetivos?.periodo || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      objetivos: { ...formData.objetivos, periodo: e.target.value }
                    })}
                  />
                </div>

                <div className="space-y-4">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <div key={num} className="border rounded-lg p-4 bg-slate-50">
                      <h5 className="font-semibold mb-3 text-slate-700">Objetivo {num}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2 md:col-span-3">
                          <Label>Descripción</Label>
                          <Input
                            placeholder="Descripción del objetivo"
                            value={formData.objetivos?.[`objetivo_${num}`]?.descripcion || ""}
                            onChange={(e) => updateObjective(num, 'descripcion', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Peso (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={formData.objetivos?.[`objetivo_${num}`]?.peso || 0}
                            onChange={(e) => updateObjective(num, 'peso', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Resultado (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={formData.objetivos?.[`objetivo_${num}`]?.resultado || 0}
                            onChange={(e) => updateObjective(num, 'resultado', parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
