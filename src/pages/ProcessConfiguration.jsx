import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { Plus, Edit, Trash2, Settings, Cog, Link as LinkIcon, ArrowLeft, Check, GripVertical, ArrowUpDown, Copy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import AdvancedSearch from "../components/common/AdvancedSearch";
const EMPTY_ARRAY = [];

export default function ProcessConfigurationPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [showMachineAssignment, setShowMachineAssignment] = useState(null);
  const [machineAssignments, setMachineAssignments] = useState({});
  const [filters, setFilters] = useState({});
  const [editingOperators, setEditingOperators] = useState(null);
  const [sortBy, setSortBy] = useState('nombre');
  const [filterTipo, setFilterTipo] = useState('all');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    descripcion: "",
    operadores_requeridos: 1,
    activo: true,
    selectedMachines: [],
  });

  const { data: processes = EMPTY_ARRAY, isLoading } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.list('nombre'),
    initialData: EMPTY_ARRAY,
  });

  const { data: machines = EMPTY_ARRAY } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
    staleTime: 5 * 60 * 1000,
    initialData: EMPTY_ARRAY,
  });

  const { data: machineProcesses = EMPTY_ARRAY } = useQuery({
    queryKey: ['machineProcesses'],
    queryFn: () => base44.entities.MachineProcess.list(),
    initialData: EMPTY_ARRAY,
  });

  // Get unique machine types
  const machineTypes = React.useMemo(() => {
    const types = new Set(machines.map(m => m.tipo).filter(Boolean));
    return Array.from(types).sort();
  }, [machines]);

  // Filtered machines with their processes
  const filteredMachines = React.useMemo(() => {
    let result = machines.filter(m => {
      const searchTerm = filters.searchTerm || "";
      const matchesSearch = !searchTerm || 
        m.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.codigo?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterTipo === 'all' || m.tipo === filterTipo;
      
      return matchesSearch && matchesType;
    });

    // Sort machines
    result = [...result].sort((a, b) => {
      if (sortBy === 'nombre') {
        return (a.nombre || "").localeCompare(b.nombre || "", 'es');
      }
      if (sortBy === 'codigo') {
        return (a.codigo || "").localeCompare(b.codigo || "", 'es');
      }
      if (sortBy === 'tipo') {
        const typeCompare = (a.tipo || "").localeCompare(b.tipo || "", 'es');
        if (typeCompare !== 0) return typeCompare;
        return (a.nombre || "").localeCompare(b.nombre || "", 'es');
      }
      if (sortBy === 'orden') {
        return (a.orden || 0) - (b.orden || 0);
      }
      return 0;
    });
    
    return result;
  }, [machines, filters, sortBy, filterTipo]);

  const getMachineProcesses = (machineId) => {
    const machineProcs = machineProcesses.filter(mp => mp.machine_id === machineId && mp.activo);
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

  const handleDragEnd = async (result, machineId) => {
    if (!result.destination) return;

    const machineProcs = getMachineProcesses(machineId);
    const items = Array.from(machineProcs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update orden for all items
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

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const { selectedMachines, ...processData } = data;
      
      let savedProcess;
      if (editingProcess?.id) {
        savedProcess = await base44.entities.Process.update(editingProcess.id, processData);
      } else {
        savedProcess = await base44.entities.Process.create(processData);
        
        // Crear asignaciones a las máquinas seleccionadas
        if (selectedMachines && selectedMachines.length > 0) {
          const assignments = selectedMachines.map(machineId => ({
            machine_id: machineId,
            process_id: savedProcess.id,
            operadores_requeridos: processData.operadores_requeridos || 1,
            activo: true
          }));
          await base44.entities.MachineProcess.bulkCreate(assignments);
        }
      }
      return savedProcess;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      queryClient.invalidateQueries({ queryKey: ['machineProcesses'] });
      handleClose();
      toast.success("Proceso guardado correctamente");
    },
  });

  const handleOpenProcessConfiguration = (process) => {
    // Configurar proceso en máquinas
    const assignments = {};
    machines.forEach(machine => {
      assignments[machine.id] = {
        checked: false,
        operadores: process.operadores_requeridos || 1
      };
    });
    setMachineAssignments(assignments);
    setShowMachineAssignment({ ...process, isProcessConfig: true });
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Process.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      toast.success("Proceso eliminado");
    },
  });

  const saveMachineAssignmentsMutation = useMutation({
    mutationFn: async (data) => {
      const isProcessConfig = showMachineAssignment?.isProcessConfig;
      
      if (isProcessConfig) {
        // Configurando proceso en múltiples máquinas
        const { processId, assignments } = data;
        const newAssignments = Object.entries(assignments)
          .filter(([_, assigned]) => assigned.checked)
          .map(([machineId, assigned]) => ({
            machine_id: machineId,
            process_id: processId,
            operadores_requeridos: assigned.operadores || 1,
            activo: true
          }));

        if (newAssignments.length > 0) {
          await base44.entities.MachineProcess.bulkCreate(newAssignments);
        }
      } else {
        // Configurando máquina con múltiples procesos
        const { machineId, assignments } = data;
        const existing = machineProcesses.filter(mp => mp.machine_id === machineId);
        await Promise.all(existing.map(mp => base44.entities.MachineProcess.delete(mp.id)));
        
        const newAssignments = Object.entries(assignments)
          .filter(([_, assigned]) => assigned.checked)
          .map(([processId, assigned]) => ({
            machine_id: machineId,
            process_id: processId,
            operadores_requeridos: assigned.operadores || 1,
            activo: true
          }));

        if (newAssignments.length > 0) {
          await base44.entities.MachineProcess.bulkCreate(newAssignments);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machineProcesses'] });
      setShowMachineAssignment(null);
      setMachineAssignments({});
      toast.success("Configuración guardada correctamente");
    },
  });

  const updateOperatorsMutation = useMutation({
    mutationFn: async ({ machineProcessId, operadores }) => {
      return await base44.entities.MachineProcess.update(machineProcessId, {
        operadores_requeridos: operadores
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machineProcesses'] });
      setEditingOperators(null);
      toast.success("Operadores actualizados");
    },
  });

  const handleEdit = (process) => {
    setEditingProcess(process);
    setFormData({
      nombre: process.nombre,
      codigo: process.codigo,
      descripcion: process.descripcion || "",
      operadores_requeridos: process.operadores_requeridos || 1,
      activo: process.activo ?? true,
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este proceso? También se eliminarán sus asignaciones a máquinas.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingProcess(null);
    setFormData({
      nombre: "",
      codigo: "",
      descripcion: "",
      operadores_requeridos: 1,
      activo: true,
      selectedMachines: [],
    });
  };

  const handleMachineDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(filteredMachines);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update orden for all machines
    const updates = items.map((item, index) => 
      base44.entities.Machine.update(item.id, { orden: index })
    );

    try {
      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success("Orden de máquinas actualizado");
    } catch (error) {
      toast.error("Error al actualizar orden");
    }
  };

  const handleCopyProcess = (machine, mp) => {
    const otherMachines = machines.filter(m => m.id !== machine.id);
    const existingAssignments = machineProcesses.filter(mproc => mproc.process_id === mp.process_id);
    const assignedMachineIds = new Set(existingAssignments.map(a => a.machine_id));
    
    const availableMachines = otherMachines.filter(m => !assignedMachineIds.has(m.id));
    
    if (availableMachines.length === 0) {
      toast.info("Este proceso ya está asignado a todas las máquinas");
      return;
    }

    setShowMachineAssignment({
      id: mp.process_id,
      nombre: mp.processName,
      codigo: mp.processCode,
      operadores_requeridos: mp.operadores_requeridos,
      isProcessConfig: true,
      isCopy: true,
      sourceMachineId: machine.id
    });

    const assignments = {};
    availableMachines.forEach(m => {
      assignments[m.id] = {
        checked: false,
        operadores: mp.operadores_requeridos
      };
    });
    setMachineAssignments(assignments);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleOpenMachineAssignment = (machine) => {
    setShowMachineAssignment(machine);
    
    // Pre-cargar procesos asignados a esta máquina
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

  const handleSaveMachineAssignments = () => {
    const isProcessConfig = showMachineAssignment?.isProcessConfig;
    
    if (isProcessConfig) {
      saveMachineAssignmentsMutation.mutate({
        processId: showMachineAssignment.id,
        assignments: machineAssignments
      });
    } else {
      saveMachineAssignmentsMutation.mutate({
        machineId: showMachineAssignment.id,
        assignments: machineAssignments
      });
    }
  };

  const handleToggleMachine = (machineId) => {
    const machine = machines.find(m => m.id === machineId);
    setMachineAssignments({
      ...machineAssignments,
      [machineId]: {
        checked: !machineAssignments[machineId]?.checked,
        operadores: machineAssignments[machineId]?.operadores || 
                   showMachineAssignment?.operadores_requeridos || 1
      }
    });
  };

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link to={createPageUrl("Machines")}>
          <Button variant="ghost" className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Máquinas
          </Button>
        </Link>
      </div>

      <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center">
            <CardTitle>Configuración de Procesos</CardTitle>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Proceso
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6 space-y-4">
            <AdvancedSearch
              data={processes}
              onFilterChange={setFilters}
              searchFields={['nombre', 'codigo']}
              placeholder="Buscar máquina por nombre o código..."
              pageId="process_configuration"
            />
            
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium whitespace-nowrap">Ordenar por:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nombre">Nombre</SelectItem>
                    <SelectItem value="codigo">Código</SelectItem>
                    <SelectItem value="tipo">Tipo</SelectItem>
                    <SelectItem value="orden">Orden</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {machineTypes.length > 0 && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium whitespace-nowrap">Tipo:</Label>
                  <Select value={filterTipo} onValueChange={setFilterTipo}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      {machineTypes.map(tipo => (
                        <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">Cargando máquinas...</div>
          ) : filteredMachines.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              No se encontraron máquinas con los filtros seleccionados
            </div>
          ) : (
            <DragDropContext onDragEnd={handleMachineDragEnd}>
              <Droppable droppableId="machines-list" type="MACHINE">
                {(provided, snapshot) => (
                  <div 
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`grid grid-cols-1 gap-4 ${
                      snapshot.isDraggingOver ? 'bg-blue-50/30 rounded-lg p-2' : ''
                    }`}
                  >
                    {filteredMachines.map((machine, machineIndex) => (
                      <Draggable key={machine.id} draggableId={machine.id} index={machineIndex}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={snapshot.isDragging ? 'z-50' : ''}
                          >
                            <Card className={`border-l-4 border-l-blue-500 transition-all ${
                              snapshot.isDragging 
                                ? 'shadow-2xl scale-105 ring-2 ring-blue-400 bg-blue-50' 
                                : 'hover:shadow-md'
                            }`}>
                            <CardHeader className="pb-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <div 
                                      {...provided.dragHandleProps}
                                      className="cursor-grab active:cursor-grabbing p-2 hover:bg-slate-100 rounded transition-colors"
                                    >
                                      <GripVertical className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                                    </div>
                                    <Cog className="w-6 h-6 text-blue-600" />
                            <div>
                              <CardTitle className="text-xl">{machine.nombre}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {machine.codigo}
                                </Badge>
                                {machine.ubicacion && (
                                  <span className="text-xs text-slate-500">
                                    📍 {machine.ubicacion}
                                  </span>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  Orden: {machine.orden ?? machineIndex}
                                </Badge>
                              </div>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenMachineAssignment(machine)}
                                className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                              >
                                <Settings className="w-4 h-4 mr-2" />
                                Configurar Procesos
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {(() => {
                              const machineProcs = getMachineProcesses(machine.id);
                              return machineProcs.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed">
                          <Cog className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No hay procesos configurados para esta máquina</p>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => handleOpenMachineAssignment(machine)}
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
                          <DragDropContext onDragEnd={(result) => handleDragEnd(result, machine.id)}>
                            <Droppable droppableId={`machine-${machine.id}`} type="PROCESS">
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
                                         style={{
                                           ...provided.draggableProps.style,
                                           cursor: snapshot.isDragging ? 'grabbing' : 'default'
                                         }}
                                       >
                                         <div 
                                           {...provided.dragHandleProps}
                                           className="cursor-grab active:cursor-grabbing mr-3 p-1 hover:bg-slate-200 rounded transition-colors"
                                           onClick={(e) => e.stopPropagation()}
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
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleCopyProcess(machine, mp)}
                                            title="Copiar a otras máquinas"
                                          >
                                            <Copy className="w-3 h-3 text-slate-600" />
                                          </Button>
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
                            );
                            })()}
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      {showForm && (
        <Dialog open={true} onOpenChange={() => setShowForm(false)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProcess ? 'Editar Proceso' : 'Nuevo Proceso'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código *</Label>
                  <Input
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="ej: PROC-001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="ej: Ensamblaje"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  placeholder="Descripción del proceso..."
                />
              </div>

              <div className="space-y-2">
                <Label>Operadores Requeridos *</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.operadores_requeridos}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    operadores_requeridos: parseInt(e.target.value) || 1 
                  })}
                  required
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Número de operadores necesarios por defecto para este proceso
                </p>
              </div>

              {!editingProcess && (
                <div className="space-y-2">
                  <Label>Asignar a Máquinas (opcional)</Label>
                  <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2">
                    {machines.map((machine) => (
                      <div key={machine.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`new-machine-${machine.id}`}
                          checked={formData.selectedMachines.includes(machine.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                selectedMachines: [...formData.selectedMachines, machine.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                selectedMachines: formData.selectedMachines.filter(id => id !== machine.id)
                              });
                            }
                          }}
                        />
                        <label 
                          htmlFor={`new-machine-${machine.id}`} 
                          className="text-sm font-medium cursor-pointer"
                        >
                          {machine.nombre} <span className="text-xs text-slate-500">({machine.codigo})</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Puedes configurar las máquinas después de crear el proceso
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
                <label htmlFor="activo" className="text-sm font-medium">
                  Proceso activo
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? "Guardando..." : "Guardar Proceso"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Configuration Dialog */}
      {showMachineAssignment && (
        <Dialog open={true} onOpenChange={() => setShowMachineAssignment(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Cog className="w-5 h-5 text-blue-600" />
                {showMachineAssignment.isProcessConfig 
                  ? `Configurar Máquinas para: ${showMachineAssignment.nombre}`
                  : `Configurar Procesos: ${showMachineAssignment.nombre}`}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-slate-700 dark:text-slate-300">Código:</span>
                      <span className="font-semibold ml-2">{showMachineAssignment.codigo}</span>
                    </div>
                    {showMachineAssignment.ubicacion && (
                      <div>
                        <span className="text-slate-700 dark:text-slate-300">Ubicación:</span>
                        <span className="font-semibold ml-2">{showMachineAssignment.ubicacion}</span>
                      </div>
                    )}
                    {showMachineAssignment.operadores_requeridos && (
                      <div>
                        <span className="text-slate-700 dark:text-slate-300">Operadores por defecto:</span>
                        <Badge className="ml-2 bg-purple-600">
                          {showMachineAssignment.operadores_requeridos}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {showMachineAssignment.isProcessConfig 
                    ? showMachineAssignment.isCopy 
                      ? 'Selecciona las máquinas adicionales para este proceso:'
                      : 'Selecciona las máquinas donde se puede realizar este proceso:'
                    : 'Selecciona los procesos que puede realizar esta máquina:'}
                </Label>
                
                {showMachineAssignment.isProcessConfig ? (
                  // Configurando proceso -> mostrar máquinas
                  machines.filter(m => !showMachineAssignment.isCopy || m.id !== showMachineAssignment.sourceMachineId).map((machine) => (
                    <Card key={machine.id} className={`
                      border-2 transition-all
                      ${machineAssignments[machine.id]?.checked 
                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-slate-200 hover:border-slate-300'}
                    `}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              id={`machine-${machine.id}`}
                              checked={machineAssignments[machine.id]?.checked || false}
                              onCheckedChange={() => handleToggleMachine(machine.id)}
                            />
                            <label htmlFor={`machine-${machine.id}`} className="flex-1 cursor-pointer">
                              <div>
                                <div className="font-semibold text-slate-900 dark:text-slate-100">{machine.nombre}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">{machine.codigo}</Badge>
                                  {machine.ubicacion && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400">📍 {machine.ubicacion}</span>
                                  )}
                                </div>
                              </div>
                            </label>
                          </div>

                          {machineAssignments[machine.id]?.checked && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Operadores:</Label>
                              <Input
                                type="number"
                                min="1"
                                max="20"
                                value={machineAssignments[machine.id]?.operadores || 1}
                                onChange={(e) => handleOperatorsChange(machine.id, e.target.value)}
                                className="w-20"
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  // Configurando máquina -> mostrar procesos
                  processes.filter(p => p.activo).map((process) => (
                    <Card key={process.id} className={`
                      border-2 transition-all
                      ${machineAssignments[process.id]?.checked 
                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
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
                                <div className="font-semibold text-slate-900 dark:text-slate-100">{process.nombre}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">{process.codigo}</Badge>
                                  {process.descripcion && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400">{process.descripcion}</span>
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
                  ))
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowMachineAssignment(null)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveMachineAssignments}
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
    </div>
  );
}