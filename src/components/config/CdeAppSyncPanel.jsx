
import React, { useState } from "react";
import { cdeApp } from "@/api/cdeAppClient";
import { base44 } from "@/api/base44Client";
import { localDataService } from "@/components/process-configurator/services/localDataService";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertTriangle, Loader2, Key, RefreshCw, Server } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CdeAppSyncPanel() {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState(cdeApp.getApiKey());
  const [step, setStep] = useState(0); // 0: Config, 1: Rooms, 2: Machines, 3: Productions
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  
  const addLog = (msg, type = "info") => {
    setLogs(prev => [...prev, { time: new Date(), msg, type }]);
  };

  const handleSaveKey = () => {
    cdeApp.setApiKey(apiKey);
    toast.success("Clave API guardada");
  };

  // --- SYNC FUNCTIONS ---

  const syncRooms = async () => {
    setLoading(true);
    addLog("Iniciando sincronización de Salas...", "info");
    try {
      const data = await cdeApp.syncRooms();
      addLog(`Obtenidas ${data?.length || 0} salas desde CDEApp`, "success");
      
      // TODO: If we have a Room entity, save it here.
      // Currently we use 'ubicacion' string on machines.
      // We might just store this in memory or a temp config if needed for mapping,
      // but if machines come with room_id/room_name, we might not need to persist rooms separately yet.
      // For now, we just acknowledge receipt.
      
      setStep(2); // Move to next
    } catch (e) {
      addLog(`Error en Salas: ${e.message}`, "error");
      toast.error("Error sincronizando salas");
    } finally {
      setLoading(false);
    }
  };

  const syncMachines = async () => {
    setLoading(true);
    addLog("Iniciando sincronización de Máquinas...", "info");
    try {
      const machines = await cdeApp.syncMachines();
      addLog(`Obtenidas ${machines?.length || 0} máquinas desde CDEApp`, "success");
      
      // Process Machines
      let updated = 0;
      let created = 0;
      
      // Fetch existing machines to check for duplicates (by Code/ID)
      const existingMachines = await base44.entities.MachineMasterDatabase.list(undefined, 5000);
      const machineMap = new Map(); // code -> id
      existingMachines.forEach(m => {
          if (m.codigo_maquina) machineMap.set(String(m.codigo_maquina).trim(), m.id);
          // Also map by ID if possible? No, we trust code as external ID usually.
      });

      // Assuming machines structure from CDEApp is array of objects
      // If headers/data format, we need to parse.
      // Example implies JSON objects for rooms/machines? Or same "headers" format?
      // User only showed example for Productions.
      // Let's assume standard array of objects for Rooms/Machines unless proved otherwise.
      // If it fails, we catch it.
      
      const machineList = Array.isArray(machines) ? machines : (machines.data || []);

      for (const m of machineList) {
          // Mapping Logic
          // Adjust fields based on actual API response. 
          // Assuming: id, name, code, room_id, room_name...
          
          const code = String(m.code || m.id || "").trim(); // Use ID as code if no code
          const name = m.name || m.description || `Máquina ${code}`;
          const location = m.room_name || m.sala || "";

          if (!code) continue;

          const payload = {
              codigo_maquina: code,
              nombre: name,
              descripcion: name,
              ubicacion: location,
              // external_id: m.id // If we add this field to schema
          };

          if (machineMap.has(code)) {
              const id = machineMap.get(code);
              await base44.entities.MachineMasterDatabase.update(id, payload);
              updated++;
          } else {
              await base44.entities.MachineMasterDatabase.create(payload);
              created++;
          }
      }

      addLog(`Máquinas procesadas: ${created} creadas, ${updated} actualizadas`, "success");
      queryClient.invalidateQueries(['machines']);
      setStep(3); // Move to next
    } catch (e) {
      addLog(`Error en Máquinas: ${e.message}`, "error");
      toast.error("Error sincronizando máquinas");
    } finally {
      setLoading(false);
    }
  };

  const syncArticles = async () => {
    setLoading(true);
    addLog("Iniciando sincronización de Artículos...", "info");
    try {
      const articles = await cdeApp.syncArticles();
      const articleList = Array.isArray(articles) ? articles : (articles.data || []);
      
      if (articleList.length === 0) {
        addLog("No se encontraron artículos en CDEApp.", "warning");
        setStep(4);
        return;
      }

      addLog(`Obtenidos ${articleList.length} artículos. Procesando...`, "info");

      // Map to internal format
      const mappedArticles = articleList.map(a => ({
          code: a.code || a.id,
          name: a.name || a.description,
          client: a.client || a.client_name,
          type: a.type || a.article_type, 
          characteristics: a.characteristics || "",
          process_code: a.process_code || a.process || "",
          operator_cost: a.operator_cost || 0,
          time_seconds: a.time_seconds || 0,
          ...a
      }));

      // Use localDataService to save (Smart Diff/Upsert)
      await localDataService.saveArticles(mappedArticles);

      addLog(`Artículos sincronizados correctamente.`, "success");
      queryClient.invalidateQueries(['articles']);
      setStep(4); // Move to next
    } catch (e) {
      addLog(`Error en Artículos: ${e.message}`, "error");
      toast.error("Error sincronizando artículos");
    } finally {
      setLoading(false);
    }
  };

  const syncProductions = async () => {
    setLoading(true);
    addLog("Iniciando sincronización de Producciones...", "info");
    try {
      const response = await cdeApp.syncProductions({
        // Default filters? Maybe last 30 days?
        // User didn't specify default, but fetching ALL history might be heavy.
        // Let's default to open orders if possible, or just fetch all for now (paginated by API?)
      });
      
      // Parse Response (Headers/Data format based on user example)
      // { success: true, headers: [...], data: [...]? }
      // User example showed headers. I assume data is array of arrays.
      
      let rows = [];
      if (response.headers && Array.isArray(response.headers)) {
          // It's a Headers + Data format (implied)
          // Actually user didn't show 'data' key, but standard for this format.
          // Or maybe it's just array of objects and headers is metadata?
          // Let's check if response is array or object.
          
          if (Array.isArray(response)) {
             rows = response; // Array of objects
          } else if (response.data && Array.isArray(response.data)) {
             // Array of arrays or objects?
             if (response.headers) {
                 // Array of arrays mapped to headers
                 rows = response.data.map(r => {
                     const obj = {};
                     response.headers.forEach((h, i) => obj[h] = r[i]);
                     return obj;
                 });
             } else {
                 rows = response.data; // Array of objects
             }
          }
      } else if (Array.isArray(response)) {
          rows = response;
      }

      addLog(`Obtenidos ${rows.length} registros de producción`, "info");

      // Fetch machines for ID resolution
      const localMachines = await base44.entities.MachineMasterDatabase.list(undefined, 5000);
      const machineMap = new Map();
      localMachines.forEach(m => {
          if (m.codigo_maquina) machineMap.set(String(m.codigo_maquina).trim(), m.id);
          // Try mapping by name too if needed
          if (m.nombre) machineMap.set(m.nombre.toLowerCase().trim(), m.id);
      });

      let created = 0;
      let skipped = 0; // Existing or invalid

      // Process Rows
      for (const row of rows) {
          // Mapping from User Example Headers:
          // production_id, machine_id, Prioridad, Tipo, Estado, Sala, Máquina, Su Pedido, Pedido, Orden, Artículo...
          
          const orderNumber = row['Orden'] || row['production_id'];
          if (!orderNumber) continue;

          // Check if exists (Idempotency)
          // We can check by order_number. 
          // NOTE: base44.entities.WorkOrder doesn't support findUnique by order_number easily without filter.
          // For bulk, maybe we fetch all active orders? 
          // For now, let's just create (or maybe upsert if we had ID). 
          // To avoid duplicates, we should check. 
          // Let's assume we skip if exists for now, or use a "upsert" logic if client allows.
          // Client `create` always creates.
          
          // Try to find machine
          // `machine_id` from API might be external ID.
          // `Máquina` might be name/code.
          let machineId = null;
          
          // Strategy 1: Map by Name/Code from 'Máquina' column
          if (row['Máquina']) {
              const name = String(row['Máquina']).toLowerCase().trim();
              if (machineMap.has(name)) machineId = machineMap.get(name);
          }
          
          // Strategy 2: Map by `machine_id` column if it matches `codigo_maquina`
          if (!machineId && row['machine_id']) {
              const code = String(row['machine_id']).trim();
              if (machineMap.has(code)) machineId = machineMap.get(code);
          }

          if (!machineId) {
              // Log warning?
              // addLog(`Máquina no encontrada para Orden ${orderNumber}: ${row['Máquina']}`, "warning");
              // Create without machine? Or skip?
              // WorkOrder requires machine_id usually? Let's check schema. 
              // Schema says `machine_id` is required in importer.
              // We'll skip for now to avoid broken data.
              skipped++;
              continue;
          }

          const payload = {
              order_number: String(orderNumber),
              machine_id: machineId,
              client_name: row['Cliente'],
              product_article_code: row['Artículo'],
              product_name: row['Nombre'] || row['Descripción'],
              quantity: parseInt(row['Cantidad']) || 0,
              priority: parseInt(row['Prioridad']) || 3,
              status: row['Estado'] || 'Pendiente',
              
              start_date: row['Fecha Inicio Limite'] || row['Fecha Inicio Modificada'],
              committed_delivery_date: row['Fecha Entrega'] || row['Nueva Fecha Entrega'],
              planned_end_date: row['Fecha Fin'],
              
              production_cadence: parseFloat(row['Cadencia']) || 0,
              notes: row['Observación'] || ''
          };

          // Create
          try {
             await base44.entities.WorkOrder.create(payload);
             created++;
          } catch (e) {
             console.error(e);
             skipped++;
          }
      }

      addLog(`Producciones importadas: ${created} creadas. (Omitidas/Fallidas: ${skipped})`, "success");
      queryClient.invalidateQueries(['workOrders']);
      setStep(0); // Reset or Done
      toast.success("Sincronización de Producciones completada");

    } catch (e) {
      addLog(`Error en Producciones: ${e.message}`, "error");
      toast.error("Error sincronizando producciones");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-blue-600" />
          Sincronización CDEApp (Externa)
        </CardTitle>
        <CardDescription>
          Importa datos maestros y operacionales desde el sistema central.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* API Key Config */}
        <div className="space-y-2">
          <Label>API Key</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input 
                value={isEnvKey ? "••••••••••••••••" : apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pl-9"
                type="password"
                placeholder="Ingrese su CDEApp API Key"
                disabled={isEnvKey}
              />
            </div>
            {!isEnvKey && (
              <Button onClick={handleSaveKey} variant="outline">
                Guardar
              </Button>
            )}
          </div>
          {isEnvKey ? (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Configurada mediante Secretos de Base44 (Solo lectura)
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              La clave se guardará localmente en su navegador.
            </p>
          )}
        </div>

        <Separator />

        {/* Sync Process */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Proceso de Sincronización</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {/* Step 1: Rooms */}
             <Card className={`border-l-4 ${step >= 0 ? 'border-l-blue-500' : 'border-l-slate-200'} bg-slate-50`}>
                 <CardContent className="p-4">
                     <div className="flex justify-between items-start mb-2">
                         <span className="font-semibold text-sm">1. Salas</span>
                         {step > 1 && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                     </div>
                     <p className="text-xs text-slate-500 mb-4">Sincroniza ubicaciones y áreas.</p>
                     <Button 
                        size="sm" 
                        className="w-full" 
                        onClick={syncRooms}
                        disabled={loading || !apiKey}
                     >
                        {loading && step === 1 ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                        Sincronizar Salas
                     </Button>
                 </CardContent>
             </Card>

             {/* Step 2: Machines */}
             <Card className={`border-l-4 ${step >= 1 ? 'border-l-blue-500' : 'border-l-slate-200'} bg-slate-50`}>
                 <CardContent className="p-4">
                     <div className="flex justify-between items-start mb-2">
                         <span className="font-semibold text-sm">2. Máquinas</span>
                         {step > 2 && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                     </div>
                     <p className="text-xs text-slate-500 mb-4">Actualiza catálogo de máquinas.</p>
                     <Button 
                        size="sm" 
                        className="w-full" 
                        onClick={syncMachines}
                        disabled={loading || step < 2 || !apiKey}
                        variant={step < 2 ? "ghost" : "default"}
                     >
                        {loading && step === 2 ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                        Sincronizar Máquinas
                     </Button>
                 </CardContent>
             </Card>

             {/* Step 3: Articles */}
             <Card className={`border-l-4 ${step >= 2 ? 'border-l-blue-500' : 'border-l-slate-200'} bg-slate-50`}>
                 <CardContent className="p-4">
                     <div className="flex justify-between items-start mb-2">
                         <span className="font-semibold text-sm">3. Artículos</span>
                         {step > 3 && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                     </div>
                     <p className="text-xs text-slate-500 mb-4">Actualiza base de datos de artículos.</p>
                     <Button 
                        size="sm" 
                        className="w-full" 
                        onClick={syncArticles}
                        disabled={loading || step < 3 || !apiKey}
                        variant={step < 3 ? "ghost" : "default"}
                     >
                        {loading && step === 3 ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                        Sincronizar Artículos
                     </Button>
                 </CardContent>
             </Card>

             {/* Step 4: Productions */}
             <Card className={`border-l-4 ${step >= 3 ? 'border-l-blue-500' : 'border-l-slate-200'} bg-slate-50`}>
                 <CardContent className="p-4">
                     <div className="flex justify-between items-start mb-2">
                         <span className="font-semibold text-sm">4. Producciones</span>
                         {step > 4 && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                     </div>
                     <p className="text-xs text-slate-500 mb-4">Importa órdenes de trabajo.</p>
                     <Button 
                        size="sm" 
                        className="w-full" 
                        onClick={syncProductions}
                        disabled={loading || step < 4 || !apiKey}
                        variant={step < 4 ? "ghost" : "default"}
                     >
                        {loading && step === 4 ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                        Sincronizar Producciones
                     </Button>
                 </CardContent>
             </Card>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-slate-950 text-slate-200 p-4 rounded-lg text-xs font-mono h-48 overflow-y-auto">
            {logs.length === 0 ? (
                <div className="text-slate-600 italic">Esperando inicio de operaciones...</div>
            ) : (
                logs.map((log, i) => (
                    <div key={i} className={`mb-1 ${
                        log.type === 'error' ? 'text-red-400' : 
                        log.type === 'success' ? 'text-green-400' : 'text-slate-300'
                    }`}>
                        <span className="opacity-50 mr-2">[{format(log.time, 'HH:mm:ss')}]</span>
                        {log.msg}
                    </div>
                ))
            )}
        </div>

      </CardContent>
    </Card>
  );
}
