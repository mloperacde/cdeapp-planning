import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EmployeeSelect from "../common/EmployeeSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserX, Plus, Edit, Trash2, Search, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { format, isWithinInterval, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function UnifiedAbsenceManager({ sourceContext = "rrhh" }) {
  const [showForm, setShowForm] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    employee_id: "",
    fecha_inicio: "",
    fecha_fin: "",
    motivo: "",
    tipo: "",
    notas: "",
  });

  const { data: absences = [] } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-fecha_inicio'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
  });

  const { data: masterEmployees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
  });

  const { data: absenceTypes = [] } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.list('orden'),
    initialData: [],
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Consolidado de ausencias activas
  const activeAbsencesConsolidated = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return absences.filter(abs => {
      const start = new Date(abs.fecha_inicio);
      const end = abs.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(abs.fecha_fin);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      
      return today >= start && today <= end;
    });
  }, [absences]);

  // Consolidado de empleados disponibles vs ausentes
  const availabilityStats = useMemo(() => {
    // Usar solo empleados operativos si existen, de lo contrario maestros
    // Evitar duplicar sumando ambas listas
    const targetList = employees.length > 0 ? employees : masterEmployees;
    
    const total = targetList.filter(e => (e.estado_empleado || "Alta") === "Alta").length;
    const ausentes = activeAbsencesConsolidated.length;
    
    // Calcular disponibles restando ausencias reales (no confiando en el flag estático)
    // Aseguramos que no sea negativo si hay inconsistencias
    const disponibles = Math.max(0, total - ausentes);
    
    return { disponibles, ausentes, total };
  }, [employees, masterEmployees, activeAbsencesConsolidated]);

  const departments = useMemo(() => {
    const depts = new Set();
    [...employees, ...masterEmployees].forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees, masterEmployees]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const dataWithStatus = {
        ...data,
        estado_aprobacion: 'Pendiente',
        solicitado_por: currentUser?.id
      };
      
      if (editingAbsence?.id) {
        return await base44.entities.Absence.update(editingAbsence.id, dataWithStatus);
      } else {
        return await base44.entities.Absence.create(dataWithStatus);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      toast.success("Ausencia registrada correctamente");
      handleClose();
    },
    onError: (error) => {
      toast.error("Error al guardar ausencia: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Absence.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      toast.success("Ausencia eliminada");
    }
  });

  const handleEdit = (absence) => {
    setEditingAbsence(absence);
    setFormData({
      employee_id: absence.employee_id,
      fecha_inicio: absence.fecha_inicio?.substring(0, 16) || "",
      fecha_fin: absence.fecha_fin?.substring(0, 16) || "",
      motivo: absence.motivo || "",
      tipo: absence.tipo || "",
      notas: absence.notas || "",
    });
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingAbsence(null);
    setFormData({
      employee_id: "",
      fecha_inicio: "",
      fecha_fin: "",
      motivo: "",
      tipo: "",
      notas: "",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId) || 
                masterEmployees.find(e => e.id === employeeId);
    return emp?.nombre || "Desconocido";
  };

  const filteredAbsences = useMemo(() => {
    return activeAbsencesConsolidated.filter(abs => {
      const employee = employees.find(e => e.id === abs.employee_id) ||
                      masterEmployees.find(e => e.id === abs.employee_id);
      
      const matchesSearch = !searchTerm || 
        getEmployeeName(abs.employee_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        abs.motivo?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDept = selectedDepartment === "all" || employee?.departamento === selectedDepartment;
      
      return matchesSearch && matchesDept;
    });
  }, [activeAbsencesConsolidated, searchTerm, selectedDepartment, employees, masterEmployees]);

  return (
    <div className="space-y-6">
      {/* Consolidado de disponibilidad */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Total Empleados</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{availabilityStats.total}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 dark:text-green-300 font-medium">Disponibles</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{availabilityStats.disponibles}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-700 dark:text-red-300 font-medium">Ausentes Hoy</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">{availabilityStats.ausentes}</p>
              </div>
              <UserX className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gestión de ausencias */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-blue-600" />
              Comunicación de Ausencias Activas
            </CardTitle>
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Comunicar Ausencia
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4 mb-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar empleado o motivo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredAbsences.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No hay ausencias activas en este momento
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800">
                  <TableHead>Empleado</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAbsences.map(abs => {
                  const emp = employees.find(e => e.id === abs.employee_id) ||
                            masterEmployees.find(e => e.id === abs.employee_id);
                  return (
                    <TableRow key={abs.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <TableCell className="font-semibold">{getEmployeeName(abs.employee_id)}</TableCell>
                      <TableCell>{emp?.departamento || "-"}</TableCell>
                      <TableCell><Badge variant="outline">{abs.tipo}</Badge></TableCell>
                      <TableCell>{abs.motivo}</TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(abs.fecha_inicio), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell className="text-xs">
                        {abs.fecha_fin_desconocida ? (
                          <Badge className="bg-purple-600">Desconocida</Badge>
                        ) : (
                          format(new Date(abs.fecha_fin), "dd/MM/yyyy HH:mm", { locale: es })
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-red-600">Activa</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(abs)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              if (confirm("¿Finalizar esta ausencia?")) {
                                deleteMutation.mutate(abs.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de formulario */}
      {showForm && (
        <Dialog open={true} onOpenChange={handleClose}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAbsence ? 'Editar Ausencia' : 'Comunicar Nueva Ausencia'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Empleado *</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {[...employees, ...masterEmployees]
                      .filter((emp, idx, self) => self.findIndex(e => e.id === emp.id) === idx)
                      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
                      .map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.nombre} {emp.departamento ? `- ${emp.departamento}` : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Ausencia *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {absenceTypes.filter(t => t.activo && t.visible_empleados).map(type => (
                        <SelectItem key={type.id} value={type.nombre}>
                          {type.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Motivo *</Label>
                  <Input
                    value={formData.motivo}
                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                    placeholder="Especificar motivo"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha y Hora Inicio *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fecha y Hora Fin *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas Adicionales</Label>
                <Textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={3}
                  placeholder="Información adicional sobre la ausencia..."
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Nota:</strong> Esta comunicación quedará registrada como ausencia pendiente de aprobación 
                  y se notificará a los responsables correspondientes.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {saveMutation.isPending ? "Guardando..." : "Guardar Ausencia"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}