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

export default function WorkOrderForm({ open, onClose, orderToEdit, machines, processes, machineProcesses, existingOrders = [] }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    order_number: "",
    machine_id: "",
    process_id: "",
    priority: "3",
    start_date: "",
    committed_delivery_date: "",
    status: "Pendiente",
    notes: "",
    
    // New Schema Fields
    client_name: "",
    product_article_code: "",
    quantity: "",
    product_name: "",
    part_status: "", // Not in schema, keeping in state for UI but will map to notes or special handling if needed? 
                     // Wait, user provided list has "Edo. Art.", but schema didn't have it. 
                     // I will keep using 'part_status' in state but map it correctly or keep it if I missed something.
                     // Actually, I'll stick to the backend keys for the ones I know.
    material_type: "",
    product_category: "",
    production_cadence: "",
    planned_end_date: ""
  });

  useEffect(() => {
    if (orderToEdit) {
      setFormData({
        order_number: orderToEdit.order_number,
        machine_id: orderToEdit.machine_id,
        process_id: orderToEdit.process_id,
        priority: orderToEdit.priority?.toString() || "3",
        // Use effective dates if available (from ProductionPlanningPage injection)
        start_date: orderToEdit.effective_start_date || orderToEdit.start_date || "",
        committed_delivery_date: orderToEdit.effective_delivery_date || orderToEdit.committed_delivery_date || "",
        status: orderToEdit.status,
        notes: orderToEdit.notes || "",
        
        client_name: orderToEdit.client_name || orderToEdit.client || "",
        product_article_code: orderToEdit.product_article_code || orderToEdit.part_number || "",
        quantity: orderToEdit.quantity || "",
        product_name: orderToEdit.product_name || orderToEdit.description || "",
        material_type: orderToEdit.material_type || orderToEdit.material || "",
        product_category: orderToEdit.product_category || orderToEdit.product || "",
        production_cadence: orderToEdit.production_cadence || orderToEdit.cadence || "",
        planned_end_date: orderToEdit.planned_end_date || orderToEdit.end_date || ""
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
        notes: "",
        client_name: "",
        product_article_code: "",
        quantity: "",
        product_name: "",
        material_type: "",
        product_category: "",
        production_cadence: "",
        planned_end_date: ""
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
        order_number: data.order_number,
        machine_id: data.machine_id,
        process_id: data.process_id,
        priority: parseInt(data.priority),
        status: data.status,
        start_date: data.start_date,
        committed_delivery_date: data.committed_delivery_date,
        planned_end_date: data.planned_end_date,
        notes: data.notes,
        
        // Backend Schema Fields
        client_name: data.client_name,
        product_article_code: data.product_article_code,
        quantity: data.quantity ? parseInt(data.quantity) : null,
        product_name: data.product_name,
        material_type: data.material_type,
        product_category: data.product_category,
        production_cadence: data.production_cadence ? parseFloat(data.production_cadence) : null,

        // Clear overrides to ensure manual edit takes precedence
        modified_start_date: null,
        new_delivery_date: null
      };

      // Append part_status to notes if present and not already there
      if (data.part_status) {
         payload.notes = (payload.notes ? payload.notes + '\n' : '') + `Edo. Art.: ${data.part_status}`;
      }

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

    // Asprova Logic: Finite Capacity Scheduling Check
    if (formData.machine_id && formData.start_date) {
      const machineId = formData.machine_id;
      const newStart = new Date(formData.start_date);
      // Determine end date: planned_end_date > committed_delivery_date > start_date
      let newEnd = newStart;
      if (formData.planned_end_date) newEnd = new Date(formData.planned_end_date);
      else if (formData.committed_delivery_date) newEnd = new Date(formData.committed_delivery_date);
      
      // Basic validity check
      if (!isNaN(newStart.getTime()) && !isNaN(newEnd.getTime())) {
         const conflict = existingOrders.find(o => {
            if (orderToEdit && o.id === orderToEdit.id) return false; // Ignore self
            if (o.machine_id !== machineId) return false; // Ignore other machines
            if (!o.start_date) return false; // Ignore unscheduled

            const oStart = new Date(o.start_date);
            const oEnd = o.planned_end_date 
                ? new Date(o.planned_end_date) 
                : (o.committed_delivery_date ? new Date(o.committed_delivery_date) : oStart);
            
            // Check overlap: StartA <= EndB && EndA >= StartB
            return newStart <= oEnd && newEnd >= oStart;
         });

         if (conflict) {
             toast.error(`Conflicto de capacidad: Solapa con orden ${conflict.order_number}`, {
                 description: "Principio de Capacidad Finita (Asprova): Una máquina no puede procesar dos órdenes simultáneamente."
             });
             return; 
         }
      }
    }

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
                    <SelectItem key={m.id} value={m.id}>{m.descripcion || m.nombre}</SelectItem>
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

          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium mb-3">Detalles Adicionales</h4>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Input value={formData.client_name} onChange={(e) => setFormData({...formData, client_name: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Artículo / Referencia</Label>
                    <Input value={formData.product_article_code} onChange={(e) => setFormData({...formData, product_article_code: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Cantidad</Label>
                    <Input type="number" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Descripción / Nombre</Label>
                    <Input value={formData.product_name} onChange={(e) => setFormData({...formData, product_name: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Estado Artículo (se agregará a notas)</Label>
                    <Input value={formData.part_status} onChange={(e) => setFormData({...formData, part_status: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Material</Label>
                    <Input value={formData.material_type} onChange={(e) => setFormData({...formData, material_type: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Producto</Label>
                    <Input value={formData.product_category} onChange={(e) => setFormData({...formData, product_category: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Cadencia</Label>
                    <Input value={formData.production_cadence} onChange={(e) => setFormData({...formData, production_cadence: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Fecha Fin</Label>
                    <Input type="date" value={formData.planned_end_date} onChange={(e) => setFormData({...formData, planned_end_date: e.target.value})} />
                </div>
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
