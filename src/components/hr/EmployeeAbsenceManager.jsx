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
import { UserX, Plus, Edit, Trash2, Calendar, Infinity as InfinityIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import { format, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function EmployeeAbsenceManager({ employee }) {
  const [showForm, setShowForm] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState(null);
  const [fullDay, setFullDay] = useState(false);
  const [unknownEndDate, setUnknownEndDate] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    fecha_inicio: "",
    fecha_fin: "",
    fecha_fin_desconocida: false,
    motivo: "",
    tipo: "",
    absence_type_id: "",
    remunerada: true,
    notas: "",
  });

  const { data: absences = [] } = useQuery({
    queryKey: ['absences', employee.id],
    queryFn: () => base44.entities.Absence.filter({ employee_id: employee.id }, '-fecha_inicio'),
    initialData: [],
  });

  const { data: absenceTypes = [] } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.filter({ activo: true }, 'orden'),
    initialData: [],
  });

  const updateEmployeeAvailability = async (disponibilidad, ausenciaData = {}) => {
    await base44.entities.EmployeeMasterDatabase.update(employee.id, {
      disponibilidad,
      ausencia_inicio: ausenciaData.ausencia_inicio || null,
      ausencia_fin: ausenciaData.ausencia_fin || null,
      ausencia_motivo: ausenciaData.ausencia_motivo || null,
      incluir_en_planning: disponibilidad === "Disponible"
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let result;
      if (editingAbsence?.id) {
        result = await base44.entities.Absence.update(editingAbsence.id, data);
      } else {
        result = await base44.entities.Absence.create(data);
      }

      // Actualizar disponibilidad del empleado
      await updateEmployeeAvailability("Ausente", {
        ausencia_inicio: data.fecha_inicio,
        ausencia_fin: data.fecha_fin_desconocida ? null : data.fecha_fin,
        ausencia_motivo: data.motivo,
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['employeesMaster'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      handleClose();
      toast.success("Ausencia registrada. Cambios aplicados en todos los módulos.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (absence) => {
      await base44.entities.Absence.delete(absence.id);
      
      const remaining = absences.filter(abs => abs.id !== absence.id);
      if (remaining.length === 0) {
        await updateEmployeeAvailability("Disponible");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['employeesMaster'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success("Ausencia eliminada. Cambios aplicados en todos los módulos.");
    },
  });

  const handleEdit = (absence) => {
    setEditingAbsence(absence);
    setUnknownEndDate(absence.fecha_fin_desconocida || false);
    setFormData({ 
      ...absence, 
      remunerada: absence.remunerada ?? true,
      fecha_fin_desconocida: absence.fecha_fin_desconocida || false,
    });
    
    if (absence.fecha_inicio && absence.fecha_fin && !absence.fecha_fin_desconocida) {
      const start = new Date(absence.fecha_inicio);
      const end = new Date(absence.fecha_fin);
      if (start.getHours() === 0 && start.getMinutes() === 0 &&
          end.getHours() === 23 && end.getMinutes() === 59) {
        setFullDay(true);
      } else {
        setFullDay(false);
      }
    }
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingAbsence(null);
    setFullDay(false);
    setUnknownEndDate(false);
    setFormData({
      fecha_inicio: "",
      fecha_fin: "",
      fecha_fin_desconocida: false,
      motivo: "",
      tipo: "",
      absence_type_id: "",
      remunerada: true,
      notas: "",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let finalData = { 
      ...formData, 
      employee_id: employee.employee_id || employee.id 
    };

    if (unknownEndDate) {
      finalData.fecha_fin_desconocida = true;
      finalData.fecha_fin = new Date('2099-12-31').toISOString();
    } else {
      finalData.fecha_fin_desconocida = false;
      
      if (fullDay && formData.fecha_inicio && formData.fecha_fin) {
        const startDate = new Date(formData.fecha_inicio);
        const endDate = new Date(formData.fecha_fin);
        
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        finalData.fecha_inicio = startDate.toISOString();
        finalData.fecha_fin = endDate.toISOString();
      }
    }

    saveMutation.mutate(finalData);
  };

  const handleAbsenceTypeChange = (absenceTypeId) => {
    const selectedType = absenceTypes.find(at => at.id === absenceTypeId);
    if (selectedType) {
      setFormData({
        ...formData,
        absence_type_id: absenceTypeId,
        tipo: selectedType.nombre,
        remunerada: selectedType.remunerada || false,
      });
    }
  };

  const isAbsenceActive = (absence) => {
    const now = new Date();
    const start = new Date(absence.fecha_inicio);
    
    if (absence.fecha_fin_desconocida) return now >= start;
    
    const end = new Date(absence.fecha_fin);
    return now >= start && now <= end;
  };

  const isAbsenceExpired = (absence) => {
    if (absence.fecha_fin_desconocida) return false;
    return isPast(new Date(absence.fecha_fin));
  };

  const activeAbsences = absences.filter(abs => isAbsenceActive(abs));
  const expiredAbsences = absences.filter(abs => isAbsenceExpired(abs) && !isAbsenceActive(abs));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <UserX className="w-5 h-5 text-red-600" />
          Gestión de Ausencias
        </h3>
        <Button
          onClick={() => setShowForm(true)}
          size="sm"
          className="bg-red-600 hover:bg-red-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Ausencia
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-3">
            <div className="text-center">
              <p className="text-xs text-red-700 font-medium">Activas</p>
              <p className="text-xl font-bold text-red-900">{activeAbsences.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-3">
            <div className="text-center">
              <p className="text-xs text-blue-700 font-medium">Total</p>
              <p className="text-xl font-bold text-blue-900">{absences.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardContent className="p-3">
            <div className="text-center">
              <p className="text-xs text-slate-700 font-medium">Finalizadas</p>
              <p className="text-xl font-bold text-slate-900">{expiredAbsences.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ausencias Finalizadas Alert */}
      {expiredAbsences.length > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">
                  {expiredAbsences.length} ausencia(s) finalizada(s)
                </p>
                <p className="text-xs text-amber-700">
                  El empleado debería estar disponible automáticamente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Ausencias */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Registro de Ausencias</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {absences.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">
              No hay ausencias registradas
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Inicio</TableHead>
                    <TableHead className="text-xs">Fin</TableHead>
                    <TableHead className="text-xs">Motivo</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absences.map((absence) => {
                    const isActive = isAbsenceActive(absence);
                    const isExpired = isAbsenceExpired(absence);
                    
                    return (
                      <TableRow 
                        key={absence.id} 
                        className={`${isActive ? 'bg-red-50' : isExpired ? 'bg-slate-50' : ''}`}
                      >
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-xs">{absence.tipo}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {format(new Date(absence.fecha_inicio), "dd/MM/yy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell className="text-xs">
                          {absence.fecha_fin_desconocida ? (
                            <Badge className="bg-purple-100 text-purple-800 text-xs">
                              <InfinityIcon className="w-3 h-3" />
                            </Badge>
                          ) : (
                            format(new Date(absence.fecha_fin), "dd/MM/yy HH:mm", { locale: es })
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{absence.motivo}</TableCell>
                        <TableCell className="text-xs">
                          <Badge className={`text-xs ${
                            isActive ? "bg-red-600" :
                            isExpired ? "bg-slate-500" :
                            "bg-blue-600"
                          }`}>
                            {isActive ? "Activa" : isExpired ? "Finalizada" : "Futura"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(absence)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-red-50 hover:text-red-600"
                              onClick={() => {
                                if (confirm('¿Eliminar esta ausencia?')) {
                                  deleteMutation.mutate(absence);
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
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

      {/* Form Dialog */}
      {showForm && (
        <Dialog open={true} onOpenChange={handleClose}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAbsence ? 'Editar Ausencia' : 'Nueva Ausencia'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Ausencia *</Label>
                  <Select
                    value={formData.absence_type_id}
                    onValueChange={handleAbsenceTypeChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {absenceTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.nombre}
                          {type.remunerada && " (Remunerada)"}
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

              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <Checkbox
                  id="remunerada"
                  checked={formData.remunerada}
                  onCheckedChange={(checked) => setFormData({ ...formData, remunerada: checked })}
                />
                <label htmlFor="remunerada" className="text-sm font-medium cursor-pointer">
                  Ausencia Remunerada
                </label>
              </div>

              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <Checkbox
                  id="fullDay"
                  checked={fullDay}
                  onCheckedChange={setFullDay}
                  disabled={unknownEndDate}
                />
                <label htmlFor="fullDay" className="text-sm font-medium cursor-pointer">
                  Día completo (00:00 - 23:59)
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha {!fullDay && "y Hora"} Inicio *</Label>
                  <Input
                    type={fullDay ? "date" : "datetime-local"}
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fecha {!fullDay && "y Hora"} Fin</Label>
                  <Input
                    type={fullDay ? "date" : "datetime-local"}
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                    required={!unknownEndDate}
                    disabled={unknownEndDate}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-purple-50 border-2 border-purple-300 rounded-lg p-3">
                <Checkbox
                  id="unknownEndDate"
                  checked={unknownEndDate}
                  onCheckedChange={(checked) => {
                    setUnknownEndDate(checked);
                    if (checked) setFullDay(false);
                  }}
                />
                <label htmlFor="unknownEndDate" className="text-sm font-medium text-purple-900 cursor-pointer flex items-center gap-2">
                  <InfinityIcon className="w-4 h-4" />
                  Fecha de fin desconocida
                </label>
              </div>

              <div className="space-y-2">
                <Label>Notas Adicionales</Label>
                <Textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={saveMutation.isPending}>
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
