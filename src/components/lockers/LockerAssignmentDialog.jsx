import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import EmployeeSelect from "../common/EmployeeSelect";

export default function LockerAssignmentDialog({ 
  locker, 
  vestuario, 
  employees = [], 
  lockerAssignments = [], 
  onClose,
  saveAssignments
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(locker.draggedEmployeeId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debug: Log mount and props
  React.useEffect(() => {
    console.log("[LockerAssignmentDialog] Mounted", { 
        lockerNumber: locker.numero, 
        draggedId: locker.draggedEmployeeId,
        vestuario
    });
  }, [locker, vestuario]);

  const availableEmployees = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];
    
    return employees.filter(emp => {
        // Always include the currently selected employee so they appear in the dropdown
        if (selectedEmployeeId && String(emp.id) === String(selectedEmployeeId)) return true;

        const hasAssignment = lockerAssignments.find(la => String(la.employee_id) === String(emp.id));
        if (!hasAssignment) return true; 

        const hasLocker = hasAssignment.numero_taquilla_actual && 
                         hasAssignment.numero_taquilla_actual.replace(/['"''‚„]/g, '').trim() !== "";
        const requiresLocker = hasAssignment.requiere_taquilla !== false;
        
        return !hasLocker && requiresLocker; 
      });
  }, [employees, lockerAssignments, selectedEmployeeId]);

  const handleAssign = async () => {
      if (!selectedEmployeeId) {
        toast.error("Selecciona un empleado");
        return;
      }
      
      const numeroLimpio = locker.numero.toString().replace(/['"''‚„]/g, '').trim();

      const duplicado = lockerAssignments.find(la => 
        la.vestuario === vestuario &&
        la.numero_taquilla_actual?.replace(/['"''‚„]/g, '').trim() === numeroLimpio &&
        String(la.employee_id) !== String(selectedEmployeeId) &&
        la.requiere_taquilla !== false
      );

      if (duplicado) {
        const empDuplicado = employees.find(e => String(e.id) === String(duplicado.employee_id));
        toast.error(`La taquilla ${locker.numero} en ${vestuario} ya está asignada a ${empDuplicado?.nombre || 'otro empleado'}`);
        return;
      }

      setIsSubmitting(true);
      try {
        console.log("Assigning locker:", { selectedEmployeeId, vestuario, numeroLimpio });
        await saveAssignments({
            employeeId: selectedEmployeeId,
            requiere_taquilla: true,
            vestuario: vestuario,
            numero_taquilla_actual: numeroLimpio,
            motivo: "Asignación desde mapa interactivo"
        });
        
        const emp = employees.find(e => String(e.id) === String(selectedEmployeeId));
        toast.success(`Taquilla ${locker.numero} asignada a ${emp?.nombre}`);
        onClose();
      } catch (error) {
        console.error("Error assigning:", error);
        toast.error(error.message);
      } finally {
        setIsSubmitting(false);
      }
  };

  const handleUnassign = async () => {
      if (!locker.assignment) return;
      
      setIsSubmitting(true);
      try {
        await saveAssignments({
            employeeId: locker.employee.id,
            requiere_taquilla: true,
            vestuario: "",
            numero_taquilla_actual: "",
            motivo: "Liberación de taquilla desde mapa"
        });
        toast.success("Taquilla liberada");
        onClose();
      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsSubmitting(false);
      }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Taquilla #{locker.numero} - {vestuario}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Gestión de asignación para la taquilla número {locker.numero} en {vestuario}.
          </DialogDescription>
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
                  disabled={isSubmitting}
                >
                  Cerrar
                </Button>
                <Button
                  onClick={handleUnassign}
                  disabled={isSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Procesando..." : "Liberar Taquilla"}
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
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={isSubmitting || !selectedEmployeeId}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? "Asignando..." : "Confirmar Asignación"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}