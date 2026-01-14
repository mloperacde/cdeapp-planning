import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KeyRound, Save, AlertCircle, CheckCircle2, History } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function LockerAssignmentPanel({ employee }) {
  const [vestuario, setVestuario] = useState("");
  const [numeroTaquilla, setNumeroTaquilla] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const queryClient = useQueryClient();

  const { data: lockerAssignments } = useQuery({
    queryKey: ['lockerAssignments'],
    queryFn: () => base44.entities.LockerAssignment.list(),
    initialData: [],
  });

  const { data: lockerRoomConfigs } = useQuery({
    queryKey: ['lockerRoomConfigs'],
    queryFn: () => base44.entities.LockerRoomConfig.list(),
    initialData: [],
  });

  const assignment = lockerAssignments.find(la => la.employee_id === employee.id);

  useEffect(() => {
    if (assignment) {
      setVestuario(assignment.vestuario || "");
      setNumeroTaquilla((assignment.numero_taquilla_actual || "").replace(/['"]/g, '').trim());
    }
  }, [assignment]);

  const updateLockerMutation = useMutation({
    mutationFn: async ({ vestuario, numeroTaquilla }) => {
      const numeroLimpio = numeroTaquilla.replace(/['"]/g, '').trim();
      
      // Validar duplicados
      const duplicado = lockerAssignments.find(la => 
        la.vestuario === vestuario &&
        la.numero_taquilla_actual?.replace(/['"]/g, '').trim() === numeroLimpio &&
        la.employee_id !== employee.id &&
        la.requiere_taquilla !== false
      );

      if (duplicado) {
        throw new Error(`La taquilla ${numeroLimpio} en ${vestuario} ya está asignada a otro empleado`);
      }

      // Validar identificador válido
      const config = lockerRoomConfigs.find(c => c.vestuario === vestuario);
      const identificadoresValidos = config?.identificadores_taquillas || [];
      
      if (identificadoresValidos.length > 0 && numeroLimpio && !identificadoresValidos.includes(numeroLimpio)) {
        throw new Error(`El identificador "${numeroLimpio}" no existe en ${vestuario}`);
      }

      const now = new Date().toISOString();
      const hasChange = assignment && assignment.numero_taquilla_actual?.replace(/['"]/g, '').trim() !== numeroLimpio;

      const dataToSave = {
        employee_id: employee.id,
        requiere_taquilla: true,
        vestuario: vestuario,
        numero_taquilla_actual: numeroLimpio,
        numero_taquilla_nuevo: "",
        fecha_asignacion: now,
        notificacion_enviada: false
      };

      if (hasChange && assignment) {
        const historial = assignment.historial_cambios || [];
        historial.push({
          fecha: now,
          vestuario_anterior: assignment.vestuario,
          taquilla_anterior: assignment.numero_taquilla_actual,
          vestuario_nuevo: vestuario,
          taquilla_nueva: numeroLimpio,
          motivo: "Actualización desde ficha de empleado"
        });
        dataToSave.historial_cambios = historial;
      }

      // Actualizar LockerAssignment
      if (assignment) {
        await base44.entities.LockerAssignment.update(assignment.id, dataToSave);
      } else {
        await base44.entities.LockerAssignment.create(dataToSave);
      }

      // Actualizar campos en EmployeeMasterDatabase
      await base44.entities.EmployeeMasterDatabase.update(employee.id, {
        taquilla_vestuario: vestuario,
        taquilla_numero: numeroLimpio
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employeesMaster'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      toast.success("✅ Taquilla actualizada correctamente");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleSave = () => {
    if (!vestuario) {
      toast.error("Selecciona un vestuario");
      return;
    }

    updateLockerMutation.mutate({ vestuario, numeroTaquilla });
  };

  const tieneTaquilla = assignment && 
    assignment.numero_taquilla_actual && 
    assignment.numero_taquilla_actual.replace(/['"]/g, '').trim() !== "";

  const config = lockerRoomConfigs.find(c => c.vestuario === vestuario);
  const identificadoresValidos = config?.identificadores_taquillas || [];
  const idNoValido = numeroTaquilla && 
                     identificadoresValidos.length > 0 &&
                     !identificadoresValidos.includes(numeroTaquilla);

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-slate-50">
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-blue-600" />
          Asignación de Taquilla
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {tieneTaquilla ? (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-900 mb-1">
                  ✓ Taquilla Asignada
                </p>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600 text-white">
                    {assignment.vestuario}
                  </Badge>
                  <Badge className="bg-blue-600 text-white font-mono text-base">
                    Taquilla: {assignment.numero_taquilla_actual?.replace(/['"]/g, '').trim()}
                  </Badge>
                </div>
              </div>
              {assignment?.historial_cambios && assignment.historial_cambios.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowHistory(true)}
                >
                  <History className="w-4 h-4 mr-1" />
                  Historial
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <p className="text-sm font-semibold text-amber-900">
                Sin taquilla asignada
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Vestuario *</Label>
            <Select value={vestuario} onValueChange={setVestuario}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar vestuario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Vestuario Femenino Planta Baja">
                  Vestuario Femenino Planta Baja
                </SelectItem>
                <SelectItem value="Vestuario Femenino Planta Alta">
                  Vestuario Femenino Planta Alta
                </SelectItem>
                <SelectItem value="Vestuario Masculino Planta Baja">
                  Vestuario Masculino Planta Baja
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Número/ID de Taquilla *</Label>
            <div className="flex items-center gap-2">
              <Input
                value={numeroTaquilla}
                onChange={(e) => setNumeroTaquilla(e.target.value.replace(/['"]/g, '').trim())}
                placeholder="Ej: 15, A2, 101..."
                className={`font-mono ${idNoValido ? 'border-red-500 bg-red-50' : ''}`}
              />
              {idNoValido && (
                <Badge className="bg-red-600 text-white text-xs">
                  ID no válido
                </Badge>
              )}
            </div>
            {vestuario && identificadoresValidos.length > 0 && (
              <p className="text-xs text-slate-600">
                IDs disponibles en {vestuario}: {identificadoresValidos.slice(0, 10).join(", ")}
                {identificadoresValidos.length > 10 && `, ... (+${identificadoresValidos.length - 10} más)`}
              </p>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={updateLockerMutation.isPending || !vestuario || !numeroTaquilla}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateLockerMutation.isPending ? "Guardando..." : "Guardar Asignación"}
          </Button>
        </div>
      </CardContent>

      {showHistory && assignment?.historial_cambios && (
        <Dialog open={true} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Historial de Taquillas - {employee.nombre}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {assignment.historial_cambios.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  No hay historial de cambios
                </p>
              ) : (
                assignment.historial_cambios.slice().reverse().map((cambio, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-slate-50">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline">
                        {format(new Date(cambio.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                      </Badge>
                      {cambio.motivo && (
                        <Badge className="bg-blue-100 text-blue-800">
                          {cambio.motivo}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600 font-medium">Anterior:</p>
                        <p className="text-slate-900">{cambio.vestuario_anterior || "-"}</p>
                        <p className="text-slate-900 font-mono">
                          Taquilla: {cambio.taquilla_anterior || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 font-medium">Nuevo:</p>
                        <p className="text-slate-900">{cambio.vestuario_nuevo || "-"}</p>
                        <p className="text-slate-900 font-mono">
                          Taquilla: {cambio.taquilla_nueva || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}