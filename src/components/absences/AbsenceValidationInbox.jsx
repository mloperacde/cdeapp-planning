import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle, CheckCircle2, X, Search, Bot, ClipboardCheck,
  Calendar, User, Trash2, RefreshCw, ChevronDown, ChevronUp, Filter
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import AbsenceForm from "./AbsenceForm";

const EMPTY = [];

export default function AbsenceValidationInbox({ employees = EMPTY, absenceTypes = EMPTY }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [showValidateDialog, setShowValidateDialog] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState(null);
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
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

  // Solo ausencias auto-generadas pendientes de revisión
  const autoAbsences = useMemo(() => {
    return absences.filter(abs => {
      const isAuto =
        abs.motivo === 'Ausencia no comunicada - detección automática' ||
        (abs.notas && abs.notas.startsWith('[SISTEMA]')) ||
        (abs.notas && abs.notas.startsWith('[shiftAudit]'));
      return isAuto && abs.estado_aprobacion === 'Pendiente';
    });
  }, [absences]);

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

  // Mutación: convertir ausencia auto en ausencia formal (validar)
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
      toast.success("Ausencia validada y clasificada correctamente");
      setShowValidateDialog(false);
      setSelectedAbsence(null);
    },
    onError: (e) => toast.error("Error al validar: " + e.message),
  });

  // Mutación: rechazar/cancelar ausencia auto-generada (falsa alarma)
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
      toast.success("Ausencia marcada como falsa alarma");
      setShowRejectDialog(false);
      setRejectReason("");
      setSelectedAbsence(null);
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  // Bulk reject
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
      toast.success(`${bulkSelected.size} ausencias descartadas`);
      setBulkSelected(new Set());
      setShowBulkActions(false);
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

  return (
    <div className="space-y-4">
      {/* Header con métricas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Bandeja de Validación
            <Badge className="bg-amber-500 text-white ml-1">{autoAbsences.length}</Badge>
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Ausencias detectadas automáticamente por control de presencia — requieren revisión
          </p>
        </div>
        <div className="flex gap-2">
          {bulkSelected.size > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm(`¿Descartar ${bulkSelected.size} ausencias como falsas alarmas?`)) {
                  bulkRejectMutation.mutate();
                }
              }}
              disabled={bulkRejectMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Descartar selección ({bulkSelected.size})
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['absences'] })}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar empleado o departamento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-1 text-slate-400" />
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los departamentos</SelectItem>
            {deptOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Bandeja vacía</p>
              <p className="text-slate-400 text-sm mt-1">No hay ausencias auto-detectadas pendientes de revisión</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-amber-50 dark:bg-amber-950/20">
                    <th className="p-3 text-left w-8">
                      <input
                        type="checkbox"
                        checked={bulkSelected.size === filtered.length && filtered.length > 0}
                        onChange={selectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Empleado</th>
                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Departamento</th>
                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Turno Afectado</th>
                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Detectado</th>
                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(abs => {
                    const emp = getEmp(abs.employee_id);
                    const shift = getShiftFromNotes(abs.notas);
                    const isSelected = bulkSelected.has(abs.id);
                    return (
                      <tr
                        key={abs.id}
                        className={`border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isSelected ? 'bg-amber-50/60 dark:bg-amber-950/10' : ''}`}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleBulk(abs.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Bot className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-slate-900 dark:text-slate-100">{emp?.nombre || '—'}</p>
                              <p className="text-xs text-slate-400">{emp?.puesto || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">{emp?.departamento || '—'}</Badge>
                        </td>
                        <td className="p-3">
                          {shift ? (
                            <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-xs">
                              {shift}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500 text-xs">
                          {format(new Date(abs.fecha_inicio), "dd/MM/yyyy HH:mm", { locale: es })}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                              onClick={() => {
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
                              className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => {
                                setSelectedAbsence(abs);
                                setShowRejectDialog(true);
                              }}
                            >
                              <X className="w-3.5 h-3.5 mr-1" />
                              Falsa alarma
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Justificar/Convertir ausencia */}
      {showValidateDialog && selectedAbsence && (
        <Dialog open={true} onOpenChange={() => { setShowValidateDialog(false); setSelectedAbsence(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-green-600" />
                Clasificar Ausencia Detectada
              </DialogTitle>
              <p className="text-sm text-slate-500 mt-1">
                Empleado: <strong>{getEmp(selectedAbsence.employee_id)?.nombre}</strong> — Turno: {getShiftFromNotes(selectedAbsence.notas) || 'desconocido'}
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
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <X className="w-5 h-5" />
                Marcar como Falsa Alarma
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-slate-600">
                El empleado <strong>{getEmp(selectedAbsence.employee_id)?.nombre}</strong> no estuvo realmente ausente.
                Se eliminará de la bandeja de validación.
              </p>
              <div className="space-y-1.5">
                <Label>Motivo del descarte (opcional)</Label>
                <Textarea
                  placeholder="Ej: El empleado fichó tarde, problema técnico, etc."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => { setShowRejectDialog(false); setSelectedAbsence(null); }}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
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