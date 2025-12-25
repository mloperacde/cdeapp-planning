import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, GripVertical, Check, Edit } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from "sonner";

export default function MachineProcessesTab({ machine }) {
  const [showConfig, setShowConfig] = useState(false);
  const [machineAssignments, setMachineAssignments] = useState({});
  const [editingOperators, setEditingOperators] = useState(null);
  const queryClient = useQueryClient();

  const { data: processes = [] } = useQuery({
  queryKey: ['processes'],
  queryFn: () => base44.entities.Process.filter({ activo: true }),
});

const { data: machineProcesses = [] } = useQuery({
  queryKey: ['machineProcesses', machine.id],
  queryFn: () => base44.entities.MachineProcess.filter({ 
    machine_id: machine.id,
    activo: true 
  }),
  enabled: !!machine.id,
});

  const getMachineProcesses = () => {
  return machineProcesses.map(mp => {
    const process = processes.find(p => p.id === mp.process_id);
    if (!process || !process.activo) return null;
    
    return {
      ...mp,
      processName: process.nombre,
      processCode: process.codigo,
      processActive: process.activo
    };
  }).filter(Boolean).sort((a, b) => (a.orden || 0) - (b.orden || 0));
};

      if (newAssignments.length > 0) {
        await base44.entities.MachineProcess.bulkCreate(newAssignments);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machineProcesses'] });
      setShowConfig(false);
      setMachineAssignments({});
      toast.success("Configuración guardada correctamente");
    },
  });

  const getMachineProcesses = () => {
    const machineProcs = machineProcesses.filter(mp => mp.machine_id === machine.id && mp.activo);
    return machineProcs.map(mp => {
      const process = processes.find(p => p.id === mp.process_id);
      return {
        ...mp,
        processName: process?.nombre,
        processCode: process?.codigo,
        processActive: process?.activo
      };
    }).filter(mp => mp.processName).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const machineProcs = getMachineProcesses();
    const items = Array.from(machineProcs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updates = items.map((item, index) => 
      base44.entities.MachineProcess.update(item.id, { orden: index })
    );

    try {
      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ['machineProcesses'] });
      toast.success("Orden actualizado");
    } catch (error) {
      toast.error("Error al actualizar orden");
    }
  };

  const updateOperatorsMutation = useMutation({
    mutationFn: ({ machineProcessId, operadores }) => {
      return base44.entities.MachineProcess.update(machineProcessId, {
        operadores_requeridos: operadores
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machineProcesses'] });
      setEditingOperators(null);
      toast.success("Operadores actualizados");
    },
  });

  const handleOpenConfig = () => {
    const existing = machineProcesses.filter(mp => mp.machine_id === machine.id);
    const assignments = {};
    
    processes.forEach(process => {
      const assignment = existing.find(mp => mp.process_id === process.id);
      assignments[process.id] = {
        checked: !!assignment,
        operadores: assignment?.operadores_requeridos || process.operadores_requeridos || 1
      };
    });
    
    setMachineAssignments(assignments);
    setShowConfig(true);
  };

  const handleToggleProcess = (processId) => {
    const process = processes.find(p => p.id === processId);
    setMachineAssignments({
      ...machineAssignments,
      [processId]: {
        checked: !machineAssignments[processId]?.checked,
        operadores: machineAssignments[processId]?.operadores || 
                   process?.operadores_requeridos || 1
      }
    });
  };

  const handleOperatorsChange = (processId, value) => {
    setMachineAssignments({
      ...machineAssignments,
      [processId]: {
        ...machineAssignments[processId],
        operadores: parseInt(value) || 1
      }
    });
  };

  const handleSaveConfig = () => {
    saveMachineAssignmentsMutation.mutate(machineAssignments);
  };

  const machineProcs = getMachineProcesses();

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Procesos Configurados</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenConfig}
              className="bg-blue-50 hover:bg-blue-100 border-blue-200"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurar Procesos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {machineProcs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed">
              <p className="text-sm">No hay procesos configurados para esta máquina</p>
              <Button
                variant="link"
                size="sm"
                onClick={handleOpenConfig}
                className="mt-2"
              >
                Configurar ahora
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
                Procesos disponibles ({machineProcs.length})
                <span className="text-xs text-slate-400">• Arrastra para reordenar</span>
              </div>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId={`machine-processes-${machine.id}`}>
                  {(provided, snapshot) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`space-y-2 min-h-[60px] rounded-lg transition-all ${
                        snapshot.isDraggingOver ? 'bg-blue-50/50 ring-2 ring-blue-300 ring-inset' : ''
                      }`}
                    >
                      {machineProcs.map((mp, index) => (
                        <Draggable key={mp.id} draggableId={mp.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center justify-between p-3 bg-slate-50 rounded-lg border transition-all group ${
                                snapshot.isDragging 
                                  ? 'shadow-2xl border-blue-500 bg-blue-100 scale-105 z-50 ring-2 ring-blue-300' 
                                  : 'hover:border-blue-300 hover:bg-blue-50 hover:shadow-md'
                              }`}
                            >
                              <div 
                                {...provided.dragHandleProps}
                                className="cursor-grab active:cursor-grabbing mr-3 p-1 hover:bg-slate-200 rounded transition-colors"
                              >
                                <GripVertical className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {mp.processName}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {mp.processCode}
                                </div>
                              </div>
                              {editingOperators === mp.id ? (
                                <div className="flex items-center gap-2 ml-2">
                                  <Input
                                    type="number"
                                    min="1"
                                    max="20"
                                    defaultValue={mp.operadores_requeridos}
                                    className="w-16 h-7 text-xs"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        updateOperatorsMutation.mutate({
                                          machineProcessId: mp.id,
                                          operadores: parseInt(e.target.value) || 1
                                        });
                                      }
                                      if (e.key === 'Escape') {
                                        setEditingOperators(null);
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <Button
                                    size="icon"
                                    className="h-7 w-7 bg-green-600 hover:bg-green-700"
                                    onClick={(e) => {
                                      const input = e.target.closest('div').querySelector('input');
                                      updateOperatorsMutation.mutate({
                                        machineProcessId: mp.id,
                                        operadores: parseInt(input.value) || 1
                                      });
                                    }}
                                  >
                                    <Check className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Badge 
                                  className="ml-2 bg-purple-100 text-purple-800 shrink-0 cursor-pointer hover:bg-purple-200 transition-colors"
                                  onClick={() => setEditingOperators(mp.id)}
                                  title="Click para editar operadores"
                                >
                                  {mp.operadores_requeridos} op.
                                  <Edit className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Badge>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}
        </CardContent>
      </Card>

      {showConfig && (
        <Dialog open={true} onOpenChange={() => setShowConfig(false)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configurar Procesos: {machine.nombre}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-slate-700">Código:</span>
                      <span className="font-semibold ml-2">{machine.codigo}</span>
                    </div>
                    {machine.ubicacion && (
                      <div>
                        <span className="text-slate-700">Ubicación:</span>
                        <span className="font-semibold ml-2">{machine.ubicacion}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Selecciona los procesos que puede realizar esta máquina:
                </Label>
                
                {processes.map((process) => (
                  <Card key={process.id} className={`
                    border-2 transition-all
                    ${machineAssignments[process.id]?.checked 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-slate-200 hover:border-slate-300'}
                  `}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            id={`process-${process.id}`}
                            checked={machineAssignments[process.id]?.checked || false}
                            onCheckedChange={() => handleToggleProcess(process.id)}
                          />
                          <label htmlFor={`process-${process.id}`} className="flex-1 cursor-pointer">
                            <div>
                              <div className="font-semibold text-slate-900">{process.nombre}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">{process.codigo}</Badge>
                                {process.descripcion && (
                                  <span className="text-xs text-slate-500">{process.descripcion}</span>
                                )}
                              </div>
                            </div>
                          </label>
                        </div>

                        {machineAssignments[process.id]?.checked && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Operadores:</Label>
                            <Input
                              type="number"
                              min="1"
                              max="20"
                              value={machineAssignments[process.id]?.operadores || 1}
                              onChange={(e) => handleOperatorsChange(process.id, e.target.value)}
                              className="w-20"
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowConfig(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveConfig}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={saveMachineAssignmentsMutation.isPending}
                >
                  {saveMachineAssignmentsMutation.isPending ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}