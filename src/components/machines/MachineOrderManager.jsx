import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { GripVertical, Save, X } from "lucide-react";
import { toast } from "sonner";

export default function MachineOrderManager() {
  const [machines, setMachines] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const queryClient = useQueryClient();

  const { isLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await base44.entities.Machine.list('orden');
      setMachines(data);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (orderedMachines) => {
      const updates = orderedMachines.map((machine, index) => ({
        id: machine.id,
        data: { orden: index + 1 }
      }));
      
      for (const update of updates) {
        await base44.entities.Machine.update(update.id, update.data);
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success("Orden de máquinas actualizado");
    },
    onError: () => {
      toast.error("Error al actualizar orden");
    }
  });

  const handleDragStart = (index) => {
    setDraggedItem(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex) => {
    if (draggedItem === null || draggedItem === targetIndex) return;
    
    const newMachines = [...machines];
    const [draggedMachine] = newMachines.splice(draggedItem, 1);
    newMachines.splice(targetIndex, 0, draggedMachine);
    setMachines(newMachines);
    setDraggedItem(null);
  };

  const handleSave = () => {
    updateOrderMutation.mutate(machines);
  };

  if (isLoading) return <div className="p-4 text-center">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600">
        Arrastra las máquinas para reordenarlas
      </div>
      
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {machines.map((machine, index) => (
          <div
            key={machine.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(index)}
            className={`flex items-center gap-3 p-3 bg-slate-50 rounded-lg border transition-all ${
              draggedItem === index ? 'opacity-50 bg-slate-200' : 'hover:bg-slate-100'
            } cursor-move`}
          >
            <GripVertical className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-slate-900">{machine.nombre}</div>
              <div className="text-xs text-slate-500">{machine.codigo}</div>
            </div>
            <div className="text-sm font-semibold text-slate-600 bg-white px-2 py-1 rounded">
              {index + 1}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Button
          onClick={handleSave}
          disabled={updateOrderMutation.isPending}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {updateOrderMutation.isPending ? "Guardando..." : "Guardar Orden"}
        </Button>
      </div>
    </div>
  );
}