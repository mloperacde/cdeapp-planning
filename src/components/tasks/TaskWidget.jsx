import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Clock, AlertCircle } from "lucide-react";
import { format, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TaskWidget() {
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 10),
    initialData: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const pendingTasks = tasks.filter(t => t.estado === "Pendiente" || t.estado === "En Progreso");
  const urgentTasks = pendingTasks.filter(t => t.prioridad === "Urgente");
  const overdueTasks = pendingTasks.filter(t => t.fecha_limite && isPast(new Date(t.fecha_limite)));

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
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-blue-600" />
          Tareas Pendientes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-900">{pendingTasks.length}</div>
            <div className="text-xs text-amber-700">Pendientes</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-900">{urgentTasks.length}</div>
            <div className="text-xs text-red-700">Urgentes</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-900">{overdueTasks.length}</div>
            <div className="text-xs text-orange-700">Vencidas</div>
          </div>
        </div>

        {pendingTasks.length === 0 ? (
          <p className="text-center text-slate-500 py-4">No hay tareas pendientes</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pendingTasks.slice(0, 5).map(task => {
              const isOverdue = task.fecha_limite && isPast(new Date(task.fecha_limite));
              
              return (
                <div key={task.id} className={`p-3 rounded-lg border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm truncate">{task.titulo}</p>
                        <Badge className={getPriorityColor(task.prioridad)} size="xs">
                          {task.prioridad}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        {task.asignado_a && <span>👤 {getEmployeeName(task.asignado_a)}</span>}
                        {task.fecha_limite && (
                          <span className={isOverdue ? "text-red-600 font-semibold" : ""}>
                            <Clock className="w-3 h-3 inline" /> {format(new Date(task.fecha_limite), "d MMM", { locale: es })}
                          </span>
                        )}
                      </div>
                    </div>
                    {isOverdue && <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Link to={createPageUrl("TaskManagement")}>
          <Button className="w-full mt-4" variant="outline">
            Ver Todas las Tareas
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}