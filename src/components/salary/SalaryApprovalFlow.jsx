import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, Clock, FileText, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAppData } from "@/components/data/DataProvider";
import { notifySalaryChangeApproved, notifySalaryChangeRejected } from "../notifications/NotificationService";

export default function SalaryApprovalFlow() {
  const queryClient = useQueryClient();
  const { user } = useAppData();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewComments, setReviewComments] = useState("");
  const [reviewAction, setReviewAction] = useState(null);

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['salaryChangeRequests', 'pending'],
    queryFn: () => base44.entities.SalaryChangeRequest.filter({ 
      status: { $in: ["Pendiente", "En Revisión"] }
    }),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ requestId, comments }) => {
      const request = pendingRequests.find(r => r.id === requestId);
      
      // Actualizar solicitud
      await base44.entities.SalaryChangeRequest.update(requestId, {
        status: "Aprobada",
        approved_by: user.id,
        approval_date: new Date().toISOString(),
        approval_flow: [
          ...(request.approval_flow || []),
          {
            approver_id: user.id,
            approver_name: user.full_name,
            level: (request.approval_flow || []).length + 1,
            status: "Aprobada",
            action_date: new Date().toISOString(),
            comments
          }
        ]
      });

      // Crear log de auditoría
      await base44.entities.SalaryAuditLog.create({
        entity_type: "EmployeeSalary",
        entity_id: requestId,
        action: "approve",
        employee_id: request.employee_id,
        employee_name: request.employee_name,
        change_amount: request.requested_amount - (request.current_amount || 0),
        change_reason: comments,
        changed_by: user.id,
        changed_by_name: user.full_name,
        change_date: new Date().toISOString(),
        request_id: requestId
      });

      // Notificar al empleado
      await notifySalaryChangeApproved(
        request.employee_id,
        request.employee_name,
        request.request_type
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaryChangeRequests'] });
      toast.success("Solicitud aprobada");
      setIsReviewDialogOpen(false);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }) => {
      const request = pendingRequests.find(r => r.id === requestId);
      
      await base44.entities.SalaryChangeRequest.update(requestId, {
        status: "Rechazada",
        rejection_reason: reason,
        approval_flow: [
          ...(request.approval_flow || []),
          {
            approver_id: user.id,
            approver_name: user.full_name,
            level: (request.approval_flow || []).length + 1,
            status: "Rechazada",
            action_date: new Date().toISOString(),
            comments: reason
          }
        ]
      });

      // Log de auditoría
      await base44.entities.SalaryAuditLog.create({
        entity_type: "EmployeeSalary",
        entity_id: requestId,
        action: "reject",
        employee_id: request.employee_id,
        employee_name: request.employee_name,
        change_reason: reason,
        changed_by: user.id,
        changed_by_name: user.full_name,
        change_date: new Date().toISOString(),
        request_id: requestId
      });

      // Notificar al empleado
      await notifySalaryChangeRejected(
        request.employee_id,
        request.employee_name,
        request.request_type,
        reason
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaryChangeRequests'] });
      toast.success("Solicitud rechazada");
      setIsReviewDialogOpen(false);
    },
  });

  const handleReview = (request, action) => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewComments("");
    setIsReviewDialogOpen(true);
  };

  const handleSubmitReview = () => {
    if (!reviewComments.trim()) {
      toast.error("Por favor, añade un comentario");
      return;
    }

    if (reviewAction === "approve") {
      approveMutation.mutate({ requestId: selectedRequest.id, comments: reviewComments });
    } else {
      rejectMutation.mutate({ requestId: selectedRequest.id, reason: reviewComments });
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      "Pendiente": { color: "bg-yellow-100 text-yellow-700", icon: Clock },
      "En Revisión": { color: "bg-blue-100 text-blue-700", icon: AlertCircle },
      "Aprobada": { color: "bg-green-100 text-green-700", icon: CheckCircle },
      "Rechazada": { color: "bg-red-100 text-red-700", icon: XCircle }
    };
    const { color, icon: Icon } = config[status] || config["Pendiente"];
    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Solicitudes de Cambio Pendientes
            <Badge variant="secondary">{pendingRequests.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{request.employee_name}</h4>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-slate-500">{request.request_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Solicitado por</p>
                        <p className="text-sm font-medium">{request.requested_by_name}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg mb-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-slate-500">Componente:</span>
                          <p className="font-medium">{request.component_name}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Fecha efectiva:</span>
                          <p className="font-medium">
                            {request.effective_date ? format(new Date(request.effective_date), 'dd/MM/yyyy') : '-'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Actual:</span>
                          <p className="font-medium">{request.current_amount || 0}€</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Solicitado:</span>
                          <p className="font-medium text-emerald-600">{request.requested_amount}€</p>
                        </div>
                      </div>
                      {request.change_reason && (
                        <div className="mt-2 pt-2 border-t">
                          <span className="text-xs text-slate-500">Justificación:</span>
                          <p className="text-sm">{request.change_reason}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleReview(request, "approve")}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleReview(request, "reject")}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Rechazar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {pendingRequests.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No hay solicitudes pendientes de revisión</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Aprobar Solicitud" : "Rechazar Solicitud"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedRequest && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{selectedRequest.employee_name}</h4>
                <p className="text-sm text-slate-600">{selectedRequest.request_type}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span>Actual: <strong>{selectedRequest.current_amount || 0}€</strong></span>
                  <span>→</span>
                  <span>Nuevo: <strong className="text-emerald-600">{selectedRequest.requested_amount}€</strong></span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Comentarios {reviewAction === "reject" ? "(Motivo del rechazo)" : ""}</Label>
              <Textarea
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder={reviewAction === "approve" ? "Comentarios de aprobación..." : "Explica el motivo del rechazo..."}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className={reviewAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
              variant={reviewAction === "reject" ? "destructive" : "default"}
            >
              {approveMutation.isPending || rejectMutation.isPending ? "Procesando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}