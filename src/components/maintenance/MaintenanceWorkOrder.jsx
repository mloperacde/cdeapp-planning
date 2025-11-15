import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, Printer, Download } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";

const SignaturePad = ({ value, onChange, label }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = value;
    }
  }, [value]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const pos = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getCoordinates(e);
    
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    onChange(canvas.toDataURL());
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="border-2 border-slate-300 rounded-lg bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={500}
          height={120}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <Button type="button" variant="ghost" size="sm" onClick={clearSignature} className="w-full border-t">
          Limpiar
        </Button>
      </div>
    </div>
  );
};

export default function MaintenanceWorkOrder({ maintenance, onClose, onUpdate }) {
  const [workOrder, setWorkOrder] = useState({
    fecha_inicio: maintenance.fecha_inicio || "",
    fecha_finalizacion: maintenance.fecha_finalizacion || "",
    duracion_real: maintenance.duracion_real || 0,
    tareas: maintenance.tareas || [],
    notas: maintenance.notas || "",
    firma_tecnico: maintenance.firma_tecnico || "",
    firma_revisado: maintenance.firma_revisado || "",
    firma_verificado: maintenance.firma_verificado || ""
  });

  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list(),
    initialData: [],
  });

  const machine = machines?.find(m => m.id === maintenance.machine_id);
  const technician = employees?.find(e => e.id === maintenance.tecnico_asignado);
  const reviewer = employees?.find(e => e.id === maintenance.revisado_por);
  const verifier = employees?.find(e => e.id === maintenance.verificado_por);
  const creator = employees?.find(e => e.id === maintenance.creado_por);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceSchedule.update(maintenance.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
      toast.success("Orden de trabajo actualizada");
      if (onUpdate) onUpdate();
    },
  });

  const completeMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceSchedule.update(maintenance.id, {
      ...data,
      estado: "Completado"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
      toast.success("Mantenimiento completado");
      onClose();
    },
  });

  const handleSaveProgress = () => {
    updateMutation.mutate(workOrder);
  };

  const handleComplete = () => {
    if (!workOrder.firma_tecnico || !workOrder.firma_revisado || !workOrder.firma_verificado) {
      toast.error("Todas las firmas son requeridas para completar");
      return;
    }
    completeMutation.mutate(workOrder);
  };

  const handleTaskToggle = (taskIndex) => {
    const updatedTasks = [...workOrder.tareas];
    updatedTasks[taskIndex].completada = !updatedTasks[taskIndex].completada;
    setWorkOrder({ ...workOrder, tareas: updatedTasks });
  };

  const handleSubtaskToggle = (taskIndex, subtaskIndex) => {
    const updatedTasks = [...workOrder.tareas];
    if (updatedTasks[taskIndex].subtareas && updatedTasks[taskIndex].subtareas[subtaskIndex]) {
      updatedTasks[taskIndex].subtareas[subtaskIndex].completada = 
        !updatedTasks[taskIndex].subtareas[subtaskIndex].completada;
      setWorkOrder({ ...workOrder, tareas: updatedTasks });
    }
  };

  const handleRecordTime = () => {
    const now = new Date().toISOString();
    if (!workOrder.fecha_inicio) {
      setWorkOrder({ ...workOrder, fecha_inicio: now });
      toast.success("Tiempo de inicio registrado");
    } else if (!workOrder.fecha_finalizacion) {
      const duracion = differenceInHours(new Date(now), new Date(workOrder.fecha_inicio));
      setWorkOrder({ ...workOrder, fecha_finalizacion: now, duracion_real: duracion });
      toast.success(`Tiempo finalizado. Duración: ${duracion.toFixed(2)} horas`);
    }
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    const pdfContent = document.getElementById('maintenance-pdf-content');
    
    if (printWindow && pdfContent) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Orden de Trabajo - ${machine?.nombre || 'Máquina'}</title>
            <meta charset="UTF-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: Arial, sans-serif; 
                background: white;
              }
              @media print {
                @page { 
                  margin: 15mm; 
                  size: A4; 
                }
                body { 
                  print-color-adjust: exact; 
                  -webkit-print-color-adjust: exact; 
                }
              }
            </style>
          </head>
          <body>
            ${pdfContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const tareasCompletadas = (workOrder.tareas || []).filter(t => t.completada).length;
  const totalTareas = (workOrder.tareas || []).length;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Orden de Trabajo - {machine?.nombre || 'Máquina'}</DialogTitle>
            <div className="flex gap-2">
              <Button onClick={handleDownloadPDF} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
              <Button onClick={() => window.print()} variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div id="maintenance-pdf-content" className="bg-white p-8">
          {/* Encabezado */}
          <div className="border-4 border-blue-900 p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-blue-900 mb-2">
                  ORDEN DE TRABAJO DE MANTENIMIENTO
                </h1>
                <p className="text-lg text-blue-700">
                  OT-{maintenance.id?.substring(0, 8).toUpperCase() || "N/A"}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-600">Fecha de Emisión:</div>
                <div className="font-bold">{format(new Date(), "dd/MM/yyyy", { locale: es })}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t-2 border-blue-200">
              <div>
                <span className="font-semibold">Estado:</span>
                <span className={`ml-2 px-2 py-1 rounded ${
                  maintenance.estado === "Completado" ? "bg-green-100 text-green-800" :
                  maintenance.estado === "En Proceso" ? "bg-blue-100 text-blue-800" :
                  "bg-amber-100 text-amber-800"
                }`}>
                  {maintenance.estado || "N/A"}
                </span>
              </div>
              <div>
                <span className="font-semibold">Prioridad:</span>
                <span className={`ml-2 px-2 py-1 rounded ${
                  maintenance.prioridad === "Urgente" ? "bg-red-100 text-red-800" :
                  maintenance.prioridad === "Alta" ? "bg-orange-100 text-orange-800" :
                  "bg-blue-100 text-blue-800"
                }`}>
                  {maintenance.prioridad || "Media"}
                </span>
              </div>
            </div>
          </div>

          {/* Información de la Máquina */}
          <div className="border-2 border-slate-300 mb-6">
            <div className="bg-blue-900 text-white p-3">
              <h2 className="text-lg font-bold">1. INFORMACIÓN DE LA MÁQUINA</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-slate-600">Máquina:</span>
                  <div className="font-bold text-lg">{machine?.nombre || "N/A"}</div>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Código:</span>
                  <div className="font-bold">{machine?.codigo || "N/A"}</div>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Ubicación:</span>
                  <div className="font-bold">{machine?.ubicacion || "N/A"}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-slate-600">Marca/Modelo:</span>
                  <div className="font-bold">{machine?.marca || "N/A"} {machine?.modelo || ""}</div>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Nº Serie:</span>
                  <div className="font-bold">{machine?.numero_serie || "N/A"}</div>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Estado:</span>
                  <div className="font-bold">{machine?.estado || "N/A"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Información del Mantenimiento */}
          <div className="border-2 border-slate-300 mb-6">
            <div className="bg-blue-900 text-white p-3">
              <h2 className="text-lg font-bold">2. DETALLES DEL MANTENIMIENTO</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-slate-600">Tipo:</span>
                <div className="font-bold">{maintenance.tipo || "N/A"}</div>
              </div>
              <div>
                <span className="text-sm text-slate-600">Fecha Programada:</span>
                <div className="font-bold">
                  {maintenance.fecha_programada 
                    ? format(new Date(maintenance.fecha_programada), "dd/MM/yyyy HH:mm", { locale: es })
                    : "N/A"}
                </div>
              </div>
              <div>
                <span className="text-sm text-slate-600">Duración Estimada:</span>
                <div className="font-bold">{maintenance.duracion_estimada || 0} horas</div>
              </div>
              {workOrder.duracion_real > 0 && (
                <div>
                  <span className="text-sm text-slate-600">Duración Real:</span>
                  <div className="font-bold">{workOrder.duracion_real.toFixed(2)} horas</div>
                </div>
              )}
              {maintenance.descripcion && (
                <div className="col-span-2">
                  <span className="text-sm text-slate-600">Descripción:</span>
                  <div className="mt-1 p-2 bg-slate-50 rounded">{maintenance.descripcion}</div>
                </div>
              )}
            </div>
          </div>

          {/* Personal Asignado */}
          <div className="border-2 border-slate-300 mb-6">
            <div className="bg-blue-900 text-white p-3">
              <h2 className="text-lg font-bold">3. PERSONAL ASIGNADO</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-slate-600">Técnico Asignado:</span>
                <div className="font-bold">{technician?.nombre || "No asignado"}</div>
              </div>
              <div>
                <span className="text-sm text-slate-600">Creado Por:</span>
                <div className="font-bold">{creator?.nombre || "N/A"}</div>
              </div>
              <div>
                <span className="text-sm text-slate-600">Supervisado Por:</span>
                <div className="font-bold">{reviewer?.nombre || "No asignado"}</div>
              </div>
              <div>
                <span className="text-sm text-slate-600">Verificado Por:</span>
                <div className="font-bold">{verifier?.nombre || "No asignado"}</div>
              </div>
            </div>
          </div>

          {/* Tareas */}
          <div className="border-2 border-slate-300 mb-6">
            <div className="bg-blue-900 text-white p-3">
              <h2 className="text-lg font-bold">
                4. TAREAS REALIZADAS ({tareasCompletadas}/{totalTareas} completadas)
              </h2>
            </div>
            <div className="p-4">
              {workOrder.tareas && workOrder.tareas.length > 0 ? (
                <div className="space-y-4">
                  {workOrder.tareas.map((tarea, index) => (
                    <div key={index} className="border border-slate-200 rounded p-3">
                      <div className="flex items-start gap-3 mb-2">
                        <Checkbox
                          checked={tarea.completada}
                          onCheckedChange={() => handleTaskToggle(index)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="font-bold text-base">
                            {index + 1}. {tarea.titulo || "Tarea sin título"}
                          </div>
                          {tarea.descripcion && (
                            <div className="text-sm text-slate-600 mt-1">{tarea.descripcion}</div>
                          )}
                        </div>
                      </div>

                      {tarea.subtareas && tarea.subtareas.length > 0 && (
                        <div className="ml-8 mt-2 space-y-1.5 border-l-2 border-slate-200 pl-4">
                          {tarea.subtareas.map((subtarea, subIndex) => (
                            <div key={subIndex} className="flex items-start gap-2">
                              <Checkbox
                                checked={subtarea.completada}
                                onCheckedChange={() => handleSubtaskToggle(index, subIndex)}
                                className="mt-0.5"
                              />
                              <span className="text-sm">{subtarea.titulo || "Subtarea"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-400 py-4">
                  No hay tareas definidas
                </div>
              )}
            </div>
          </div>

          {/* Registro de Tiempos */}
          <div className="border-2 border-slate-300 mb-6">
            <div className="bg-blue-900 text-white p-3">
              <h2 className="text-lg font-bold">5. REGISTRO DE TIEMPOS</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Fecha/Hora Inicio</Label>
                  <Input
                    type="datetime-local"
                    value={workOrder.fecha_inicio ? format(new Date(workOrder.fecha_inicio), "yyyy-MM-dd'T'HH:mm") : ""}
                    onChange={(e) => setWorkOrder({ ...workOrder, fecha_inicio: new Date(e.target.value).toISOString() })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha/Hora Finalización</Label>
                  <Input
                    type="datetime-local"
                    value={workOrder.fecha_finalizacion ? format(new Date(workOrder.fecha_finalizacion), "yyyy-MM-dd'T'HH:mm") : ""}
                    onChange={(e) => setWorkOrder({ ...workOrder, fecha_finalizacion: new Date(e.target.value).toISOString() })}
                  />
                </div>
              </div>
              
              <Button type="button" onClick={handleRecordTime} variant="outline" className="w-full mb-4">
                {!workOrder.fecha_inicio ? "Registrar Inicio" : !workOrder.fecha_finalizacion ? "Registrar Finalización" : "Tiempo Registrado"}
              </Button>

              {workOrder.duracion_real > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center">
                  <span className="text-sm text-blue-900 font-semibold">
                    Duración Total: {workOrder.duracion_real.toFixed(2)} horas
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Firmas */}
          <div className="border-2 border-slate-300 mb-6">
            <div className="bg-blue-900 text-white p-3">
              <h2 className="text-lg font-bold">6. VALIDACIÓN Y FIRMAS</h2>
            </div>
            <div className="p-4 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="border border-slate-300 p-4">
                  <div className="font-semibold mb-2">Técnico Ejecutor:</div>
                  <div className="text-sm text-slate-600 mb-2">{technician?.nombre || "No asignado"}</div>
                  <SignaturePad
                    value={workOrder.firma_tecnico}
                    onChange={(sig) => setWorkOrder({ ...workOrder, firma_tecnico: sig })}
                    label=""
                  />
                  <div className="text-xs text-slate-500 mt-2">
                    Fecha: {workOrder.fecha_finalizacion ? format(new Date(workOrder.fecha_finalizacion), "dd/MM/yyyy", { locale: es }) : "_______________"}
                  </div>
                </div>

                <div className="border border-slate-300 p-4">
                  <div className="font-semibold mb-2">Supervisor:</div>
                  <div className="text-sm text-slate-600 mb-2">{reviewer?.nombre || "No asignado"}</div>
                  <SignaturePad
                    value={workOrder.firma_revisado}
                    onChange={(sig) => setWorkOrder({ ...workOrder, firma_revisado: sig })}
                    label=""
                  />
                  <div className="text-xs text-slate-500 mt-2">
                    Fecha: _______________
                  </div>
                </div>

                <div className="border border-slate-300 p-4">
                  <div className="font-semibold mb-2">Verificación Final:</div>
                  <div className="text-sm text-slate-600 mb-2">{verifier?.nombre || "No asignado"}</div>
                  <SignaturePad
                    value={workOrder.firma_verificado}
                    onChange={(sig) => setWorkOrder({ ...workOrder, firma_verificado: sig })}
                    label=""
                  />
                  <div className="text-xs text-slate-500 mt-2">
                    Fecha: _______________
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div className="border-2 border-slate-300 mb-6">
            <div className="bg-blue-900 text-white p-3">
              <h2 className="text-lg font-bold">7. OBSERVACIONES Y NOTAS</h2>
            </div>
            <div className="p-4">
              <Textarea
                value={workOrder.notas}
                onChange={(e) => setWorkOrder({ ...workOrder, notas: e.target.value })}
                rows={4}
                placeholder="Añadir observaciones..."
                className="w-full"
              />
            </div>
          </div>

          {/* Pie */}
          <div className="border-t-4 border-blue-900 pt-4 mt-8 text-center text-xs text-slate-500">
            <p className="mb-2">
              Documento generado el {format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
            </p>
            <p className="font-semibold">
              Este documento es válido con las firmas digitales de las partes implicadas
            </p>
            <p className="mt-2 text-slate-400">
              Código OT: {maintenance.id || "N/A"} | Sistema de Gestión de Mantenimiento
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t print:hidden">
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button 
            type="button" 
            onClick={handleSaveProgress}
            disabled={updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Guardar Progreso
          </Button>
          <Button 
            type="button" 
            onClick={handleComplete}
            disabled={completeMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Completar Mantenimiento
          </Button>
        </div>

        <style>{`
          @media print {
            @page {
              size: A4;
              margin: 15mm;
            }
            
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            .print\\:hidden {
              display: none !important;
            }
            
            .bg-blue-900, .bg-green-100, .bg-red-100, .bg-amber-100, .bg-orange-100, .bg-blue-100, .bg-slate-50, .bg-blue-50 {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}