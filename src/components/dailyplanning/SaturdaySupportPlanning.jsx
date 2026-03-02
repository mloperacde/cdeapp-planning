import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Save, Trash2, Edit, Plus, Users, Clock, BookOpen, FileText, CheckCircle2, ChevronLeft, ChevronRight, Paperclip, Link as LinkIcon, ExternalLink } from "lucide-react";
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
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isSaturday } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function SaturdaySupportPlanning({ selectedTeam, teams = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    employee_id: "",
    activity_type: "Formación",
    description: "",
    start_time: "06:00",
    end_time: "14:00",
    doc_link: "",
    doc_name: "",
    notes: ""
  });

  // --- Queries ---
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre', 2000),
    staleTime: 60 * 60 * 1000
  });

  const { data: monthPlannings = [], isLoading } = useQuery({
    queryKey: ['saturdayPlannings', format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
       // Fetch larger range or filter locally. 
       // Ideally we fetch by month range. For now we fetch all and filter client side or by month string if backend supports.
       // Assuming 'fecha' field is YYYY-MM-DD. We can filter by "startswith YYYY-MM"
       const yearMonth = format(currentMonth, 'yyyy-MM');
       // This filter depends on backend capabilities. If strict equality, we might need to fetch all or loop days.
       // Let's assume we fetch all for now (less than 2000 records usually) or optimize later.
       const all = await base44.entities.DailyMaintenancePlanning.list(undefined, 2000); 
       return all.filter(p => (p.turno === "Sábado Extra" || p.notes?.includes("saturday_support")) && p.fecha.startsWith(yearMonth));
    }
  });

  // --- Derived Data ---
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    // Start from monday of the first week
    const calendarStart = startOfWeek(start, { weekStartsOn: 1 }); // Import startOfWeek needed? Yes.
    // We need to import startOfWeek from date-fns
    const days = eachDayOfInterval({ start: start, end: end });
    
    // Fill previous days to start on Monday
    const startDay = start.getDay(); // 0 is Sunday
    const paddingDays = startDay === 0 ? 6 : startDay - 1;
    const prefix = Array.from({ length: paddingDays }).map((_, i) => ({
        date: subMonths(start, 0), // Placeholder
        isPadding: true
    }));

    return days;
  }, [currentMonth]);

  const planningsByDate = useMemo(() => {
    const map = new Map();
    monthPlannings.forEach(p => {
        if (!map.has(p.fecha)) map.set(p.fecha, []);
        map.get(p.fecha).push(p);
    });
    return map;
  }, [monthPlannings]);

  // --- Mutations ---
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        fecha: format(selectedDate, 'yyyy-MM-dd'),
        team_key: selectedTeam || "General",
        turno: "Sábado Extra",
        employee_id: data.employee_id,
        funcion_asignada: data.activity_type,
        area_responsabilidad: "Planta General",
        prioridad: "Alta",
        hora_inicio: data.start_time,
        hora_fin: data.end_time,
        estado: "Programado",
        notas: JSON.stringify({
            description: data.description,
            type: "saturday_support",
            doc_link: data.doc_link,
            doc_name: data.doc_name,
            completed: false,
            raw_notes: data.notes
        })
      };

      if (editingItem?.id) {
        return base44.entities.DailyMaintenancePlanning.update(editingItem.id, payload);
      }
      return base44.entities.DailyMaintenancePlanning.create(payload);
    },
    onSuccess: () => {
      toast.success("Asistencia guardada");
      setShowForm(false);
      resetForm();
      queryClient.invalidateQueries(['saturdayPlannings']);
    },
    onError: () => toast.error("Error al guardar")
  });

  const toggleCompleteMutation = useMutation({
      mutationFn: async (item) => {
        let notes = {};
        try { notes = JSON.parse(item.notas); } catch (e) { notes = { raw_notes: item.notas }; }
        
        const newStatus = !notes.completed;
        const newPayload = {
            ...item,
            estado: newStatus ? "Completado" : "Programado",
            notas: JSON.stringify({ ...notes, completed: newStatus })
        };
        return base44.entities.DailyMaintenancePlanning.update(item.id, newPayload);
      },
      onSuccess: () => {
          queryClient.invalidateQueries(['saturdayPlannings']);
          toast.success("Estado actualizado");
      }
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
        doc_link: "",
        doc_name: "",
        notes: ""
    });
  };

  const handleDayClick = (day) => {
      if (!isSaturday(day)) {
          // Optional: Allow non-saturdays? User asked for "Saturday Planning" but maybe special events occur other days.
          // For now restrict to Saturdays to keep it clean, or warn.
          // Let's allow clicking any day but highlight Saturdays.
      }
      setSelectedDate(day);
      setShowDetailModal(true);
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
        doc_link: notes.doc_link || "",
        doc_name: notes.doc_name || "",
        notes: notes.raw_notes || ""
    });
    setEditingItem(item);
    setShowForm(true);
  };

  const getEmployeeName = (id) => {
      const emp = employees.find(e => String(e.id) === String(id));
      return emp ? (emp.nombre || emp.name || "Desconocido") : "Desconocido";
  };

  const startOfWeekDate = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
  const endOfWeekDate = endOfMonth(currentMonth); // Approximate for grid

  // Generate full grid
  const daysInMonth = eachDayOfInterval({
      start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
      end: endOfMonth(currentMonth) // We might need to extend to end of week
  });
  
  // Extend to full weeks
  const lastDay = daysInMonth[daysInMonth.length - 1];
  if (lastDay.getDay() !== 0) {
      const extraDays = eachDayOfInterval({
          start: new Date(lastDay.getTime() + 86400000),
          end: new Date(lastDay.getTime() + (7 - lastDay.getDay()) * 86400000) // Rough fix
      });
      // Actually simpler logic:
  }
  
  // Robust grid generation
  const calendarGrid = useMemo(() => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
      const endDate = new Date(monthEnd);
      // Extend end date to sunday
      const day = endDate.getDay();
      if (day !== 0) endDate.setDate(endDate.getDate() + (7 - day));

      return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);


  // --- Render ---
  return (
    <div className="space-y-6 h-full flex flex-col">
      <Card className="flex-1 flex flex-col bg-gradient-to-br from-slate-50 to-indigo-50/30 border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <h2 className="text-lg font-bold w-40 text-center capitalize">
                            {format(currentMonth, 'MMMM yyyy', { locale: es })}
                        </h2>
                        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 hidden md:flex">
                        <BookOpen className="w-3 h-3 mr-1" /> Planificación Mensual
                    </Badge>
                </div>
                <Button onClick={() => { setSelectedDate(new Date()); setShowDetailModal(true); }} variant="secondary" className="bg-indigo-600 text-white hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Actividad
                </Button>
            </div>
        </CardHeader>
        <CardContent className="flex-1 p-4 min-h-0 overflow-y-auto">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden border border-slate-200">
                {/* Headers */}
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, i) => (
                    <div key={d} className={cn(
                        "bg-slate-50 p-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider",
                        i >= 5 && "text-indigo-600 bg-indigo-50/50"
                    )}>
                        {d}
                    </div>
                ))}

                {/* Days */}
                {calendarGrid.map((day, idx) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const items = planningsByDate.get(dateStr) || [];
                    const isSat = isSaturday(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div 
                            key={dateStr}
                            onClick={() => handleDayClick(day)}
                            className={cn(
                                "min-h-[100px] bg-white p-2 transition-colors hover:bg-slate-50 cursor-pointer flex flex-col gap-1 relative group",
                                !isCurrentMonth && "bg-slate-50/50 text-slate-400",
                                isSat && "bg-indigo-50/30 hover:bg-indigo-50/60"
                            )}
                        >
                            <div className="flex justify-between items-start">
                                <span className={cn(
                                    "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                                    isToday ? "bg-indigo-600 text-white" : "text-slate-700",
                                    isSat && !isToday && "text-indigo-700"
                                )}>
                                    {format(day, 'd')}
                                </span>
                                {items.length > 0 && (
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-slate-100 text-slate-600">
                                        {items.length}
                                    </Badge>
                                )}
                            </div>
                            
                            {/* Items Preview */}
                            <div className="flex-1 flex flex-col gap-1 mt-1 overflow-hidden">
                                {items.slice(0, 3).map(item => {
                                    let notes = {};
                                    try { notes = JSON.parse(item.notas); } catch (_) {}
                                    const isDone = notes.completed;
                                    
                                    return (
                                        <div key={item.id} className={cn(
                                            "text-[10px] px-1.5 py-0.5 rounded border truncate flex items-center gap-1",
                                            item.funcion_asignada === "Formación" ? "bg-blue-50 border-blue-100 text-blue-700" :
                                            item.funcion_asignada === "Mantenimiento Preventivo" ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                                            "bg-slate-50 border-slate-100 text-slate-600",
                                            isDone && "opacity-60 line-through decoration-slate-400"
                                        )}>
                                            {isDone && <CheckCircle2 className="w-2.5 h-2.5 flex-shrink-0" />}
                                            {getEmployeeName(item.employee_id).split(' ')[0]}
                                        </div>
                                    )
                                })}
                                {items.length > 3 && (
                                    <span className="text-[9px] text-slate-400 pl-1">+{items.length - 3} más...</span>
                                )}
                            </div>
                            
                            {isSat && isCurrentMonth && items.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                    <Plus className="w-6 h-6 text-indigo-200" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                      <CalendarIcon className="w-5 h-5 text-indigo-600" />
                      {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                  </DialogTitle>
                  <div className="text-sm text-slate-500">
                      Gestión de actividades y asistencia
                  </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto py-4 space-y-6">
                  {/* Action Bar */}
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <h3 className="font-semibold text-slate-700">Registros del día</h3>
                      <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                          <Plus className="w-4 h-4 mr-2" />
                          Añadir Registro
                      </Button>
                  </div>

                  {/* List */}
                  <div className="space-y-3">
                      {(selectedDate && planningsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []).length === 0 ? (
                          <div className="text-center py-10 text-slate-400 italic border-2 border-dashed border-slate-100 rounded-lg">
                              No hay registros para este día.
                          </div>
                      ) : (
                          (planningsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []).map(item => {
                              let notes = {};
                              try { notes = JSON.parse(item.notas); } catch (_) { notes = { raw_notes: item.notas }; }
                              const isDone = notes.completed;

                              return (
                                  <div key={item.id} className={cn(
                                      "group flex flex-col md:flex-row gap-4 p-4 rounded-lg border transition-all hover:shadow-md",
                                      isDone ? "bg-slate-50 border-slate-200" : "bg-white border-indigo-100"
                                  )}>
                                      {/* Left: Status & Time */}
                                      <div className="flex md:flex-col items-center md:items-start gap-3 md:w-32 flex-shrink-0">
                                          <Badge variant={isDone ? "secondary" : "default"} className={cn(
                                              "cursor-pointer select-none",
                                              isDone ? "bg-slate-200 text-slate-600 hover:bg-slate-300" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                          )} onClick={() => toggleCompleteMutation.mutate(item)}>
                                              {isDone ? "Completado" : "Pendiente"}
                                          </Badge>
                                          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                                              <Clock className="w-3.5 h-3.5" />
                                              {item.hora_inicio} - {item.hora_fin}
                                          </div>
                                      </div>

                                      {/* Middle: Content */}
                                      <div className="flex-1 space-y-2">
                                          <div className="flex items-center gap-2">
                                              <h4 className={cn("font-bold text-slate-800", isDone && "line-through text-slate-500")}>
                                                  {getEmployeeName(item.employee_id)}
                                              </h4>
                                              <Badge variant="outline" className="text-[10px]">
                                                  {item.funcion_asignada}
                                              </Badge>
                                          </div>
                                          {notes.description && (
                                              <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                                  {notes.description}
                                              </p>
                                          )}
                                          
                                          {/* Documents & Links */}
                                          {(notes.doc_link || notes.doc_name) && (
                                              <div className="flex items-center gap-2 mt-2">
                                                  <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100">
                                                      <Paperclip className="w-3 h-3" />
                                                      <span className="font-medium">Documentación:</span>
                                                      {notes.doc_link ? (
                                                          <a href={notes.doc_link} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                                              {notes.doc_name || "Ver documento"}
                                                              <ExternalLink className="w-3 h-3" />
                                                          </a>
                                                      ) : (
                                                          <span>{notes.doc_name}</span>
                                                      )}
                                                  </div>
                                              </div>
                                          )}
                                      </div>

                                      {/* Right: Actions */}
                                      <div className="flex md:flex-col justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                                              <Edit className="w-4 h-4 text-slate-500" />
                                          </Button>
                                          <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(item.id)} className="hover:text-red-600 hover:bg-red-50">
                                              <Trash2 className="w-4 h-4" />
                                          </Button>
                                      </div>
                                  </div>
                              );
                          })
                      )}
                  </div>
              </div>

              {/* Internal Form (Nested) */}
              {showForm && (
                  <div className="absolute inset-0 bg-white z-10 flex flex-col p-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
                      <div className="flex items-center justify-between mb-6 border-b pb-4">
                          <h3 className="text-lg font-bold text-slate-800">
                              {editingItem ? "Editar Actividad" : "Nueva Actividad"}
                          </h3>
                          <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                              <Trash2 className="w-5 h-5 rotate-45 text-slate-400" /> {/* Close icon workaround */}
                          </Button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <Label>Empleado</Label>
                                  <Select value={formData.employee_id} onValueChange={(v) => setFormData({...formData, employee_id: v})}>
                                      <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                      <SelectContent>
                                          {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre || e.name}</SelectItem>)}
                                      </SelectContent>
                                  </Select>
                              </div>
                              <div className="space-y-2">
                                  <Label>Tipo</Label>
                                  <Select value={formData.activity_type} onValueChange={(v) => setFormData({...formData, activity_type: v})}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="Formación">Formación</SelectItem>
                                          <SelectItem value="Mantenimiento Preventivo">Mantenimiento Preventivo</SelectItem>
                                          <SelectItem value="Avería Especial">Avería Especial</SelectItem>
                                          <SelectItem value="Apoyo Producción">Apoyo Producción</SelectItem>
                                      </SelectContent>
                                  </Select>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <Label>Inicio</Label>
                                  <Input type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                              </div>
                              <div className="space-y-2">
                                  <Label>Fin</Label>
                                  <Input type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                              </div>
                          </div>

                          <div className="space-y-2">
                              <Label>Descripción</Label>
                              <Textarea 
                                  placeholder="Detalles de la tarea..."
                                  value={formData.description}
                                  onChange={e => setFormData({...formData, description: e.target.value})} 
                              />
                          </div>

                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
                              <h4 className="font-medium text-sm text-slate-700 flex items-center gap-2">
                                  <Paperclip className="w-4 h-4" /> Documentación y Seguimiento
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <Label className="text-xs">Nombre Documento / Formulario</Label>
                                      <Input 
                                          placeholder="Ej: Manual Seguridad v2.pdf" 
                                          value={formData.doc_name}
                                          onChange={e => setFormData({...formData, doc_name: e.target.value})}
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <Label className="text-xs">Enlace (URL)</Label>
                                      <div className="relative">
                                          <LinkIcon className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                                          <Input 
                                              className="pl-8"
                                              placeholder="https://..." 
                                              value={formData.doc_link}
                                              onChange={e => setFormData({...formData, doc_link: e.target.value})}
                                          />
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="pt-4 flex justify-end gap-2 border-t mt-4">
                          <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                          <Button onClick={() => saveMutation.mutate(formData)} className="bg-indigo-600 hover:bg-indigo-700">Guardar</Button>
                      </div>
                  </div>
              )}
          </DialogContent>
      </Dialog>
    </div>
  );
}