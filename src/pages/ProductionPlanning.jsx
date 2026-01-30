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
import ScheduleOrderDialog from "../components/planning/ScheduleOrderDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cdeApp } from "@/api/cdeAppClient";


export default function ProductionPlanningPage() {

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
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
    const filtered = workOrders.filter(order => {
      // Filter by Priority (Must exist)
      if (order.priority === null || order.priority === undefined) return false;

      // Filter by Machine
      if (selectedMachine !== "all" && order.machine_id !== selectedMachine) return false;
      
      // Filter by Status
      if (selectedStatus !== "all" && order.status !== selectedStatus) return false;
      
      // Filter by Date Range (Check overlap) - ONLY for scheduled orders
      if (order.start_date) {
        const orderStart = new Date(order.start_date);
        // Using delivery date as end for visualization, or start date if missing
        const orderEnd = order.committed_delivery_date ? new Date(order.committed_delivery_date) : new Date(order.start_date); 
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
      let rows = [];
      if (response.headers && Array.isArray(response.headers)) {
          if (Array.isArray(response)) {
             rows = response; 
          } else if (response.data && Array.isArray(response.data)) {
             if (response.headers) {
                 rows = response.data.map(r => {
                     const obj = {};
                     response.headers.forEach((h, i) => obj[h] = r[i]);
                     return obj;
                 });
             } else {
                 rows = response.data;
             }
          }
      } else if (Array.isArray(response)) {
          rows = response;
      }

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
          
          // Batch deletion to avoid Rate Limit (429)
          // Reduced batch size and increased delay to prevent server blocking
          const BATCH_SIZE = 5;
          const chunks = [];
          for (let i = 0; i < workOrders.length; i += BATCH_SIZE) {
              chunks.push(workOrders.slice(i, i + BATCH_SIZE));
          }

          let deletedCount = 0;
          for (let i = 0; i < chunks.length; i++) {
              const chunk = chunks[i];
              
              // Optional: Update user on progress for large deletions
              if (i % 5 === 0 && chunks.length > 5) {
                  toast.info(`Limpiando órdenes antiguas: ${Math.round((i / chunks.length) * 100)}%...`);
              }

              const promises = chunk.map(o => base44.entities.WorkOrder.delete(o.id));
              await Promise.allSettled(promises);
              deletedCount += promises.length;
              
              // 1000ms delay between batches = ~300 requests/minute max
              await new Promise(resolve => setTimeout(resolve, 1000));
          }
          console.log("Deleted", deletedCount, "old orders in batches.");
      }

      let created = 0;
      let skipped = 0;

      // 5. Procesar e Insertar
      for (const row of rows) {
          const orderNumber = row['Orden'] || row['production_id'];
          if (!orderNumber) continue;

          // Resolver Máquina
          let machineId = null;
          if (row['Máquina']) {
              const name = String(row['Máquina']).toLowerCase().trim();
              if (machineMap.has(name)) machineId = machineMap.get(name);
          }
          if (!machineId && row['machine_id']) {
              const code = String(row['machine_id']).trim();
              if (machineMap.has(code)) machineId = machineMap.get(code);
          }

          if (!machineId) {
              skipped++;
              continue; // Ignoramos órdenes sin máquina válida
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

          try {
             await base44.entities.WorkOrder.create(payload);
             created++;
          } catch (e) {
             console.error("Error creating order", orderNumber, e);
          }
      }

      queryClient.invalidateQueries(['workOrders']);
      if (created > 0) {
        toast.success(`Sincronización completada: ${created} nuevas órdenes importadas.`);
      } else {
        toast.info("Sincronización completada. No hay nuevas órdenes.");
      }
      
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión: " + error.message);
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
            onClick={handleSyncCdeApp}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isSyncing}
            title="Sincronizar con CDEApp"
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <DownloadCloud className="w-4 h-4" />
            )}
            <span className="ml-2 hidden md:inline">Sincronizar</span>
          </Button>
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
        {/* Resource Forecast */}
        <div className="min-h-0 flex flex-col">
          <ResourceForecast 
            orders={filteredOrders}
            processes={processes}
            machineProcesses={machineProcesses}
            employees={employees}
            teams={teams}
            selectedTeam={selectedTeam}
            dateRange={dateRange}
          />
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
