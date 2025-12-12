import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays } from "date-fns";

export default function ScheduleOrderDialog({ open, onClose, order, dropDate, processes, machineProcesses, onConfirm }) {
  const [processId, setProcessId] = useState("");
  const [endDate, setEndDate] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [cadence, setCadence] = useState(0);

  useEffect(() => {
    if (order) {
      setProcessId(order.process_id || "");
      setQuantity(order.quantity || 0);
      setCadence(order.production_cadence || 0);
      
      // Calculate initial end date estimate if we have cadence
      if (dropDate && order.quantity && order.production_cadence) {
        const days = Math.ceil(order.quantity / order.production_cadence);
        // Simple addDays, doesn't account for working days yet in calculation, user can adjust
        setEndDate(format(addDays(new Date(dropDate), days), 'yyyy-MM-dd'));
      } else if (dropDate) {
         setEndDate(format(new Date(dropDate), 'yyyy-MM-dd'));
      }
    }
  }, [order, dropDate]);

  const handleConfirm = () => {
    onConfirm(order.id, {
      process_id: processId,
      start_date: format(new Date(dropDate), 'yyyy-MM-dd'),
      // If we used committed_delivery_date as end date visualization, update it? 
      // User asked for "estimación de fecha fin". I'll assume this updates committed_delivery_date or a specific end_date if it existed.
      // Given the schema, `committed_delivery_date` is the deadline. `estimated_duration` exists. 
      // Usually scheduling implies setting start date. The end date is a consequence. 
      // However, the prompt says "configuraremos ... estimación de fecha fin". 
      // I will update `committed_delivery_date` to reflect this new plan OR just use it for visualization logic.
      // Let's assume we update `committed_delivery_date` to the planned finish date, or we should rely on duration.
      // For now, I'll return the date to the parent to decide how to save.
      planned_end_date: endDate 
    });
    onClose();
  };

  const allowedProcesses = React.useMemo(() => {
    if (!order) return [];
    // Filter processes valid for this machine if possible
    const machineId = order.machine_id;
    const allowedIds = machineProcesses
        .filter(mp => mp.machine_id === machineId && mp.activo)
        .map(mp => mp.process_id);
    
    // If no specific config, allow all? Or strictly restrict?
    // Usually restrict. If list empty, maybe show all or warn.
    if (allowedIds.length === 0) return processes;
    
    return processes.filter(p => allowedIds.includes(p.id));
  }, [order, machineProcesses, processes]);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Programar Orden {order.order_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
             <div>
               <Label className="text-xs text-muted-foreground">Artículo</Label>
               <div className="font-medium">{order.product_article_code || '-'}</div>
             </div>
             <div>
               <Label className="text-xs text-muted-foreground">Cantidad</Label>
               <div className="font-medium">{order.quantity}</div>
             </div>
          </div>

          <div className="space-y-2">
            <Label>Proceso de Producción</Label>
            <Select value={processId} onValueChange={setProcessId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proceso" />
              </SelectTrigger>
              <SelectContent>
                {allowedProcesses.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input value={dropDate ? format(new Date(dropDate), 'dd/MM/yyyy') : ''} disabled />
             </div>
             <div className="space-y-2">
                <Label>Fecha Fin Estimada</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
             </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!processId || !endDate}>Confirmar Programación</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}