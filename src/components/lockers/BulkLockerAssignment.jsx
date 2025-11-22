import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, CheckSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function BulkLockerAssignment({ 
  employees, 
  lockerAssignments,
  selectedEmployeeIds,
  onSelectionChange 
}) {
  const [bulkVestuario, setBulkVestuario] = useState("");
  const [startingLocker, setStartingLocker] = useState("");
  const queryClient = useQueryClient();

  const bulkAssignMutation = useMutation({
    mutationFn: async ({ employeeIds, vestuario, startNumber }) => {
      const results = [];
      const start = parseInt(startNumber);
      
      for (let i = 0; i < employeeIds.length; i++) {
        const employeeId = employeeIds[i];
        const lockerNumber = (start + i).toString();
        
        const existing = lockerAssignments.find(la => la.employee_id === employeeId);
        
        const assignmentData = {
          employee_id: employeeId,
          requiere_taquilla: true,
          vestuario: vestuario,
          numero_taquilla_actual: lockerNumber,
          fecha_asignacion: new Date().toISOString(),
          notas: 'Asignación masiva'
        };

        if (existing) {
          await base44.entities.LockerAssignment.update(existing.id, assignmentData);
        } else {
          await base44.entities.LockerAssignment.create(assignmentData);
        }
        
        results.push({ employeeId, lockerNumber });
      }
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
      toast.success(`✅ ${results.length} taquillas asignadas correctamente`);
      onSelectionChange([]);
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    }
  });

  const bulkUnassignMutation = useMutation({
    mutationFn: async (employeeIds) => {
      for (const employeeId of employeeIds) {
        const existing = lockerAssignments.find(la => la.employee_id === employeeId);
        if (existing) {
          await base44.entities.LockerAssignment.update(existing.id, {
            requiere_taquilla: false,
            numero_taquilla_actual: "",
            notas: 'Desasignación masiva'
          });
        }
      }
      return employeeIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
      toast.success(`✅ ${count} taquillas desasignadas`);
      onSelectionChange([]);
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    }
  });

  const handleBulkAssign = () => {
    if (!bulkVestuario || !startingLocker) {
      toast.error('Selecciona vestuario y número inicial');
      return;
    }

    if (selectedEmployeeIds.length === 0) {
      toast.error('Selecciona al menos un empleado');
      return;
    }

    if (confirm(`¿Asignar ${selectedEmployeeIds.length} taquillas comenzando desde el número ${startingLocker} en ${bulkVestuario}?`)) {
      bulkAssignMutation.mutate({
        employeeIds: selectedEmployeeIds,
        vestuario: bulkVestuario,
        startNumber: startingLocker
      });
    }
  };

  const handleBulkUnassign = () => {
    if (selectedEmployeeIds.length === 0) {
      toast.error('Selecciona al menos un empleado');
      return;
    }

    if (confirm(`¿Desasignar taquillas de ${selectedEmployeeIds.length} empleados?`)) {
      bulkUnassignMutation.mutate(selectedEmployeeIds);
    }
  };

  return (
    <Card className="shadow-lg border-2 border-purple-200 bg-purple-50">
      <CardHeader className="border-b border-purple-200">
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <CheckSquare className="w-5 h-5 text-purple-600" />
          Asignación Masiva
          {selectedEmployeeIds.length > 0 && (
            <Badge className="bg-purple-600 ml-2">
              {selectedEmployeeIds.length} seleccionados
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-800">
            <strong>ℹ️ Cómo usar:</strong> Selecciona empleados con los checkbox, elige vestuario y número inicial. 
            Las taquillas se asignarán secuencialmente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Vestuario</label>
            <Select value={bulkVestuario} onValueChange={setBulkVestuario}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Vestuario Femenino Planta Baja">Femenino P. Baja</SelectItem>
                <SelectItem value="Vestuario Femenino Planta Alta">Femenino P. Alta</SelectItem>
                <SelectItem value="Vestuario Masculino Planta Baja">Masculino P. Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Número Inicial</label>
            <input
              type="number"
              value={startingLocker}
              onChange={(e) => setStartingLocker(e.target.value)}
              placeholder="Ej: 1"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleBulkAssign}
            disabled={bulkAssignMutation.isPending || selectedEmployeeIds.length === 0}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            <Users className="w-4 h-4 mr-2" />
            Asignar {selectedEmployeeIds.length} Taquillas
          </Button>

          <Button
            onClick={handleBulkUnassign}
            disabled={bulkUnassignMutation.isPending || selectedEmployeeIds.length === 0}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Desasignar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}