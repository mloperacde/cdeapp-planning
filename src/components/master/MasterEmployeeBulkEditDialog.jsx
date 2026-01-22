import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function MasterEmployeeBulkEditDialog({ selectedIds, open, onClose, onSuccess }) {
  const [selectedDept, setSelectedDept] = useState("");
  const queryClient = useQueryClient();

  const { data: departments = [], isLoading: isLoadingDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, newDept }) => {
      // Execute updates in parallel (or batched if API supported it)
      const promises = ids.map(id => 
        base44.entities.EmployeeMasterDatabase.update(id, { departamento: newDept })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(`Se han actualizado ${selectedIds.length} empleados correctamente`);
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error) => {
      console.error("Error updating employees:", error);
      toast.error("Error al actualizar los empleados. Revisa la consola.");
    }
  });

  const handleSave = () => {
    if (!selectedDept) return;
    bulkUpdateMutation.mutate({ ids: selectedIds, newDept: selectedDept });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cambio Masivo de Departamento</DialogTitle>
          <DialogDescription>
            Estás a punto de mover a <strong>{selectedIds.length}</strong> empleados seleccionados a un nuevo departamento.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Nuevo Departamento</Label>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar departamento..." />
              </SelectTrigger>
              <SelectContent>
                {isLoadingDepts ? (
                  <div className="p-2 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                  </div>
                ) : departments.length > 0 ? (
                  departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">No hay departamentos disponibles</div>
                )}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-slate-500">
              Esta acción actualizará el departamento de todos los empleados seleccionados.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={bulkUpdateMutation.isPending}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!selectedDept || bulkUpdateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {bulkUpdateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              "Confirmar Cambio"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
