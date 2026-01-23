import { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileUp, Settings2, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SYSTEM_FIELDS = [
  { key: 'priority', label: 'Prioridad' },
  { key: 'type', label: 'Tipo' },
  { key: 'status', label: 'Estado' },
  { key: 'machine_location', label: 'Sala' },
  { key: 'machine_name', label: 'Máquina', required: true },
  { key: 'customer_order_reference', label: 'Su Pedido' },
  { key: 'external_order_reference', label: 'Pedido' },
  { key: 'order_number', label: 'Orden', required: true },
  { key: 'product_article_code', label: 'Artículo' },
  { key: 'product_name', label: 'Nombre' },
  { key: 'article_status', label: 'Edo. Art.' },
  { key: 'client_name', label: 'Cliente' },
  { key: 'material', label: 'Material' },
  { key: 'product_description', label: 'Producto' },
  { key: 'missing_components', label: 'Faltas' },
  { key: 'quantity', label: 'Cantidad', type: 'number' },
  { key: 'committed_delivery_date', label: 'Fecha Entrega' },
  { key: 'new_delivery_date', label: 'Nueva Fecha Entrega' },
  { key: 'delivery_compliance', label: 'Cumplimiento entrega' },
  { key: 'multi_unit', label: 'MultUnid' },
  { key: 'multi_quantity', label: 'Mult x Cantidad', type: 'number' },
  { key: 'production_cadence', label: 'Cadencia', type: 'number' },
  { key: 'delay_reason', label: 'Motivo Retraso' },
  { key: 'components_deadline', label: 'Fecha limite componentes' },
  { key: 'start_deadline', label: 'Fecha Inicio Limite' },
  { key: 'start_modified', label: 'Fecha Inicio Modificada' },
  { key: 'end_date', label: 'Fecha Fin' },
  { key: 'notes', label: 'Observación' },
];

export default function WorkOrderImporter({ machines, processes: _processes, onImportSuccess }) {
  const fileInputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const abortRef = useRef(false);
  const [step, setStep] = useState('upload'); // upload, mapping, processing, result

  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
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

  const resetState = () => {
    setStep('upload');
    setCsvHeaders([]);
    setCsvRows([]);
    setFieldMapping({});
    setLogs([]);
    setSummary(null);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteAll = async () => {
    if (!confirm("¿Estás seguro de que deseas eliminar TODAS las órdenes de trabajo? Esta acción no se puede deshacer.")) return;
    
    try {
      const orders = await base44.entities.WorkOrder.list();
      const count = orders.length;
      if (count === 0) {
        toast.info("No hay órdenes para eliminar.");
        return;
      }

      toast.loading(`Eliminando ${count} órdenes...`, { id: 'delete-all' });
      
      // Delete in batches with delay to avoid 429 errors
      const chunkSize = 5; // Reduced from 20 to 5
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      for (let i = 0; i < orders.length; i += chunkSize) {
        const batch = orders.slice(i, i + chunkSize);
        
        // Process batch safely, ignoring 404s
        await Promise.all(batch.map(async (o) => {
          try {
            await base44.entities.WorkOrder.delete(o.id);
          } catch (error) {
            // Ignore 404 errors (entity already deleted)
            // Check both status property and message content for robustness
            const is404 = error.status === 404 || 
                          (error.message && error.message.includes('404')) ||
                          (error.response && error.response.status === 404);
            
            if (!is404) {
              throw error; // Re-throw other errors to be caught by main try/catch
            }
          }
        }));
        
        // Update toast progress
        toast.loading(`Eliminando... (${Math.min(i + chunkSize, count)}/${count})`, { id: 'delete-all' });
        
        // Wait between batches to respect API rate limits
        if (i + chunkSize < orders.length) {
          await delay(1000); // 1 second delay between batches
        }
      }
      
      toast.success(`${count} órdenes eliminadas correctamente.`, { id: 'delete-all' });
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
    } catch (err) {
      toast.error("Error eliminando órdenes: " + err.message, { id: 'delete-all' });
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset state but keep the file input value for now (or reset it later)
    setStep('upload');
    setCsvHeaders([]);
    setCsvRows([]);
    setFieldMapping({});
    setLogs([]);
    setSummary(null);
    setIsProcessing(false);
    
    // We don't clear fileInputRef.current.value here because we just used it.
    // It will be cleared when dialog closes or resetState is called explicitly.

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const rows = text.split('\n').map(row => row.trim()).filter(row => row.length > 0);
        
        if (rows.length < 2) {
          toast.error("El archivo CSV está vacío o no tiene formato válido.");
          return;
        }

        // Detect separator
        const separator = rows[0].includes(';') ? ';' : ',';
        const headers = rows[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
        
        setCsvHeaders(headers);
        setCsvRows(rows.slice(1).map(r => r.split(separator).map(c => c.trim().replace(/^"|"$/g, ''))));
        
        // Auto-map based on name similarity
        const initialMapping = {};
        SYSTEM_FIELDS.forEach(field => {
          const match = headers.find(h => 
            h.toLowerCase().trim() === field.label.toLowerCase().trim() || 
            h.toLowerCase().trim() === field.key.toLowerCase().trim()
          );
          if (match) initialMapping[field.key] = match;
        });
        setFieldMapping(initialMapping);
        
        setStep('mapping');
        setIsOpen(true);
      } catch (err) {
        toast.error("Error al leer el archivo: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const executeImport = async () => {
    setStep('processing');
    setIsProcessing(true);
    abortRef.current = false;
    setLogs([]);
    setSummary(null);

    try {
      addLog('info', 'Iniciando importación...');
      
      // Fetch existing
      const existingOrders = await base44.entities.WorkOrder.list();
      const existingOrderMap = new Map(existingOrders.map(o => [o.order_number, o]));
      
      let createdCount = 0;
      let updatedCount = 0;
      let errorCount = 0;
      const validPayloads = [];

      // Helper to get mapped value
      const getValue = (rowArray, fieldKey) => {
        const headerName = fieldMapping[fieldKey];
        if (!headerName) return null;
        const index = csvHeaders.indexOf(headerName);
        return index !== -1 ? rowArray[index] : null;
      };

      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        try {
          // DD/MM/YYYY
          if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            const fullYear = year.length === 2 ? `20${year}` : year;
            return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          return new Date(dateStr).toISOString().split('T')[0];
        } catch { return null; }
      };

      for (let i = 0; i < csvRows.length; i++) {
        if (abortRef.current) break;
        const row = csvRows[i];
        try {
          const orderNumber = getValue(row, 'order_number');
          if (!orderNumber) continue;

          // Machine Lookup
          const machineName = getValue(row, 'machine_name');
          let machine = null;
          
          if (machineName) {
            const nameLower = machineName.toLowerCase();
            machine = machines.find(m => {
               // 1. Try exact match on description (highest priority)
               if (m.descripcion && m.descripcion.toLowerCase() === nameLower) return true;

               // 2. Try exact match on name
               if (m.nombre.toLowerCase() === nameLower) return true;

               // 3. Try exact match on code
               if (m.codigo && m.codigo.toLowerCase() === nameLower) return true;
               
               // 4. Try partial match: if DB description/name/code is contained in CSV string
               if (m.descripcion && m.descripcion.length > 3 && nameLower.includes(m.descripcion.toLowerCase())) return true;
               if (m.nombre.length > 3 && nameLower.includes(m.nombre.toLowerCase())) return true;
               if (m.codigo && m.codigo.length > 3 && nameLower.includes(m.codigo.toLowerCase())) return true;
               
               return false;
            });
          }
          
          if (!machine) {
            addLog('warning', `Fila ${i+1}: Máquina '${machineName}' no encontrada. Orden ${orderNumber} omitida.`);
            errorCount++;
            continue;
          }

          // Fields
          const priorityStr = getValue(row, 'priority');
          let priority = null;
          if (priorityStr && priorityStr.trim() !== '') {
            const parsed = parseInt(priorityStr);
            if (!isNaN(parsed)) {
              priority = parsed;
            }
          }
          
          const statusRaw = getValue(row, 'status');
          const status = statusRaw || "Pendiente";
          
          const deliveryDate = parseDate(getValue(row, 'committed_delivery_date'));
          // Relaxed validation: Allow missing delivery date
          if (!deliveryDate && getValue(row, 'committed_delivery_date')) {
             addLog('warning', `Fila ${i+1}: Fecha de entrega con formato desconocido. Se guardará sin fecha.`);
          }

          // Duration Calculation
          const quantity = parseFloat((getValue(row, 'quantity') || '0').replace(',', '.'));
          const cadence = parseFloat((getValue(row, 'production_cadence') || '0').replace(',', '.'));
          const multiQuantity = parseFloat((getValue(row, 'multi_quantity') || '0').replace(',', '.'));
          
          // Duration in HOURS
          const estimatedDuration = (quantity && cadence) ? (quantity / cadence) : 0;

          const payload = {
            order_number: orderNumber,
            machine_id: machine.id,
            machine_location: getValue(row, 'machine_location'),
            priority: priority,
            type: getValue(row, 'type'),
            status: status,
            committed_delivery_date: deliveryDate,
            new_delivery_date: parseDate(getValue(row, 'new_delivery_date')),
            delivery_compliance: getValue(row, 'delivery_compliance'),
            
            product_article_code: getValue(row, 'product_article_code'),
            product_name: getValue(row, 'product_name'),
            article_status: getValue(row, 'article_status'),
            client_name: getValue(row, 'client_name'),
            material: getValue(row, 'material'),
            product_description: getValue(row, 'product_description'),
            missing_components: getValue(row, 'missing_components'),
            
            quantity: quantity,
            production_cadence: cadence,
            multi_unit: getValue(row, 'multi_unit'),
            multi_quantity: multiQuantity,
            
            estimated_duration: parseFloat(estimatedDuration.toFixed(2)),
            
            delay_reason: getValue(row, 'delay_reason'),
            components_deadline: parseDate(getValue(row, 'components_deadline')),
            start_deadline: parseDate(getValue(row, 'start_deadline')),
            start_modified: parseDate(getValue(row, 'start_modified')),
            end_date: parseDate(getValue(row, 'end_date')),
            
            notes: getValue(row, 'notes'),
            external_order_reference: getValue(row, 'external_order_reference'),
            customer_order_reference: getValue(row, 'customer_order_reference'),
          };

          const existing = existingOrderMap.get(orderNumber);
          
          // High Priority (1-2) Logic: Put in backlog (no start_date)
          // For new orders: if high priority -> no start date. else -> today (or also backlog? user said "extract... to chips", implies backlog)
          // Actually, let's put ALL imported orders in backlog (no start_date) unless user manually schedules.
          // BUT previous logic set start_date=today for low priority. User's new prompt implies a backlog/chip workflow.
          // I will set start_date = "" for ALL imported orders to force manual scheduling via drag-drop, which seems to be the new workflow.
          // Exception: updates preserve existing start_date.

          if (existing) {
             validPayloads.push({ type: 'update', id: existing.id, data: payload });
             updatedCount++;
          } else {
             validPayloads.push({ type: 'create', data: { ...payload, start_date: "" } }); 
             createdCount++;
          }

        } catch (err) {
          addLog('error', `Error fila ${i+1}: ${err.message}`);
          errorCount++;
        }
      }

      // Batch Write
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const createOps = validPayloads.filter(p => p.type === 'create').map(p => p.data);
      const updateOps = validPayloads.filter(p => p.type === 'update');

      // Create in smaller batches with delay
      if (createOps.length > 0) {
        const chunkSize = 20;
        for (let i = 0; i < createOps.length; i += chunkSize) {
            if (abortRef.current) break;
            try {
                await base44.entities.WorkOrder.bulkCreate(createOps.slice(i, i + chunkSize));
                await delay(1000); // 1s delay between creation batches
            } catch (e) {
                console.error("Batch create error:", e);
                addLog('error', `Error creando lote ${Math.floor(i/chunkSize) + 1}: ${e.message}`);
                // If rate limit, wait longer
                if (e.message && e.message.toLowerCase().includes("rate limit")) {
                    await delay(5000);
                }
            }
        }
      }

      // Updates strictly sequential with robust backoff strategy
      for (let i = 0; i < updateOps.length; i++) {
        if (abortRef.current) break;
        const op = updateOps[i];
        let retries = 0;
        const maxRetries = 5; // Increased retries
        let success = false;

        while (!success && retries <= maxRetries) {
            try {
                await base44.entities.WorkOrder.update(op.id, op.data);
                success = true;
                updatedCount++; // Track success count
                // Adaptive delay: Start slow (500ms), can go faster if we implemented token bucket, 
                // but for safety staying at 500ms is best for stability.
                await delay(500); 
            } catch (e) {
                const isRateLimit = e.message && (e.message.toLowerCase().includes("rate limit") || e.message.includes("429"));
                
                if (isRateLimit && retries < maxRetries) {
                    retries++;
                    // Exponential backoff: 2s, 4s, 8s, 16s, 32s
                    const waitTime = Math.pow(2, retries) * 1000; 
                    addLog('warning', `Límite de velocidad en orden ${op.data.order_number}. Reintento ${retries}/${maxRetries} en ${waitTime/1000}s...`);
                    await delay(waitTime);
                } else {
                    // Non-recoverable error or max retries exceeded
                    const errorMsg = isRateLimit ? "Límite de velocidad persistente" : e.message;
                    addLog('error', `Error actualizando orden ${op.data.order_number}: ${errorMsg}`);
                    errorCount++;
                    break; // Stop retrying this item
                }
            }
        }
      }

      // Summary Toast
      if (createdCount + updatedCount === 0) {
        if (errorCount > 0) {
            toast.error(`No se importaron órdenes. ${errorCount} filas omitidas por errores. Revise el log.`);
        } else {
            toast.warning("No se encontraron órdenes válidas para importar.");
        }
      } else {
        toast.success(`Importación completada: ${createdCount} creadas, ${updatedCount} actualizadas.`);
      }

      setSummary({ created: createdCount, updated: updatedCount, errors: errorCount });
      
      if (createdCount > 0 || updatedCount > 0) {
        onImportSuccess?.();
        queryClient.invalidateQueries({ queryKey: ['workOrders'] });
        setTimeout(() => setIsOpen(false), 2000);
      }
    } catch (err) {
      console.error(err);
      addLog('error', `Error general: ${err.message}`);
      toast.error("Error en el proceso de importación");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".csv"
      />
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          onClick={handleDeleteAll}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
        >
          Limpiar Datos
        </Button>
        <Button 
          variant="outline" 
          onClick={handleButtonClick}
          className="gap-2"
        >
          <FileUp className="w-4 h-4" />
          Importar CSV
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => { 
        if (!open) {
          if (isProcessing) abortRef.current = true;
          resetState();
        }
        setIsOpen(open); 
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Gestor de Importación de Órdenes</DialogTitle>
            <DialogDescription>
              {step === 'mapping' && "Verifica y asigna las columnas del CSV a los campos del sistema."}
              {step === 'processing' && "Procesando registros..."}
              {step === 'result' && "Resumen de la importación."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {step === 'mapping' && (
              <div className="space-y-4">
                 <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700 flex items-start gap-2">
                   <Settings2 className="w-4 h-4 mt-0.5" />
                   <div>
                     <p className="font-semibold">Configuración de Mapeo</p>
                     <p>Asegúrate de enlazar correctamente la columna de "Orden", "Máquina" y "Fecha Entrega".</p>
                   </div>
                 </div>

                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead className="w-[200px]">Campo Sistema</TableHead>
                       <TableHead>Columna CSV</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {SYSTEM_FIELDS.map(field => (
                       <TableRow key={field.key}>
                         <TableCell className="font-medium">
                           {field.label} {field.required && <span className="text-red-500">*</span>}
                         </TableCell>
                         <TableCell>
                           <Select 
                             value={fieldMapping[field.key] || "ignore"} 
                             onValueChange={(val) => setFieldMapping({...fieldMapping, [field.key]: val === "ignore" ? null : val})}
                           >
                             <SelectTrigger>
                               <SelectValue placeholder="Ignorar columna" />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="ignore" className="text-muted-foreground italic">-- Ignorar --</SelectItem>
                               {csvHeaders.map(header => (
                                 <SelectItem key={header} value={header}>{header}</SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
              </div>
            )}

            {(step === 'processing' || step === 'result') && (
              <div className="space-y-4">
                 {summary && (
                   <div className="grid grid-cols-3 gap-4 mb-4">
                     <div className="bg-green-100 p-4 rounded-lg text-center">
                       <div className="text-2xl font-bold text-green-700">{summary.created}</div>
                       <div className="text-sm text-green-600">Creadas</div>
                     </div>
                     <div className="bg-blue-100 p-4 rounded-lg text-center">
                       <div className="text-2xl font-bold text-blue-700">{summary.updated}</div>
                       <div className="text-sm text-blue-600">Actualizadas</div>
                     </div>
                     <div className="bg-red-100 p-4 rounded-lg text-center">
                       <div className="text-2xl font-bold text-red-700">{summary.errors}</div>
                       <div className="text-sm text-red-600">Errores</div>
                     </div>
                   </div>
                 )}
                 
                 <div className="border rounded-md">
                   <div className="bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-500 border-b">Log de Procesamiento</div>
                   <ScrollArea className="h-[200px] p-4">
                     <div className="space-y-1">
                       {logs.map((log, i) => (
                         <div key={i} className={`text-xs font-mono ${
                           log.type === 'error' ? 'text-red-600 font-bold' : 
                           log.type === 'warning' ? 'text-yellow-600' : 'text-slate-600'
                         }`}>
                           <span className="opacity-50 mr-2">[{log.timestamp.toLocaleTimeString()}]</span>
                           {log.message}
                         </div>
                       ))}
                     </div>
                   </ScrollArea>
                 </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {step === 'mapping' && (
              <Button onClick={executeImport} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                Procesar e Importar
              </Button>
            )}
            {step === 'processing' && (
              <div className="flex gap-2">
                 <Button variant="destructive" onClick={() => abortRef.current = true}>
                   Detener
                 </Button>
                 <Button variant="secondary" onClick={() => setIsOpen(false)}>
                   Cerrar
                 </Button>
              </div>
            )}
            {step === 'result' && (
              <Button onClick={() => setIsOpen(false)}>Cerrar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
