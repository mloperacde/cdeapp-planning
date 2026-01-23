import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { Plus, Edit, Trash2, CheckCircle2, AlertTriangle, Clock, Wrench, FileText, Play, Brain, Settings, Columns } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
 

import MaintenanceForm from "../components/maintenance/MaintenanceForm";
import MaintenanceTypeManager from "../components/maintenance/MaintenanceTypeManager";
import MaintenanceWorkOrder from "../components/maintenance/MaintenanceWorkOrder";
import PredictiveMaintenance from "../components/maintenance/PredictiveMaintenance";
import KanbanView from "../components/maintenance/KanbanView";
import AdvancedSearch from "../components/common/AdvancedSearch";

const EMPTY_ARRAY = [];

export default function MaintenanceTrackingPage() {
  const [currentTab, setCurrentTab] = useState('kanban');
  const [showForm, setShowForm] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState(null);
  const [filters, setFilters] = useState({});
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [showWorkOrder, setShowWorkOrder] = useState(null);
  const queryClient = useQueryClient();

  const { data: maintenances = EMPTY_ARRAY } = useQuery({
    queryKey: ['maintenances'],
    queryFn: () => base44.entities.MaintenanceSchedule.list('-fecha_programada'),
    initialData: EMPTY_ARRAY,
  });

  const { data: machines = EMPTY_ARRAY } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 500);
      return (Array.isArray(data) ? data : [])
        .sort((a, b) => (a.orden_visualizacion || 999) - (b.orden_visualizacion || 999));
    },
    staleTime: 15 * 60 * 1000,
    initialData: EMPTY_ARRAY,
  });

  const { data: employees = EMPTY_ARRAY } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    initialData: EMPTY_ARRAY,
  });

  const { data: maintenanceTypes = EMPTY_ARRAY } = useQuery({
    queryKey: ['maintenanceTypes'],
    queryFn: () => base44.entities.MaintenanceType.list(),
    initialData: EMPTY_ARRAY,
  });

  // Filtered maintenances
  const filteredMaintenances = React.useMemo(() => {
    let result = maintenances.filter(m => {
      const searchTerm = filters.searchTerm || "";
      const matchesSearch = !searchTerm || 
        m.tipo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getMachineName(m.machine_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getEmployeeName(m.tecnico_asignado).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = !filters.tipo || filters.tipo === 'all' || m.tipo === filters.tipo;
      const matchesPriority = !filters.prioridad || filters.prioridad === 'all' || m.prioridad === filters.prioridad;
      const matchesStatus = !filters.estado || filters.estado === 'all' || m.estado === filters.estado;

      return matchesSearch && matchesType && matchesPriority && matchesStatus;
    });

    if (filters.sortField) {
      result = [...result].sort((a, b) => {
        let aVal = a[filters.sortField];
        let bVal = b[filters.sortField];
        
        // Handle derived fields if needed
        
        if (!aVal) return 1;
        if (!bVal) return -1;
        
        const comparison = String(aVal).localeCompare(String(bVal));
        return filters.sortDirection === 'desc' ? -comparison : comparison;
      });
    }
    
    return result;
  }, [maintenances, filters, machines, employees]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, estado }) => base44.entities.MaintenanceSchedule.update(id, { 
      estado,
      fecha_inicio: estado === "En Proceso" ? new Date().toISOString() : undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
    },
  });

  const handleEdit = (maintenance) => {
    setEditingMaintenance(maintenance);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este mantenimiento?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleStartMaintenance = (maintenance) => {
    updateStatusMutation.mutate({ id: maintenance.id, estado: "En Proceso" });
    setShowWorkOrder(maintenance);
  };

  const handleOpenWorkOrder = (maintenance) => {
    setShowWorkOrder(maintenance);
  };

  const getMachineName = (machineId) => {
    const machine = machines.find(m => m.id === machineId);
    return machine ? (machine.descripcion || machine.nombre) : "Desconocida";
  };

  const getEmployeeName = (employeeId) => {
    if (!employeeId) return "Sin asignar";
    const emp = employees.find(e => e.id === employeeId);
    return emp?.nombre || "Sin asignar";
  };

  const getStatusBadge = (estado) => {
    const config = {
      "Pendiente": { icon: Clock, className: "bg-slate-100 text-slate-800" },
      "Programado": { icon: Clock, className: "bg-blue-100 text-blue-800" },
      "En Proceso": { icon: Wrench, className: "bg-orange-100 text-orange-800" },
      "Completado": { icon: CheckCircle2, className: "bg-green-100 text-green-800" },
      "Cancelado": { icon: AlertTriangle, className: "bg-red-100 text-red-800" },
    }[estado] || { icon: Clock, className: "bg-slate-100 text-slate-800" };

    const Icon = config.icon;
    
    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {estado}
      </Badge>
    );
  };

  const getPriorityBadge = (prioridad) => {
    const className = {
      "Urgente": "bg-red-600",
      "Alta": "bg-orange-600",
      "Media": "bg-blue-600",
      "Baja": "bg-green-600",
    }[prioridad] || "bg-slate-600";

    return <Badge className={className}>{prioridad}</Badge>;
  };

  const upcomingMaintenances = maintenances.filter(m => 
    m.estado === "Pendiente" || m.estado === "Programado"
  );

  const activeMaintenances = maintenances.filter(m => m.estado === "En Proceso");

  const completedMaintenances = maintenances.filter(m => m.estado === "Completado");

  const alertMaintenances = maintenances.filter(m => {
    if (m.estado !== "Pendiente" && m.estado !== "Programado") return false;
    const daysUntil = (new Date(m.fecha_programada) - new Date()) / (1000 * 60 * 60 * 24);
    return daysUntil <= 7;
  });

  const renderMaintenanceTable = (maintenanceList) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 dark:bg-slate-800/50">
            <TableHead>Máquina</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Fecha Programada</TableHead>
            <TableHead>Técnico</TableHead>
            <TableHead>Prioridad</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {maintenanceList.map((maintenance) => (
            <TableRow key={maintenance.id} className="hover:bg-slate-50 dark:bg-slate-800/50">
              <TableCell className="font-medium">{getMachineName(maintenance.machine_id)}</TableCell>
              <TableCell>{maintenance.tipo}</TableCell>
              <TableCell>
                {format(new Date(maintenance.fecha_programada), "dd/MM/yyyy HH:mm", { locale: es })}
              </TableCell>
              <TableCell>{getEmployeeName(maintenance.tecnico_asignado)}</TableCell>
              <TableCell>{getPriorityBadge(maintenance.prioridad)}</TableCell>
              <TableCell>{getStatusBadge(maintenance.estado)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {(maintenance.estado === "Pendiente" || maintenance.estado === "Programado") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStartMaintenance(maintenance)}
                      title="Iniciar mantenimiento"
                    >
                      <Play className="w-4 h-4 text-green-600" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenWorkOrder(maintenance)}
                    title="Ver orden de trabajo"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(maintenance)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(maintenance.id)}
                    className="hover:bg-red-50 dark:bg-red-900/20 hover:text-red-600"
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
  );

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">

        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Wrench className="w-8 h-8 text-blue-600" />
              Seguimiento de Mantenimiento
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Gestiona mantenimientos programados y no programados
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowTypeManager(true)}
              variant="outline"
              className="border-purple-200 hover:bg-purple-50"
            >
              <Settings className="w-4 h-4 mr-2" />
              Tipos de Mantenimiento
            </Button>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Mantenimiento
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-700 dark:text-orange-200 font-medium">Pendientes</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{upcomingMaintenances.length}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 dark:text-red-200 font-medium">Alertas Activas</p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100">{alertMaintenances.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-200 font-medium">En Proceso</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{activeMaintenances.length}</p>
                </div>
                <Wrench className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 dark:text-green-200 font-medium">Completados</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{completedMaintenances.length}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="kanban">
              <Columns className="w-4 h-4 mr-2" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="upcoming">Próximos</TabsTrigger>
            <TabsTrigger value="alerts">Alertas</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
            <TabsTrigger value="predictive">
              <Brain className="w-4 h-4 mr-2" />
              Predictivo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban">
            <KanbanView
              maintenances={maintenances}
              machines={machines}
              employees={employees}
              onOpenWorkOrder={setShowWorkOrder}
            />
          </TabsContent>

          <TabsContent value="all">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="mb-6">
                  <AdvancedSearch
                    data={maintenances}
                    onFilterChange={setFilters}
                    searchFields={['tipo']}
                    filterOptions={{
                      tipo: {
                        label: 'Tipo',
                        options: maintenanceTypes.map(t => ({ value: t.nombre, label: t.nombre }))
                      },
                      prioridad: {
                        label: 'Prioridad',
                        options: ['Baja', 'Media', 'Alta', 'Urgente'].map(p => ({ value: p, label: p }))
                      },
                      estado: {
                        label: 'Estado',
                        options: ['Pendiente', 'Programado', 'En Proceso', 'Completado'].map(e => ({ value: e, label: e }))
                      }
                    }}
                    placeholder="Buscar por máquina, técnico o tipo..."
                    pageId="maintenance_tracking"
                  />
                </div>
                {filteredMaintenances.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                    No se encontraron mantenimientos con los filtros seleccionados
                  </div>
                ) : (
                  renderMaintenanceTable(filteredMaintenances)
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upcoming">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6">
                {upcomingMaintenances.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                    No hay mantenimientos próximos
                  </div>
                ) : (
                  renderMaintenanceTable(upcomingMaintenances)
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6">
                {alertMaintenances.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                    <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-400" />
                    No hay alertas activas
                  </div>
                ) : (
                  renderMaintenanceTable(alertMaintenances)
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6">
                {completedMaintenances.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                    No hay historial de mantenimientos
                  </div>
                ) : (
                  renderMaintenanceTable(completedMaintenances)
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="predictive">
            <PredictiveMaintenance />
          </TabsContent>
        </Tabs>
      </div>

      {showForm && (
        <MaintenanceForm
          maintenance={editingMaintenance}
          machines={machines}
          employees={employees}
          maintenanceTypes={maintenanceTypes}
          onClose={() => {
            setShowForm(false);
            setEditingMaintenance(null);
          }}
        />
      )}

      {showTypeManager && (
        <MaintenanceTypeManager
          open={showTypeManager}
          onOpenChange={setShowTypeManager}
          machines={machines}
        />
      )}

      {showWorkOrder && (
        <MaintenanceWorkOrder
          maintenance={showWorkOrder}
          machines={machines}
          employees={employees}
          maintenanceTypes={maintenanceTypes}
          onClose={() => setShowWorkOrder(null)}
        />
      )}
    </div>
  );
}
