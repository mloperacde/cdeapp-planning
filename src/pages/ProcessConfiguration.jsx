import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import MachineProcessesTab from "@/components/machines/MachineProcessesTab";

export default function ProcessConfiguration() {
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

  // Debug: Ver entidades disponibles
  useEffect(() => {
    console.log("🔍 Entidades disponibles en base44:", Object.keys(base44.entities || {}));
  }, []);

  // Fetch processes
  const { data: processes = [], isLoading } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.list(),
    onError: (error) => {
      console.error("❌ Error cargando procesos:", error);
      toast.error("Error al cargar procesos");
    }
  });

  // Fetch machines for selector - CON DEBUG
  const { 
    data: machines = [], 
    isLoading: isLoadingMachines,
    refetch: refetchMachines 
  } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      try {
        console.log("🔄 Cargando máquinas...");
        // Primero prueba list() para ver todas
        const allMachines = await base44.entities.Machine.list();
        console.log("✅ Máquinas cargadas (list):", allMachines);
        
        // Luego prueba con filtro activo
        const activeMachines = await base44.entities.Machine.filter({ activo: true });
        console.log("✅ Máquinas activas (filter):", activeMachines);
        
        return activeMachines;
      } catch (error) {
        console.error("❌ Error en query de máquinas:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log(`✅ ${data.length} máquinas cargadas exitosamente`);
      if (data.length > 0 && !selectedMachine) {
        // Auto-seleccionar primera máquina
        setSelectedMachine(data[0]);
        console.log("📌 Máquina auto-seleccionada:", data[0].nombre);
      }
    },
    onError: (error) => {
      console.error("❌ Error crítico cargando máquinas:", error);
      toast.error("No se pudieron cargar las máquinas. Verifica permisos.");
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
    console.log("🖱️ Máquina seleccionada:", machine);
    setSelectedMachine(machine);
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
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Asignación de Procesos a Máquinas</CardTitle>
                <CardDescription>
                  Asigna procesos a máquinas específicas y configura los operadores requeridos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="machine-select">Seleccionar Máquina</Label>
                      <div className="text-xs text-slate-500">
                        {machines.length} máquinas disponibles
                      </div>
                    </div>
                    
                    {isLoadingMachines ? (
                      <div className="border rounded-lg p-4 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-sm text-slate-500 mt-2">Cargando máquinas...</p>
                      </div>
                    ) : machines.length === 0 ? (
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <Package className="w-10 h-10 mx-auto text-slate-300" />
                        <p className="text-sm text-slate-500 mt-2">No hay máquinas disponibles</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Verifica que la entidad "Machine" exista y tenga datos
                        </p>
                        <div className="flex gap-2 justify-center mt-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => refetchMachines()}
                          >
                            <Search className="w-3 h-3 mr-1" />
                            Reintentar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.location.href = "/machines"}
                          >
                            Ir a Máquinas
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Select 
                        value={selectedMachine?.id || ""}
                        onValueChange={(machineId) => {
                          const machine = machines.find(m => m.id === machineId);
                          if (machine) {
                            handleSelectMachine(machine);
                          }
                        }}
                      >
                        <SelectTrigger id="machine-select" className="w-full">
                          <SelectValue placeholder="Selecciona una máquina...">
                            {selectedMachine ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{selectedMachine.nombre}</span>
                                <span className="text-xs text-slate-500">
                                  ({selectedMachine.codigo})
                                </span>
                              </div>
                            ) : "Selecciona una máquina..."}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {machines.map((machine) => (
                            <SelectItem key={machine.id} value={machine.id}>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{machine.nombre}</div>
                                  <div className="text-xs text-slate-500 truncate">
                                    {machine.codigo} • {machine.ubicacion || "Sin ubicación"}
                                  </div>
                                </div>
                                <Badge 
                                  variant={machine.activo ? "default" : "outline"} 
                                  className={`shrink-0 ${
                                    machine.activo 
                                      ? "bg-green-100 text-green-800 hover:bg-green-200" 
                                      : "text-slate-500"
                                  }`}
                                >
                                  {machine.activo ? "Activa" : "Inactiva"}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {selectedMachine ? (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">{selectedMachine.nombre}</h3>
                          <p className="text-sm text-slate-500">
                            Código: {selectedMachine.codigo} • Ubicación: {selectedMachine.ubicacion || "N/A"}
                          </p>
                          <div className="text-xs text-slate-400 mt-1">
                            ID: {selectedMachine.id} • Procesos asignados: {selectedMachine.procesos_ids?.length || 0}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {selectedMachine.activo ? "Activa" : "Inactiva"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              console.log("📊 Debug máquina:", selectedMachine);
                              toast.info("Máquina enviada a consola para debug");
                            }}
                            title="Debug"
                            className="h-7 w-7 p-0"
                          >
                            🔍
                          </Button>
                        </div>
                      </div>
                      
                      <MachineProcessesTab machine={selectedMachine} />
                    </div>
                  ) : machines.length > 0 ? (
                    <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded-lg">
                      <Settings className="w-12 h-12 mx-auto text-slate-300" />
                      <p className="mt-4">Selecciona una máquina para configurar sus procesos</p>
                      <p className="text-sm text-slate-500 mt-1">
                        {machines.length} máquinas disponibles
                      </p>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
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