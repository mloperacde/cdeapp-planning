import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  Upload, FileSpreadsheet, Check, AlertCircle, Search, 
  Plus, Loader2, ArrowRight, X, RefreshCw 
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// --- Machine Resolver Dialog ---
function MachineResolverDialog({ open, onOpenChange, machineName, machines, onResolve }) {
  const [mode, setMode] = useState('select'); // select | create
  const [selectedId, setSelectedId] = useState("");
  
  // Create Form
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && machineName) {
        // Auto-fill create form with best guess
        setNewName(machineName);
        // Try to extract code if format is "Code - Name"
        const parts = machineName.split('-');
        if (parts.length > 1 && parts[0].trim().length < 10) {
            setNewCode(parts[0].trim());
            setNewName(parts.slice(1).join('-').trim());
        } else {
            setNewCode("");
        }
        setMode('select');
        setSelectedId("");
    }
  }, [open, machineName]);

  const handleSave = async () => {
     if (mode === 'select') {
         if (!selectedId) return toast.error("Selecciona una máquina");
         onResolve('select', selectedId);
     } else {
         if (!newName || !newCode) return toast.error("Nombre y Código son requeridos");
         
         try {
             setIsSubmitting(true);
             // Call resolve with create data - the parent handles the actual API call
             await onResolve('create', { nombre: newName, codigo: newCode });
         } catch (error) {
             console.error(error);
             toast.error("Error al crear máquina");
         } finally {
             setIsSubmitting(false);
         }
     }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Resolver Máquina Desconocida</DialogTitle>
          <DialogDescription>
             El archivo contiene la máquina: <span className="font-bold text-foreground">{machineName}</span>
             <br/>¿Cómo deseas proceder? Esta acción aplicará a todos los registros con este nombre.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={setMode} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="select">Asignar Existente</TabsTrigger>
            <TabsTrigger value="create">Crear Nueva</TabsTrigger>
          </TabsList>
          
          <TabsContent value="select" className="space-y-4 py-4">
             <div className="space-y-2">
                <Label>Seleccionar Máquina del Sistema</Label>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Buscar máquina..." />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-[200px]">
                        {machines.map(m => (
                            <SelectItem key={m.id} value={m.id}>
                                {m.codigo ? `${m.codigo} - ` : ''}{m.nombre}
                            </SelectItem>
                        ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
             </div>
          </TabsContent>

          <TabsContent value="create" className="space-y-4 py-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Código</Label>
                    <Input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Ej. 123" />
                </div>
                <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre de máquina" />
                </div>
             </div>
             <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                Se creará una nueva máquina activa en el sistema.
             </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
             {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
             {mode === 'select' ? 'Confirmar Asignación' : 'Crear y Asignar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Component ---
export default function WorkOrderImporter() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Preview/Validate, 4: Result
  const [file, setFile] = useState(null);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawData, setRawData] = useState([]);
  
  // Mapping State
  const [columnMapping, setColumnMapping] = useState({
    order_number: '',
    machine_name: '',
    process_name: '', // Optional, or derive from machine
    priority: '',
    start_date: '',
    committed_delivery_date: '',
    notes: ''
  });

  // Validation & Processing State
  const [validatedData, setValidatedData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0, errors: [] });

  // Resolver State
  const [resolverOpen, setResolverOpen] = useState(false);
  const [machineToResolve, setMachineToResolve] = useState(null);
  const [machineOverrides, setMachineOverrides] = useState({}); // Map<RawName, MachineID>

  // Data Queries
  const { data: machines = [], refetch: refetchMachines } = useQuery({
    queryKey: ['machines-import'],
    queryFn: () => base44.entities.MachineMasterDatabase.list(),
  });

  const { data: processes = [] } = useQuery({
    queryKey: ['processes-import'],
    queryFn: () => base44.entities.Process.list(),
  });

  // --- Step 1: File Upload ---
  const onDrop = useCallback((acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  const parseFile = (file) => {
    const reader = new FileReader();
    
    if (file.name.endsWith('.csv')) {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setRawHeaders(results.meta.fields || []);
                setRawData(results.data);
                autoMapColumns(results.meta.fields || []);
                setStep(2);
            },
            error: (err) => toast.error("Error al leer CSV: " + err.message)
        });
    } else {
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (jsonData.length > 0) {
                    const headers = jsonData[0];
                    const rows = jsonData.slice(1).map(row => {
                        let obj = {};
                        headers.forEach((h, i) => obj[h] = row[i]);
                        return obj;
                    });
                    setRawHeaders(headers);
                    setRawData(rows);
                    autoMapColumns(headers);
                    setStep(2);
                }
            } catch (err) {
                toast.error("Error al leer Excel: " + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    }
  };

  const autoMapColumns = (headers) => {
      const newMapping = { ...columnMapping };
      const normalize = (s) => s?.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const strategies = {
          order_number: ['orden', 'numero', 'order', 'wo', 'pedido'],
          machine_name: ['maquina', 'machine', 'recurso', 'equipo'],
          process_name: ['proceso', 'process', 'operacion'],
          priority: ['prioridad', 'priority', 'urgencia'],
          start_date: ['inicio', 'start', 'fecha', 'comienzo'],
          committed_delivery_date: ['entrega', 'delivery', 'fin', 'compromiso'],
          notes: ['notas', 'observaciones', 'comentarios', 'descripcion']
      };

      Object.keys(strategies).forEach(key => {
          const match = headers.find(h => strategies[key].some(term => normalize(h).includes(term)));
          if (match) newMapping[key] = match;
      });
      setColumnMapping(newMapping);
  };

  // --- Step 2: Validation Logic ---
  const validateRow = (row, index) => {
    const errors = [];
    const mapped = {};
    
    // Extract values based on mapping
    Object.keys(columnMapping).forEach(key => {
        if (columnMapping[key]) {
            mapped[key] = row[columnMapping[key]];
        }
    });

    // Required Fields
    if (!mapped.order_number) errors.push("Falta número de orden");
    
    // Machine Lookup
    let machineId = null;
    const rawMachineName = mapped.machine_name;
    
    if (!rawMachineName) {
        errors.push("Falta nombre de máquina");
    } else {
        // 1. Check Overrides
        if (machineOverrides[rawMachineName]) {
            machineId = machineOverrides[rawMachineName];
        } else {
            // 2. Fuzzy Search
            const normalize = s => s?.toLowerCase().trim();
            const search = normalize(rawMachineName);
            
            // Exact code match or Exact Name match
            let match = machines.find(m => 
                normalize(m.codigo) === search || 
                normalize(m.nombre) === search ||
                normalize(`${m.codigo} - ${m.nombre}`) === search
            );

            // "Code - Name" parsing logic
            if (!match && rawMachineName.includes('-')) {
                const parts = rawMachineName.split('-');
                const codePart = normalize(parts[0]);
                match = machines.find(m => normalize(m.codigo) === codePart);
            }

            if (match) {
                machineId = match.id;
            } else {
                errors.push(`Máquina no encontrada: "${rawMachineName}"`);
            }
        }
    }

    // Date Parsing
    const parseDate = (val) => {
        if (!val) return null;
        if (val instanceof Date) return val.toISOString().split('T')[0];
        // Try common formats
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        return null;
    };

    const startDate = parseDate(mapped.start_date);
    if (!startDate && mapped.start_date) errors.push("Formato de fecha de inicio inválido");

    return {
        ...mapped,
        originalIndex: index,
        machineId,
        startDate,
        deliveryDate: parseDate(mapped.committed_delivery_date),
        priority: mapped.priority || '3',
        status: 'Pendiente',
        _errors: errors
    };
  };

  const runValidation = () => {
    const validated = rawData.map((row, i) => validateRow(row, i));
    setValidatedData(validated);
    setStep(3);
  };

  useEffect(() => {
    if (step === 3) {
        // Re-run validation when overrides change
        runValidation();
    }
  }, [machineOverrides, machines]);

  // --- Step 3: Resolver Logic ---
  const openResolver = (machineName) => {
    setMachineToResolve(machineName);
    setResolverOpen(true);
  };

  const handleResolve = async (action, data) => {
    if (action === 'select') {
        // data is machineId
        setMachineOverrides(prev => ({
            ...prev,
            [machineToResolve]: data
        }));
        toast.success(`Asignado correctamente`);
        setResolverOpen(false);
    } else {
        // action === 'create', data is { name, code }
        try {
            const newMachine = await base44.entities.MachineMasterDatabase.create({
                nombre: data.name,
                codigo: data.code,
                activo: true,
                descripcion: "Importado automáticamente"
            });
            
            if (newMachine && newMachine.id) {
                // Refresh machines list
                await refetchMachines();
                
                // Add to overrides
                setMachineOverrides(prev => ({
                    ...prev,
                    [machineToResolve]: newMachine.id
                }));
                
                toast.success("Máquina creada y asignada");
                setResolverOpen(false);
            } else {
                throw new Error("No se pudo crear la máquina");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al crear la máquina: " + error.message);
            // Don't close dialog on error
        }
    }
  };

  // --- Step 4: Import Execution ---
  const executeImport = async () => {
    const validRows = validatedData.filter(r => r._errors.length === 0);
    if (validRows.length === 0) return toast.error("No hay registros válidos para importar");

    setImporting(true);
    setStep(4);
    setProgress(0);
    
    let successCount = 0;
    let failedCount = 0;
    const errors = [];
    const batchSize = 10;
    
    for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (row) => {
            try {
                await base44.entities.WorkOrder.create({
                    order_number: row.order_number,
                    machine_id: row.machineId,
                    // process_id: TODO: Infer or default? For now left empty or handled by triggers
                    priority: parseInt(row.priority) || 3,
                    start_date: row.startDate,
                    committed_delivery_date: row.deliveryDate,
                    status: row.status,
                    notes: row.notes
                });
                successCount++;
            } catch (err) {
                failedCount++;
                errors.push({ order: row.order_number, error: err.message });
            }
        }));
        
        setProgress(Math.round(((i + batch.length) / validRows.length) * 100));
    }

    setImportResults({ success: successCount, failed: failedCount, errors });
    setImporting(false);
    queryClient.invalidateQueries(['workOrders']);
  };

  // --- Render Helpers ---
  const validCount = validatedData.filter(d => d._errors.length === 0).length;
  const invalidCount = validatedData.length - validCount;

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Upload className="w-4 h-4 mr-2" />
        Importar
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open && step === 4 && !importing) {
            // Reset on close if finished
            setStep(1);
            setFile(null);
            setValidatedData([]);
            setRawData([]);
        }
        setIsOpen(open);
      }}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        <div className="p-6 pb-2 border-b">
           <DialogTitle>Importar Órdenes de Trabajo</DialogTitle>
           <DialogDescription>
              Sigue los pasos para importar órdenes desde Excel o CSV.
           </DialogDescription>
           
           {/* Stepper */}
           <div className="flex items-center gap-4 mt-6 text-sm">
              {[1, 2, 3, 4].map(s => (
                  <div key={s} className={`flex items-center gap-2 ${step >= s ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step >= s ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>
                          {step > s ? <Check className="w-4 h-4" /> : s}
                      </div>
                      <span className="hidden sm:inline">
                        {s === 1 && "Subir"}
                        {s === 2 && "Mapear"}
                        {s === 3 && "Validar"}
                        {s === 4 && "Importar"}
                      </span>
                      {s < 4 && <div className="w-8 h-px bg-border mx-2" />}
                  </div>
              ))}
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
           {step === 1 && (
               <div {...getRootProps()} className={`border-2 border-dashed rounded-lg h-64 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                   <input {...getInputProps()} />
                   <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                       <Upload className="w-8 h-8 text-muted-foreground" />
                   </div>
                   <p className="text-lg font-medium">Arrastra tu archivo aquí</p>
                   <p className="text-sm text-muted-foreground mt-1">Soporta .xlsx, .xls, .csv</p>
                   <Button variant="outline" className="mt-4">Seleccionar Archivo</Button>
               </div>
           )}

           {step === 2 && (
               <div className="space-y-6">
                   <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                       <FileSpreadsheet className="w-8 h-8 text-green-600" />
                       <div>
                           <p className="font-medium">{file?.name}</p>
                           <p className="text-sm text-muted-foreground">{rawData.length} filas encontradas</p>
                       </div>
                   </div>

                   <div className="grid grid-cols-2 gap-8">
                       <div className="space-y-4">
                           <h3 className="font-medium">Campos del Sistema</h3>
                           {Object.keys(columnMapping).map(field => (
                               <div key={field} className="flex items-center justify-between h-10">
                                   <Label className="capitalize">{field.replace(/_/g, ' ')}</Label>
                               </div>
                           ))}
                       </div>
                       <div className="space-y-4">
                           <h3 className="font-medium">Columnas del Archivo</h3>
                           {Object.keys(columnMapping).map(field => (
                               <Select 
                                 key={field} 
                                 value={columnMapping[field]} 
                                 onValueChange={(val) => setColumnMapping(prev => ({ ...prev, [field]: val }))}
                               >
                                   <SelectTrigger>
                                       <SelectValue placeholder="Ignorar campo" />
                                   </SelectTrigger>
                                   <SelectContent>
                                       <SelectItem value="ignore">-- Ignorar --</SelectItem>
                                       {rawHeaders.map(h => (
                                           <SelectItem key={h} value={h}>{h}</SelectItem>
                                       ))}
                                   </SelectContent>
                               </Select>
                           ))}
                       </div>
                   </div>
               </div>
           )}

           {step === 3 && (
               <div className="space-y-4">
                   <div className="flex gap-4">
                       <Card className="flex-1 bg-green-50 border-green-200">
                           <CardContent className="p-4 flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                                   {validCount}
                               </div>
                               <div>
                                   <p className="font-medium text-green-900">Listos para importar</p>
                                   <p className="text-xs text-green-700">Filas válidas</p>
                               </div>
                           </CardContent>
                       </Card>
                       <Card className="flex-1 bg-red-50 border-red-200">
                           <CardContent className="p-4 flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold">
                                   {invalidCount}
                               </div>
                               <div>
                                   <p className="font-medium text-red-900">Requieren atención</p>
                                   <p className="text-xs text-red-700">Errores encontrados</p>
                               </div>
                           </CardContent>
                       </Card>
                   </div>

                   <div className="border rounded-lg overflow-hidden">
                       <Table>
                           <TableHeader>
                               <TableRow>
                                   <TableHead>Estado</TableHead>
                                   <TableHead>Orden</TableHead>
                                   <TableHead>Máquina</TableHead>
                                   <TableHead>Prioridad</TableHead>
                                   <TableHead>Errores / Acciones</TableHead>
                               </TableRow>
                           </TableHeader>
                           <TableBody>
                               {validatedData.map((row, idx) => (
                                   <TableRow key={idx} className={row._errors.length > 0 ? 'bg-red-50/50' : ''}>
                                       <TableCell>
                                           {row._errors.length === 0 ? (
                                               <Check className="w-4 h-4 text-green-600" />
                                           ) : (
                                               <AlertCircle className="w-4 h-4 text-red-600" />
                                           )}
                                       </TableCell>
                                       <TableCell>{row.order_number}</TableCell>
                                       <TableCell>{row.machine_name}</TableCell>
                                       <TableCell>{row.priority}</TableCell>
                                       <TableCell className="text-xs">
                                           {row._errors.length > 0 && (
                                               <div className="text-red-600 font-medium space-y-1">
                                                   {row._errors.map((e, i) => (
                                                       <div key={i} className="flex items-center gap-2">
                                                          <span>• {e}</span>
                                                          {e.includes("Máquina no encontrada") && (
                                                              <Button 
                                                                size="sm" 
                                                                variant="outline" 
                                                                className="h-6 text-[10px] bg-red-50 hover:bg-red-100 border-red-200 text-red-700 px-2"
                                                                onClick={() => openResolver(row.machine_name)}
                                                              >
                                                                <Search className="w-3 h-3 mr-1"/> Resolver
                                                              </Button>
                                                          )}
                                                       </div>
                                                   ))}
                                               </div>
                                           )}
                                       </TableCell>
                                   </TableRow>
                               ))}
                           </TableBody>
                       </Table>
                   </div>
               </div>
           )}

           {step === 4 && (
               <div className="flex flex-col items-center justify-center h-full space-y-6">
                   {importing ? (
                       <>
                           <Loader2 className="w-16 h-16 text-primary animate-spin" />
                           <div className="w-full max-w-md space-y-2">
                               <div className="flex justify-between text-sm">
                                   <span>Procesando...</span>
                                   <span>{progress}%</span>
                               </div>
                               <Progress value={progress} />
                           </div>
                           <p className="text-muted-foreground">Importando órdenes al sistema, por favor espera.</p>
                       </>
                   ) : (
                       <>
                           <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                               <Check className="w-8 h-8 text-green-600" />
                           </div>
                           <h2 className="text-2xl font-bold">Importación Completada</h2>
                           <div className="grid grid-cols-2 gap-8 w-full max-w-lg">
                               <div className="text-center p-4 border rounded-lg">
                                   <p className="text-3xl font-bold text-green-600">{importResults.success}</p>
                                   <p className="text-sm text-muted-foreground">Exitosos</p>
                               </div>
                               <div className="text-center p-4 border rounded-lg">
                                   <p className="text-3xl font-bold text-red-600">{importResults.failed}</p>
                                   <p className="text-sm text-muted-foreground">Fallidos</p>
                               </div>
                           </div>
                           
                           {importResults.errors.length > 0 && (
                               <ScrollArea className="h-40 w-full max-w-lg border rounded-lg p-4 bg-red-50">
                                   <h4 className="font-bold text-red-800 mb-2">Errores detallados:</h4>
                                   <ul className="space-y-1 text-xs text-red-700">
                                       {importResults.errors.map((e, i) => (
                                           <li key={i}>
                                               <span className="font-semibold">{e.order}:</span> {e.error}
                                           </li>
                                       ))}
                                   </ul>
                               </ScrollArea>
                           )}
                       </>
                   )}
               </div>
           )}
        </div>

        <div className="p-6 border-t bg-muted/20 flex justify-end gap-2">
           {step === 1 && (
               <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
           )}
           {step === 2 && (
               <>
                   <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
                   <Button onClick={runValidation}>Validar Datos <ArrowRight className="w-4 h-4 ml-2" /></Button>
               </>
           )}
           {step === 3 && (
               <>
                   <Button variant="outline" onClick={() => setStep(2)}>Atrás</Button>
                   <Button onClick={executeImport} disabled={validCount === 0}>
                       Importar {validCount} Órdenes
                   </Button>
               </>
           )}
           {step === 4 && !importing && (
               <Button onClick={() => setIsOpen(false)}>Cerrar</Button>
           )}
        </div>
      </DialogContent>

      <MachineResolverDialog 
         open={resolverOpen} 
         onOpenChange={setResolverOpen}
         machineName={machineToResolve}
         machines={machines}
         onResolve={handleResolve}
      />
    </Dialog>
    </>
  );
}
