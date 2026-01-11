import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { GripVertical, Save } from "lucide-react";
import { toast } from "sonner";

export default function MachineOrderManager() {
  const [machines, setMachines] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.entities.Machine.list('orden', 500)
      .then(data => {
        setMachines(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error loading machines:', err);
        toast.error('Error al cargar máquinas');
        setIsLoading(false);
      });
  }, []);

  const updateOrderMutation = useMutation({
    mutationFn: async (orderedMachines) => {
      for (let i = 0; i < orderedMachines.length; i++) {
        await base44.entities.Machine.update(orderedMachines[i].id, { orden: i + 1 });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success("Orden actualizado");
    },
    onError: () => {
      toast.error("Error al actualizar");
    }
  });

  const handleDragStart = (index) => setDraggedItem(index);
  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (targetIndex) => {
    if (draggedItem === null || draggedItem === targetIndex) return;
    const newMachines = [...machines];
    const [item] = newMachines.splice(draggedItem, 1);
    newMachines.splice(targetIndex, 0, item);
    setMachines(newMachines);
    setDraggedItem(null);
  };

  if (isLoading) return <div className="p-4 text-center text-slate-500">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600">Arrastra para reordenar</div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {machines.map((machine, index) => (
          <div
            key={machine.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(index)}
            className={`flex items-center gap-3 p-3 bg-slate-50 rounded-lg border ${
              draggedItem === index ? 'opacity-50' : 'hover:bg-slate-100'
            } cursor-move`}
          >
            <GripVertical className="w-5 h-5 text-slate-400" />
            <div className="flex-1">
              <div className="font-medium">{machine.nombre}</div>
              <div className="text-xs text-slate-500">{machine.codigo}</div>
            </div>
            <div className="text-sm font-semibold text-slate-600 bg-white px-2 py-1 rounded">{index + 1}</div>
          </div>
        ))}
      </div>
      <Button onClick={() => updateOrderMutation.mutate(machines)} disabled={updateOrderMutation.isPending} className="w-full bg-blue-600">
        <Save className="w-4 h-4 mr-2" />
        Guardar
      </Button>
    </div>
  );
}