import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Save, Trash2, Edit, Plus, Users, Clock, BookOpen, Wrench } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export default function SaturdaySupportPlanning({ selectedDate, selectedTeam, teams = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    employee_id: "",
    activity_type: "Formación", // Formación, Mantenimiento Preventivo, Avería Especial, Apoyo Producción
    description: "",
    start_time: "06:00",
    end_time: "14:00",
    notes: ""
  });

  // --- Queries ---
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre', 2000),
    staleTime: 60 * 60 * 1000
  });

  const { data: saturdayPlannings = [], isLoading } = useQuery({
    queryKey: ['saturdayPlannings', selectedDate],
    queryFn: async () => {
       // We can reuse DailyMaintenancePlanning entity but filter by a specific tag or just rely on date being a Saturday
       // Or better, add a field 'is_saturday_support' to the entity schema if possible.
       // For now, we'll assume we filter by date.
       // However, to distinguish from regular shift planning, we might need a custom property in notes or a specific "Shift" name like "Sábado".
       const all = await base44.entities.DailyMaintenancePlanning.filter({ fecha: selectedDate });
       return all.filter(p => p.turno === "Sábado Extra" || p.notes?.includes("saturday_support"));
    }
  });

  // --- Mutations ---
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        fecha: selectedDate,
        team_key: selectedTeam || "General", // Saturday might not be strictly team-bound
        turno: "Sábado Extra",
        employee_id: data.employee_id,
        funcion_asignada: data.activity_type, // Map activity to function
        area_responsabilidad: "Planta General",
        prioridad: "Alta",
        hora_inicio: data.start_time,
        hora_fin: data.end_time,
        notas: JSON.stringify({
            description: data.description,
            type: "saturday_support",
            raw_notes: data.notes
        }),
        estado: "Programado"
      };

      if (editingItem?.id) {
        return base44.entities.DailyMaintenancePlanning.update(editingItem.id, payload);
      }
      return base44.entities.DailyMaintenancePlanning.create(payload);
    },
    onSuccess: () => {
      toast.success("Asistencia de sábado guardada");
      setShowForm(false);
      setEditingItem(null);
      resetForm();
      queryClient.invalidateQueries(['saturdayPlannings']);
    },
    onError: () => toast.error("Error al guardar")
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DailyMaintenancePlanning.delete(id),
    onSuccess: () => {
      toast.success("Eliminado correctamente");
      queryClient.invalidateQueries(['saturdayPlannings']);
    }
  });

  // --- Helpers ---
  const resetForm = () => {
    setFormData({
        employee_id: "",
        activity_type: "Formación",
        description: "",
        start_time: "06:00",
        end_time: "14:00",
        notes: ""
    });
  };

  const handleEdit = (item) => {
    let notes = {};
    try { notes = JSON.parse(item.notas); } catch (e) { notes = { raw_notes: item.notas }; }

    setFormData({
        employee_id: item.employee_id,
        activity_type: item.funcion_asignada,
        description: notes.description || "",
        start_time: item.hora_inicio || "06:00",
        end_time: item.hora_fin || "14:00",
        notes: notes.raw_notes || ""
    });
    setEditingItem(item);
    setShowForm(true);
  };

  const getEmployeeName = (id) => {
      const emp = employees.find(e => String(e.id) === String(id));
      return emp ? (emp.nombre || emp.name || "Desconocido") : "Desconocido";
  };

  // --- Render ---
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
        <CardHeader>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <BookOpen className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <CardTitle className="text-indigo-900">Planificación de Sábados y Formación</CardTitle>
                        <p className="text-sm text-indigo-600/80">Gestión de asistencias especiales, horas extra y sesiones formativas.</p>
                    </div>
                </div>
                <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Asistencia
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="text-center py-8 text-slate-500">Cargando...</div>
            ) : saturdayPlannings.length === 0 ? (
                <div className="text-center py-12 bg-white/50 rounded-lg border border-dashed border-indigo-200">
                    <Calendar className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">No hay actividades programadas para este sábado.</p>
                    <p className="text-slate-400 text-sm">Añada técnicos para mantenimiento especial o formación.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {saturdayPlannings.map(item => {
                        let notes = {};
                        try { notes = JSON.parse(item.notas); } catch (e) { notes = { raw_notes: item.notas }; }
                        
                        return (
                            <Card key={item.id} className="bg-white hover:shadow-md transition-shadow border-l-4 border-l-indigo-500">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-bold text-slate-800 flex items-center gap-2">
                                            <Users className="w-4 h-4 text-slate-400" />
                                            {getEmployeeName(item.employee_id)}
                                        </div>
                                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                            {item.funcion_asignada}
                                        </Badge>
                                    </div>
                                    
                                    <div className="space-y-2 text-sm text-slate-600 mb-4">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            {item.hora_inicio} - {item.hora_fin}
                                        </div>
                                        {notes.description && (
                                            <div className="bg-slate-50 p-2 rounded text-xs border border-slate-100">
                                                {notes.description}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(item)}>
                                            <Edit className="w-3.5 h-3.5 text-slate-500" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-red-600" onClick={() => deleteMutation.mutate(item.id)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      {showForm && (
        <Card className="border-2 border-indigo-100 shadow-xl fixed inset-0 z-50 m-auto w-full max-w-lg h-fit max-h-[90vh] overflow-y-auto">
            <CardHeader className="bg-indigo-50/50 border-b border-indigo-100">
                <CardTitle>{editingItem ? "Editar Asistencia" : "Nueva Asistencia de Sábado"}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                    <Label>Empleado</Label>
                    <Select 
                        value={formData.employee_id} 
                        onValueChange={(val) => setFormData({...formData, employee_id: val})}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar técnico..." />
                        </SelectTrigger>
                        <SelectContent>
                            {employees.map(e => (
                                <SelectItem key={e.id} value={e.id}>{e.nombre || e.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Tipo de Actividad</Label>
                    <Select 
                        value={formData.activity_type} 
                        onValueChange={(val) => setFormData({...formData, activity_type: val})}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Formación">Formación</SelectItem>
                            <SelectItem value="Mantenimiento Preventivo">Mantenimiento Preventivo</SelectItem>
                            <SelectItem value="Avería Especial">Avería Especial</SelectItem>
                            <SelectItem value="Apoyo Producción">Apoyo Producción</SelectItem>
                            <SelectItem value="Limpieza Técnica">Limpieza Técnica</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Hora Inicio</Label>
                        <Input type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label>Hora Fin</Label>
                        <Input type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Descripción Detallada</Label>
                    <Textarea 
                        placeholder="Detalles de la formación o trabajos a realizar..."
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Notas Adicionales</Label>
                    <Input 
                        placeholder="Comentarios internos..."
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                    <Button onClick={() => saveMutation.mutate(formData)} className="bg-indigo-600 hover:bg-indigo-700">
                        <Save className="w-4 h-4 mr-2" />
                        Guardar
                    </Button>
                </div>
            </CardContent>
        </Card>
      )}
      {showForm && <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowForm(false)} />}
    </div>
  );
}