import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { getEligibleProcessesForMachine, getEligibleMachinesForProcess } from "@/lib/domain/planning";

export default function WorkOrderForm({ open, onClose, orderToEdit, machines, processes, machineProcesses }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    order_number: "",
    machine_id: "",
    process_id: "",
    priority: "3",
    start_date: "",
    committed_delivery_date: "",
    status: "Pendiente",
    notes: ""
  });

  useEffect(() => {
    if (orderToEdit) {
      setFormData({
        order_number: orderToEdit.order_number,
        machine_id: orderToEdit.machine_id,
        process_id: orderToEdit.process_id,
        priority: orderToEdit.priority?.toString() || "3",
        start_date: orderToEdit.start_date,
        committed_delivery_date: orderToEdit.committed_delivery_date,
        status: orderToEdit.status,
        notes: orderToEdit.notes || ""
      });
    } else {
      setFormData({
        order_number: `WO-${new Date().getTime().toString().slice(-6)}`,
        machine_id: "",
        process_id: "",
        priority: "3",
        start_date: new Date().toISOString().split('T')[0],
        committed_delivery_date: "",
        status: "Pendiente",
        notes: ""
      });
    }
  }, [orderToEdit, open]);

  // Derived state for filtered lists
  const availableProcesses = useMemo(() => {
    if (!formData.machine_id) return processes.filter(p => p.activo);
    return getEligibleProcessesForMachine(formData.machine_id, machineProcesses, processes);
  }, [processes, machineProcesses, formData.machine_id]);

  const availableMachines = useMemo(() => {
    if (!formData.process_id) return machines;
    return getEligibleMachinesForProcess(formData.process_id, machines, machineProcesses);
  }, [machines, machineProcesses, formData.process_id]);

  // Helper to get operators count for current selection
  const getOperatorsRequired = () => {
    if (formData.machine_id && formData.process_id) {
      const mp = machineProcesses.find(
        item => item.machine_id === formData.machine_id && item.process_id === formData.process_id
      );
      if (mp) return mp.operadores_requeridos;
    }
    if (formData.process_id) {
      const p = processes.find(item => item.id === formData.process_id);
      if (p) return p.operadores_requeridos;
    }
    return null;
  };

  const currentOperators = getOperatorsRequired();

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        priority: parseInt(data.priority)
      };
      if (orderToEdit) {
        return base44.entities.WorkOrder.update(orderToEdit.id, payload);
      }
      return base44.entities.WorkOrder.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      toast.success(orderToEdit ? "Orden actualizada" : "Orden creada");
      onClose();
    },
    onError: (err) => {
      toast.error("Error al guardar: " + err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkOrder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      toast.success("Orden eliminada");
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (confirm("¿Eliminar esta orden de trabajo?")) {
      deleteMutation.mutate(orderToEdit.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{orderToEdit ? "Editar Orden de Trabajo" : "Nueva Orden de Trabajo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Número Orden *</Label>
              <Input 
                value={formData.order_number}
                onChange={(e) => setFormData({...formData, order_number: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Prioridad (1-5) *</Label>
              <Select value={formData.priority} onValueChange={(val) => setFormData({...formData, priority: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5].map(p => (
                    <SelectItem key={p} value={p.toString()}>
                      {p} - {p === 1 ? "Máxima" : p === 5 ? "Mínima" : "Normal"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Máquina *</Label>
              <Select 
                value={formData.machine_id} 
                onValueChange={(val) => setFormData(prev => ({...prev, machine_id: val}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar máquina" />
                </SelectTrigger>
                <SelectContent>
                  {availableMachines.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Proceso *</Label>
              <Select 
                value={formData.process_id} 
                onValueChange={(val) => setFormData(prev => ({...prev, process_id: val}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proceso" />
                </SelectTrigger>
                <SelectContent>
                  {availableProcesses.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {currentOperators && (
             <div className="flex justify-end">
               <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Requiere: {currentOperators} operador(es)
               </Badge>
             </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha Inicio *</Label>
              <Input 
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha Entrega Comprometida *</Label>
              <Input 
                type="date"
                value={formData.committed_delivery_date}
                onChange={(e) => setFormData({...formData, committed_delivery_date: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="En Progreso">En Progreso</SelectItem>
                <SelectItem value="Completada">Completada</SelectItem>
                <SelectItem value="Retrasada">Retrasada</SelectItem>
                <SelectItem value="Cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
            />
          </div>

          <div className="flex justify-between pt-4">
            {orderToEdit ? (
              <Button type="button" variant="destructive" onClick={handleDelete}>
                Eliminar
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Guardar</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
