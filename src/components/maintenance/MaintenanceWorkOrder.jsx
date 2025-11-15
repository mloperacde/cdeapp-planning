
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, FileText } from "lucide-react"; // Changed Download to FileText
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import MaintenanceWorkOrderPDF from "./MaintenanceWorkOrderPDF";

const SignaturePad = ({ value, onChange, label }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set drawing styles
    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear canvas before drawing or if signature is removed
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (value) {
      const img = new Image();
      img.onload = () => {
        // Draw image if value exists
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = value;
    }
  }, [value]); // Depend on value to re-render if it changes

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // Calculate scaling factors because the canvas element might be stretched by CSS
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches && e.touches.length > 0) { // Touch event
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    } else { // Mouse event
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (e) => {
    e.preventDefault(); // Prevent scrolling on touch devices
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCoordinates(e);
    setIsDrawing(true);
    setLastPos(pos);
    ctx.beginPath(); // Start a new path
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault(); // Prevent scrolling on touch devices

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCoordinates(e);

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    setLastPos(pos); // Update last position for the next segment
  };

  const stopDrawing = () => {
    if (!isDrawing) {
      return;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL());
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(''); // Clear the saved signature data
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="border-2 border-slate-300 rounded-lg bg-white p-2">
        <canvas
          ref={canvasRef}
          width={600} // Internal resolution of the canvas
          height={150}
          className="w-full touch-none cursor-crosshair bg-white rounded"
          style={{ maxHeight: '150px' }} // CSS max height for responsive sizing
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing} // Stop drawing if mouse leaves canvas
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing} // Handles cases like incoming calls on mobile
        />
        <Button type="button" variant="outline" size="sm" onClick={clearSignature} className="mt-2 w-full">
          Limpiar Firma
        </Button>
      </div>
    </div>
  );
};

