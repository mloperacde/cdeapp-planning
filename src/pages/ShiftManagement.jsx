
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Calendar, Plus, Edit, Trash2, Users, RefreshCw, CheckCircle, XCircle, ArrowLeft } from "lucide-react"; // Added ArrowLeft
import { format, addDays, startOfWeek, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom"; // Added Link

// Helper function for creating URLs - assuming a simple implementation for now.
// In a real application, this would typically be part of a router utility or constants.
const createPageUrl = (pageName: string) => {
  switch (pageName) {
    case "ShiftManagers":
      return "/shift-managers"; // Example path for Shift Managers page
    // Add more cases for other pages as needed
    default:
      return "/";
  }
};

export default function ShiftManagementPage() {
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const queryClient = useQueryClient();

  const [shiftFormData, setShiftFormData] = useState({
    employee_id: "",
    fecha: "",
    turno: "Mañana",
    hora_inicio: "07:00",
    hora_fin: "15:00",
    maquinas_asignadas: [],
    estado: "Programado",
    notas: "",
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const { data: shifts } = useQuery({
    queryKey: ['shiftAssignments'],
    queryFn: () => base44.entities.ShiftAssignment.list('-fecha'),
    initialData: [],
  });

  const { data: swapRequests } = useQuery({
    queryKey: ['shiftSwapRequests'],
    queryFn: () => base44.entities.ShiftSwapRequest.list('-fecha_solicitud'),
    initialData: [],
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('nombre'),
    initialData: [],
  });

  const saveShiftMutation = useMutation({
    mutationFn: (data) => {
      if (editingShift?.id) {
        return base44.entities.ShiftAssignment.update(editingShift.id, data);
      }
      return base44.entities.ShiftAssignment.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftAssignments'] });
      handleCloseShiftForm();
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: (id) => base44.entities.ShiftAssignment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftAssignments'] });
    },
  });

  const updateSwapRequestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShiftSwapRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftSwapRequests'] });
    },
  });

  const handleCloseShiftForm = () => {
    setShowShiftForm(false);
    setEditingShift(null);
    setShiftFormData({
      employee_id: "",
      fecha: "",
      turno: "Mañana",
      hora_inicio: "07:00",
      hora_fin: "15:00",
      maquinas_asignadas: [],
      estado: "Programado",
      notas: "",
    });
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    setShiftFormData(shift);
    setShowShiftForm(true);
  };

  const handleSubmitShift = (e) => {
    e.preventDefault();
    saveShiftMutation.mutate(shiftFormData);
  };

  const handleDeleteShift = (id) => {
    if (window.confirm('¿Eliminar este turno?')) {
      deleteShiftMutation.mutate(id);
    }
  };

  const handleApproveSwap = (swapId) => {
    updateSwapRequestMutation.mutate({
      id: swapId,
      data: {
        estado: "Aprobada por Supervisor",
        fecha_respuesta_supervisor: new Date().toISOString(),
      }
    });
  };

  const handleRejectSwap = (swapId) => {
    updateSwapRequestMutation.mutate({
      id: swapId,
      data: {
        estado: "Rechazada por Supervisor",
        fecha_respuesta_supervisor: new Date().toISOString(),
      }
    });
  };

  const getEmployeeName = (id) => {
    return employees.find(e => e.id === id)?.nombre || "Desconocido";
  };

  const weekDays = eachDayOfInterval({
    start: selectedWeek,
    end: addDays(selectedWeek, 6)
  });

  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      const employeeMatch = selectedEmployee === "all" || shift.employee_id === selectedEmployee;
      const dateInWeek = weekDays.some(day => format(day, 'yyyy-MM-dd') === shift.fecha);
      return employeeMatch && dateInWeek;
    });
  }, [shifts, selectedEmployee, weekDays]);

  const pendingSwaps = useMemo(() => {
    return swapRequests.filter(req => 
      req.estado === "Pendiente" || req.estado === "Aceptada por Receptor"
    );
  }, [swapRequests]);

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
              <RefreshCw className="w-8 h-8 text-blue-600" />
              Intercambio de Turnos
            </h1>
            <p className="text-slate-600 mt-1">
              Gestiona solicitudes de intercambio de turnos entre operarios
            </p>
          </div>
          <Button
            onClick={() => setShowShiftForm(true)} // Retained existing state management
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Asignar Turno
          </Button>
        </div>

        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calendar">Calendario de Turnos</TabsTrigger>
            <TabsTrigger value="swaps">
              Solicitudes de Intercambio ({pendingSwaps.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            {/* Filtros */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Semana</Label>
                    <Input
                      type="date"
                      value={format(selectedWeek, 'yyyy-MM-dd')}
                      onChange={(e) => setSelectedWeek(startOfWeek(new Date(e.target.value), { weekStartsOn: 1 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Empleado</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los Empleados</SelectItem>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabla de Turnos */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Turnos Semana {format(selectedWeek, "'del' d", { locale: es })} - 
                  {format(addDays(selectedWeek, 6), "d 'de' MMMM", { locale: es })}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Fecha</TableHead>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Turno</TableHead>
                        <TableHead>Horario</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredShifts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                            No hay turnos programados para esta semana
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredShifts.map(shift => (
                          <TableRow key={shift.id} className="hover:bg-slate-50">
                            <TableCell>
                              {format(new Date(shift.fecha), "EEEE, d 'de' MMMM", { locale: es })}
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold">{getEmployeeName(shift.employee_id)}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{shift.turno}</Badge>
                            </TableCell>
                            <TableCell>
                              {shift.hora_inicio} - {shift.hora_fin}
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                shift.estado === "Completado" ? "bg-green-100 text-green-800" :
                                shift.estado === "En Curso" ? "bg-blue-100 text-blue-800" :
                                shift.estado === "Cancelado" ? "bg-red-100 text-red-800" :
                                "bg-slate-100 text-slate-800"
                              }>
                                {shift.estado}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditShift(shift)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteShift(shift.id)}
                                  className="hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="swaps">
            <Card>
              <CardHeader>
                <CardTitle>Solicitudes de Intercambio de Turnos</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingSwaps.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    No hay solicitudes de intercambio pendientes
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingSwaps.map(swap => (
                      <div key={swap.id} className="border rounded-lg p-4 bg-slate-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={
                                swap.estado === "Aceptada por Receptor" ? "bg-blue-100 text-blue-800" :
                                "bg-yellow-100 text-yellow-800"
                              }>
                                {swap.estado}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {format(new Date(swap.fecha_solicitud), "dd/MM/yyyy HH:mm")}
                              </span>
                            </div>
                            <p className="font-semibold text-slate-900">
                              {getEmployeeName(swap.solicitante_id)} ↔️ {getEmployeeName(swap.receptor_id)}
                            </p>
                            <p className="text-sm text-slate-600 mt-1">Motivo: {swap.motivo}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveSwap(swap.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectSwap(swap.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Rechazar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Formulario Turno */}
      {showShiftForm && (
        <Dialog open={true} onOpenChange={handleCloseShiftForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingShift ? 'Editar Turno' : 'Nuevo Turno'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmitShift} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Empleado *</Label>
                  <Select
                    value={shiftFormData.employee_id}
                    onValueChange={(value) => setShiftFormData({...shiftFormData, employee_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fecha *</Label>
                  <Input
                    type="date"
                    value={shiftFormData.fecha}
                    onChange={(e) => setShiftFormData({...shiftFormData, fecha: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Turno *</Label>
                  <Select
                    value={shiftFormData.turno}
                    onValueChange={(value) => setShiftFormData({...shiftFormData, turno: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mañana">Mañana</SelectItem>
                      <SelectItem value="Tarde">Tarde</SelectItem>
                      <SelectItem value="Noche">Noche</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={shiftFormData.estado}
                    onValueChange={(value) => setShiftFormData({...shiftFormData, estado: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Programado">Programado</SelectItem>
                      <SelectItem value="Confirmado">Confirmado</SelectItem>
                      <SelectItem value="En Curso">En Curso</SelectItem>
                      <SelectItem value="Completado">Completado</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Hora Inicio *</Label>
                  <Input
                    type="time"
                    value={shiftFormData.hora_inicio}
                    onChange={(e) => setShiftFormData({...shiftFormData, hora_inicio: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Hora Fin *</Label>
                  <Input
                    type="time"
                    value={shiftFormData.hora_fin}
                    onChange={(e) => setShiftFormData({...shiftFormData, hora_fin: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={shiftFormData.notas || ""}
                  onChange={(e) => setShiftFormData({...shiftFormData, notas: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseShiftForm}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveShiftMutation.isPending}>
                  {saveShiftMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
