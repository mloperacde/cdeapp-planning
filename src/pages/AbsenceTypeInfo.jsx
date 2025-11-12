import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Plus, Edit, Trash2, Save, Info, Download, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const PERMISOS_PREDEFINIDOS = [
  {
    nombre: "Matrimonio o registro pareja de hecho",
    codigo: "MATRIMONIO",
    categoria: "Permiso Retribuido",
    remunerada: true,
    hecho_causante: "Matrimonio o registro de pareja de hecho.",
    duracion_dias: 15,
    duracion_descripcion: "15 días naturales consecutivos",
    inicio_disfrute: "Con carácter general, desde el día del hecho causante o el siguiente día laborable",
    consideraciones: "Los 15 días son naturales consecutivos",
    articulo_estatuto: "artículo 37.3.a) del Estatuto de los Trabajadores"
  },
  {
    nombre: "Hospitalización familiar",
    codigo: "HOSPITALIZACION",
    categoria: "Permiso Retribuido",
    remunerada: true,
    hecho_causante: "Accidente o enfermedad graves, hospitalización o intervención quirúrgica sin hospitalización que precise reposo domiciliario del cónyuge, pareja de hecho o parientes hasta el segundo grado por consanguinidad o afinidad",
    duracion_dias: 5,
    duracion_descripcion: "5 días",
    inicio_disfrute: "El día del hecho causante o el siguiente día laborable y mientras continúe concurriendo este",
    consideraciones: "El permiso por hospitalización finaliza cuando esta termina, salvo que a pesar del alta hospitalaria un facultativo prescriba reposo domiciliario. Si finaliza antes de los 5 días, también lo hará el permiso retribuido.",
    articulo_estatuto: "artículo 37.3.b) del Estatuto de los Trabajadores"
  },
  {
    nombre: "Fallecimiento familiar",
    codigo: "FALLECIMIENTO",
    categoria: "Permiso Retribuido",
    remunerada: true,
    hecho_causante: "Fallecimiento del cónyuge, pareja de hecho o parientes hasta el segundo grado de consanguinidad o afinidad",
    duracion_dias: 2,
    duracion_descripcion: "2 días; si es preciso desplazamiento, se ampliará en otros 2 días",
    ampliacion_desplazamiento: true,
    dias_ampliacion: 2,
    inicio_disfrute: "El día del hecho causante o el siguiente día laborable",
    articulo_estatuto: "artículo 37.3.b) bis del Estatuto de los Trabajadores"
  },
  {
    nombre: "Mudanza",
    codigo: "MUDANZA",
    categoria: "Permiso Retribuido",
    remunerada: true,
    hecho_causante: "Traslado del domicilio habitual",
    duracion_dias: 1,
    duracion_descripcion: "1 día",
    inicio_disfrute: "El día de la mudanza",
    articulo_estatuto: "artículo 37.3.c) del Estatuto de los Trabajadores"
  },
  {
    nombre: "Deberes inexcusables carácter público",
    codigo: "DEBER_PUBLICO",
    categoria: "Permiso Retribuido",
    remunerada: true,
    hecho_causante: "Cumplimiento de un deber inexcusable de carácter público y personal, comprendido el ejercicio del sufragio activo",
    duracion_descripcion: "El tiempo indispensable que coincida con la jornada laboral",
    inicio_disfrute: "Cuando corresponda según la obligación",
    consideraciones: "Cuando el cumplimiento del deber suponga la imposibilidad de la prestación del trabajo debido en más del 20% de las horas laborables en un periodo de tres meses, podrá la empresa pasar al trabajador a excedencia. Si percibe indemnización o remuneración, se descontará del salario.",
    articulo_estatuto: "artículo 37.3.d) del Estatuto de los Trabajadores"
  },
  {
    nombre: "Exámenes prenatales",
    codigo: "EXAMENES_PRENATALES",
    categoria: "Permiso Retribuido",
    remunerada: true,
    hecho_causante: "Asistencia a exámenes prenatales y técnicas de preparación al parto y, en los casos de adopción, guarda con fines de adopción o acogimiento, para la asistencia a las preceptivas sesiones de información y preparación",
    duracion_descripcion: "El tiempo indispensable que coincida con la jornada laboral",
    inicio_disfrute: "Cuando deban tener lugar dentro de la jornada de trabajo",
    articulo_estatuto: "artículo 37.3.f) del Estatuto de los Trabajadores"
  },
  {
    nombre: "Lactancia",
    codigo: "LACTANCIA",
    categoria: "Permiso Retribuido",
    remunerada: true,
    hecho_causante: "Cuidado del lactante hasta que este cumpla 9 meses",
    duracion_dias: 270,
    duracion_descripcion: "9 meses desde el nacimiento. Puede sustituirse por reducción de jornada de media hora o acumularse en jornadas completas (10-15 días aprox.)",
    inicio_disfrute: "Desde la fecha en la que el trabajador lo solicite hasta que el menor cumpla 9 meses",
    consideraciones: "Es un derecho individual que no puede transferirse. Puede limitarse el ejercicio simultáneo cuando ambas personas trabajan en la misma empresa. Puede extenderse hasta 12 meses con reducción proporcional del salario.",
    articulo_estatuto: "artículo 37.4 del Estatuto de los Trabajadores"
  }
];

