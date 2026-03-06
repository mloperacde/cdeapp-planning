import React, { useState, useMemo, useEffect } from "react";
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
} from "@/components/ui/table";
import { UserX, Plus, Edit, Trash2, Search, CheckCircle2, AlertCircle, Clock, FileText, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import AdvancedSearch from "../common/AdvancedSearch";
import { createAbsence, updateAbsence, deleteAbsence } from "./AbsenceOperations";
import AbsenceForm from "./AbsenceForm";

const EMPTY_ARRAY = [];

export default function UnifiedAbsenceManager(props) {
  const { 
    sourceContext = "rrhh",
    initialEmployeeId,
    initialEmployeeName,
  } = props;
  const [showForm, setShowForm] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState(null);
  const [filters, setFilters] = useState({});
   const [filterDept, setFilterDept] = useState("all");
   const [filterPuesto, setFilterPuesto] = useState("all");
   const [filterEquipo, setFilterEquipo] = useState("all");
  const [autoOpenedFromContext, setAutoOpenedFromContext] = useState(false);
  const queryClient = useQueryClient();

  // formData state removed as it is handled by AbsenceForm component

  const { data: fetchedAbsences = EMPTY_ARRAY } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-fecha_inicio', 1000),
    enabled: !props.initialAbsences,
  });

  const { data: fetchedEmployees = EMPTY_ARRAY } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre', 1000),
    enabled: !props.initialEmployees,
  });

  const absences = props.initialAbsences || fetchedAbsences;
  const employees = props.initialEmployees || fetchedEmployees;

  const { data: absenceTypes = EMPTY_ARRAY } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.list('orden', 1000),
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

  // Fecha de hoy en ISO (yyyy-MM-dd)
  const todayISO = useMemo(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }, []);

  // Auditoría de presencia del día (Local fallback)
  const { data: attendanceAuditToday } = useQuery({
    queryKey: ['attendanceAuditToday', todayISO],
    queryFn: async () => {
      try {
        // Fetch local records instead of calling backend function
        const records = await base44.entities.AttendanceRecord.filter({ record_date: todayISO }, "employee_id", 2000);
        
        // Build simple audit structure
        const recordSet = new Set();
        records.forEach(r => {
           if (r.employee_id) recordSet.add(String(r.employee_id));
           // Also try matching by name if ID is missing (simplified)
        });

        const sinRegistro = employees.filter(e => {
           if (e.incluir_en_planning === false) return false;
           const id = String(e.id);
           const code = e.codigo_empleado ? String(e.codigo_empleado) : "";
           return !recordSet.has(id) && (!code || !recordSet.has(code));
        });

        return {
           rows: records, // Simplified
           sinRegistro: sinRegistro,
           noEnMaestra: []
        };
      } catch (e) {
        console.warn("Fallo en auditoría local:", e);
        return null;
      }
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1, 
  });

  // Índice rápido por empleado de la auditoría de hoy
  const attendanceRowsByEmployeeId = useMemo(() => {
    const map = new Map();
    // Validar que attendanceAuditToday y rows existan antes de iterar
    const rows = attendanceAuditToday?.rows;
    if (Array.isArray(rows)) {
      for (const r of rows) {
        if (r?.employee_id != null) {
          map.set(String(r.employee_id), r);
        }
      }
    }
    return map;
  }, [attendanceAuditToday]);

  // Consolidado de ausencias activas
  const activeAbsencesConsolidated = useMemo(() => {
    const now = new Date();
    
    return absences.filter(abs => {
      if (!abs.fecha_inicio) return false;
      const start = new Date(abs.fecha_inicio);
      const end = abs.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(abs.fecha_fin);
      
      // Include Approved and Pending, exclude Rejected
      // Also ensure consistency with Dashboard
      return now >= start && now <= end && abs.estado_aprobacion !== "Rechazada";
    });
  }, [absences]);

  // Consolidado de empleados disponibles vs ausentes
  const availabilityStats = useMemo(() => {
    let targetList = employees;
    
    // Filter by context
    if (sourceContext === 'shift_manager') {
      targetList = targetList.filter(e =>   
        e.departamento?.toUpperCase() === 'FABRICACION' || 
        e.puesto?.toUpperCase().includes('OPERARI') ||
        e.equipo
      );
    }

    // Filter ONLY ACTIVE employees for counters
    const activeEmployees = targetList.filter(e => (e.estado_empleado || "Alta") === "Alta");
    
    const total = activeEmployees.length;
    
    const relevantAbsences = activeAbsencesConsolidated.filter(abs => 
      activeEmployees.some(e => e.id === abs.employee_id)
    );
    
    // Count unique absent employees (in case of overlapping absences)
    const uniqueAbsentEmployeeIds = new Set(relevantAbsences.map(abs => abs.employee_id));
    const ausentes = uniqueAbsentEmployeeIds.size;
    const disponibles = Math.max(0, total - ausentes);
    
    return { disponibles, ausentes, total };
  }, [employees, activeAbsencesConsolidated, sourceContext]);

  // Conteo coherente con auditoría: empleados que deberían haber acudido y no tienen fichaje
  const ausentesHoySegunAuditoria = useMemo(() => {
    // Si la auditoría aún no carga o falla, mostrar 0 para evitar errores.
    // La auditoría puede devolver null si falla el backend.
    const sinRegistro = attendanceAuditToday?.sinRegistro;
    return Array.isArray(sinRegistro) ? sinRegistro.length : 0;
  }, [attendanceAuditToday]);

  // Finalizar ausencia por fichaje (usar primer marcaje del día)
  // queryClient already declared above
  const finalizeAbsenceMutation = useMutation({
    mutationFn: async ({ absence, firstPunch }) => {
      if (!absence?.id || !firstPunch) return;
      const endISO = new Date(`${todayISO}T${String(firstPunch).slice(0, 5)}`).toISOString();
      const payload = {
        ...absence,
        fecha_fin: endISO,
        fecha_fin_desconocida: false,
      };
      return await updateAbsence(absence.id, payload, currentUser, absenceTypes, vacations, holidays);
    },
    onSuccess: async () => {
      try {
        await base44.functions.invoke('syncEmployeeAvailability');
      } catch (e) {
        console.warn('Sync availability failed', e);
      }
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employeesMaster'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['vacationPendingBalances'] });
      queryClient.invalidateQueries({ queryKey: ['globalAbsenteeism'] });
      toast.success('Ausencia finalizada con la hora del primer fichaje');
    },
    onError: (error) => {
      toast.error('Error al finalizar ausencia: ' + (error?.message || ''));
    },
  });

  const employeesWithActiveAbsence = useMemo(() => {
    const ids = new Set(activeAbsencesConsolidated.map(abs => String(abs.employee_id)));
    return employees.filter(e => ids.has(String(e.id)));
  }, [activeAbsencesConsolidated, employees]);

  const deptOptions = useMemo(() => {
    const set = new Set(
      employeesWithActiveAbsence
        .map(e => e.departamento)
        .filter(Boolean)
    );
    return Array.from(set).sort();
  }, [employeesWithActiveAbsence]);

  const puestoOptions = useMemo(() => {
    const set = new Set(
      employeesWithActiveAbsence
        .map(e => e.puesto)
        .filter(Boolean)
    );
    return Array.from(set).sort();
  }, [employeesWithActiveAbsence]);

  const equipoOptions = useMemo(() => {
    const set = new Set(
      employeesWithActiveAbsence
        .map(e => e.equipo)
        .filter(Boolean)
    );
    return Array.from(set).sort();
  }, [employeesWithActiveAbsence]);

  useEffect(() => {
    if (!initialEmployeeId || autoOpenedFromContext) return;
    if (!employees || employees.length === 0) return;

    const emp = employees.find(e => String(e.id) === String(initialEmployeeId));
    const employeeName = initialEmployeeName || emp?.nombre || "";

    setEditingAbsence({
      employee_id: String(initialEmployeeId),
      employee_name: employeeName,
      remunerada: true,
    });
    setShowForm(true);
    setAutoOpenedFromContext(true);
  }, [initialEmployeeId, initialEmployeeName, employees, autoOpenedFromContext]);

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
        return await createAbsence(
          data, 
          currentUser, 
          employees, 
          absenceTypes, 
          vacations, 
          holidays
        );
      }
    },
    onSuccess: async () => {
      // Sync availability status
      try {
          await base44.functions.invoke('syncEmployeeAvailability');
      } catch (e) {
          console.warn("Sync availability failed", e);
      }
      
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employeesMaster'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['vacationPendingBalances'] });
      queryClient.invalidateQueries({ queryKey: ['globalAbsenteeism'] });
      toast.success("Ausencia registrada. Cambios aplicados en todos los módulos.");
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
        await deleteAbsence(absence, employees);
      }
    },
    onSuccess: async () => {
      try {
          await base44.functions.invoke('syncEmployeeAvailability');
      } catch (e) {
          console.warn("Sync availability failed", e);
      }
      
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employeesMaster'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['vacationPendingBalances'] });
      toast.success("Ausencia eliminada. Cambios aplicados en todos los módulos.");
    }
  });

  const handleEdit = (absence) => {
    const emp = employees.find(e => e.id === absence.employee_id);
    setEditingAbsence({ ...absence, employee_name: emp?.nombre || "Desconocido" });
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingAbsence(null);
  };

  const handleFormSubmit = (data) => {
    saveMutation.mutate(data);
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => String(e.id) === String(employeeId));
    return emp?.nombre || "Desconocido";
  };

  const filteredAbsences = useMemo(() => {
    return activeAbsencesConsolidated.filter(abs => {
      const employee = employees.find(e => String(e.id) === String(abs.employee_id));
      
      const searchTerm = filters.searchTerm || "";
      const matchesSearch = !searchTerm || 
        getEmployeeName(abs.employee_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        abs.motivo?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const isShiftManager = sourceContext === 'shift_manager';
      if (isShiftManager && employee?.departamento !== 'FABRICACION') return false;

      const dept = employee?.departamento || "";
      const puesto = employee?.puesto || "";
      const equipo = employee?.equipo || "";

      const matchesDept = filterDept === "all" || dept === filterDept;
      const matchesPuesto = filterPuesto === "all" || puesto === filterPuesto;
      const matchesEquipo = filterEquipo === "all" || equipo === filterEquipo;

      if (!matchesDept || !matchesPuesto || !matchesEquipo) return false;

      return matchesSearch;
    });
  }, [activeAbsencesConsolidated, filters, employees, sourceContext, filterDept, filterPuesto, filterEquipo]);

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
                <p className="text-xs text-red-700 dark:text-red-300 font-medium">Ausencias Activas</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">{activeAbsencesConsolidated.length}</p>
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
          <div className="mb-6 space-y-4">
            <AdvancedSearch
              data={activeAbsencesConsolidated}
              onFilterChange={setFilters}
              searchFields={['motivo']} 
              placeholder="Buscar por empleado o motivo..."
              pageId={`absence_manager_${sourceContext}`}
            />

            <div className="flex flex-wrap gap-3 items-center">
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los departamentos</SelectItem>
                  {deptOptions.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterPuesto} onValueChange={setFilterPuesto}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Puesto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los puestos</SelectItem>
                  {puestoOptions.map(p => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterEquipo} onValueChange={setFilterEquipo}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Equipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los equipos</SelectItem>
                  {equipoOptions.map(e => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
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
                  const emp = employees.find(e => String(e.id) === String(abs.employee_id));
                  const auditRow = attendanceRowsByEmployeeId.get(String(abs.employee_id));
                  const canFinalizeByPunch = !!auditRow?.primerMarcaje && (abs.fecha_fin_desconocida || !abs.fecha_fin);
                  return (
                    <TableRow key={abs.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <TableCell className="font-semibold">
                        {getEmployeeName(abs.employee_id)}
                        <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                          Solicitado por: {abs.created_by || "Sistema"}
                        </div>
                      </TableCell>
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
                          {canFinalizeByPunch && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => finalizeAbsenceMutation.mutate({ absence: abs, firstPunch: auditRow.primerMarcaje })}
                              className="text-red-700"
                            >
                              Finalizar por fichaje
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

            <AbsenceForm
              initialData={editingAbsence}
              employees={employees}
              absenceTypes={absenceTypes}
              onSubmit={handleFormSubmit}
              onCancel={handleClose}
              onDelete={(id) => deleteMutation.mutate(id, { onSuccess: handleClose })}
              isSubmitting={saveMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
