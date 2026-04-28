import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Wrench, GripVertical, Pencil, X, Users, RefreshCw, Cog } from "lucide-react";
import { MaintenanceAssignmentsExportButton } from "@/components/maintenance/MaintenanceAssignmentsPDF";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { cdeApi } from "@/services/cdeApi";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const normalizeKey = (str) =>
  String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

// ─────────────────────────────────────────────
// Pestaña: Áreas/Salas (igual a fabricación)
// ─────────────────────────────────────────────
export function MaintenanceStructureConfig({ config, setConfig }) {
  const [newAreaName, setNewAreaName] = useState("");
  const [editingArea, setEditingArea] = useState(null);
  const [isAddingRoom, setIsAddingRoom] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingMachines, setIsSyncingMachines] = useState(false);

  const handleSyncRooms = async () => {
    try {
      setIsSyncing(true);
      toast.info("Conectando con cdeapp.es...");
      const response = await cdeApi.getRooms();
      if (!response.success || !Array.isArray(response.data)) throw new Error("Respuesta inválida de la API");

      const apiRooms = response.data;
      setConfig(prev => {
        let areas = [...(prev.areas || [])];
        const allExistingRooms = new Map();
        areas.forEach(area => area.rooms?.forEach(room => allExistingRooms.set(String(room.id), area.id)));

        let defaultAreaId = areas.find(a => a.name === "Sin Asignar" || a.name === "Planta Principal")?.id;
        if (!defaultAreaId) {
          if (areas.length > 0) {
            defaultAreaId = areas[0].id;
          } else {
            defaultAreaId = generateId();
            areas.push({ id: defaultAreaId, name: "Planta Principal", rooms: [] });
          }
        }

        let newCount = 0, updateCount = 0;
        apiRooms.forEach(apiRoom => {
          const roomId = String(apiRoom.external_id);
          const roomName = apiRoom.nombre;
          const existingAreaId = allExistingRooms.get(roomId);
          if (existingAreaId) {
            const areaIdx = areas.findIndex(a => a.id === existingAreaId);
            if (areaIdx >= 0) {
              const roomIdx = areas[areaIdx].rooms.findIndex(r => String(r.id) === roomId);
              if (roomIdx >= 0 && areas[areaIdx].rooms[roomIdx].name !== roomName) {
                areas[areaIdx].rooms[roomIdx] = { ...areas[areaIdx].rooms[roomIdx], name: roomName };
                updateCount++;
              }
            }
          } else {
            const areaIdx = areas.findIndex(a => a.id === defaultAreaId);
            if (areaIdx >= 0) { areas[areaIdx].rooms.push({ id: roomId, name: roomName }); newCount++; }
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
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncMachines = async () => {
    try {
      setIsSyncingMachines(true);
      toast.info("Importando máquinas desde catálogo maestro...");
      const machines = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
      if (!machines?.length) { toast.info("No se encontraron máquinas en el catálogo maestro."); return; }

      const areas = config.areas || [];
      const roomIndex = new Map();
      areas.forEach(area => {
        (area.rooms || []).forEach(room => {
          const key = normalizeKey(room.name);
          if (key && !roomIndex.has(key)) {
            roomIndex.set(key, { areaId: area.id, areaName: area.name, roomId: room.id, roomName: room.name });
          }
        });
      });

      // Actualizar machine_assignments en el config (no en MachineMasterDatabase)
      const roomEntries = Array.from(roomIndex.entries());
      const newAssignments = { ...(config.machine_assignments || {}) };
      let autoAssigned = 0;

      for (const m of machines) {
        const salaRaw = m.ubicacion || "";
        if (!salaRaw || newAssignments[m.id]?.room_id) continue;
        const key = normalizeKey(salaRaw);
        if (!key) continue;

        let target = roomIndex.get(key);
        if (!target) {
          for (const [roomKey, info] of roomEntries) {
            if (!roomKey) continue;
            if (roomKey.length >= 3 && key.includes(roomKey)) { target = info; break; }
            if (key.length >= 3 && roomKey.includes(key)) { target = info; break; }
          }
        }
        if (!target) continue;

        newAssignments[m.id] = {
          area_id: target.areaId, area_name: target.areaName,
          room_id: target.roomId, room_name: target.roomName
        };
        autoAssigned++;
      }

      setConfig(prev => ({ ...prev, machine_assignments: newAssignments }));
      toast.success(`Catálogo sincronizado: ${machines.length} máquinas, ${autoAssigned} asignadas automáticamente.`);
    } catch (error) {
      toast.error(`Error al sincronizar máquinas: ${error.message}`);
    } finally {
      setIsSyncingMachines(false);
    }
  };

  const addArea = () => {
    if (!newAreaName.trim()) return;
    setConfig(prev => ({
      ...prev,
      areas: [...(prev.areas || []), { id: generateId(), name: newAreaName, rooms: [] }]
    }));
    setNewAreaName("");
  };

  const deleteArea = (id) => {
    setConfig(prev => ({ ...prev, areas: prev.areas.filter(a => a.id !== id) }));
  };

  const updateAreaName = () => {
    if (!editingArea?.name.trim()) return;
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
      areas: prev.areas.map(area =>
        area.id === areaId
          ? { ...area, rooms: [...(area.rooms || []), { id: generateId(), name }] }
          : area
      )
    }));
    setIsAddingRoom(null);
  };

  const deleteRoom = (areaId, roomId) => {
    setConfig(prev => ({
      ...prev,
      areas: prev.areas.map(area =>
        area.id === areaId
          ? { ...area, rooms: area.rooms.filter(r => r.id !== roomId) }
          : area
      )
    }));
  };

  const onDragEnd = (result) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (type === "AREAS") {
      setConfig(prev => {
        const areas = [...(prev.areas || [])];
        const [moved] = areas.splice(source.index, 1);
        areas.splice(destination.index, 0, moved);
        return { ...prev, areas };
      });
      return;
    }

    setConfig(prev => {
      const newAreas = [...prev.areas];
      const srcIdx = newAreas.findIndex(a => a.id === source.droppableId);
      const dstIdx = newAreas.findIndex(a => a.id === destination.droppableId);
      if (srcIdx === -1 || dstIdx === -1) return prev;

      const srcArea = { ...newAreas[srcIdx] };
      const dstArea = { ...newAreas[dstIdx] };
      const srcRooms = [...(srcArea.rooms || [])];
      const dstRooms = srcIdx === dstIdx ? srcRooms : [...(dstArea.rooms || [])];

      const [moved] = srcRooms.splice(source.index, 1);
      if (!moved) return prev;

      if (srcIdx === dstIdx) {
        dstRooms.splice(destination.index, 0, moved);
        newAreas[srcIdx] = { ...srcArea, rooms: dstRooms };
      } else {
        dstRooms.splice(destination.index, 0, moved);
        newAreas[srcIdx] = { ...srcArea, rooms: srcRooms };
        newAreas[dstIdx] = { ...dstArea, rooms: dstRooms };
      }
      return { ...prev, areas: newAreas };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Zonas de Mantenimiento</h2>
          <p className="text-sm text-slate-500">Define las áreas y salas que cubre el equipo de mantenimiento.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Nueva Área..."
            value={newAreaName}
            onChange={e => setNewAreaName(e.target.value)}
            className="w-48"
            onKeyDown={e => { if (e.key === 'Enter') addArea(); }}
          />
          <Button onClick={addArea} disabled={!newAreaName.trim()}>
            <Plus className="w-4 h-4 mr-2" /> Crear Área
          </Button>
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
        <Droppable droppableId="maint-areas" direction="horizontal" type="AREAS">
          {(providedAreas) => (
            <div
              ref={providedAreas.innerRef}
              {...providedAreas.droppableProps}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start"
            >
              {(config.areas || []).map((area, areaIndex) => (
                <Draggable key={area.id} draggableId={String(area.id)} index={areaIndex}>
                  {(pArea) => (
                    <div ref={pArea.innerRef} {...pArea.draggableProps} className="h-full">
                      <Card className="bg-slate-50/50 dark:bg-slate-900/50 h-full">
                        <CardHeader className="p-4 pb-2 space-y-0">
                          <div className="flex items-center justify-between">
                            {editingArea?.id === area.id ? (
                              <div className="flex gap-2 w-full">
                                <Input
                                  value={editingArea.name}
                                  onChange={e => setEditingArea({ ...editingArea, name: e.target.value })}
                                  className="h-8 text-sm"
                                  autoFocus
                                  onKeyDown={e => { if (e.key === 'Enter') updateAreaName(); }}
                                />
                                <Button size="icon" className="h-8 w-8" onClick={updateAreaName}>
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                  <span {...pArea.dragHandleProps}>
                                    <GripVertical className="w-3 h-3 text-slate-300 hover:text-slate-500 cursor-grab" />
                                  </span>
                                  <Wrench className="w-4 h-4 text-orange-500" />
                                  {area.name}
                                  <span className="text-xs font-normal text-slate-400">({area.rooms?.length || 0})</span>
                                </CardTitle>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600"
                                    onClick={() => setEditingArea({ id: area.id, name: area.name })}>
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-600"
                                    onClick={() => deleteArea(area.id)}>
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
                                  snapshot.isDraggingOver ? 'bg-orange-50 dark:bg-orange-900/20 ring-2 ring-orange-200' : 'bg-slate-100/50 dark:bg-slate-800/50'
                                }`}
                              >
                                {area.rooms?.map((room, idx) => (
                                  <Draggable key={room.id} draggableId={String(room.id)} index={idx}>
                                    {(pRoom, snapRoom) => (
                                      <div
                                        ref={pRoom.innerRef}
                                        {...pRoom.draggableProps}
                                        {...pRoom.dragHandleProps}
                                        className={`group flex items-center gap-2 p-2 rounded border bg-white dark:bg-slate-800 shadow-sm
                                          ${snapRoom.isDragging ? 'shadow-lg ring-2 ring-orange-400 rotate-2' : 'hover:border-orange-300'}`}
                                        style={pRoom.draggableProps.style}
                                      >
                                        <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-500 cursor-grab" />
                                        <span className="text-sm font-medium flex-1 truncate">{room.name}</span>
                                        <Button
                                          variant="ghost" size="icon"
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
                                      id={`maint-room-${area.id}`}
                                      placeholder="Nombre sala..."
                                      className="h-8 text-sm bg-white"
                                      autoFocus
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') addRoom(area.id, e.currentTarget.value);
                                        if (e.key === 'Escape') setIsAddingRoom(null);
                                      }}
                                    />
                                    <Button size="icon" className="h-8 w-8"
                                      onClick={() => addRoom(area.id, document.getElementById(`maint-room-${area.id}`)?.value || '')}>
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="ghost" size="sm"
                                    className="w-full text-xs text-slate-400 hover:text-slate-600 border border-dashed border-slate-300 mt-2"
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
                    </div>
                  )}
                </Draggable>
              ))}
              {providedAreas.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {(config.areas || []).length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-xl bg-slate-50">
          <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No hay zonas configuradas</h3>
          <p className="text-slate-500 mb-4">Crea un área o sincroniza las salas para empezar.</p>
          <Button onClick={handleSyncRooms} variant="outline" disabled={isSyncing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Sincronizar con cdeapp.es
          </Button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Pestaña: Asignaciones por equipos
// ─────────────────────────────────────────────
const SHIFTS = [
  { key: "turno1", label: "Turno 1" },
  { key: "turno2", label: "Turno 2" },
];

const ROLES = [
  { key: "jefe_turno", label: "Jefe de Turno" },
  { key: "tecnico_principal", label: "Técnico Principal" },
  { key: "apoyo_1", label: "Técnico de Apoyo 1" },
  { key: "apoyo_2", label: "Técnico de Apoyo 2" },
];

export function MaintenanceAssignmentsConfig({ config, setConfig, employees = [] }) {
  const areas = config.areas || [];

  // Empleados de mantenimiento + empleados de producción con puesto "Técnico de Proceso"
  const empList = employees.filter(e => {
    const dept = (e.departamento || "").toUpperCase();
    // Normalizar: eliminar tildes para comparación robusta
    const puesto = (e.puesto || "")
      .toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const isMantenimiento = dept.includes("MANTEN");
    const isTecnicoProceso = puesto.includes("TECNICO DE PROCESO") || puesto.includes("TECNICO PROCESO");
    return isMantenimiento || isTecnicoProceso;
  });

  const getAssignment = (shift, areaId, slot) => {
    return config.assignments?.[shift]?.[areaId]?.[slot] || "";
  };

  const setAssignment = (shift, areaId, slot, employeeId) => {
    setConfig(prev => ({
      ...prev,
      assignments: {
        ...(prev.assignments || {}),
        [shift]: {
          ...(prev.assignments?.[shift] || {}),
          [areaId]: {
            ...(prev.assignments?.[shift]?.[areaId] || {}),
            [slot]: employeeId
          }
        }
      }
    }));
  };

  const getEmployeeName = (id) => {
    const emp = empList.find(e => e.id === id);
    return emp ? emp.nombre : "";
  };

  return (
    <div className="space-y-8">
      {areas.length > 0 && (
        <div className="flex justify-end">
          <MaintenanceAssignmentsExportButton config={config} employees={empList} />
        </div>
      )}
      {areas.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-xl bg-slate-50">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No hay zonas configuradas</h3>
          <p className="text-slate-500">Primero configura las áreas en la pestaña "Áreas/Salas".</p>
        </div>
      )}

      {SHIFTS.map(shift => (
        <Card key={shift.key}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-500" />
              {shift.label}
            </CardTitle>
            <CardDescription>Asigna el personal de mantenimiento a cada zona para este equipo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {areas.map(area => (
                <div key={area.id} className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <Wrench className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{area.name}</h4>
                      {area.rooms?.length > 0 && (
                        <p className="text-xs text-slate-400">{area.rooms.map(r => r.name).join(", ")}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {ROLES.map(role => (
                      <div key={role.key} className="space-y-1">
                        <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">{role.label}</Label>
                        <Select
                          value={getAssignment(shift.key, area.id, role.key)}
                          onValueChange={val => setAssignment(shift.key, area.id, role.key, val)}
                        >
                          <SelectTrigger className="bg-white h-9">
                            <SelectValue placeholder="Sin asignar..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>Sin asignar</SelectItem>
                            {empList.map(emp => (
                              <SelectItem key={emp.id} value={emp.id}>{emp.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>

                  {/* Resumen de asignaciones */}
                  <div className="pt-1 flex flex-wrap gap-1">
                    {ROLES.map(role => {
                      const empId = getAssignment(shift.key, area.id, role.key);
                      if (!empId) return null;
                      const prefix = { jefe_turno: "JT", tecnico_principal: "TP", apoyo_1: "A1", apoyo_2: "A2" }[role.key];
                      return (
                        <Badge key={role.key} variant="outline" className="text-xs bg-orange-50 border-orange-200 text-orange-700">
                          {prefix}: {getEmployeeName(empId)}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}