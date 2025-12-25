import React, { useState, useCallback, useMemo } from "react";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Settings, 
  Cog, 
  ArrowLeft, 
  Check, 
  GripVertical, 
  Copy,
  Download,
  Upload,
  Users,
  Search
} from "lucide-react";
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
  const [formErrors, setFormErrors] = useState({});
  
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    descripcion: "",
    operadores_requeridos: 1,
    activo: true,
    selectedMachines: [],
  });

  // Consultas
  const { data: processes = EMPTY_ARRAY, isLoading: isLoadingProcesses } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.list('nombre'),
    initialData: EMPTY_ARRAY,
  });

  const { data: machines = EMPTY_ARRAY, isLoading: isLoadingMachines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
    staleTime: 5 * 60 * 1000,
    initialData: EMPTY_ARRAY,
  });

  const { data: machineProcesses = EMPTY_ARRAY, isLoading: isLoadingMachineProcesses } = useQuery({
    queryKey: ['machineProcesses'],
    queryFn: () => base44.entities.MachineProcess.list(),
    initialData: EMPTY_ARRAY,
  });

  const isLoading = isLoadingProcesses || isLoadingMachines || isLoadingMachineProcesses;

  // Tipos únicos de máquinas
  const machineTypes = useMemo(() => {
    const types = new Set(machines.map(m => m.tipo).filter(Boolean));
    return Array.from(types).sort();
  }, [machines]);

  // Máquinas filtradas y ordenadas
  const filteredAndSortedMachines = useMemo(() => {
    let result = machines.filter(m => {
      const searchTerm = filters.searchTerm || "";
      const matchesSearch = !searchTerm || 
        m.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.codigo?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterTipo === 'all' || m.tipo === filterTipo;
      
      return matchesSearch && matchesType;
    });

    // Ordenar máquinas
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

  // Obtener procesos de una máquina
  const getMachineProcesses = useCallback((machineId) => {
    const machineProcs = machineProcesses.filter(mp => 
      mp.machine_id === machineId && mp.activo
    );
    
    return machineProcs
      .map(mp => {
        const process = processes.find(p => p.id === mp.process_id);
        return process ? {
          ...mp,
          processName: process.nombre,
          processCode: process.codigo,
          processActive: process.activo
        } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }, [machineProcesses, processes]);

  // Validación de formulario
  const validateForm = () => {
    const errors = {};
    
    if (!formData.codigo.trim()) {
      errors.codigo = "El código es requerido";
    } else if (formData.codigo.length < 2) {
      errors.codigo = "El código debe tener al menos 2 caracteres";
    }
    
    if (!formData.nombre.trim()) {
      errors.nombre = "El nombre es requerido";
    } else if (formData.nombre.length < 3) {
      errors.nombre = "El nombre debe tener al menos 3 caracteres";
    }
    
    if (formData.operadores_requeridos < 1) {
      errors.operadores_requeridos = "Debe haber al menos 1 operador";
    } else if (formData.operadores_requeridos > 50) {
      errors.operadores_requeridos = "Máximo 50 operadores";
    }
    
    return errors;
  };

  // Mutaciones
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const { selectedMachines: selected, ...processData } = data;
      
      let savedProcess;
      if (editingProcess?.id) {
        savedProcess = await base44.entities.Process.update(editingProcess.id, processData);
      } else {
        savedProcess = await base44.entities.Process.create(processData);
        
        // Crear asignaciones a las máquinas seleccionadas
        if (selected && selected.length > 0) {
          const assignments = selected.map(machineId => ({
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
    onError: (error) => {
      toast.error(`Error al guardar: ${error.message || 'Error desconocido'}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Process.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      queryClient.invalidateQueries({ queryKey: ['machineProcesses'] });
      toast.success("Proceso eliminado correctamente");
    },
    onError: (error) => {
      toast.error(`Error al eliminar: ${error.message || 'Error desconocido'}`);
    }
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
    onError: (error) => {
      toast.error(`Error al actualizar operadores: ${error.message || 'Error desconocido'}`);
    }
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
    onError: (error) => {
      toast.error(`Error al guardar configuración: ${error.message || 'Error desconocido'}`);
    }
  });

  // Handlers
  const handleDragEnd = async (result, machineId) => {
    if (!result.destination) return;

    try {
      const machineProcs = getMachineProcesses(machineId);
      const items = Array.from(machineProcs);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      // Actualizar orden para todos los items
      const updates = items.map((item, index) => 
        base44.entities.MachineProcess.update(item.id, { orden: index })
      );

      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ['machineProcesses'] });
      toast.success("Orden actualizado correctamente");
    } catch (error) {
      console.error("Error al actualizar orden:", error);
      toast.error("Error al actualizar el orden");
    }
  };

  const handleMachineDragEnd = async (result) => {
    if (!result.destination) return;

    try {
      const items = Array.from(filteredAndSortedMachines);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      // Actualizar orden para todas las máquinas
      const updates = items.map((item, index) => 
        base44.entities.Machine.update(item.id, { orden: index })
      );

      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success("Orden de máquinas actualizado");
    } catch (error) {
      console.error("Error al actualizar orden:", error);
      toast.error("Error al actualizar orden de máquinas");
    }
  };

  const handleEdit = (process) => {
    setEditingProcess(process);
    setFormData({
      nombre: process.nombre,
      codigo: process.codigo,
      descripcion: process.descripcion || "",
      operadores_requeridos: process.operadores_requeridos || 1,
      activo: process.activo ?? true,
      selectedMachines: [],
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Está seguro de eliminar este proceso? También se eliminarán sus asignaciones a máquinas.')) {
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
    setFormErrors({});
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
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Por favor, corrija los errores en el formulario");
      return;
    }
    
    saveMutation.mutate(formData);
  };

  const handleOpenMachineAssignment = (machine) => {
    setShowMachineAssignment(machine);
    
    // Pre-cargar procesos asignados a esta máquina
    const existing = machineProcesses.filter(mp => mp.machine_id === machine.id);
    const assignments = {};
    
    processes.filter(p => p.activo).forEach(process => {
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
    const numValue = parseInt(value);
    if (numValue < 1 || numValue > 50) return;
    
    setMachineAssignments({
      ...machineAssignments,
      [processId]: {
        ...machineAssignments[processId],
        operadores: numValue || 1
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

  // Exportar configuración
  const handleExportConfig = (machineId) => {
    const machine = machines.find(m => m.id === machineId);
    const machineProcs = getMachineProcesses(machineId);
    
    const config = {
      machine: {
        id: machine.id,
        nombre: machine.nombre,
        codigo: machine.codigo,
        tipo: machine.tipo,
        ubicacion: machine.ubicacion,
        orden: machine.orden
      },
      processes: machineProcs.map(mp => ({
        process_id: mp.process_id,
        nombre: mp.processName,
        codigo: mp.processCode,
        operadores_requeridos: mp.operadores_requeridos,
        orden: mp.orden,
        activo: mp.activo
      })),
      export_date: new Date().toISOString(),
      version: "1.0"
    };
    
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `config-maquina-${machine.codigo}-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    
    toast.success(`Configuración de ${machine.nombre} exportada`);
  };

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Link to={createPageUrl("Machines")}>
          <Button variant="ghost" className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Máquinas
          </Button>
        </Link>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => toast.info("Función de importar en desarrollo")}
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Proceso
          </Button>
        </div>
      </div>

      <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Cog className="w-5 h-5 text-blue-600" />
              Configuración de Procesos
            </CardTitle>
            <div className="text-sm text-slate-500">
              {machines.length} máquinas • {processes.length} procesos
            </div>
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
            
            <div className="flex flex-wrap gap-3 items-center justify-between">
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
              
              <div className="text-xs text-slate-500">
                Arrastra las máquinas para reordenar
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[...Array(2)].map((_, j) => (
                        <div key={j} className="h-10 bg-gray-100 rounded"></div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredAndSortedMachines.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 border-2 border-dashed rounded-lg">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">No se encontraron máquinas</p>
              <p className="text-sm">Intenta con otros filtros de búsqueda</p>
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
                    {filteredAndSortedMachines.map((machine, machineIndex) => {
                      const machineProcs = getMachineProcesses(machine.id);
                      
                      return (
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
                                          title="Arrastrar para reordenar"
                                        >
                                          <GripVertical className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                                        </div>
                                        <Cog className="w-6 h-6 text-blue-600" />
                                        <div className="flex-1">
                                          <CardTitle className="text-xl">{machine.nombre}</CardTitle>
                                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <Badge variant="outline" className="font-mono text-xs">
                                              {machine.codigo}
                                            </Badge>
                                            {machine.tipo && (
                                              <Badge variant="secondary" className="text-xs">
                                                {machine.tipo}
                                              </Badge>
                                            )}
                                            {machine.ubicacion && (
                                              <span className="text-xs text-slate-500 flex items-center gap-1">
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
                                    <div className="flex gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleExportConfig(machine.id)}
                                        title="Exportar configuración"
                                      >
                                        <Download className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleOpenMachineAssignment(machine)}
                                        className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                                      >
                                        <Settings className="w-4 h-4 mr-2" />
                                        Configurar
                                      </Button>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  {machineProcs.length === 0 ? (
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
                                      <div className="text-sm font-medium text-slate-600 mb-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span>Procesos disponibles ({machineProcs.length})</span>
                                          <span className="text-xs text-slate-400">• Arrastra para reordenar</span>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                          {machineProcs.reduce((sum, mp) => sum + (mp.operadores_requeridos || 0), 0)} operadores totales
                                        </Badge>
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
                                                      <div className="flex items-center gap-2">
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
                                                              max="50"
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
                                                            <Users className="w-3 h-3 mr-1" />
                                                            {mp.operadores_requeridos} op.
                                                            <Edit className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                          </Badge>
                                                        )}
                                                      </div>
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
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Formulario */}
      {showForm && (
        <Dialog open={true} onOpenChange={() => setShowForm(false)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingProcess ? (
                  <>
                    <Edit className="w-5 h-5 text-blue-600" />
                    Editar Proceso
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-blue-600" />
                    Nuevo Proceso
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                Complete los datos del proceso. Los campos con * son obligatorios.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => {
                      setFormData({ ...formData, codigo: e.target.value });
                      if (formErrors.codigo) {
                        setFormErrors({ ...formErrors, codigo: null });
                      }
                    }}
                    placeholder="ej: PROC-001"
                    required
                    className={formErrors.codigo ? "border-red-500" : ""}
                  />
                  {formErrors.codigo && (
                    <p className="text-sm text-red-500">{formErrors.codigo}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => {
                      setFormData({ ...formData, nombre: e.target.value });
                      if (formErrors.nombre) {
                        setFormErrors({ ...formErrors, nombre: null });
                      }
                    }}
                    placeholder="ej: Ensamblaje"
                    required
                    className={formErrors.nombre ? "border-red-500" : ""}
                  />
                  {formErrors.nombre && (
                    <p className="text-sm text-red-500">{formErrors.nombre}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
      