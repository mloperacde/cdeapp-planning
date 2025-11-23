import React, { useState, useMemo, useEffect } from "react";
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
import EmployeeSelect from "../common/EmployeeSelect";

export default function LockerAssignmentDialog({ 
  locker, 
  vestuario, 
  employees = [], 
  employeesWithoutLocker = [], // Kept as per original props, but its internal use is removed/changed
  lockerAssignments = [], 
  onClose 
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(locker.draggedEmployeeId || "");
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const availableEmployees = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];
    
    return employees
      .filter(emp => {
        const hasAssignment = lockerAssignments.find(la => la.employee_id === emp.id);
        if (!hasAssignment) return true; // Employee has no assignment, thus is available

        // If an assignment exists, check if it's an "empty" one or if they don't require a locker
        const hasLocker = hasAssignment.numero_taquilla_actual && 
                         hasAssignment.numero_taquilla_actual.replace(/['"''‚„]/g, '').trim() !== "";
        const requiresLocker = hasAssignment.requiere_taquilla !== false; // requires_taquilla defaults to true if not specified as false
        
        return !hasLocker && requiresLocker; // Available if no current locker AND requires one
      })
      .filter(emp => {
        if (!searchTerm) return true;
        return emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               emp.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase());
      });
  }, [employees, lockerAssignments, searchTerm]);

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployeeId) {
        throw new Error("Selecciona un empleado");
      }

      const duplicado = lockerAssignments.find(la => 
        la.vestuario === vestuario &&
        la.numero_taquilla_actual?.replace(/['"''‚„]/g, '').trim() === locker.numero.toString() &&
        la.employee_id !== selectedEmployeeId &&
        la.requiere_taquilla !== false
      );

      if (duplicado) {
        const empDuplicado = employees.find(e => e.id === duplicado.employee_id);
        throw new Error(`La taquilla ${locker.numero} en ${vestuario} ya está asignada a ${empDuplicado?.nombre || 'otro empleado'}`);
      }

      const existing = lockerAssignments.find(la => la.employee_id === selectedEmployeeId);
      const now = new Date().toISOString();
      const numeroLimpio = locker.numero.toString().replace(/['"''‚„]/g, '').trim();

      const dataToSave = {
        employee_id: selectedEmployeeId,
        requiere_taquilla: true,
        vestuario: vestuario,
        numero_taquilla_actual: numeroLimpio,
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
          taquilla_nueva: numeroLimpio,
          motivo: "Asignación desde mapa interactivo"
        });
        dataToSave.historial_cambios = historial;
        
        await base44.entities.LockerAssignment.update(existing.id, dataToSave);
      } else {
        await base44.entities.LockerAssignment.create(dataToSave);
      }

      // CRÍTICO: Sincronizar con Employee
      await base44.entities.Employee.update(selectedEmployeeId, {
        taquilla_vestuario: vestuario,
        taquilla_numero: numeroLimpio
      });

      // CRÍTICO: Sincronizar con EmployeeMasterDatabase
      const masterEmployees = await base44.entities.EmployeeMasterDatabase.list();
      const masterEmployee = masterEmployees.find(me => me.employee_id === selectedEmployeeId);
      if (masterEmployee) {
        await base44.entities.EmployeeMasterDatabase.update(masterEmployee.id, {
          taquilla_vestuario: vestuario,
          taquilla_numero: numeroLimpio
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
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

      // CRÍTICO: Sincronizar con Employee
      if (locker.employee?.id) {
        await base44.entities.Employee.update(locker.employee.id, {
          taquilla_vestuario: "",
          taquilla_numero: ""
        });
      }

      // CRÍTICO: Sincronizar con EmployeeMasterDatabase
      if (locker.employee?.id) {
        const masterEmployees = await base44.entities.EmployeeMasterDatabase.list();
        const masterEmployee = masterEmployees.find(me => me.employee_id === locker.employee.id);
        if (masterEmployee) {
          await base44.entities.EmployeeMasterDatabase.update(masterEmployee.id, {
            taquilla_vestuario: "",
            taquilla_numero: ""
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      toast.success("Taquilla liberada y sincronizada");
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
                  <Label>Seleccionar Empleado *</Label>
                  <EmployeeSelect
                    employees={availableEmployees}
                    value={selectedEmployeeId}
                    onValueChange={setSelectedEmployeeId}
                    placeholder="Buscar y seleccionar empleado sin taquilla..."
                  />
                  
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