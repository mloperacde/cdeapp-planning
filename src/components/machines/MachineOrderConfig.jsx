import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Save } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "sonner";

export default function MachineOrderConfig() {
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = orderedMachines.map((machine, index) => 
        base44.entities.Machine.update(machine.id, { orden: index + 1 })
      );
      await Promise.all(updates);
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

  if (isLoading) {
    return <div className="p-4 text-center">Cargando...</div>;
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle>Configurar Orden de Máquinas</CardTitle>
          <Button 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar Orden
          </Button>
        </div>
        <p className="text-sm text-slate-500 mt-2">
          Arrastra las máquinas para reordenarlas. Este orden se aplicará en todas las vistas.
        </p>
      </CardHeader>
      <CardContent className="p-4">
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
                        {...provided.dragHandleProps}
                        className={`flex items-center gap-3 p-3 bg-white border rounded-lg transition-shadow ${
                          snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500' : 'hover:shadow-md'
                        }`}
                      >
                        <GripVertical className="w-5 h-5 text-slate-400" />
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900">{machine.nombre}</div>
                          <div className="text-xs text-slate-500">{machine.codigo} • {machine.ubicacion || 'Sin ubicación'}</div>
                        </div>
                        <div className="text-sm text-slate-400">#{index + 1}</div>
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