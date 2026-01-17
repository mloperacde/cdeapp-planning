import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Edit, Trash2, Save, Info, Download, GitFork, Bell, Calendar } from "lucide-react";
import { useAppData } from "../components/data/DataProvider";
import ApprovalFlowConfig from "../components/absences/ApprovalFlowConfig";
import AbsenceNotificationConfig from "../components/absences/AbsenceNotificationConfig";
import VacationAccumulationConfig from "../components/absences/VacationAccumulationConfig";
import AbsenceSyncAudit from "../components/absences/AbsenceSyncAudit";

// Predefined absence types (from labor law)
const PERMISOS_PREDEFINIDOS = [
  {
    nombre: "Matrimonio o registro pareja de hecho",
    codigo: "MATRIMONIO",
    categoria_principal: "Permiso Retribuido",
    remunerada: true,
    hecho_causante: "Matrimonio o registro de pareja de hecho.",
    duracion_dias: 15,
    duracion_descripcion: "15 días naturales consecutivos",
    inicio_disfrute: "Con carácter general, desde el día del hecho causante o el siguiente día laborable",
    consideraciones: "Los 15 días son naturales consecutivos",
    articulo_estatuto: "artículo 37.3.a) del Estatuto de los Trabajadores",
    no_consume_vacaciones: false,
    color: '#3B82F6',
  },
  {
    nombre: "Hospitalización familiar",
    codigo: "HOSPITALIZACION",
    categoria_principal: "Permiso Retribuido",
    remunerada: true,
    hecho_causante: "Accidente o enfermedad graves, hospitalización o intervención quirúrgica sin hospitalización que precise reposo domiciliario del cónyuge, pareja de hecho o parientes hasta el segundo grado por consanguinidad o afinidad",
    duracion_dias: 5,
    duracion_descripcion: "5 días",
    inicio_disfrute: "El día del hecho causante o el siguiente día laborable y mientras continúe concurriendo este",
    consideraciones: "El permiso por hospitalización finaliza cuando esta termina, salvo que a pesar del alta hospitalaria un facultativo prescriba reposo domiciliario. Si finaliza antes de los 5 días, también lo hará el permiso retribuido.",
    articulo_estatuto: "artículo 37.3.b) del Estatuto de los Trabajadores",
    no_consume_vacaciones: false,
    color: '#3B82F6',
  },
  {
    nombre: "Fallecimiento familiar",
    codigo: "FALLECIMIENTO",
    categoria_principal: "Permiso Retribuido",
    remunerada: true,
    hecho_causante: "Fallecimiento del cónyuge, pareja de hecho o parientes hasta el segundo grado de consanguinidad o afinidad",
    duracion_dias: 2,
    duracion_descripcion: "2 días; si es preciso desplazamiento, se ampliará en otros 2 días",
    ampliacion_desplazamiento: true,
    dias_ampliacion: 2,
    inicio_disfrute: "El día del hecho causante o el siguiente día laborable",
    articulo_estatuto: "artículo 37.3.b) bis del Estatuto de los Trabajadores",
    no_consume_vacaciones: false,
    color: '#3B82F6',
  },
  {
    nombre: "Mudanza",
    codigo: "MUDANZA",
    categoria_principal: "Permiso Retribuido",
    remunerada: true,
    hecho_causante: "Traslado del domicilio habitual",
    duracion_dias: 1,
    duracion_descripcion: "1 día",
    inicio_disfrute: "El día de la mudanza",
    articulo_estatuto: "artículo 37.3.c) del Estatuto de los Trabajadores",
    no_consume_vacaciones: false,
    color: '#3B82F6',
  },
  {
    nombre: "Deberes inexcusables carácter público",
    codigo: "DEBER_PUBLICO",
    categoria_principal: "Permiso Retribuido",
    remunerada: true,
    hecho_causante: "Cumplimiento de un deber inexcusable de carácter público y personal, comprendido el ejercicio del sufragio activo",
    duracion_descripcion: "El tiempo indispensable que coincida con la jornada laboral",
    inicio_disfrute: "Cuando corresponda según la obligación",
    consideraciones: "Cuando el cumplimiento del deber suponga la imposibilidad de la prestación del trabajo debido en más del 20% de las horas laborables en un periodo de tres meses, podrá la empresa pasar al trabajador a excedencia. Si percibe indemnización o remuneración, se descontará del salario.",
    articulo_estatuto: "artículo 37.3.d) del Estatuto de los Trabajadores",
    no_consume_vacaciones: false,
    color: '#3B82F6',
  },
  {
    nombre: "Exámenes prenatales",
    codigo: "EXAMENES_PRENATALES",
    categoria_principal: "Permiso Retribuido",
    remunerada: true,
    hecho_causante: "Asistencia a exámenes prenatales y técnicas de preparación al parto y, en los casos de adopción, guarda con fines de adopción o acogimiento, para la asistencia a las preceptivas sesiones de información y preparación",
    duracion_descripcion: "El tiempo indispensable que coincida con la jornada laboral",
    inicio_disfrute: "Cuando deban tener lugar dentro de la jornada de trabajo",
    articulo_estatuto: "artículo 37.3.f) del Estatuto de los Trabajadores",
    no_consume_vacaciones: false,
    color: '#3B82F6',
  },
  {
    nombre: "Lactancia",
    codigo: "LACTANCIA",
    categoria_principal: "Permiso Retribuido",
    remunerada: true,
    hecho_causante: "Cuidado del lactante hasta que este cumpla 9 meses",
    duracion_dias: 270,
    duracion_descripcion: "9 meses desde el nacimiento. Puede sustituirse por reducción de jornada de media hora o acumularse en jornadas completas (10-15 días aprox.)",
    inicio_disfrute: "Desde la fecha en la que el trabajador lo solicite hasta que el menor cumpla 9 meses",
    consideraciones: "Es un derecho individual que no puede transferirse. Puede limitarse el ejercicio simultáneo cuando ambas personas trabajan en la misma empresa. Puede extenderse hasta 12 meses con reducción proporcional del salario.",
    articulo_estatuto: "artículo 37.4 del Estatuto de los Trabajadores",
    no_consume_vacaciones: false,
    color: '#3B82F6',
  }
];

