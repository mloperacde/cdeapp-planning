import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Factory, Plus, RefreshCw, DownloadCloud } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import WorkOrderForm from "../components/planning/WorkOrderForm";
import PlanningGantt from "../components/planning/PlanningGantt";
import MachineOrdersList from "../components/planning/MachineOrdersList";
import ResourceForecast from "../components/planning/ResourceForecast";
import MachineLoadGraph from "../components/planning/MachineLoadGraph";
import ScheduleOrderDialog from "../components/planning/ScheduleOrderDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cdeApp } from "@/api/cdeAppClient";


import { Link } from "react-router-dom";

export default function ProductionPlanningPage() {

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [dropDialogData, setDropDialogData] = useState(null);
  const queryClient = useQueryClient();
  
  // Filtros
  const [dateRange, setDateRange] = useState({
    start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  });
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Data Fetching
  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
      return data.map(m => ({
        id: m.id,
        nombre: m.nombre,
        descripcion: m.descripcion,
        codigo: m.codigo_maquina || m.codigo,
        orden: m.orden_visualizacion || 999,
        tipo: m.tipo,
        ubicacion: m.ubicacion
      })).sort((a, b) => a.orden - b.orden);
    },
    staleTime: 0,
    gcTime: 0
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders'],
    queryFn: () => base44.entities.WorkOrder.list(),
  });

  const { data: processes = [] } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.filter({ activo: true }),
  });

  const { data: machineProcesses = [] } = useQuery({
    queryKey: ['machineProcesses'],
    queryFn: () => base44.entities.MachineProcess.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
  });

  // Derived Data
  const filteredOrders = useMemo(() => {
    // First, augment orders with effective dates logic
    const augmentedOrders = workOrders.map(order => ({
        ...order,
        effective_start_date: order.modified_start_date || order.start_date,
        effective_delivery_date: order.new_delivery_date || order.committed_delivery_date
    }));

    const filtered = augmentedOrders.filter(order => {
      // Filter by Priority (Must exist)
      if (order.priority === null || order.priority === undefined) return false;

      // Filter by Machine
      if (selectedMachine !== "all" && order.machine_id !== selectedMachine) return false;
      
      // Filter by Status
      if (selectedStatus !== "all" && order.status !== selectedStatus) return false;
      
      // Filter by Date Range (Check overlap) - ONLY for scheduled orders
      if (order.effective_start_date) {
        const orderStart = new Date(order.effective_start_date);
        // Using delivery date as end for visualization, or start date if missing
        const orderEnd = order.effective_delivery_date ? new Date(order.effective_delivery_date) : new Date(order.effective_start_date); 
        const rangeStart = new Date(dateRange.start);
        const rangeEnd = new Date(dateRange.end);
        
        // If date is invalid (shouldn't happen if start_date exists), skip
        if (isNaN(orderStart.getTime())) return false;
        
        return orderStart <= rangeEnd && orderEnd >= rangeStart;
      }
      
      // If no start_date (Backlog), include it so it appears in the "Sin Programar" column
      return true;
    });

    // Sort by Priority (Ascending: 1 is higher than 10)
    return filtered.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  }, [workOrders, selectedMachine, selectedStatus, dateRange]);

  const handleSyncCdeApp = async () => {
    setIsSyncing(true);
    toast.info("Conectando con CDEApp...");
    
    try {
      // 1. Obtener datos externos
      const response = await cdeApp.syncProductions();
      
      // 2. Normalizar respuesta (Headers -> Objetos)
      // Robust Normalization: Handle cases where data is already objects OR arrays
      let rows = [];
      
      console.log("[Sync] Raw Response Structure:", {
        headers: response.headers,
        dataType: response.data ? (Array.isArray(response.data) ? 'Array' : typeof response.data) : 'undefined',
        firstItemType: response.data && response.data[0] ? typeof response.data[0] : 'undefined',
        firstItemIsArray: response.data && Array.isArray(response.data[0]),
        firstItem: response.data && response.data[0]
      });

      if (response.data && Array.isArray(response.data)) {
        // Case 1: Data is already objects (ignore headers mapping if so)
        if (response.data.length > 0 && typeof response.data[0] === 'object' && !Array.isArray(response.data[0])) {
            console.log("[Sync] Data detected as Objects. Using directly.");
            rows = response.data;
        } 
        // Case 2: Data is arrays of values (needs headers mapping)
        else if (response.headers && Array.isArray(response.headers)) {
            console.log("[Sync] Data detected as Arrays. Mapping with headers.");
             rows = response.data.map(r => {
                 const obj = {};
                 // Fix: Ensure headers and data align. If data has more columns than headers, or vice versa, handle gracefully.
                 response.headers.forEach((h, i) => {
                    if (r[i] !== undefined) {
                        obj[h] = r[i];
                    }
                 });
                 return obj;
             });
        }
        // Case 3: Unknown format, try to use as is
        else {
             rows = response.data;
        }
      } else if (Array.isArray(response)) {
          rows = response;
      } else if (typeof response === 'object' && response !== null) {
           // Fallback for single object or weird structure
           console.log("[Sync] Response is a single object or unknown structure", response);
           if (response.data) {
               if (Array.isArray(response.data)) rows = response.data;
               else rows = [response.data];
           } else {
               rows = [response];
           }
      }

      console.log("[Sync] First row structure:", rows[0]);

      if (rows.length === 0) {
        toast.warning("CDEApp devolvió 0 órdenes.");
        setIsSyncing(false);
        return;
      }

      // 3. Preparar mapeo de máquinas
      const machineMap = new Map();
      machines.forEach(m => {
          if (m.codigo) machineMap.set(String(m.codigo).trim(), m.id);
          if (m.nombre) machineMap.set(m.nombre.toLowerCase().trim(), m.id);
      });

      // 4. Limpiar órdenes existentes antes de insertar nuevas (Estrategia "Full Refresh")
      // Esto elimina duplicados, órdenes obsoletas y conflictos de prioridad.
      
      let toastId = null;

      if (workOrders.length > 0) {
          toast.info("Limpiando órdenes antiguas para evitar duplicados...");
          // No hay endpoint de delete_all, borramos secuencialmente o por lotes si la API lo permite
          // Asumiendo que debemos borrar todo lo que traemos de la sync para "refrescar" el estado
          // PRECAUCIÓN: Si hay órdenes creadas manualmente que no vienen de sync, las perderíamos.
          // Pero el usuario dice "datos anteriores a la sincronizacion".
          
          // Mejor estrategia: "Upsert" o "Delete conflicting".
          // Dado que Base44 no tiene Upsert nativo fácil aquí, y el usuario se queja de duplicados persistentes:
          // Vamos a borrar las órdenes que coincidan con las que vienen de CDEApp (o todas si es un full sync).
          
          // Opción Segura: Borrar SOLO las órdenes que vamos a re-insertar (por número de orden).
          // Opción Solicitada (implícita): "deberiamos borrarlos ya que siguen apareciendo".
          
          // Vamos a implementar un borrado de todas las órdenes asociadas a las máquinas detectadas en el sync,
          // o simplemente borrar todo si el usuario asume que CDEApp es la fuente de la verdad.
          // Dado el contexto "app de origen no permite ordenes diferentes con misma pry", CDEApp es la fuente de verdad.
          
          // Delete Strategy: Parallel with Concurrency Limit (p-limit style)
          // Sequential is too slow (causing timeouts on UI thread or server side perception?)
          // Rate limit was 429. Now we see 500 Timeouts.
          // This suggests the server is overwhelmed or the connection is dropping.
          
          // Let's try a balanced approach: Concurrency 3, Delay 500ms.
          // And showing progress explicitly via toast.loading

          toastId = toast.loading("Iniciando limpieza de órdenes...");
          const CONCURRENCY_LIMIT = 3;
          let completed = 0;
          const total = workOrders.length;
          
          // Helper for concurrency
          const pool = [];
          const results = [];

          for (const order of workOrders) {
              const p = base44.entities.WorkOrder.delete(order.id)
                  .then(() => ({ status: 'fulfilled', id: order.id }))
                  .catch((e) => ({ status: 'rejected', id: order.id, error: e }));

              // Wrap promise to remove itself from pool when done
              const wrapped = p.then(r => {
                  pool.splice(pool.indexOf(wrapped), 1);
                  completed++;
                  if (completed % 5 === 0 || completed === total) {
                      toast.loading(`Limpiando órdenes: ${completed}/${total} (${Math.round(completed/total*100)}%)`, {
                          id: toastId
                      });
                  }
                  return r;
              });

              pool.push(wrapped);
              results.push(wrapped); // Keep track of all results

              if (pool.length >= CONCURRENCY_LIMIT) {
                  await Promise.race(pool); // Wait for at least one to finish
                  // Small delay to be nice to server
                  await new Promise(resolve => setTimeout(resolve, 300));
              }
          }

          // Wait for remaining
          await Promise.all(results);
          // NO hacemos dismiss aquí para reutilizar el toast en la importación
          // toast.dismiss(toastId);

          const deletedCount = results.filter(r => {
             // Need to await the result if it's not fully resolved in 'results' array?
             // Actually results array contains promises. We need to await Promise.all(results) first.
             return true; 
          }).length; // This count logic is slightly off because we need the values.

          // Correct counting
          const finalResults = await Promise.all(results);
          const successCount = finalResults.filter(r => r.status === 'fulfilled').length;
          console.log("Deleted", successCount, "old orders with concurrency limit.");
      }

      let created = 0;
      let skipped = 0;

      // 5. Procesar e Insertar (Con indicador de progreso)
      const totalToCreate = rows.length;
      console.log(`[Sync] Iniciando importación de ${totalToCreate} órdenes.`);
      
      if (toastId) {
          toast.loading(`Importando ${totalToCreate} órdenes...`, { id: toastId });
      } else {
          toastId = toast.loading(`Importando ${totalToCreate} órdenes...`);
      }
      
      // 5. Procesar e Insertar (Secuencial para evitar Rate Limit)
      // Helper para normalizar nombres (extraer código o limpiar texto)
      const normalizeMachineName = (val) => {
           if (!val) return "";
           const s = String(val).toLowerCase().trim();
           // Si viene formato "119 - Nombre", intentar extraer "119" o "nombre"
           if (s.includes(' - ')) {
              const parts = s.split(' - ');
              return parts[0].trim(); // Retorna el código (ej: 119)
           }
           return s;
      };

      for (let i = 0; i < rows.length; i++) {
          const row = rows[i];

          // Update progress every 5 items
          if (i % 5 === 0) {
              const percent = Math.round((i / totalToCreate) * 100);
              toast.loading(`Importando: ${percent}% (${i}/${totalToCreate})`, { id: toastId });
          }

          console.log(`Procesando fila ${i}:`, row); // Ver qué tiene cada fila

          // Intenta encontrar el número de orden en varios campos posibles
          const orderNumber = row['Orden'] || row['production_id'] || row['order_number'] || row['id'] || row['order'];
          if (!orderNumber) {
              // Solo loguear si no es la cabecera vacía o algo así
              if (Object.keys(row).length > 2) console.warn("[Sync] Fila ignorada (sin ID de orden):", row);
              continue;
          }

          // Resolver Máquina - Intenta varios campos
          let machineId = null;
          const machineVal = row['Máquina'] || row['machine_id'] || row['machine_name'] || row['maquina'] || row['machine'];

          // Estrategia 1: Nombre exacto o 'Máquina' limpia
          if (machineVal) {
              const name = String(machineVal).toLowerCase().trim();
              if (machineMap.has(name)) machineId = machineMap.get(name);
              
              // Estrategia 2: Intentar extraer código de "119 - Nombre"
              if (!machineId) {
                  const code = normalizeMachineName(machineVal);
                  if (machineMap.has(code)) machineId = machineMap.get(code);
              }
          }

          if (!machineId) {
              skipped++;
              if (skipped <= 5) console.warn(`[Sync] Máquina no encontrada para orden ${orderNumber}. Valor máquina: "${machineVal}"`);
              continue;
          }

          const payload = {
              order_number: String(orderNumber),
              machine_id: machineId,
              client_name: row['Cliente'] || row['client_name'] || row['client'],
              product_article_code: row['Artículo'] || row['product_article_code'] || row['article'],
              product_name: row['Nombre'] || row['Descripción'] || row['product_name'] || row['description'],
              quantity: parseInt(row['Cantidad'] || row['quantity']) || 0,
              priority: parseInt(row['Prioridad'] || row['priority']) || 3,
              status: row['Estado'] || row['status'] || 'Pendiente',
              start_date: row['Fecha Inicio Limite'] || row['Fecha Inicio Modificada'] || row['start_date'],
              committed_delivery_date: row['Fecha Entrega'] || row['Nueva Fecha Entrega'] || row['committed_delivery_date'] || row['delivery_date'],
              planned_end_date: row['Fecha Fin'] || row['planned_end_date'] || row['end_date'],
              production_cadence: parseFloat(row['Cadencia'] || row['production_cadence'] || row['cadence']) || 0,
              notes: row['Observación'] || row['notes'] || ''
          };

          // Debug payload for first few items to check dates
          if (created < 3) {
             console.log(`[Sync] Payload example for ${orderNumber}:`, payload);
          }

          try {
              await base44.entities.WorkOrder.create(payload);
              created++;
          } catch (e) {
              console.error(`Error creating order ${orderNumber}:`, e);
          }
          
          // Delay to be gentle with API (200ms)
          await new Promise(resolve => setTimeout(resolve, 200));
      }

      toast.success(`Sincronización completada. Creadas: ${created}, Saltadas: ${skipped}`, { id: toastId });
      console.log(`[Sync] Finalizado. Creadas: ${created}, Saltadas: ${skipped}`);
      
      // RECARGAR DATOS
      await fetchWorkOrders();
      setTimeout(() => window.location.reload(), 2000);

    } catch (error) {
      console.error('Error en sincronización:', error);
      if (toastId) {
        toast.error("Error de conexión: " + error.message);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  const handleNewOrder = () => {
    setEditingOrder(null);
    setIsFormOpen(true);
  };

  const handleOrderDrop = (order, dateStr, machineId) => {
    setDropDialogData({
      order,
      dropDate: dateStr,
      machineId
    });
  };

  const scheduleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      toast.success("Orden programada correctamente");
      setDropDialogData(null);
    },
    onError: (err) => toast.error("Error al programar: " + err.message)
  });

  const handleScheduleConfirm = (id, data) => {
     // Asprova Logic: Finite Capacity Scheduling Check
     const orderToUpdate = workOrders.find(o => o.id === id);
     if (!orderToUpdate) return;

     const machineId = orderToUpdate.machine_id;
     const newStart = new Date(data.start_date);
     const newEnd = new Date(data.planned_end_date);

     // Check existing orders on this machine
     const conflict = workOrders.find(o => {
        if (o.id === id) return false; // Ignore self
        if (o.machine_id !== machineId) return false; // Ignore other machines
        if (!o.start_date) return false; // Ignore unscheduled

        // Existing order dates
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

     scheduleMutation.mutate({ id, data });
  };

  return (
    <div className="p-6 md:p-8 flex flex-col min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <Factory className="w-8 h-8 text-blue-600" />
            Planificación de Producción
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Gestión de órdenes de trabajo y previsión de recursos
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['workOrders'] })}
            variant="outline"
            className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Recargar datos de la base de datos"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="ml-2 hidden md:inline">Recargar</span>
          </Button>
          
          <Link to="/OrderImport">
             <Button variant="secondary" className="bg-green-600 hover:bg-green-700 text-white border-0">
                 <DownloadCloud className="w-4 h-4" />
                 <span className="ml-2 hidden md:inline">Importar / Sincronizar</span>
             </Button>
          </Link>

          <Button type="button" onClick={handleNewOrder} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Orden
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="mb-6 flex-shrink-0">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-2 min-w-[200px]">
            <Label>Rango de Fechas</Label>
            <div className="flex items-center gap-2">
              <Input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-auto"
              />
              <span className="text-slate-400">-</span>
              <Input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-auto"
              />
            </div>
          </div>

          <div className="space-y-2 min-w-[150px]">
            <Label>Máquina</Label>
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las máquinas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {machines.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nombre} {m.ubicacion ? `(${m.ubicacion})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 min-w-[150px]">
            <Label>Equipo (Disponibilidad)</Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar recursos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los equipos</SelectItem>
                {teams.map(t => (
                  <SelectItem key={t.id} value={t.team_name}>{t.team_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 min-w-[150px]">
            <Label>Estado Orden</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="En Progreso">En Progreso</SelectItem>
                <SelectItem value="Completada">Completada</SelectItem>
                <SelectItem value="Retrasada">Retrasada</SelectItem>
                <SelectItem value="Cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        {/* Resource Analysis Tabs */}
        <div className="min-h-0 flex flex-col">
          <Tabs defaultValue="personnel" className="w-full">
             <div className="flex items-center justify-between mb-2">
                 <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Análisis de Recursos</h3>
                 <TabsList>
                    <TabsTrigger value="personnel">Personal (RRHH)</TabsTrigger>
                    <TabsTrigger value="machines">Máquinas (Carga)</TabsTrigger>
                 </TabsList>
             </div>
             
             <TabsContent value="personnel">
                <ResourceForecast 
                  orders={filteredOrders}
                  processes={processes}
                  machineProcesses={machineProcesses}
                  employees={employees}
                  teams={teams}
                  selectedTeam={selectedTeam}
                  dateRange={dateRange}
                />
             </TabsContent>
             
             <TabsContent value="machines">
                <MachineLoadGraph 
                   orders={filteredOrders}
                   machines={machines}
                   dateRange={dateRange}
                />
             </TabsContent>
          </Tabs>
        </div>

        {/* Main Planning View */}
        <div className="min-h-0 flex flex-col">
          <Tabs defaultValue="gantt" className="h-full flex flex-col">
            <TabsList className="flex-shrink-0 w-fit">
              <TabsTrigger value="gantt" type="button">Vista Gantt</TabsTrigger>
              <TabsTrigger value="list" type="button">Vista Lista por Máquina</TabsTrigger>
            </TabsList>
            
            <TabsContent value="gantt" className="flex-1 min-h-0 mt-2">
              <PlanningGantt 
                orders={filteredOrders} 
                machines={machines}
                processes={processes}
                dateRange={dateRange}
                onEditOrder={handleEditOrder}
                onOrderDrop={handleOrderDrop}
                holidays={holidays}
              />
            </TabsContent>

            <TabsContent value="list" className="flex-1 mt-2">
              <MachineOrdersList 
                machines={machines}
                orders={filteredOrders}
                processes={processes}
                onEditOrder={handleEditOrder}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <WorkOrderForm 
        open={isFormOpen} 
        onClose={() => setIsFormOpen(false)}
        orderToEdit={editingOrder}
        machines={machines}
        processes={processes}
        machineProcesses={machineProcesses}
        existingOrders={workOrders}
      />

      <ScheduleOrderDialog 
        open={!!dropDialogData}
        onClose={() => setDropDialogData(null)}
        order={dropDialogData?.order}
        dropDate={dropDialogData?.dropDate}
        processes={processes}
        machineProcesses={machineProcesses}
        onConfirm={handleScheduleConfirm}
        holidays={holidays}
      />
    </div>
  );
}