import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Cog, CheckCircle2, Package, ArrowLeft, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { usePagination } from "@/components/utils/usePagination";
import AdvancedSearch from "@/components/common/AdvancedSearch";
import MachineDetailCard from "@/components/machines/MachineDetailCard";
const EMPTY_ARRAY = [];

export default function MachineManagement() {
  const [filters, setFilters] = useState({});
  const [selectedMachine, setSelectedMachine] = useState(null);
  const queryClient = useQueryClient();

  const { data: machines = EMPTY_ARRAY, isLoading: loadingMachines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
    staleTime: 10 * 60 * 1000,
    initialData: EMPTY_ARRAY,
  });

  const { data: machineStatuses = EMPTY_ARRAY } = useQuery({
    queryKey: ['machineStatuses'],
    queryFn: () => base44.entities.MachineStatus.list(),
    staleTime: 1 * 60 * 1000,
    refetchInterval: 30000,
    initialData: EMPTY_ARRAY,
  });



  const getStatus = (machineId) => {
    return machineStatuses.find(ms => ms.machine_id === machineId) || {
      estado_disponibilidad: "Disponible",
      estado_produccion: "Sin orden"
    };
  };

  const filteredMachines = useMemo(() => {
    let result = machines.filter(m => {
      const searchTerm = filters.searchTerm || "";
      const matchesSearch = !searchTerm || 
        m.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.codigo?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const status = getStatus(m.id);
      const matchesDisp = !filters.disponibilidad || filters.disponibilidad === 'all' || 
        status.estado_disponibilidad === filters.disponibilidad;
        
      const matchesProd = !filters.produccion || filters.produccion === 'all' || 
        status.estado_produccion === filters.produccion;

      return matchesSearch && matchesDisp && matchesProd;
    });

    if (filters.sortField) {
      result = [...result].sort((a, b) => {
        let aVal = a[filters.sortField];
        let bVal = b[filters.sortField];
        
        if (filters.sortField === 'estado_disponibilidad' || filters.sortField === 'estado_produccion') {
          aVal = getStatus(a.id)[filters.sortField];
          bVal = getStatus(b.id)[filters.sortField];
        }

        if (!aVal) return 1;
        if (!bVal) return -1;
        
        const comparison = String(aVal).localeCompare(String(bVal));
        return filters.sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [machines, filters, machineStatuses]);

  const { currentPage, totalPages, paginatedItems, goToPage, nextPage, prevPage } = usePagination(filteredMachines, 24);

  const availableCount = filteredMachines.filter(m => 
    getStatus(m.id).estado_disponibilidad === "Disponible"
  ).length;

  const ordenesCount = filteredMachines.filter(m => {
    const status = getStatus(m.id);
    return status.estado_produccion === "Orden en curso" || status.estado_produccion === "Orden nueva";
  }).length;

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Configuración
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <Cog className="w-8 h-8 text-blue-600" />
            Consulta de Máquinas
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Vista de estado y disponibilidad de máquinas (Solo lectura)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-200 font-medium">Total Máquinas</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{filteredMachines.length}</p>
                </div>
                <Cog className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 dark:text-green-200 font-medium">Disponibles</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{availableCount}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-700 dark:text-orange-200 font-medium">Con Órdenes</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{ordenesCount}</p>
                </div>
                <Package className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg mb-6">
          <CardHeader className="border-b">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
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
            </div>
            <div className="mt-4">
              <AdvancedSearch
                data={machines}
                onFilterChange={setFilters}
                searchFields={['nombre', 'codigo']}
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
                      { value: 'Sin orden', label: 'Sin orden' },
                      { value: 'Orden nueva', label: 'Orden nueva' },
                      { value: 'Orden en curso', label: 'Orden en curso' }
                    ]
                  }
                }}
                sortOptions={[
                  { field: 'nombre', label: 'Nombre' },
                  { field: 'codigo', label: 'Código' },
                  { field: 'estado_disponibilidad', label: 'Disponibilidad' }
                ]}
                placeholder="Buscar por nombre o código..."
                pageId="machine_management"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingMachines ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">Cargando...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                {paginatedItems.map(machine => {
                  const status = getStatus(machine.id);
                  const isAvailable = status.estado_disponibilidad === "Disponible";
                  const prodStatus = status.estado_produccion;

                  return (
                    <Card 
                      key={machine.id} 
                      className={`border-2 transition-all ${
                        isAvailable ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-red-300 bg-red-50 dark:bg-red-900/20'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100">{machine.nombre}</h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{machine.codigo}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedMachine(machine)}
                              title="Ver ficha completa"
                            >
                              <Eye className="w-5 h-5 text-blue-600" />
                            </Button>

                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 dark:text-slate-400">Disponibilidad</span>
                            <Badge className={isAvailable ? "bg-green-600" : "bg-red-600"}>
                              {status.estado_disponibilidad}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 dark:text-slate-400">Producción</span>
                            <Badge variant="outline" className={
                              prodStatus === "Orden en curso" ? "bg-blue-100 text-blue-800" :
                              prodStatus === "Orden nueva" ? "bg-purple-100 text-purple-800" :
                              "bg-slate-100 text-slate-600 dark:text-slate-400"
                            }>
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
          </CardContent>
        </Card>
      </div>

      {selectedMachine && (
        <MachineDetailCard 
          machine={selectedMachine} 
          onClose={() => setSelectedMachine(null)} 
        />
      )}
    </div>
  );
}