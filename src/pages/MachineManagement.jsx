import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cog, Power, PowerOff, Package, Search, CheckCircle2, XCircle, AlertCircle, Activity, TrendingUp, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useDebounce } from "../components/utils/useDebounce";
import { usePagination } from "../components/utils/usePagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MachineManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStatus, setEditingStatus] = useState(null);
  const queryClient = useQueryClient();

  const { data: machines = [], isLoading: loadingMachines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
    staleTime: 10 * 60 * 1000,
  });

  const { data: machineStatuses = [] } = useQuery({
    queryKey: ['machineStatuses'],
    queryFn: () => base44.entities.MachineStatus.list(),
    staleTime: 1 * 60 * 1000,
    refetchInterval: 30000,
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ machineId, statusData }) => {
      const existing = machineStatuses.find(ms => ms.machine_id === machineId);
      
      if (existing) {
        return base44.entities.MachineStatus.update(existing.id, statusData);
      }
      return base44.entities.MachineStatus.create({
        machine_id: machineId,
        ...statusData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machineStatuses'] });
      setEditingStatus(null);
    },
  });

  const getStatus = (machineId) => {
    return machineStatuses.find(ms => ms.machine_id === machineId) || {
      estado_disponibilidad: "Disponible",
      estado_produccion: "Sin orden"
    };
  };

  const debouncedSearch = useDebounce(searchTerm, 300);

  const filteredMachines = useMemo(() => {
    return machines.filter(m => 
      m.nombre?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      m.codigo?.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [machines, debouncedSearch]);

  const { currentPage, totalPages, paginatedItems, goToPage, nextPage, prevPage } = usePagination(filteredMachines, 24);

  const handleQuickToggle = (machineId, currentDisp) => {
    const newDisp = currentDisp === "Disponible" ? "No disponible" : "Disponible";
    updateStatusMutation.mutate({
      machineId,
      statusData: {
        estado_disponibilidad: newDisp,
        fecha_actualizacion: new Date().toISOString()
      }
    });
  };

  const handleEditStatus = (machine) => {
    const status = getStatus(machine.id);
    setEditingStatus({
      machine,
      estado_disponibilidad: status.estado_disponibilidad || "Disponible",
      estado_produccion: status.estado_produccion || "Sin orden",
      notas_estado: status.notas_estado || "",
      articulo_en_curso: status.articulo_en_curso || "",
      lotes_producidos: status.lotes_producidos || 0,
      tiempo_ciclo_actual: status.tiempo_ciclo_actual || null,
      tiempo_ciclo_estandar: status.tiempo_ciclo_estandar || null,
      hora_inicio_produccion: status.hora_inicio_produccion || "",
      alerta_desviacion: status.alerta_desviacion || false,
      motivo_desviacion: status.motivo_desviacion || "",
    });
  };

  const handleSaveStatus = () => {
    if (!editingStatus) return;
    
    const statusData = {
      estado_disponibilidad: editingStatus.estado_disponibilidad,
      estado_produccion: editingStatus.estado_produccion,
      notas_estado: editingStatus.notas_estado,
      articulo_en_curso: editingStatus.articulo_en_curso,
      lotes_producidos: editingStatus.lotes_producidos,
      tiempo_ciclo_actual: editingStatus.tiempo_ciclo_actual,
      tiempo_ciclo_estandar: editingStatus.tiempo_ciclo_estandar,
      hora_inicio_produccion: editingStatus.hora_inicio_produccion,
      motivo_desviacion: editingStatus.motivo_desviacion,
      fecha_actualizacion: new Date().toISOString()
    };

    // Auto-detectar alertas
    if (editingStatus.tiempo_ciclo_actual && editingStatus.tiempo_ciclo_estandar) {
      const desviacion = ((editingStatus.tiempo_ciclo_actual - editingStatus.tiempo_ciclo_estandar) / editingStatus.tiempo_ciclo_estandar) * 100;
      statusData.alerta_desviacion = desviacion > 20;
      if (desviacion > 20 && !statusData.motivo_desviacion) {
        statusData.motivo_desviacion = `Tiempo de ciclo ${desviacion.toFixed(1)}% por encima del estándar`;
      }
    } else {
      statusData.alerta_desviacion = false;
    }
    
    updateStatusMutation.mutate({
      machineId: editingStatus.machine.id,
      statusData
    });
  };

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Cog className="w-8 h-8 text-blue-600" />
            Gestión de Estados de Máquinas
          </h1>
          <p className="text-slate-600 mt-1">
            Control de disponibilidad y órdenes de producción
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Total Máquinas</p>
                  <p className="text-2xl font-bold text-blue-900">{filteredMachines.length}</p>
                </div>
                <Cog className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Disponibles</p>
                  <p className="text-2xl font-bold text-green-900">{availableCount}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-700 font-medium">Con Órdenes</p>
                  <p className="text-2xl font-bold text-orange-900">{ordenesCount}</p>
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
                    <span className="text-sm text-slate-600">Página {currentPage} de {totalPages}</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={prevPage} disabled={currentPage === 1}>Anterior</Button>
                      <Button size="sm" variant="outline" onClick={nextPage} disabled={currentPage === totalPages}>Siguiente</Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar máquina..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingMachines ? (
              <div className="p-12 text-center text-slate-500">Cargando...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                {paginatedItems.map(machine => {
                  const status = getStatus(machine.id);
                  const isAvailable = status.estado_disponibilidad === "Disponible";
                  const prodStatus = status.estado_produccion;
                  
                  return (
                    <Card 
                      key={machine.id} 
                      className={`border-2 transition-all cursor-pointer ${
                        isAvailable ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                      }`}
                      onClick={() => handleEditStatus(machine)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-slate-900">{machine.nombre}</h3>
                            <p className="text-xs text-slate-600">{machine.codigo}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickToggle(machine.id, status.estado_disponibilidad);
                            }}
                            disabled={updateStatusMutation.isPending}
                          >
                            {isAvailable ? (
                              <Power className="w-5 h-5 text-green-600" />
                            ) : (
                              <PowerOff className="w-5 h-5 text-red-600" />
                            )}
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600">Disponibilidad</span>
                            <Badge className={isAvailable ? "bg-green-600" : "bg-red-600"}>
                              {status.estado_disponibilidad}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600">Producción</span>
                            <Badge variant="outline" className={
                              prodStatus === "Orden en curso" ? "bg-blue-100 text-blue-800" :
                              prodStatus === "Orden nueva" ? "bg-purple-100 text-purple-800" :
                              "bg-slate-100 text-slate-600"
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

      {editingStatus && (
        <Dialog open={true} onOpenChange={() => setEditingStatus(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Estado: {editingStatus.machine.nombre}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Estado de Disponibilidad</Label>
                <Select
                  value={editingStatus.estado_disponibilidad}
                  onValueChange={(value) => setEditingStatus({
                    ...editingStatus,
                    estado_disponibilidad: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Disponible">Disponible</SelectItem>
                    <SelectItem value="No disponible">No disponible</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado de Producción</Label>
                <Select
                  value={editingStatus.estado_produccion}
                  onValueChange={(value) => setEditingStatus({
                    ...editingStatus,
                    estado_produccion: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sin orden">Sin orden</SelectItem>
                    <SelectItem value="Orden nueva">Orden nueva</SelectItem>
                    <SelectItem value="Orden en curso">Orden en curso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={editingStatus.notas_estado || ""}
                  onChange={(e) => setEditingStatus({
                    ...editingStatus,
                    notas_estado: e.target.value
                  })}
                  rows={3}
                  placeholder="Notas sobre el estado actual..."
                />
              </div>

              {editingStatus.estado_produccion !== "Sin orden" && (
                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    Datos de Producción en Tiempo Real
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Artículo en Curso</Label>
                      <Select
                        value={editingStatus.articulo_en_curso}
                        onValueChange={(value) => setEditingStatus({ ...editingStatus, articulo_en_curso: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar artículo" />
                        </SelectTrigger>
                        <SelectContent>
                          {articles.map(art => (
                            <SelectItem key={art.id} value={art.id}>
                              {art.nombre} ({art.codigo})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Lotes Producidos</Label>
                      <Input
                        type="number"
                        min="0"
                        value={editingStatus.lotes_producidos}
                        onChange={(e) => setEditingStatus({ ...editingStatus, lotes_producidos: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tiempo Ciclo Estándar (min)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editingStatus.tiempo_ciclo_estandar || ""}
                        onChange={(e) => setEditingStatus({ ...editingStatus, tiempo_ciclo_estandar: parseFloat(e.target.value) || null })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tiempo Ciclo Actual (min)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editingStatus.tiempo_ciclo_actual || ""}
                        onChange={(e) => setEditingStatus({ ...editingStatus, tiempo_ciclo_actual: parseFloat(e.target.value) || null })}
                      />
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label>Hora Inicio Producción</Label>
                      <Input
                        type="datetime-local"
                        value={editingStatus.hora_inicio_produccion}
                        onChange={(e) => setEditingStatus({ ...editingStatus, hora_inicio_produccion: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label>Motivo Desviación (si aplica)</Label>
                      <Input
                        value={editingStatus.motivo_desviacion}
                        onChange={(e) => setEditingStatus({ ...editingStatus, motivo_desviacion: e.target.value })}
                        placeholder="Ej: Parada por ajuste de máquina"
                      />
                    </div>
                  </div>

                  {editingStatus.tiempo_ciclo_actual && editingStatus.tiempo_ciclo_estandar && (
                    <div className={`p-3 rounded-lg ${
                      ((editingStatus.tiempo_ciclo_actual - editingStatus.tiempo_ciclo_estandar) / editingStatus.tiempo_ciclo_estandar * 100) > 20
                        ? 'bg-red-50 border-2 border-red-300'
                        : 'bg-green-50 border-2 border-green-300'
                    }`}>
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Desviación: {(((editingStatus.tiempo_ciclo_actual - editingStatus.tiempo_ciclo_estandar) / editingStatus.tiempo_ciclo_estandar) * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setEditingStatus(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveStatus}
                  disabled={updateStatusMutation.isPending}
                  className="bg-blue-600"
                >
                  {updateStatusMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}