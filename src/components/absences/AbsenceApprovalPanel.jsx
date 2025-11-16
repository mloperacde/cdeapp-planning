
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Clock, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { notifyAbsenceDecision } from "../notifications/NotificationService";

export default function AbsenceApprovalPanel({ absences, employees, absenceTypes, currentUser }) {
  const [expandedId, setExpandedId] = useState(null);
  const [comentario, setComentario] = useState("");
  const queryClient = useQueryClient();

  const pendingAbsences = absences.filter(abs => abs.estado_aprobacion === "Pendiente");

  const approvalMutation = useMutation({
    mutationFn: async ({ absenceId, estado, comentario, employeeId }) => {
      const result = await base44.entities.Absence.update(absenceId, {
        estado_aprobacion: estado,
        aprobado_por: currentUser?.id,
        fecha_aprobacion: new Date().toISOString(),
        comentario_aprobacion: comentario,
        flujo_aprobacion: [
          {
            usuario_id: currentUser?.id,
            nivel: 1,
            estado: estado,
            fecha: new Date().toISOString(),
            comentario: comentario
          }
        ]
      });

      // Enviar notificación al empleado
      await notifyAbsenceDecision(absenceId, employeeId, estado === "Aprobada", comentario);

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      toast.success(`Ausencia ${variables.estado === "Aprobada" ? "aprobada" : "rechazada"}`);
      setExpandedId(null);
      setComentario("");
    }
  });

  const handleApproval = (absence, estado) => {
    approvalMutation.mutate({ 
      absenceId: absence.id, 
      estado, 
      comentario,
      employeeId: absence.employee_id 
    });
  };

  const getEmployeeName = (employeeId) => {
    return employees.find(e => e.id === employeeId)?.nombre || "Desconocido";
  };

  const getTypeName = (typeId) => {
    return absenceTypes.find(t => t.id === typeId)?.nombre || "Sin tipo";
  };

  return (
    <Card className="shadow-xl border-orange-200">
      <CardHeader className="bg-orange-50 border-b">
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-600" />
          Ausencias Pendientes de Aprobación ({pendingAbsences.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {pendingAbsences.length === 0 ? (
          <div className="text-center py-12">
            <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-slate-600">No hay ausencias pendientes de aprobación</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingAbsences.map(absence => {
              const isExpanded = expandedId === absence.id;
              
              return (
                <Card key={absence.id} className="border-2 border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg text-slate-900">
                          {getEmployeeName(absence.employee_id)}
                        </h4>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">{getTypeName(absence.absence_type_id)}</Badge>
                          <Badge className="bg-orange-100 text-orange-800">Pendiente</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div>
                        <span className="text-slate-500">Inicio:</span>
                        <p className="font-medium">{format(new Date(absence.fecha_inicio), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Fin:</span>
                        <p className="font-medium">
                          {absence.fecha_fin_desconocida ? "Desconocida" : format(new Date(absence.fecha_fin), "dd/MM/yyyy HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <span className="text-slate-500 text-sm">Motivo:</span>
                      <p className="text-sm">{absence.motivo}</p>
                      {absence.notas && (
                        <>
                          <span className="text-slate-500 text-sm">Notas:</span>
                          <p className="text-sm text-slate-600">{absence.notas}</p>
                        </>
                      )}
                    </div>

                    {absence.documentos_adjuntos?.length > 0 && (
                      <div className="mb-3 border-t pt-3">
                        <span className="text-slate-500 text-sm font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Documentos Adjuntos:
                        </span>
                        <div className="mt-2 space-y-1">
                          {absence.documentos_adjuntos.map((doc, idx) => (
                            <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                              <Download className="w-3 h-3" />
                              {doc.nombre}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {isExpanded && (
                      <div className="mt-4 space-y-3 border-t pt-4">
                        <Textarea
                          placeholder="Comentario de aprobación/rechazo (opcional)..."
                          value={comentario}
                          onChange={(e) => setComentario(e.target.value)}
                          rows={2}
                        />
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      {!isExpanded ? (
                        <Button
                          variant="outline"
                          onClick={() => setExpandedId(absence.id)}
                          className="flex-1"
                        >
                          Revisar
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={() => handleApproval(absence, "Aprobada")}
                            disabled={approvalMutation.isPending}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Aprobar
                          </Button>
                          <Button
                            onClick={() => handleApproval(absence, "Rechazada")}
                            disabled={approvalMutation.isPending}
                            variant="destructive"
                            className="flex-1"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Rechazar
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
