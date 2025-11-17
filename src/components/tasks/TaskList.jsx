import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, CheckCircle2, Clock } from "lucide-react";
import { format, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function TaskList({ tasks, employees, onEdit }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Tarea eliminada");
    }
  });

  const completeMutation = useMutation({
    mutationFn: (task) => base44.entities.Task.update(task.id, {
      estado: "Completada",
      fecha_completada: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Tarea completada");
    }
  });

  const getEmployeeName = (id) => {
    const emp = employees.find(e => e.id === id);
    return emp?.nombre || "Sin asignar";
  };

  const getPriorityColor = (prioridad) => {
    switch (prioridad) {
      case "Urgente": return "bg-red-600 text-white";
      case "Alta": return "bg-orange-600 text-white";
      case "Media": return "bg-blue-600 text-white";
      default: return "bg-slate-400 text-white";
    }
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case "Completada": return "bg-green-100 text-green-800";
      case "En Progreso": return "bg-blue-100 text-blue-800";
      case "Cancelada": return "bg-slate-100 text-slate-600";
      default: return "bg-amber-100 text-amber-800";
    }
  };

  const handleDelete = (task) => {
    if (window.confirm(`¿Eliminar tarea "${task.titulo}"?`)) {
      deleteMutation.mutate(task.id);
    }
  };

  return (
    <div className="space-y-3">
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-500">No hay tareas registradas</p>
          </CardContent>
        </Card>
      ) : (
        tasks.map(task => {
          const isOverdue = task.fecha_limite && isPast(new Date(task.fecha_limite)) && task.estado !== "Completada";
          
          return (
            <Card key={task.id} className={`${isOverdue ? 'border-2 border-red-400' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">{task.titulo}</h3>
                      <Badge className={getPriorityColor(task.prioridad)}>
                        {task.prioridad}
                      </Badge>
                      <Badge className={getStatusColor(task.estado)}>
                        {task.estado}
                      </Badge>
                      {isOverdue && (
                        <Badge className="bg-red-600 text-white">Vencida</Badge>
                      )}
                    </div>
                    {task.descripcion && (
                      <p className="text-sm text-slate-600 mb-2">{task.descripcion}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {task.asignado_a && (
                        <span>👤 {getEmployeeName(task.asignado_a)}</span>
                      )}
                      {task.fecha_limite && (
                        <span className={isOverdue ? "text-red-600 font-semibold" : ""}>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {format(new Date(task.fecha_limite), "d MMM yyyy", { locale: es })}
                        </span>
                      )}
                      <Badge variant="outline" className="text-xs">{task.tipo}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.estado !== "Completada" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => completeMutation.mutate(task)}
                        className="text-green-600 hover:bg-green-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => onEdit(task)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(task)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}