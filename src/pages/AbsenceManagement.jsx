
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Edit, Trash2, UserX, Search, AlertCircle, ArrowLeft, BarChart3 } from "lucide-react";
import { format, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AbsenceDashboard from "../components/employees/AbsenceDashboard";
import AbsenceNotifications from "../components/employees/AbsenceNotifications";

export default function AbsenceManagementPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all"); // Added state for department filter
  const [fullDay, setFullDay] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    employee_id: "",
    fecha_inicio: "",
    fecha_fin: "",
    motivo: "",
    tipo: "Vacaciones",
    remunerada: true, // Added remunerada field
    notas: "",
  });

  const { data: absences, isLoading } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-fecha_inicio'),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const { data: absenceTypes } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.list('orden'),
    initialData: [],
  });

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const updateEmployeeAvailability = async (employeeId, disponibilidad, ausenciaData = {}) => {
    await base44.entities.Employee.update(employeeId, {
      disponibilidad,
      ausencia_inicio: ausenciaData.ausencia_inicio || null,
      ausencia_fin: ausenciaData.ausencia_fin || null,
      ausencia_motivo: ausenciaData.ausencia_motivo || null,
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Primero guardar/actualizar la ausencia
      let result;
      if (editingAbsence?.id) {
        result = await base44.entities.Absence.update(editingAbsence.id, data);
      } else {
        result = await base44.entities.Absence.create(data);
      }

      // Actualizar estado del empleado a "Ausente" y copiar datos de ausencia
      await updateEmployeeAvailability(data.employee_id, "Ausente", {
        ausencia_inicio: data.fecha_inicio,
        ausencia_fin: data.fecha_fin,
        ausencia_motivo: data.motivo,
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      handleClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (absence) => {
      // Primero eliminar la ausencia
      await base44.entities.Absence.delete(absence.id);
      
      // Comprobar si el empleado tiene más ausencias
      const remainingAbsences = absences.filter(
        abs => abs.employee_id === absence.employee_id && abs.id !== absence.id
      );

      // Si no tiene más ausencias, restaurar disponibilidad
      if (remainingAbsences.length === 0) {
        await updateEmployeeAvailability(absence.employee_id, "Disponible");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const handleEdit = (absence) => {
    setEditingAbsence(absence);
    // Ensure remunerada has a default if not present in absence object
    setFormData({ ...absence, remunerada: absence.remunerada ?? true });
    // Check if dates are full day (e.g., 00:00 and 23:59) to set fullDay checkbox
    const start = new Date(absence.fecha_inicio);
    const end = new Date(absence.fecha_fin);
    if (start.getHours() === 0 && start.getMinutes() === 0 &&
        end.getHours() === 23 && end.getMinutes() === 59) {
      setFullDay(true);
    } else {
      setFullDay(false);
    }
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingAbsence(null);
    setFullDay(false);
    setFormData({
      employee_id: "",
      fecha_inicio: "",
      fecha_fin: "",
      motivo: "",
      tipo: "Vacaciones",
      remunerada: true, // Reset remunerada
      notas: "",
    });
    setSearchTerm(""); // Reset search term for employee select
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let finalData = { ...formData };

    // Si está marcado como día completo, ajustar las horas
    if (fullDay && formData.fecha_inicio && formData.fecha_fin) {
      const startDate = new Date(formData.fecha_inicio);
      const endDate = new Date(formData.fecha_fin);
      
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      finalData.fecha_inicio = startDate.toISOString();
      finalData.fecha_fin = endDate.toISOString();
    }

    saveMutation.mutate(finalData);
  };

  const handleDelete = (absence) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta ausencia?')) {
      deleteMutation.mutate(absence);
    }
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.nombre || "Empleado desconocido";
  };

  const isAbsenceActive = (absence) => {
    const now = new Date();
    const start = new Date(absence.fecha_inicio);
    const end = new Date(absence.fecha_fin);
    return now >= start && now <= end;
  };

  const isAbsenceExpired = (absence) => {
    return isPast(new Date(absence.fecha_fin));
  };

  const filteredAbsences = useMemo(() => {
    return absences.filter(abs => {
      const employee = employees.find(e => e.id === abs.employee_id);
      const matchesSearch = 
        getEmployeeName(abs.employee_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        abs.motivo?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTeam = selectedTeam === "all" || employee?.equipo === selectedTeam;
      const matchesDepartment = selectedDepartment === "all" || employee?.departamento === selectedDepartment;
      
      return matchesSearch && matchesTeam && matchesDepartment;
    });
  }, [absences, searchTerm, selectedTeam, selectedDepartment, employees]);

  const activeAbsences = useMemo(() => {
    return absences.filter(abs => isAbsenceActive(abs));
  }, [absences]);

  const expiredAbsences = useMemo(() => {
    return absences.filter(abs => isAbsenceExpired(abs) && !isAbsenceActive(abs));
  }, [absences]);

  const employeesForSelect = useMemo(() => {
    return employees.filter(emp => 
      !searchTerm || emp.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Employees")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Empleados
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <UserX className="w-8 h-8 text-blue-600" />
              Gestión de Ausencias
            </h1>
            <p className="text-slate-600 mt-1">
              Registra y gestiona las ausencias de empleados
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Ausencia
          </Button>
        </div>

        <Tabs defaultValue="absences" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="absences">
              <UserX className="w-4 h-4 mr-2" />
              Registro de Ausencias
            </TabsTrigger>
            <TabsTrigger value="dashboard">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard Estadísticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="absences" className="space-y-6">
            {/* Nuevo panel de notificaciones */}
            <AbsenceNotifications 
              absences={absences}
              employees={employees}
              absenceTypes={absenceTypes}
            />

            {/* Alertas de ausencias expiradas */}
            {expiredAbsences.length > 0 && (
              <Card className="mb-6 bg-amber-50 border-amber-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-900">
                    <AlertCircle className="w-5 h-5" />
                    Ausencias Finalizadas ({expiredAbsences.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-amber-800 mb-3">
                    Las siguientes ausencias han finalizado. Los empleados deberían estar disponibles automáticamente.
                  </p>
                  <div className="space-y-2">
                    {expiredAbsences.slice(0, 5).map((absence) => (
                      <div key={absence.id} className="flex justify-between items-center bg-white p-3 rounded border border-amber-200">
                        <div>
                          <span className="font-semibold text-slate-900">{getEmployeeName(absence.employee_id)}</span>
                          <span className="text-sm text-slate-600 ml-2">
                            - Finalizó el {format(new Date(absence.fecha_fin), "dd/MM/yyyy HH:mm", { locale: es })}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(absence)}
                          className="text-amber-700 hover:bg-amber-100"
                        >
                          Marcar como Disponible
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-red-700 font-medium">Ausencias Activas</p>
                      <p className="text-2xl font-bold text-red-900">{activeAbsences.length}</p>
                    </div>
                    <UserX className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-700 font-medium">Total Ausencias</p>
                      <p className="text-2xl font-bold text-blue-900">{absences.length}</p>
                    </div>
                    <UserX className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-amber-700 font-medium">Finalizadas</p>
                      <p className="text-2xl font-bold text-amber-900">{expiredAbsences.length}</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-amber-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <CardTitle>Registro de Ausencias</CardTitle>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Buscar ausencias..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-wrap">
                    <Label className="text-sm font-medium text-slate-700">Filtros:</Label>
                    
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los Departamentos</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Equipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los Equipos</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.team_name}>
                            {team.team_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-12 text-center text-slate-500">Cargando ausencias...</div>
                ) : filteredAbsences.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    No hay ausencias registradas
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Empleado</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Fecha Inicio</TableHead>
                          <TableHead>Fecha Fin</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAbsences.map((absence) => {
                          const isActive = isAbsenceActive(absence);
                          const isExpired = isAbsenceExpired(absence);
                          
                          return (
                            <TableRow 
                              key={absence.id} 
                              className={`hover:bg-slate-50 ${isActive ? 'bg-red-50' : isExpired ? 'bg-slate-50' : ''}`}
                            >
                              <TableCell>
                                <span className={`font-semibold ${isActive ? 'text-red-700' : 'text-slate-900'}`}>
                                  {getEmployeeName(absence.employee_id)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{absence.tipo}</Badge>
                              </TableCell>
                              <TableCell>
                                {format(new Date(absence.fecha_inicio), "dd/MM/yyyy HH:mm", { locale: es })}
                              </TableCell>
                              <TableCell>
                                {format(new Date(absence.fecha_fin), "dd/MM/yyyy HH:mm", { locale: es })}
                              </TableCell>
                              <TableCell>{absence.motivo}</TableCell>
                              <TableCell>
                                <Badge className={
                                  isActive ? "bg-red-100 text-red-800" :
                                  isExpired ? "bg-slate-100 text-slate-600" :
                                  "bg-blue-100 text-blue-800"
                                }>
                                  {isActive ? "Activa" : isExpired ? "Finalizada" : "Futura"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(absence)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(absence)}
                                    className="hover:bg-red-50 hover:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard">
            <AbsenceDashboard absences={absences} employees={employees} />
          </TabsContent>
        </Tabs>
      </div>

      {showForm && (
        <Dialog open={true} onOpenChange={handleClose}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAbsence ? 'Editar Ausencia' : 'Nueva Ausencia'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employee_id">Empleado *</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Buscar y seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="Buscar empleado..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mb-2"
                      />
                    </div>
                    {employeesForSelect.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.nombre} {emp.disponibilidad === "Ausente" && "(Ya ausente)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Ausencia *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vacaciones">Vacaciones</SelectItem>
                      <SelectItem value="Baja médica">Baja médica</SelectItem>
                      <SelectItem value="Permiso">Permiso</SelectItem>
                      <SelectItem value="Ausencia justificada">Ausencia justificada</SelectItem>
                      <SelectItem value="Ausencia injustificada">Ausencia injustificada</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motivo">Motivo *</Label>
                  <Input
                    id="motivo"
                    value={formData.motivo}
                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <Checkbox
                  id="remunerada"
                  checked={formData.remunerada}
                  onCheckedChange={(checked) => setFormData({ ...formData, remunerada: checked })}
                />
                <label htmlFor="remunerada" className="text-sm font-medium text-slate-900 cursor-pointer">
                  Ausencia Remunerada (con pago de salario)
                </label>
              </div>

              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <Checkbox
                  id="fullDay"
                  checked={fullDay}
                  onCheckedChange={setFullDay}
                />
                <label htmlFor="fullDay" className="text-sm font-medium text-slate-900 cursor-pointer">
                  Ausencia de horario completo (00:00 - 23:59)
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_inicio">Fecha {!fullDay && "y Hora"} Inicio *</Label>
                  <Input
                    id="fecha_inicio"
                    type={fullDay ? "date" : "datetime-local"}
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha_fin">Fecha {!fullDay && "y Hora"} Fin *</Label>
                  <Input
                    id="fecha_fin"
                    type={fullDay ? "date" : "datetime-local"}
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas Adicionales</Label>
                <Textarea
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Al guardar esta ausencia, el empleado será marcado automáticamente como "Ausente" 
                  y los datos de la ausencia se copiarán a su ficha en la pestaña "Disponibilidad".
                </p>
              </div>

              <div className="flex justify-end gap-3">
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