function AbsenceTypeForm({ type, onClose, saveMutation }) {
  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    categoria_principal: "Permiso Retribuido",
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
    activo: true,
    no_consume_vacaciones: false,
    color: '#3B82F6',
  });

  useEffect(() => {
    if (type) {
      setFormData(type);
    } else {
      setFormData({
        nombre: "",
        codigo: "",
        categoria_principal: "Permiso Retribuido",
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
        activo: true,
        no_consume_vacaciones: false,
        color: '#3B82F6',
      });
    }
  }, [type]);

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type ? 'Editar Tipo de Ausencia' : 'Nuevo Tipo de Ausencia'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria_principal">Categoría Principal</Label>
              <Select
                value={formData.categoria_principal}
                onValueChange={(value) => setFormData({ ...formData, categoria_principal: value })}
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
                onChange={(e) => setFormData({ ...formData, duracion_dias: parseInt(e.target.value) || null })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duracion_descripcion">Descripción de Duración</Label>
            <Input
              id="duracion_descripcion"
              value={formData.duracion_descripcion || ""}
              onChange={(e) => setFormData({ ...formData, duracion_descripcion: e.target.value })}
              placeholder="Ej: 15 días naturales consecutivos"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hecho_causante">Hecho Causante</Label>
            <Textarea
              id="hecho_causante"
              value={formData.hecho_causante || ""}
              onChange={(e) => setFormData({ ...formData, hecho_causante: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inicio_disfrute">Inicio y Periodo de Disfrute</Label>
            <Textarea
              id="inicio_disfrute"
              value={formData.inicio_disfrute || ""}
              onChange={(e) => setFormData({ ...formData, inicio_disfrute: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="consideraciones">Consideraciones</Label>
            <Textarea
              id="consideraciones"
              value={formData.consideraciones || ""}
              onChange={(e) => setFormData({ ...formData, consideraciones: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="articulo_estatuto">Artículo del Estatuto</Label>
            <Input
              id="articulo_estatuto"
              value={formData.articulo_estatuto || ""}
              onChange={(e) => setFormData({ ...formData, articulo_estatuto: e.target.value })}
              placeholder="Ej: artículo 37.3.a) del Estatuto de los Trabajadores"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion || ""}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.remunerada}
                onCheckedChange={(checked) => setFormData({ ...formData, remunerada: checked })}
                id="remunerada"
              />
              <Label htmlFor="remunerada">Remunerada</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.requiere_aprobacion}
                onCheckedChange={(checked) => setFormData({ ...formData, requiere_aprobacion: checked })}
                id="requiere_aprobacion"
              />
              <Label htmlFor="requiere_aprobacion">Requiere Aprobación</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.ampliacion_desplazamiento}
                onCheckedChange={(checked) => setFormData({ ...formData, ampliacion_desplazamiento: checked })}
                id="ampliacion_desplazamiento"
              />
              <Label htmlFor="ampliacion_desplazamiento">Ampliación por Desplazamiento</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.visible_empleados}
                onCheckedChange={(checked) => setFormData({ ...formData, visible_empleados: checked })}
                id="visible_empleados"
              />
              <Label htmlFor="visible_empleados">Visible para Empleados</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                id="activo"
              />
              <Label htmlFor="activo">Activo</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.no_consume_vacaciones}
                onCheckedChange={(checked) => setFormData({ ...formData, no_consume_vacaciones: checked })}
                id="no_consume_vacaciones"
              />
              <Label htmlFor="no_consume_vacaciones">NO Consume Vacaciones</Label>
            </div>
          </div>

          {formData.ampliacion_desplazamiento && (
            <div className="space-y-2">
              <Label htmlFor="dias_ampliacion">Días de Ampliación</Label>
              <Input
                id="dias_ampliacion"
                type="number"
                value={formData.dias_ampliacion || ""}
                onChange={(e) => setFormData({ ...formData, dias_ampliacion: parseInt(e.target.value) || null })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="color">Color (Hex)</Label>
            <Input
              id="color"
              type="color"
              value={formData.color || '#3B82F6'}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AbsenceConfigurationTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const queryClient = useQueryClient();
  const { absenceTypesAll = [] } = useAppData();
  const absenceTypes = absenceTypesAll;

  const saveTypeMutation = useMutation({
    mutationFn: (data) => {
      if (data.id) {
        return base44.entities.AbsenceType.update(data.id, data);
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
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingType(null);
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
    <Tabs defaultValue="types" className="space-y-6">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="types">
          <FileText className="w-4 h-4 mr-2" />
          Tipos
        </TabsTrigger>
        <TabsTrigger value="flows">
          <GitFork className="w-4 h-4 mr-2" />
          Flujos
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <Bell className="w-4 h-4 mr-2" />
          Notificaciones
        </TabsTrigger>
        <TabsTrigger value="vacations">
          <Calendar className="w-4 h-4 mr-2" />
          Vacaciones
        </TabsTrigger>
        <TabsTrigger value="audit">
          <FileText className="w-4 h-4 mr-2" />
          Auditoría
        </TabsTrigger>
      </TabsList>

      <TabsContent value="types" className="space-y-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Tipos de Ausencias y Permisos</h2>
            <p className="text-slate-600 mt-1">Configura los tipos de ausencias según el Estatuto de los Trabajadores</p>
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
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Tipo
            </Button>
          </div>
        </div>

        <Card className="mb-6 bg-blue-50 border-2 border-blue-300">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>ℹ️ Información:</strong></p>
                <p>• Los tipos marcados como "Visible para empleados" aparecerán en la app móvil</p>
                <p>• <strong>Campo "NO Consume Vacaciones":</strong> Si está activo, cuando el empleado esté ausente durante vacaciones colectivas, esos días se guardarán como pendientes para disfrutar después</p>
                <p>• Los tipos configurados aquí se usarán para validar y aprobar ausencias</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
                    <TableHead>Consume Vac.</TableHead>
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
                          <Badge variant="outline">{type.categoria_principal}</Badge>
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
                          <Badge className={type.no_consume_vacaciones ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-800"}>
                            {type.no_consume_vacaciones ? "NO" : "SÍ"}
                          </Badge>
                          {type.no_consume_vacaciones && (
                            <div className="text-[10px] text-amber-700 mt-1">Genera pendientes</div>
                          )}
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

        {showForm && (
          <AbsenceTypeForm
            type={editingType}
            onClose={handleClose}
            saveMutation={saveTypeMutation}
          />
        )}
      </TabsContent>

      <TabsContent value="flows">
        <ApprovalFlowConfig />
      </TabsContent>

      <TabsContent value="notifications">
        <AbsenceNotificationConfig />
      </TabsContent>

      <TabsContent value="vacations">
        <VacationAccumulationConfig />
      </TabsContent>

      <TabsContent value="audit">
        <AbsenceSyncAudit />
      </TabsContent>
    </Tabs>
  );
}
