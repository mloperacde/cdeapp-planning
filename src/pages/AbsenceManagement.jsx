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
} from "@/components/ui/table.jsx";
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
          <TabsContent value="config">
            <Card>
              <CardHeader><CardTitle>Configuración de Ausencias</CardTitle></CardHeader>
              <CardContent className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Tipos de Ausencia</h3>
                  <AbsenceTypeManager />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Días Pendientes y Residuales</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <VacationPendingBalancePanel employees={employees} compact={true} />
                    <ResidualDaysManager employees={employees} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <AdvancedReportGenerator />
          </TabsContent>

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
      // Establecer estado inicial como Pendiente
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
        
        // Notificación en tiempo real a supervisores
        const employee = employees.find(e => e.id === data.employee_id);
        const absenceType = absenceTypes.find(at => at.id === data.absence_type_id);
        if (employee && absenceType) {
          try {
            await notifyAbsenceRequestRealtime(
              result.id, 
              employee.nombre, 
              absenceType,
              format(new Date(data.fecha_inicio), "dd/MM/yyyy", { locale: es })
            );
            toast.success("Notificaciones enviadas a los supervisores");
          } catch (error) {
            console.error("Error enviando notificaciones:", error);
          }
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
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingAbsence(null);
  };

  const handleSubmit = (data) => {
    saveMutation.mutate(data);
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

  // Code moved to AbsenceForm component

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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <UserX className="w-8 h-8 text-blue-600" />
              Gestión de Ausencias
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
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
              <Card className="mb-6 bg-amber-50 dark:bg-amber-900/20 border-amber-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                    <AlertCircle className="w-5 h-5" />
                    Ausencias Finalizadas ({expiredAbsences.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                    Las siguientes ausencias han finalizado. Los empleados deberían estar disponibles automáticamente.
                  </p>
                  <div className="space-y-2">
                    {expiredAbsences.slice(0, 5).map((absence) => (
                      <div key={absence.id} className="flex justify-between items-center bg-white dark:bg-card p-3 rounded border border-amber-200">
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{getEmployeeName(absence.employee_id)}</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400 ml-2">
                            - Finalizó el {format(new Date(absence.fecha_fin), "dd/MM/yyyy HH:mm", { locale: es })}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(absence)}
                          className="text-amber-700 dark:text-amber-200 hover:bg-amber-100"
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
                      <p className="text-xs text-red-700 dark:text-red-200 font-medium">Ausencias Activas</p>
                      <p className="text-2xl font-bold text-red-900 dark:text-red-100">{activeAbsences.length}</p>
                    </div>
                    <UserX className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-700 dark:text-blue-200 font-medium">Total Ausencias</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{absences.length}</p>
                    </div>
                    <UserX className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-amber-700 dark:text-amber-200 font-medium">Finalizadas</p>
                      <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{expiredAbsences.length}</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-amber-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-lg border-0 bg-white dark:bg-card/80 dark:bg-card/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
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
                  <div className="p-12 text-center text-slate-500 dark:text-slate-400">Cargando ausencias...</div>
                ) : filteredAbsences.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                    No hay ausencias registradas
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-800/50">
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
                              className={`hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 ${isActive ? 'bg-red-50 dark:bg-red-900/20' : isExpired ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}
                            >
                              <TableCell>
                                <span className={`font-semibold ${isActive ? 'text-red-700 dark:text-red-200' : 'text-slate-900 dark:text-slate-100'}`}>
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
                                  isExpired ? "bg-slate-100 text-slate-600 dark:text-slate-400" :
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
                                    className="hover:bg-red-50 dark:bg-red-900/20 hover:text-red-600"
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
  );
}