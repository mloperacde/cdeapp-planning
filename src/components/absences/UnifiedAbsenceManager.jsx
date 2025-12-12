import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { UserX, Plus, Edit, Trash2, Search, CheckCircle2, AlertCircle, Clock, FileText, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import AdvancedSearch from "../common/AdvancedSearch";
import { createAbsence, updateAbsence, deleteAbsence } from "./AbsenceOperations";

const EMPTY_ARRAY = [];

export default function UnifiedAbsenceManager({ sourceContext = "rrhh" }) {
  const [showForm, setShowForm] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState(null);
  const [filters, setFilters] = useState({});
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    employee_id: "",
    fecha_inicio: "",
    fecha_fin: "",
    fecha_fin_desconocida: false,
    motivo: "",
    tipo: "",
    notas: "",
  });

  const { data: absences = EMPTY_ARRAY } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-fecha_inicio'),
  });

  const { data: employees = EMPTY_ARRAY } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
  });

  const { data: masterEmployees = EMPTY_ARRAY } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
  });

  const { data: absenceTypes = EMPTY_ARRAY } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.list('orden'),
    initialData: EMPTY_ARRAY,
  });

  const { data: vacations = [] } = useQuery({
    queryKey: ['vacations'],
    queryFn: () => base44.entities.Vacation.list(),
    initialData: [],
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
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
    let targetList = employees.length > 0 ? employees : masterEmployees;
    
    if (sourceContext === 'shift_manager') {
      targetList = targetList.filter(e => e.departamento === 'FABRICACION');
    }
    
    const total = targetList.filter(e => (e.estado_empleado || "Alta") === "Alta").length;
    
    const relevantAbsences = activeAbsencesConsolidated.filter(abs => 
      targetList.some(e => e.id === abs.employee_id)
    );
    
    const ausentes = relevantAbsences.length;
    const disponibles = Math.max(0, total - ausentes);
    
    return { disponibles, ausentes, total };
  }, [employees, masterEmployees, activeAbsencesConsolidated, sourceContext]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingAbsence?.id) {
        return await updateAbsence(
          editingAbsence.id, 
          data, 
          currentUser, 
          absenceTypes, 
          vacations, 
          holidays
        );
      } else {
        const allEmployees = [...employees, ...masterEmployees];
        return await createAbsence(
          data, 
          currentUser, 
          allEmployees, 
          absenceTypes, 
          vacations, 
          holidays
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['vacationPendingBalances'] });
      queryClient.invalidateQueries({ queryKey: ['globalAbsenteeism'] });
      toast.success("Ausencia registrada correctamente");
      handleClose();
    },
    onError: (error) => {
      toast.error("Error al guardar ausencia: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const absence = absences.find(a => a.id === id);
      if (absence) {
        const allEmployees = [...employees, ...masterEmployees];
        await deleteAbsence(absence, allEmployees);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['vacationPendingBalances'] });
      toast.success("Ausencia eliminada");
    }
  });

  const handleEdit = (absence) => {
    setEditingAbsence(absence);
    setFormData({
      employee_id: absence.employee_id,
      fecha_inicio: absence.fecha_inicio?.substring(0, 16) || "",
      fecha_fin: absence.fecha_fin?.substring(0, 16) || "",
      fecha_fin_desconocida: absence.fecha_fin_desconocida || false,
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
      fecha_fin_desconocida: false,
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
      
      const searchTerm = filters.searchTerm || "";
      const matchesSearch = !searchTerm || 
        getEmployeeName(abs.employee_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        abs.motivo?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const isShiftManager = sourceContext === 'shift_manager';
      if (isShiftManager && employee?.departamento !== 'FABRICACION') return false;

      return matchesSearch;
    });
  }, [activeAbsencesConsolidated, filters, employees, masterEmployees, sourceContext]);

  const handleSummarizeNotes = async (absenceId, notes) => {
    if (!notes || notes.length < 10) return;
    
    toast.info("Generando resumen con IA...");
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Summarize the following absence notes into a very short, concise sentence (max 10 words). Language: Spanish. Notes: "${notes}"`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" }
          }
        }
      });
      
      if (response && response.summary) {
        toast.success("Resumen: " + response.summary, { duration: 5000 });
      }
    } catch (error) {
      console.error("Error summarizing:", error);
      toast.error("Error al resumir");
    }
  };

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
          <div className="mb-6">
            <AdvancedSearch
              data={activeAbsencesConsolidated}
              onFilterChange={setFilters}
              searchFields={['motivo']} 
              placeholder="Buscar por empleado o motivo..."
              pageId={`absence_manager_${sourceContext}`}
            />
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Estado de la ausencia</TableHead>
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
                          {abs.notas && abs.notas.length > 20 && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleSummarizeNotes(abs.id, abs.notas)}
                              title="Resumir notas con IA"
                              className="text-purple-600 hover:bg-purple-50"
                            >
                              <Sparkles className="w-4 h-4" />
                            </Button>
                          )}
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
                  <Label>Fecha y Hora Fin {formData.fecha_fin_desconocida ? '(Desconocida)' : '*'}</Label>
                  <Input
                    type="datetime-local"
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                    required={!formData.fecha_fin_desconocida}
                    disabled={formData.fecha_fin_desconocida}
                  />
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox 
                      id="unknown_end" 
                      checked={formData.fecha_fin_desconocida}
                      onCheckedChange={(checked) => setFormData({ 
                        ...formData, 
                        fecha_fin_desconocida: checked,
                        fecha_fin: checked ? "" : formData.fecha_fin
                      })}
                    />
                    <label
                      htmlFor="unknown_end"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Fecha fin desconocida
                    </label>
                  </div>
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