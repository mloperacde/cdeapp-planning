import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, Save } from "lucide-react";
import { toast } from "sonner";

export default function MachineOrderManager() {
  const queryClient = useQueryClient();
  
  const { data: machines = [], isLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
  });

  const [orderedMachines, setOrderedMachines] = useState([]);

  React.useEffect(() => {
    if (machines.length > 0) {
      setOrderedMachines([...machines]);
    }
  }, [machines]);

  const updateOrderMutation = useMutation({
    mutationFn: async (machinesWithOrder) => {
      const promises = machinesWithOrder.map((machine, index) =>
        base44.entities.Machine.update(machine.id, { orden: index })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success("Orden de máquinas guardado correctamente");
    },
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(orderedMachines);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setOrderedMachines(items);
  };

  const handleSave = () => {
    updateOrderMutation.mutate(orderedMachines);
  };

  if (isLoading) {
    return <div className="p-4">Cargando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Ordenar Máquinas</CardTitle>
          <Button 
            onClick={handleSave} 
            disabled={updateOrderMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateOrderMutation.isPending ? "Guardando..." : "Guardar Orden"}
          </Button>
        </div>
        <p className="text-sm text-slate-500">
          Arrastra las máquinas para cambiar su orden de visualización en toda la aplicación
        </p>
      </CardHeader>
      <CardContent>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="machines">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {orderedMachines.map((machine, index) => (
                  <Draggable key={machine.id} draggableId={machine.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center gap-3 p-3 bg-white border rounded-lg transition-shadow ${
                          snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500' : 'hover:shadow-md'
                        }`}
                      >
                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900">{machine.nombre}</div>
                          <div className="text-xs text-slate-500">{machine.codigo}</div>
                        </div>
                        <div className="text-sm text-slate-400">Posición {index + 1}</div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </CardContent>
    </Card>
  );
}