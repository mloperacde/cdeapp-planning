import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek } from "date-fns";
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
import { Plus, Save, Trash2, Edit, Package, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";

export default function WarehousePlanningTab({ selectedDate, selectedTeam, selectedShift, teams = [], teamSchedules = [] }) {
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
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
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

  const handleAdd14hTask = (employeeId) => {
    setEditingPlanning(null);
    setFormData({
        employee_id: employeeId || "",
        funcion_asignada: "",
        zona_almacen: "",
        tipo_tarea: "Picking",
        prioridad: "Media",
        notas: "Tarea de refuerzo/solape",
        hora_inicio: "14:00",
        hora_fin: "15:00",
      });
      setShowForm(true);
  }

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

  // Identify Tarde Team
  const tardeTeam = useMemo(() => {
    if (!selectedDate || teamSchedules.length === 0) return null;
    const [year, month, day] = selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    
    const schedule = teamSchedules.find(s => 
      s.fecha_inicio_semana === weekStartStr && s.turno === 'Tarde'
    );
    return teams.find(t => t.team_key === schedule?.team_key);
  }, [selectedDate, teamSchedules, teams]);

  // Filter Employees
  const warehouseEmployees = employees.filter(emp => 
    emp.departamento === "ALMACEN" && 
    emp.disponibilidad === "Disponible" &&
    emp.incluir_en_planning !== false
  );

  const employees14h = useMemo(() => {
    if (!tardeTeam) return [];
    return warehouseEmployees.filter(emp => emp.equipo === tardeTeam.team_name);
  }, [warehouseEmployees, tardeTeam]);

  const filteredPlannings = plannings.filter(
    p => p.fecha === selectedDate && p.team_key === selectedTeam
  );

  const getEmployeeName = (id) => employees.find(e => e.id === id)?.nombre || 'N/A';

  return (
    <div className="space-y-6">

      {/* Module 14:00 - 15:00 */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-l-purple-500">
        <CardHeader className="border-b border-purple-100 pb-3">
             <CardTitle className="flex items-center gap-2 text-purple-900 text-lg">
              <Clock className="w-5 h-5 text-purple-600" />
              Planificación 14:00 a 15:00 (Incorporación Turno Tarde)
            </CardTitle>
            <p className="text-xs text-purple-600 font-medium">
                {tardeTeam ? `Personal del ${tardeTeam.team_name}` : 'No se detectó turno de tarde'}
            </p>
        </CardHeader>
        <CardContent className="p-4">
            {employees14h.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No hay empleados de turno tarde disponibles para mostrar.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {employees14h.map(emp => {
                        const task = filteredPlannings.find(p => p.employee_id === emp.id && (p.hora_inicio === '14:00' || (p.hora_inicio <= '14:00' && p.hora_fin >= '15:00')));
                        return (
                            <div key={emp.id} className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <span className="font-semibold text-sm text-slate-800">{emp.nombre}</span>
                                    {task ? (
                                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">Asignado</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-slate-400 text-[10px]">Sin tarea</Badge>
                                    )}
                                </div>
                                
                                {task ? (
                                    <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                                        <p className="font-medium truncate">{task.funcion_asignada}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3"/> {task.hora_inicio} - {task.hora_fin}
                                        </p>
                                    </div>
                                ) : (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="w-full text-xs h-7 border border-dashed border-slate-300 text-slate-500 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50"
                                        onClick={() => handleAdd14hTask(emp.id)}
                                    >
                                        <Plus className="w-3 h-3 mr-1"/> Asignar Tarea 14h
                                    </Button>
                                )}
                                {task && (
                                     <Button 
                                        variant="link" 
                                        size="sm" 
                                        className="text-[10px] h-auto p-0 self-end text-purple-600"
                                        onClick={() => handleEdit(task)}
                                    >
                                        Editar
                                    </Button>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader className="border-b border-purple-100">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Package className="w-6 h-6" />
              Asignación General de Tareas - {selectedShift || 'Sin turno'}
            </CardTitle>
            <Button
              onClick={() => {
                  setEditingPlanning(null);
                  setFormData({ ...formData, employee_id: "", hora_inicio: "", hora_fin: "" });
                  setShowForm(true);
              }}
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
