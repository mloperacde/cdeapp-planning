import { useRef, useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { FileUp, Settings2, Save, AlertTriangle, CheckCircle, XCircle, ArrowRight, ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import Papa from 'papaparse';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

const SYSTEM_FIELDS = [
  { key: 'order_number', label: 'Orden', required: true, description: 'Identificador único de la orden' },
  { key: 'machine_name', label: 'Máquina', required: true, description: 'Nombre, código o descripción de la máquina' },
  { key: 'priority', label: 'Prioridad', type: 'number', description: '1 (Alta) a 5 (Baja)' },
  { key: 'status', label: 'Estado', description: 'Pendiente, En Proceso, etc.' },
  { key: 'committed_delivery_date', label: 'Fecha Entrega', type: 'date', description: 'DD/MM/YYYY o YYYY-MM-DD' },
  { key: 'quantity', label: 'Cantidad', type: 'number' },
  { key: 'production_cadence', label: 'Cadencia', type: 'number' },
  { key: 'customer_order_reference', label: 'Su Pedido' },
  { key: 'external_order_reference', label: 'Pedido' },
  { key: 'product_article_code', label: 'Artículo' },
  { key: 'product_name', label: 'Nombre' },
  { key: 'product_description', label: 'Producto/Descripción' },
  { key: 'client_name', label: 'Cliente' },
  { key: 'material', label: 'Material' },
  { key: 'article_status', label: 'Edo. Art.' },
  { key: 'missing_components', label: 'Faltas' },
  { key: 'multi_unit', label: 'MultUnid' },
  { key: 'multi_quantity', label: 'Mult x Cantidad', type: 'number' },
  { key: 'delay_reason', label: 'Motivo Retraso' },
  { key: 'components_deadline', label: 'Fecha limite componentes', type: 'date' },
  { key: 'start_deadline', label: 'Fecha Inicio Limite', type: 'date' },
  { key: 'start_modified', label: 'Fecha Inicio Modificada', type: 'date' },
  { key: 'end_date', label: 'Fecha Fin', type: 'date' },
  { key: 'notes', label: 'Observación' },
];

export default function WorkOrderImporter({ machines, onImportSuccess }) {
  const fileInputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const abortRef = useRef(false);
  
  // Steps: upload -> mapping -> preview -> processing -> result
  const [step, setStep] = useState('upload'); 

  // Data State
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
  const [previewRows, setPreviewRows] = useState([]);
  const [validationStats, setValidationStats] = useState({ total: 0, valid: 0, invalid: 0 });
  
  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  
  const queryClient = useQueryClient();

  const resetState = () => {
    setStep('upload');
    setCsvHeaders([]);
    setCsvData([]);
    setFieldMapping({});
    setPreviewRows([]);
    setValidationStats({ total: 0, valid: 0, invalid: 0 });
    setLogs([]);
    setSummary(null);
    setIsProcessing(false);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addLog = (type, message) => {
    setLogs(prev => [...prev, { type, message, timestamp: new Date() }]);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetState(); // Reset previous state
    setIsOpen(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8", // Force UTF-8 usually works best
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const headers = results.meta.fields || Object.keys(results.data[0]);
          setCsvHeaders(headers);
          setCsvData(results.data);
          
          // Auto-map fields
          const initialMapping = {};
          SYSTEM_FIELDS.forEach(field => {
            // Try exact match
            let match = headers.find(h => h.toLowerCase().trim() === field.key.toLowerCase().trim());
            // Try label match
            if (!match) match = headers.find(h => h.toLowerCase().trim() === field.label.toLowerCase().trim());
            // Try loose match
            if (!match) match = headers.find(h => h.toLowerCase().includes(field.label.toLowerCase()) || h.toLowerCase().includes(field.key.toLowerCase()));
            
            if (match) initialMapping[field.key] = match;
          });
          setFieldMapping(initialMapping);
          setStep('mapping');
        } else {
          toast.error("El archivo CSV parece estar vacío o no tiene formato válido.");
        }
      },
      error: (error) => {
        toast.error(`Error al leer CSV: ${error.message}`);
      }
    });
  };

  // --- Validation Logic ---

  const validateRow = (row, index) => {
    const errors = [];
    const warnings = [];
    const mappedData = {};

    // 1. Map fields first
    Object.entries(fieldMapping).forEach(([sysKey, csvHeader]) => {
      if (csvHeader && csvHeader !== 'ignore') {
        mappedData[sysKey] = row[csvHeader]?.trim();
      }
    });

    // 2. Validate Required Fields
    SYSTEM_FIELDS.filter(f => f.required).forEach(field => {
      if (!mappedData[field.key]) {
        errors.push(`Campo requerido faltante: ${field.label}`);
      }
    });

    // 3. Machine Lookup
    let machineId = null;
    let machineLocation = mappedData['machine_location'];
    
    if (mappedData['machine_name']) {
      const nameLower = mappedData['machine_name'].toLowerCase();
      // Strategy: Exact Code -> Exact Name -> Exact Desc -> Partial Code -> Partial Name
      let machine = machines.find(m => m.codigo && m.codigo.toLowerCase() === nameLower);
      if (!machine) machine = machines.find(m => m.nombre && m.nombre.toLowerCase() === nameLower);
      if (!machine) machine = machines.find(m => m.descripcion && m.descripcion.toLowerCase() === nameLower);
      
      // Fuzzy / Partial fallback
      if (!machine) {
         machine = machines.find(m => 
           (m.codigo && m.codigo.toLowerCase().includes(nameLower)) ||
           (m.nombre && m.nombre.toLowerCase().includes(nameLower)) ||
           (m.descripcion && m.descripcion.toLowerCase().includes(nameLower))
         );
      }

      if (machine) {
        machineId = machine.id;
        // If csv didn't provide location, try to use machine's location if available (not standard prop but good to have)
      } else {
        errors.push(`Máquina no encontrada: '${mappedData['machine_name']}'`);
      }
    }

    // 4. Date Parsing
    const dateFields = SYSTEM_FIELDS.filter(f => f.type === 'date').map(f => f.key);
    dateFields.forEach(key => {
      if (mappedData[key]) {
        const val = mappedData[key];
        let parsedDate = null;
        
        // Try common formats
        // DD/MM/YYYY
        if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(val)) {
           const [d, m, y] = val.split('/');
           const year = y.length === 2 ? `20${y}` : y;
           parsedDate = `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
        } 
        // YYYY-MM-DD
        else if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
           parsedDate = val;
        }
        // Excel Serial Date (basic check, assumes post-1900)
        else if (!isNaN(val) && Number(val) > 20000 && Number(val) < 60000) {
           // Basic excel date conversion if needed, or just warn
           // For now, let's treat as invalid format if not string date
           // warnings.push(`Formato de fecha numérico (Excel) en ${key}.`);
        }

        if (parsedDate && !isNaN(new Date(parsedDate).getTime())) {
           mappedData[key] = parsedDate;
        } else {
           if (key === 'committed_delivery_date') {
              // warnings.push(`Fecha inválida en ${key}: '${val}'`);
              // Relaxed: keep raw or null? Let's keep null to avoid backend error
              mappedData[key] = null; 
           } else {
              mappedData[key] = null;
           }
        }
      }
    });

    // 5. Number Parsing
    const numberFields = SYSTEM_FIELDS.filter(f => f.type === 'number').map(f => f.key);
    numberFields.forEach(key => {
      if (mappedData[key]) {
        // Replace comma with dot for decimals
        const clean = mappedData[key].replace(',', '.').replace(/[^\d.-]/g, '');
        const num = parseFloat(clean);
        if (!isNaN(num)) {
          mappedData[key] = num;
        } else {
          mappedData[key] = 0; // Default to 0 or null?
        }
      }
    });

    // Default Priority
    if (!mappedData['priority']) mappedData['priority'] = 5;

    // Final Object Construction for Preview
    return {
      _rowIndex: index,
      _status: errors.length > 0 ? 'error' : 'valid',
      _errors: errors,
      _warnings: warnings,
      ...mappedData,
      machine_id: machineId // Augmented data
    };
  };

  const runValidation = () => {
    const validated = csvData.map((row, i) => validateRow(row, i));
    setPreviewRows(validated);
    
    const validCount = validated.filter(r => r._status === 'valid').length;
    setValidationStats({
      total: validated.length,
      valid: validCount,
      invalid: validated.length - validCount
    });
    
    setStep('preview');
  };

  // --- Execution Logic ---

  const executeImport = async () => {
    setStep('processing');
    setIsProcessing(true);
    abortRef.current = false;
    setLogs([]);
    setSummary(null);
    setProgress(0);

    const validRows = previewRows.filter(r => r._status === 'valid');
    if (validRows.length === 0) {
      toast.error("No hay registros válidos para importar.");
      setIsProcessing(false);
      setStep('preview');
      return;
    }

    addLog('info', `Iniciando importación de ${validRows.length} registros...`);

    try {
      // 1. Fetch Existing Orders to decide Create vs Update
      const existingOrders = await base44.entities.WorkOrder.list();
      const existingOrderMap = new Map(existingOrders.map(o => [o.order_number, o]));

      const payloads = { create: [], update: [] };
      
      validRows.forEach(row => {
        // Clean internal keys
        const { _rowIndex, _status, _errors, _warnings, ...data } = row;
        
        // Logic for New vs Update
        const existing = existingOrderMap.get(data.order_number);
        
        // Calculate duration if possible
        let estimated_duration = 0;
        if (data.quantity && data.production_cadence > 0) {
            estimated_duration = parseFloat((data.quantity / data.production_cadence).toFixed(2));
        }

        const payload = {
            ...data,
            estimated_duration,
            // Force start_date null for new imports to go to backlog/chips unless it's an update preserving existing
            start_date: existing ? existing.start_date : null 
        };

        if (existing) {
            payloads.update.push({ id: existing.id, data: payload });
        } else {
            payloads.create.push(payload);
        }
      });

      addLog('info', `Detectados: ${payloads.create.length} nuevos, ${payloads.update.length} actualizaciones.`);

      let processed = 0;
      let created = 0;
      let updated = 0;
      let errors = 0;
      const totalOps = payloads.create.length + payloads.update.length;

      // Helper for delay
      const delay = (ms) => new Promise(res => setTimeout(res, ms));

      // 2. Batch Create
      const BATCH_SIZE = 20;
      for (let i = 0; i < payloads.create.length; i += BATCH_SIZE) {
        if (abortRef.current) break;
        const batch = payloads.create.slice(i, i + BATCH_SIZE);
        try {
          await base44.entities.WorkOrder.bulkCreate(batch);
          created += batch.length;
          processed += batch.length;
          setProgress((processed / totalOps) * 100);
          addLog('success', `Lote ${Math.floor(i/BATCH_SIZE)+1} creado (${batch.length} órdenes)`);
          await delay(500); // Rate limit protection
        } catch (err) {
          console.error(err);
          errors += batch.length;
          processed += batch.length;
          addLog('error', `Error creando lote ${Math.floor(i/BATCH_SIZE)+1}: ${err.message}`);
        }
      }

      // 3. Sequential Updates (Safer for concurrency)
      for (const op of payloads.update) {
        if (abortRef.current) break;
        try {
          await base44.entities.WorkOrder.update(op.id, op.data);
          updated++;
          addLog('info', `Actualizada orden ${op.data.order_number}`);
        } catch (err) {
          errors++;
          addLog('error', `Error actualizando ${op.data.order_number}: ${err.message}`);
        }
        processed++;
        setProgress((processed / totalOps) * 100);
        await delay(200); // Conservative delay for updates
      }

      setSummary({ created, updated, errors });
      
      if (created > 0 || updated > 0) {
        onImportSuccess?.();
        queryClient.invalidateQueries({ queryKey: ['workOrders'] });
        toast.success("Importación finalizada.");
      } else {
        toast.warning("Importación finalizada con errores o sin cambios.");
      }

    } catch (err) {
      addLog('error', `Error crítico: ${err.message}`);
      toast.error("Fallo crítico en el proceso.");
    } finally {
      setIsProcessing(false);
      setStep('result');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("PELIGRO: Esto eliminará TODAS las órdenes de trabajo. ¿Continuar?")) return;
    try {
        const orders = await base44.entities.WorkOrder.list();
        toast.loading(`Eliminando ${orders.length} órdenes...`, { id: 'wipe' });
        
        // Delete in batches
        const chunkSize = 10;
        for (let i = 0; i < orders.length; i += chunkSize) {
             const batch = orders.slice(i, i + chunkSize);
             await Promise.all(batch.map(o => base44.entities.WorkOrder.delete(o.id).catch(e => console.warn(e))));
             await new Promise(r => setTimeout(r, 500));
        }
        toast.success("Base de datos limpiada", { id: 'wipe' });
        queryClient.invalidateQueries({ queryKey: ['workOrders'] });
    } catch (e) {
        toast.error("Error al limpiar DB", { id: 'wipe' });
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".csv,.txt"
      />
      
      <div className="flex gap-2">
         <Button variant="ghost" size="sm" onClick={handleDeleteAll} className="text-red-400 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
         </Button>
         <Button onClick={() => fileInputRef.current?.click()} className="gap-2 bg-blue-600 hover:bg-blue-700">
           <FileUp className="w-4 h-4" /> Importar Órdenes
         </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => { if(!isProcessing) setIsOpen(open); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col h-[80vh]">
          <DialogHeader>
            <DialogTitle>Asistente de Importación</DialogTitle>
            <DialogDescription>
               Paso {step === 'mapping' ? '1: Mapeo de Columnas' : step === 'preview' ? '2: Validación' : step === 'processing' ? '3: Procesando' : step === 'result' ? 'Resumen' : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            
            {/* STEP 1: MAPPING */}
            {step === 'mapping' && (
              <div className="flex flex-col h-full gap-4">
                <div className="bg-blue-50 p-3 rounded text-sm text-blue-700 flex gap-2 items-center">
                  <Settings2 className="w-5 h-5" />
                  <span>Confirma que las columnas del CSV coinciden con los campos del sistema.</span>
                </div>
                <ScrollArea className="flex-1 border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30%]">Campo Sistema</TableHead>
                        <TableHead className="w-[40%]">Columna CSV Detectada</TableHead>
                        <TableHead className="w-[30%]">Ejemplo (Fila 1)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {SYSTEM_FIELDS.map(field => (
                        <TableRow key={field.key}>
                          <TableCell>
                            <div className="font-medium flex items-center gap-1">
                              {field.label}
                              {field.required && <span className="text-red-500">*</span>}
                            </div>
                            <div className="text-xs text-muted-foreground">{field.description}</div>
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={fieldMapping[field.key] || "ignore"} 
                              onValueChange={(val) => setFieldMapping({...fieldMapping, [field.key]: val === "ignore" ? null : val})}
                            >
                              <SelectTrigger className={!fieldMapping[field.key] && field.required ? "border-red-300 bg-red-50" : ""}>
                                <SelectValue placeholder="Seleccionar columna..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ignore" className="text-muted-foreground italic">-- Ignorar --</SelectItem>
                                {csvHeaders.map(h => (
                                  <SelectItem key={h} value={h}>{h}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                             {fieldMapping[field.key] ? csvData[0]?.[fieldMapping[field.key]] : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            {/* STEP 2: PREVIEW & VALIDATION */}
            {step === 'preview' && (
              <div className="flex flex-col h-full gap-4">
                 <div className="grid grid-cols-3 gap-4">
                    <div className="border rounded p-3 bg-slate-50">
                        <div className="text-xs text-muted-foreground uppercase font-bold">Total Registros</div>
                        <div className="text-2xl font-bold">{validationStats.total}</div>
                    </div>
                    <div className="border rounded p-3 bg-green-50 text-green-700 border-green-200">
                        <div className="text-xs uppercase font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Válidos</div>
                        <div className="text-2xl font-bold">{validationStats.valid}</div>
                    </div>
                    <div className="border rounded p-3 bg-red-50 text-red-700 border-red-200">
                        <div className="text-xs uppercase font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Errores</div>
                        <div className="text-2xl font-bold">{validationStats.invalid}</div>
                    </div>
                 </div>

                 <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList>
                      <TabsTrigger value="all">Todos</TabsTrigger>
                      <TabsTrigger value="errors" className="text-red-600">Con Errores ({validationStats.invalid})</TabsTrigger>
                    </TabsList>
                    
                    <div className="flex-1 border rounded-md mt-2 overflow-hidden bg-white">
                        <ScrollArea className="h-full">
                           <Table>
                             <TableHeader>
                               <TableRow>
                                 <TableHead className="w-[50px]">Fila</TableHead>
                                 <TableHead>Estado</TableHead>
                                 <TableHead>Orden</TableHead>
                                 <TableHead>Máquina</TableHead>
                                 <TableHead>Mensajes</TableHead>
                               </TableRow>
                             </TableHeader>
                             <TableBody>
                               {previewRows.map((row, i) => (
                                 <TableRow key={i} className={row._status === 'error' ? 'bg-red-50/50' : ''}>
                                    <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                                    <TableCell>
                                        {row._status === 'valid' ? 
                                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">OK</Badge> : 
                                            <Badge variant="destructive">Error</Badge>
                                        }
                                    </TableCell>
                                    <TableCell className="font-medium">{row.order_number || '-'}</TableCell>
                                    <TableCell>{row.machine_name || '-'}</TableCell>
                                    <TableCell className="text-xs">
                                        {row._errors.length > 0 && (
                                            <div className="text-red-600 font-medium">
                                                {row._errors.map((e, idx) => <div key={idx}>• {e}</div>)}
                                            </div>
                                        )}
                                        {row._warnings.length > 0 && (
                                            <div className="text-yellow-600">
                                                {row._warnings.map((w, idx) => <div key={idx}>• {w}</div>)}
                                            </div>
                                        )}
                                    </TableCell>
                                 </TableRow>
                               ))}
                             </TableBody>
                           </Table>
                        </ScrollArea>
                    </div>
                 </Tabs>
              </div>
            )}

            {/* STEP 3 & 4: PROCESSING & RESULT */}
            {(step === 'processing' || step === 'result') && (
               <div className="flex flex-col h-full gap-4">
                  {step === 'processing' && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Procesando...</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {summary && (
                      <div className="grid grid-cols-3 gap-4">
                         <div className="bg-green-100 p-4 rounded-lg text-center border border-green-200">
                            <div className="text-3xl font-bold text-green-700">{summary.created}</div>
                            <div className="text-sm font-medium text-green-800">Creadas</div>
                         </div>
                         <div className="bg-blue-100 p-4 rounded-lg text-center border border-blue-200">
                            <div className="text-3xl font-bold text-blue-700">{summary.updated}</div>
                            <div className="text-sm font-medium text-blue-800">Actualizadas</div>
                         </div>
                         <div className="bg-red-100 p-4 rounded-lg text-center border border-red-200">
                            <div className="text-3xl font-bold text-red-700">{summary.errors}</div>
                            <div className="text-sm font-medium text-red-800">Fallidas</div>
                         </div>
                      </div>
                  )}

                  <div className="flex-1 border rounded-md flex flex-col overflow-hidden bg-slate-900 text-slate-50">
                     <div className="px-4 py-2 bg-slate-800 text-xs font-bold uppercase tracking-wider border-b border-slate-700 flex justify-between">
                        <span>Terminal Log</span>
                        {step === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
                     </div>
                     <ScrollArea className="flex-1 p-4 font-mono text-xs">
                        {logs.map((log, i) => (
                           <div key={i} className={`mb-1 ${
                               log.type === 'error' ? 'text-red-400' : 
                               log.type === 'success' ? 'text-green-400' : 
                               'text-slate-300'
                           }`}>
                              <span className="opacity-50 mr-2">[{log.timestamp.toLocaleTimeString()}]</span>
                              {log.message}
                           </div>
                        ))}
                     </ScrollArea>
                  </div>
               </div>
            )}

          </div>

          <DialogFooter className="mt-4 border-t pt-4">
             {step === 'mapping' && (
                 <>
                   <Button variant="outline" onClick={() => setStep('upload')}>Atrás</Button>
                   <Button onClick={runValidation} className="bg-blue-600 hover:bg-blue-700">
                     Siguiente: Validar <ArrowRight className="w-4 h-4 ml-2" />
                   </Button>
                 </>
             )}
             
             {step === 'preview' && (
                 <>
                   <Button variant="outline" onClick={() => setStep('mapping')}>
                     <ArrowLeft className="w-4 h-4 mr-2" /> Corregir Mapeo
                   </Button>
                   <Button 
                     onClick={executeImport} 
                     disabled={validationStats.valid === 0}
                     className={validationStats.invalid > 0 ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700"}
                   >
                     {validationStats.invalid > 0 ? 
                        `Importar ${validationStats.valid} Registros Válidos` : 
                        "Confirmar e Importar Todo"
                     }
                   </Button>
                 </>
             )}

             {step === 'processing' && (
                 <Button variant="destructive" onClick={() => abortRef.current = true}>
                    Cancelar Operación
                 </Button>
             )}

             {step === 'result' && (
                 <Button onClick={() => setIsOpen(false)}>Cerrar Asistente</Button>
             )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
