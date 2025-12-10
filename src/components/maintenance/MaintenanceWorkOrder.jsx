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
      img.onload = () => {
        // Clear canvas before drawing image to avoid drawing over existing signature if value changes
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = value;
    } else {
      // Clear canvas if value is null/empty
      ctx.clearRect(0, 0, canvas.width, canvas.height);
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
      {label && <Label>{label}</Label>}
      <div className="border-2 border-slate-300 rounded-lg bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={400}
          height={100}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={clearSignature} className="w-full">
        Limpiar Firma
      </Button>
    </div>
  );
};

const MaintenanceWorkOrderPDF = ({ maintenance, machine, employees }) => {
  const technician = employees?.find(e => e.id === maintenance.tecnico_asignado);
  const reviewer = employees?.find(e => e.id === maintenance.revisado_por);
  const verifier = employees?.find(e => e.id === maintenance.verificado_por);
  const creator = employees?.find(e => e.id === maintenance.creado_por);

  const tareasCompletadas = (maintenance.tareas || []).filter(t => t.completada).length;
  const totalTareas = (maintenance.tareas || []).length;

  return (
    <div className="bg-white p-8">
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
          {maintenance.duracion_real > 0 && (
            <div>
              <span className="text-sm text-slate-600">Duración Real:</span>
              <div className="font-bold">{maintenance.duracion_real.toFixed(2)} horas</div>
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
          {maintenance.tareas && maintenance.tareas.length > 0 ? (
            <div className="space-y-4">
              {maintenance.tareas.map((tarea, index) => (
                <div key={index} className="border border-slate-200 rounded p-3">
                  <div className="flex items-start gap-3 mb-2">
                    <Checkbox
                      checked={tarea.completada}
                      className="mt-0.5"
                      readOnly // Make checkboxes read-only for PDF view
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
                            readOnly // Make checkboxes read-only for PDF view
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
                value={maintenance.fecha_inicio ? format(new Date(maintenance.fecha_inicio), "yyyy-MM-dd'T'HH:mm") : ""}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha/Hora Finalización</Label>
              <Input
                type="datetime-local"
                value={maintenance.fecha_finalizacion ? format(new Date(maintenance.fecha_finalizacion), "yyyy-MM-dd'T'HH:mm") : ""}
                readOnly
              />
            </div>
          </div>
          {maintenance.duracion_real > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center mt-2">
              <span className="text-sm text-blue-900 font-semibold">
                Duración Total: {maintenance.duracion_real.toFixed(2)} horas
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-slate-300 p-4 text-center">
              <div className="font-semibold mb-2">Técnico Ejecutor:</div>
              <div className="text-sm text-slate-600 mb-2">{technician?.nombre || "No asignado"}</div>
              {maintenance.firma_tecnico ? (
                <img src={maintenance.firma_tecnico} alt="Firma Técnico" className="w-full h-auto max-h-24 object-contain mx-auto" />
              ) : (
                <div className="w-full h-24 border-b border-dashed border-slate-400 flex items-center justify-center text-slate-400 text-xs">
                  (Sin Firma)
                </div>
              )}
              <div className="text-xs text-slate-500 mt-2">
                Fecha: {maintenance.fecha_finalizacion ? format(new Date(maintenance.fecha_finalizacion), "dd/MM/yyyy", { locale: es }) : "_______________"}
              </div>
            </div>

            <div className="border border-slate-300 p-4 text-center">
              <div className="font-semibold mb-2">Supervisor:</div>
              <div className="text-sm text-slate-600 mb-2">{reviewer?.nombre || "No asignado"}</div>
              {maintenance.firma_revisado ? (
                <img src={maintenance.firma_revisado} alt="Firma Revisor" className="w-full h-auto max-h-24 object-contain mx-auto" />
              ) : (
                <div className="w-full h-24 border-b border-dashed border-slate-400 flex items-center justify-center text-slate-400 text-xs">
                  (Sin Firma)
                </div>
              )}
              <div className="text-xs text-slate-500 mt-2">
                Fecha: _______________
              </div>
            </div>

            <div className="border border-slate-300 p-4 text-center">
              <div className="font-semibold mb-2">Verificación Final:</div>
              <div className="text-sm text-slate-600 mb-2">{verifier?.nombre || "No asignado"}</div>
              {maintenance.firma_verificado ? (
                <img src={maintenance.firma_verificado} alt="Firma Verificador" className="w-full h-auto max-h-24 object-contain mx-auto" />
              ) : (
                <div className="w-full h-24 border-b border-dashed border-slate-400 flex items-center justify-center text-slate-400 text-xs">
                  (Sin Firma)
                </div>
              )}
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
          <div className="w-full min-h-[100px] border p-2 rounded bg-slate-50 text-sm text-slate-700">
            {maintenance.notas || "No hay observaciones."}
          </div>
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
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
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
    window.print();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between print:hidden">
            <DialogTitle>Orden de Trabajo - {machine?.nombre || 'Máquina'}</DialogTitle>
            <div className="flex gap-2">
              <Button onClick={handleDownloadPDF} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Descargar / Imprimir PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div id="maintenance-pdf-content">
          <MaintenanceWorkOrderPDF 
            maintenance={{ ...maintenance, ...workOrder }} // Pass current workOrder state for PDF content
            machine={machine}
            employees={employees}
          />
        </div>

        <div className="space-y-4 print:hidden p-8 pt-0"> {/* Adjusted padding to match PDF content */}
          {/* Registro de Tiempos - Interactive */}
          <div className="border-2 border-slate-300 mt-4"> {/* Added margin top for spacing */}
            <div className="bg-blue-900 text-white p-3">
              <h2 className="text-lg font-bold">REGISTRO DE TIEMPOS</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Firmas Digitales</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SignaturePad
                value={workOrder.firma_tecnico}
                onChange={(sig) => setWorkOrder({ ...workOrder, firma_tecnico: sig })}
                label={`Técnico Ejecutor (${technician?.nombre || "No asignado"})`}
              />
              <SignaturePad
                value={workOrder.firma_revisado}
                onChange={(sig) => setWorkOrder({ ...workOrder, firma_revisado: sig })}
                label={`Supervisor (${reviewer?.nombre || "No asignado"})`}
              />
              <SignaturePad
                value={workOrder.firma_verificado}
                onChange={(sig) => setWorkOrder({ ...workOrder, firma_verificado: sig })}
                label={`Verificador (${verifier?.nombre || "No asignado"})`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              value={workOrder.notas}
              onChange={(e) => setWorkOrder({ ...workOrder, notas: e.target.value })}
              rows={3}
              placeholder="Añadir observaciones..."
            />
          </div>

          <div className="space-y-2">
            <Label>Tareas</Label>
            {workOrder.tareas && workOrder.tareas.length > 0 ? (
              <div className="space-y-2">
                {workOrder.tareas.map((tarea, index) => (
                  <div key={index} className="border rounded p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={tarea.completada}
                        onCheckedChange={() => handleTaskToggle(index)}
                      />
                      <div className="flex-1">
                        <div className="font-semibold">{tarea.titulo}</div>
                        {tarea.subtareas && tarea.subtareas.length > 0 && (
                          <div className="ml-4 mt-2 space-y-1">
                            {tarea.subtareas.map((sub, subIdx) => (
                              <div key={subIdx} className="flex items-center gap-2">
                                <Checkbox
                                  checked={sub.completada}
                                  onCheckedChange={() => handleSubtaskToggle(index, subIdx)}
                                />
                                <span className="text-sm">{sub.titulo}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-4 border rounded">
                No hay tareas definidas para este mantenimiento.
              </div>
            )}
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
            Completar
          </Button>
        </div>

        <style>{`
          @media print {
            body {
              visibility: hidden;
            }
            #maintenance-pdf-content,
            #maintenance-pdf-content * {
              visibility: visible;
            }
            #maintenance-pdf-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0; /* Remove any default margins */
              padding: 0; /* Remove any default padding */
            }
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
            
            /* Ensure colors and backgrounds are printed */
            .bg-blue-900, .bg-green-100, .bg-red-100, .bg-amber-100, .bg-orange-100, .bg-blue-100, .bg-slate-50, .bg-blue-50 {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .border-4, .border-2, .border {
              border-width: 1px !important; /* Ensure borders are visible */
              border-style: solid !important;
              border-color: inherit !important; /* Use inherited color or set a default */
            }
            /* Specific border colors for PDF */
            #maintenance-pdf-content .border-blue-900 { border-color: #1e3a8a !important; }
            #maintenance-pdf-content .border-blue-200 { border-color: #bfdbfe !important; }
            #maintenance-pdf-content .border-slate-300 { border-color: #cbd5e1 !important; }
            #maintenance-pdf-content .border-slate-200 { border-color: #e2e8f0 !important; }
            #maintenance-pdf-content .border-dashed { border-style: dashed !important; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}