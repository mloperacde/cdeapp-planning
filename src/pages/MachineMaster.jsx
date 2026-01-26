import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Cog, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  ArrowLeft, 
  ArrowUpDown, 
  Search, 
  ChevronDown, 
  ChevronUp,
  Columns,
  RefreshCw,
  Download
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import MachineDetailCard from "../components/machines/MachineDetailCard";
import MachineOrderManager from "../components/machines/MachineOrderManager";
import AdvancedSearch from "../components/common/AdvancedSearch";
import { usePagination } from "../components/utils/usePagination";
import { cdeApi } from "@/services/cdeApi";

import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const EMPTY_ARRAY = [];

export default function MachineMasterPage() {
  const [filters, setFilters] = useState({});
  const [showOrderManager, setShowOrderManager] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [selectedMachineEditMode, setSelectedMachineEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const handleSyncMachines = async () => {
    try {
      setIsSyncing(true);
      toast.info("Conectando con cdeapp.es...");
      
      const response = await cdeApi.getMachines();
      
      if (!response.success || !Array.isArray(response.data)) {
        throw new Error("Respuesta inválida de la API");
      }

      const apiMachines = response.data;
      let created = 0;
      let updated = 0;
      
      toast.loading(`Procesando ${apiMachines.length} máquinas...`, { id: 'sync-machines' });

      // Process sequentially to avoid overwhelming the backend
      for (const apiMachine of apiMachines) {
        // Match by id_base44 (external_id) or codigo
        const existing = rawMachines.find(m => 
          (m.id_base44 && String(m.id_base44) === String(apiMachine.external_id)) || 
          (m.codigo_maquina === apiMachine.codigo)
        );

        // MAPEO ESTRICTO: Solo actualizamos identificación, ubicación y datos técnicos básicos.
        // Se preservan explícitamente: Mantenimiento, Imágenes, Archivos, Notas, etc.
        const machineData = {
          id_base44: apiMachine.external_id,      // ID Externo
          codigo_maquina: apiMachine.codigo,      // Código
          nombre: apiMachine.nombre,              // Nombre / Denominación
          tipo: apiMachine.tipo,                  // Tipo de Máquina
          cadencia: apiMachine.cadencia,          // Velocidad
          ubicacion: apiMachine.sala,             // Sala / Ubicación
          
          // Mapeo de estados simple
          estado_operativo: apiMachine.estado === 'Activo' ? 'Disponible' : 'Inactivo',
          nozzle: apiMachine.nozzle,
        };

        if (existing) {
          // UPDATE: Al usar .update(), Base44 solo modifica los campos enviados.
          // El resto de campos (mantenimiento, imagenes, etc.) permanecen INTACTOS.
          await base44.entities.MachineMasterDatabase.update(existing.id, machineData);
          updated++;
        } else {
          // CREATE: Solo para nuevas máquinas, establecemos valores por defecto seguros
          await base44.entities.MachineMasterDatabase.create({
             ...machineData,
             descripcion: apiMachine.nombre, // Descripción inicial igual al nombre
             orden_visualizacion: 999,
             estado_produccion: 'Sin Producción',
             estado_disponibilidad: 'Disponible',
             imagenes: [],
             archivos_adjuntos: [],
             programa_mantenimiento: ''
          });
          created++;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['machineMasterDatabase'] });
      toast.dismiss('sync-machines');
      toast.success(`Sincronización: ${created} creadas, ${updated} actualizadas`);

    } catch (error) {
      console.error("Sync error:", error);
      toast.dismiss('sync-machines');
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

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
    id_base44: m.id_base44 || '',
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
    estado_produccion: m.estado_produccion || 'Sin Producción',
    estado_disponibilidad: m.estado_disponibilidad || 'Disponible',
    programa_mantenimiento: m.programa_mantenimiento || '',
    imagenes: m.imagenes || [],
    archivos_adjuntos: m.archivos_adjuntos || [],
    procesos_configurados: m.procesos_configurados || [],
    _raw: m
  }));

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
        m.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  // const { currentPage, totalPages, paginatedItems, nextPage, prevPage } = usePagination(filteredMachines, 12);
  const paginatedItems = filteredMachines;
  const totalPages = 1;
  const currentPage = 1;
  const nextPage = () => {};
  const prevPage = () => {};

  const tiposUnicos = [...new Set(machines.map(m => m.tipo).filter(Boolean))];


  return (
    <div className="h-full flex flex-col p-2 gap-2 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header Section Compact */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Cog className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Archivo Maestro de Máquinas
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Gestión completa del catálogo de máquinas
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
            <Button
              onClick={handleSyncMachines}
              disabled={isSyncing}
              variant="outline"
              size="sm"
              className="h-8 flex items-center gap-2 border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700"
              title="Sincronizar con cdeapp.es"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </Button>
            <Link to={createPageUrl("Configuration")}>
              <Button variant="ghost" size="sm" className="h-8">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Configuración
              </Button>
            </Link>
            <Button
              onClick={() => setShowOrderManager(true)}
              variant="outline"
              size="sm"
              className="h-8 flex items-center gap-2"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              Ordenar
            </Button>
            <Button
              onClick={() => {
                setSelectedMachine({
                  id: undefined,
                  nombre: "",
                  codigo: "",
                  marca: "",
                  modelo: "",
                  tipo: "",
                  ubicacion: "",
                  orden: machines.length + 1,
                  estado_produccion: "Sin Producción",
                  estado_disponibilidad: "Disponible",
                  descripcion: "",
                  imagenes: [],
                  archivos_adjuntos: []
                });
                setSelectedMachineEditMode(true);
              }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-2" />
              Nueva Máquina
            </Button>
        </div>
      </div>

      {/* Toolbar Section */}
      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Buscar máquina por descripción, nombre, código..."
            className="pl-9 h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            value={filters.searchTerm || ""}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-9 px-3 ${showFilters ? 'bg-slate-100 dark:bg-slate-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
          >
            <Search className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">{showFilters ? 'Ocultar Filtros' : 'Filtros'}</span>
            {showFilters ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm shrink-0 animate-in slide-in-from-top-2 duration-200">
          <AdvancedSearch
            data={machines}
            onFilterChange={setFilters}
            searchFields={['descripcion', 'nombre', 'codigo', 'ubicacion']}
            filterOptions={{
              tipo: {
                label: 'Tipo',
                options: tiposUnicos.map(t => ({ value: t, label: t }))
              }
            }}
            sortOptions={[
              { field: 'descripcion', label: 'Descripción' },
              { field: 'nombre', label: 'Nombre' },
              { field: 'codigo', label: 'Código' },
              { field: 'ubicacion', label: 'Ubicación' },
              { field: 'orden', label: 'Orden' }
            ]}
            placeholder="Buscar..."
            pageId="machine_master"
            enableSearch={false}
            currentSearchTerm={filters.searchTerm || ""}
          />
        </Card>
      )}

      {/* Main Content Area */}
      <Card className="flex-1 flex flex-col min-h-0 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between p-2 border-b border-slate-100 dark:border-slate-800/50">
            <div className="text-xs text-slate-500 font-medium px-2">
                Total: <span className="text-slate-900 dark:text-slate-200">{filteredMachines.length}</span> máquinas
            </div>
        </div>
        <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="flex flex-col items-center gap-2">
                   <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-xs">Cargando máquinas...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-500">
                  <p>Error: {error.message}</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-sm">
                  <tr>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider w-1/3">Descripción</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Código</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ubicación</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Marca/Modelo</th>
                    <th className="px-4 py-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Orden</th>
                    <th className="px-4 py-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {paginatedItems.map((machine) => (
                    <tr key={machine.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="px-4 py-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">{machine.descripcion || machine.nombre}</span>
                        {machine.descripcion && machine.descripcion !== machine.nombre && (
                          <span className="text-[10px] text-slate-500 block mt-0.5">{machine.nombre}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{machine.codigo}</span>
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">{machine.tipo || '-'}</Badge>
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400">{machine.ubicacion || '-'}</td>
                      <td className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400">
                        {machine.marca && machine.modelo ? `${machine.marca} ${machine.modelo}` : '-'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono">{machine.orden || 0}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { setSelectedMachine(machine); setSelectedMachineEditMode(false); }}
                            title="Ver ficha completa"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { setSelectedMachine(machine); setSelectedMachineEditMode(true); }}
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setShowDeleteConfirm(machine)}
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </Card>


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
          initialEditMode={selectedMachineEditMode}
          isNew={!selectedMachine?.id}
        />
      )}
    </div>
  );
}
