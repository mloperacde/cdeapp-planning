import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserCheck, CheckCircle2, XCircle, Clock, Search, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { notifyProfileChangeResponse } from "../notifications/NotificationService";

export default function ProfileApprovalPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const queryClient = useQueryClient();

  const { data: changeRequests = [] } = useQuery({
    queryKey: ['profileChangeRequests'],
    queryFn: () => base44.entities.ProfileChangeRequest.list('-fecha_solicitud'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId) => {
      const request = changeRequests.find(r => r.id === requestId);
      if (!request) throw new Error("Solicitud no encontrada");

      // Actualizar la solicitud
      await base44.entities.ProfileChangeRequest.update(requestId, {
        estado: 'Aprobado',
        fecha_respuesta: new Date().toISOString(),
        aprobado_por: currentUser?.id
      });

      // Actualizar el empleado con el nuevo valor
      const employee = employees.find(e => e.id === request.employee_id);
      if (employee) {
        await base44.entities.EmployeeMasterDatabase.update(request.employee_id, {
          [request.campo_modificado]: request.valor_solicitado
        });
      }

      // Enviar notificación
      await notifyProfileChangeResponse(request.employee_id, request.campo_modificado, 'Aprobado');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profileChangeRequests'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      toast.success("Cambio aprobado y aplicado");
      setSelectedRequest(null);
    },
    onError: (error) => {
      toast.error("Error al aprobar: " + error.message);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }) => {
      const request = changeRequests.find(r => r.id === requestId);
      
      await base44.entities.ProfileChangeRequest.update(requestId, {
        estado: 'Rechazado',
        fecha_respuesta: new Date().toISOString(),
        aprobado_por: currentUser?.id,
        motivo_rechazo: reason
      });

      // Enviar notificación
      if (request) {
        await notifyProfileChangeResponse(request.employee_id, request.campo_modificado, 'Rechazado', reason);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profileChangeRequests'] });
      toast.success("Solicitud rechazada");
      setSelectedRequest(null);
      setRejectReason("");
    },
    onError: (error) => {
      toast.error("Error al rechazar: " + error.message);
    }
  });

  const pendingRequests = useMemo(() => {
    return changeRequests.filter(r => r.estado === 'Pendiente');
  }, [changeRequests]);

  const filteredRequests = useMemo(() => {
    if (!searchTerm) return pendingRequests;
    
    return pendingRequests.filter(req => {
      const employee = employees.find(e => e.id === req.employee_id);
      return employee?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             req.campo_modificado?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [pendingRequests, searchTerm, employees]);

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.nombre || "Desconocido";
  };

  const fieldLabels = {
    email: 'Email',
    telefono_movil: 'Teléfono Móvil',
    direccion: 'Dirección',
    contacto_emergencia_nombre: 'Contacto Emergencia - Nombre',
    contacto_emergencia_telefono: 'Contacto Emergencia - Teléfono',
    contacto_emergencia_relacion: 'Contacto Emergencia - Relación',
    iban: 'IBAN',
    swift_bic: 'SWIFT/BIC',
    banco_nombre: 'Nombre del Banco'
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-700 font-medium">Solicitudes Pendientes</p>
              <p className="text-2xl font-bold text-blue-900">{pendingRequests.length}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Aprobación de Cambios de Perfil
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por empleado o campo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {searchTerm 
                ? "No se encontraron solicitudes con ese término" 
                : "No hay solicitudes pendientes"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Campo</TableHead>
                    <TableHead>Valor Actual</TableHead>
                    <TableHead>Valor Solicitado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map(req => (
                    <TableRow key={req.id}>
                      <TableCell className="text-xs">
                        {format(new Date(req.fecha_solicitud), "dd/MM/yy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell className="font-medium">{getEmployeeName(req.employee_id)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{req.categoria_cambio}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{fieldLabels[req.campo_modificado]}</TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                        {req.valor_actual || '-'}
                      </TableCell>
                      <TableCell className="text-xs font-medium max-w-xs truncate">
                        {req.valor_solicitado}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedRequest(req)}
                            className="text-blue-600"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(req.id)}
                            className="bg-green-600 hover:bg-green-700"
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedRequest(req)}
                            className="text-red-600"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRequest && (
        <Dialog open={true} onOpenChange={() => {
          setSelectedRequest(null);
          setRejectReason("");
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalles de la Solicitud</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Empleado</Label>
                  <p className="font-medium">{getEmployeeName(selectedRequest.employee_id)}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Fecha Solicitud</Label>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.fecha_solicitud), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-500">Campo a Modificar</Label>
                <p className="font-medium">{fieldLabels[selectedRequest.campo_modificado]}</p>
                <Badge variant="outline" className="mt-1">{selectedRequest.categoria_cambio}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label className="text-xs text-slate-500">Valor Actual</Label>
                  <p className="text-sm mt-1">{selectedRequest.valor_actual || 'No establecido'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Valor Solicitado</Label>
                  <p className="text-sm mt-1 font-medium text-blue-600">{selectedRequest.valor_solicitado}</p>
                </div>
              </div>

              {selectedRequest.notas && (
                <div>
                  <Label className="text-xs text-slate-500">Notas</Label>
                  <p className="text-sm mt-1">{selectedRequest.notas}</p>
                </div>
              )}

              <div className="pt-4 border-t space-y-4">
                <div className="space-y-2">
                  <Label>Motivo de Rechazo (opcional)</Label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="Explica por qué se rechaza esta solicitud..."
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedRequest(null);
                      setRejectReason("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => rejectMutation.mutate({ 
                      requestId: selectedRequest.id, 
                      reason: rejectReason 
                    })}
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    disabled={rejectMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rechazar
                  </Button>
                  <Button
                    onClick={() => approveMutation.mutate(selectedRequest.id)}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Aprobar y Aplicar
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}