import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckSquare, Plus, Search, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TaskForm from "../components/tasks/TaskForm";
import TaskList from "../components/tasks/TaskList";
import TaskKanban from "../components/tasks/TaskKanban";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TaskManagementPage() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
    initialData: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => 
      task.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tasks, searchTerm]);

  const taskStats = useMemo(() => {
    return {
      total: tasks.length,
      pendientes: tasks.filter(t => t.estado === "Pendiente").length,
      enProgreso: tasks.filter(t => t.estado === "En Progreso").length,
      completadas: tasks.filter(t => t.estado === "Completada").length,
      urgentes: tasks.filter(t => t.prioridad === "Urgente" && t.estado !== "Completada").length
    };
  }, [tasks]);

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingTask(null);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <CheckSquare className="w-8 h-8 text-blue-600" />
              Gestión de Tareas
            </h1>
            <p className="text-slate-600 mt-1">
              Crea, asigna y gestiona tareas del equipo
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Tarea
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-xs text-blue-700 font-medium">Total</p>
                <p className="text-3xl font-bold text-blue-900">{taskStats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-xs text-amber-700 font-medium">Pendientes</p>
                <p className="text-3xl font-bold text-amber-900">{taskStats.pendientes}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-xs text-purple-700 font-medium">En Progreso</p>
                <p className="text-3xl font-bold text-purple-900">{taskStats.enProgreso}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-xs text-green-700 font-medium">Completadas</p>
                <p className="text-3xl font-bold text-green-900">{taskStats.completadas}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-xs text-red-700 font-medium">Urgentes</p>
                <p className="text-3xl font-bold text-red-900">{taskStats.urgentes}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar tareas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="list">
          <TabsList className="mb-6">
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <TaskList 
              tasks={filteredTasks} 
              employees={employees}
              onEdit={handleEdit}
            />
          </TabsContent>

          <TabsContent value="kanban">
            <TaskKanban 
              tasks={filteredTasks} 
              employees={employees}
              onEdit={handleEdit}
            />
          </TabsContent>
        </Tabs>

        {showForm && (
          <TaskForm
            task={editingTask}
            employees={employees}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
}