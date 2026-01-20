import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, Factory, Users, ClipboardList, Clock } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import Breadcrumbs from "@/components/common/Breadcrumbs";

export default function ManufacturingConfig() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("structure");

  // Fetch AppConfig for manufacturing
  const { data: configRecord, isLoading } = useQuery({
    queryKey: ["appConfig", "manufacturing"],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ config_key: "manufacturing_config" });
      return configs[0] || null;
    },
    staleTime: 0,
  });

  const [config, setConfig] = useState({
    areas: [], // { id, name, rooms: [] }
    assignments: {
      shift1: { leaders: [], areas: {} }, // leaders: [{id, name}], areas: { leaderId: [areaId] }
      shift2: { leaders: [], areas: {} }
    },
    tasks: [] // { id, time, description, role }
  });

  useEffect(() => {
    if (configRecord?.value) {
      try {
        const parsed = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Error parsing manufacturing config", e);
      }
    }
  }, [configRecord]);

  const saveMutation = useMutation({
    mutationFn: async (newConfig) => {
      const payload = {
        config_key: "manufacturing_config",
        value: JSON.stringify(newConfig),
        description: "Configuración de Fabricación: Áreas, Salas y Asignaciones"
      };

      if (configRecord?.id) {
        return await base44.entities.AppConfig.update(configRecord.id, payload);
      } else {
        return await base44.entities.AppConfig.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["appConfig", "manufacturing"]);
      toast.success("Configuración guardada correctamente");
    },
    onError: () => {
      toast.error("Error al guardar la configuración");
    }
  });

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
       <Breadcrumbs 
        items={[
          { label: "Fabricación", url: "/ManufacturingConfig" },
          { label: "Configuración" }
        ]} 
      />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <Factory className="w-8 h-8 text-blue-600" />
            Configuración de Fabricación
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Gestión de Áreas, Salas, Asignaciones de Jefes de Turno y Tareas de Supervisión.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="structure" className="flex items-center gap-2">
            <Factory className="w-4 h-4" />
            Estructura (Áreas/Salas)
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Asignaciones Jefes
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Escaleta de Tareas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structure">
          <StructureConfig config={config} setConfig={setConfig} />
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentsConfig config={config} setConfig={setConfig} />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksConfig config={config} setConfig={setConfig} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StructureConfig({ config, setConfig }) {
  const [newArea, setNewArea] = useState("");
  const [newRoom, setNewRoom] = useState({ areaId: "", name: "" });

  const addArea = () => {
    if (!newArea.trim()) return;
    setConfig(prev => ({
      ...prev,
      areas: [...prev.areas, { id: uuidv4(), name: newArea, rooms: [] }]
    }));
    setNewArea("");
  };

  const deleteArea = (id) => {
    setConfig(prev => ({
      ...prev,
      areas: prev.areas.filter(a => a.id !== id)
    }));
  };

  const addRoom = (areaId) => {
    if (!newRoom.name.trim()) return;
    setConfig(prev => ({
      ...prev,
      areas: prev.areas.map(area => {
        if (area.id === areaId) {
          return {
            ...area,
            rooms: [...(area.rooms || []), { id: uuidv4(), name: newRoom.name }]
          };
        }
        return area;
      })
    }));
    setNewRoom({ areaId: "", name: "" });
  };

  const deleteRoom = (areaId, roomId) => {
    setConfig(prev => ({
      ...prev,
      areas: prev.areas.map(area => {
        if (area.id === areaId) {
          return {
            ...area,
            rooms: area.rooms.filter(r => r.id !== roomId)
          };
        }
        return area;
      })
    }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Áreas de Fabricación</CardTitle>
          <CardDescription>Define las áreas principales de la fábrica</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input 
              placeholder="Nombre del Área (ej. Envasado Cosmética)" 
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
            />
            <Button onClick={addArea} variant="outline"><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-2">
            {config.areas.map(area => (
              <div key={area.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                <span className="font-medium">{area.name}</span>
                <Button variant="ghost" size="sm" onClick={() => deleteArea(area.id)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {config.areas.length === 0 && <p className="text-sm text-slate-500 italic">No hay áreas definidas</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salas por Área</CardTitle>
          <CardDescription>Asigna salas a las áreas creadas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {config.areas.map(area => (
            <div key={area.id} className="space-y-2">
              <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Factory className="w-3 h-3" /> {area.name}
              </h3>
              <div className="flex gap-2 mb-2">
                <Input 
                  placeholder={`Nueva sala en ${area.name}`}
                  value={newRoom.areaId === area.id ? newRoom.name : ""}
                  onChange={(e) => setNewRoom({ areaId: area.id, name: e.target.value })}
                  className="h-8 text-sm"
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => addRoom(area.id)}
                  disabled={newRoom.areaId !== area.id || !newRoom.name.trim()}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div className="pl-4 space-y-1">
                {area.rooms?.map(room => (
                  <div key={room.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-dashed">
                    <span>{room.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => deleteRoom(area.id, room.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {(!area.rooms || area.rooms.length === 0) && (
                  <p className="text-xs text-slate-400 italic">Sin salas asignadas</p>
                )}
              </div>
            </div>
          ))}
          {config.areas.length === 0 && <p className="text-sm text-slate-500">Crea áreas primero para añadir salas.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function AssignmentsConfig({ config, setConfig }) {
  // Predefined shift leaders as per request, but allowing dynamic later if needed
  // "Isa y Carlos Turno 1, Sara e Ivan turno 2"
  
  const updateAssignment = (shift, leaderName, areaId, checked) => {
    setConfig(prev => {
      const shiftConfig = prev.assignments[shift] || { leaders: [], areas: {} };
      const currentAreas = shiftConfig.areas?.[leaderName] || [];
      
      let newAreas;
      if (checked) {
        newAreas = [...currentAreas, areaId];
      } else {
        newAreas = currentAreas.filter(id => id !== areaId);
      }

      return {
        ...prev,
        assignments: {
          ...prev.assignments,
          [shift]: {
            ...shiftConfig,
            areas: {
              ...shiftConfig.areas,
              [leaderName]: newAreas
            }
          }
        }
      };
    });
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Turno 1 - Isa y Carlos</CardTitle>
          <CardDescription>Distribución de áreas para el primer turno</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <LeaderAssignment 
              leaderName="Isa" 
              shift="shift1" 
              config={config} 
              onToggle={updateAssignment} 
            />
            <LeaderAssignment 
              leaderName="Carlos" 
              shift="shift1" 
              config={config} 
              onToggle={updateAssignment} 
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Turno 2 - Sara e Ivan</CardTitle>
          <CardDescription>Distribución de áreas para el segundo turno</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <LeaderAssignment 
              leaderName="Sara" 
              shift="shift2" 
              config={config} 
              onToggle={updateAssignment} 
            />
            <LeaderAssignment 
              leaderName="Ivan" 
              shift="shift2" 
              config={config} 
              onToggle={updateAssignment} 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LeaderAssignment({ leaderName, shift, config, onToggle }) {
  const assignedAreas = config.assignments[shift]?.areas?.[leaderName] || [];

  return (
    <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
          {leaderName.charAt(0)}
        </div>
        <h3 className="font-bold text-lg">{leaderName}</h3>
      </div>
      
      <div className="space-y-2">
        <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Áreas Asignadas</Label>
        {config.areas.map(area => {
          const isAssigned = assignedAreas.includes(area.id);
          return (
            <div key={area.id} className="flex items-start space-x-2">
              <input 
                type="checkbox" 
                id={`${shift}-${leaderName}-${area.id}`}
                checked={isAssigned}
                onChange={(e) => onToggle(shift, leaderName, area.id, e.target.checked)}
                className="mt-1"
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor={`${shift}-${leaderName}-${area.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {area.name}
                </label>
                {area.rooms && area.rooms.length > 0 && (
                  <p className="text-xs text-slate-500">
                    Incluye: {area.rooms.map(r => r.name).join(", ")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {config.areas.length === 0 && <p className="text-sm text-slate-400">No hay áreas configuradas</p>}
      </div>
    </div>
  );
}

function TasksConfig({ config, setConfig }) {
  const [newTask, setNewTask] = useState({ time: "", description: "", role: "Todos" });

  const addTask = () => {
    if (!newTask.time || !newTask.description) return;
    setConfig(prev => ({
      ...prev,
      tasks: [...prev.tasks, { id: uuidv4(), ...newTask }].sort((a, b) => a.time.localeCompare(b.time))
    }));
    setNewTask({ time: "", description: "", role: "Todos" });
  };

  const deleteTask = (id) => {
    setConfig(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== id)
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escaleta de Supervisión</CardTitle>
        <CardDescription>Define las tareas y horarios para los Jefes de Equipo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50 p-4 rounded-lg border">
          <div className="space-y-2">
            <Label>Hora</Label>
            <Input 
              type="time" 
              value={newTask.time} 
              onChange={(e) => setNewTask({ ...newTask, time: e.target.value })} 
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Tarea / Descripción</Label>
            <Input 
              placeholder="Descripción de la tarea de supervisión" 
              value={newTask.description} 
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <Button onClick={addTask} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Añadir
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Hora</TableHead>
              <TableHead>Tarea</TableHead>
              <TableHead className="w-[100px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {config.tasks.map(task => (
              <TableRow key={task.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  {task.time}
                </TableCell>
                <TableCell>{task.description}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteTask(task.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {config.tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-slate-500 py-8">
                  No hay tareas definidas en la escaleta.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
