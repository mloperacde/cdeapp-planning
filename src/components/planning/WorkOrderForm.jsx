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
import { Calculator, ArrowLeft } from "lucide-react";
import { getEligibleProcessesForMachine, getEligibleMachinesForProcess } from "@/lib/domain/planning";
import { addDays, subDays, format, isWeekend, parseISO } from "date-fns";
import StaffRequirementEditor from "./StaffRequirementEditor";

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
    planned_end_date: "",
    personal_requerido: []
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
        planned_end_date: orderToEdit.planned_end_date || orderToEdit.end_date || "",
        personal_requerido: Array.isArray(orderToEdit.personal_requerido) ? orderToEdit.personal_requerido : []
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
        planned_end_date: "",
        personal_requerido: []
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

  // --- Asprova Feature: Backward Scheduling (JIT) ---
  const calculateJITStartDate = () => {
      const { quantity, production_cadence, committed_delivery_date } = formData;
      
      if (!quantity || !production_cadence || !committed_delivery_date) {
          toast.error("Faltan datos para el cálculo (Cantidad, Cadencia o Fecha Entrega)");
          return;
      }

      // 1. Calculate Duration in Days (rounding up)
      // Cadence = units / hour (usually) or hours / unit? 
      // User context implies "Cadence" might be units/hour. Let's assume units/hour.
      // If cadence is 100 and qty is 1000 -> 10 hours.
      // If we assume 24h shifts for now (simplification), or 8h? 
      // Let's assume continuous production (24h) for simple calculation or 1 day min.
      // Better: Ask user? No, assume standard day (24h for machines).
      
      const unitsPerHour = parseFloat(production_cadence);
      const qty = parseInt(quantity);
      if (unitsPerHour <= 0) return;

      const totalHours = qty / unitsPerHour;
      const totalDays = Math.ceil(totalHours / 24); // Simple approximation

      // 2. Backward Calculation: Delivery Date - Duration
      let calcDate = parseISO(committed_delivery_date);
      let daysToSubtract = totalDays;

      // Skip weekends logic (optional, but "Asprova" usually respects calendars)
      while (daysToSubtract > 0) {
          calcDate = subDays(calcDate, 1);
          if (!isWeekend(calcDate)) {
              daysToSubtract--;
          }
      }

      const jitDateStr = format(calcDate, 'yyyy-MM-dd');
      
      setFormData(prev => ({
          ...prev,
          start_date: jitDateStr,
          planned_end_date: committed_delivery_date, // End is delivery
          // Clear manual overrides to respect this new calculation
          modified_start_date: null,
          new_delivery_date: null 
      }));

      toast.success(`Cálculo JIT aplicado: Inicio sugerido ${jitDateStr} (${totalDays} días prod.)`, {
          description: "Basado en Cantidad / Cadencia (Backward Scheduling)"
      });
  };

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

        // Personal requerido por orden de trabajo
        personal_requerido: Array.isArray(data.personal_requerido) ? data.personal_requerido : [],
        operadores_requeridos: Array.isArray(data.personal_requerido)
          ? data.personal_requerido.reduce((s, r) => s + (Number(r.cantidad_operarios) || 0), 0)
          : null,

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
            
            // Check overlap (strict): se permite back-to-back el mismo día,
            // es decir, si una orden termina el día X, otra puede empezar el día X.
            // newStart < oEnd && newEnd > oStart  → solapamiento real (comparten >1 día)
            return newStart < oEnd && newEnd > oStart;
            });

            if (conflict) {
             toast.error(`Conflicto de capacidad: Solapa con orden ${conflict.order_number}`, {
                 description: "Una máquina no puede procesar dos órdenes a la vez. Se permite encadenar el mismo día de fin/inicio."
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
      <DialogContent className="!w-[min(95vw,1100px)] !max-w-none p-5">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">{orderToEdit ? "Editar Orden de Trabajo" : "Nueva Orden de Trabajo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
          {/* Columna izquierda: Planificación */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Número Orden *</Label>
                <Input className="h-8 text-sm" value={formData.order_number} onChange={(e) => setFormData({...formData, order_number: e.target.value})} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prioridad *</Label>
                <Select value={formData.priority} onValueChange={(val) => setFormData({...formData, priority: val})}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map(p => (
                      <SelectItem key={p} value={p.toString()}>{p} - {p === 1 ? "Máxima" : p === 5 ? "Mínima" : "Normal"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Máquina *</Label>
              <Select value={formData.machine_id} onValueChange={(val) => setFormData(prev => ({...prev, machine_id: val}))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar máquina" /></SelectTrigger>
                <SelectContent>
                  {availableMachines.map(m => (<SelectItem key={m.id} value={m.id}>{m.alias || m.nombre}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Proceso *</Label>
              <Select value={formData.process_id} onValueChange={(val) => setFormData(prev => ({...prev, process_id: val}))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar proceso" /></SelectTrigger>
                <SelectContent>
                  {availableProcesses.map(p => (<SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {currentOperators && (
              <div className="flex justify-end -mt-1">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 text-[10px] py-0">Requiere: {currentOperators} operador(es)</Badge>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs flex justify-between items-center">
                  Fecha Inicio *
                  <Button type="button" variant="ghost" size="sm" className="h-5 text-[10px] text-blue-600 px-1 hover:bg-blue-50" onClick={calculateJITStartDate} title="Backward Scheduling (Asprova)">
                    <Calculator className="w-3 h-3 mr-1" />Calc. JIT
                  </Button>
                </Label>
                <Input type="date" className="h-8 text-sm" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha Entrega *</Label>
                <Input type="date" className="h-8 text-sm" value={formData.committed_delivery_date} onChange={(e) => setFormData({...formData, committed_delivery_date: e.target.value})} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Fecha Fin</Label>
                <Input type="date" className="h-8 text-sm" value={formData.planned_end_date} onChange={(e) => setFormData({...formData, planned_end_date: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cadencia</Label>
                <Input type="number" className="h-8 text-sm" value={formData.production_cadence} onChange={(e) => setFormData({...formData, production_cadence: e.target.value})} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Estado</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="En Progreso">En Progreso</SelectItem>
                  <SelectItem value="Completada">Completada</SelectItem>
                  <SelectItem value="Retrasada">Retrasada</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Columna derecha: Detalles + Personal */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Detalles del Producto</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Cliente</Label>
                <Input className="h-8 text-sm" value={formData.client_name} onChange={(e) => setFormData({...formData, client_name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Artículo / Referencia</Label>
                <Input className="h-8 text-sm" value={formData.product_article_code} onChange={(e) => setFormData({...formData, product_article_code: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cantidad</Label>
                <Input type="number" className="h-8 text-sm" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descripción / Nombre</Label>
                <Input className="h-8 text-sm" value={formData.product_name} onChange={(e) => setFormData({...formData, product_name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Material</Label>
                <Input className="h-8 text-sm" value={formData.material_type} onChange={(e) => setFormData({...formData, material_type: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Producto</Label>
                <Input className="h-8 text-sm" value={formData.product_category} onChange={(e) => setFormData({...formData, product_category: e.target.value})} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Estado Artículo (se agrega a notas)</Label>
                <Input className="h-8 text-sm" value={formData.part_status} onChange={(e) => setFormData({...formData, part_status: e.target.value})} />
              </div>
            </div>

            <StaffRequirementEditor
              value={formData.personal_requerido}
              onChange={(val) => setFormData(prev => ({ ...prev, personal_requerido: val }))}
            />
          </div>

          {/* Fila inferior completa: Notas + acciones */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-x-6 gap-y-3 pt-2 border-t">
            <div className="space-y-1">
              <Label className="text-xs">Notas</Label>
              <Textarea className="text-sm min-h-[60px]" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2} />
            </div>
            <div className="flex justify-end items-end gap-2">
              {orderToEdit && (
                <Button type="button" variant="destructive" className="h-8" onClick={handleDelete}>Eliminar</Button>
              )}
              <Button type="button" variant="outline" className="h-8" onClick={onClose}>Cancelar</Button>
              <Button type="submit" className="h-8 bg-blue-600 hover:bg-blue-700">Guardar</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
  }