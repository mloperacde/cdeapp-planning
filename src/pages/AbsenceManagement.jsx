import React, { useState, useMemo, useCallback } from "react";
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
import { Plus, Edit, Trash2, UserX, Search, AlertCircle, ArrowLeft, BarChart3, Infinity, Settings, CalendarDays, CheckSquare, Upload, GitFork, FileText } from "lucide-react";
import { format, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AbsenceDashboard from "../components/employees/AbsenceDashboard";
import AbsenceNotifications from "../components/employees/AbsenceNotifications";
import PaidLeaveBalance from "../components/absences/PaidLeaveBalance";
import LongAbsenceAlert from "../components/absences/LongAbsenceAlert";
import AbsenceTypeManager from "../components/absences/AbsenceTypeManager";
import AbsenceCalendar from "../components/absences/AbsenceCalendar";
import AbsenceApprovalPanel from "../components/absences/AbsenceApprovalPanel";
import VacationPendingBalancePanel from "../components/absences/VacationPendingBalancePanel";
import { calculateVacationPendingBalance, removeAbsenceFromBalance } from "../components/absences/VacationPendingCalculator";
import { debounce } from "lodash";
import { toast } from 'sonner';
import { checkAndExecuteWorkflows } from "../components/workflows/WorkflowAutomation";

import ApprovalFlowManager from "../components/absences/ApprovalFlowManager";
import RecurringAbsenceMonitor from "../components/absences/RecurringAbsenceMonitor";
import AdvancedReportGenerator from "../components/reports/AdvancedReportGenerator";
import { notifySupervisorsAbsenceRequest } from "../components/notifications/NotificationService";
import { notifyAbsenceRequestRealtime } from "../components/notifications/AdvancedNotificationService";
import ResidualDaysManager from "../components/absences/ResidualDaysManager";

// Sugerencias de motivos frecuentes por tipo
const SUGGESTED_REASONS = {
  "Baja médica": [
    "Gripe / Resfriado común",
    "Gastroenteritis",
    "Lesión muscular",
    "Dolor de espalda / Lumbalgia",
    "Cirugía programada",
    "Recuperación post-operatoria",
    "Estrés / Ansiedad",
    "Migraña",
    "Tratamiento médico",
    "Enfermedad crónica",
    "Otra enfermedad"
  ],
  "Indisposición": [
    "Malestar general",
    "Dolor de cabeza intenso",
    "Mareo / Vértigo",
    "Problemas digestivos",
    "Fatiga extrema",
    "Reacción alérgica",
    "Otra indisposición"
  ],
  "Accidente laboral": [
    "Caída en el lugar de trabajo",
    "Golpe con maquinaria",
    "Corte / Herida",
    "Quemadura",
    "Esguince / Torcedura",
    "Lesión por movimiento repetitivo",
    "Exposición a sustancias nocivas",
    "Otro accidente laboral"
  ],
  "Fuerza mayor": [
    "Emergencia familiar grave",
    "Hospitalización de familiar directo",
    "Fallecimiento de familiar",
    "Desastre natural",
    "Problema de transporte grave",
    "Incendio en domicilio",
    "Inundación",
    "Otra causa de fuerza mayor"
  ],
  "Permiso no remunerado": [
    "Asuntos personales",
    "Cuidado de familiar",
    "Trámites legales",
    "Mudanza",
    "Viaje personal",
    "Formación no laboral",
    "Otro motivo personal"
  ]
};

export default function AbsenceManagementPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [fullDay, setFullDay] = useState(false);
  const [unknownEndDate, setUnknownEndDate] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [activeTab, setActiveTab] = useState("list"); // New state for active tab
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    employee_id: "",
    fecha_inicio: "",
    fecha_fin: "",
    fecha_fin_desconocida: false,
    motivo: "",
    tipo: "",
    absence_type_id: "",
    remunerada: true,
    notas: "",
    documentos_adjuntos: [],
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
    queryFn: () => base44.entities.AbsenceType.filter({ activo: true }, 'orden'),
    initialData: [],
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
      let result;
      if (editingAbsence?.id) {
        result = await base44.entities.Absence.update(editingAbsence.id, data);
      } else {
        result = await base44.entities.Absence.create(data);
        
        // Notificación en tiempo real a supervisores
        const employee = employees.find(e => e.id === data.employee_id);
        const absenceType = absenceTypes.find(at => at.id === data.absence_type_id);
        if (employee && absenceType) {
          await notifyAbsenceRequestRealtime(
            result.id, 
            employee.nombre, 
            absenceType,
            format(new Date(data.fecha_inicio), "dd/MM/yyyy", { locale: es })
          );
        }
      }

      // Actualizar estado del empleado
      await updateEmployeeAvailability(data.employee_id, "Ausente", {
        ausencia_inicio: data.fecha_inicio,
        ausencia_fin: data.fecha_fin_desconocida ? null : data.fecha_fin,
        ausencia_motivo: data.motivo,
      });

      // Calcular saldo de vacaciones pendientes si aplica
      const absenceType = absenceTypes.find(at => at.id === data.absence_type_id);
      if (absenceType) {
        await calculateVacationPendingBalance(result, absenceType, vacations, holidays);
      }

      // Actualizar absentismo del empleado
      const { updateEmployeeAbsenteeismDaily } = await import("../components/absences/AbsenteeismCalculator");
      await updateEmployeeAbsenteeismDaily(data.employee_id);

      // Ejecutar flujos de trabajo automatizados
      const employee = employees.find(e => e.id === data.employee_id);
      if (employee && data.fecha_inicio && data.fecha_fin) {
        const start = new Date(data.fecha_inicio);
        const end = new Date(data.fecha_fin);
        const diasAusencia = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        await checkAndExecuteWorkflows("ausencia", {
          absence_id: result.id,
          employee_id: data.employee_id,
          employee_name: employee.nombre,
          tipo_ausencia: data.tipo,
          diasAusencia,
          referencia_tipo: "Absence",
          referencia_id: result.id
        });
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['vacationPendingBalances'] });
      queryClient.invalidateQueries({ queryKey: ['globalAbsenteeism'] });
      handleClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (absence) => {
      // Eliminar de balance si existe
      const year = new Date(absence.fecha_inicio).getFullYear();
      await removeAbsenceFromBalance(absence.id, absence.employee_id, year);

      await base44.entities.Absence.delete(absence.id);
      
      const remainingAbsences = absences.filter(
        abs => abs.employee_id === absence.employee_id && abs.id !== absence.id
      );

      if (remainingAbsences.length === 0) {
        await updateEmployeeAvailability(absence.employee_id, "Disponible");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['vacationPendingBalances'] });
    },
  });

  const handleEdit = (absence) => {
    setEditingAbsence(absence);
    setUnknownEndDate(absence.fecha_fin_desconocida || false);
    setFormData({ 
      ...absence, 
      remunerada: absence.remunerada ?? true,
      fecha_fin_desconocida: absence.fecha_fin_desconocida || false,
      documentos_adjuntos: absence.documentos_adjuntos || []
    });
    
    // Check if full day
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
      employee_id: "",
      fecha_inicio: "",
      fecha_fin: "",
      fecha_fin_desconocida: false,
      motivo: "",
      tipo: "",
      absence_type_id: "",
      remunerada: true,
      notas: "",
      documentos_adjuntos: [],
    });
    setSearchTerm("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let finalData = { ...formData };

    // Si la fecha de fin es desconocida, establecer una fecha muy lejana
    if (unknownEndDate) {
      finalData.fecha_fin_desconocida = true;
      finalData.fecha_fin = new Date('2099-12-31').toISOString();
    } else {
      finalData.fecha_fin_desconocida = false;
      
      // Si está marcado como día completo, ajustar las horas
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
    
    if (absence.fecha_fin_desconocida) {
      return now >= start;
    }
    
    const end = new Date(absence.fecha_fin);
    return now >= start && now <= end;
  };

  const isAbsenceExpired = (absence) => {
    if (absence.fecha_fin_desconocida) return false;
    return isPast(new Date(absence.fecha_fin));
  };

  // Debounced search
  const debouncedSearchChange = useCallback(
    debounce((value) => {
      setSearchTerm(value);
    }, 300),
    []
  );

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

  // Obtener sugerencias de motivos según el tipo seleccionado
  const suggestedReasons = useMemo(() => {
    const selectedType = absenceTypes.find(at => at.id === formData.absence_type_id);
    if (!selectedType) return [];
    
    // Buscar en las sugerencias predefinidas
    const typeName = selectedType.nombre?.toLowerCase();
    for (const [key, suggestions] of Object.entries(SUGGESTED_REASONS)) {
      if (typeName.includes(key.toLowerCase())) {
        return suggestions;
      }
    }
    
    return [];
  }, [formData.absence_type_id, absenceTypes]);

  // Manejar cambio de tipo de ausencia
  const handleAbsenceTypeChange = (absenceTypeId) => {
    const selectedType = absenceTypes.find(at => at.id === absenceTypeId);
    if (selectedType) {
      setFormData({
        ...formData,
        absence_type_id: absenceTypeId,
        tipo: selectedType.nombre,
        remunerada: selectedType.remunerada || false,
        motivo: "" // Reset motivo al cambiar tipo
      });
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      
      const documentos = results.map((result, idx) => ({
        nombre: files[idx].name,
        url: result.file_url,
        tipo: files[idx].type,
        fecha_subida: new Date().toISOString()
      }));

      setFormData({
        ...formData,
        documentos_adjuntos: [...(formData.documentos_adjuntos || []), ...documentos]
      });

      toast.success(`${files.length} archivo(s) subido(s)`);
      e.target.value = null; // Clear input
    } catch (error) {
      toast.error("Error al subir archivos");
      console.error("Error uploading files:", error);
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeDocument = (index) => {
    const updated = formData.documentos_adjuntos.filter((_, i) => i !== index);
    setFormData({ ...formData, documentos_adjuntos: updated });
    toast.info("Documento eliminado.");
  };

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8 mb-6">
            <TabsTrigger value="list">Listado</TabsTrigger>
            <TabsTrigger value="approval">Aprobar</TabsTrigger>
            <TabsTrigger value="balance">Saldos</TabsTrigger>
            <TabsTrigger value="residual">Días Residuales</TabsTrigger>
            <TabsTrigger value="pending">Días Pendientes</TabsTrigger>
            <TabsTrigger value="calendar">Calendario</TabsTrigger>
            <TabsTrigger value="types">Tipos</TabsTrigger>
            <TabsTrigger value="reports">Reportes</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <LongAbsenceAlert employees={employees} absences={absences} />

              <AbsenceNotifications 
                absences={absences}
                employees={employees}
                absenceTypes={absenceTypes}
              />
            </div>

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
                        defaultValue={searchTerm}
                        onChange={(e) => debouncedSearchChange(e.target.value)}
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
                                {absence.fecha_fin_desconocida ? (
                                  <Badge className="bg-purple-100 text-purple-800">
                                    <Infinity className="w-3 h-3 mr-1" />
                                    Desconocida
                                  </Badge>
                                ) : (
                                  format(new Date(absence.fecha_fin), "dd/MM/yyyy HH:mm", { locale: es })
                                )}
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

          <TabsContent value="approval">
            <AbsenceApprovalPanel
              absences={absences}
              employees={employees}
              absenceTypes={absenceTypes}
              currentUser={currentUser}
            />
          </TabsContent>

          <TabsContent value="balance">
            <VacationPendingBalancePanel employees={employees} />
          </TabsContent>

          <TabsContent value="residual">
            <ResidualDaysManager employees={employees} />
          </TabsContent>

          <TabsContent value="pending">
            <VacationPendingBalancePanel employees={employees} compact={false} />
          </TabsContent>

          <TabsContent value="calendar">
            <AbsenceCalendar
              absences={absences}
              employees={employees}
              absenceTypes={absenceTypes}
            />
          </TabsContent>

          <TabsContent value="types">
            <AbsenceTypeManager />
          </TabsContent>

          <TabsContent value="reports">
            <AdvancedReportGenerator />
          </TabsContent>
        </Tabs>
      </div>

      {showForm && (
        <Dialog open={true} onOpenChange={handleClose}>
          <DialogContent 
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
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
                  <Label htmlFor="absence_type_id">Tipo de Ausencia *</Label>
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
                  <Label htmlFor="motivo">Motivo *</Label>
                  {suggestedReasons.length > 0 ? (
                    <Select
                      value={formData.motivo}
                      onValueChange={(value) => setFormData({ ...formData, motivo: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {suggestedReasons.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="motivo"
                      value={formData.motivo}
                      onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                      placeholder="Especificar motivo"
                      required
                    />
                  )}
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
                  disabled={unknownEndDate}
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
                  <Label htmlFor="fecha_fin">Fecha {!fullDay && "y Hora"} Fin</Label>
                  <Input
                    id="fecha_fin"
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
                    if (checked) {
                      setFullDay(false);
                    }
                  }}
                />
                <label htmlFor="unknownEndDate" className="text-sm font-medium text-purple-900 cursor-pointer flex items-center gap-2">
                  <Infinity className="w-4 h-4" />
                  Fecha de fin desconocida (empleado ausente hasta finalizar manualmente)
                </label>
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

              {/* New Document Upload Section */}
              <div className="space-y-2 border-t pt-4">
                <Label className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Documentos Adjuntos (Justificantes, Certificados, etc.)
                </Label>
                <input
                  type="file"
                  id="documents-upload"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('documents-upload').click()}
                  disabled={uploadingFiles}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingFiles ? "Subiendo..." : "Adjuntar Documentos"}
                </Button>
                
                {formData.documentos_adjuntos?.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {formData.documentos_adjuntos.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded border">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm truncate flex-1 text-blue-600 hover:underline">
                          {doc.nombre}
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(idx)}
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Esta solicitud quedará pendiente de aprobación según el flujo configurado para este tipo de ausencia.
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