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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Briefcase, Clock, Home, FileText, Calendar, Wrench, AlertCircle, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export default function MasterEmployeeEditDialog({ employee, open, onClose }) {
  const [formData, setFormData] = useState(employee || {
    nombre: "",
    codigo_empleado: "",
    estado_empleado: "Alta",
    disponibilidad: "Disponible",
    incluir_en_planning: true,
  });
  const queryClient = useQueryClient();

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const { data: allMachines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list(),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (employee?.id) {
        return base44.entities.EmployeeMasterDatabase.update(employee.id, data);
      } else {
        return base44.entities.EmployeeMasterDatabase.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      toast.success("Empleado guardado correctamente");
      onClose();
    },
  });

  const isBaja = formData.estado_empleado === "Baja";
  const isTurnoFijo = formData.tipo_turno === "Fijo Mañana" || formData.tipo_turno === "Fijo Tarde";

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee?.id ? `Editar Empleado - ${employee.nombre}` : 'Nueva Alta de Empleado en Base Maestra'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="personal">
                <User className="w-4 h-4 mr-1" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="organizacion">
                <Briefcase className="w-4 h-4 mr-1" />
                Organización
              </TabsTrigger>
              <TabsTrigger value="horarios">
                <Clock className="w-4 h-4 mr-1" />
                Horarios
              </TabsTrigger>
              <TabsTrigger value="taquilla">
                <Home className="w-4 h-4 mr-1" />
                Taquilla
              </TabsTrigger>
              <TabsTrigger value="contrato">
                <FileText className="w-4 h-4 mr-1" />
                Contrato
              </TabsTrigger>
              <TabsTrigger value="absentismo">
                <TrendingDown className="w-4 h-4 mr-1" />
                Absentismo
              </TabsTrigger>
              <TabsTrigger value="maquinas">
                <Wrench className="w-4 h-4 mr-1" />
                Máquinas
              </TabsTrigger>
              <TabsTrigger value="disponibilidad">
                <Calendar className="w-4 h-4 mr-1" />
                Disponibilidad
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código Empleado</Label>
                  <Input
                    value={formData.codigo_empleado || ""}
                    onChange={(e) => setFormData({ ...formData, codigo_empleado: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nombre Completo *</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={formData.estado_empleado || "Alta"}
                    onValueChange={(value) => setFormData({ ...formData, estado_empleado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Baja">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isBaja && (
                  <>
                    <div className="space-y-2">
                      <Label>Fecha de Baja</Label>
                      <Input
                        type="date"
                        value={formData.fecha_baja || ""}
                        onChange={(e) => setFormData({ ...formData, fecha_baja: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Motivo de Baja</Label>
                      <Input
                        value={formData.motivo_baja || ""}
                        onChange={(e) => setFormData({ ...formData, motivo_baja: e.target.value })}
                        placeholder="Especifica el motivo de la baja..."
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Fecha Nacimiento</Label>
                  <Input
                    type="date"
                    value={formData.fecha_nacimiento || ""}
                    onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>DNI/NIE</Label>
                  <Input
                    value={formData.dni || ""}
                    onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>NUSS</Label>
                  <Input
                    value={formData.nuss || ""}
                    onChange={(e) => setFormData({ ...formData, nuss: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sexo</Label>
                  <Select
                    value={formData.sexo || ""}
                    onValueChange={(value) => setFormData({ ...formData, sexo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Femenino">Femenino</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nacionalidad</Label>
                  <Select
                    value={formData.nacionalidad || ""}
                    onValueChange={(value) => setFormData({ ...formData, nacionalidad: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar nacionalidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ESPAÑOLA">ESPAÑOLA</SelectItem>
                      <SelectItem value="RUMANA">RUMANA</SelectItem>
                      <SelectItem value="VENEZOLANA">VENEZOLANA</SelectItem>
                      <SelectItem value="COLOMBIANA">COLOMBIANA</SelectItem>
                      <SelectItem value="BULGARA">BÚLGARA</SelectItem>
                      <SelectItem value="CUBANA">CUBANA</SelectItem>
                      <SelectItem value="ARGENTINA">ARGENTINA</SelectItem>
                      <SelectItem value="SALVADOREÑA">SALVADOREÑA</SelectItem>
                      <SelectItem value="BRASILEÑA">BRASILEÑA</SelectItem>
                      <SelectItem value="POLACA">POLACA</SelectItem>
                      <SelectItem value="PORTUGUESA">PORTUGUESA</SelectItem>
                      <SelectItem value="UCRANIANA">UCRANIANA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Dirección</Label>
                  <Input
                    value={formData.direccion || ""}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Teléfono Móvil</Label>
                  <Input
                    value={formData.telefono_movil || ""}
                    onChange={(e) => setFormData({ ...formData, telefono_movil: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contacto Emergencia</Label>
                  <Input
                    placeholder="Nombre"
                    value={formData.contacto_emergencia_nombre || ""}
                    onChange={(e) => setFormData({ ...formData, contacto_emergencia_nombre: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Teléfono Emergencia</Label>
                  <Input
                    value={formData.contacto_emergencia_telefono || ""}
                    onChange={(e) => setFormData({ ...formData, contacto_emergencia_telefono: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="organizacion" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Select
                    value={formData.departamento || ""}
                    onValueChange={(value) => setFormData({ ...formData, departamento: value, puesto: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FABRICACION">FABRICACION</SelectItem>
                      <SelectItem value="MANTENIMIENTO">MANTENIMIENTO</SelectItem>
                      <SelectItem value="ALMACEN">ALMACEN</SelectItem>
                      <SelectItem value="CALIDAD">CALIDAD</SelectItem>
                      <SelectItem value="OFICINA">OFICINA</SelectItem>
                      <SelectItem value="PLANIFICACION">PLANIFICACION</SelectItem>
                      <SelectItem value="LIMPIEZA">LIMPIEZA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Puesto</Label>
                  <Select
                    value={formData.puesto || ""}
                    onValueChange={(value) => setFormData({ ...formData, puesto: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar puesto" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.departamento === "FABRICACION" && (
                        <>
                          <SelectItem value="OPERARIA DE LINEA">OPERARIA DE LINEA</SelectItem>
                          <SelectItem value="RESPONSABLE DE LINEA">RESPONSABLE DE LINEA</SelectItem>
                          <SelectItem value="SEGUNDA DE LINEA">SEGUNDA DE LINEA</SelectItem>
                          <SelectItem value="JEFE DE TURNO">JEFE DE TURNO</SelectItem>
                          <SelectItem value="OPERARIO FABRICACION">OPERARIO FABRICACION</SelectItem>
                          <SelectItem value="RESPONSABLE FABRICACION">RESPONSABLE FABRICACION</SelectItem>
                        </>
                      )}
                      {formData.departamento === "MANTENIMIENTO" && (
                        <>
                          <SelectItem value="MECANICO">MECANICO</SelectItem>
                          <SelectItem value="MANT. DE INSTALACIONES">MANT. DE INSTALACIONES</SelectItem>
                          <SelectItem value="OPERARIO MANTENIMIENTO">OPERARIO MANTENIMIENTO</SelectItem>
                          <SelectItem value="RESP. TURNO MECANICOS">RESP. TURNO MECANICOS</SelectItem>
                          <SelectItem value="RESPONSABLE DE MANTENIMIENTO">RESPONSABLE DE MANTENIMIENTO</SelectItem>
                        </>
                      )}
                      {formData.departamento === "ALMACEN" && (
                        <>
                          <SelectItem value="CARRETILLERO">CARRETILLERO</SelectItem>
                          <SelectItem value="RESPONSABLE DE ALMACEN">RESPONSABLE DE ALMACEN</SelectItem>
                          <SelectItem value="TECNICO DE CALIDAD ALMACEN">TECNICO DE CALIDAD ALMACEN</SelectItem>
                        </>
                      )}
                      {formData.departamento === "CALIDAD" && (
                        <SelectItem value="TECNICO DE CALIDAD">TECNICO DE CALIDAD</SelectItem>
                      )}
                      {(formData.departamento === "OFICINA" || formData.departamento === "PLANIFICACION") && (
                        <>
                          <SelectItem value="AUX. ADMINISTRATIVO">AUX. ADMINISTRATIVO</SelectItem>
                          <SelectItem value="AYUDANTE DE PLANIFICACION">AYUDANTE DE PLANIFICACION</SelectItem>
                          <SelectItem value="DIR. PROJECT MANAGER/COMPRAS">DIR. PROJECT MANAGER/COMPRAS</SelectItem>
                          <SelectItem value="DIRECCION PLANIFICACION">DIRECCION PLANIFICACION</SelectItem>
                          <SelectItem value="OPERACIONES">OPERACIONES</SelectItem>
                          <SelectItem value="RESPONSABLE COMERCIAL">RESPONSABLE COMERCIAL</SelectItem>
                          <SelectItem value="RESPONSABLE COMPRAS">RESPONSABLE COMPRAS</SelectItem>
                          <SelectItem value="RESPONSABLE PACKAGING">RESPONSABLE PACKAGING</SelectItem>
                          <SelectItem value="RR.HH">RR.HH</SelectItem>
                          <SelectItem value="TECNICO DE PLANIFICACION">TECNICO DE PLANIFICACION</SelectItem>
                        </>
                      )}
                      {formData.departamento === "LIMPIEZA" && (
                        <SelectItem value="OPERARIA LIMPIEZA">OPERARIA LIMPIEZA</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Input
                    value={formData.categoria || ""}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    placeholder="Ej: Categoría 1, S/C"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Equipo {isTurnoFijo && "(No aplica para turnos fijos)"}</Label>
                  <Select
                    value={formData.equipo || ""}
                    onValueChange={(value) => setFormData({ ...formData, equipo: value })}
                    disabled={isTurnoFijo}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isTurnoFijo ? "Turnos fijos sin equipo" : "Seleccionar equipo"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Sin equipo</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.team_name}>
                          {team.team_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Formación</Label>
                  <Textarea
                    value={formData.formacion || ""}
                    onChange={(e) => setFormData({ ...formData, formacion: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="horarios" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo Jornada</Label>
                  <Select
                    value={formData.tipo_jornada || ""}
                    onValueChange={(value) => setFormData({ ...formData, tipo_jornada: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar jornada" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Jornada Completa">Jornada Completa</SelectItem>
                      <SelectItem value="Jornada Parcial">Jornada Parcial</SelectItem>
                      <SelectItem value="Reduccion de Jornada">Reducción de Jornada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Horas Jornada</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.num_horas_jornada || ""}
                    onChange={(e) => setFormData({ ...formData, num_horas_jornada: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo Turno</Label>
                  <Select
                    value={formData.tipo_turno || ""}
                    onValueChange={(value) => setFormData({ ...formData, tipo_turno: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rotativo">Rotativo</SelectItem>
                      <SelectItem value="Fijo Mañana">Fijo Mañana</SelectItem>
                      <SelectItem value="Fijo Tarde">Fijo Tarde</SelectItem>
                      <SelectItem value="Turno Partido">Turno Partido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Incluir en Planning</Label>
                  <Select
                    value={formData.incluir_en_planning !== false ? "true" : "false"}
                    onValueChange={(value) => setFormData({ ...formData, incluir_en_planning: value === "true" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sí - Contar en planning</SelectItem>
                      <SelectItem value="false">No - Excluir de planning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Horario Mañana Inicio</Label>
                  <Input
                    type="time"
                    value={formData.horario_manana_inicio || ""}
                    onChange={(e) => setFormData({ ...formData, horario_manana_inicio: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Horario Mañana Fin</Label>
                  <Input
                    type="time"
                    value={formData.horario_manana_fin || ""}
                    onChange={(e) => setFormData({ ...formData, horario_manana_fin: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Horario Tarde Inicio</Label>
                  <Input
                    type="time"
                    value={formData.horario_tarde_inicio || ""}
                    onChange={(e) => setFormData({ ...formData, horario_tarde_inicio: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Horario Tarde Fin</Label>
                  <Input
                    type="time"
                    value={formData.horario_tarde_fin || ""}
                    onChange={(e) => setFormData({ ...formData, horario_tarde_fin: e.target.value })}
                  />
                </div>

                {formData.tipo_turno === "Turno Partido" && (
                  <div className="md:col-span-2 space-y-4 p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
                    <h4 className="font-semibold text-purple-900">Configuración de Turno Partido</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Entrada 1</Label>
                        <Input
                          type="time"
                          value={formData.turno_partido_entrada1 || ""}
                          onChange={(e) => setFormData({ ...formData, turno_partido_entrada1: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Salida 1</Label>
                        <Input
                          type="time"
                          value={formData.turno_partido_salida1 || ""}
                          onChange={(e) => setFormData({ ...formData, turno_partido_salida1: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Entrada 2</Label>
                        <Input
                          type="time"
                          value={formData.turno_partido_entrada2 || ""}
                          onChange={(e) => setFormData({ ...formData, turno_partido_entrada2: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Salida 2</Label>
                        <Input
                          type="time"
                          value={formData.turno_partido_salida2 || ""}
                          onChange={(e) => setFormData({ ...formData, turno_partido_salida2: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="taquilla" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vestuario</Label>
                  <Select
                    value={formData.taquilla_vestuario || ""}
                    onValueChange={(value) => setFormData({ ...formData, taquilla_vestuario: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar vestuario" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vestuario Femenino Planta Baja">Vestuario Femenino Planta Baja</SelectItem>
                      <SelectItem value="Vestuario Femenino Planta Alta">Vestuario Femenino Planta Alta</SelectItem>
                      <SelectItem value="Vestuario Masculino Planta Baja">Vestuario Masculino Planta Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Número Taquilla</Label>
                  <Input
                    value={formData.taquilla_numero || ""}
                    onChange={(e) => setFormData({ ...formData, taquilla_numero: e.target.value })}
                    placeholder="Ej: 101, A-15, etc."
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contrato" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha Alta</Label>
                  <Input
                    type="date"
                    value={formData.fecha_alta || ""}
                    onChange={(e) => setFormData({ ...formData, fecha_alta: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo Contrato</Label>
                  <Select
                    value={formData.tipo_contrato || ""}
                    onValueChange={(value) => setFormData({ ...formData, tipo_contrato: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INDEFINIDO">INDEFINIDO</SelectItem>
                      <SelectItem value="TEMPORAL">TEMPORAL</SelectItem>
                      <SelectItem value="ETT">ETT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Código Contrato</Label>
                  <Input
                    value={formData.codigo_contrato || ""}
                    onChange={(e) => setFormData({ ...formData, codigo_contrato: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fecha Fin Contrato</Label>
                  <Input
                    type="date"
                    value={formData.fecha_fin_contrato || ""}
                    onChange={(e) => setFormData({ ...formData, fecha_fin_contrato: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Empresa ETT</Label>
                  <Input
                    value={formData.empresa_ett || ""}
                    onChange={(e) => setFormData({ ...formData, empresa_ett: e.target.value })}
                    disabled={formData.tipo_contrato !== "ETT"}
                    className={formData.tipo_contrato !== "ETT" ? "bg-slate-50" : ""}
                    placeholder={formData.tipo_contrato === "ETT" ? "Nombre de la empresa ETT" : ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Salario Anual (€)</Label>
                  <Input
                    type="number"
                    value={formData.salario_anual || ""}
                    onChange={(e) => setFormData({ ...formData, salario_anual: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Evaluación de Responsable</Label>
                  <Input
                    value={formData.evaluacion_responsable || ""}
                    onChange={(e) => setFormData({ ...formData, evaluacion_responsable: e.target.value })}
                    placeholder="Evaluación del desempeño..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Propuesta Cambio Categoría</Label>
                  <Select
                    value={formData.propuesta_cambio_categoria || ""}
                    onValueChange={(value) => setFormData({ ...formData, propuesta_cambio_categoria: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Sin propuesta</SelectItem>
                      <SelectItem value="1">Categoría 1</SelectItem>
                      <SelectItem value="2">Categoría 2</SelectItem>
                      <SelectItem value="3">Categoría 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Propuesto Por</Label>
                  <Input
                    value={formData.propuesta_cambio_quien || ""}
                    onChange={(e) => setFormData({ ...formData, propuesta_cambio_quien: e.target.value })}
                    placeholder="Nombre de quien propone el cambio"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="absentismo" className="space-y-4 mt-4">
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
                <AlertCircle className="w-5 h-5 text-blue-600 mb-2" />
                <p className="text-sm text-blue-800">
                  <strong>Información:</strong> Las tasas de absentismo se calculan automáticamente desde el módulo de Gestión de Ausencias. 
                  Los campos de Horas Causa Mayor son editables manualmente.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tasa Absentismo (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.tasa_absentismo || 0}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Calculado automáticamente</p>
                </div>

                <div className="space-y-2">
                  <Label>Última Actualización</Label>
                  <Input
                    type="date"
                    value={formData.ultima_actualizacion_absentismo || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Horas No Trabajadas</Label>
                  <Input
                    type="number"
                    value={formData.horas_no_trabajadas || 0}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Suma de ausencias</p>
                </div>

                <div className="space-y-2">
                  <Label>Horas Deberían Trabajarse</Label>
                  <Input
                    type="number"
                    value={formData.horas_deberian_trabajarse || 0}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Según jornada</p>
                </div>

                <div className="space-y-2">
                  <Label>Horas Causa Mayor Consumidas</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.horas_causa_mayor_consumidas || 0}
                    onChange={(e) => setFormData({ ...formData, horas_causa_mayor_consumidas: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Horas Causa Mayor Límite</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.horas_causa_mayor_limite || 0}
                    onChange={(e) => setFormData({ ...formData, horas_causa_mayor_limite: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Último Reset Causa Mayor</Label>
                  <Input
                    type="date"
                    value={formData.ultimo_reset_causa_mayor || ""}
                    onChange={(e) => setFormData({ ...formData, ultimo_reset_causa_mayor: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Se resetea anualmente</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="maquinas" className="space-y-4 mt-4">
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-blue-900 mb-2">
                  Experiencia en Máquinas por Prioridad
                </h4>
                <p className="text-sm text-blue-800">
                  Configure hasta 10 máquinas ordenadas por nivel de experiencia del empleado (1 = mayor experiencia)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                  <div key={num} className="space-y-2">
                    <Label>Máquina Prioridad {num}</Label>
                    <Select
                      value={formData[`maquina_${num}`] || ""}
                      onValueChange={(value) => setFormData({ ...formData, [`maquina_${num}`]: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Sin asignar</SelectItem>
                        {allMachines.map((machine) => (
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

            <TabsContent value="disponibilidad" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Disponibilidad Actual</Label>
                  <Select
                    value={formData.disponibilidad || "Disponible"}
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
                  <div className="p-4 border-2 border-amber-200 rounded-lg bg-amber-50 space-y-4">
                    <h4 className="font-semibold text-amber-900">Datos de Ausencia</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Fecha Inicio Ausencia</Label>
                        <Input
                          type="datetime-local"
                          value={formData.ausencia_inicio || ""}
                          onChange={(e) => setFormData({ ...formData, ausencia_inicio: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fecha Fin Ausencia</Label>
                        <Input
                          type="datetime-local"
                          value={formData.ausencia_fin || ""}
                          onChange={(e) => setFormData({ ...formData, ausencia_fin: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Motivo de Ausencia</Label>
                        <Input
                          value={formData.ausencia_motivo || ""}
                          onChange={(e) => setFormData({ ...formData, ausencia_motivo: e.target.value })}
                          placeholder="Describe el motivo de la ausencia..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Nota:</strong> Para gestión completa de ausencias (solicitudes, aprobaciones, tipos), 
                    utiliza el módulo de "Gestión de Ausencias" que sincronizará automáticamente con este campo.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : (employee?.id ? "Guardar Cambios" : "Crear Empleado")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}