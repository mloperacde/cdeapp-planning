import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Factory, Clock, RefreshCw, GripVertical, Pencil, X, Cog } from "lucide-react";
import { cdeApi } from "@/services/cdeApi";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
const normalizeKey = (str) =>
  String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export function StructureConfig({ config, setConfig }) {
  const [newAreaName, setNewAreaName] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingMachines, setIsSyncingMachines] = useState(false);
  const [editingArea, setEditingArea] = useState(null); // { id, name }
  const [editingRoom, setEditingRoom] = useState(null); // { areaId, roomId, name }
  const [isAddingRoom, setIsAddingRoom] = useState(null); // areaId

  const handleSyncMachines = async () => {
    try {
      setIsSyncingMachines(true);
      toast.info("Importando máquinas desde catálogo maestro...");

      const masterList = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
      const machines = Array.isArray(masterList) ? masterList : [];

      if (!machines.length) {
        toast.info("No se encontraron máquinas en el catálogo maestro.");
        return;
      }

      const withAlias = machines.map(m => {
        const sala = (m.ubicacion || '').trim();
        const codigo = (m.codigo_maquina || m.codigo || '').trim();
        const nombreBase = (m.nombre_maquina || m.nombre || '').trim();
        const parts = [sala, codigo].filter(Boolean);
        const prefix = parts.join(" ");
        const alias = prefix ? `(${prefix} - ${nombreBase})` : nombreBase;

        return {
          id: m.id,
          codigo_maquina: codigo,
          nombre_maquina: m.nombre_maquina || m.nombre || '',
          nombre: alias,
          ubicacion: sala
        };
      });

      if (!withAlias.length) {
        toast.info("Catálogo maestro de máquinas vacío.");
        return;
      }

      const areas = config.areas || [];
      const roomIndex = new Map();

      areas.forEach(area => {
        (area.rooms || []).forEach(room => {
          const key = normalizeKey(room.name);
          if (!key) return;
          if (!roomIndex.has(key)) {
            roomIndex.set(key, {
              areaId: area.id,
              areaName: area.name,
              roomId: room.id,
              roomName: room.name,
            });
          }
        });
      });

      let autoAssigned = 0;
      let candidates = 0;

      for (const m of machines) {
        const salaRaw = m.ubicacion || "";
        if (!salaRaw || m.room_id) continue;
        const key = normalizeKey(salaRaw);
        if (!key) continue;
        const target = roomIndex.get(key);
        if (!target) continue;
        candidates++;
        await base44.entities.MachineMasterDatabase.update(m.id, {
          area_id: target.areaId,
          area_name: target.areaName,
          room_id: target.roomId,
          room_name: target.roomName,
        });
        autoAssigned++;
      }

      if (autoAssigned > 0) {
        toast.success(
          `Catálogo sincronizado: ${withAlias.length} máquinas, ${autoAssigned} asignadas automáticamente a salas.`
        );
      } else if (candidates === 0) {
        toast.info(
          `Catálogo sincronizado: ${withAlias.length} máquinas, sin coincidencias automáticas entre ubicaciones y salas.`
        );
      } else {
        toast.info(
          `Catálogo sincronizado: ${withAlias.length} máquinas, sin asignaciones automáticas aplicadas.`
        );
      }
    } catch (error) {
      console.error("Sync machines error:", error);
      toast.error(`Error al sincronizar máquinas: ${error.message}`);
    } finally {
      setIsSyncingMachines(false);
    }
  };

  const handleSyncRooms = async () => {
    try {
      setIsSyncing(true);
      toast.info("Conectando con cdeapp.es...");
      
      const response = await cdeApi.getRooms();
      
      if (!response.success || !Array.isArray(response.data)) {
        throw new Error("Respuesta inválida de la API");
      }

      const apiRooms = response.data;
      
      setConfig(prev => {
        let areas = [...(prev.areas || [])];
        const allExistingRooms = new Map(); // id -> areaId

        // Map existing rooms to preserve their location
        areas.forEach(area => {
            area.rooms?.forEach(room => {
                allExistingRooms.set(String(room.id), area.id);
            });
        });

        // Find or create default area for new rooms
        let defaultAreaId = areas.find(a => a.name === "Sin Asignar" || a.name === "Planta Principal")?.id;
        
        if (!defaultAreaId) {
             if (areas.length > 0) {
                 defaultAreaId = areas[0].id; // Fallback to first area
             } else {
                 defaultAreaId = generateId();
                 areas.push({
                     id: defaultAreaId,
                     name: "Planta Principal",
                     rooms: []
                 });
             }
        }

        let newCount = 0;
        let updateCount = 0;

        apiRooms.forEach(apiRoom => {
            const roomId = String(apiRoom.external_id);
            const roomName = apiRoom.nombre;
            const existingAreaId = allExistingRooms.get(roomId);

            if (existingAreaId) {
                // Update existing room in its CURRENT area
                const areaIndex = areas.findIndex(a => a.id === existingAreaId);
                if (areaIndex >= 0) {
                    const roomIndex = areas[areaIndex].rooms.findIndex(r => String(r.id) === roomId);
                    if (roomIndex >= 0) {
                         // Update name if changed, preserve other props if any
                         if (areas[areaIndex].rooms[roomIndex].name !== roomName) {
                            areas[areaIndex].rooms[roomIndex] = { ...areas[areaIndex].rooms[roomIndex], name: roomName };
                            updateCount++;
                         }
                    }
                }
            } else {
                // Add new room to default area
                const areaIndex = areas.findIndex(a => a.id === defaultAreaId);
                if (areaIndex >= 0) {
                    areas[areaIndex].rooms.push({ id: roomId, name: roomName });
                    newCount++;
                }
            }
        });

        if (newCount > 0 || updateCount > 0) {
            toast.success(`Sincronización completada: ${newCount} nuevas, ${updateCount} actualizadas.`);
        } else {
            toast.success("Sincronización completada: Todo está actualizado.");
        }
        
        return { ...prev, areas };
      });

    } catch (error) {
      console.error("Sync error:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const addArea = () => {
    if (!newAreaName.trim()) return;
    setConfig(prev => ({
      ...prev,
      areas: [...prev.areas, { id: generateId(), name: newAreaName, rooms: [] }]
    }));
    setNewAreaName("");
  };

  const deleteArea = (id) => {
    setConfig(prev => ({
      ...prev,
      areas: prev.areas.filter(a => a.id !== id)
    }));
  };

  const updateAreaName = () => {
    if (!editingArea || !editingArea.name.trim()) return;
    setConfig(prev => ({
      ...prev,
      areas: prev.areas.map(a => a.id === editingArea.id ? { ...a, name: editingArea.name } : a)
    }));
    setEditingArea(null);
  };

  const addRoom = (areaId, name) => {
    if (!name.trim()) return;
    setConfig(prev => ({
      ...prev,
      areas: prev.areas.map(area => {
        if (area.id === areaId) {
          return {
            ...area,
            rooms: [...(area.rooms || []), { id: generateId(), name: name }]
          };
        }
        return area;
      })
    }));
    setIsAddingRoom(null);
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

  const onDragEnd = (result) => {
    const { source, destination } = result;

    // Dropped outside the list
    if (!destination) {
      return;
    }

    // Dropped in the same place
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    setConfig(prev => {
        const newAreas = [...prev.areas];
        const sourceAreaIndex = newAreas.findIndex(a => a.id === source.droppableId);
        const destAreaIndex = newAreas.findIndex(a => a.id === destination.droppableId);

        if (sourceAreaIndex === -1 || destAreaIndex === -1) return prev;

        const sourceArea = { ...newAreas[sourceAreaIndex] };
        const destArea = { ...newAreas[destAreaIndex] };
        
        // Remove from source
        const [movedRoom] = sourceArea.rooms.splice(source.index, 1);

        // Add to destination
        if (source.droppableId === destination.droppableId) {
            // Same list reorder
            sourceArea.rooms.splice(destination.index, 0, movedRoom);
            newAreas[sourceAreaIndex] = sourceArea;
        } else {
            // Move between lists
            destArea.rooms.splice(destination.index, 0, movedRoom);
            newAreas[sourceAreaIndex] = sourceArea;
            newAreas[destAreaIndex] = destArea;
        }

        return { ...prev, areas: newAreas };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Distribución de Salas</h2>
            <p className="text-sm text-slate-500">Arrastra las salas para organizarlas en áreas.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <div className="flex gap-2 flex-1 md:flex-none">
                <Input 
                placeholder="Nueva Área..." 
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                className="w-full md:w-64"
                />
                <Button onClick={addArea} disabled={!newAreaName.trim()}>
                    <Plus className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Crear Área</span>
                </Button>
            </div>
            <Button
                onClick={handleSyncRooms}
                disabled={isSyncing}
                variant="outline"
                className="border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 whitespace-nowrap"
            >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                Sincronizar Salas
            </Button>
            <Button
                onClick={handleSyncMachines}
                disabled={isSyncingMachines}
                variant="outline"
                className="border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 whitespace-nowrap"
            >
                <Cog className={`w-4 h-4 mr-2 ${isSyncingMachines ? 'animate-spin' : ''}`} />
                Sincronizar Máquinas
            </Button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
            {config.areas.map(area => (
                <Card key={area.id} className="bg-slate-50/50 dark:bg-slate-900/50">
                    <CardHeader className="p-4 pb-2 space-y-0">
                        <div className="flex items-center justify-between">
                            {editingArea?.id === area.id ? (
                                <div className="flex gap-2 w-full">
                                    <Input 
                                        value={editingArea.name} 
                                        onChange={(e) => setEditingArea({...editingArea, name: e.target.value})}
                                        className="h-8 text-sm"
                                        autoFocus
                                    />
                                    <Button size="icon" className="h-8 w-8" onClick={updateAreaName}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Factory className="w-4 h-4 text-slate-500" />
                                        {area.name}
                                        <span className="text-xs font-normal text-slate-400">({area.rooms?.length || 0})</span>
                                    </CardTitle>
                                    <div className="flex gap-1">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 text-slate-400 hover:text-blue-600"
                                            onClick={() => setEditingArea({ id: area.id, name: area.name })}
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 text-slate-400 hover:text-red-600"
                                            onClick={() => deleteArea(area.id)}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <Droppable droppableId={area.id}>
                            {(provided, snapshot) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={`space-y-2 min-h-[100px] p-2 rounded-lg transition-colors ${
                                        snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200' : 'bg-slate-100/50 dark:bg-slate-800/50'
                                    }`}
                                >
                                    {area.rooms?.map((room, index) => (
                                        <Draggable key={room.id} draggableId={room.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={`
                                                        group flex items-center gap-2 p-2 rounded border bg-white dark:bg-slate-800 shadow-sm
                                                        ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 rotate-2' : 'hover:border-blue-300'}
                                                    `}
                                                    style={provided.draggableProps.style}
                                                >
                                                    <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing" />
                                                    <span className="text-sm font-medium flex-1 truncate">{room.name}</span>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-6 w-6 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => deleteRoom(area.id, room.id)}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                    
                                    {isAddingRoom === area.id ? (
                                        <div className="flex gap-2 mt-2">
                                            <Input 
                                                id={`new-room-${area.id}`}
                                                placeholder="Nombre..." 
                                                className="h-8 text-sm bg-white"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') addRoom(area.id, e.currentTarget.value);
                                                    if (e.key === 'Escape') setIsAddingRoom(null);
                                                }}
                                            />
                                            <Button 
                                                size="icon" 
                                                className="h-8 w-8" 
                                                onClick={() => addRoom(area.id, document.getElementById(`new-room-${area.id}`).value)}
                                            >
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="w-full text-xs text-slate-400 hover:text-slate-600 border border-dashed border-slate-300 hover:border-slate-400 mt-2"
                                            onClick={() => setIsAddingRoom(area.id)}
                                        >
                                            <Plus className="w-3 h-3 mr-1" /> Añadir Sala
                                        </Button>
                                    )}
                                </div>
                            )}
                        </Droppable>
                    </CardContent>
                </Card>
            ))}
        </div>
      </DragDropContext>
      {config.areas.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed rounded-xl bg-slate-50">
              <Factory className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No hay áreas configuradas</h3>
              <p className="text-slate-500 mb-4">Crea un área o sincroniza para empezar.</p>
              <Button onClick={handleSyncRooms} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" /> Sincronizar con cdeapp.es
              </Button>
          </div>
      )}
    </div>
  );
}

export function AssignmentsConfig({ config, setConfig, employees = [], teams = [] }) {
  // Predefined shift leaders as per request, but allowing dynamic later if needed
  const computeLeaderDefs = () => {
    const areas = (config?.areas || []).slice(0, 2);
    const validTeams = (teams || [])
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .slice(0, 2);

    const defs = [];
    validTeams.forEach((team, tIdx) => {
      const shift = tIdx === 0 ? 'shift1' : 'shift2';
      areas.forEach((area) => {
        const leaderName = `Responsable (${team.name}) Area (${area.name})`;
        defs.push({ shift, leaderName });
      });
    });
    return defs;
  };

  const leaderDefs = computeLeaderDefs();

  const getLeaderSlots = (leaderMap) => {
    const slots = [];
    const sortedDefs = leaderDefs.slice().sort((a, b) => {
      if (a.shift === b.shift) return a.leaderName.localeCompare(b.leaderName);
      return a.shift.localeCompare(b.shift);
    });
    for (const def of sortedDefs) {
      slots.push(leaderMap?.[def.leaderName] || '');
    }
    // Ensure four slots (siempre 4 jefes de turno)
    while (slots.length < 4) slots.push('');
    return slots.slice(0, 4);
  };

  const syncDepartmentLeaders = async () => {
    try {
      const deptList = await base44.entities.Department.list();
      const produccion = deptList.find(
        (d) => (d.name || '').toUpperCase() === 'PRODUCCIÓN' || (d.name || '').toUpperCase() === 'PRODUCCION'
      );
      if (!produccion) return;
      const leaderMap = config?.assignments?.shift1?.leaderMap || {};
      const leaderMap2 = config?.assignments?.shift2?.leaderMap || {};
      const merged = { ...leaderMap, ...leaderMap2 };
      const [slot1, slot2, slot3, slot4] = getLeaderSlots(merged);
      const payload = {
        manager_id: slot1 || null,
        manager_id_2: slot2 || null,
        manager_id_3: slot3 || null,
        manager_id_4: slot4 || null,
      };
      await base44.entities.Department.update(produccion.id, payload);
    } catch (e) {
      // Silently ignore sync errors but notify user
      toast.error('No se pudo sincronizar los jefes de turno con el departamento PRODUCCIÓN');
    }
  };

  const updateAssignment = (shift, leaderName, areaId, checked) => {
    setConfig(prev => {
      const shiftConfig = prev.assignments[shift] || { leaders: [], areas: {}, leaderMap: {} };
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

  const updateLeaderMap = (shift, leaderName, employeeId) => {
    setConfig(prev => {
        const shiftConfig = prev.assignments[shift] || { leaders: [], areas: {}, leaderMap: {} };
        return {
            ...prev,
            assignments: {
                ...prev.assignments,
                [shift]: {
                    ...shiftConfig,
                    leaderMap: {
                        ...(shiftConfig.leaderMap || {}),
                        [leaderName]: employeeId
                    }
                }
            }
        };
    });
    // Best-effort sync with Department PRODUCCIÓN
    syncDepartmentLeaders();
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Turno 1 - Responsables</CardTitle>
          <CardDescription>Distribución de áreas para el primer turno</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {leaderDefs
              .filter(d => d.shift === 'shift1')
              .map(d => (
                <LeaderAssignment
                  key={`${d.shift}-${d.leaderName}`}
                  leaderName={d.leaderName}
                  shift={d.shift}
                  config={config}
                  onToggle={updateAssignment}
                  onEmployeeSelect={updateLeaderMap}
                  employees={employees}
                />
              ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Turno 2 - Responsables</CardTitle>
          <CardDescription>Distribución de áreas para el segundo turno</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {leaderDefs
              .filter(d => d.shift === 'shift2')
              .map(d => (
                <LeaderAssignment
                  key={`${d.shift}-${d.leaderName}`}
                  leaderName={d.leaderName}
                  shift={d.shift}
                  config={config}
                  onToggle={updateAssignment}
                  onEmployeeSelect={updateLeaderMap}
                  employees={employees}
                />
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LeaderAssignment({ leaderName, shift, config, onToggle, onEmployeeSelect, employees }) {
  const assignedAreas = config.assignments[shift]?.areas?.[leaderName] || [];
  const assignedEmployeeId = config.assignments[shift]?.leaderMap?.[leaderName] || "";

  return (
    <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
            {leaderName.charAt(0)}
            </div>
            <h3 className="font-bold text-lg">{leaderName}</h3>
        </div>
        
        {employees && employees.length > 0 && (
            <div className="w-full">
                <Select 
                    value={assignedEmployeeId} 
                    onValueChange={(val) => onEmployeeSelect(shift, leaderName, val)}
                >
                    <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Asignar empleado..." />
                    </SelectTrigger>
                    <SelectContent>
                        {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>
                                {emp.nombre} {emp.apellidos}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )}
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

export function TasksConfig({ config, setConfig }) {
  const [newTask, setNewTask] = useState({ time: "", description: "", role: "Todos", subdepartment: "" });

  const addTask = () => {
    if (!newTask.time || !newTask.description) return;
    setConfig(prev => ({
      ...prev,
      tasks: [...prev.tasks, { id: generateId(), ...newTask }].sort((a, b) => a.time.localeCompare(b.time))
    }));
    setNewTask({ time: "", description: "", role: "Todos", subdepartment: "" });
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
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end bg-slate-50 p-4 rounded-lg border">
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
              placeholder="Descripción de la tarea" 
              value={newTask.description} 
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={newTask.role} onValueChange={(val) => setNewTask({ ...newTask, role: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                <SelectItem value="Jefe Turno">Jefe Turno</SelectItem>
                <SelectItem value="Responsable Área">Responsable Área</SelectItem>
                <SelectItem value="Calidad">Calidad</SelectItem>
                <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Área/Sala</Label>
            <Select value={newTask.subdepartment} onValueChange={(val) => setNewTask({ ...newTask, subdepartment: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Todas..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todas las áreas</SelectItem>
                {config.areas?.map(area => (
                  <SelectItem key={area.id} value={area.name}>{area.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <TableHead className="w-[80px]">Hora</TableHead>
              <TableHead>Tarea</TableHead>
              <TableHead className="w-[120px]">Rol</TableHead>
              <TableHead className="w-[120px]">Área/Sala</TableHead>
              <TableHead className="w-[80px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {config.tasks.map(task => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    {task.time}
                  </div>
                </TableCell>
                <TableCell>{task.description}</TableCell>
                <TableCell>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {task.role || 'Todos'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-600">
                    {task.subdepartment || 'Todas'}
                  </span>
                </TableCell>
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
