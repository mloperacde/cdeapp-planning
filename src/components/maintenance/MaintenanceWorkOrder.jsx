import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import SignatureCanvas from "react-signature-canvas";

export default function MaintenanceWorkOrder({ maintenance, machines, employees, onClose }) {
  const [fechaInicio, setFechaInicio] = useState(maintenance.fecha_inicio || "");
  const [fechaFin, setFechaFin] = useState(maintenance.fecha_finalizacion || "");
  const queryClient = useQueryClient();

  const tecnicoSigPad = useRef(null);
  const revisadoSigPad = useRef(null);
  const verificadoSigPad = useRef(null);

  const completeMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceSchedule.update(maintenance.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      onClose();
    },
  });

  const handleComplete = () => {
    const duracionReal = fechaInicio && fechaFin 
      ? (new Date(fechaFin) - new Date(fechaInicio)) / (1000 * 60 * 60) 
      : 0;

    const data = {
      estado: "Completado",
      fecha_inicio: fechaInicio,
      fecha_finalizacion: fechaFin,
      duracion_real: duracionReal,
      firma_tecnico: tecnicoSigPad.current?.toDataURL() || maintenance.firma_tecnico,
      firma_revisado: revisadoSigPad.current?.toDataURL() || maintenance.firma_revisado,
      firma_verificado: verificadoSigPad.current?.toDataURL() || maintenance.firma_verificado,
    };

    completeMutation.mutate(data);
  };

  const getMachineName = (machineId) => {
    const machine = machines.find(m => m.id === machineId);
    return machine?.nombre || "Máquina desconocida";
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.nombre || "No asignado";
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Orden de Trabajo de Mantenimiento</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información General */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información del Mantenimiento</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Máquina:</span> {getMachineName(maintenance.machine_id)}
              </div>
              <div>
                <span className="font-semibold">Tipo:</span> {maintenance.tipo}
              </div>
              <div>
                <span className="font-semibold">Prioridad:</span> {maintenance.prioridad}
              </div>
              <div>
                <span className="font-semibold">Fecha Programada:</span>{" "}
                {format(new Date(maintenance.fecha_programada), "dd/MM/yyyy HH:mm", { locale: es })}
              </div>
              {maintenance.descripcion && (
                <div className="col-span-2">
                  <span className="font-semibold">Descripción:</span> {maintenance.descripcion}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Asignado</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Técnico Asignado:</span>{" "}
                {getEmployeeName(maintenance.tecnico_asignado)}
              </div>
              <div>
                <span className="font-semibold">Creado Por:</span>{" "}
                {getEmployeeName(maintenance.creado_por)}
              </div>
              <div>
                <span className="font-semibold">Revisado Por:</span>{" "}
                {getEmployeeName(maintenance.revisado_por)}
              </div>
              <div>
                <span className="font-semibold">Verificado Por:</span>{" "}
                {getEmployeeName(maintenance.verificado_por)}
              </div>
            </CardContent>
          </Card>

          {/* Registro de Tiempos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Registro de Tiempos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_inicio">Fecha y Hora de Inicio</Label>
                  <Input
                    id="fecha_inicio"
                    type="datetime-local"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_fin">Fecha y Hora de Finalización</Label>
                  <Input
                    id="fecha_fin"
                    type="datetime-local"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                  />
                </div>
              </div>
              {fechaInicio && fechaFin && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <span className="text-sm font-semibold text-blue-900">
                    Duración: {((new Date(fechaFin) - new Date(fechaInicio)) / (1000 * 60 * 60)).toFixed(2)} horas
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Firmas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Firmas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Firma Técnico Asignado</Label>
                <div className="border-2 border-slate-200 rounded-lg">
                  <SignatureCanvas
                    ref={tecnicoSigPad}
                    canvasProps={{
                      className: 'w-full h-32 bg-white rounded-lg',
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => tecnicoSigPad.current?.clear()}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Firma Revisado Por</Label>
                <div className="border-2 border-slate-200 rounded-lg">
                  <SignatureCanvas
                    ref={revisadoSigPad}
                    canvasProps={{
                      className: 'w-full h-32 bg-white rounded-lg',
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => revisadoSigPad.current?.clear()}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Firma Verificado Por</Label>
                <div className="border-2 border-slate-200 rounded-lg">
                  <SignatureCanvas
                    ref={verificadoSigPad}
                    canvasProps={{
                      className: 'w-full h-32 bg-white rounded-lg',
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => verificadoSigPad.current?.clear()}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              onClick={handleComplete}
              className="bg-green-600 hover:bg-green-700"
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? "Completando..." : "Completar Mantenimiento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}