import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tantml:react-query";
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
import { MessageSquare, Plus, UserX, ArrowLeft, Clock, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ShiftAbsenceReportPage() {
  const [showForm, setShowForm] = useState(false);
  const [fullDay, setFullDay] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    employee_id: "",
    fecha_inicio: "",
    fecha_fin: "",
    motivo: "",
    tipo: "Ausencia justificada",
    remunerada: true,
    notas: "",
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const { data: absences } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-fecha_inicio'),
    initialData: [],
  });

  const { data: absenceTypes } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.list('orden'),
    initialData: [],
  });

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
      const result = await base44.entities.Absence.create(data);
      
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

  const handleClose = () => {
    setShowForm(false);
    setFullDay(false);
    setFormData({
      employee_id: "",
      fecha_inicio: "",
      fecha_fin: "",
      motivo: "",
      tipo: "Ausencia justificada",
      remunerada: true,
      notas: "",
    });
    setSearchTerm("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let finalData = { ...formData };

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

  const activeAbsencesToday = useMemo(() => {
    const now = new Date();
    return absences.filter(abs => {
      const start = new Date(abs.fecha_inicio);
      const end = new Date(abs.fecha_fin);
      return now >= start && now <= end;
    });
  }, [absences]);

  const todayAbsences = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return absences.filter(abs => {
      const startDate = format(new Date(abs.fecha_inicio), 'yyyy-MM-dd');
      return startDate === today;
    });
  }, [absences]);

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.nombre || "Empleado desconocido";
  };

  const employeesForSelect = useMemo(() => {
    return employees.filter(emp => 
      emp.disponibilidad === "Disponible" &&
      (!searchTerm || emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [employees, searchTerm]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("ShiftManagers")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Panel de Control
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-red-600" />
              Comunicación de Ausencias
            </h1>
            <p className="text-slate-600 mt-1">
              Reporta ausencias que ocurran durante tu turno de trabajo
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Comunicar Ausencia
          </Button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 font-medium">Ausentes Ahora</p>
                  <p className="text-2xl font-bold text-red-900">{activeAbsencesToday.length}</p>
                </div>
                <UserX className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Comunicadas Hoy</p>
                  <p className="text-2xl font-bold text-blue-900">{todayAbsences.length}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Total Empleados</p>
                  <p className="text-2xl font-bold text-green-900">{employees.length}</p>
                </div>
                <Clock className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info para Jefes de Turno */}
        <Card className="mb-6 bg-blue-50 border-2 border-blue-300">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>ℹ️ Instrucciones para Jefes de Turno:</strong></p>
                <p>• Comunica ausencias que ocurran durante tu turno (enfermedad repentina, emergencia, etc.)</p>
                <p>• El empleado será marcado automáticamente como "Ausente" en el sistema</p>
                <p>• La ausencia quedará registrada y visible para Recursos Humanos</p>
                <p>• El empleado recibirá una notificación sobre la ausencia comunicada</p>
                <p>• Solo se muestran empleados actualmente disponibles para comunicar su ausencia</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ausencias Activas Hoy */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mb-6">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Ausencias Activas Hoy ({activeAbsencesToday.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activeAbsencesToday.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No hay ausencias activas hoy
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Empleado</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha Inicio</TableHead>
                      <TableHead>Fecha Fin</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeAbsencesToday.map((absence) => {
                      const employee = employees.find(e => e.id === absence.employee_id);
                      return (
                        <TableRow key={absence.id} className="bg-red-50">
                          <TableCell>
                            <div className="font-semibold text-red-700">
                              {employee?.nombre || "Desconocido"}
                            </div>
                            <div className="text-xs text-red-600">
                              {employee?.puesto}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{employee?.departamento}</Badge>
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
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas Ausencias Comunicadas Hoy */}
        {todayAbsences.length > 0 && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Ausencias Comunicadas Hoy ({todayAbsences.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {todayAbsences.slice(0, 5).map((absence) => {
                  const employee = employees.find(e => e.id === absence.employee_id);
                  return (
                    <div key={absence.id} className="p-3 border rounded-lg bg-slate-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-slate-900">{employee?.nombre}</div>
                          <div className="text-sm text-slate-600 mt-1">
                            {absence.tipo} - {absence.motivo}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Comunicada: {format(new Date(absence.created_date), "dd/MM/yyyy HH:mm", { locale: es })}
                          </div>
                        </div>
                        <Badge className={
                          absence.remunerada ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }>
                          {absence.remunerada ? "Remunerada" : "No remunerada"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Formulario de Comunicación */}
      {showForm && (
        <Dialog open={true} onOpenChange={handleClose}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Comunicar Ausencia</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>⚠️ Importante:</strong> Utiliza este formulario para comunicar ausencias que ocurran 
                  durante tu turno (enfermedad repentina, emergencia familiar, etc.). El empleado será marcado 
                  automáticamente como ausente.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee_id">Empleado *</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Buscar y seleccionar empleado disponible" />
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
                        {emp.nombre} - {emp.departamento} ({emp.puesto})
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
                      {absenceTypes.filter(t => t.activo).map(type => (
                        <SelectItem key={type.id} value={type.nombre}>
                          {type.nombre}
                        </SelectItem>
                      ))}
                      <SelectItem value="Ausencia justificada">Ausencia justificada</SelectItem>
                      <SelectItem value="Ausencia injustificada">Ausencia injustificada</SelectItem>
                      <SelectItem value="Baja médica">Baja médica</SelectItem>
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
                    placeholder="Ej: Enfermedad repentina"
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
                  placeholder="Detalles adicionales sobre la ausencia..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Al guardar esta comunicación, el empleado será marcado automáticamente 
                  como "Ausente" en el sistema y Recursos Humanos será notificado.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Comunicando..." : "Comunicar Ausencia"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}