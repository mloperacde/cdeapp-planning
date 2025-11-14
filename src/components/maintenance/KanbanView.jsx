import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Clock, AlertTriangle, CheckCircle2, Wrench, User, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const COLUMNS = [
  { id: "Pendiente", title: "Pendiente", icon: Clock, color: "slate" },
  { id: "Programado", title: "Programado", icon: Calendar, color: "blue" },
  { id: "En Proceso", title: "En Proceso", icon: Wrench, color: "orange" },
  { id: "Completado", title: "Completado", icon: CheckCircle2, color: "green" },
  { id: "Cancelado", title: "Cancelado", icon: AlertTriangle, color: "red" },
];

export default function KanbanView({ maintenances, machines, employees, onOpenWorkOrder }) {
  const [editingCard, setEditingCard] = useState(null);
  const [quickEditData, setQuickEditData] = useState({});
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, estado }) => base44.entities.MaintenanceSchedule.update(id, { 
      estado,
      fecha_inicio: estado === "En Proceso" ? new Date().toISOString() : undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      toast.success("Estado actualizado");
    },
  });

  const updateMaintenance = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceSchedule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      setEditingCard(null);
      toast.success("Mantenimiento actualizado");
    },
  });

  const maintenanceTechnicians = useMemo(() => {
    return employees.filter(emp => 
      emp.departamento === "MANTENIMIENTO" || emp.departamento === "Mantenimiento"
    );
  }, [employees]);

  const groupedMaintenances = useMemo(() => {
    const grouped = {};
    COLUMNS.forEach(col => {
      grouped[col.id] = maintenances.filter(m => m.estado === col.id);
    });
    return grouped;
  }, [maintenances]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    
    updateStatusMutation.mutate({ id: draggableId, estado: newStatus });
  };

  const getMachineName = (machineId) => {
    const machine = machines.find(m => m.id === machineId);
    return machine?.nombre || "Máquina";
  };

  const getEmployeeName = (employeeId) => {
    if (!employeeId) return "Sin asignar";
    const emp = employees.find(e => e.id === employeeId);
    return emp?.nombre || "Sin asignar";
  };

  const getPriorityColor = (prioridad) => {
    switch (prioridad) {
      case "Urgente": return "bg-red-600";
      case "Alta": return "bg-orange-600";
      case "Media": return "bg-blue-600";
      case "Baja": return "bg-green-600";
      default: return "bg-slate-600";
    }
  };

  const handleQuickEdit = (maintenance) => {
    setEditingCard(maintenance);
    setQuickEditData({
      tecnico_asignado: maintenance.tecnico_asignado || "",
      fecha_programada: maintenance.fecha_programada || "",
    });
  };

  const handleSaveQuickEdit = () => {
    updateMaintenance.mutate({
      id: editingCard.id,
      data: quickEditData
    });
  };

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {COLUMNS.map((column) => {
            const Icon = column.icon;
            const items = groupedMaintenances[column.id] || [];
            
            return (
              <div key={column.id} className="flex flex-col">
                <div className={`bg-${column.color}-100 border-2 border-${column.color}-300 rounded-t-lg p-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 text-${column.color}-700`} />
                      <h3 className={`font-semibold text-sm text-${column.color}-900`}>
                        {column.title}
                      </h3>
                    </div>
                    <Badge className={`bg-${column.color}-600`}>
                      {items.length}
                    </Badge>
                  </div>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`
                        flex-1 bg-slate-50 border-2 border-t-0 border-slate-200 rounded-b-lg p-2 min-h-[500px]
                        ${snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300' : ''}
                      `}
                    >
                      <div className="space-y-2">
                        {items.map((maintenance, index) => (
                          <Draggable
                            key={maintenance.id}
                            draggableId={maintenance.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <Card 
                                  className={`
                                    cursor-move hover:shadow-lg transition-all
                                    ${snapshot.isDragging ? 'shadow-2xl rotate-2 scale-105' : ''}
                                  `}
                                >
                                  <CardContent className="p-3 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">
                                          {getMachineName(maintenance.machine_id)}
                                        </h4>
                                        <p className="text-xs text-slate-600 line-clamp-1">
                                          {maintenance.tipo}
                                        </p>
                                      </div>
                                      <Badge className={`${getPriorityColor(maintenance.prioridad)} text-xs`}>
                                        {maintenance.prioridad}
                                      </Badge>
                                    </div>

                                    <div className="flex items-center gap-1 text-xs text-slate-600">
                                      <Calendar className="w-3 h-3" />
                                      {format(new Date(maintenance.fecha_programada), "dd/MM HH:mm", { locale: es })}
                                    </div>

                                    <div className="flex items-center gap-1 text-xs text-slate-600">
                                      <User className="w-3 h-3" />
                                      {getEmployeeName(maintenance.tecnico_asignado)}
                                    </div>

                                    {maintenance.descripcion && (
                                      <p className="text-xs text-slate-500 line-clamp-2 pt-1 border-t">
                                        {maintenance.descripcion}
                                      </p>
                                    )}

                                    <div className="flex gap-1 pt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 h-7 text-xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleQuickEdit(maintenance);
                                        }}
                                      >
                                        Editar
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 h-7 text-xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onOpenWorkOrder(maintenance);
                                        }}
                                      >
                                        <FileText className="w-3 h-3 mr-1" />
                                        OT
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Quick Edit Dialog */}
      {editingCard && (
        <Dialog open={true} onOpenChange={() => setEditingCard(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edición Rápida</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900">{getMachineName(editingCard.machine_id)}</h3>
                <p className="text-sm text-slate-600">{editingCard.tipo}</p>
              </div>

              <div className="space-y-2">
                <Label>Técnico Asignado</Label>
                <Select
                  value={quickEditData.tecnico_asignado || ""}
                  onValueChange={(value) => setQuickEditData({ ...quickEditData, tecnico_asignado: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar técnico" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Sin asignar</SelectItem>
                    {maintenanceTechnicians.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha Programada</Label>
                <Input
                  type="datetime-local"
                  value={quickEditData.fecha_programada}
                  onChange={(e) => setQuickEditData({ ...quickEditData, fecha_programada: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingCard(null)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveQuickEdit}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={updateMaintenance.isPending}
                >
                  {updateMaintenance.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}