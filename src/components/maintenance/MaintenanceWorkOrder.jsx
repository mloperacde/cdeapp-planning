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
import { Plus, X, Printer, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

function SignaturePad({ onSave, existingSignature }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
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
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
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
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineTo(
      e.clientX - rect.left,
      e.clientY - rect.top
    );
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      if (canvas) {
        onSave(canvas.toDataURL());
      }
    }
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
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

export default function MaintenanceWorkOrder({ maintenance, machines, employees, maintenanceTypes, onClose }) {
  const [fechaInicio, setFechaInicio] = useState(maintenance.fecha_inicio || "");
  const [fechaFin, setFechaFin] = useState(maintenance.fecha_finalizacion || "");
  const [tareas, setTareas] = useState([]);
  const [nuevaTarea, setNuevaTarea] = useState({ titulo: "", descripcion: "", subtareas: [] });
  const [nuevaSubtarea, setNuevaSubtarea] = useState("");
  const [firmaTecnico, setFirmaTecnico] = useState(maintenance.firma_tecnico || "");
  const [firmaRevisado, setFirmaRevisado] = useState(maintenance.firma_revisado || "");
  const [firmaVerificado, setFirmaVerificado] = useState(maintenance.firma_verificado || "");
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
    },
  });

  const completeMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceSchedule.update(maintenance.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      onClose();
      toast.success("Mantenimiento completado");
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
      ? (new Date(fechaFin) - new Date(fechaInicio)) / (1000 * 60 * 60) 
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
      ? (new Date(fechaFin) - new Date(fechaInicio)) / (1000 * 60 * 60) 
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

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    toast.info("Generando PDF...");
    window.print();
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

  const tareasCompletadas = tareas.filter(t => t.completada).length;
  const progresoTareas = tareas.length > 0 ? (tareasCompletadas / tareas.length) * 100 : 0;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto print:max-w-full">
        <DialogHeader className="print:hidden">
          <DialogTitle>Orden de Trabajo de Mantenimiento</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 print:p-8">
          <div className="hidden print:block text-center mb-8">
            <h1 className="text-2xl font-bold">ORDEN DE TRABAJO DE MANTENIMIENTO</h1>
            <p className="text-sm text-slate-600 mt-2">OT-{maintenance.id?.substring(0, 8).toUpperCase()}</p>
          </div>

          <Card>
            <CardHeader>
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
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Lista de Tareas ({tareasCompletadas}/{tareas.length} completadas)</span>
                <span className="text-sm font-normal">{progresoTareas.toFixed(0)}%</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="print:hidden space-y-3 border-2 border-dashed border-blue-200 rounded-lg p-4 bg-blue-50">
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
                    + Subtarea
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
                            className="print:hidden text-red-600 hover:bg-red-50"
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

          <Card className="print:break-before-auto">
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
                    className="print:border-0 print:p-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_fin">Fecha y Hora de Finalización</Label>
                  <Input
                    id="fecha_fin"
                    type="datetime-local"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="print:border-0 print:p-0"
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

          <Card className="print:break-before-page">
            <CardHeader>
              <CardTitle className="text-lg">Firmas y Validación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Firma Técnico Asignado: {getEmployeeName(maintenance.tecnico_asignado)}</Label>
                <SignaturePad 
                  onSave={setFirmaTecnico}
                  existingSignature={firmaTecnico}
                />
              </div>

              <div className="space-y-2">
                <Label>Firma Supervisado Por: {getEmployeeName(maintenance.revisado_por)}</Label>
                <SignaturePad 
                  onSave={setFirmaRevisado}
                  existingSignature={firmaRevisado}
                />
              </div>

              <div className="space-y-2">
                <Label>Firma Verificado Por: {getEmployeeName(maintenance.verificado_por)}</Label>
                <SignaturePad 
                  onSave={setFirmaVerificado}
                  existingSignature={firmaVerificado}
                />
              </div>
            </CardContent>
          </Card>

          <div className="hidden print:block text-center text-xs text-slate-500 mt-8 pt-4 border-t">
            <p>Documento generado el {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</p>
            <p>Este documento es válido con las firmas digitales correspondientes</p>
          </div>

          <div className="flex justify-end gap-3 print:hidden">
            <Button type="button" variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button type="button" variant="outline" onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
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
      </DialogContent>
    </Dialog>
  );
}