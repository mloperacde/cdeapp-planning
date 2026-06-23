import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Pencil, Trash2, Search, CheckCircle2, Clock, X, Filter,
  RefreshCw, FileText, Calendar, User
} from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import AbsenceForm from "./AbsenceForm";
import { createAbsence, updateAbsence, deleteAbsence } from "./AbsenceOperations";

const EMPTY = [];

const STATUS_CONFIG = {
  Pendiente:  { color: "bg-amber-100 text-amber-800 border-amber-200", dot: "bg-amber-400" },
  Aprobada:   { color: "bg-green-100 text-green-800 border-green-200", dot: "bg-green-500" },
  Rechazada:  { color: "bg-red-100 text-red-800 border-red-200", dot: "bg-red-400" },
  Cancelada:  { color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
};

export default function FormalAbsenceManager({ employees = EMPTY, absenceTypes = EMPTY, initialEmployeeId, initialEmployeeName }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState(null);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");
  const [filterType, setFilterType] = useState("all");

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

  const formalAbsences = useMemo(() => {
    return absences.filter(abs => {
      // Excluir TODAS las ausencias auto-detectadas por el sistema
      const isAuto =
        abs.motivo === 'Ausencia no comunicada - detección automática' ||
        abs.motivo === 'Ausencia detectada automáticamente por análisis de presencia' ||
        (abs.notas && abs.notas.startsWith('[SISTEMA]')) ||
        (abs.notas && abs.notas.startsWith('[shiftAudit]')) ||
        (abs.notas && abs.notas.startsWith('Creado automáticamente'));
      return !isAuto;
    });
  }, [absences]);

  const now = new Date();

  const stats = useMemo(() => {
    const active = formalAbsences.filter(a => {
      if (a.estado_aprobacion === 'Rechazada' || a.estado_aprobacion === 'Cancelada') return false;
      const start = new Date(a.fecha_inicio);
      const end = a.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(a.fecha_fin || '2099-12-31');
      return now >= start && now <= end;
    });
    const pending = formalAbsences.filter(a => a.estado_aprobacion === 'Pendiente');
    const thisMonth = formalAbsences.filter(a =>
      a.estado_aprobacion === 'Aprobada' &&
      new Date(a.fecha_inicio) >= new Date(now.getFullYear(), now.getMonth(), 1)
    );
    return { active: active.length, pending: pending.length, thisMonth: thisMonth.length, total: formalAbsences.length };
  }, [formalAbsences]);

  const deptOptions = useMemo(() => {
    const s = new Set();
    formalAbsences.forEach(abs => {
      const emp = employees.find(e => String(e.id) === String(abs.employee_id));
      if (emp?.departamento) s.add(emp.departamento);
    });
    return Array.from(s).sort();
  }, [formalAbsences, employees]);

  const typeOptions = useMemo(() => {
    const s = new Set();
    formalAbsences.forEach(abs => { if (abs.tipo) s.add(abs.tipo); });
    return Array.from(s).sort();
  }, [formalAbsences]);

  const filtered = useMemo(() => {
    return formalAbsences.filter(abs => {
      const emp = employees.find(e => String(e.id) === String(abs.employee_id));
      const name = emp?.nombre || "";
      const dept = emp?.departamento || "";
      const start = new Date(abs.fecha_inicio);
      const end = abs.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(abs.fecha_fin || '2099-12-31');

      const matchSearch = !search ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        dept.toLowerCase().includes(search.toLowerCase()) ||
        abs.motivo?.toLowerCase().includes(search.toLowerCase());
      const matchDept = filterDept === "all" || dept === filterDept;
      const matchType = filterType === "all" || abs.tipo === filterType;

      let matchStatus = true;
      if (filterStatus === "active") {
        matchStatus = (abs.estado_aprobacion !== 'Rechazada' && abs.estado_aprobacion !== 'Cancelada') && now >= start && now <= end;
      } else if (filterStatus === "pending") {
        matchStatus = abs.estado_aprobacion === 'Pendiente';
      } else if (filterStatus === "approved") {
        matchStatus = abs.estado_aprobacion === 'Aprobada';
      } else if (filterStatus === "historical") {
        matchStatus = end < now || abs.estado_aprobacion === 'Rechazada' || abs.estado_aprobacion === 'Cancelada';
      }

      return matchSearch && matchDept && matchType && matchStatus;
    });
  }, [formalAbsences, employees, search, filterDept, filterType, filterStatus]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingAbsence?.id) {
        return await updateAbsence(editingAbsence.id, data, currentUser, absenceTypes, vacations, holidays);
      }
      return await createAbsence(data, currentUser, employees, absenceTypes, vacations, holidays);
    },
    onSuccess: async () => {
      try { await base44.functions.invoke('syncEmployeeAvailability'); } catch (_) {}
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      toast.success("Ausencia guardada correctamente");
      setShowForm(false);
      setEditingAbsence(null);
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const abs = absences.find(a => a.id === id);
      if (abs) await deleteAbsence(abs, employees);
    },
    onSuccess: async () => {
      try { await base44.functions.invoke('syncEmployeeAvailability'); } catch (_) {}
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      toast.success("Ausencia eliminada");
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  useEffect(() => {
    if (!initialEmployeeId) return;
    setEditingAbsence({ employee_id: String(initialEmployeeId), employee_name: initialEmployeeName || '' });
    setShowForm(true);
  }, [initialEmployeeId]);

  const getEmp = (id) => employees.find(e => String(e.id) === String(id));

  const getDuration = (abs) => {
    if (abs.fecha_fin_desconocida) return "Indefinida";
    const days = differenceInCalendarDays(new Date(abs.fecha_fin), new Date(abs.fecha_inicio));
    return `${days + 1} día${days !== 0 ? 's' : ''}`;
  };

  const isCurrentlyActive = (abs) => {
    if (abs.estado_aprobacion === 'Rechazada' || abs.estado_aprobacion === 'Cancelada') return false;
    const start = new Date(abs.fecha_inicio);
    const end = abs.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(abs.fecha_fin || '2099-12-31');
    return now >= start && now <= end;
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Activas ahora", value: stats.active, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900", onClick: () => setFilterStatus("active") },
          { label: "Pendientes aprobación", value: stats.pending, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900", onClick: () => setFilterStatus("pending") },
          { label: "Aprobadas este mes", value: stats.thisMonth, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900", onClick: () => setFilterStatus("approved") },
          { label: "Total registradas", value: stats.total, color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700", onClick: () => setFilterStatus("all") },
        ].map(s => (
          <button
            key={s.label}
            className={`${s.bg} rounded-xl p-3 border text-left hover:opacity-80 transition-opacity cursor-pointer`}
            onClick={s.onClick}
          >
            <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar empleado, tipo, motivo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activas ahora</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="approved">Aprobadas</SelectItem>
              <SelectItem value="historical">Historial</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-40">
              <Filter className="w-3.5 h-3.5 mr-1 text-slate-400" />
              <SelectValue placeholder="Depto." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los deptos.</SelectItem>
              {deptOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {typeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['absences'] })}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            onClick={() => { setEditingAbsence(null); setShowForm(true); }}
          >
            <Plus className="w-4 h-4" />
            Nueva Ausencia
          </Button>
        </div>
      </div>

      {/* Contador */}
      {filtered.length > 0 && (
        <p className="text-xs text-slate-400">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-5 h-5 animate-spin text-slate-400 mr-2" />
          <span className="text-slate-400">Cargando...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No hay ausencias con estos filtros</p>
          <button
            className="text-xs text-blue-500 hover:underline mt-2"
            onClick={() => { setSearch(""); setFilterDept("all"); setFilterType("all"); setFilterStatus("all"); }}
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(abs => {
            const emp = getEmp(abs.employee_id);
            const statusCfg = STATUS_CONFIG[abs.estado_aprobacion] || STATUS_CONFIG.Pendiente;
            const active = isCurrentlyActive(abs);
            const initials = emp?.nombre?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';

            return (
              <div
                key={abs.id}
                className={`bg-white dark:bg-slate-800 border rounded-xl p-3.5 flex items-center gap-3 hover:shadow-sm transition-shadow ${
                  active ? 'border-blue-200 dark:border-blue-800' : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {/* Avatar + indicador activo */}
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                    {initials}
                  </div>
                  {active && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white dark:border-slate-800" />
                  )}
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {emp?.nombre || `Empleado ${abs.employee_id}`}
                    </span>
                    <Badge className={`${statusCfg.color} border text-xs flex-shrink-0`}>
                      {abs.estado_aprobacion}
                    </Badge>
                    {active && (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs flex-shrink-0">En curso</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    <span className="text-xs text-slate-500 truncate">{abs.tipo || <span className="italic text-slate-300">Sin tipo</span>}</span>
                    {abs.motivo && (
                      <span className="text-xs text-slate-400 truncate max-w-[200px]">· {abs.motivo}</span>
                    )}
                  </div>
                </div>

                {/* Fechas */}
                <div className="hidden sm:flex flex-col items-end text-right flex-shrink-0 text-xs text-slate-500">
                  <span>{format(new Date(abs.fecha_inicio), "dd/MM/yy", { locale: es })}</span>
                  <span className="text-slate-400">
                    {abs.fecha_fin_desconocida
                      ? "→ indefinida"
                      : `→ ${format(new Date(abs.fecha_fin), "dd/MM/yy", { locale: es })}`
                    }
                  </span>
                  <span className="text-slate-300 text-[11px] mt-0.5">{getDuration(abs)}</span>
                </div>

                {/* Acciones */}
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-slate-700"
                    onClick={() => {
                      setEditingAbsence({ ...abs, employee_name: emp?.nombre || '' });
                      setShowForm(true);
                    }}
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (confirm("¿Eliminar esta ausencia?")) deleteMutation.mutate(abs.id);
                    }}
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      {showForm && (
        <Dialog open={true} onOpenChange={() => { setShowForm(false); setEditingAbsence(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAbsence?.id ? 'Editar Ausencia' : 'Registrar Nueva Ausencia'}
              </DialogTitle>
            </DialogHeader>
            <AbsenceForm
              initialData={editingAbsence}
              employees={employees}
              absenceTypes={absenceTypes}
              onSubmit={(data) => saveMutation.mutate(data)}
              onCancel={() => { setShowForm(false); setEditingAbsence(null); }}
              onDelete={(id) => { deleteMutation.mutate(id); setShowForm(false); }}
              isSubmitting={saveMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}