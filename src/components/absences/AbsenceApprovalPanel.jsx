import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Clock, FileText, Download, Trash2, ChevronDown, ChevronUp, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { notifyAbsenceDecisionAdvanced } from "../notifications/AdvancedNotificationService";
import PayrollExportButton from "./PayrollExportButton";

export default function AbsenceApprovalPanel({ employees, masterEmployees = [], absenceTypes, currentUser }) {
  const [expandedId, setExpandedId] = useState(null);
  const [comentario, setComentario] = useState("");
  const queryClient = useQueryClient();

  const { data: absences = [] } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-fecha_inicio', 1000),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Solo ausencias manuales pendientes (excluir las auto-detectadas)
  const pendingAbsences = absences.filter(abs => {
    const isAuto = abs.motivo === 'Ausencia no comunicada - detección automática' ||
      (abs.notas && (abs.notas.startsWith('[SISTEMA]') || abs.notas.startsWith('[shiftAudit]')));
    return !isAuto && abs.estado_aprobacion === "Pendiente";
  });

  const approvalMutation = useMutation({
    mutationFn: async ({ absenceId, estado, comentario, employeeId, absenceTypeId }) => {
      const absence = absences.find(a => a.id === absenceId);

      const result = await base44.entities.Absence.update(absenceId, {
        estado_aprobacion: estado,
        aprobado_por: currentUser?.id,
        fecha_aprobacion: new Date().toISOString(),
        comentario_aprobacion: comentario,
        flujo_aprobacion: [{
          usuario_id: currentUser?.id,
          nivel: 1,
          estado,
          fecha: new Date().toISOString(),
          comentario
        }]
      });

      if (estado === "Aprobada" && absence) {
        const now = new Date();
        const start = new Date(absence.fecha_inicio);
        const end = absence.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(absence.fecha_fin);
        if (now >= start && now <= end) {
          await base44.entities.EmployeeMasterDatabase.update(employeeId, {
            disponibilidad: "Ausente",
            ausencia_inicio: absence.fecha_inicio,
            ausencia_fin: absence.fecha_fin,
            ausencia_motivo: absence.motivo
          });
        }
      }

      const absenceType = absenceTypes.find(t => t.id === absenceTypeId);
      await notifyAbsenceDecisionAdvanced(absenceId, employeeId, estado === "Aprobada", comentario, absenceType);
      return result;
    },
    onSuccess: async (_, variables) => {
      try { await base44.functions.invoke('syncEmployeeAvailability'); } catch (e) {}
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      toast.success(`Ausencia ${variables.estado === "Aprobada" ? "aprobada ✓" : "rechazada"} correctamente`);
      setExpandedId(null);
      setComentario("");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (absenceId) => base44.entities.Absence.delete(absenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      toast.success("Solicitud eliminada");
      setExpandedId(null);
    },
    onError: () => toast.error("Error al eliminar la solicitud")
  });

  const getEmp = (id) =>
    employees.find(e => String(e.id) === String(id)) ||
    masterEmployees.find(e => String(e.id) === String(id));

  const getTypeName = (typeId) =>
    absenceTypes.find(t => t.id === typeId)?.nombre || "Sin tipo";

  if (pendingAbsences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Todo al día</p>
        <p className="text-sm text-slate-400 mt-1">No hay solicitudes pendientes de aprobación</p>
        <div className="mt-4">
          <PayrollExportButton absences={absences} employees={employees} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Solicitudes pendientes
            <Badge className="bg-orange-500 text-white">{pendingAbsences.length}</Badge>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Revisa y aprueba o rechaza cada solicitud</p>
        </div>
        <PayrollExportButton absences={absences} employees={employees} />
      </div>

      <div className="space-y-3">
        {pendingAbsences.map(absence => {
          const isExpanded = expandedId === absence.id;
          const emp = getEmp(absence.employee_id);
          const typeName = getTypeName(absence.absence_type_id);
          const initials = emp?.nombre?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';

          return (
            <Card key={absence.id} className="border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {/* Fila principal */}
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 text-sm font-bold text-orange-700 dark:text-orange-300">
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {emp?.nombre || `Empleado ${absence.employee_id}`}
                      </span>
                      <Badge variant="outline" className="text-xs">{typeName}</Badge>
                      {absence.remunerada && (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Remunerada</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(absence.fecha_inicio), "dd MMM yyyy", { locale: es })}
                        {" → "}
                        {absence.fecha_fin_desconocida
                          ? "fecha indefinida"
                          : format(new Date(absence.fecha_fin), "dd MMM yyyy", { locale: es })}
                      </span>
                      {emp?.departamento && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {emp.departamento}
                        </span>
                      )}
                    </div>
                    {absence.motivo && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">"{absence.motivo}"</p>
                    )}
                  </div>

                  {/* Acciones rápidas (sin expandir) */}
                  {!isExpanded && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs px-3"
                        onClick={() => {
                          approvalMutation.mutate({
                            absenceId: absence.id,
                            estado: "Aprobada",
                            comentario: "",
                            employeeId: absence.employee_id,
                            absenceTypeId: absence.absence_type_id
                          });
                        }}
                        disabled={approvalMutation.isPending}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs px-2 text-slate-600"
                        onClick={() => {
                          setExpandedId(absence.id);
                          setComentario("");
                        }}
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Documentos adjuntos */}
                {absence.documentos_adjuntos?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-500 font-medium mb-1.5 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Documentos adjuntos:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {absence.documentos_adjuntos.map((doc, idx) => (
                        <a
                          key={idx}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"
                        >
                          <Download className="w-3 h-3" />
                          {doc.nombre}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Panel expandido */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                        Comentario (opcional)
                      </label>
                      <Textarea
                        placeholder="Añade un comentario para el empleado..."
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => approvalMutation.mutate({
                          absenceId: absence.id,
                          estado: "Aprobada",
                          comentario,
                          employeeId: absence.employee_id,
                          absenceTypeId: absence.absence_type_id
                        })}
                        disabled={approvalMutation.isPending}
                      >
                        <Check className="w-4 h-4 mr-1.5" />
                        Aprobar
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => approvalMutation.mutate({
                          absenceId: absence.id,
                          estado: "Rechazada",
                          comentario,
                          employeeId: absence.employee_id,
                          absenceTypeId: absence.absence_type_id
                        })}
                        disabled={approvalMutation.isPending}
                      >
                        <X className="w-4 h-4 mr-1.5" />
                        Rechazar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (confirm("¿Eliminar esta solicitud permanentemente?"))
                            deleteMutation.mutate(absence.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExpandedId(null)}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}