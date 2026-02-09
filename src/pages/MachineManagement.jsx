import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Cog, 
  CheckCircle2, 
  Package, 
  ArrowLeft, 
  Eye, 
  Search, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getMachineAlias } from "@/utils/machineAlias";
import { usePagination } from "@/components/utils/usePagination";
import AdvancedSearch from "@/components/common/AdvancedSearch";
import MachineDetailCard from "@/components/machines/MachineDetailCard";

import { Input } from "@/components/ui/input";

const EMPTY_ARRAY = [];

export default function MachineManagement() {
  const [filters, setFilters] = useState({});
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [showFilters, setShowFilters] = useState(false);


  const { data: machines = EMPTY_ARRAY, isLoading: loadingMachines } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 500);
      const normalized = Array.isArray(data) ? data.map(m => {
        const alias = getMachineAlias(m);
        const codigo = (m.codigo_maquina || m.codigo || '').trim();
        
        return {
          id: m.id,
          alias: alias,
          descripcion: m.descripcion || '',
          codigo_maquina: codigo,
          tipo: m.tipo || '',
          orden_visualizacion: m.orden_visualizacion || 999,
          estado_disponibilidad: m.estado_disponibilidad || 'Disponible',
          estado_produccion: m.estado_produccion || 'Sin Producción'
        };
      }) : [];
      return normalized.sort((a, b) => (a.orden_visualizacion || 999) - (b.orden_visualizacion || 999));
    },
    staleTime: 15 * 60 * 1000,
    initialData: EMPTY_ARRAY,
  });

  // Vista de solo lectura: usar exclusivamente estado desde MachineMasterDatabase

  const filteredMachines = useMemo(() => {
    let result = machines.filter(m => {
      const searchTerm = filters.searchTerm || "";
      const matchesSearch = !searchTerm || 
        m.alias?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDisp = !filters.disponibilidad || filters.disponibilidad === 'all' || 
        m.estado_disponibilidad === filters.disponibilidad;
        
      const matchesProd = !filters.produccion || filters.produccion === 'all' || 
        m.estado_produccion === filters.produccion;

      return matchesSearch && matchesDisp && matchesProd;
    });

    if (filters.sortField) {
      result = [...result].sort((a, b) => {
        let aVal = a[filters.sortField];
        let bVal = b[filters.sortField];
        
        // campos directos del maestro

        if (!aVal) return 1;
        if (!bVal) return -1;
        
        const comparison = String(aVal).localeCompare(String(bVal));
        return filters.sortDirection === 'desc' ? -comparison : comparison;
      });
    } else {
      result = [...result].sort((a, b) => (a.orden || 999) - (b.orden || 999));
    }

    return result;
  }, [machines, filters]);

  const { currentPage, totalPages, paginatedItems, nextPage, prevPage } = usePagination(filteredMachines, 24);

  const availableCount = filteredMachines.filter(m => 
    m.estado_disponibilidad === "Disponible"
  ).length;

  const ordenesCount = filteredMachines.filter(m => m.estado_produccion !== "Sin Producción").length;

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header Section Compact */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Cog className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Consulta de Máquinas
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Vista de estado y disponibilidad
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
            <Link to={createPageUrl("Configuration")}>
              <Button variant="ghost" size="sm" className="h-8">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Configuración
              </Button>
            </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 shrink-0">
        <Card className="p-3 flex items-center justify-between bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div>
                <p className="text-xs text-blue-700 dark:text-blue-200 font-medium">Total</p>
                <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{filteredMachines.length}</p>
            </div>
            <Cog className="w-6 h-6 text-blue-600" />
        </Card>

        <Card className="p-3 flex items-center justify-between bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div>
                <p className="text-xs text-green-700 dark:text-green-200 font-medium">Disponibles</p>
                <p className="text-xl font-bold text-green-900 dark:text-green-100">{availableCount}</p>
            </div>
            <CheckCircle2 className="w-6 h-6 text-green-600" />
        </Card>

        <Card className="p-3 flex items-center justify-between bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div>
                <p className="text-xs text-orange-700 dark:text-orange-200 font-medium">Con Órdenes</p>
                <p className="text-xl font-bold text-orange-900 dark:text-orange-100">{ordenesCount}</p>
            </div>
            <Package className="w-6 h-6 text-orange-600" />
        </Card>
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
            searchFields={['alias', 'descripcion', 'codigo_maquina']}
            filterOptions={{
              disponibilidad: {
                label: 'Disponibilidad',
                options: [
                  { value: 'Disponible', label: 'Disponible' },
                  { value: 'No disponible', label: 'No disponible' }
                ]
              },
              produccion: {
                label: 'Estado Producción',
                options: [
                  { value: 'En cambio', label: 'En cambio' },
                  { value: 'En producción', label: 'En producción' },
                  { value: 'Pendiente de Inicio', label: 'Pendiente de Inicio' },
                  { value: 'Sin Producción', label: 'Sin Producción' }
                ]
              }
            }}
            sortOptions={[
              { field: 'orden_visualizacion', label: 'Orden' },
              { field: 'alias', label: 'Alias' },
              { field: 'descripcion', label: 'Descripción' },
              { field: 'estado_disponibilidad', label: 'Disponibilidad' }
            ]}
            placeholder="Buscar por descripción, nombre o código..."
            pageId="machine_management"
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
            {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Pág {currentPage} de {totalPages}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="outline" className="h-6 w-6" onClick={prevPage} disabled={currentPage === 1}>
                        <ChevronDown className="h-3 w-3 rotate-90" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-6 w-6" onClick={nextPage} disabled={currentPage === totalPages}>
                        <ChevronDown className="h-3 w-3 -rotate-90" />
                    </Button>
                  </div>
                </div>
            )}
        </div>
        <div className="flex-1 overflow-auto p-4">
            {loadingMachines ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                 <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs">Cargando...</p>
                 </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {paginatedItems.map(machine => {
                  const isAvailable = machine.estado_disponibilidad === "Disponible";
                  const prodStatus = machine.estado_produccion;

                  return (
                    <Card 
                      key={machine.id} 
                      className={`border-2 transition-all ${
                        isAvailable ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-red-300 bg-red-50 dark:bg-red-900/20'
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate" title={machine.alias}>
                              {machine.alias}
                            </h3>
                            {machine.descripcion && machine.descripcion !== machine.alias && (
                                <p className="text-[10px] text-slate-500 mt-0.5 font-medium truncate">{machine.descripcion}</p>
                            )}
                          </div>
                          <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => setSelectedMachine(machine)}
                              title="Ver ficha completa"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                            </Button>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-600 dark:text-slate-400">Disponibilidad</span>
                            <Badge className={`text-[10px] h-4 px-1 ${isAvailable ? "bg-green-600" : "bg-red-600"}`}>
                              {machine.estado_disponibilidad}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-600 dark:text-slate-400">Producción</span>
                            <Badge variant="outline" className={`text-[9px] h-4 px-1 max-w-[120px] truncate ${
                              prodStatus === "En producción" ? "bg-blue-100 text-blue-800" :
                              prodStatus === "Pendiente de Inicio" ? "bg-purple-100 text-purple-800" :
                              prodStatus === "En cambio" ? "bg-amber-100 text-amber-800" :
                              "bg-slate-100 text-slate-600 dark:text-slate-400"
                            }`}>
                              {prodStatus}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
        </div>
      </Card>

      {selectedMachine && (
        <MachineDetailCard 
          machine={selectedMachine} 
          onClose={() => setSelectedMachine(null)} 
          canEdit={false}
        />
      )}
    </div>
  );
}
