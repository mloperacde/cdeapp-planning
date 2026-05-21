import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle, CheckCircle2, X, Search, ClipboardCheck,
  Trash2, RefreshCw, Filter, Clock, User, Bot
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import AbsenceForm from "./AbsenceForm";

const EMPTY = [];

export default function AbsenceValidationInbox({ employees = EMPTY, absenceTypes = EMPTY, filterDate = null }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [showValidateDialog, setShowValidateDialog] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState(null);
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: absences = EMPTY, isLoading } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-fecha_inicio', 2000),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const autoAbsences = useMemo(() => {
    const now = new Date();
    // 1. Filtrar candidatas
    const candidates = absences.filter(abs => {
      const isAuto =
        abs.motivo === 'Ausencia no comunicada - detección automática' ||
        (abs.notas && abs.notas.startsWith('[SISTEMA]')) ||
        (abs.notas && abs.notas.startsWith('[shiftAudit]'));
      if (!isAuto || abs.estado_aprobacion !== 'Pendiente') return false;
      const absStart = new Date(abs.fecha_inicio);
      if (absStart > now) return false;
      if (filterDate) {
        const absDateStr = abs.fecha_inicio ? abs.fecha_inicio.slice(0, 10) : null;
        if (absDateStr !== filterDate) return false;
      }
      return true;
    });

    // 2. Deduplicar por employee_id — conservar solo la más reciente (mayor created_date / id)
    const byEmployee = new Map();
    for (const abs of candidates) {
      const existing = byEmployee.get(abs.employee_id);
      if (!existing || abs.created_date > existing.created_date) {
        byEmployee.set(abs.employee_id, abs);
      }
    }
    return Array.from(byEmployee.values());
  }, [absences, filterDate]);

  const deptOptions = useMemo(() => {
    const s = new Set();
    autoAbsences.forEach(abs => {
      const emp = employees.find(e => String(e.id) === String(abs.employee_id));
      if (emp?.departamento) s.add(emp.departamento);
    });
    return Array.from(s).sort();
  }, [autoAbsences, employees]);

  const filtered = useMemo(() => {
    return autoAbsences.filter(abs => {
      const emp = employees.find(e => String(e.id) === String(abs.employee_id));
      const name = emp?.nombre || "";
      const dept = emp?.departamento || "";
      const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || dept.toLowerCase().includes(search.toLowerCase());
      const matchDept = filterDept === "all" || dept === filterDept;
      return matchSearch && matchDept;
    });
  }, [autoAbsences, employees, search, filterDept]);

  const validateMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Absence.update(selectedAbsence.id, {
        ...data,
        estado_aprobacion: 'Aprobada',
        aprobado_por: currentUser?.email,
        fecha_aprobacion: new Date().toISOString(),
        notas: (selectedAbsence.notas || '') + '\n[Validado por RRHH]',
      });
    },
    onSuccess: async () => {
      try { await base44.functions.invoke('syncEmployeeAvailability'); } catch (_) {}
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      toast.success("Ausencia justificada y clasificada correctamente");
      setShowValidateDialog(false);
      setSelectedAbsence(null);
    },
    onError: (e) => toast.error("Error al validar: " + e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      return await base44.entities.Absence.update(id, {
        estado_aprobacion: 'Rechazada',
        comentario_aprobacion: reason || 'Falsa alarma - empleado no estaba ausente',
        aprobado_por: currentUser?.email,
        fecha_aprobacion: new Date().toISOString(),
      });
    },
    onSuccess: async () => {
      try { await base44.functions.invoke('syncEmployeeAvailability'); } catch (_) {}
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      toast.success("Marcado como falsa alarma");
      setShowRejectDialog(false);
      setRejectReason("");
      setSelectedAbsence(null);
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(bulkSelected);
      await Promise.all(ids.map(id =>
        base44.entities.Absence.update(id, {
          estado_aprobacion: 'Rechazada',
          comentario_aprobacion: 'Falsa alarma - descartado en bloque',
          aprobado_por: currentUser?.email,
          fecha_aprobacion: new Date().toISOString(),
        })
      ));
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

  const toggleBulk = (id) => {
    setBulkSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const selectAll = () => {
    if (bulkSelected.size === filtered.length) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(filtered.map(a => a.id)));
    }
  };

  const getEmp = (id) => employees.find(e => String(e.id) === String(id));

  const getShiftFromNotes = (notes) => {
    if (!notes) return null;
    const m = notes.match(/Turno:\s*([\d:]+[-–][\d:]+)/);
    return m ? m[1] : null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-400">Cargando bandeja...</span>
      </div>
    );
  }

  if (autoAbsences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Bandeja vacía</p>
        <p className="text-sm text-slate-400 mt-1">No hay ausencias automáticas pendientes de revisión</p>
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
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={selectAll}
            >
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
          <Button
            size="sm"
            variant="ghost"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['absences'] })}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Contador */}
      <p className="text-xs text-slate-500">
        Mostrando <strong>{filtered.length}</strong> de <strong>{autoAbsences.length}</strong> ausencias pendientes
      </p>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map(abs => {
          const emp = getEmp(abs.employee_id);
          const shift = getShiftFromNotes(abs.notas);
          const isSelected = bulkSelected.has(abs.id);
          const initials = emp?.nombre?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';
          const timeAgo = formatDistanceToNow(new Date(abs.fecha_inicio), { addSuffix: true, locale: es });

          return (
            <div
              key={abs.id}
              className={`bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                isSelected
                  ? 'border-amber-400 ring-2 ring-amber-200 dark:ring-amber-800'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
              onClick={() => toggleBulk(abs.id)}
            >
              {/* Cabecera tarjeta */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-sm font-bold text-amber-700 dark:text-amber-300">
                      {initials}
                    </div>
                    <Bot className="w-3.5 h-3.5 text-amber-500 absolute -bottom-0.5 -right-0.5 bg-white dark:bg-slate-800 rounded-full" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                      {emp?.nombre || '—'}
                    </p>
                    <p className="text-xs text-slate-400">{emp?.departamento || 'Sin departamento'}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleBulk(abs.id)}
                  onClick={e => e.stopPropagation()}
                  className="rounded w-4 h-4 accent-amber-500 flex-shrink-0 mt-0.5"
                />
              </div>

              {/* Datos */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span>{format(new Date(abs.fecha_inicio), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                  <span className="text-slate-300">·</span>
                  <span className="italic">{timeAgo}</span>
                </div>
                {shift && (
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-xs">
                      Turno: {shift}
                    </Badge>
                  </div>
                )}
                {emp?.puesto && (
                  <p className="text-xs text-slate-400">{emp.puesto}</p>
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAbsence(abs);
                    setShowValidateDialog(true);
                  }}
                >
                  <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
                  Justificar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAbsence(abs);
                    setShowRejectDialog(true);
                  }}
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
      {showValidateDialog && selectedAbsence && (
        <Dialog open={true} onOpenChange={() => { setShowValidateDialog(false); setSelectedAbsence(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-green-600" />
                Clasificar Ausencia Detectada
              </DialogTitle>
              <p className="text-sm text-slate-500 mt-1">
                Empleado: <strong>{getEmp(selectedAbsence.employee_id)?.nombre}</strong>
                {getShiftFromNotes(selectedAbsence.notas) && ` — Turno: ${getShiftFromNotes(selectedAbsence.notas)}`}
              </p>
            </DialogHeader>
            <AbsenceForm
              initialData={{
                ...selectedAbsence,
                employee_name: getEmp(selectedAbsence.employee_id)?.nombre,
                motivo: '',
                tipo: '',
                absence_type_id: '',
              }}
              employees={employees}
              absenceTypes={absenceTypes}
              onSubmit={(data) => validateMutation.mutate(data)}
              onCancel={() => { setShowValidateDialog(false); setSelectedAbsence(null); }}
              isSubmitting={validateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: Falsa alarma */}
      {showRejectDialog && selectedAbsence && (
        <Dialog open={true} onOpenChange={() => { setShowRejectDialog(false); setSelectedAbsence(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <X className="w-5 h-5 text-red-500" />
                Marcar como Falsa Alarma
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-sm">
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {getEmp(selectedAbsence.employee_id)?.nombre}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Detectado: {format(new Date(selectedAbsence.fecha_inicio), "dd/MM/yyyy HH:mm", { locale: es })}
                </p>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Este registro se descartará. El empleado no aparecerá como ausente por esta detección.
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
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowRejectDialog(false); setSelectedAbsence(null); }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => rejectMutation.mutate({ id: selectedAbsence.id, reason: rejectReason })}
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