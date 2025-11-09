import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/table";
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
  TrendingUp
} from "lucide-react";
import { format, differenceInDays, addDays, isBefore } from "date-fns";
import { es } from "date-fns/locale";

export default function MaintenanceTrackingPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMachine, setFilterMachine] = useState("all");
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    machine_id: "",
    tipo: "Mantenimiento Planificado",
    prioridad: "Media",
    estado: "Pendiente",
    fecha_programada: "",
    fecha_inicio: "",
    fecha_finalizacion: "",
    duracion_estimada: 2,
    duracion_real: 0,
    tecnico_asignado: "",
    descripcion: "",
    notas: "",
    costo_total: 0,
    frecuencia_dias: 0,
    dias_anticipacion_alerta: 7,
    alerta_activa: false,
  });

  const { data: maintenances, isLoading } = useQuery({
    queryKey: ['maintenanceSchedules'],
    queryFn: () => base44.entities.MaintenanceSchedule.list('-fecha_programada'),
    initialData: [],
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('codigo'),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      // Calcular próximo mantenimiento si es recurrente
      if (data.frecuencia_dias > 0 && data.fecha_programada) {
        const nextDate = addDays(new Date(data.fecha_programada), data.frecuencia_dias);
        data.proximo_mantenimiento = nextDate.toISOString();
      }

      // Activar alerta si está próximo
      const daysUntil = differenceInDays(new Date(data.fecha_programada), new Date());
      if (daysUntil <= data.dias_anticipacion_alerta && daysUntil >= 0) {
        data.alerta_activa = true;
      }

      if (editingMaintenance?.id) {
        return base44.entities.MaintenanceSchedule.update(editingMaintenance.id, data);
      }
      return base44.entities.MaintenanceSchedule.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
      handleClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, estado, fecha_inicio, fecha_finalizacion }) => {
      const updates = { estado };
      if (fecha_inicio) updates.fecha_inicio = fecha_inicio;
      if (fecha_finalizacion) {
        updates.fecha_finalizacion = fecha_finalizacion;
        // Calcular duración real
        if (fecha_inicio) {
          const duration = (new Date(fecha_finalizacion) - new Date(fecha_inicio)) / (1000 * 60 * 60);
          updates.duracion_real = Math.round(duration * 10) / 10;
        }
      }
      return base44.entities.MaintenanceSchedule.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
    },
  });

  const handleEdit = (maintenance) => {
    setEditingMaintenance(maintenance);
    setFormData(maintenance);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingMaintenance(null);
    setFormData({
      machine_id: "",
      tipo: "Mantenimiento Planificado",
      prioridad: "Media",
      estado: "Pendiente",
      fecha_programada: "",
      fecha_inicio: "",
      fecha_finalizacion: "",
      duracion_estimada: 2,
      duracion_real: 0,
      tecnico_asignado: "",
      descripcion: "",
      notas: "",
      costo_total: 0,
      frecuencia_dias: 0,
      dias_anticipacion_alerta: 7,
      alerta_activa: false,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este mantenimiento?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleStartMaintenance = (maintenance) => {
    updateStatusMutation.mutate({
      id: maintenance.id,
      estado: "En Progreso",
      fecha_inicio: new Date().toISOString(),
    });
  };

  const handleCompleteMaintenance = (maintenance) => {
    updateStatusMutation.mutate({
      id: maintenance.id,
      estado: "Completado",
      fecha_finalizacion: new Date().toISOString(),
      fecha_inicio: maintenance.fecha_inicio || new Date().toISOString(),
    });
  };

  const getMachineName = (machineId) => {
    const machine = machines.find(m => m.id === machineId);
    return machine ? `${machine.codigo} - ${machine.nombre}` : "Máquina desconocida";
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

  const getStatusColor = (estado) => {
    switch (estado) {
      case "Pendiente": return "bg-yellow-100 text-yellow-800";
      case "En Progreso": return "bg-blue-100 text-blue-800";
      case "Completado": return "bg-green-100 text-green-800";
      case "Cancelado": return "bg-slate-100 text-slate-600";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  const getPriorityColor = (prioridad) => {
    switch (prioridad) {
      case "Baja": return "bg-green-100 text-green-800";
      case "Media": return "bg-yellow-100 text-yellow-800";
      case "Alta": return "bg-orange-100 text-orange-800";
      case "Urgente": return "bg-red-100 text-red-800";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  const filteredMaintenances = useMemo(() => {
    let filtered = maintenances;
    
    if (filterStatus !== "all") {
      filtered = filtered.filter(m => m.estado === filterStatus);
    }
    
    if (filterMachine !== "all") {
      filtered = filtered.filter(m => m.machine_id === filterMachine);
    }
    
    return filtered;
  }, [maintenances, filterStatus, filterMachine]);

  const upcomingMaintenances = useMemo(() => {
    const now = new Date();
    return maintenances.filter(m => {
      if (m.estado !== "Pendiente") return false;
      const scheduledDate = new Date(m.fecha_programada);
      const daysUntil = differenceInDays(scheduledDate, now);
      return daysUntil >= 0 && daysUntil <= 30;
    }).sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada));
  }, [maintenances]);

  const activeAlerts = useMemo(() => {
    return maintenances.filter(m => m.alerta_activa && m.estado === "Pendiente");
  }, [maintenances]);

  const completedMaintenances = useMemo(() => {
    return maintenances.filter(m => m.estado === "Completado");
  }, [maintenances]);

  const stats = useMemo(() => {
    return {
      total: maintenances.length,
      pendientes: maintenances.filter(m => m.estado === "Pendiente").length,
      enProgreso: maintenances.filter(m => m.estado === "En Progreso").length,
      completados: maintenances.filter(m => m.estado === "Completado").length,
      alertas: activeAlerts.length,
      costoTotal: maintenances.reduce((sum, m) => sum + (m.costo_total || 0), 0),
    };
  }, [maintenances, activeAlerts]);

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
              Gestiona el mantenimiento planificado y reparaciones de máquinas
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Mantenimiento
          </Button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Total</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <Wrench className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-700 font-medium">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-900">{stats.pendientes}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">En Progreso</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.enProgreso}</p>
                </div>
                <PlayCircle className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Completados</p>
                  <p className="text-2xl font-bold text-green-900">{stats.completados}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 font-medium">Alertas</p>
                  <p className="text-2xl font-bold text-red-900">{stats.alertas}</p>
                </div>
                <Bell className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-700 font-medium">Costo Total</p>
                  <p className="text-xl font-bold text-purple-900">{stats.costoTotal.toLocaleString()}€</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="upcoming">
              Próximos ({upcomingMaintenances.length})
            </TabsTrigger>
            <TabsTrigger value="alerts">
              Alertas ({activeAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <CardTitle>Todos los Mantenimientos</CardTitle>
                  <div className="flex gap-3">
                    <Select value={filterMachine} onValueChange={setFilterMachine}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filtrar máquina" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las máquinas</SelectItem>
                        {machines.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.codigo} - {m.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="Pendiente">Pendiente</SelectItem>
                        <SelectItem value="En Progreso">En Progreso</SelectItem>
                        <SelectItem value="Completado">Completado</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-12 text-center text-slate-500">Cargando...</div>
                ) : filteredMaintenances.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    No hay mantenimientos registrados
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Máquina</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Prioridad</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Fecha Programada</TableHead>
                          <TableHead>Técnico</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMaintenances.map((maintenance) => (
                          <TableRow key={maintenance.id} className="hover:bg-slate-50">
                            <TableCell>
                              <span className="font-semibold text-slate-900">
                                {getMachineName(maintenance.machine_id)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{maintenance.tipo}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getPriorityColor(maintenance.prioridad)}>
                                {maintenance.prioridad}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(maintenance.estado)}>
                                {getStatusIcon(maintenance.estado)}
                                <span className="ml-1">{maintenance.estado}</span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                {format(new Date(maintenance.fecha_programada), "dd/MM/yyyy HH:mm", { locale: es })}
                              </div>
                            </TableCell>
                            <TableCell>{maintenance.tecnico_asignado || "-"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {maintenance.estado === "Pendiente" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleStartMaintenance(maintenance)}
                                    title="Iniciar"
                                  >
                                    <PlayCircle className="w-4 h-4 text-blue-600" />
                                  </Button>
                                )}
                                {maintenance.estado === "En Progreso" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleCompleteMaintenance(maintenance)}
                                    title="Completar"
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  </Button>
                                )}
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
          </TabsContent>

          <TabsContent value="upcoming">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Próximos Mantenimientos (30 días)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {upcomingMaintenances.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No hay mantenimientos programados en los próximos 30 días
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingMaintenances.map((maintenance) => {
                      const daysUntil = differenceInDays(new Date(maintenance.fecha_programada), new Date());
                      return (
                        <div key={maintenance.id} className="p-4 border-2 border-slate-200 rounded-lg hover:border-blue-300 transition-all">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-slate-900">
                                  {getMachineName(maintenance.machine_id)}
                                </h4>
                                <Badge className={getPriorityColor(maintenance.prioridad)}>
                                  {maintenance.prioridad}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-600 mb-2">{maintenance.descripcion}</p>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1 text-slate-600">
                                  <Calendar className="w-4 h-4" />
                                  {format(new Date(maintenance.fecha_programada), "dd/MM/yyyy HH:mm")}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  En {daysUntil} días
                                </Badge>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleEdit(maintenance)}
                              variant="outline"
                            >
                              Ver Detalles
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-red-100 bg-red-50">
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <AlertTriangle className="w-5 h-5" />
                  Alertas de Mantenimiento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {activeAlerts.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No hay alertas activas
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeAlerts.map((maintenance) => {
                      const daysUntil = differenceInDays(new Date(maintenance.fecha_programada), new Date());
                      const isOverdue = daysUntil < 0;
                      
                      return (
                        <div key={maintenance.id} className={`p-4 border-2 rounded-lg ${
                          isOverdue ? 'border-red-300 bg-red-50' : 'border-orange-300 bg-orange-50'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Bell className={`w-5 h-5 ${isOverdue ? 'text-red-600' : 'text-orange-600'}`} />
                                <h4 className="font-semibold text-slate-900">
                                  {getMachineName(maintenance.machine_id)}
                                </h4>
                                {isOverdue && (
                                  <Badge className="bg-red-600 text-white">
                                    ¡Atrasado!
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-700 mb-2">
                                {maintenance.tipo} - {maintenance.descripcion}
                              </p>
                              <div className="flex items-center gap-2 text-sm">
                                <span className={`font-semibold ${isOverdue ? 'text-red-700' : 'text-orange-700'}`}>
                                  {isOverdue 
                                    ? `Atrasado ${Math.abs(daysUntil)} días` 
                                    : `Vence en ${daysUntil} días`
                                  }
                                </span>
                                <span className="text-slate-600">
                                  - {format(new Date(maintenance.fecha_programada), "dd/MM/yyyy")}
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleStartMaintenance(maintenance)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Iniciar
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  Historial de Mantenimientos Completados
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {completedMaintenances.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    No hay mantenimientos completados
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Máquina</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Fecha Realización</TableHead>
                          <TableHead>Duración</TableHead>
                          <TableHead>Técnico</TableHead>
                          <TableHead>Costo</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {completedMaintenances.map((maintenance) => (
                          <TableRow key={maintenance.id} className="hover:bg-slate-50">
                            <TableCell>
                              <span className="font-semibold text-slate-900">
                                {getMachineName(maintenance.machine_id)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{maintenance.tipo}</Badge>
                            </TableCell>
                            <TableCell>
                              {maintenance.fecha_finalizacion 
                                ? format(new Date(maintenance.fecha_finalizacion), "dd/MM/yyyy HH:mm")
                                : "-"
                              }
                            </TableCell>
                            <TableCell>
                              {maintenance.duracion_real 
                                ? `${maintenance.duracion_real}h`
                                : "-"
                              }
                            </TableCell>
                            <TableCell>{maintenance.tecnico_asignado || "-"}</TableCell>
                            <TableCell>
                              {maintenance.costo_total 
                                ? `${maintenance.costo_total.toLocaleString()}€`
                                : "-"
                              }
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(maintenance)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Formulario de Mantenimiento */}
      {showForm && (
        <Dialog open={true} onOpenChange={handleClose}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMaintenance ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="machine_id">Máquina *</Label>
                  <Select
                    value={formData.machine_id}
                    onValueChange={(value) => setFormData({ ...formData, machine_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar máquina" />
                    </SelectTrigger>
                    <SelectContent>
                      {machines.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.codigo} - {m.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Mantenimiento *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mantenimiento Planificado">Mantenimiento Planificado</SelectItem>
                      <SelectItem value="Reparación No Planificada">Reparación No Planificada</SelectItem>
                      <SelectItem value="Inspección">Inspección</SelectItem>
                      <SelectItem value="Calibración">Calibración</SelectItem>
                      <SelectItem value="Limpieza">Limpieza</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prioridad">Prioridad *</Label>
                  <Select
                    value={formData.prioridad}
                    onValueChange={(value) => setFormData({ ...formData, prioridad: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baja">Baja</SelectItem>
                      <SelectItem value="Media">Media</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) => setFormData({ ...formData, estado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendiente">Pendiente</SelectItem>
                      <SelectItem value="En Progreso">En Progreso</SelectItem>
                      <SelectItem value="Completado">Completado</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha_programada">Fecha Programada *</Label>
                  <Input
                    id="fecha_programada"
                    type="datetime-local"
                    value={formData.fecha_programada}
                    onChange={(e) => setFormData({ ...formData, fecha_programada: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tecnico_asignado">Técnico Asignado</Label>
                  <Input
                    id="tecnico_asignado"
                    value={formData.tecnico_asignado}
                    onChange={(e) => setFormData({ ...formData, tecnico_asignado: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duracion_estimada">Duración Estimada (horas)</Label>
                  <Input
                    id="duracion_estimada"
                    type="number"
                    step="0.5"
                    value={formData.duracion_estimada}
                    onChange={(e) => setFormData({ ...formData, duracion_estimada: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="costo_total">Costo Total (€)</Label>
                  <Input
                    id="costo_total"
                    type="number"
                    step="0.01"
                    value={formData.costo_total}
                    onChange={(e) => setFormData({ ...formData, costo_total: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frecuencia_dias">Frecuencia (días) - Recurrente</Label>
                  <Input
                    id="frecuencia_dias"
                    type="number"
                    value={formData.frecuencia_dias}
                    onChange={(e) => setFormData({ ...formData, frecuencia_dias: parseInt(e.target.value) })}
                    placeholder="0 = No recurrente"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dias_anticipacion_alerta">Alerta con Anticipación (días)</Label>
                  <Input
                    id="dias_anticipacion_alerta"
                    type="number"
                    value={formData.dias_anticipacion_alerta}
                    onChange={(e) => setFormData({ ...formData, dias_anticipacion_alerta: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  placeholder="Descripción del trabajo a realizar..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas Adicionales</Label>
                <Textarea
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={2}
                  placeholder="Notas, observaciones, etc..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}