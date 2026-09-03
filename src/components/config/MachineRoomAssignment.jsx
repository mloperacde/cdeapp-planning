import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Settings, Cog, MapPin, Search, CheckCircle2, AlertCircle, Zap
} from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

/**
 * Asignación de máquinas a salas de Fabricación.
 * Guarda las asignaciones dentro de config.machine_assignments (como Mantenimiento)
 * para que persistan con el botón "Guardar Cambios".
 */
export default function MachineRoomAssignment({ config, setConfig }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterArea, setFilterArea] = useState("all");
  const [filterAssigned, setFilterAssigned] = useState("all");
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: machines = [], isLoading } = useQuery({
    queryKey: ['machines_room_assignment'],
    queryFn: () => base44.entities.MachineMasterDatabase.list('orden_visualizacion'),
  });

  // machine_assignments: { [machineId]: { area_id, area_name, room_id, room_name } }
  const assignments = config.machine_assignments || {};

  const filteredMachines = useMemo(() => {
    return machines.filter(machine => {
      const asgn = assignments[machine.id] || {};
      const matchesSearch =
        machine.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.codigo_maquina?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesArea = filterArea === "all" || asgn.area_name === filterArea;
      const matchesAssigned =
        filterAssigned === "all" ||
        (filterAssigned === "assigned" && asgn.room_id) ||
        (filterAssigned === "unassigned" && !asgn.room_id);
      return matchesSearch && matchesArea && matchesAssigned;
    });
  }, [machines, searchTerm, filterArea, filterAssigned, assignments]);

  const handleAssign = (machine) => {
    const asgn = assignments[machine.id] || {};
    setSelectedMachine({
      ...machine,
      tempAreaId: asgn.area_id || '',
      tempRoomId: asgn.room_id || '',
      currentAreaName: asgn.area_name || '',
      currentRoomName: asgn.room_name || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedMachine) return;
    const selectedArea = config.areas?.find(a => a.id === selectedMachine.tempAreaId);
    const selectedRoom = selectedArea?.rooms?.find(r => r.id === selectedMachine.tempRoomId);

    const newAssignments = {
      ...assignments,
      [selectedMachine.id]: {
        area_id: selectedMachine.tempAreaId || null,
        area_name: selectedArea?.name || null,
        room_id: selectedMachine.tempRoomId || null,
        room_name: selectedRoom?.name || null,
      }
    };
    setConfig(prev => ({ ...prev, machine_assignments: newAssignments }));
    setIsDialogOpen(false);
    setSelectedMachine(null);
    toast.success("Asignación actualizada. Recuerda pulsar \"Guardar Cambios\" para persistir.");
  };

  // Auto-asignación: si un área tiene una sola sala, asigna todas las máquinas sin sala a esa sala
  const handleAutoAssign = () => {
    const areasWithOneRoom = (config.areas || []).filter(a => a.rooms?.length === 1);
    if (areasWithOneRoom.length === 0) {
      toast.info("No hay áreas con una única sala para auto-asignar.");
      return;
    }

    const newAssignments = { ...assignments };
    let count = 0;
    areasWithOneRoom.forEach(area => {
      const room = area.rooms[0];
      machines.forEach(machine => {
        const asgn = newAssignments[machine.id] || {};
        if (!asgn.room_id) {
          newAssignments[machine.id] = {
            area_id: area.id,
            area_name: area.name,
            room_id: room.id,
            room_name: room.name,
          };
          count++;
        }
      });
    });

    setConfig(prev => ({ ...prev, machine_assignments: newAssignments }));
    if (count > 0) {
      toast.success(`${count} máquinas auto-asignadas a salas únicas. Recuerda guardar.`);
    } else {
      toast.info("Todas las máquinas ya tienen sala asignada.");
    }
  };

  const assignedCount = machines.filter(m => assignments[m.id]?.room_id).length;
  const unassignedCount = machines.length - assignedCount;

  if (isLoading) return <div className="p-6 text-center">Cargando máquinas...</div>;

  return (
    <div className="space-y-6 p-2">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Asignación de Máquinas a Salas
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Asigna cada máquina a un área y sala específica
          </p>
        </div>
        {config.areas?.length > 0 && (
          <Button onClick={handleAutoAssign} variant="outline" size="sm" className="text-xs">
            <Zap className="w-4 h-4 mr-1" />
            Auto-asignar salas únicas
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-500">Total Máquinas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{machines.length}</div></CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-500">Asignadas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" />{assignedCount}</div></CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-500">Sin Asignar</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-600 flex items-center gap-2"><AlertCircle className="w-5 h-5" />{unassignedCount}</div></CardContent>
        </Card>
      </div>

      {config.areas?.length === 0 || !config.areas ? (
        <div className="p-6 text-center text-slate-400 border-2 border-dashed rounded-lg">
          <Cog className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Primero configura las Áreas/Salas en la pestaña correspondiente</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Buscar por nombre o código..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={filterArea} onValueChange={setFilterArea}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar por área" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las áreas</SelectItem>
                {config.areas?.map(area => <SelectItem key={area.id} value={area.name}>{area.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterAssigned} onValueChange={setFilterAssigned}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado asignación" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="assigned">Asignadas</SelectItem>
                <SelectItem value="unassigned">Sin asignar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="border rounded-lg bg-white overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-3 bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-1">Código</div>
                  <div className="col-span-3">Nombre</div>
                  <div className="col-span-2">Área</div>
                  <div className="col-span-2">Sala</div>
                  <div className="col-span-2">Tipo</div>
                  <div className="col-span-2 text-right">Acciones</div>
                </div>
                <ScrollArea className="h-[450px]">
                  {filteredMachines.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {filteredMachines.map(machine => {
                        const asgn = assignments[machine.id] || {};
                        return (
                          <div key={machine.id} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-slate-50 transition-colors">
                            <div className="col-span-1 text-xs font-mono text-slate-500">{machine.codigo_maquina}</div>
                            <div className="col-span-3 font-medium text-slate-900">{machine.nombre}</div>
                            <div className="col-span-2">
                              {asgn.area_name ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{asgn.area_name}</Badge>
                              ) : <span className="text-xs text-slate-400">-</span>}
                            </div>
                            <div className="col-span-2">
                              {asgn.room_name ? <span className="text-sm text-slate-700">{asgn.room_name}</span> : <span className="text-xs text-slate-400">-</span>}
                            </div>
                            <div className="col-span-2">
                              <Badge variant="secondary" className="text-xs">{machine.tipo || 'N/A'}</Badge>
                            </div>
                            <div className="col-span-2 flex justify-end">
                              <Button size="sm" variant="outline" onClick={() => handleAssign(machine)} className="h-7 text-xs">
                                <Settings className="w-3 h-3 mr-1" />
                                {asgn.room_id ? 'Cambiar' : 'Asignar'}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                      <Cog className="w-12 h-12 mb-3 opacity-20" />
                      <p>No se encontraron máquinas con los filtros aplicados</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Máquina a Sala</DialogTitle>
            <DialogDescription>
              Configura la ubicación de <strong>{selectedMachine?.nombre}</strong>
            </DialogDescription>
          </DialogHeader>
          {selectedMachine && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-slate-50 rounded-lg border">
                <p className="text-xs text-slate-500 mb-2">Ubicación actual:</p>
                <div className="flex gap-2 text-sm">
                  {selectedMachine.currentAreaName ? (
                    <>
                      <Badge className="bg-blue-600">{selectedMachine.currentAreaName}</Badge>
                      {selectedMachine.currentRoomName && (
                        <><span className="text-slate-400">→</span><Badge variant="outline">{selectedMachine.currentRoomName}</Badge></>
                      )}
                    </>
                  ) : <span className="text-slate-400 italic">Sin asignar</span>}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Área</label>
                <Select value={selectedMachine.tempAreaId} onValueChange={val => setSelectedMachine({ ...selectedMachine, tempAreaId: val, tempRoomId: '' })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar área..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>-- Sin área --</SelectItem>
                    {config.areas?.map(area => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {selectedMachine.tempAreaId && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sala</label>
                  <Select value={selectedMachine.tempRoomId} onValueChange={val => setSelectedMachine({ ...selectedMachine, tempRoomId: val })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar sala..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>-- Sin sala específica --</SelectItem>
                      {config.areas?.find(a => a.id === selectedMachine.tempAreaId)?.rooms?.map(room => (
                        <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Settings className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}