export default function AbsenceTypeInfoPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    categoria: "Permiso Retribuido",
    remunerada: false,
    requiere_aprobacion: true,
    hecho_causante: "",
    duracion_dias: null,
    duracion_descripcion: "",
    ampliacion_desplazamiento: false,
    dias_ampliacion: null,
    inicio_disfrute: "",
    consideraciones: "",
    articulo_estatuto: "",
    descripcion: "",
    visible_empleados: true,
    activo: true
  });

  const { data: absenceTypes } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.list('orden'),
    initialData: [],
  });

  const saveTypeMutation = useMutation({
    mutationFn: (data) => {
      if (editingType?.id) {
        return base44.entities.AbsenceType.update(editingType.id, data);
      }
      return base44.entities.AbsenceType.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absenceTypes'] });
      handleClose();
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (id) => base44.entities.AbsenceType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absenceTypes'] });
    },
  });

  const loadPredefinedMutation = useMutation({
    mutationFn: async () => {
      const promises = PERMISOS_PREDEFINIDOS.map((permiso, index) => 
        base44.entities.AbsenceType.create({
          ...permiso,
          orden: index,
          color: '#3B82F6'
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absenceTypes'] });
    },
  });

  const handleEdit = (type) => {
    setEditingType(type);
    setFormData(type);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingType(null);
    setFormData({
      nombre: "",
      codigo: "",
      categoria: "Permiso Retribuido",
      remunerada: false,
      requiere_aprobacion: true,
      hecho_causante: "",
      duracion_dias: null,
      duracion_descripcion: "",
      ampliacion_desplazamiento: false,
      dias_ampliacion: null,
      inicio_disfrute: "",
      consideraciones: "",
      articulo_estatuto: "",
      descripcion: "",
      visible_empleados: true,
      activo: true
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveTypeMutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este tipo de ausencia?')) {
      deleteTypeMutation.mutate(id);
    }
  };

  const handleLoadPredefined = () => {
    if (window.confirm('¿Cargar permisos predefinidos del Estatuto de los Trabajadores? Esto añadirá 7 tipos de permisos.')) {
      loadPredefinedMutation.mutate();
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Configuración
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              Tipos de Ausencias y Permisos
            </h1>
            <p className="text-slate-600 mt-1">
              Configura los tipos de ausencias según el Estatuto de los Trabajadores
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleLoadPredefined}
              variant="outline"
              disabled={loadPredefinedMutation.isPending}
              className="border-green-200 hover:bg-green-50"
            >
              <Download className="w-4 h-4 mr-2" />
              {loadPredefinedMutation.isPending ? 'Cargando...' : 'Cargar Predefinidos'}
            </Button>
            <Link to={createPageUrl("EmployeeAbsenceInfo")}>
              <Button variant="outline">
                <Info className="w-4 h-4 mr-2" />
                Ver Guía Empleados
              </Button>
            </Link>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Tipo
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <Card className="mb-6 bg-blue-50 border-2 border-blue-300">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>ℹ️ Información:</strong></p>
                <p>• Esta configuración se aplica al módulo de gestión de ausencias</p>
                <p>• Los tipos marcados como "Visible para empleados" aparecerán en la app móvil</p>
                <p>• Haz clic en "Cargar Predefinidos" para importar los permisos del Estatuto de los Trabajadores</p>
                <p>• Los tipos configurados aquí se usarán para validar y aprobar ausencias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Tipos */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Tipos de Ausencias Configurados ({absenceTypes.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Nombre</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead>Remunerada</TableHead>
                    <TableHead>Artículo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absenceTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No hay tipos configurados. Haz clic en "Cargar Predefinidos" o "Nuevo Tipo"
                      </TableCell>
                    </TableRow>
                  ) : (
                    absenceTypes.map((type) => (
                      <TableRow key={type.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div className="font-semibold text-slate-900">{type.nombre}</div>
                          {type.descripcion && (
                            <div className="text-xs text-slate-500">{type.descripcion}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{type.codigo}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{type.categoria}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {type.duracion_dias ? `${type.duracion_dias} días` : type.duracion_descripcion || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={type.remunerada ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {type.remunerada ? "Sí" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-slate-600 max-w-xs truncate">
                            {type.articulo_estatuto || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {type.activo && <Badge className="bg-blue-100 text-blue-800">Activo</Badge>}
                            {type.visible_empleados && <Badge className="bg-purple-100 text-purple-800">Visible</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(type)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(type.id)}
                              className="hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulario */}
      {showForm && (
        <Dialog open={true} onOpenChange={handleClose}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingType ? 'Editar Tipo de Ausencia' : 'Nuevo Tipo de Ausencia'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) => setFormData({...formData, categoria: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Permiso Retribuido">Permiso Retribuido</SelectItem>
                      <SelectItem value="Permiso No Retribuido">Permiso No Retribuido</SelectItem>
                      <SelectItem value="Vacaciones">Vacaciones</SelectItem>
                      <SelectItem value="Baja Médica">Baja Médica</SelectItem>
                      <SelectItem value="Suspensión Contrato">Suspensión Contrato</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duracion_dias">Duración (días)</Label>
                  <Input
                    id="duracion_dias"
                    type="number"
                    value={formData.duracion_dias || ""}
                    onChange={(e) => setFormData({...formData, duracion_dias: parseInt(e.target.value) || null})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duracion_descripcion">Descripción de Duración</Label>
                <Input
                  id="duracion_descripcion"
                  value={formData.duracion_descripcion || ""}
                  onChange={(e) => setFormData({...formData, duracion_descripcion: e.target.value})}
                  placeholder="Ej: 15 días naturales consecutivos"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hecho_causante">Hecho Causante</Label>
                <Textarea
                  id="hecho_causante"
                  value={formData.hecho_causante || ""}
                  onChange={(e) => setFormData({...formData, hecho_causante: e.target.value})}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inicio_disfrute">Inicio y Periodo de Disfrute</Label>
                <Textarea
                  id="inicio_disfrute"
                  value={formData.inicio_disfrute || ""}
                  onChange={(e) => setFormData({...formData, inicio_disfrute: e.target.value})}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consideraciones">Consideraciones</Label>
                <Textarea
                  id="consideraciones"
                  value={formData.consideraciones || ""}
                  onChange={(e) => setFormData({...formData, consideraciones: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="articulo_estatuto">Artículo del Estatuto</Label>
                <Input
                  id="articulo_estatuto"
                  value={formData.articulo_estatuto || ""}
                  onChange={(e) => setFormData({...formData, articulo_estatuto: e.target.value})}
                  placeholder="Ej: artículo 37.3.a) del Estatuto de los Trabajadores"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.remunerada}
                    onCheckedChange={(checked) => setFormData({...formData, remunerada: checked})}
                  />
                  <Label>Remunerada</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.requiere_aprobacion}
                    onCheckedChange={(checked) => setFormData({...formData, requiere_aprobacion: checked})}
                  />
                  <Label>Requiere Aprobación</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.ampliacion_desplazamiento}
                    onCheckedChange={(checked) => setFormData({...formData, ampliacion_desplazamiento: checked})}
                  />
                  <Label>Ampliación por Desplazamiento</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.visible_empleados}
                    onCheckedChange={(checked) => setFormData({...formData, visible_empleados: checked})}
                  />
                  <Label>Visible para Empleados</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.activo}
                    onCheckedChange={(checked) => setFormData({...formData, activo: checked})}
                  />
                  <Label>Activo</Label>
                </div>
              </div>

              {formData.ampliacion_desplazamiento && (
                <div className="space-y-2">
                  <Label htmlFor="dias_ampliacion">Días de Ampliación</Label>
                  <Input
                    id="dias_ampliacion"
                    type="number"
                    value={formData.dias_ampliacion || ""}
                    onChange={(e) => setFormData({...formData, dias_ampliacion: parseInt(e.target.value) || null})}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveTypeMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {saveTypeMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}