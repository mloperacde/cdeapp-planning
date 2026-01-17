import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function IncidentDetail({ incident, employees, onClose }) {
  const [medidas, setMedidas] = useState(incident.medidas_correctoras || []);
  const [nuevaMedida, setNuevaMedida] = useState({
    medida: "",
    responsable_id: "",
    plazo: "",
    estado: "Pendiente"
  });

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkIncident.update(incident.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workIncidents'] });
      toast.success("Incidente actualizado");
    },
  });

  const handleAddMedida = () => {
    if (!nuevaMedida.medida || !nuevaMedida.responsable_id || !nuevaMedida.plazo) {
      toast.error("Completa todos los campos de la medida");
      return;
    }

    const updatedMedidas = [...medidas, { ...nuevaMedida }];
    setMedidas(updatedMedidas);
    
    updateMutation.mutate({
      medidas_correctoras: updatedMedidas
    });

    setNuevaMedida({
      medida: "",
      responsable_id: "",
      plazo: "",
      estado: "Pendiente"
    });
  };

  const handleRemoveMedida = (index) => {
    const updatedMedidas = medidas.filter((_, i) => i !== index);
    setMedidas(updatedMedidas);
    
    updateMutation.mutate({
      medidas_correctoras: updatedMedidas
    });
  };

  const handleUpdateMedidaEstado = (index, nuevoEstado) => {
    const updatedMedidas = [...medidas];
    updatedMedidas[index].estado = nuevoEstado;
    setMedidas(updatedMedidas);
    
    updateMutation.mutate({
      medidas_correctoras: updatedMedidas
    });
  };

  const handleUpdateEstadoInvestigacion = (nuevoEstado) => {
    updateMutation.mutate({
      estado_investigacion: nuevoEstado
    });
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.nombre || "Desconocido";
  };

  const getGravedadBadge = (gravedad) => {
    const config = {
      "Leve": { className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
      "Grave": { className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
      "Muy Grave": { className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
      "Mortal": { className: "bg-red-600 text-white dark:bg-red-700" }
    }[gravedad] || { className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300" };

    return <Badge className={config.className}>{gravedad}</Badge>;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 dark:text-slate-100">
            Detalle del Incidente - {incident.codigo_incidente}
            {getGravedadBadge(incident.gravedad)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información Básica */}
          <Card className="bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700">
            <CardContent className="p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Tipo:</span>
                  <Badge className={
                    incident.tipo === "Accidente" ? "bg-red-600 ml-2 dark:bg-red-700" :
                    incident.tipo === "Incidente" ? "bg-amber-600 ml-2 dark:bg-amber-700" :
                    "bg-yellow-600 ml-2 dark:bg-yellow-700"
                  }>
                    {incident.tipo}
                  </Badge>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Empleado:</span>
                  <span className="ml-2 dark:text-slate-200">{getEmployeeName(incident.employee_id)}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Fecha:</span>
                  <span className="ml-2 dark:text-slate-200">{format(new Date(incident.fecha_hora), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Lugar:</span>
                  <span className="ml-2 dark:text-slate-200">{incident.lugar}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Departamento:</span>
                  <span className="ml-2 dark:text-slate-200">{incident.departamento}</span>
                </div>
                {incident.dias_baja > 0 && (
                  <div>
                    <span className="font-semibold text-red-700 dark:text-red-400">Días de baja:</span>
                    <span className="ml-2 font-bold text-red-600 dark:text-red-400">{incident.dias_baja}</span>
                  </div>
                )}
              </div>
              
              <div className="pt-3 border-t dark:border-slate-700">
                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Descripción:</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{incident.descripcion}</p>
              </div>
            </CardContent>
          </Card>

          {/* Estado de Investigación */}
          <div className="space-y-2">
            <Label className="dark:text-slate-200">Estado de la Investigación</Label>
            <Select
              value={incident.estado_investigacion}
              onValueChange={handleUpdateEstadoInvestigacion}
            >
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="En Curso">En Curso</SelectItem>
                <SelectItem value="Completada">Completada</SelectItem>
                <SelectItem value="Cerrada">Cerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Medidas Correctoras */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Medidas Correctoras</h3>
              <Badge variant="outline" className="dark:border-slate-600 dark:text-slate-300">
                {medidas.filter(m => m.estado === "Completada").length}/{medidas.length} completadas
              </Badge>
            </div>

            {/* Formulario para Nueva Medida */}
            <Card className="bg-blue-50 border-2 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
              <CardContent className="p-4 space-y-3">
                <Label className="font-semibold text-blue-900 dark:text-blue-100">Añadir Nueva Medida Correctora</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs dark:text-slate-300">Descripción de la Medida *</Label>
                    <Textarea
                      value={nuevaMedida.medida}
                      onChange={(e) => setNuevaMedida({ ...nuevaMedida, medida: e.target.value })}
                      placeholder="Describe la acción correctora..."
                      rows={2}
                      className="dark:bg-slate-900 dark:border-slate-700"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs dark:text-slate-300">Responsable *</Label>
                      <Select
                        value={nuevaMedida.responsable_id}
                        onValueChange={(value) => setNuevaMedida({ ...nuevaMedida, responsable_id: value })}
                      >
                        <SelectTrigger className="dark:bg-slate-900 dark:border-slate-700">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs dark:text-slate-300">Plazo *</Label>
                      <Input
                        type="date"
                        value={nuevaMedida.plazo}
                        onChange={(e) => setNuevaMedida({ ...nuevaMedida, plazo: e.target.value })}
                        className="dark:bg-slate-900 dark:border-slate-700"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleAddMedida}
                  className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                  disabled={updateMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir Medida
                </Button>
              </CardContent>
            </Card>

            {/* Lista de Medidas */}
            <div className="space-y-3">
              {medidas.length === 0 ? (
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                  <CardContent className="p-8 text-center text-slate-500 dark:text-slate-400">
                    No hay medidas correctoras asignadas
                  </CardContent>
                </Card>
              ) : (
                medidas.map((medida, index) => (
                  <Card key={index} className={
                    medida.estado === "Completada" ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" :
                    medida.estado === "En Proceso" ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800" :
                    "bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                  }>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{medida.medida}</p>
                          <div className="flex items-center gap-3 mt-2 text-sm">
                            <span className="text-slate-600 dark:text-slate-400">
                              👤 {getEmployeeName(medida.responsable_id)}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400">
                              📅 {format(new Date(medida.plazo), "dd/MM/yyyy", { locale: es })}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMedida(index)}
                          className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={medida.estado === "Pendiente" ? "default" : "outline"}
                          onClick={() => handleUpdateMedidaEstado(index, "Pendiente")}
                          disabled={updateMutation.isPending}
                          className={medida.estado === "Pendiente" ? "dark:bg-slate-700 dark:text-white" : "dark:border-slate-600 dark:text-slate-300"}
                        >
                          Pendiente
                        </Button>
                        <Button
                          size="sm"
                          variant={medida.estado === "En Proceso" ? "default" : "outline"}
                          onClick={() => handleUpdateMedidaEstado(index, "En Proceso")}
                          disabled={updateMutation.isPending}
                          className={medida.estado === "En Proceso" ? "bg-blue-600 dark:bg-blue-700" : "dark:border-slate-600 dark:text-slate-300"}
                        >
                          En Proceso
                        </Button>
                        <Button
                          size="sm"
                          variant={medida.estado === "Completada" ? "default" : "outline"}
                          onClick={() => handleUpdateMedidaEstado(index, "Completada")}
                          disabled={updateMutation.isPending}
                          className={medida.estado === "Completada" ? "bg-green-600 dark:bg-green-700" : "dark:border-slate-600 dark:text-slate-300"}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Completada
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-700">
            <Button type="button" variant="outline" onClick={onClose} className="dark:border-slate-700 dark:text-slate-300">
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}