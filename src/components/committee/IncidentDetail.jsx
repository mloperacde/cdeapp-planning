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
      "Leve": { className: "bg-green-100 text-green-800" },
      "Grave": { className: "bg-amber-100 text-amber-800" },
      "Muy Grave": { className: "bg-red-100 text-red-800" },
      "Mortal": { className: "bg-red-600 text-white" }
    }[gravedad] || { className: "bg-slate-100 text-slate-800" };

    return <Badge className={config.className}>{gravedad}</Badge>;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Detalle del Incidente - {incident.codigo_incidente}
            {getGravedadBadge(incident.gravedad)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información Básica */}
          <Card className="bg-slate-50">
            <CardContent className="p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-slate-700">Tipo:</span>
                  <Badge className={
                    incident.tipo === "Accidente" ? "bg-red-600 ml-2" :
                    incident.tipo === "Incidente" ? "bg-amber-600 ml-2" :
                    "bg-yellow-600 ml-2"
                  }>
                    {incident.tipo}
                  </Badge>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Empleado:</span>
                  <span className="ml-2">{getEmployeeName(incident.employee_id)}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Fecha:</span>
                  <span className="ml-2">{format(new Date(incident.fecha_hora), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Lugar:</span>
                  <span className="ml-2">{incident.lugar}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Departamento:</span>
                  <span className="ml-2">{incident.departamento}</span>
                </div>
                {incident.dias_baja > 0 && (
                  <div>
                    <span className="font-semibold text-red-700">Días de baja:</span>
                    <span className="ml-2 font-bold text-red-600">{incident.dias_baja}</span>
                  </div>
                )}
              </div>
              
              <div className="pt-3 border-t">
                <p className="font-semibold text-slate-700 mb-1">Descripción:</p>
                <p className="text-sm text-slate-600">{incident.descripcion}</p>
              </div>
            </CardContent>
          </Card>

          {/* Estado de Investigación */}
          <div className="space-y-2">
            <Label>Estado de la Investigación</Label>
            <Select
              value={incident.estado_investigacion}
              onValueChange={handleUpdateEstadoInvestigacion}
            >
              <SelectTrigger>
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
              <h3 className="font-bold text-slate-900">Medidas Correctoras</h3>
              <Badge variant="outline">
                {medidas.filter(m => m.estado === "Completada").length}/{medidas.length} completadas
              </Badge>
            </div>

            {/* Formulario para Nueva Medida */}
            <Card className="bg-blue-50 border-2 border-blue-200">
              <CardContent className="p-4 space-y-3">
                <Label className="font-semibold text-blue-900">Añadir Nueva Medida Correctora</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Descripción de la Medida *</Label>
                    <Textarea
                      value={nuevaMedida.medida}
                      onChange={(e) => setNuevaMedida({ ...nuevaMedida, medida: e.target.value })}
                      placeholder="Describe la acción correctora..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Responsable *</Label>
                      <Select
                        value={nuevaMedida.responsable_id}
                        onValueChange={(value) => setNuevaMedida({ ...nuevaMedida, responsable_id: value })}
                      >
                        <SelectTrigger>
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
                      <Label className="text-xs">Plazo *</Label>
                      <Input
                        type="date"
                        value={nuevaMedida.plazo}
                        onChange={(e) => setNuevaMedida({ ...nuevaMedida, plazo: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleAddMedida}
                  className="w-full bg-blue-600 hover:bg-blue-700"
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
                <Card>
                  <CardContent className="p-8 text-center text-slate-500">
                    No hay medidas correctoras asignadas
                  </CardContent>
                </Card>
              ) : (
                medidas.map((medida, index) => (
                  <Card key={index} className={
                    medida.estado === "Completada" ? "bg-green-50 border-green-200" :
                    medida.estado === "En Proceso" ? "bg-blue-50 border-blue-200" :
                    "bg-slate-50"
                  }>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{medida.medida}</p>
                          <div className="flex items-center gap-3 mt-2 text-sm">
                            <span className="text-slate-600">
                              👤 {getEmployeeName(medida.responsable_id)}
                            </span>
                            <span className="text-slate-600">
                              📅 {format(new Date(medida.plazo), "dd/MM/yyyy", { locale: es })}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMedida(index)}
                          className="text-red-600 hover:bg-red-50"
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
                        >
                          Pendiente
                        </Button>
                        <Button
                          size="sm"
                          variant={medida.estado === "En Proceso" ? "default" : "outline"}
                          onClick={() => handleUpdateMedidaEstado(index, "En Proceso")}
                          disabled={updateMutation.isPending}
                          className={medida.estado === "En Proceso" ? "bg-blue-600" : ""}
                        >
                          En Proceso
                        </Button>
                        <Button
                          size="sm"
                          variant={medida.estado === "Completada" ? "default" : "outline"}
                          onClick={() => handleUpdateMedidaEstado(index, "Completada")}
                          disabled={updateMutation.isPending}
                          className={medida.estado === "Completada" ? "bg-green-600" : ""}
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

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}