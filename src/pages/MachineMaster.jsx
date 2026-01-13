import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cog, Plus, Edit2, Trash2, Eye, ArrowLeft, ArrowUpDown, Save, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import MachineDetailCard from "../components/machines/MachineDetailCard";
import MachineOrderManager from "../components/machines/MachineOrderManager";
import AdvancedSearch from "../components/common/AdvancedSearch";
import { usePagination } from "../components/utils/usePagination";

const EMPTY_ARRAY = [];

export default function MachineMasterPage() {
  const [filters, setFilters] = useState({});
  const [editingMachine, setEditingMachine] = useState(null);
  const [showOrderManager, setShowOrderManager] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const queryClient = useQueryClient();

  const { data: rawMachines = EMPTY_ARRAY, isLoading, error } = useQuery({
    queryKey: ['machineMasterDatabase'],
    queryFn: async () => {
      try {
        const masterData = await base44.entities.MachineMasterDatabase.list(undefined, 500);
        if (!Array.isArray(masterData)) {
          console.warn('MachineMasterDatabase no retornó array');
          return [];
        }
        console.log('✅ Cargadas', masterData.length, 'máquinas desde MachineMasterDatabase');
        return masterData.sort((a, b) => (a.orden_visualizacion || 999) - (b.orden_visualizacion || 999));
      } catch (err) {
        console.error('❌ Error cargando máquinas:', err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Transformar datos para vista
  const machines = rawMachines.map(m => ({
    id: m.id,
    nombre: m.nombre || '',
    codigo: m.codigo_maquina || '',
    marca: m.marca || '',
    modelo: m.modelo || '',
    numero_serie: m.numero_serie || '',
    fecha_compra: m.fecha_compra || '',
    tipo: m.tipo || '',
    ubicacion: m.ubicacion || '',
    descripcion: m.descripcion || '',
    orden: m.orden_visualizacion || 999,
    estado: m.estado_operativo || 'Disponible',
    programa_mantenimiento: m.programa_mantenimiento || '',
    imagenes: m.imagenes || [],
    archivos_adjuntos: m.archivos_adjuntos || [],
    procesos_configurados: m.procesos_configurados || [],
    _raw: m
  }));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MachineMasterDatabase.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machineMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['machinesMaster'] });
      setEditingMachine(null);
      toast.success("Máquina creada correctamente");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MachineMasterDatabase.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machineMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['machinesMaster'] });
      setEditingMachine(null);
      toast.success("Máquina actualizada correctamente");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MachineMasterDatabase.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machineMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['machinesMaster'] });
      setShowDeleteConfirm(null);
      toast.success("Máquina eliminada correctamente");
    },
  });

  const filteredMachines = useMemo(() => {
    let result = machines.filter(m => {
      const searchTerm = filters.searchTerm || "";
      const matchesSearch = !searchTerm || 
        m.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.ubicacion?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTipo = !filters.tipo || filters.tipo === 'all' || m.tipo === filters.tipo;
      
      return matchesSearch && matchesTipo;
    });

    if (filters.sortField) {
      result = [...result].sort((a, b) => {
        const aVal = a[filters.sortField];
        const bVal = b[filters.sortField];
        if (!aVal) return 1;
        if (!bVal) return -1;
        const comparison = String(aVal).localeCompare(String(bVal));
        return filters.sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [machines, filters]);

  const { currentPage, totalPages, paginatedItems, nextPage, prevPage } = usePagination(filteredMachines, 12);

  const handleSaveMachine = () => {
    if (!editingMachine.nombre || !editingMachine.codigo) {
      toast.error("Nombre y código son obligatorios");
      return;
    }

    const dataToSave = {
      nombre: editingMachine.nombre,
      codigo_maquina: editingMachine.codigo,
      marca: editingMachine.marca || "",
      modelo: editingMachine.modelo || "",
      numero_serie: editingMachine.numero_serie || "",
      fecha_compra: editingMachine.fecha_compra || "",
      tipo: editingMachine.tipo || "",
      ubicacion: editingMachine.ubicacion || "",
      orden_visualizacion: editingMachine.orden || 999
    };

    if (editingMachine.id) {
      updateMutation.mutate({ id: editingMachine.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const tiposUnicos = [...new Set(machines.map(m => m.tipo).filter(Boolean))];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Configuración
            </Button>
          </Link>
        </div>

        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Cog className="w-6 h-6 md:w-8 md:h-8 text-blue-600 dark:text-blue-400" />
              Archivo Maestro de Máquinas
            </h1>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-1">
              Gestión completa del catálogo de máquinas
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowOrderManager(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowUpDown className="w-4 h-4" />
              Ordenar Máquinas
            </Button>
            <Button
              onClick={() => setEditingMachine({ 
                nombre: "", 
                codigo: "", 
                marca: "",
                modelo: "",
                tipo: "",
                ubicacion: "",
                orden: machines.length + 1
              })}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Máquina
            </Button>
          </div>
        </div>

        <Card className="shadow-lg mb-6">
          <CardHeader className="border-b">
            <div className="flex justify-between items-center">
              <CardTitle>Máquinas ({filteredMachines.length})</CardTitle>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Página {currentPage} de {totalPages}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={prevPage} disabled={currentPage === 1}>Anterior</Button>
                    <Button size="sm" variant="outline" onClick={nextPage} disabled={currentPage === totalPages}>Siguiente</Button>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4">
              <AdvancedSearch
                data={machines}
                onFilterChange={setFilters}
                searchFields={['nombre', 'codigo', 'ubicacion']}
                filterOptions={{
                  tipo: {
                    label: 'Tipo',
                    options: tiposUnicos.map(t => ({ value: t, label: t }))
                  }
                }}
                sortOptions={[
                  { field: 'nombre', label: 'Nombre' },
                  { field: 'codigo', label: 'Código' },
                  { field: 'ubicacion', label: 'Ubicación' },
                  { field: 'orden', label: 'Orden' }
                ]}
                placeholder="Buscar por nombre, código o ubicación..."
                pageId="machine_master"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">Cargando máquinas...</div>
            ) : error ? (
              <div className="p-12 text-center text-red-500">Error: {error.message}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Código</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ubicación</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Marca/Modelo</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Orden</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {paginatedItems.map((machine) => (
                      <tr key={machine.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{machine.codigo}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{machine.nombre}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{machine.tipo || '-'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{machine.ubicacion || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {machine.marca && machine.modelo ? `${machine.marca} ${machine.modelo}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-slate-600">{machine.orden || 0}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedMachine(machine)}
                              title="Ver ficha completa"
                            >
                              <Eye className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingMachine({ ...machine })}
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowDeleteConfirm(machine)}
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Edición/Creación */}
      {editingMachine && (
        <Dialog open={true} onOpenChange={() => setEditingMachine(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMachine.id ? "Editar Máquina" : "Nueva Máquina"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código *</Label>
                  <Input
                    value={editingMachine.codigo}
                    onChange={(e) => setEditingMachine({ ...editingMachine, codigo: e.target.value })}
                    placeholder="Ej: MAQ-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={editingMachine.nombre}
                    onChange={(e) => setEditingMachine({ ...editingMachine, nombre: e.target.value })}
                    placeholder="Ej: Envasadora Principal"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Input
                    value={editingMachine.tipo || ""}
                    onChange={(e) => setEditingMachine({ ...editingMachine, tipo: e.target.value })}
                    placeholder="Ej: Sobres, Frascos"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ubicación</Label>
                  <Input
                    value={editingMachine.ubicacion || ""}
                    onChange={(e) => setEditingMachine({ ...editingMachine, ubicacion: e.target.value })}
                    placeholder="Ej: Nave A - Línea 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input
                    value={editingMachine.marca || ""}
                    onChange={(e) => setEditingMachine({ ...editingMachine, marca: e.target.value })}
                    placeholder="Ej: IMA"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Input
                    value={editingMachine.modelo || ""}
                    onChange={(e) => setEditingMachine({ ...editingMachine, modelo: e.target.value })}
                    placeholder="Ej: C65"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número de Serie</Label>
                  <Input
                    value={editingMachine.numero_serie || ""}
                    onChange={(e) => setEditingMachine({ ...editingMachine, numero_serie: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de Compra</Label>
                  <Input
                    type="date"
                    value={editingMachine.fecha_compra || ""}
                    onChange={(e) => setEditingMachine({ ...editingMachine, fecha_compra: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingMachine(null)}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleSaveMachine}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {createMutation.isPending || updateMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog de Confirmación de Eliminación */}
      {showDeleteConfirm && (
        <Dialog open={true} onOpenChange={() => setShowDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Eliminación</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-slate-600 dark:text-slate-400">
                ¿Estás seguro de que quieres eliminar la máquina <strong>{showDeleteConfirm.nombre}</strong>?
              </p>
              <p className="text-sm text-red-600 mt-2">
                Esta acción no se puede deshacer.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => deleteMutation.mutate(showDeleteConfirm.id)}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showOrderManager && (
        <Dialog open={true} onOpenChange={() => setShowOrderManager(false)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <MachineOrderManager />
          </DialogContent>
        </Dialog>
      )}

      {selectedMachine && (
        <MachineDetailCard 
          machine={selectedMachine} 
          onClose={() => setSelectedMachine(null)} 
        />
      )}
    </div>
  );
}