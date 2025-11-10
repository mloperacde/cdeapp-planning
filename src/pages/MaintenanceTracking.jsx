
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Removed Dialog components as they are now encapsulated in MaintenanceForm, MaintenanceTypeManager, MaintenanceWorkOrder
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wrench, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  History,
  Bell,
  TrendingUp,
  Settings, // Added Settings icon
  ClipboardList // Added ClipboardList icon
} from "lucide-react";
import { format, differenceInDays, addDays, isBefore } from "date-fns";
import { es } from "date-fns/locale";

// New imports for components
import MaintenanceForm from "../components/maintenance/MaintenanceForm";
import MaintenanceTypeManager from "../components/maintenance/MaintenanceTypeManager";
import MaintenanceWorkOrder from "../components/maintenance/MaintenanceWorkOrder";

export default function MaintenanceTrackingPage() {
  const [showForm, setShowForm] = useState(false);
  const [showTypeManager, setShowTypeManager] = useState(false); // New state
  const [showWorkOrder, setShowWorkOrder] = useState(false); // New state
  const [editingMaintenance, setEditingMaintenance] = useState(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState(null); // New state for work order
  const [currentTab, setCurrentTab] = useState("all"); // New state to manage active tab
  // Removed filterStatus and filterMachine states as filtering is handled by tabs
  const queryClient = useQueryClient();

  // Removed formData state as it's now handled by MaintenanceForm

  const { data: maintenances, isLoading } = useQuery({
    queryKey: ['maintenances'], // Changed query key
    queryFn: () => base44.entities.MaintenanceSchedule.list('-fecha_programada'),
    initialData: [],
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('codigo'), // Using 'codigo' as sort field
    initialData: [],
  });

  const { data: employees } = useQuery({ // New query for employees
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const { data: maintenanceTypes } = useQuery({ // New query for maintenance types
    queryKey: ['maintenanceTypes'],
    queryFn: () => base44.entities.MaintenanceType.list(),
    initialData: [],
  });

  // Removed saveMutation as it's now handled within MaintenanceForm

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] }); // Updated query key
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }) => { // Changed mutationFn signature to accept data object
      return base44.entities.MaintenanceSchedule.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] }); // Updated query key
    },
  });

  const handleEdit = (maintenance) => {
    setEditingMaintenance(maintenance);
    setShowForm(true);
  };

  // Removed handleClose as it's now handled by the individual dialog components

  // Removed handleSubmit as it's now handled by MaintenanceForm

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este mantenimiento?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleStartMaintenance = (maintenance) => {
    updateStatusMutation.mutate({
      id: maintenance.id,
      data: {
        estado: "En Progreso",
        fecha_inicio: new Date().toISOString(),
      }
    });
  };

  const handleOpenWorkOrder = (maintenance) => { // New handler for work order
    setSelectedMaintenance(maintenance);
    setShowWorkOrder(true);
  };

  const getMachineName = (machineId) => {
    const machine = machines.find(m => m.id === machineId);
    return machine ? `${machine.codigo} - ${machine.nombre}` : "Máquina desconocida";
  };

  const getEmployeeName = (employeeId) => { // New helper function
    const employee = employees.find(e => e.id === employeeId);
    return employee ? employee.nombre : "No asignado";
  };

  const getStatusIcon = (estado) => {
    switch (estado) {
      case "Pendiente": return <Clock className="w-4 h-4" />;
      case "En Progreso": return <PlayCircle className="w-4 h-4" />;
      case "Completado": return <CheckCircle2 className="w-4 h-4" />;
      case "Cancelado": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Renamed and modified getStatusColor to getStatusBadge
  const getStatusBadge = (estado) => {
    let colorClass = "bg-slate-100 text-slate-600";
    switch (estado) {
      case "Pendiente": colorClass = "bg-yellow-100 text-yellow-800"; break;
      case "En Progreso": colorClass = "bg-blue-100 text-blue-800"; break;
      case "Completado": colorClass = "bg-green-100 text-green-800"; break;
      case "Cancelado": colorClass = "bg-slate-100 text-slate-600"; break;
    }
    return (
      <Badge className={colorClass}>
        {getStatusIcon(estado)}
        <span className="ml-1">{estado}</span>
      </Badge>
    );
  };

  // Renamed and modified getPriorityColor to getPriorityBadge
  const getPriorityBadge = (prioridad) => {
    let colorClass = "bg-slate-100 text-slate-600";
    switch (prioridad) {
      case "Baja": colorClass = "bg-green-100 text-green-800"; break;
      case "Media": colorClass = "bg-yellow-100 text-yellow-800"; break;
      case "Alta": colorClass = "bg-orange-100 text-orange-800"; break;
      case "Urgente": colorClass = "bg-red-100 text-red-800"; break;
    }
    return <Badge className={colorClass}>{prioridad}</Badge>;
  };

  // Removed old filteredMaintenances as tabs handle the main filtering now

  const upcomingMaintenances = useMemo(() => {
    // Filter for all pending maintenances, then sort by scheduled date
    return maintenances
      .filter(m => m.estado === "Pendiente")
      .sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada));
  }, [maintenances]);

  const activeAlerts = useMemo(() => {
    const now = new Date();
    return maintenances.filter(m => {
      // Check if alert is active and maintenance is pending
      if (m.alerta_activa !== true || m.estado !== "Pendiente") return false;
      const scheduledDate = new Date(m.fecha_programada);
      const daysUntil = differenceInDays(scheduledDate, now);
      // An alert is active if it's due soon (within dias_anticipacion_alerta) or overdue
      return daysUntil <= (m.dias_anticipacion_alerta || 7);
    }).sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada));
  }, [maintenances]);

  const completedMaintenances = useMemo(() => {
    return maintenances.filter(m => m.estado === "Completado");
  }, [maintenances]);

  const filteredMaintenances = useMemo(() => { // New memo to filter based on currentTab
    switch (currentTab) {
      case "all":
        return maintenances;
      case "upcoming":
        return upcomingMaintenances;
      case "alerts":
        return activeAlerts;
      case "history":
        return completedMaintenances;
      default:
        return maintenances;
    }
  }, [currentTab, maintenances, upcomingMaintenances, activeAlerts, completedMaintenances]);

  // Removed stats useMemo as the outline uses simpler card stats directly

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Wrench className="w-8 h-8 text-blue-600" />
              Seguimiento de Mantenimiento
            </h1>
            <p className="text-slate-600 mt-1">
              Gestiona el mantenimiento planificado y reparaciones
            </p>
          </div>
          <div className="flex gap-2"> {/* Added div for buttons */}
            <Button
              onClick={() => setShowTypeManager(true)} // New button for type manager
              variant="outline"
              className="bg-white hover:bg-purple-50 border-purple-200"
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

        {/* Simplified Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"> {/* Changed grid layout */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Pendientes</p>
                  <p className="text-2xl font-bold text-blue-900">{upcomingMaintenances.length}</p>
                </div>
                <Wrench className="w-8 h-8 text-blue-600" /> {/* Changed icon */}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 font-medium">Alertas Activas</p>
                  <p className="text-2xl font-bold text-red-900">{activeAlerts.length}</p>
                </div>
                <Bell className="w-8 h-8 text-red-600" /> {/* Changed icon */}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Completados</p>
                  <p className="text-2xl font-bold text-green-900">{completedMaintenances.length}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" /> {/* Changed icon */}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unified Tabs Section */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <Tabs value={currentTab} onValueChange={setCurrentTab}> {/* Added currentTab and onValueChange */}
            <CardHeader className="border-b border-slate-100">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="upcoming">
                  Próximos ({upcomingMaintenances.length})
                </TabsTrigger>
                <TabsTrigger value="alerts">
                  Alertas ({activeAlerts.length})
                </TabsTrigger>
                <TabsTrigger value="history">
                  Historial ({completedMaintenances.length})
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value={currentTab} className="mt-0"> {/* Removed specific tab content values, using currentTab */}
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="p-12 text-center text-slate-500">Cargando mantenimientos...</div>
                ) : filteredMaintenances.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    No hay mantenimientos en esta categoría
                  </div>
                ) : (
                  <div className="space-y-4"> {/* Changed to a div for a list of cards */}
                    {filteredMaintenances.map((maintenance) => (
                      <div key={maintenance.id} className="border rounded-lg p-4 hover:bg-slate-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg text-slate-900">
                                {getMachineName(maintenance.machine_id)}
                              </h3>
                              {getStatusBadge(maintenance.estado)} {/* Using new badge component */}
                              {getPriorityBadge(maintenance.prioridad)} {/* Using new badge component */}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                              <div>
                                <span className="font-medium">Tipo:</span> {maintenance.tipo}
                              </div>
                              <div>
                                <span className="font-medium">Técnico:</span> {getEmployeeName(maintenance.tecnico_asignado)}
                              </div>
                              <div>
                                <span className="font-medium">Fecha programada:</span>{" "}
                                {format(new Date(maintenance.fecha_programada), "dd/MM/yyyy HH:mm", { locale: es })}
                              </div>
                              {maintenance.creado_por && (
                                <div>
                                  <span className="font-medium">Creado por:</span> {getEmployeeName(maintenance.creado_por)}
                                </div>
                              )}
                            </div>

                            {maintenance.descripcion && (
                              <p className="text-sm text-slate-600 mt-2">{maintenance.descripcion}</p>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            {maintenance.estado === "Pendiente" && (
                              <Button
                                size="sm"
                                onClick={() => handleStartMaintenance(maintenance)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Iniciar
                              </Button>
                            )}
                            {(maintenance.estado === "En Progreso" || maintenance.estado === "Completado") && ( // Show work order for in progress and completed
                              <Button
                                size="sm"
                                onClick={() => handleOpenWorkOrder(maintenance)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <ClipboardList className="w-4 h-4 mr-1" />
                                Ver Orden
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(maintenance)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(maintenance.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {showForm && (
        <MaintenanceForm
          maintenance={editingMaintenance} // Pass editing maintenance prop
          machines={machines}
          employees={employees} // Pass employees
          maintenanceTypes={maintenanceTypes} // Pass maintenance types
          onClose={() => {
            setShowForm(false);
            setEditingMaintenance(null);
          }}
        />
      )}

      {showTypeManager && ( // New component for type management
        <MaintenanceTypeManager
          open={showTypeManager}
          onOpenChange={setShowTypeManager}
          machines={machines} // Pass machines, might be useful for types tied to specific machine models/series
        />
      )}

      {showWorkOrder && selectedMaintenance && ( // New component for work order
        <MaintenanceWorkOrder
          maintenance={selectedMaintenance}
          machines={machines}
          employees={employees}
          updateStatusMutation={updateStatusMutation} // Pass mutation for status updates
          onClose={() => {
            setShowWorkOrder(false);
            setSelectedMaintenance(null);
          }}
        />
      )}
    </div>
  );
}
