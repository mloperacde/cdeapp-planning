import React, { useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, UserPlus, XCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function LockerAssignmentDialog({ 
  locker, 
  vestuario, 
  employees, 
  lockerAssignments,
  onClose 
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const availableEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Filtrar por búsqueda
      const matchesSearch = !searchTerm || 
        emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      // Verificar si ya tiene taquilla asignada
      const existingAssignment = lockerAssignments.find(la => 
        la.employee_id === emp.id && 
        la.numero_taquilla_actual &&
        la.requiere_taquilla !== false
      );
      
      return !existingAssignment;
    });
  }, [employees, lockerAssignments, searchTerm]);

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployeeId) {
        throw new Error("Selecciona un empleado");
      }

      // Verificar duplicados
      const duplicado = lockerAssignments.find(la => 
        la.vestuario === vestuario &&
        la.numero_taquilla_actual === locker.numero.toString() &&
        la.employee_id !== selectedEmployeeId &&
        la.requiere_taquilla !== false
      );

      if (duplicado) {
        const empDuplicado = employees.find(e => e.id === duplicado.employee_id);
        throw new Error(`La taquilla ${locker.numero} en ${vestuario} ya está asignada a ${empDuplicado?.nombre || 'otro empleado'}`);
      }

      const existing = lockerAssignments.find(la => la.employee_id === selectedEmployeeId);
      const now = new Date().toISOString();

      const dataToSave = {
        employee_id: selectedEmployeeId,
        requiere_taquilla: true,
        vestuario: vestuario,
        numero_taquilla_actual: locker.numero.toString(),
        numero_taquilla_nuevo: "",
        fecha_asignacion: now,
        notificacion_enviada: false
      };

      if (existing) {
        const historial = existing.historial_cambios || [];
        historial.push({
          fecha: now,
          vestuario_anterior: existing.vestuario,
          taquilla_anterior: existing.numero_taquilla_actual,
          vestuario_nuevo: vestuario,
          taquilla_nueva: locker.numero.toString(),
          motivo: "Asignación desde mapa interactivo"
        });
        dataToSave.historial_cambios = historial;
        
        return base44.entities.LockerAssignment.update(existing.id, dataToSave);
      }
      
      return base44.entities.LockerAssignment.create(dataToSave);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
      const emp = employees.find(e => e.id === selectedEmployeeId);
      toast.success(`Taquilla ${locker.numero} asignada a ${emp?.nombre}`);
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const unassignMutation = useMutation({
    mutationFn: async () => {
      if (!locker.assignment) return;

      await base44.entities.LockerAssignment.update(locker.assignment.id, {
        numero_taquilla_actual: "",
        numero_taquilla_nuevo: "",
        notificacion_enviada: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
      toast.success("Taquilla liberada");
      onClose();
    },
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Taquilla #{locker.numero} - {vestuario}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {locker.ocupada ? (
            <>
              <div className="text-center p-6 bg-green-50 rounded-lg border-2 border-green-200">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <User className="w-8 h-8 text-green-600" />
                </div>
                <Badge className="bg-green-600 text-white mb-3 text-base px-4 py-1">
                  Taquilla Ocupada
                </Badge>
                <div className="space-y-2 bg-white rounded-lg p-4 mt-4">
                  <p className="font-bold text-xl text-slate-900">
                    {locker.employee?.nombre}
                  </p>
                  {locker.employee?.departamento && (
                    <p className="text-sm text-slate-600">{locker.employee.departamento}</p>
                  )}
                  {locker.employee?.puesto && (
                    <p className="text-sm text-slate-600">{locker.employee.puesto}</p>
                  )}
                  {locker.employee?.codigo_empleado && (
                    <p className="text-xs text-slate-500 font-mono mt-2">
                      Código: {locker.employee.codigo_empleado}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between gap-3">
                <Button 
                  onClick={onClose} 
                  variant="outline"
                  className="flex-1"
                >
                  Cerrar
                </Button>
                <Button
                  onClick={() => unassignMutation.mutate()}
                  disabled={unassignMutation.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {unassignMutation.isPending ? "Liberando..." : "Liberar Taquilla"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                  <XCircle className="w-8 h-8 text-blue-600" />
                </div>
                <Badge className="bg-blue-600 text-white mb-3 text-base px-4 py-1">
                  Taquilla Disponible
                </Badge>
                <p className="text-slate-600 text-sm">
                  Selecciona un empleado para asignar esta taquilla
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Buscar Empleado</Label>
                  <Input
                    placeholder="Buscar por nombre o código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Seleccionar Empleado *</Label>
                  <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un empleado sin taquilla" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEmployees.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500">
                          No hay empleados disponibles
                        </div>
                      ) : (
                        availableEmployees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{emp.nombre}</span>
                              <span className="text-xs text-slate-500">
                                {emp.departamento}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  
                  {availableEmployees.length === 0 && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Todos los empleados ya tienen taquilla asignada
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between gap-3">
                <Button 
                  onClick={onClose} 
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => assignMutation.mutate()}
                  disabled={!selectedEmployeeId || assignMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {assignMutation.isPending ? "Asignando..." : "Asignar Taquilla"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}