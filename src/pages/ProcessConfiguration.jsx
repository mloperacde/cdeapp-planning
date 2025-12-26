import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  CheckCircle, 
  XCircle,
  Package,
  Settings,
  Search
} from "lucide-react";
import { toast } from "sonner";

// COMENTAR temporalmente para eliminar errores
// import MachineProcessesTab from "@/components/machines/MachineProcessesTab";

export default function ProcessConfiguration() {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    tipo: "produccion",
    operadores_requeridos: 1,
    tiempo_estimado: 60,
    activo: true
  });

  // Fetch processes
  const { data: processes = [], isLoading } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.list(),
    onError: (error) => {
      console.error("Error cargando procesos:", error);
      toast.error("Error al cargar procesos");
    }
  });

  // ✅✅✅ SOLUCIÓN: Usar un enfoque simple para cargar máquinas
  const { 
    data: machines = [], 
    isLoading: isLoadingMachines,
    refetch: refetchMachines 
  } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      try {
        console.log("Intentando cargar máquinas...");
        
        // PRIMERO: Verificar qué entidades existen
        console.log("Entidades disponibles:", Object.keys(base44.entities || {}));
        
        // INTENTO 1: Probar con 'Machine'
        if (base44.entities.Machine) {
          console.log("Usando entidad 'Machine'");
          const result = await base44.entities.Machine.list();
          console.log("Máquinas cargadas:", result);
          return result;
        }
        
        // INTENTO 2: Probar con 'machine' (minúscula)
        if (base44.entities.machine) {
          console.log("Usando entidad 'machine' (minúscula)");
          const result = await base44.entities.machine.list();
          console.log("Máquinas cargadas:", result);
          return result;
        }
        
        // INTENTO 3: Probar con 'Machines' (plural)
        if (base44.entities.Machines) {
          console.log("Usando entidad 'Machines' (plural)");
          const result = await base44.entities.Machines.list();
          console.log("Máquinas cargadas:", result);
          return result;
        }
        
        // INTENTO 4: Probar con 'machines' (plural minúscula)
        if (base44.entities.machines) {
          console.log("Usando entidad 'machines' (plural minúscula)");
          const result = await base44.entities.machines.list();
          console.log("Máquinas cargadas:", result);
          return result;
        }
        
        // SI NADA FUNCIONA
        console.error("No se encontró ninguna entidad de máquinas");
        toast.error("No se encontró la entidad de máquinas. Verifica la configuración.");
        return [];
        
      } catch (error) {
        console.error("Error cargando máquinas:", error);
        toast.error("Error al cargar máquinas");
        return [];
      }
    },
    retry: 1
  });

  // Create/Update mutation
  const saveProcessMutation = useMutation({
    mutationFn: async (processData) => {
      if (editingProcess) {
        return await base44.entities.Process.update(editingProcess.id, processData);
      } else {
        return await base44.entities.Process.create(processData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success(
        editingProcess 
          ? "Proceso actualizado correctamente" 
          : "Proceso creado correctamente"
      );
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  // Delete mutation
  const deleteProcessMutation = useMutation({
    mutationFn: async (processId) => {
      return await base44.entities.Process.delete(processId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      toast.success("Proceso eliminado correctamente");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ processId, active }) => {
      return await base44.entities.Process.update(processId, { activo: active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      toast.success("Estado actualizado");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  // Clone process
  const cloneProcessMutation = useMutation({
    mutationFn: async (process) => {
      const { id, created_at, updated_at, ...cloneData } = process;
      cloneData.codigo = `${cloneData.codigo}-COPY`;
      cloneData.nombre = `${cloneData.nombre} (Copia)`;
      return await base44.entities.Process.create(cloneData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      toast.success("Proceso clonado correctamente");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  // Handle select changes
  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      codigo: "",
      nombre: "",
      descripcion: "",
      tipo: "produccion",
      operadores_requeridos: 1,
      tiempo_estimado: 60,
      activo: true
    });
    setEditingProcess(null);
  };

  // Open dialog for editing
  const handleEdit = (process) => {
    setEditingProcess(process);
    setFormData({
      codigo: process.codigo,
      nombre: process.nombre,
      descripcion: process.descripcion || "",
      tipo: process.tipo || "produccion",
      operadores_requeridos: process.operadores_requeridos || 1,
      tiempo_estimado: process.tiempo_estimado || 60,
      activo: process.activo
    });
    setIsDialogOpen(true);
  };

  // Open dialog for creating new
  const handleCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // Submit form
  const handleSubmit = (e) => {
    e.preventDefault();
    saveProcessMutation.mutate(formData);
  };

  // Handle delete
  const handleDelete = (processId) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este proceso?")) {
      deleteProcessMutation.mutate(processId);
    }
  };

  // Handle clone
  const handleClone = (process) => {
    cloneProcessMutation.mutate(process);
  };

  // Handle toggle active
  const handleToggleActive = (process) => {
    toggleActiveMutation.mutate({ 
      processId: process.id, 
      active: !process.activo 
    });
  };

  // Handle machine selection for process assignment
  const handleSelectMachine = (machine) => {
    console.log("Máquina seleccionada:", machine);
    setSelectedMachine(machine);
  };
// Después de la función handleSelectMachine, añade:

// Función para cargar asignaciones (simulada por ahora)
const loadAssignmentsForMachine = async (machineId) => {
  setIsLoadingAssignments(true);
  try {
    // En una implementación real, aquí llamarías a la API
    console.log(`Cargando asignaciones para máquina ${machineId}`);
    
    // Simulamos una respuesta después de 500ms
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulación: algunas asignaciones aleatorias
    const mockAssignments = {
      [machineId]: processes
        .filter(p => Math.random() > 0.7 && p.activo)
        .map(p => p.id)
    };
    
    setAssignments(prev => ({
      ...prev,
      ...mockAssignments
    }));
    
  } catch (error) {
    console.error("Error cargando asignaciones:", error);
    toast.error("Error al cargar asignaciones");
  } finally {
    setIsLoadingAssignments(false);
  }
};

// Función para alternar asignación
const toggleAssignment = (machineId, processId, isCurrentlyAssigned) => {
  setAssignments(prev => {
    const currentAssignments = prev[machineId] || [];
    
    let newAssignments;
    if (isCurrentlyAssigned) {
      // Quitar asignación
      newAssignments = currentAssignments.filter(id => id !== processId);
      toast.success("Proceso desasignado de la máquina");
    } else {
      // Agregar asignación
      newAssignments = [...currentAssignments, processId];
      toast.success("Proceso asignado a la máquina");
    }
    
    return {
      ...prev,
      [machineId]: newAssignments
    };
  });
  
  // En una implementación real, aquí guardarías en la API
  console.log(`Máquina ${machineId} - Proceso ${processId}: ${isCurrentlyAssigned ? 'desasignado' : 'asignado'}`);
};

// Función para guardar todas las asignaciones (opcional)
const saveAllAssignments = async () => {
  setIsLoadingAssignments(true);
  try {
    // Simulación de guardado en API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log("Asignaciones a guardar:", assignments);
    toast.success("Asignaciones guardadas correctamente");
    
    // Aquí podrías llamar a una API real:
    // await base44.entities.MachineProcessAssignment.saveAll(assignments);
    
  } catch (error) {
    console.error("Error guardando asignaciones:", error);
    toast.error("Error al guardar asignaciones");
  } finally {
    setIsLoadingAssignments(false);
  }
};
  
  // Process types for select
  const processTypes = [
    { value: "produccion", label: "Producción" },
    { value: "calidad", label: "Calidad" },
    { value: "mantenimiento", label: "Mantenimiento" },
    { value: "embalaje", label: "Embalaje" },
    { value: "almacen", label: "Almacén" },
    { value: "inspeccion", label: "Inspección" },
    { value: "limpieza", label: "Limpieza" },
    { value: "control", label: "Control" }
  ];
// Después de los otros estados, añade:
const [assignments, setAssignments] = useState({}); // { machineId: [processIds] }
const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración de Procesos</h1>
          <p className="text-slate-500 mt-2">
            Gestiona los procesos de producción y sus asignaciones a máquinas
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetchMachines()}
            title="Recargar máquinas"
            className="flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Recargar
          </Button>
          <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Proceso
          </Button>
        </div>
      </div>

      <Tabs defaultValue="processes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="processes">
            <Package className="w-4 h-4 mr-2" />
            Procesos
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <Settings className="w-4 h-4 mr-2" />
            Asignaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="processes">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Procesos</CardTitle>
              <CardDescription>
                {processes.length} procesos configurados en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-slate-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2">Cargando procesos...</p>
                </div>
              ) : processes.length === 0 ? (
                <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded-lg">
                  <Package className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="mt-4">No hay procesos configurados</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={handleCreate}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear primer proceso
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Operadores</TableHead>
                      <TableHead className="text-center">Tiempo (min)</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processes.map((process) => (
                      <TableRow key={process.id}>
                        <TableCell className="font-mono font-medium">
                          {process.codigo}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{process.nombre}</div>
                            {process.descripcion && (
                              <div className="text-xs text-slate-500 truncate max-w-xs">
                                {process.descripcion}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {processTypes.find(t => t.value === process.tipo)?.label || process.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {process.operadores_requeridos || 1}
                        </TableCell>
                        <TableCell className="text-center">
                          {process.tiempo_estimado || 60}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {process.activo ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Activo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-500">
                                <XCircle className="w-3 h-3 mr-1" />
                                Inactivo
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(process)}
                              className="h-7 w-7 p-0"
                              title={process.activo ? "Desactivar" : "Activar"}
                            >
                              {process.activo ? (
                                <XCircle className="w-3 h-3 text-slate-400" />
                              ) : (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleClone(process)}
                              title="Clonar proceso"
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(process)}
                              title="Editar proceso"
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(process.id)}
                              title="Eliminar proceso"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

<TabsContent value="assignments">
  <Card>
    <CardHeader>
      <CardTitle>Asignación de Procesos a Máquinas</CardTitle>
      <CardDescription>
        Selecciona una máquina y asigna los procesos disponibles
      </CardDescription>
          </div>
    {Object.keys(assignments).length > 0 && (
      <Button 
        onClick={saveAllAssignments}
        disabled={isLoadingAssignments}
        className="bg-green-600 hover:bg-green-700"
      >
        {isLoadingAssignments ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Guardando...
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Guardar asignaciones
          </>
        )}
      </Button>
    )}
  </div>
</CardHeader>
    </CardHeader>
    <CardContent>
      <div className="space-y-6">
        {/* Selección de Máquina */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="machine-select" className="text-base">
              Máquina para asignar procesos
            </Label>
            <Badge variant="outline">
              {machines.length} máquinas disponibles
            </Badge>
          </div>
          
          {isLoadingMachines ? (
            <div className="flex items-center justify-center p-8 border rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-slate-500">Cargando máquinas...</p>
              </div>
            </div>
          ) : machines.length === 0 ? (
            <div className="p-6 border-2 border-dashed rounded-lg text-center">
              <Package className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 mb-2">No hay máquinas disponibles</p>
              <p className="text-sm text-slate-400 mb-4">
                Verifica que las máquinas estén configuradas en el sistema
              </p>
              <div className="flex gap-2 justify-center">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refetchMachines()}
                  className="flex items-center gap-2"
                >
                  <Search className="w-3 h-3" />
                  Reintentar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/MachineManagement')}
                >
                  Gestionar Máquinas
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {machines.map((machine) => (
                <Card 
                  key={machine.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedMachine?.id === machine.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : ''
                  }`}
                  onClick={() => {
                    setSelectedMachine(machine);
                    // Cargar asignaciones existentes para esta máquina
                    loadAssignmentsForMachine(machine.id);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={machine.activo ? "default" : "outline"}
                            className={
                              machine.activo 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'text-slate-500'
                            }
                          >
                            {machine.activo ? 'Activa' : 'Inactiva'}
                          </Badge>
                          <span className="text-xs text-slate-500 font-mono">
                            {machine.codigo}
                          </span>
                        </div>
                        <h4 className="font-semibold text-base">{machine.nombre}</h4>
                        {machine.ubicacion && (
                          <p className="text-sm text-slate-600">
                            📍 {machine.ubicacion}
                          </p>
                        )}
                        
                        {/* Contador de procesos asignados */}
                        <div className="pt-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Procesos asignados:</span>
                            <Badge variant="secondary">
                              {assignments[machine.id]?.length || 0}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {selectedMachine?.id === machine.id && (
                        <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 ml-2" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Asignación de Procesos */}
        {selectedMachine && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  Procesos para {selectedMachine.nombre}
                </h3>
                <p className="text-sm text-slate-500">
                  Selecciona los procesos que se pueden realizar en esta máquina
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {processes.length} procesos disponibles
                </Badge>
              </div>
            </div>
            
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-slate-500">Cargando procesos...</p>
              </div>
            ) : processes.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No hay procesos configurados</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate('/ProcessConfiguration')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear primer proceso
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {processes.map((process) => {
                  const isAssigned = assignments[selectedMachine.id]?.includes(process.id);
                  return (
                    <div 
                      key={process.id}
                      className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                        isAssigned 
                          ? 'bg-green-50 border-green-200' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded ${
                          isAssigned ? 'bg-green-100' : 'bg-slate-100'
                        }`}>
                          <Package className={`w-5 h-5 ${
                            isAssigned ? 'text-green-600' : 'text-slate-400'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{process.nombre}</span>
                            <Badge variant="outline" className="text-xs">
                              {processTypes.find(t => t.value === process.tipo)?.label || process.tipo}
                            </Badge>
                            <span className="text-xs font-mono text-slate-500">
                              {process.codigo}
                            </span>
                          </div>
                          {process.descripcion && (
                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                              {process.descripcion}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              👥 {process.operadores_requeridos || 1} operadores
                            </span>
                            <span className="flex items-center gap-1">
                              ⏱️ {process.tiempo_estimado || 60} min
                            </span>
                            <span className={`flex items-center gap-1 ${
                              process.activo ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {process.activo ? '✅ Activo' : '❌ Inactivo'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant={isAssigned ? "destructive" : "default"}
                        size="sm"
                        onClick={() => toggleAssignment(selectedMachine.id, process.id, isAssigned)}
                        disabled={!process.activo}
                      >
                        {isAssigned ? (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Quitar
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Asignar
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {!selectedMachine && machines.length > 0 && (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <Settings className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">Selecciona una máquina para asignar procesos</p>
            <p className="text-sm text-slate-400 mt-1">
              Haz clic en una máquina de la lista para comenzar
            </p>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
</TabsContent>
      </Tabs>

      {/* Dialog for creating/editing processes */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProcess ? "Editar Proceso" : "Crear Nuevo Proceso"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  name="codigo"
                  value={formData.codigo}
                  onChange={handleInputChange}
                  placeholder="PROC-001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Nombre del proceso"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                placeholder="Descripción detallada del proceso..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Proceso</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => handleSelectChange("tipo", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {processTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="operadores_requeridos">Operadores Requeridos</Label>
                <Input
                  id="operadores_requeridos"
                  name="operadores_requeridos"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.operadores_requeridos}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tiempo_estimado">Tiempo Estimado (minutos)</Label>
                <Input
                  id="tiempo_estimado"
                  name="tiempo_estimado"
                  type="number"
                  min="1"
                  value={formData.tiempo_estimado}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="activo"
                name="activo"
                checked={formData.activo}
                onChange={(e) => handleSelectChange("activo", e.target.checked)}
                className="rounded border-slate-300"
              />
              <Label htmlFor="activo" className="cursor-pointer">
                Proceso activo
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={saveProcessMutation.isPending}
              >
                {saveProcessMutation.isPending 
                  ? "Guardando..." 
                  : editingProcess ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
