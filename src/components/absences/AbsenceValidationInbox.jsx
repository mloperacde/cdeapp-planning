import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { startOfWeek, format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle, CheckCircle2, X, Search, ClipboardCheck,
  Trash2, RefreshCw, Filter, Clock, Bot
} from "lucide-react";
import { toast } from "sonner";
import AbsenceForm from "./AbsenceForm";

const EMPTY = [];

// Estados de presencia que indican ausencia pendiente de validar
const ABSENT_STATES = new Set(['Potencialmente Ausente', 'Retraso', 'Ausente Auto', 'Ausente']);

export default function AbsenceValidationInbox({ employees = EMPTY, absenceTypes = EMPTY, filterDate = null }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [showValidateDialog, setShowValidateDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedAbsence, setSelectedAbsence] = useState(null);
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Cargar calendario de turnos de la semana actual
  const mondayStr = useMemo(() => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
    return format(monday, 'yyyy-MM-dd');
  }, []);

  const { data: weekSchedules = [] } = useQuery({
    queryKey: ['teamWeekSchedule', mondayStr],
    queryFn: () => base44.entities.TeamWeekSchedule.filter({ fecha_inicio_semana: mondayStr }),
    staleTime: 10 * 60 * 1000,
  });

  // Mapa team_key → turno actual (Mañana/Tarde) según calendario rotativo
  const teamShiftMap = useMemo(() => {
    const map = {};
    for (const ws of weekSchedules) {
      if (ws.team_key && ws.turno) map[ws.team_key] = ws.turno;
    }
    return map;
  }, [weekSchedules]);

  // Hora actual en minutos (zona Europa/Madrid)
  const nowMinutes = useMemo(() => {
    const now = new Date();
    const localStr = now.toLocaleString('en-US', {
      timeZone: 'Europe/Madrid', hour12: false, hour: '2-digit', minute: '2-digit'
    });
    const [h, m] = localStr.split(':').map(Number);
    return h * 60 + m;
  }, []);

  // Devuelve true si el empleado tiene turno tarde que AÚN NO ha comenzado
  // (según el calendario rotativo), para excluirlos de la bandeja de detección
  const isAfternoonShiftNotStarted = useMemo(() => {
    const TOLERANCE_MIN = 30; // mismo margen que shiftAudit
    return (emp) => {
      let assignedShift = null;
      if (emp.tipo_turno === 'Fijo Tarde') {
        assignedShift = 'Tarde';
      } else if (emp.tipo_turno === 'Rotativo' && emp.team_key) {
        assignedShift = teamShiftMap[emp.team_key] || null;
      }
      if (assignedShift !== 'Tarde') return false;
      const startStr = emp.horario_tarde_inicio;
      if (!startStr) return false;
      const [h, m] = String(startStr).split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return false;
      const shiftStartMinutes = h * 60 + m;
      return nowMinutes < shiftStartMinutes + TOLERANCE_MIN;
    };
  }, [teamShiftMap, nowMinutes]);

  const { data: absences = EMPTY, isLoading: loadingAbsences, isFetching } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-fecha_inicio', 2000),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Set de employee_ids que ya tienen una ausencia formal aprobada vigente (registrada por RRHH)
  // Estos NO deben aparecer en la bandeja de detección - ya están gestionados
  const employeesWithApprovedAbsence = useMemo(() => {
    const set = new Set();
    const now = new Date();
    for (const abs of absences) {
      if (abs.estado_aprobacion !== 'Aprobada') continue;
      const isAuto =
        abs.motivo === 'Ausencia no comunicada - detección automática' ||
        (abs.notas && (abs.notas.startsWith('[SISTEMA]') || abs.notas.startsWith('[shiftAudit]')));
      if (isAuto) continue;
      const start = new Date(abs.fecha_inicio);
      const end = abs.fecha_fin_desconocida
        ? new Date('2099-12-31')
        : abs.fecha_fin ? new Date(abs.fecha_fin) : new Date('2099-12-31');
      if (now >= start && now <= end) {
        set.add(abs.employee_id);
      }
    }
    return set;
  }, [absences]);

  // Empleados ausentes según estado_presencia (fuente de verdad)
  // Se excluyen: turno tarde no iniciado, y empleados con ausencia formal aprobada ya registrada
  const absentEmployees = useMemo(() => {
    return employees.filter(emp =>
      emp.estado_empleado === 'Alta' &&
      emp.sujeto_a_control_horario !== false &&
      ABSENT_STATES.has(emp.estado_presencia) &&
      !isAfternoonShiftNotStarted(emp) &&
      !employeesWithApprovedAbsence.has(emp.id)
    );
  }, [employees, isAfternoonShiftNotStarted, employeesWithApprovedAbsence]);

  // Mapa de ausencias automáticas pendientes por employee_id
  const autoAbsenceByEmpId = useMemo(() => {
    const map = new Map();
    const now = new Date();
    for (const abs of absences) {
      const isAuto =
        abs.motivo === 'Ausencia no comunicada - detección automática' ||
        (abs.notas && abs.notas.startsWith('[SISTEMA]')) ||
        (abs.notas && abs.notas.startsWith('[shiftAudit]'));
      if (!isAuto || abs.estado_aprobacion !== 'Pendiente') continue;
      const absStart = new Date(abs.fecha_inicio);
      if (absStart > now) continue;
      if (filterDate) {
        const absDateStr = abs.fecha_inicio ? abs.fecha_inicio.slice(0, 10) : null;
        if (absDateStr !== filterDate) continue;
      }
      const existing = map.get(abs.employee_id);
      if (!existing || abs.created_date > existing.created_date) {
        map.set(abs.employee_id, abs);
      }
    }
    return map;
  }, [absences, filterDate]);

  const deptOptions = useMemo(() => {
    const s = new Set();
    absentEmployees.forEach(emp => { if (emp.departamento) s.add(emp.departamento); });
    return Array.from(s).sort();
  }, [absentEmployees]);

  const filtered = useMemo(() => {
    return absentEmployees.filter(emp => {
      const name = emp.nombre || "";
      const dept = emp.departamento || "";
      const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || dept.toLowerCase().includes(search.toLowerCase());
      const matchDept = filterDept === "all" || dept === filterDept;
      return matchSearch && matchDept;
    });
  }, [absentEmployees, search, filterDept]);

  const validateMutation = useMutation({
    mutationFn: async (formData) => {
      const absId = selectedAbsence?.id;
      await base44.entities.EmployeeMasterDatabase.update(selectedEmployee.id, {
        estado_presencia: 'Ausente',
        disponibilidad: 'Ausente',
        potencialmente_ausente_desde: null,
      });
      if (absId) {
        return await base44.entities.Absence.update(absId, {
          ...formData,
          estado_aprobacion: 'Aprobada',
          aprobado_por: currentUser?.email,
          fecha_aprobacion: new Date().toISOString(),
          notas: (selectedAbsence.notas || '') + '\n[Validado por RRHH]',
        });
      } else {
        return await base44.entities.Absence.create({
          employee_id: selectedEmployee.id,
          fecha_inicio: selectedEmployee.ausencia_inicio || new Date().toISOString(),
          ...formData,
          estado_aprobacion: 'Aprobada',
          aprobado_por: currentUser?.email,
          fecha_aprobacion: new Date().toISOString(),
          solicitado_por: currentUser?.email,
          notas: '[Validado por RRHH desde bandeja de detección]',
        });
      }
    },
    onSuccess: async () => {
      try { await base44.functions.invoke('syncEmployeeAvailability'); } catch (_) {}
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      toast.success("Ausencia justificada y clasificada correctamente");
      setShowValidateDialog(false);
      setSelectedEmployee(null);
      setSelectedAbsence(null);
    },
    onError: (e) => toast.error("Error al validar: " + e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ empId, reason }) => {
      const abs = autoAbsenceByEmpId.get(empId);
      await base44.entities.EmployeeMasterDatabase.update(empId, {
        estado_presencia: 'No Aplica',
        disponibilidad: 'Disponible',
        ausencia_inicio: null,
        ausencia_fin: null,
        ausencia_motivo: null,
        potencialmente_ausente_desde: null,
      });
      if (abs) {
        return await base44.entities.Absence.update(abs.id, {
          estado_aprobacion: 'Rechazada',
          comentario_aprobacion: reason || 'Falsa alarma - empleado no estaba ausente',
          aprobado_por: currentUser?.email,
          fecha_aprobacion: new Date().toISOString(),
        });
      }
      return { empId, reason };
    },
    onSuccess: async () => {
      try { await base44.functions.invoke('syncEmployeeAvailability'); } catch (_) {}
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      toast.success("Marcado como falsa alarma");
      setShowRejectDialog(false);
      setRejectReason("");
      setSelectedEmployee(null);
      setSelectedAbsence(null);
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async () => {
      const empIds = Array.from(bulkSelected);
      await Promise.all(empIds.map(empId => {
        return Promise.all([
          base44.entities.EmployeeMasterDatabase.update(empId, {
            estado_presencia: 'No Aplica',
            disponibilidad: 'Disponible',
            ausencia_inicio: null,
            ausencia_fin: null,
            ausencia_motivo: null,
            potencialmente_ausente_desde: null,
          }),
          (() => {
            const abs = autoAbsenceByEmpId.get(empId);
            if (abs) {
              return base44.entities.Absence.update(abs.id, {
                estado_aprobacion: 'Rechazada',
                comentario_aprobacion: 'Falsa alarma - descartado en bloque',
                aprobado_por: currentUser?.email,
                fecha_aprobacion: new Date().toISOString(),
              });
            }
            return Promise.resolve();
          })(),
        ]);
      }));
    },
    onSuccess: async () => {
      try { await base44.functions.invoke('syncEmployeeAvailability'); } catch (_) {}
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      toast.success(`${bulkSelected.size} ausencias descartadas como falsa alarma`);
      setBulkSelected(new Set());
    },
    onError: (e) => toast.error("Error en operación masiva: " + e.message),
  });

  const toggleBulk = (empId) => {
    setBulkSelected(prev => {
      const s = new Set(prev);
      s.has(empId) ? s.delete(empId) : s.add(empId);
      return s;
    });
  };

  const selectAll = () => {
    if (bulkSelected.size === filtered.length) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(filtered.map(e => e.id)));
    }
  };

  const openValidate = (emp) => {
    setSelectedEmployee(emp);
    setSelectedAbsence(autoAbsenceByEmpId.get(emp.id) || null);
    setShowValidateDialog(true);
  };

  const openReject = (emp) => {
    setSelectedEmployee(emp);
    setSelectedAbsence(autoAbsenceByEmpId.get(emp.id) || null);
    setShowRejectDialog(true);
  };

  const getShiftFromNotes = (notes) => {
    if (!notes) return null;
    const m = notes.match(/Turno:\s*([\d:]+[-–][\d:]+)/);
    return m ? m[1] : null;
  };

  const presenceStatusLabel = (status) => {
    const map = {
      'Potencialmente Ausente': { label: 'Potencialmente Ausente', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
      'Retraso': { label: 'Retraso', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
      'Ausente Auto': { label: 'Ausente (Auto)', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
      'Ausente': { label: 'Ausente', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    };
    return map[status] || { label: status, color: 'bg-slate-100 text-slate-600' };
  };

  if (loadingAbsences) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-400">Cargando bandeja...</span>
      </div>
    );
  }

  const isRefreshing = isFetching && !loadingAbsences;

  if (absentEmployees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Bandeja vacía</p>
        <p className="text-sm text-slate-400 mt-1">No hay empleados marcados como ausentes pendientes de revisión</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de herramientas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar empleado o departamento..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-44">
              <Filter className="w-3.5 h-3.5 mr-1 text-slate-400" />
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los departamentos</SelectItem>
              {deptOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {filtered.length > 0 && (
            <Button size="sm" variant="outline" className="text-xs" onClick={selectAll}>
              {bulkSelected.size === filtered.length ? "Deseleccionar todo" : `Seleccionar ${filtered.length}`}
            </Button>
          )}
          {bulkSelected.size > 0 && (
            <Button
              size="sm"
              variant="destructive"
              className="text-xs"
              onClick={() => {
                if (confirm(`¿Descartar ${bulkSelected.size} ausencias como falsas alarmas?`)) {
                  bulkRejectMutation.mutate();
                }
              }}
              disabled={bulkRejectMutation.isPending}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Descartar selección ({bulkSelected.size})
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => queryClient.invalidateQueries({ queryKey: ['absences'] })}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Contador + estado refresco */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Mostrando <strong>{filtered.length}</strong> de <strong>{absentEmployees.length}</strong> ausencias nuevas pendientes de revisión
        </p>
        {isRefreshing && (
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" /> Actualizando...
          </span>
        )}
      </div>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map(emp => {
          const abs = autoAbsenceByEmpId.get(emp.id);
          const isSelected = bulkSelected.has(emp.id);
          const initials = emp.nombre?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';
          const statusInfo = presenceStatusLabel(emp.estado_presencia);
          const shift = abs ? getShiftFromNotes(abs.notas) : null;
          const sinceTime = emp.ausencia_inicio || emp.potencialmente_ausente_desde;

          return (
            <div
              key={emp.id}
              className={`bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                isSelected
                  ? 'border-amber-400 ring-2 ring-amber-200 dark:ring-amber-800'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
              onClick={() => toggleBulk(emp.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-sm font-bold text-amber-700 dark:text-amber-300">
                      {initials}
                    </div>
                    {abs && <Bot className="w-3.5 h-3.5 text-amber-500 absolute -bottom-0.5 -right-0.5 bg-white dark:bg-slate-800 rounded-full" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                      {emp.nombre || '—'}
                    </p>
                    <p className="text-xs text-slate-400">{emp.departamento || 'Sin departamento'}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleBulk(emp.id)}
                  onClick={e => e.stopPropagation()}
                  className="rounded w-4 h-4 accent-amber-500 flex-shrink-0 mt-0.5"
                />
              </div>

              <div className="space-y-1.5 mb-3">
                <Badge className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge>
                {sinceTime && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span>Desde: {format(new Date(sinceTime), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                    <span className="text-slate-300">·</span>
                    <span className="italic">{formatDistanceToNow(new Date(sinceTime), { addSuffix: true, locale: es })}</span>
                  </div>
                )}
                {shift && (
                  <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-xs">
                    Turno: {shift}
                  </Badge>
                )}
                {emp.puesto && (
                  <p className="text-xs text-slate-400">{emp.puesto}</p>
                )}
                {!abs && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Sin registro automático — ausencia manual por confirmar
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                  onClick={(e) => { e.stopPropagation(); openValidate(emp); }}
                >
                  <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
                  Justificar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                  onClick={(e) => { e.stopPropagation(); openReject(emp); }}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Falsa alarma
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog: Justificar */}
      {showValidateDialog && selectedEmployee && (
        <Dialog open={true} onOpenChange={() => { setShowValidateDialog(false); setSelectedEmployee(null); setSelectedAbsence(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-green-600" />
                Clasificar Ausencia
              </DialogTitle>
              <p className="text-sm text-slate-500 mt-1">
                Empleado: <strong>{selectedEmployee.nombre}</strong>
                {selectedAbsence && getShiftFromNotes(selectedAbsence.notas) && ` — Turno: ${getShiftFromNotes(selectedAbsence.notas)}`}
              </p>
            </DialogHeader>
            <AbsenceForm
              initialData={{
                ...(selectedAbsence || {}),
                employee_id: selectedEmployee.id,
                employee_name: selectedEmployee.nombre,
                motivo: '',
                tipo: '',
                absence_type_id: '',
              }}
              employees={employees}
              absenceTypes={absenceTypes}
              onSubmit={(data) => validateMutation.mutate(data)}
              onCancel={() => { setShowValidateDialog(false); setSelectedEmployee(null); setSelectedAbsence(null); }}
              isSubmitting={validateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: Falsa alarma */}
      {showRejectDialog && selectedEmployee && (
        <Dialog open={true} onOpenChange={() => { setShowRejectDialog(false); setSelectedEmployee(null); setSelectedAbsence(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <X className="w-5 h-5 text-red-500" />
                Marcar como Falsa Alarma
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-sm">
                <p className="font-medium text-slate-800 dark:text-slate-200">{selectedEmployee.nombre}</p>
                <p className="text-slate-500 text-xs mt-0.5">Estado: {selectedEmployee.estado_presencia}</p>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                El empleado no aparecerá como ausente y su estado se restablecerá.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">Motivo del descarte (opcional)</Label>
                <Textarea
                  placeholder="Ej: El empleado fichó tarde, error técnico, estaba presente..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => { setShowRejectDialog(false); setSelectedEmployee(null); setSelectedAbsence(null); }}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => rejectMutation.mutate({ empId: selectedEmployee.id, reason: rejectReason })}
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? 'Procesando...' : 'Confirmar descarte'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}