import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, LayoutDashboard, Eye, EyeOff } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ShiftDashboardCustomizer({ open, onOpenChange, widgets, onSave }) {
    const [localWidgets, setLocalWidgets] = useState(widgets);

    const handleDragEnd = (result) => {
        if (!result.destination) return;

        const items = Array.from(localWidgets);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Update position indices
        const updatedItems = items.map((item, index) => ({
            ...item,
            position: index
        }));

        setLocalWidgets(updatedItems);
    };

    const toggleWidget = (widgetId) => {
        setLocalWidgets(prev => prev.map(w => 
            w.id === widgetId ? { ...w, enabled: !w.enabled } : w
        ));
    };

    const handleSave = () => {
        onSave(localWidgets);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <LayoutDashboard className="w-5 h-5 text-blue-600" />
                        Personalizar Dashboard
                    </DialogTitle>
                    <DialogDescription>
                        Arrastra para reordenar y usa los interruptores para mostrar u ocultar secciones.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[400px] pr-4 -mr-4">
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="widgets">
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="space-y-2 py-2"
                                >
                                    {localWidgets.map((widget, index) => (
                                        <Draggable key={widget.id} draggableId={widget.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`
                                                        flex items-center justify-between p-3 rounded-lg border 
                                                        ${snapshot.isDragging ? 'bg-blue-50 border-blue-300 shadow-lg' : 'bg-white border-slate-200'}
                                                    `}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            {...provided.dragHandleProps}
                                                            className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing p-1"
                                                        >
                                                            <GripVertical className="w-5 h-5" />
                                                        </div>
                                                        <div className={`p-2 rounded-md ${widget.enabled ? 'bg-slate-100' : 'bg-slate-50 opacity-50'}`}>
                                                            {widget.icon && <widget.icon className="w-4 h-4 text-slate-600" />}
                                                        </div>
                                                        <span className={`font-medium ${widget.enabled ? 'text-slate-900' : 'text-slate-400'}`}>
                                                            {widget.label}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2">
                                                        {widget.enabled ? 
                                                            <Eye className="w-4 h-4 text-slate-400" /> : 
                                                            <EyeOff className="w-4 h-4 text-slate-300" />
                                                        }
                                                        <Switch
                                                            checked={widget.enabled}
                                                            onCheckedChange={() => toggleWidget(widget.id)}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Guardar Cambios</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}