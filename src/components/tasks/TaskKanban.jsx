import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Clock } from "lucide-react";
import { format, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function TaskKanban({ tasks, employees, onEdit }) {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, newStatus }) => base44.entities.Task.update(taskId, { estado: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Estado actualizado");
    }
  });

  const columns = [
    { id: "Pendiente", title: "Pendientes", color: "amber" },
    { id: "En Progreso", title: "En Progreso", color: "blue" },
    { id: "Completada", title: "Completadas", color: "green" }
  ];

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map(column => {
        const columnTasks = tasks.filter(t => t.estado === column.id);
        
        return (
          <Card key={column.id} className={`border-t-4 border-${column.color}-500`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="text-base">{column.title}</span>
                <Badge className={`bg-${column.color}-100 text-${column.color}-800`}>
                  {columnTasks.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
              {columnTasks.map(task => {
                const isOverdue = task.fecha_limite && isPast(new Date(task.fecha_limite)) && task.estado !== "Completada";
                
                return (
                  <Card key={task.id} className={`${isOverdue ? 'border-2 border-red-400' : ''}`}>
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm">{task.titulo}</h4>
                          <Button size="sm" variant="ghost" onClick={() => onEdit(task)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        {task.descripcion && (
                          <p className="text-xs text-slate-600 line-clamp-2">{task.descripcion}</p>
                        )}

                        <div className="flex flex-wrap gap-1">
                          <Badge className={getPriorityColor(task.prioridad)} size="xs">
                            {task.prioridad}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {task.tipo}
                          </Badge>
                        </div>

                        {task.asignado_a && (
                          <p className="text-xs text-slate-500">
                            👤 {getEmployeeName(task.asignado_a)}
                          </p>
                        )}

                        {task.fecha_limite && (
                          <p className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                            <Clock className="w-3 h-3 inline mr-1" />
                            {format(new Date(task.fecha_limite), "d MMM", { locale: es })}
                          </p>
                        )}

                        {column.id !== "Completada" && (
                          <div className="flex gap-1 pt-2 border-t">
                            {column.id === "Pendiente" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs"
                                onClick={() => updateStatusMutation.mutate({ taskId: task.id, newStatus: "En Progreso" })}
                              >
                                Iniciar
                              </Button>
                            )}
                            {column.id === "En Progreso" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs text-green-600"
                                onClick={() => updateStatusMutation.mutate({ taskId: task.id, newStatus: "Completada" })}
                              >
                                Completar
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}