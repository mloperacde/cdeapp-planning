import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Edit, Trash2, Search, CheckCircle2, Clock, X, Filter,
  RefreshCw, FileText, Calendar, User, ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import AbsenceForm from "./AbsenceForm";
import { createAbsence, updateAbsence, deleteAbsence } from "./AbsenceOperations";

const EMPTY = [];
const STATUS_CONFIG = {
  Pendiente:  { color: "bg-amber-100 text-amber-800 border-amber-200", label: "Pendiente" },
  Aprobada:   { color: "bg-green-100 text-green-800 border-green-200", label: "Aprobada" },
  Rechazada:  { color: "bg-red-100 text-red-800 border-red-200",   label: "Rechazada" },
  Cancelada:  { color: "bg-slate-100 text-slate-600 border-slate-200", label: "Cancelada" },
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

  // Solo ausencias formales (no auto-generadas)
  const formalAbsences = useMemo(() => {
    return absences.filter(abs => {
      const isAuto =
        abs.motivo === 'Ausencia no comunicada - detección automática' ||
        (abs.notas && abs.notas.startsWith('[SISTEMA]')) ||
        (abs.notas && abs.notas.startsWith('[shiftAudit]'));
      // También incluir las auto-generadas que ya fueron validadas/aprobadas
      if (isAuto && abs.estado_aprobacion === 'Pendiente') return false;
      return true;
    });
  }, [absences]);

  const now = new Date();
  const formalActive = formalAbsences.filter(a => {
    if (a.estado_aprobacion === 'Rechazada' || a.estado_aprobacion === 'Cancelada') return false;
    const start = new Date(a.fecha_inicio);
    const end = a.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(a.fecha_fin || '2099-12-31');
    return now >= start && now <= end;
  });

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

      const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || dept.toLowerCase().includes(search.toLowerCase()) || abs.motivo?.toLowerCase().includes(search.toLowerCase());
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

  // Auto-open if coming from presence control
  useEffect(() => {
    if (!initialEmployeeId) return;
    setEditingAbsence({ employee_id: String(initialEmployeeId), employee_name: initialEmployeeName || '' });
    setShowForm(true);
  }, [initialEmployeeId]);

  const getEmp = (id) => employees.find(e => String(e.id) === String(id));

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Activas ahora", value: formalActive.length, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20" },
          { label: "Pendientes aprobación", value: formalAbsences.filter(a => a.estado_aprobacion === 'Pendiente').length, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20" },
          { label: "Aprobadas este mes", value: formalAbsences.filter(a => a.estado_aprobacion === 'Aprobada' && new Date(a.fecha_inicio) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
          { label: "Total registradas", value: formalAbsences.length, color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-800/50" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-lg p-3 border`}>
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44">
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
            <SelectTrigger className="w-44">
              <Filter className="w-4 h-4 mr-1 text-slate-400" />
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {deptOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44">
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
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['absences'] })}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => { setEditingAbsence(null); setShowForm(true); }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nueva Ausencia
          </Button>
        </div>
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No hay ausencias con los filtros actuales</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 dark:bg-slate-800/50">
                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Empleado</th>
                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Tipo / Motivo</th>
                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Inicio</th>
                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Fin</th>
                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Estado</th>
                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(abs => {
                    const emp = getEmp(abs.employee_id);
                    const statusCfg = STATUS_CONFIG[abs.estado_aprobacion] || STATUS_CONFIG.Pendiente;
                    return (
                      <tr key={abs.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{emp?.nombre || '—'}</p>
                            <p className="text-xs text-slate-400">{emp?.departamento || ''}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{abs.tipo || <span className="text-slate-400 italic">Sin tipo</span>}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[180px]">{abs.motivo}</p>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {format(new Date(abs.fecha_inicio), "dd/MM/yyyy HH:mm", { locale: es })}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {abs.fecha_fin_desconocida
                            ? <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">Indefinida</Badge>
                            : format(new Date(abs.fecha_fin), "dd/MM/yyyy HH:mm", { locale: es })
                          }
                        </td>
                        <td className="p-3">
                          <Badge className={`${statusCfg.color} border text-xs`}>{statusCfg.label}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingAbsence({ ...abs, employee_name: emp?.nombre || '' });
                                setShowForm(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:bg-red-50"
                              onClick={() => {
                                if (confirm("¿Eliminar esta ausencia?")) deleteMutation.mutate(abs.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
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