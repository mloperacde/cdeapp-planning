import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays, isWeekend, parseISO } from "date-fns";

export default function ScheduleOrderDialog({ open, onClose, order, dropDate, processes, machineProcesses, onConfirm, holidays = [] }) {
  const [processId, setProcessId] = useState("");
  const [endDate, setEndDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState(0);

  // Helper to calculate end date skipping weekends and holidays
  const calculateEndDate = (startDate, hoursNeeded, holidaysList) => {
    if (!startDate || !hoursNeeded) return startDate;
    
    // Convert hours to days (assuming 24h operation)
    const daysNeeded = Math.ceil(hoursNeeded / 24); 
    
    // startDate comes as string YYYY-MM-DD
    let current = parseISO(startDate);
    let daysAdded = 0;
    const holidaySet = new Set(holidaysList.map(h => h.date));
    
    // Add days one by one, skipping non-working days
    // We add 'daysNeeded' WORKING days.
    // If daysNeeded is 1 (e.g. 5 hours), we effectively occupy 1 day.
    
    // Start counting from day 1 (start date)
    // If Start Date is holiday, we might need to shift start? 
    // But dropDate is where user dropped it. Assuming it's valid.
    
    while (daysAdded < daysNeeded) {
        // Move to next day if we are not at start
        if (daysAdded > 0) {
            current = addDays(current, 1);
        }
        
        // Check if current is working day
        const isHoliday = holidaySet.has(format(current, 'yyyy-MM-dd'));
        const isWe = isWeekend(current);
        
        if (!isHoliday && !isWe) {
            daysAdded++;
        } else {
            // If it's a non-working day, we just loop again (advance date) without incrementing daysAdded
            // Wait, logic above: "Move to next day if daysAdded > 0". 
            // Correct loop:
            // 1. Check current. If working, decrement needed. 
            // 2. If needed > 0, add day.
        }
    }
    
    // Actually simpler loop:
    let remainingDays = daysNeeded;
    let resultDate = parseISO(startDate);
    
    // If the start date itself is non-working, should we count it? 
    // Usually start date is determined by drop.
    // Let's assume we consume the start date if it's working.
    
    // We need to find the date where we finish.
    // Loop until we consume all required working days.
    // Example: Need 1 day. Start Mon. End Mon.
    // Example: Need 2 days. Start Fri. Fri is working (1). Sat (skip). Sun (skip). Mon (2). End Mon.
    
    // Reset
    remainingDays = daysNeeded;
    resultDate = parseISO(startDate);
    
    while (remainingDays > 0) {
        const dStr = format(resultDate, 'yyyy-MM-dd');
        const isHol = holidaySet.has(dStr);
        const isWe = isWeekend(resultDate);
        
        if (!isHol && !isWe) {
            remainingDays--;
        }
        
        if (remainingDays > 0) {
            resultDate = addDays(resultDate, 1);
        }
    }
    
    return format(resultDate, 'yyyy-MM-dd');
  };

  useEffect(() => {
    if (order) {
      setProcessId(order.process_id || "");
      setEstimatedHours(order.estimated_duration || 0);
      
      const hours = order.estimated_duration || 
                   ((order.quantity && order.production_cadence) ? (order.quantity / order.production_cadence) : 0);

      if (dropDate) {
         const calculatedEnd = calculateEndDate(dropDate, hours, holidays);
         setEndDate(calculatedEnd);
      }
    }
  }, [order, dropDate, holidays]);

  const handleConfirm = () => {
    onConfirm(order.id, {
      process_id: processId,
      start_date: dropDate,
      planned_end_date: endDate
    });
    onClose();
  };

  const allowedProcesses = useMemo(() => {
    if (!order) return [];
    const machineId = order.machine_id;
    const allowedIds = machineProcesses
        .filter(mp => mp.machine_id === machineId && mp.activo)
        .map(mp => mp.process_id);
    
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
          <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-3 rounded-lg border">
             <div>
               <Label className="text-xs text-muted-foreground">Artículo</Label>
               <div className="font-medium">{order.product_article_code || '-'}</div>
               <div className="text-xs text-slate-500 truncate">{order.product_name}</div>
             </div>
             <div className="text-right">
               <Label className="text-xs text-muted-foreground">Cantidad / Cadencia</Label>
               <div className="font-medium">{order.quantity} u</div>
               <div className="text-xs text-slate-500">{order.production_cadence} u/h</div>
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
                <Input value={dropDate ? format(parseISO(dropDate), 'dd/MM/yyyy') : ''} disabled />
             </div>
             <div className="space-y-2">
                <Label>Fecha Fin (Estimada)</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                <p className="text-[10px] text-muted-foreground text-right">
                   Est: {estimatedHours ? Math.ceil(estimatedHours) + 'h' : '-'} ({estimatedHours ? Math.ceil(estimatedHours/24) : '-'} días)
                </p>
             </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!endDate}>Confirmar Programación</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}