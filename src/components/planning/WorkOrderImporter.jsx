import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, FileUp, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQueryClient } from "@tanstack/react-query";

export default function WorkOrderImporter({ machines, processes, onImportSuccess }) {
  const fileInputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const queryClient = useQueryClient();

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const addLog = (type, message) => {
    setLogs(prev => [...prev, { type, message, timestamp: new Date() }]);
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    // Handle DD/MM/YYYY or YYYY-MM-DD
    try {
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        // Assuming 20xx if year is 2 digits
        const fullYear = year.length === 2 ? `20${year}` : year;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return new Date(dateStr).toISOString().split('T')[0];
    } catch (e) {
      return null;
    }
  };

  const processFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsOpen(true);
    setIsProcessing(true);
    setLogs([]);
    setSummary(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const rows = text.split('\n').map(row => row.trim()).filter(row => row.length > 0);
        
        if (rows.length < 2) {
          throw new Error("El archivo CSV está vacío o no tiene formato válido.");
        }

        // Parse Headers (assuming comma or semicolon)
        const separator = rows[0].includes(';') ? ';' : ',';
        const headers = rows[0].split(separator).map(h => h.trim());
        
        // Helper to get value by header
        const getValue = (rowParts, headerName) => {
          const index = headers.findIndex(h => h.toLowerCase() === headerName.toLowerCase());
          return index !== -1 ? rowParts[index]?.trim() : '';
        };

        // Pre-fetch existing orders for UPSERT logic
        addLog('info', 'Obteniendo órdenes existentes...');
        const existingOrders = await base44.entities.WorkOrder.list();
        const existingOrderMap = new Map(existingOrders.map(o => [o.order_number, o]));

        let createdCount = 0;
        let updatedCount = 0;
        let errorCount = 0;
        const validPayloads = [];

        addLog('info', `Procesando ${rows.length - 1} filas...`);

        // Process Rows
        for (let i = 1; i < rows.length; i++) {
          try {
            // Handle CSV parsing complexities (basic split for now, robust enough for standard exports)
            // A robust parser would handle quotes, but simple split is fast for typical data
            const rowParts = rows[i].split(separator); // Simple split
            
            const orderNumber = getValue(rowParts, 'Orden');
            if (!orderNumber) continue; // Skip empty lines

            // 1. Machine Mapping
            const machineName = getValue(rowParts, 'Máquina');
            // Try to match by exact name first, then maybe included? Prompt says "indicador el nombre".
            const machine = machines.find(m => m.nombre.toLowerCase() === machineName.toLowerCase());
            if (!machine) {
              addLog('warning', `Fila ${i}: Máquina '${machineName}' no encontrada. Orden ${orderNumber} omitida.`);
              errorCount++;
              continue;
            }

            // 2. Process Mapping (IGNORED per user request)
            const process = null; 
            // const processName = getValue(rowParts, 'Tipo');
            // const process = processes.find(p => p.nombre.toLowerCase() === processName.toLowerCase());
            // if (!process) {
            //   addLog('warning', `Fila ${i}: Tipo de proceso '${processName}' no encontrado. Orden ${orderNumber} omitida.`);
            //   errorCount++;
            //   continue;
            // }

            // 3. Data Mapping & Transformation
            const priorityStr = getValue(rowParts, 'Pry');
            const priority = parseInt(priorityStr) || 3;
            
            const statusStr = getValue(rowParts, 'Estado');
            const validStatuses = ["Pendiente", "En Progreso", "Completada", "Retrasada", "Cancelada"];
            const status = validStatuses.includes(statusStr) ? statusStr : "Pendiente";
            if (!validStatuses.includes(statusStr) && statusStr) {
               addLog('warning', `Fila ${i}: Estado '${statusStr}' no válido. Se estableció 'Pendiente'.`);
            }

            const deliveryDateStr = getValue(rowParts, 'Nueva Fecha Entrega') || getValue(rowParts, 'Fecha Entrega');
            const committedDeliveryDate = parseDate(deliveryDateStr);
            
            if (!committedDeliveryDate) {
              addLog('warning', `Fila ${i}: Fecha de entrega inválida. Orden ${orderNumber} omitida.`);
              errorCount++;
              continue;
            }

            // Calculations
            const quantity = parseInt(getValue(rowParts, 'Cantidad')) || 0;
            const cadence = parseFloat(getValue(rowParts, 'Cadencia').replace(',', '.')) || 0;
            const estimatedDuration = (quantity && cadence) ? (quantity / cadence) : 0;
            
            const missingComponents = getValue(rowParts, 'Faltas');
            const hasMissing = missingComponents && (missingComponents !== '0' && missingComponents.toLowerCase() !== 'no');
            
            const delayNote = getValue(rowParts, 'Retraso Cliente');
            const hasDelay = !!delayNote;

            const payload = {
              order_number: orderNumber,
              machine_id: machine.id,
              process_id: null, // Process is now optional and configured later
              priority: Math.min(Math.max(priority, 1), 5), // Clamp 1-5
              status: status,
              committed_delivery_date: committedDeliveryDate,
              // Optional / New Fields
              customer_order_reference: getValue(rowParts, 'Su Pedido'),
              external_order_reference: getValue(rowParts, 'Pedido'),
              product_article_code: getValue(rowParts, 'Artículo'),
              product_name: getValue(rowParts, 'Nombre'), // Edo. Art. ignored or mapped? Prompt says "Nombre" -> product_name
              // Edo. Art. -> Maybe used for status? Prompt says Status -> Estado.
              client_name: getValue(rowParts, 'Cliente'),
              material_type: getValue(rowParts, 'Material'),
              product_category: getValue(rowParts, 'Producto'),
              missing_components_flag: hasMissing,
              quantity: quantity,
              production_cadence: cadence,
              has_customer_delay_note: hasDelay,
              notes: getValue(rowParts, 'Observación'),
              machine_location: getValue(rowParts, 'Sala'),
              estimated_duration: parseFloat(estimatedDuration.toFixed(2)),
              // Start date is left empty/existing as per prompt
            };

            const existing = existingOrderMap.get(orderNumber);
            
            // Logic for High Priority (1 & 2): Set start_date to null/empty to put them in "Backlog"
            const isHighPriority = payload.priority <= 2;
            const initialStartDate = isHighPriority ? "" : new Date().toISOString().split('T')[0];

            if (existing) {
              // Preserve existing start date if it's already set, unless we want to force reset?
              // The prompt says "extraeremos... las ordenes con Pry 1 y 2... y lo colocaremos en pequeñas fichas".
              // This implies we might want to "unschedule" them if they are re-imported? 
              // Safer to ONLY set start_date for CREATE, and let user manage updates. 
              // BUT for the specific Pry 1/2 requirement, if they are meant to be draggable chips, they shouldn't have a start_date.
              // I will leave existing start_date alone for updates to avoid messing up manual planning.
              // Only for NEW orders I apply the logic.
              validPayloads.push({ type: 'update', id: existing.id, data: payload });
              updatedCount++;
            } else {
              validPayloads.push({ type: 'create', data: { ...payload, start_date: initialStartDate } }); 
              createdCount++;
            }

          } catch (rowError) {
            addLog('error', `Error en fila ${i}: ${rowError.message}`);
            errorCount++;
          }
        }

        // Execute Batch Operations
        addLog('info', `Guardando ${validPayloads.length} órdenes...`);
        
        // Split for parallel execution
        const createOps = validPayloads.filter(p => p.type === 'create').map(p => p.data);
        const updateOps = validPayloads.filter(p => p.type === 'update');

        if (createOps.length > 0) {
          // Bulk create is efficient
          // Chunking to avoid payload limits if huge
          const chunkSize = 50;
          for (let i = 0; i < createOps.length; i += chunkSize) {
             await base44.entities.WorkOrder.bulkCreate(createOps.slice(i, i + chunkSize));
          }
        }

        // Updates must be sequential or parallel promises
        // Bulk update not available in standard SDK usually unless specific endpoint
        // We'll use Promise.all with concurrency limit pattern if needed, but simple Promise.all is okay for <100
        const updatePromises = updateOps.map(op => base44.entities.WorkOrder.update(op.id, op.data));
        await Promise.all(updatePromises);

        setSummary({
          total: rows.length - 1,
          created: createdCount,
          updated: updatedCount,
          errors: errorCount
        });

        queryClient.invalidateQueries({ queryKey: ['workOrders'] });
        onImportSuccess?.();
        toast.success("Importación completada");

      } catch (err) {
        addLog('error', `Error general: ${err.message}`);
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={processFile}
        className="hidden"
        accept=".csv"
      />
      <Button 
        variant="outline" 
        onClick={handleButtonClick}
        className="gap-2"
      >
        <FileUp className="w-4 h-4" />
        Importar CSV
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importación de Órdenes</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm text-slate-500">Procesando archivo...</p>
              </div>
            ) : summary ? (
              <div className="space-y-4">
                <Alert variant={summary.errors > 0 ? "destructive" : "default"} className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Proceso Finalizado</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Se procesaron {summary.total} filas.
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="font-bold text-blue-700">{summary.created}</div>
                    <div className="text-xs text-blue-600">Creadas</div>
                  </div>
                  <div className="bg-yellow-50 p-2 rounded">
                    <div className="font-bold text-yellow-700">{summary.updated}</div>
                    <div className="text-xs text-yellow-600">Actualizadas</div>
                  </div>
                  <div className="bg-red-50 p-2 rounded">
                    <div className="font-bold text-red-700">{summary.errors}</div>
                    <div className="text-xs text-red-600">Errores</div>
                  </div>
                </div>
              </div>
            ) : null}

            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              <div className="space-y-2">
                {logs.map((log, i) => (
                  <div key={i} className={`text-xs flex gap-2 ${
                    log.type === 'error' ? 'text-red-600' : 
                    log.type === 'warning' ? 'text-yellow-600' : 'text-slate-600'
                  }`}>
                    <span className="opacity-50">[{log.timestamp.toLocaleTimeString()}]</span>
                    <span>{log.message}</span>
                  </div>
                ))}
                {logs.length === 0 && !isProcessing && (
                  <div className="text-xs text-slate-400 text-center">Esperando archivo...</div>
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsOpen(false)} disabled={isProcessing}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}