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
import { Plus, Save, Trash2, Edit, Package } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function WarehousePlanningTab({ selectedDate, selectedTeam, selectedShift }) {
  const [showForm, setShowForm] = useState(false);
  const [editingPlanning, setEditingPlanning] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    employee_id: "",
    funcion_asignada: "",
    zona_almacen: "",
    tipo_tarea: "Picking",
    prioridad: "Media",
    notas: "",
    hora_inicio: "",
    hora_fin: "",
  });

  const { data: plannings, isLoading } = useQuery({
    queryKey: ['dailyWarehousePlannings', selectedDate, selectedTeam],
    queryFn: () => base44.entities.DailyWarehousePlanning.list(),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
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
        return base44.entities.DailyWarehousePlanning.update(editingPlanning.id, finalData);
      }
      return base44.entities.DailyWarehousePlanning.create(finalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyWarehousePlannings'] });
      handleClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DailyWarehousePlanning.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyWarehousePlannings'] });
    },
  });

  const handleEdit = (planning) => {
    setEditingPlanning(planning);
    setFormData({
      employee_id: planning.employee_id || "",
      funcion_asignada: planning.funcion_asignada || "",
      zona_almacen: planning.zona_almacen || "",
      tipo_tarea: planning.tipo_tarea || "Picking",
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
      zona_almacen: "",
      tipo_tarea: "Picking",
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

  const warehouseEmployees = employees.filter(emp => 
    emp.departamento === "ALMACEN" && 
    emp.disponibilidad === "Disponible" &&
    emp.incluir_en_planning !== false
  );

  const getEmployeeName = (id) => employees.find(e => e.id === id)?.nombre || 'N/A';

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader className="border-b border-purple-100">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Package className="w-6 h-6" />
              Planificación de Almacén - {selectedShift || 'Sin turno'}
            </CardTitle>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-purple-600 hover:bg-purple-700"
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
                    <TableHead>Tipo Tarea</TableHead>
                    <TableHead>Zona</TableHead>
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
                        <Badge variant="outline">{planning.tipo_tarea}</Badge>
                      </TableCell>
                      <TableCell>{planning.zona_almacen || '-'}</TableCell>
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
        <Card className="shadow-xl border-2 border-purple-300">
          <CardHeader className="bg-purple-50 border-b border-purple-200">
            <CardTitle>
              {editingPlanning ? 'Editar Asignación' : 'Nueva Asignación de Almacén'}
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
                      {warehouseEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.nombre} - {emp.puesto}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Tarea</Label>
                  <Select
                    value={formData.tipo_tarea}
                    onValueChange={(value) => setFormData({ ...formData, tipo_tarea: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Recepción">Recepción</SelectItem>
                      <SelectItem value="Expedición">Expedición</SelectItem>
                      <SelectItem value="Inventario">Inventario</SelectItem>
                      <SelectItem value="Picking">Picking</SelectItem>
                      <SelectItem value="Organización">Organización</SelectItem>
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
                  <Label>Zona de Almacén</Label>
                  <Input
                    value={formData.zona_almacen}
                    onChange={(e) => setFormData({ ...formData, zona_almacen: e.target.value })}
                    placeholder="Ej: Zona A, Pasillo 3"
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
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
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