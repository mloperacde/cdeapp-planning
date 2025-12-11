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
import { Plus, Edit, Trash2, Settings, Cog, Link as LinkIcon, ArrowLeft } from "lucide-react";
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
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    descripcion: "",
    operadores_requeridos: 1,
    activo: true,
  });

  const { data: processes = EMPTY_ARRAY, isLoading } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.list('nombre'),
    initialData: EMPTY_ARRAY,
  });

  const { data: machines = EMPTY_ARRAY } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('nombre'),
    initialData: EMPTY_ARRAY,
  });

  const { data: machineProcesses = EMPTY_ARRAY } = useQuery({
    queryKey: ['machineProcesses'],
    queryFn: () => base44.entities.MachineProcess.list(),
    initialData: EMPTY_ARRAY,
  });

  // Filtered processes
  const filteredProcesses = React.useMemo(() => {
    let result = processes.filter(p => {
      const searchTerm = filters.searchTerm || "";
      const matchesSearch = !searchTerm || 
        p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !filters.activo || filters.activo === 'all' || 
        (filters.activo === 'activo' ? p.activo : !p.activo);

      return matchesSearch && matchesStatus;
    });

    if (filters.sortField) {
      result = [...result].sort((a, b) => {
        let aVal = a[filters.sortField];
        let bVal = b[filters.sortField];
        
        if (!aVal) return 1;
        if (!bVal) return -1;
        
        const comparison = String(aVal).localeCompare(String(bVal));
        return filters.sortDirection === 'desc' ? -comparison : comparison;
      });
    }
    
    return result;
  }, [processes, filters]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingProcess?.id) {
        return base44.entities.Process.update(editingProcess.id, data);
      }
      return base44.entities.Process.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      handleClose();
      toast.success("Proceso guardado correctamente");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Process.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      toast.success("Proceso eliminado");
    },
  });

  const saveMachineAssignmentsMutation = useMutation({
    mutationFn: async (data) => {
      const { processId, assignments } = data;
      
      // Eliminar asignaciones anteriores de este proceso
      const existing = machineProcesses.filter(mp => mp.process_id === processId);
      await Promise.all(existing.map(mp => base44.entities.MachineProcess.delete(mp.id)));
      
      // Crear nuevas asignaciones
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machineProcesses'] });
      setShowMachineAssignment(null);
      setMachineAssignments({});
      toast.success("Asignaciones guardadas correctamente");
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
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleOpenMachineAssignment = (process) => {
    setShowMachineAssignment(process);
    
    // Pre-cargar asignaciones existentes
    const existing = machineProcesses.filter(mp => mp.process_id === process.id);
    const assignments = {};
    
    machines.forEach(machine => {
      const assignment = existing.find(mp => mp.machine_id === machine.id);
      assignments[machine.id] = {
        checked: !!assignment,
        operadores: assignment?.operadores_requeridos || process.operadores_requeridos || 1
      };
    });
    
    setMachineAssignments(assignments);
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

  const handleOperatorsChange = (machineId, value) => {
    setMachineAssignments({
      ...machineAssignments,
      [machineId]: {
        ...machineAssignments[machineId],
        operadores: parseInt(value) || 1
      }
    });
  };

  const handleSaveMachineAssignments = () => {
    saveMachineAssignmentsMutation.mutate({
      processId: showMachineAssignment.id,
      assignments: machineAssignments
    });
  };

  const getAssignedMachines = (processId) => {
    return machineProcesses.filter(mp => mp.process_id === processId).length;
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
          <div className="mb-6">
            <AdvancedSearch
              data={processes}
              onFilterChange={setFilters}
              searchFields={['nombre', 'codigo']}
              filterOptions={{
                activo: {
                  label: 'Estado',
                  options: [
                    { value: 'activo', label: 'Activo' },
                    { value: 'inactivo', label: 'Inactivo' }
                  ]
                }
              }}
              placeholder="Buscar por nombre o código..."
              pageId="process_configuration"
            />
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">Cargando procesos...</div>
          ) : filteredProcesses.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              No se encontraron procesos con los filtros seleccionados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Operadores Requeridos</TableHead>
                    <TableHead>Máquinas Asignadas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProcesses.map((process) => (
                    <TableRow key={process.id} className="hover:bg-slate-50 dark:bg-slate-800/50">
                      <TableCell>
                        <Badge variant="outline">{process.codigo}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-semibold">{process.nombre}</div>
                          {process.descripcion && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">{process.descripcion}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
                          {process.operadores_requeridos || 1} operadores
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                          {getAssignedMachines(process.id)} máquinas
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          process.activo
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }>
                          {process.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenMachineAssignment(process)}
                            title="Asignar a máquinas"
                          >
                            <LinkIcon className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(process)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(process.id)}
                            className="hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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

      {/* Machine Assignment Dialog */}
      {showMachineAssignment && (
        <Dialog open={true} onOpenChange={() => setShowMachineAssignment(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Asignar Proceso a Máquinas: {showMachineAssignment.nombre}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-700 dark:text-slate-300">Código:</span>
                      <span className="font-semibold ml-2">{showMachineAssignment.codigo}</span>
                    </div>
                    <div>
                      <span className="text-slate-700 dark:text-slate-300">Operadores por defecto:</span>
                      <Badge className="ml-2 bg-purple-600">
                        {showMachineAssignment.operadores_requeridos}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Selecciona las máquinas donde se puede realizar este proceso:</Label>
                {machines.map((machine) => (
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
                              <div className="font-semibold text-slate-900">{machine.nombre}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{machine.codigo}</div>
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
                ))}
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
                  {saveMachineAssignmentsMutation.isPending ? "Guardando..." : "Guardar Asignaciones"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}