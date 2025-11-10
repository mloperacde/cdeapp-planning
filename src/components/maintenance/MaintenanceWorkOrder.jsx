import React, { useState, useRef, useEffect } from "react";
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

function SignaturePad({ onSave, existingSignature }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    if (existingSignature) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = existingSignature;
    }
  }, [existingSignature]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    ctx.beginPath();
    ctx.moveTo(
      e.clientX - rect.left,
      e.clientY - rect.top
    );
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    ctx.lineTo(
      e.clientX - rect.left,
      e.clientY - rect.top
    );
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      onSave(canvas.toDataURL());
    }
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onSave('');
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={150}
        className="border-2 border-slate-200 rounded-lg w-full cursor-crosshair bg-white"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <Button type="button" variant="outline" size="sm" onClick={clear}>
        Limpiar
      </Button>
    </div>
  );
}

export default function MaintenanceWorkOrder({ maintenance, machines, employees, onClose }) {
  const [fechaInicio, setFechaInicio] = useState(maintenance.fecha_inicio || "");
  const [fechaFin, setFechaFin] = useState(maintenance.fecha_finalizacion || "");
  const [firmaTecnico, setFirmaTecnico] = useState(maintenance.firma_tecnico || "");
  const [firmaRevisado, setFirmaRevisado] = useState(maintenance.firma_revisado || "");
  const [firmaVerificado, setFirmaVerificado] = useState(maintenance.firma_verificado || "");
  const queryClient = useQueryClient();

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
      firma_tecnico: firmaTecnico,
      firma_revisado: firmaRevisado,
      firma_verificado: firmaVerificado,
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
                <SignaturePad 
                  onSave={setFirmaTecnico}
                  existingSignature={firmaTecnico}
                />
              </div>

              <div className="space-y-2">
                <Label>Firma Revisado Por</Label>
                <SignaturePad 
                  onSave={setFirmaRevisado}
                  existingSignature={firmaRevisado}
                />
              </div>

              <div className="space-y-2">
                <Label>Firma Verificado Por</Label>
                <SignaturePad 
                  onSave={setFirmaVerificado}
                  existingSignature={firmaVerificado}
                />
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