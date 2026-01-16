import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Save, Trash2, Edit, ClipboardCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";

export default function QualityPlanningTab({ selectedDate, selectedTeam, selectedShift }) {
  const [showForm, setShowForm] = useState(false);
  const [editingPlanning, setEditingPlanning] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    employee_id: "",
    funcion_asignada: "",
    tipo_inspeccion: "Control de Proceso",
    lineas_asignadas: [],
    prioridad: "Media",
    notas: "",
    hora_inicio: "",
    hora_fin: "",
  });

  const { data: plannings, isLoading } = useQuery({
    queryKey: ['dailyQualityPlannings', selectedDate, selectedTeam],
    queryFn: () => base44.entities.DailyQualityPlanning.list(),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
    initialData: [],
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list('orden_visualizacion');
      return data.map(m => ({
        ...m,
        codigo: m.codigo_maquina,
        orden: m.orden_visualizacion
      })).sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
    },
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const finalData = {
        ...data,
        fecha: selectedDate,
        team_key: selectedTeam,
        turno: selectedShift || "Mañana",
      };

      if (editingPlanning?.id) {
        return base44.entities.DailyQualityPlanning.update(editingPlanning.id, finalData);
      }
      return base44.entities.DailyQualityPlanning.create(finalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyQualityPlannings'] });
      handleClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DailyQualityPlanning.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyQualityPlannings'] });
    },
  });

  const handleEdit = (planning) => {
    setEditingPlanning(planning);
    setFormData({
      employee_id: planning.employee_id || "",
      funcion_asignada: planning.funcion_asignada || "",
      tipo_inspeccion: planning.tipo_inspeccion || "Control de Proceso",
      lineas_asignadas: planning.lineas_asignadas || [],
      prioridad: planning.prioridad || "Media",
      notas: planning.notas || "",
      hora_inicio: planning.hora_inicio || "",
      hora_fin: planning.hora_fin || "",
    });
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingPlanning(null);
    setFormData({
      employee_id: "",
      funcion_asignada: "",
      tipo_inspeccion: "Control de Proceso",
      lineas_asignadas: [],
      prioridad: "Media",
      notas: "",
      hora_inicio: "",
      hora_fin: "",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar esta planificación?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredPlannings = plannings.filter(
    p => p.fecha === selectedDate && p.team_key === selectedTeam
  );

  const qualityEmployees = employees.filter(emp => 
    emp.departamento === "CALIDAD" && 
    emp.disponibilidad === "Disponible" &&
    emp.incluir_en_planning !== false
  );

  const getEmployeeName = (id) => employees.find(e => e.id === id)?.nombre || 'N/A';

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader className="border-b border-green-100">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-green-900">
              <ClipboardCheck className="w-6 h-6" />
              Planificación de Calidad - {selectedShift || 'Sin turno'}
            </CardTitle>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Asignación
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <p className="text-center text-slate-500 py-8">Cargando...</p>
          ) : filteredPlannings.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              No hay asignaciones para esta fecha y equipo
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Función</TableHead>
                    <TableHead>Tipo Inspección</TableHead>
                    <TableHead>Líneas</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlannings.map((planning) => (
                    <TableRow key={planning.id}>
                      <TableCell className="font-semibold">
                        {getEmployeeName(planning.employee_id)}
                      </TableCell>
                      <TableCell>{planning.funcion_asignada}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{planning.tipo_inspeccion}</Badge>
                      </TableCell>
                      <TableCell>
                        {planning.lineas_asignadas?.length > 0
                          ? `${planning.lineas_asignadas.length} línea${planning.lineas_asignadas.length !== 1 ? 's' : ''}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          planning.prioridad === "Urgente" ? "bg-red-100 text-red-800" :
                          planning.prioridad === "Alta" ? "bg-orange-100 text-orange-800" :
                          planning.prioridad === "Media" ? "bg-yellow-100 text-yellow-800" :
                          "bg-blue-100 text-blue-800"
                        }>
                          {planning.prioridad}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          planning.estado === "Completado" ? "bg-green-100 text-green-800" :
                          planning.estado === "En Curso" ? "bg-blue-100 text-blue-800" :
                          "bg-slate-100 text-slate-600"
                        }>
                          {planning.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(planning)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(planning.id)}
                            className="hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <Card className="shadow-xl border-2 border-green-300">
          <CardHeader className="bg-green-50 border-b border-green-200">
            <CardTitle>
              {editingPlanning ? 'Editar Asignación' : 'Nueva Asignación de Calidad'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Empleado *</Label>
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      {qualityEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.nombre} - {emp.puesto}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Inspección</Label>
                  <Select
                    value={formData.tipo_inspeccion}
                    onValueChange={(value) => setFormData({ ...formData, tipo_inspeccion: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Control de Proceso">Control de Proceso</SelectItem>
                      <SelectItem value="Control de Recepción">Control de Recepción</SelectItem>
                      <SelectItem value="Control Final">Control Final</SelectItem>
                      <SelectItem value="Auditoría">Auditoría</SelectItem>
                      <SelectItem value="Metrología">Metrología</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Función Asignada *</Label>
                  <Input
                    value={formData.funcion_asignada}
                    onChange={(e) => setFormData({ ...formData, funcion_asignada: e.target.value })}
                    placeholder="Descripción de la función o tarea"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select
                    value={formData.prioridad}
                    onValueChange={(value) => setFormData({ ...formData, prioridad: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baja">Baja</SelectItem>
                      <SelectItem value="Media">Media</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Hora Inicio</Label>
                  <Input
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Hora Fin</Label>
                  <Input
                    type="time"
                    value={formData.hora_fin}
                    onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
