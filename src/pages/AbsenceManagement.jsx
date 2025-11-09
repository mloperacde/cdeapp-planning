import React, { useState } from "react";
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
import { UserX, Plus, Edit, Trash2, Search, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function AbsenceManagementPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    employee_id: "",
    fecha_inicio: "",
    fecha_fin: "",
    motivo: "",
    tipo: "Otro",
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

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Actualizar el estado del empleado a Ausente
      await base44.entities.Employee.update(data.employee_id, {
        disponibilidad: "Ausente",
        ausencia_inicio: data.fecha_inicio,
        ausencia_fin: data.fecha_fin,
        ausencia_motivo: data.motivo
      });

      if (editingAbsence?.id) {
        return base44.entities.Absence.update(editingAbsence.id, data);
      }
      return base44.entities.Absence.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      handleClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (absence) => {
      // Actualizar el estado del empleado a Disponible
      await base44.entities.Employee.update(absence.employee_id, {
        disponibilidad: "Disponible",
        ausencia_inicio: null,
        ausencia_fin: null,
        ausencia_motivo: null
      });

      return base44.entities.Absence.delete(absence.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const handleEdit = (absence) => {
    setEditingAbsence(absence);
    setFormData(absence);
    setSelectedEmployee(employees.find(e => e.id === absence.employee_id));
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingAbsence(null);
    setSelectedEmployee(null);
    setFormData({
      employee_id: "",
      fecha_inicio: "",
      fecha_fin: "",
      motivo: "",
      tipo: "Otro",
      notas: "",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (absence) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta ausencia?')) {
      deleteMutation.mutate(absence);
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    setSelectedEmployee(emp);
    setFormData({ ...formData, employee_id: employeeId });
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.nombre || "Empleado desconocido";
  };

  const filteredEmployees = employees.filter(emp =>
    emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAbsenceActive = (absence) => {
    const now = new Date();
    const inicio = new Date(absence.fecha_inicio);
    const fin = new Date(absence.fecha_fin);
    return now >= inicio && now <= fin;
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <UserX className="w-8 h-8 text-blue-600" />
              Gestión de Ausencias
            </h1>
            <p className="text-slate-600 mt-1">
              Configura y administra las ausencias de empleados
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

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Registro de Ausencias ({absences.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">Cargando ausencias...</div>
            ) : absences.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No hay ausencias registradas
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Estado</TableHead>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha Inicio</TableHead>
                      <TableHead>Fecha Fin</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {absences.map((absence) => (
                      <TableRow key={absence.id} className="hover:bg-slate-50">
                        <TableCell>
                          {isAbsenceActive(absence) ? (
                            <Badge className="bg-red-100 text-red-800">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Activa
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-50 text-slate-600">
                              Finalizada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-slate-900">
                            {getEmployeeName(absence.employee_id)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{absence.tipo}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            {format(new Date(absence.fecha_inicio), "dd/MM/yyyy HH:mm", { locale: es })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            {format(new Date(absence.fecha_fin), "dd/MM/yyyy HH:mm", { locale: es })}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{absence.motivo}</TableCell>
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
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
              {!editingAbsence && (
                <div className="space-y-2">
                  <Label>Buscar Empleado *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Buscar por nombre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {searchTerm && filteredEmployees.length > 0 && (
                    <div className="border rounded-lg max-h-48 overflow-y-auto">
                      {filteredEmployees.map((emp) => (
                        <div
                          key={emp.id}
                          onClick={() => {
                            handleEmployeeSelect(emp.id);
                            setSearchTerm("");
                          }}
                          className={`p-3 hover:bg-slate-50 cursor-pointer border-b last:border-b-0 ${
                            selectedEmployee?.id === emp.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="font-semibold text-slate-900">{emp.nombre}</div>
                          <div className="text-xs text-slate-500">
                            {emp.departamento} - {emp.puesto}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedEmployee && (
                    <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                      <div className="font-semibold text-blue-900">{selectedEmployee.nombre}</div>
                      <div className="text-sm text-blue-700">
                        {selectedEmployee.departamento} - {selectedEmployee.puesto}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                    placeholder="Breve descripción"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha_inicio">Fecha y Hora Inicio *</Label>
                  <Input
                    id="fecha_inicio"
                    type="datetime-local"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha_fin">Fecha y Hora Fin *</Label>
                  <Input
                    id="fecha_fin"
                    type="datetime-local"
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
                  placeholder="Información adicional..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700" 
                  disabled={saveMutation.isPending || (!editingAbsence && !selectedEmployee)}
                >
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