
import React, { useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge"; // New import
import { differenceInDays, differenceInMonths, differenceInYears, format } from "date-fns"; // Added format
import { es } from "date-fns/locale"; // New import for locale
import { AlertCircle } from "lucide-react"; // New import

export default function EmployeeForm({ employee, machines, onClose }) {
  const [formData, setFormData] = useState(employee || {
    codigo_empleado: "",
    nombre: "",
    fecha_nacimiento: "",
    dni: "",
    sexo: "",
    nacionalidad: "",
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
    turno_partido_entrada1: "",
    turno_partido_salida1: "",
    turno_partido_entrada2: "",
    turno_partido_salida2: "",
    fecha_alta: "",
    tipo_contrato: "",
    codigo_contrato: "",
    salario_anual: 0,
    evaluacion_responsable: "",
    propuesta_cambio_categoria: "",
    propuesta_cambio_quien: "",
    objetivos: {
      periodo: "",
      importe_incentivo: 0,
      objetivo_1: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_2: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_3: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_4: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_5: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_6: { descripcion: "", peso: 0, resultado: 0 },
    },
    // Removed ausencia_inicio, ausencia_fin, ausencia_motivo from initial state as they are now read-only
  });

  // Removed fullDayAbsence state as it's no longer used

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

  const antiguedad = useMemo(() => { // Changed to useMemo as React.useMemo is redundant
    if (!formData.fecha_alta) return null;
    
    const fechaAlta = new Date(formData.fecha_alta);
    const hoy = new Date();
    
    const years = differenceInYears(hoy, fechaAlta);
    const months = differenceInMonths(hoy, fechaAlta) % 12;
    // Adjusted logic for days as per outline
    const days = differenceInDays(hoy, new Date(hoy.getFullYear(), hoy.getMonth() - months, fechaAlta.getDate()));
    
    let result = [];
    if (years > 0) result.push(`${years} año${years !== 1 ? 's' : ''}`);
    if (months > 0) result.push(`${months} mes${months !== 1 ? 'es' : ''}`);
    if (days > 0 && years === 0) result.push(`${days} día${days !== 1 ? 's' : ''}`); // Only show days if less than a year
    
    return result.length > 0 ? result.join(', ') : '0 días';
  }, [formData.fecha_alta]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Removed absence-related logic (fullDayAbsence adjustment, clearing absence fields, deleting absences)
      // Absence management is now external and reflected in the formData.disponibilidad
      
      if (employee?.id) {
        return base44.entities.Employee.update(employee.id, data);
      }
      return base44.entities.Employee.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      // Removed invalidation of 'absences' query as absence management is now external
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

  // Showing absence info if exists
  const isAbsent = formData.disponibilidad === "Ausente";
  // Check if both start and end dates are present to consider "hasAbsenceData"
  const hasAbsenceData = formData.ausencia_inicio && formData.ausencia_fin;

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
                  <Label htmlFor="codigo_empleado">Código de Empleado</Label>
                  <Input
                    id="codigo_empleado"
                    value={formData.codigo_empleado || ""}
                    onChange={(e) => setFormData({ ...formData, codigo_empleado: e.target.value })}
                  />
                </div>

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
                  <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                  <Input
                    id="fecha_nacimiento"
                    type="date"
                    value={formData.fecha_nacimiento || ""}
                    onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dni">DNI/NIE</Label>
                  <Input
                    id="dni"
                    value={formData.dni || ""}
                    onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sexo">Sexo</Label>
                  <Select
                    value={formData.sexo || ""}
                    onValueChange={(value) => setFormData({ ...formData, sexo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Femenino">Femenino</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nacionalidad">Nacionalidad</Label>
                  <Input
                    id="nacionalidad"
                    value={formData.nacionalidad || ""}
                    onChange={(e) => setFormData({ ...formData, nacionalidad: e.target.value })}
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
                      <SelectItem value="Turno Partido">Turno Partido</SelectItem>
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

                {formData.tipo_turno === "Turno Partido" && (
                  <div className="md:col-span-2 space-y-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                    <h4 className="font-semibold text-blue-900">Configuración de Turno Partido</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="entrada1">Horario Entrada 1</Label>
                        <Input
                          id="entrada1"
                          type="time"
                          value={formData.turno_partido_entrada1 || ""}
                          onChange={(e) => setFormData({ ...formData, turno_partido_entrada1: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="salida1">Horario Salida 1</Label>
                        <Input
                          id="salida1"
                          type="time"
                          value={formData.turno_partido_salida1 || ""}
                          onChange={(e) => setFormData({ ...formData, turno_partido_salida1: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="entrada2">Horario Entrada 2</Label>
                        <Input
                          id="entrada2"
                          type="time"
                          value={formData.turno_partido_entrada2 || ""}
                          onChange={(e) => setFormData({ ...formData, turno_partido_entrada2: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="salida2">Horario Salida 2</Label>
                        <Input
                          id="salida2"
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
              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900 mb-1">
                      Gestión de Ausencias Centralizada
                    </p>
                    <p className="text-sm text-amber-800">
                      Para gestionar ausencias de forma centralizada, utiliza la página "Gestión de Ausencias" 
                      que sincronizará automáticamente los datos con esta pestaña.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Estado de Disponibilidad</Label>
                  <div className="p-4 border-2 rounded-lg bg-slate-50">
                    {isAbsent ? (
                      <div className="space-y-3">
                        <Badge variant="destructive" className="text-base px-3 py-1">
                          Ausente
                        </Badge>
                        
                        {hasAbsenceData && (
                          <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="font-semibold text-slate-700">Fecha Inicio:</span>
                                <p className="text-slate-600">
                                  {format(new Date(formData.ausencia_inicio), "dd/MM/yyyy HH:mm", { locale: es })}
                                </p>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-700">Fecha Fin:</span>
                                <p className="text-slate-600">
                                  {format(new Date(formData.ausencia_fin), "dd/MM/yyyy HH:mm", { locale: es })}
                                </p>
                              </div>
                            </div>
                            {formData.ausencia_motivo && (
                              <div>
                                <span className="font-semibold text-slate-700">Motivo:</span>
                                <p className="text-slate-600">{formData.ausencia_motivo}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {!hasAbsenceData && (
                           <p className="text-sm text-slate-600 mt-2">
                              No hay datos de ausencia específicos registrados aquí. Gestione las ausencias desde la página de gestión de ausencias.
                           </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <Badge className="bg-green-100 text-green-800 text-base px-3 py-1">
                          Disponible
                        </Badge>
                        <p className="text-sm text-slate-600 mt-2">
                          El empleado está disponible para trabajar
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="rrhh" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_alta">Fecha de Alta</Label>
                  <Input
                    id="fecha_alta"
                    type="date"
                    value={formData.fecha_alta || ""}
                    onChange={(e) => setFormData({ ...formData, fecha_alta: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Antigüedad</Label>
                  <Input value={antiguedad || "Sin fecha de alta"} disabled className="bg-slate-50" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_contrato">Tipo de Contrato</Label>
                  <Input
                    id="tipo_contrato"
                    value={formData.tipo_contrato || ""}
                    onChange={(e) => setFormData({ ...formData, tipo_contrato: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codigo_contrato">Código de Contrato</Label>
                  <Input
                    id="codigo_contrato"
                    value={formData.codigo_contrato || ""}
                    onChange={(e) => setFormData({ ...formData, codigo_contrato: e.target.value })}
                  />
                </div>

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

                <div className="space-y-2">
                  <Label htmlFor="propuesta_cambio_categoria">Propuesta Cambio Categoría</Label>
                  <Select
                    value={formData.propuesta_cambio_categoria || ""}
                    onValueChange={(value) => setFormData({ ...formData, propuesta_cambio_categoria: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Categoría 1</SelectItem>
                      <SelectItem value="2">Categoría 2</SelectItem>
                      <SelectItem value="3">Categoría 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propuesta_cambio_quien">Propuesto Por</Label>
                  <Input
                    id="propuesta_cambio_quien"
                    placeholder="Nombre de quien propone"
                    value={formData.propuesta_cambio_quien || ""}
                    onChange={(e) => setFormData({ ...formData, propuesta_cambio_quien: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold text-lg mb-4">Sistema de Objetivos</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="periodo">Período de Objetivos</Label>
                    <Select
                      value={formData.objetivos?.periodo || ""}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        objetivos: { ...formData.objetivos, periodo: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mensual">Mensual</SelectItem>
                        <SelectItem value="Bimensual">Bimensual</SelectItem>
                        <SelectItem value="Trimestral">Trimestral</SelectItem>
                        <SelectItem value="Cuatrimestral">Cuatrimestral</SelectItem>
                        <SelectItem value="Semestral">Semestral</SelectItem>
                        <SelectItem value="Anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="importe_incentivo">Importe Incentivo (€)</Label>
                    <Input
                      id="importe_incentivo"
                      type="number"
                      value={formData.objetivos?.importe_incentivo || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        objetivos: { ...formData.objetivos, importe_incentivo: parseFloat(e.target.value) }
                      })}
                    />
                  </div>
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
