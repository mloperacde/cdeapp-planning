import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/table.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Edit, Trash2, UserX, Search, AlertCircle, ArrowLeft, 
  BarChart3, Infinity, CalendarDays, FileText, CheckSquare, 
  LayoutDashboard, Settings, Activity 
} from "lucide-react";
import { format, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';
import { debounce } from "lodash";

// Components
import AbsenceDashboard from "../components/employees/AbsenceDashboard";
import AbsenceNotifications from "../components/employees/AbsenceNotifications";
import LongAbsenceAlert from "../components/absences/LongAbsenceAlert";
import AbsenceTypeManager from "../components/absences/AbsenceTypeManager";
import AbsenceCalendar from "../components/absences/AbsenceCalendar";
import AbsenceApprovalPanel from "../components/absences/AbsenceApprovalPanel";
import VacationPendingBalancePanel from "../components/absences/VacationPendingBalancePanel";
import ResidualDaysManager from "../components/absences/ResidualDaysManager";
import AdvancedReportGenerator from "../components/reports/AdvancedReportGenerator";
import AbsenceForm from "../components/absences/AbsenceForm";
import AttendanceAnalyzer from "../components/attendance/AttendanceAnalyzer";
import { calculateVacationPendingBalance, removeAbsenceFromBalance } from "../components/absences/VacationPendingCalculator";
import { notifyAbsenceRequestRealtime } from "../components/notifications/AdvancedNotificationService";

export default function AbsenceManagementPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const queryClient = useQueryClient();

  // Load User & Context
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isShiftManager = useMemo(() => {
    // Simplified check - real app would check specific permissions/roles
    return currentUser?.role !== 'admin' && 
           (currentUser?.puesto?.toLowerCase().includes('jefe') || currentUser?.puesto?.toLowerCase().includes('shift'));
  }, [currentUser]);

  const [activeTab, setActiveTab] = useState(isShiftManager ? "dashboard" : "dashboard");

  // Load Data
  const { data: absences = [], isLoading } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-fecha_inicio'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
  });

  const { data: absenceTypes = [] } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.filter({ activo: true }, 'orden'),
  });

  const { data: vacations = [] } = useQuery({
    queryKey: ['vacations'],
    queryFn: () => base44.entities.Vacation.list(),
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
  });

  // Derived Data
  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => { if (emp.departamento) depts.add(emp.departamento); });
    return Array.from(depts).sort();
  }, [employees]);

  // Mutations
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
      const dataWithStatus = {
        ...data,
        estado_aprobacion: data.estado_aprobacion || 'Pendiente',
        solicitado_por: currentUser?.id || data.solicitado_por
      };
      
      let result;
      if (editingAbsence?.id) {
        result = await base44.entities.Absence.update(editingAbsence.id, dataWithStatus);
      } else {
        result = await base44.entities.Absence.create(dataWithStatus);
        
        // Notify
        const employee = employees.find(e => e.id === data.employee_id);
        const type = absenceTypes.find(at => at.id === data.absence_type_id);
        if (employee && type) {
          await notifyAbsenceRequestRealtime(result.id, employee.nombre, type, format(new Date(data.fecha_inicio), "dd/MM/yyyy"));
        }
      }

      await updateEmployeeAvailability(data.employee_id, "Ausente", {
        ausencia_inicio: data.fecha_inicio,
        ausencia_fin: data.fecha_fin_desconocida ? null : data.fecha_fin,
        ausencia_motivo: data.motivo,
      });

      const type = absenceTypes.find(at => at.id === data.absence_type_id);
      if (type) await calculateVacationPendingBalance(result, type, vacations, holidays);

      const { updateEmployeeAbsenteeismDaily } = await import("../components/absences/AbsenteeismCalculator");
      await updateEmployeeAbsenteeismDaily(data.employee_id);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['vacationPendingBalances'] });
      handleClose();
      toast.success("Ausencia guardada correctamente");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (absence) => {
      const year = new Date(absence.fecha_inicio).getFullYear();
      await removeAbsenceFromBalance(absence.id, absence.employee_id, year);
      await base44.entities.Absence.delete(absence.id);
      
      const remaining = absences.filter(a => a.employee_id === absence.employee_id && a.id !== absence.id);
      if (remaining.length === 0) await updateEmployeeAvailability(absence.employee_id, "Disponible");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['vacationPendingBalances'] });
      toast.success("Ausencia eliminada");
    },
  });

  // Handlers
  const handleEdit = (absence) => { setEditingAbsence(absence); setShowForm(true); };
  const handleClose = () => { setShowForm(false); setEditingAbsence(null); };
  const handleSubmit = (data) => saveMutation.mutate(data);
  const handleDelete = (absence) => { if (window.confirm('¿Eliminar ausencia?')) deleteMutation.mutate(absence); };
  const getEmployeeName = (id) => employees.find(e => e.id === id)?.nombre || "Desconocido";
  
  const debouncedSearchChange = useCallback(debounce((val) => setSearchTerm(val), 300), []);

  const filteredAbsences = useMemo(() => {
    return absences.filter(abs => {
      const emp = employees.find(e => e.id === abs.employee_id);
      if (isShiftManager && emp?.departamento !== currentUser?.departamento) return false; // Basic Shift Manager filter

      const matchesSearch = getEmployeeName(abs.employee_id).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTeam = selectedTeam === "all" || emp?.equipo === selectedTeam;
      const matchesDept = selectedDepartment === "all" || emp?.departamento === selectedDepartment;
      return matchesSearch && matchesTeam && matchesDept;
    });
  }, [absences, searchTerm, selectedTeam, selectedDepartment, employees, isShiftManager, currentUser]);

  const activeAbsences = filteredAbsences.filter(a => {
    const now = new Date();
    const start = new Date(a.fecha_inicio);
    const end = a.fecha_fin_desconocida ? now : new Date(a.fecha_fin);
    return now >= start && now <= end;
  });

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <UserX className="w-8 h-8 text-blue-600" />
              Gestión Integral de Ausencias
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {isShiftManager ? "Gestión de equipo y reportes de turno" : "Control centralizado de RRHH"}
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Ausencia
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 mb-6 h-auto">
            <TabsTrigger value="dashboard" className="py-2"><LayoutDashboard className="w-4 h-4 mr-2"/> Dashboard</TabsTrigger>
            <TabsTrigger value="list" className="py-2"><FileText className="w-4 h-4 mr-2"/> Listado</TabsTrigger>
            
            {!isShiftManager && (
              <>
                <TabsTrigger value="approval" className="py-2"><CheckSquare className="w-4 h-4 mr-2"/> Aprobaciones</TabsTrigger>
                <TabsTrigger value="calendar" className="py-2"><CalendarDays className="w-4 h-4 mr-2"/> Calendario</TabsTrigger>
                <TabsTrigger value="analysis" className="py-2"><Activity className="w-4 h-4 mr-2"/> Análisis & IA</TabsTrigger>
                <TabsTrigger value="config" className="py-2"><Settings className="w-4 h-4 mr-2"/> Configuración</TabsTrigger>
                <TabsTrigger value="reports" className="py-2"><BarChart3 className="w-4 h-4 mr-2"/> Informes</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-red-700 font-medium">Activas Ahora</p>
                      <p className="text-2xl font-bold text-red-900">{activeAbsences.length}</p>
                    </div>
                    <UserX className="w-8 h-8 text-red-600"/>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-blue-700 font-medium">Total Registradas</p>
                      <p className="text-2xl font-bold text-blue-900">{filteredAbsences.length}</p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-600"/>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AbsenceDashboard absences={filteredAbsences} employees={employees} />
              <div className="space-y-6">
                <AbsenceNotifications absences={filteredAbsences} employees={employees} absenceTypes={absenceTypes} />
                <LongAbsenceAlert employees={employees} absences={filteredAbsences} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            <Card>
              <CardHeader className="border-b">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <CardTitle>Registro de Ausencias</CardTitle>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Buscar..." 
                      className="w-full md:w-64" 
                      onChange={(e) => debouncedSearchChange(e.target.value)}
                    />
                    {!isShiftManager && (
                      <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Depto"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Fin</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAbsences.slice(0, 50).map(absence => (
                      <TableRow key={absence.id}>
                        <TableCell className="font-medium">{getEmployeeName(absence.employee_id)}</TableCell>
                        <TableCell><Badge variant="outline">{absence.tipo}</Badge></TableCell>
                        <TableCell>{format(new Date(absence.fecha_inicio), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell>
                          {absence.fecha_fin_desconocida ? <Badge>Indefinido</Badge> : format(new Date(absence.fecha_fin), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell><Badge variant={absence.estado_aprobacion === 'Aprobada' ? 'default' : 'secondary'}>{absence.estado_aprobacion}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(absence)}><Edit className="w-4 h-4"/></Button>
                          {!isShiftManager && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(absence)} className="text-red-600"><Trash2 className="w-4 h-4"/></Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approval">
            <AbsenceApprovalPanel absences={absences} employees={employees} absenceTypes={absenceTypes} currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="calendar">
            <AbsenceCalendar absences={absences} employees={employees} absenceTypes={absenceTypes} />
          </TabsContent>

          <TabsContent value="analysis">
            <AttendanceAnalyzer />
          </TabsContent>

          <TabsContent value="config">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader><CardTitle>Tipos de Ausencia</CardTitle></CardHeader>
                <CardContent><AbsenceTypeManager /></CardContent>
              </Card>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <VacationPendingBalancePanel employees={employees} compact={true} />
                <ResidualDaysManager employees={employees} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <AdvancedReportGenerator />
          </TabsContent>
        </Tabs>

        {showForm && (
          <Dialog open={true} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAbsence ? 'Editar Ausencia' : 'Nueva Ausencia'}</DialogTitle>
              </DialogHeader>
              <AbsenceForm 
                initialData={editingAbsence}
                employees={employees}
                absenceTypes={absenceTypes}
                onSubmit={handleSubmit}
                onCancel={handleClose}
                isSubmitting={saveMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}