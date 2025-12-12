import React, { useRef, useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, FileUp, AlertCircle, CheckCircle2, Loader2, ArrowRight, Settings2, Save } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const SYSTEM_FIELDS = [
  { key: 'order_number', label: 'Orden (ID)', required: true },
  { key: 'machine_name', label: 'Máquina (Nombre)', required: true },
  { key: 'machine_location', label: 'Sala / Ubicación' },
  { key: 'priority', label: 'Prioridad (Pry)' },
  { key: 'product_article_code', label: 'Artículo' },
  { key: 'product_name', label: 'Nombre Producto' },
  { key: 'client_name', label: 'Cliente' },
  { key: 'quantity', label: 'Cantidad', type: 'number' },
  { key: 'production_cadence', label: 'Cadencia', type: 'number' },
  { key: 'committed_delivery_date', label: 'Fecha Entrega' },
  { key: 'status', label: 'Estado' },
  { key: 'notes', label: 'Observaciones' },
  { key: 'external_order_reference', label: 'Pedido Externo' },
  { key: 'customer_order_reference', label: 'Su Pedido' },
];

export default function WorkOrderImporter({ machines, processes, onImportSuccess }) {
  const fileInputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
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

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
            h.toLowerCase() === field.label.toLowerCase() || 
            h.toLowerCase() === field.key.toLowerCase() ||
            (field.key === 'machine_name' && h.toLowerCase() === 'máquina') ||
            (field.key === 'machine_location' && h.toLowerCase() === 'sala') ||
            (field.key === 'priority' && h.toLowerCase() === 'pry') ||
            (field.key === 'product_name' && h.toLowerCase() === 'nombre') ||
            (field.key === 'order_number' && h.toLowerCase() === 'orden')
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
               // Try exact match on name or code
               if (m.nombre.toLowerCase() === nameLower) return true;
               if (m.codigo && m.codigo.toLowerCase() === nameLower) return true;
               
               // Try partial match: if DB name/code is contained in CSV string (e.g. "R V-TK-002" in "R V-TK-002 REACTOR...")
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
          const priority = parseInt(getValue(row, 'priority')) || 3;
          const statusRaw = getValue(row, 'status');
          const validStatuses = ["Pendiente", "En Progreso", "Completada", "Retrasada", "Cancelada"];
          const status = validStatuses.includes(statusRaw) ? statusRaw : "Pendiente";
          
          const deliveryDate = parseDate(getValue(row, 'committed_delivery_date'));
          if (!deliveryDate) {
             addLog('warning', `Fila ${i+1}: Fecha de entrega inválida/faltante. Orden ${orderNumber} omitida.`);
             errorCount++;
             continue;
          }

          // Duration Calculation
          const quantity = parseInt(getValue(row, 'quantity')) || 0;
          const cadence = parseFloat((getValue(row, 'production_cadence') || '0').replace(',', '.'));
          
          // Duration in HOURS
          const estimatedDuration = (quantity && cadence) ? (quantity / cadence) : 0;

          const payload = {
            order_number: orderNumber,
            machine_id: machine.id,
            machine_location: getValue(row, 'machine_location'),
            priority: Math.min(Math.max(priority, 1), 5),
            status: status,
            committed_delivery_date: deliveryDate,
            product_article_code: getValue(row, 'product_article_code'),
            product_name: getValue(row, 'product_name'),
            client_name: getValue(row, 'client_name'),
            quantity: quantity,
            production_cadence: cadence,
            estimated_duration: parseFloat(estimatedDuration.toFixed(2)),
            notes: getValue(row, 'notes'),
            external_order_reference: getValue(row, 'external_order_reference'),
            customer_order_reference: getValue(row, 'customer_order_reference'),
            // Flags if mapped? Simplified for now
          };

          const existing = existingOrderMap.get(orderNumber);
          
          // High Priority (1-2) Logic: Put in backlog (no start_date)
          const isHighPriority = payload.priority <= 2;
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

      setSummary({
        total: csvRows.length,
        created: createdCount,
        updated: updatedCount,
        errors: errorCount
      });
      
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      onImportSuccess?.();
      setStep('result');

    } catch (err) {
      addLog('error', `Fallo crítico: ${err.message}`);
      setStep('result');
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
      <Button 
        variant="outline" 
        onClick={handleButtonClick}
        className="gap-2"
      >
        <FileUp className="w-4 h-4" />
        Importar CSV
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => { if (!isProcessing) { setIsOpen(open); if (!open) resetState(); } }}>
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
            {step === 'result' && (
              <Button onClick={() => setIsOpen(false)}>Cerrar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}