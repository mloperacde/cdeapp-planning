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
      console.log("Iniciando actualización masiva:", { ids, newDept });
      
      // Process in batches of 5 to avoid rate limiting
      const BATCH_SIZE = 5;
      const results = [];
      const errors = [];
      
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        console.log(`Procesando lote ${i / BATCH_SIZE + 1} de ${Math.ceil(ids.length / BATCH_SIZE)}`);
        
        const batchPromises = batch.map(async (id) => {
          try {
            const result = await base44.entities.EmployeeMasterDatabase.update(id, { departamento: newDept?.toUpperCase() });
            return { status: 'fulfilled', value: result, id };
          } catch (err) {
            console.error(`Error actualizando empleado ${id}:`, err);
            return { status: 'rejected', reason: err, id };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(res => {
          if (res.status === 'fulfilled') {
            results.push(res.value);
          } else {
            errors.push({ id: res.id, error: res.reason });
          }
        });

        // Add delay between batches to respect rate limits
        if (i + BATCH_SIZE < ids.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (errors.length > 0) {
        console.error("Errores en actualización masiva:", errors);
        // If all failed, throw error
        if (results.length === 0) {
           throw new Error(`Fallaron todas las actualizaciones (${errors.length})`);
        }
        // If partial failure, we might want to notify but still return success for the ones that worked
        toast.warning(`Se actualizaron ${results.length} empleados, pero ${errors.length} fallaron.`);
      }
      
      return results;
    },
    onSuccess: (data) => {
      console.log("Actualización masiva completada:", data);
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      
      // Force a slight delay to ensure backend consistency before UI refresh (optional but helpful)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      }, 500);

      if (data.length > 0) {
          toast.success(`Se han actualizado ${data.length} empleados correctamente`);
      }
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error) => {
      console.error("Error updating employees:", error);
      toast.error(`Error al actualizar los empleados: ${error.message || "Error desconocido"}`);
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
