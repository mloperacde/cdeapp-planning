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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, Edit, Trash2, Settings, Cog, ArrowLeft, Check, GripVertical, Copy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getMachineAlias } from "@/utils/machineAlias";
import { toast } from "sonner";
import AdvancedSearch from "../components/common/AdvancedSearch";
const EMPTY_ARRAY = [];

export default function ProcessConfigurationPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [showMachineAssignment, setShowMachineAssignment] = useState(null);
  const [machineAssignments, setMachineAssignments] = useState({});
  const [filters, setFilters] = useState({});
  const [processFilters, setProcessFilters] = useState({});
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
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 500);
      return data.map(m => ({
        id: m.id,
        nombre: m.nombre,
        alias: getMachineAlias(m),
        codigo: m.codigo_maquina || m.codigo,
        tipo: m.tipo,
        ubicacion: m.ubicacion,
        orden: m.orden_visualizacion || 999
      })).sort((a, b) => a.orden - b.orden);
    },
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
        m.alias?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
  const filteredProcesses = React.useMemo(() => {
    const searchTerm = (processFilters.searchTerm || "").toLowerCase();
    return (processes || []).filter(p => {
      const nameMatch = (p.nombre || "").toLowerCase().includes(searchTerm);
      const codeMatch = (p.codigo || "").toLowerCase().includes(searchTerm);
      return !searchTerm || nameMatch || codeMatch;
    }).sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
  }, [processes, processFilters]);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    if (result.type === 'MACHINE') {
        const items = Array.from(filteredMachines);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        const updates = items.map((item, index) => 
          base44.entities.MachineMasterDatabase.update(item.id, { orden_visualizacion: index + 1 })
        );

        try {
          await Promise.all(updates);
          queryClient.invalidateQueries({ queryKey: ['machines'] });
          toast.success("Orden de máquinas actualizado");
        } catch {
          toast.error("Error al actualizar orden");
        }
        return;
    }

    if (result.type === 'PROCESS') {
        // Parse machine ID from droppableId "machine-{id}"
        const machineId = result.source.droppableId.replace('machine-', '');
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
        } catch {
          toast.error("Error al actualizar orden");
        }
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
          // Propagar a archivo maestro de máquinas
          const process = processes.find(p => p.id === processId);
          const masterList = await base44.entities.MachineMasterDatabase.list(undefined, 500);
          await Promise.all(newAssignments.map(async (a) => {
            const m = masterList.find(mm => mm.id === a.machine_id) || {};
            const existing = Array.isArray(m.procesos_configurados) ? m.procesos_configurados : [];
            const exists = existing.some(pc => pc.process_id === processId);
            const updated = exists ? existing : [
              ...existing,
              {
                process_id: processId,
                nombre_proceso: process?.nombre,
                codigo_proceso: process?.codigo,
                operadores_requeridos: a.operadores_requeridos || 1,
                activo: true
              }
            ];
            await base44.entities.MachineMasterDatabase.update(a.machine_id, { procesos_configurados: updated });
          }));
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
          // Propagar a archivo maestro de máquinas (reemplazo completo)
          const procesosCfg = newAssignments.map(a => {
            const p = processes.find(pp => pp.id === a.process_id);
            return {
              process_id: a.process_id,
              nombre_proceso: p?.nombre,
              codigo_proceso: p?.codigo,
              operadores_requeridos: a.operadores_requeridos || 1,
              activo: true
            };
          });
          await base44.entities.MachineMasterDatabase.update(machineId, { procesos_configurados: procesosCfg });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machineProcesses'] });
      queryClient.invalidateQueries({ queryKey: ['machineMasterDatabase'] });
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
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Standard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Cog className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Configuración de Procesos
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Gestiona los procesos productivos y sus asignaciones
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Link to={createPageUrl("MachineManagement")}>
            <Button variant="ghost" size="sm" className="h-8 gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Volver</span>
            </Button>
            </Link>
            <Button
              onClick={() => setShowForm(true)}
              size="sm"
              className="h-8 gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Proceso</span>
            </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
      
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <Tabs defaultValue="machines" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="processes">Procesos</TabsTrigger>
              <TabsTrigger value="machines">Máquinas</TabsTrigger>
            </TabsList>
            <TabsContent value="processes">
              <div className="mb-6 space-y-4">
                <AdvancedSearch
                  data={processes}
                  onFilterChange={setProcessFilters}
                  searchFields={['nombre', 'codigo']}
                  placeholder="Buscar proceso por nombre o código..."
                  pageId="process_configuration_processes"
                />
              </div>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="w-32">Operadores</TableHead>
                      <TableHead className="w-24">Activo</TableHead>
                      <TableHead className="w-64">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProcesses.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell className="text-slate-600">{p.descripcion || ''}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{p.operadores_requeridos || 1}</Badge>
                        </TableCell>
                        <TableCell>
                          {p.activo ? (
                            <Badge className="bg-green-100 text-green-800">Sí</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(p)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleOpenProcessConfiguration(p)}>
                              <Settings className="w-4 h-4 mr-2" />
                              Asignar a máquinas
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredProcesses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-500 py-10">
                          No hay procesos creados o no coinciden con la búsqueda
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="machines">
          <div className="mb-6 space-y-4">
            <AdvancedSearch
              data={machines}
              onFilterChange={setFilters}
              searchFields={['alias', 'nombre', 'codigo']}
              placeholder="Buscar máquina por alias, nombre o código..."
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
            <DragDropContext onDragEnd={handleDragEnd}>
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
                              <CardTitle className="text-xl">{getMachineAlias(machine)}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>

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
                          {machine.alias}
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
                  : `Configurar Procesos: ${showMachineAssignment.alias || showMachineAssignment.nombre}`}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 text-sm">
                    {!showMachineAssignment.isProcessConfig && showMachineAssignment.alias ? (
                        <div>
                          <span className="text-slate-700 dark:text-slate-300">Máquina:</span>
                          <span className="font-semibold ml-2">{showMachineAssignment.alias}</span>
                        </div>
                    ) : (
                        <>
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
                        </>
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
                                <div className="font-semibold text-slate-900 dark:text-slate-100">{getMachineAlias(machine)}</div>
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
