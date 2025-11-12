import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeyRound, Save, Filter, ArrowLeft, Bell, History, Edit, Settings, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function LockerManagementPage() {
  const [filters, setFilters] = useState({
    departamento: "all",
    equipo: "all",
    sexo: "all"
  });
  const [showHistory, setShowHistory] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editingAssignments, setEditingAssignments] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configFormData, setConfigFormData] = useState({});
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const { data: lockerAssignments } = useQuery({
    queryKey: ['lockerAssignments'],
    queryFn: () => base44.entities.LockerAssignment.list(),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const { data: lockerRoomConfigs } = useQuery({
    queryKey: ['lockerRoomConfigs'],
    queryFn: () => base44.entities.LockerRoomConfig.list(),
    initialData: [],
  });

  // Cargar asignaciones existentes en estado de edición
  React.useEffect(() => {
    const assignments = {};
    lockerAssignments.forEach(la => {
      assignments[la.employee_id] = {
        requiere_taquilla: la.requiere_taquilla !== false,
        vestuario: la.vestuario || "",
        numero_taquilla_actual: la.numero_taquilla_actual || "",
        numero_taquilla_nuevo: la.numero_taquilla_nuevo || ""
      };
    });
    setEditingAssignments(assignments);
  }, [lockerAssignments]);

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      const promises = Object.entries(editingAssignments).map(([employeeId, data]) => {
        const existing = lockerAssignments.find(la => la.employee_id === employeeId);
        
        // Verificar si hay cambio de taquilla
        const hasLockerChange = existing && 
          (existing.numero_taquilla_actual !== data.numero_taquilla_nuevo || 
           existing.vestuario !== data.vestuario) &&
          data.numero_taquilla_nuevo && 
          data.numero_taquilla_nuevo !== existing.numero_taquilla_actual;
        
        const now = new Date().toISOString();
        const updatedData = {
          employee_id: employeeId,
          requiere_taquilla: data.requiere_taquilla,
          vestuario: data.vestuario,
          numero_taquilla_actual: hasLockerChange ? data.numero_taquilla_nuevo : (existing?.numero_taquilla_actual || data.numero_taquilla_actual),
          numero_taquilla_nuevo: data.numero_taquilla_nuevo,
          fecha_asignacion: now,
          notificacion_enviada: hasLockerChange ? false : (existing?.notificacion_enviada || false)
        };

        // Si hay cambio, agregar al historial
        if (hasLockerChange && existing) {
          const historial = existing.historial_cambios || [];
          historial.push({
            fecha: now,
            vestuario_anterior: existing.vestuario,
            taquilla_anterior: existing.numero_taquilla_actual,
            vestuario_nuevo: data.vestuario,
            taquilla_nueva: data.numero_taquilla_nuevo,
            motivo: "Reasignación"
          });
          updatedData.historial_cambios = historial;
        }

        if (existing) {
          return base44.entities.LockerAssignment.update(existing.id, updatedData);
        }
        return base44.entities.LockerAssignment.create(updatedData);
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
      setHasChanges(false);
    },
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async ({ employeeId, assignment }) => {
      const employee = employees.find(e => e.id === employeeId);
      if (!employee || !employee.telefono_movil) return;

      // Enviar notificación SMS/Email
      await base44.integrations.Core.SendEmail({
        to: employee.email,
        subject: "Reasignación de Taquilla",
        body: `Hola ${employee.nombre},\n\nSe te ha reasignado una nueva taquilla:\n\nVestuario: ${assignment.vestuario}\nNúmero de taquilla: ${assignment.numero_taquilla_nuevo}\n\nPor favor, actualiza tu información.\n\nSaludos.`
      });

      // Marcar notificación como enviada
      const existing = lockerAssignments.find(la => la.employee_id === employeeId);
      if (existing) {
        await base44.entities.LockerAssignment.update(existing.id, {
          notificacion_enviada: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (configs) => {
      const promises = Object.entries(configs).map(([vestuario, numTaquillas]) => {
        const existing = lockerRoomConfigs.find(c => c.vestuario === vestuario);
        
        if (existing) {
          return base44.entities.LockerRoomConfig.update(existing.id, {
            vestuario,
            numero_taquillas_instaladas: parseInt(numTaquillas)
          });
        }
        return base44.entities.LockerRoomConfig.create({
          vestuario,
          numero_taquillas_instaladas: parseInt(numTaquillas)
        });
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockerRoomConfigs'] });
      setShowConfigDialog(false);
    },
  });

  // Inicializar configuración de taquillas
  React.useEffect(() => {
    const defaultConfigs = {
      "Vestuario Femenino Planta Baja": 56,
      "Vestuario Femenino Planta Alta": 263,
      "Vestuario Masculino Planta Baja": 128
    };

    const configs = {};
    Object.keys(defaultConfigs).forEach(vestuario => {
      const existing = lockerRoomConfigs.find(c => c.vestuario === vestuario);
      configs[vestuario] = existing?.numero_taquillas_instaladas || defaultConfigs[vestuario];
    });

    setConfigFormData(configs);
  }, [lockerRoomConfigs]);

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesDept = filters.departamento === "all" || emp.departamento === filters.departamento;
      const matchesTeam = filters.equipo === "all" || emp.equipo === filters.equipo;
      const matchesSex = filters.sexo === "all" || emp.sexo === filters.sexo;
      
      return matchesDept && matchesTeam && matchesSex;
    });
  }, [employees, filters]);

  const getAssignment = (employeeId) => {
    return lockerAssignments.find(la => la.employee_id === employeeId);
  };

  const handleFieldChange = (employeeId, field, value) => {
    setEditingAssignments(prev => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSendNotification = (employeeId) => {
    const assignment = getAssignment(employeeId);
    if (assignment) {
      sendNotificationMutation.mutate({ employeeId, assignment });
    }
  };

  const handleShowHistory = (employee) => {
    setSelectedEmployee(employee);
    setShowHistory(true);
  };

  const handleSaveAll = () => {
    if (window.confirm('¿Guardar todos los cambios realizados?')) {
      saveAllMutation.mutate();
    }
  };

  const stats = useMemo(() => {
    const conTaquilla = lockerAssignments.filter(la => la.requiere_taquilla !== false).length;
    const sinTaquilla = filteredEmployees.length - conTaquilla;
    const pendientesNotificacion = lockerAssignments.filter(la => 
      la.numero_taquilla_nuevo && 
      la.numero_taquilla_nuevo !== la.numero_taquilla_actual &&
      !la.notificacion_enviada
    ).length;
    
    return { conTaquilla, sinTaquilla, pendientesNotificacion };
  }, [lockerAssignments, filteredEmployees]);

  const lockerRoomStats = useMemo(() => {
    const vestuarios = [
      "Vestuario Femenino Planta Baja",
      "Vestuario Femenino Planta Alta",
      "Vestuario Masculino Planta Baja"
    ];

    return vestuarios.map(vestuario => {
      const config = lockerRoomConfigs.find(c => c.vestuario === vestuario);
      const totalInstaladas = config?.numero_taquillas_instaladas || 0;
      
      const asignadas = lockerAssignments.filter(la => 
        la.vestuario === vestuario && 
        la.numero_taquilla_actual &&
        la.requiere_taquilla !== false
      ).length;
      
      const libres = totalInstaladas - asignadas;
      
      return {
        vestuario,
        totalInstaladas,
        asignadas,
        libres,
        porcentajeOcupacion: totalInstaladas > 0 ? Math.round((asignadas / totalInstaladas) * 100) : 0
      };
    });
  }, [lockerRoomConfigs, lockerAssignments]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("ShiftManagers")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Jefes de Turno
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <KeyRound className="w-8 h-8 text-blue-600" />
              Gestión de Taquillas
            </h1>
            <p className="text-slate-600 mt-1">
              Asigna y gestiona taquillas de vestuarios para empleados
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowConfigDialog(true)}
              variant="outline"
              className="border-blue-200 hover:bg-blue-50"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurar Vestuarios
            </Button>
            <Button
              onClick={handleSaveAll}
              disabled={!hasChanges || saveAllMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveAllMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>

        {/* Alerta de cambios sin guardar */}
        {hasChanges && (
          <Card className="mb-6 bg-amber-50 border-2 border-amber-300">
            <CardContent className="p-4">
              <p className="text-sm text-amber-800">
                <strong>⚠️ Hay cambios sin guardar.</strong> Recuerda hacer clic en "Guardar Cambios" para aplicar las modificaciones.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Resumen por Vestuario */}
        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Resumen de Vestuarios
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowConfigDialog(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Configurar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {lockerRoomStats.map((stat) => (
                <div key={stat.vestuario} className="border-2 rounded-lg p-4 bg-gradient-to-br from-slate-50 to-slate-100">
                  <h3 className="font-semibold text-slate-900 mb-3 text-sm">
                    {stat.vestuario}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600">Instaladas:</span>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 font-bold">
                        {stat.totalInstaladas}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600">Asignadas:</span>
                      <Badge className="bg-green-600 text-white font-bold">
                        {stat.asignadas}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600">Libres:</span>
                      <Badge className={
                        stat.libres > 10 ? "bg-green-100 text-green-800" :
                        stat.libres > 5 ? "bg-amber-100 text-amber-800" :
                        "bg-red-100 text-red-800"
                      }>
                        {stat.libres}
                      </Badge>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-600">Ocupación:</span>
                        <span className="text-sm font-bold text-slate-900">{stat.porcentajeOcupacion}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            stat.porcentajeOcupacion > 90 ? 'bg-red-500' :
                            stat.porcentajeOcupacion > 75 ? 'bg-amber-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${stat.porcentajeOcupacion}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Con Taquilla</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.conTaquilla}</p>
                </div>
                <KeyRound className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-700 font-medium">Sin Taquilla</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.sinTaquilla}</p>
                </div>
                <KeyRound className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-700 font-medium">Pendientes Notificación</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.pendientesNotificacion}</p>
                </div>
                <Bell className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select value={filters.departamento} onValueChange={(value) => setFilters({...filters, departamento: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Equipo</Label>
                <Select value={filters.equipo} onValueChange={(value) => setFilters({...filters, equipo: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.team_name}>
                        {team.team_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sexo</Label>
                <Select value={filters.sexo} onValueChange={(value) => setFilters({...filters, sexo: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Asignaciones */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Asignación de Taquillas ({filteredEmployees.length} empleados)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-12">Req.</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Sexo</TableHead>
                    <TableHead>Vestuario</TableHead>
                    <TableHead>Taquilla Actual</TableHead>
                    <TableHead>Nueva Taquilla</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No hay empleados con los filtros seleccionados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => {
                      const assignment = getAssignment(employee.id);
                      const editData = editingAssignments[employee.id] || {
                        requiere_taquilla: assignment?.requiere_taquilla !== false,
                        vestuario: assignment?.vestuario || "",
                        numero_taquilla_actual: assignment?.numero_taquilla_actual || "",
                        numero_taquilla_nuevo: assignment?.numero_taquilla_nuevo || ""
                      };
                      
                      const requiereTaquilla = editData.requiere_taquilla;
                      const hasNewLocker = editData.numero_taquilla_nuevo && 
                        editData.numero_taquilla_nuevo !== editData.numero_taquilla_actual;
                      
                      return (
                        <TableRow key={employee.id} className={`hover:bg-slate-50 ${!requiereTaquilla ? 'opacity-50' : ''}`}>
                          <TableCell>
                            <Checkbox
                              checked={requiereTaquilla}
                              onCheckedChange={(checked) => handleFieldChange(employee.id, 'requiere_taquilla', checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-semibold text-slate-900">{employee.nombre}</div>
                              <div className="text-xs text-slate-500">{employee.equipo}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{employee.departamento}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              employee.sexo === "Femenino" ? "bg-pink-100 text-pink-800" :
                              employee.sexo === "Masculino" ? "bg-blue-100 text-blue-800" :
                              "bg-purple-100 text-purple-800"
                            }>
                              {employee.sexo || "No especificado"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {requiereTaquilla && (
                              <Select
                                value={editData.vestuario}
                                onValueChange={(value) => handleFieldChange(employee.id, 'vestuario', value)}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Vestuario Femenino Planta Baja">
                                    Femenino P. Baja
                                  </SelectItem>
                                  <SelectItem value="Vestuario Femenino Planta Alta">
                                    Femenino P. Alta
                                  </SelectItem>
                                  <SelectItem value="Vestuario Masculino Planta Baja">
                                    Masculino P. Baja
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            {requiereTaquilla && (
                              <div className="font-mono text-sm font-semibold text-slate-900">
                                {editData.numero_taquilla_actual || "-"}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {requiereTaquilla && (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editData.numero_taquilla_nuevo}
                                  onChange={(e) => handleFieldChange(employee.id, 'numero_taquilla_nuevo', e.target.value)}
                                  placeholder="Nº"
                                  className="w-20"
                                />
                                {hasNewLocker && (
                                  <Badge className="bg-orange-100 text-orange-800">
                                    Cambio
                                  </Badge>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              {hasNewLocker && !assignment?.notificacion_enviada && (
                                <Button
                                  size="sm"
                                  onClick={() => handleSendNotification(employee.id)}
                                  disabled={sendNotificationMutation.isPending}
                                  className="bg-orange-600 hover:bg-orange-700"
                                >
                                  <Bell className="w-4 h-4 mr-1" />
                                  Notificar
                                </Button>
                              )}
                              {assignment?.historial_cambios && assignment.historial_cambios.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleShowHistory(employee)}
                                >
                                  <History className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Información */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Información</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Marca la casilla "Req." para indicar que el empleado requiere taquilla</p>
            <p>• Todos los empleados están marcados por defecto</p>
            <p>• Asigna el vestuario según el sexo del empleado</p>
            <p>• Ingresa el nuevo número de taquilla cuando haya una reasignación</p>
            <p>• Los cambios se guardan al hacer clic en el botón "Guardar Cambios" de la parte superior</p>
            <p>• Haz clic en "Notificar" para enviar una notificación al empleado sobre su nueva taquilla</p>
            <p>• El botón de historial muestra todos los cambios de taquilla del empleado</p>
          </div>
        </div>
      </div>

      {/* Dialog de Historial */}
      {showHistory && selectedEmployee && (
        <Dialog open={true} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                Historial de Taquillas - {selectedEmployee.nombre}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(() => {
                const assignment = getAssignment(selectedEmployee.id);
                const historial = assignment?.historial_cambios || [];
                
                if (historial.length === 0) {
                  return (
                    <p className="text-center text-slate-500 py-8">
                      No hay historial de cambios
                    </p>
                  );
                }
                
                return historial.reverse().map((cambio, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-slate-50">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline">
                        {format(new Date(cambio.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                      </Badge>
                      {cambio.motivo && (
                        <Badge className="bg-blue-100 text-blue-800">
                          {cambio.motivo}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600 font-medium">Anterior:</p>
                        <p className="text-slate-900">{cambio.vestuario_anterior || "-"}</p>
                        <p className="text-slate-900 font-mono">Taquilla: {cambio.taquilla_anterior || "-"}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 font-medium">Nuevo:</p>
                        <p className="text-slate-900">{cambio.vestuario_nuevo || "-"}</p>
                        <p className="text-slate-900 font-mono">Taquilla: {cambio.taquilla_nueva || "-"}</p>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog de Configuración */}
      {showConfigDialog && (
        <Dialog open={true} onOpenChange={setShowConfigDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configurar Número de Taquillas por Vestuario</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Información:</strong> Define el número total de taquillas instaladas en cada vestuario. 
                  Esta información se usará para calcular taquillas libres y porcentaje de ocupación.
                </p>
              </div>

              {Object.keys(configFormData).map((vestuario) => (
                <div key={vestuario} className="border-2 border-slate-200 rounded-lg p-4 bg-slate-50">
                  <Label className="text-base font-semibold text-slate-900 mb-3 block">
                    {vestuario}
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`config-${vestuario}`}>Número de Taquillas Instaladas *</Label>
                      <Input
                        id={`config-${vestuario}`}
                        type="number"
                        min="0"
                        value={configFormData[vestuario]}
                        onChange={(e) => setConfigFormData({
                          ...configFormData,
                          [vestuario]: e.target.value
                        })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado Actual</Label>
                      <div className="h-10 flex items-center">
                        {(() => {
                          const stat = lockerRoomStats.find(s => s.vestuario === vestuario);
                          return (
                            <div className="flex gap-2">
                              <Badge className="bg-green-600 text-white">
                                {stat?.asignadas || 0} asign.
                              </Badge>
                              <Badge variant="outline">
                                {stat?.libres || 0} libres
                              </Badge>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowConfigDialog(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => saveConfigMutation.mutate(configFormData)}
                  disabled={saveConfigMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saveConfigMutation.isPending ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}