export default function MaintenanceWorkOrder({ maintenance, machines, employees, maintenanceTypes, onClose, onUpdate }) {
  const [fechaInicio, setFechaInicio] = useState(maintenance.fecha_inicio || "");
  const [fechaFin, setFechaFin] = useState(maintenance.fecha_finalizacion || "");
  const [tareas, setTareas] = useState([]);
  const [nuevaTarea, setNuevaTarea] = useState({ titulo: "", descripcion: "", subtareas: [] });
  const [nuevaSubtarea, setNuevaSubtarea] = useState("");
  const [firmaTecnico, setFirmaTecnico] = useState(maintenance.firma_tecnico || "");
  const [firmaRevisado, setFirmaRevisado] = useState(maintenance.firma_revisado || "");
  const [firmaVerificado, setFirmaVerificado] = useState(maintenance.firma_verificado || "");
  // Removed showPDFView state
  const queryClient = useQueryClient();

  useEffect(() => {
    if (maintenance.tareas && maintenance.tareas.length > 0) {
      setTareas(maintenance.tareas);
    } else if (maintenance.maintenance_type_id && maintenanceTypes) {
      const selectedType = maintenanceTypes.find(mt => mt.id === maintenance.maintenance_type_id);
      if (selectedType) {
        const importedTareas = [];

        for (let i = 1; i <= 6; i++) {
          const tarea = selectedType[`tarea_${i}`];
          if (tarea && tarea.nombre) {
            const subtareas = [];

            for (let j = 1; j <= 8; j++) {
              const subtarea = tarea[`subtarea_${j}`];
              if (subtarea) {
                subtareas.push({
                  titulo: subtarea,
                  completada: false
                });
              }
            }

            importedTareas.push({
              titulo: tarea.nombre,
              descripcion: "",
              completada: false,
              subtareas: subtareas
            });
          }
        }

        setTareas(importedTareas);
      }
    }
  }, [maintenance, maintenanceTypes]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceSchedule.update(maintenance.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      toast.success("Orden de trabajo actualizada");
      onUpdate && onUpdate(); // Notify parent of update
    },
    onError: (error) => {
      toast.error("Error al actualizar la orden de trabajo.", {
        description: error.message || "Por favor, inténtelo de nuevo.",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceSchedule.update(maintenance.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      onClose();
      toast.success("Mantenimiento completado");
      onUpdate && onUpdate(); // Notify parent of update
    },
    onError: (error) => {
      toast.error("Error al completar el mantenimiento.", {
        description: error.message || "Por favor, inténtelo de nuevo.",
      });
    },
  });

  const handleAddTarea = () => {
    if (!nuevaTarea.titulo) return;
    setTareas([...tareas, { ...nuevaTarea, completada: false }]);
    setNuevaTarea({ titulo: "", descripcion: "", subtareas: [] });
  };

  const handleAddSubtarea = () => {
    if (!nuevaSubtarea) return;
    setNuevaTarea({
      ...nuevaTarea,
      subtareas: [...nuevaTarea.subtareas, { titulo: nuevaSubtarea, completada: false }]
    });
    setNuevaSubtarea("");
  };

  const handleToggleTarea = (index) => {
    const newTareas = [...tareas];
    newTareas[index].completada = !newTareas[index].completada;
    setTareas(newTareas);
  };

  const handleToggleSubtarea = (tareaIndex, subtareaIndex) => {
    const newTareas = [...tareas];
    newTareas[tareaIndex].subtareas[subtareaIndex].completada = !newTareas[tareaIndex].subtareas[subtareaIndex].completada;
    setTareas(newTareas);
  };

  const handleRemoveTarea = (index) => {
    setTareas(tareas.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const duracionReal = fechaInicio && fechaFin
      ? (new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60)
      : 0;

    updateMutation.mutate({
      fecha_inicio: fechaInicio,
      fecha_finalizacion: fechaFin,
      duracion_real: duracionReal,
      tareas: tareas,
      firma_tecnico: firmaTecnico,
      firma_revisado: firmaRevisado,
      firma_verificado: firmaVerificado,
    });
  };

  const handleComplete = () => {
    const duracionReal = fechaInicio && fechaFin
      ? (new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60)
      : 0;

    completeMutation.mutate({
      estado: "Completado",
      fecha_inicio: fechaInicio,
      fecha_finalizacion: fechaFin,
      duracion_real: duracionReal,
      tareas: tareas,
      firma_tecnico: firmaTecnico,
      firma_revisado: firmaRevisado,
      firma_verificado: firmaVerificado,
    });
  };

  const getMachineName = (machineId) => {
    const machine = machines.find(m => m.id === machineId);
    return machine?.nombre || "Máquina desconocida";
  };

  const getMachineCode = (machineId) => {
    const machine = machines.find(m => m.id === machineId);
    return machine?.codigo || "N/A";
  };

  const getEmployeeName = (employeeId) => {
    if (!employeeId) return "No asignado";
    const emp = employees.find(e => e.id === employeeId);
    return emp?.nombre || "No asignado";
  };

  const getEmployeeById = (employeeId) => {
    if (!employeeId) return null;
    return employees.find(e => e.id === employeeId) || null;
  };

  const tareasCompletadas = tareas.filter(t => t.completada).length;
  const progresoTareas = tareas.length > 0 ? (tareasCompletadas / tareas.length) * 100 : 0;

  // Create an object that represents the current state of maintenance data
  // to pass to the PDF component.
  const currentMaintenance = {
    ...maintenance,
    fecha_inicio: fechaInicio,
    fecha_finalizacion: fechaFin,
    duracion_real: fechaInicio && fechaFin
      ? (new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60)
      : 0,
    tareas: tareas,
    firma_tecnico: firmaTecnico,
    firma_revisado: firmaRevisado,
    firma_verificado: firmaVerificado,
  };

  // Data for PDF component
  const machine = machines.find(m => m.id === maintenance.machine_id);
  const selectedMaintenanceType = maintenanceTypes?.find(mt => mt.id === maintenance.maintenance_type_id);
  const technician = getEmployeeById(maintenance.tecnico_asignado);
  const reviewer = getEmployeeById(maintenance.revisado_por);
  const verifier = getEmployeeById(maintenance.verificado_por);

  const handleDownloadPDF = () => {
    // First, save any pending changes to ensure the PDF includes the latest data
    // This is optional, but ensures the PDF is up-to-date with current form inputs.
    // However, for a download/print action, we might just use the current state
    // and rely on a separate save action. For this implementation, we'll just generate
    // the PDF from the current state without an explicit save mutation call here,
    // to avoid potential race conditions or unnecessary server calls on PDF view.
    // If saving is critical before PDF generation, uncomment handleSave()
    // handleSave(); // This would trigger a mutation, which might be too slow or not desired.

    const printWindow = window.open('', '_blank');

    if (printWindow) {
      // Find the hidden PDF content element
      const pdfContentElement = document.getElementById('maintenance-pdf-content');

      if (pdfContentElement) {
        // Create a full HTML document for printing
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Orden de Trabajo - ${machine?.nombre || 'Máquina'}</title>
              <link href="${window.location.origin}/tailwind.css" rel="stylesheet">
              <style>
                /* Add specific print styles here if needed */
                body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; }
                @media print {
                  @page { margin: 1cm; size: A4; }
                  body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                  /* Ensure elements like images (signatures) are printed */
                  img { max-width: 100%; height: auto; page-break-inside: avoid; }
                  .no-print { display: none !important; }
                  /* Force display of hidden content if needed, though the hidden div approach might already handle it */
                  #maintenance-pdf-content { display: block !important; }
                }
              </style>
            </head>
            <body>
              <div id="print-container">
                ${pdfContentElement.innerHTML}
              </div>
            </body>
          </html>
        `);
        printWindow.document.close(); // Close the document to finish writing

        // Give the browser a moment to render the content before printing
        setTimeout(() => {
          printWindow.print();
          printWindow.onafterprint = () => {
            printWindow.close();
          };
        }, 250);
      } else {
        toast.error("Error al generar PDF: Contenido no encontrado.");
        printWindow.close();
      }
    } else {
      toast.error("Error al abrir ventana para PDF. Por favor, permita pop-ups.");
    }
  };


  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Orden de Trabajo - {machine?.nombre || 'Máquina'}</DialogTitle>
            <Button onClick={handleDownloadPDF} variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Descargar PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Información del Mantenimiento</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Máquina:</span> {getMachineName(maintenance.machine_id)}
              </div>
              <div>
                <span className="font-semibold">Código:</span> {getMachineCode(maintenance.machine_id)}
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
              <div>
                <span className="font-semibold">Estado:</span> {maintenance.estado}
              </div>
              {maintenance.descripcion && (
                <div className="col-span-2">
                  <span className="font-semibold">Descripción:</span> {maintenance.descripcion}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
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
                <span className="font-semibold">Supervisado Por:</span>{" "}
                {getEmployeeName(maintenance.revisado_por)}
              </div>
              <div>
                <span className="font-semibold">Verificado Por:</span>{" "}
                {getEmployeeName(maintenance.verificado_por)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Lista de Tareas ({tareasCompletadas}/{tareas.length} completadas)</span>
                <span className="text-sm font-normal">{progresoTareas.toFixed(0)}%</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 border-2 border-dashed border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="space-y-2">
                  <Label>Nueva Tarea</Label>
                  <Input
                    placeholder="Título de la tarea..."
                    value={nuevaTarea.titulo}
                    onChange={(e) => setNuevaTarea({ ...nuevaTarea, titulo: e.target.value })}
                  />
                  <Textarea
                    placeholder="Descripción (opcional)..."
                    value={nuevaTarea.descripcion}
                    onChange={(e) => setNuevaTarea({ ...nuevaTarea, descripcion: e.target.value })}
                    rows={2}
                  />
                </div>

                {nuevaTarea.subtareas.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs">Subtareas:</Label>
                    {nuevaTarea.subtareas.map((st, idx) => (
                      <div key={idx} className="text-xs bg-white p-2 rounded border">
                        • {st.titulo}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Añadir subtarea..."
                    value={nuevaSubtarea}
                    onChange={(e) => setNuevaSubtarea(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtarea();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddSubtarea}>
                    <Plus className="w-4 h-4 mr-1" /> Subtarea
                  </Button>
                </div>

                <Button type="button" onClick={handleAddTarea} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir Tarea
                </Button>
              </div>

              {tareas.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No hay tareas definidas</p>
              ) : (
                <div className="space-y-3">
                  {tareas.map((tarea, index) => (
                    <Card key={index} className={`${tarea.completada ? 'bg-green-50 border-green-200' : 'bg-slate-50'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={tarea.completada}
                            onCheckedChange={() => handleToggleTarea(index)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className={`font-semibold ${tarea.completada ? 'line-through text-slate-500' : ''}`}>
                              {index + 1}. {tarea.titulo}
                            </div>
                            {tarea.descripcion && (
                              <p className="text-sm text-slate-600 mt-1">{tarea.descripcion}</p>
                            )}

                            {tarea.subtareas && tarea.subtareas.length > 0 && (
                              <div className="mt-3 ml-4 space-y-2">
                                {tarea.subtareas.map((subtarea, subIndex) => (
                                  <div key={subIndex} className="flex items-center gap-2">
                                    <Checkbox
                                      checked={subtarea.completada}
                                      onCheckedChange={() => handleToggleSubtarea(index, subIndex)}
                                      className="h-3 w-3"
                                    />
                                    <span className={`text-sm ${subtarea.completada ? 'line-through text-slate-500' : ''}`}>
                                      {subtarea.titulo}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveTarea(index)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
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
                    Duración: {((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60)).toFixed(2)} horas
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Firmas y Validación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <SignaturePad
                value={firmaTecnico}
                onChange={setFirmaTecnico}
                label={`Firma Técnico Asignado: ${getEmployeeName(maintenance.tecnico_asignado)}`}
              />

              <SignaturePad
                value={firmaRevisado}
                onChange={setFirmaRevisado}
                label={`Firma Supervisado Por: ${getEmployeeName(maintenance.revisado_por)}`}
              />

              <SignaturePad
                value={firmaVerificado}
                onChange={setFirmaVerificado}
                label={`Firma Verificado Por: ${getEmployeeName(maintenance.verificado_por)}`}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              onClick={handleSave}
              variant="outline"
              className="bg-blue-50 hover:bg-blue-100"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
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

        {/* Hidden component to generate PDF content for download/print */}
        <div id="maintenance-pdf-content" className="hidden">
          <MaintenanceWorkOrderPDF
            maintenance={currentMaintenance}
            workOrder={currentMaintenance} // Use currentMaintenance as workOrder
            machine={machine}
            technician={technician}
            reviewer={reviewer}
            verifier={verifier}
            maintenanceType={selectedMaintenanceType}
            employees={employees} // Pass employees for utility functions if needed
            getEmployeeName={getEmployeeName}
            getMachineName={getMachineName}
            getMachineCode={getMachineCode}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
