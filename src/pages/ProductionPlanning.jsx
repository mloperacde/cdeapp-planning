import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Factory, Plus } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import WorkOrderForm from "../components/planning/WorkOrderForm";
import PlanningGantt from "../components/planning/PlanningGantt";
import MachineOrdersList from "../components/planning/MachineOrdersList";
import ResourceForecast from "../components/planning/ResourceForecast";
import WorkOrderImporter from "../components/planning/WorkOrderImporter";
import ScheduleOrderDialog from "../components/planning/ScheduleOrderDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Breadcrumbs from "../components/common/Breadcrumbs";
import { useNavigationHistory } from "../components/utils/useNavigationHistory";

export default function ProductionPlanningPage() {
  const { goBack } = useNavigationHistory();
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
    return workOrders.filter(order => {
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
  }, [workOrders, selectedMachine, selectedStatus, dateRange]);

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
     scheduleMutation.mutate({ id, data });
  };

  return (
    <div className="p-6 md:p-8 flex flex-col h-screen overflow-hidden">
      <div className="mb-4 flex-shrink-0">
        <Breadcrumbs showBack={true} onBack={goBack} />
      </div>
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
          <WorkOrderImporter 
            machines={machines} 
            processes={processes} 
          />
          <Button type="button" onClick={handleNewOrder} className="bg-blue-600 hover:bg-blue-700">
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
                  <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
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

      <div className="flex-1 min-h-0 grid grid-rows-[2fr_1fr] gap-6">
        {/* Main Planning View */}
        <div className="min-h-0 flex flex-col">
          <Tabs defaultValue="gantt" className="h-full flex flex-col">
            <TabsList className="flex-shrink-0">
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

            <TabsContent value="list" className="flex-1 min-h-0 mt-2">
              <MachineOrdersList 
                machines={machines}
                orders={filteredOrders}
                processes={processes}
                onEditOrder={handleEditOrder}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Resource Forecast */}
        <div className="min-h-0 flex flex-col">
          <ResourceForecast 
            orders={filteredOrders}
            processes={processes}
            machineProcesses={machineProcesses}
            employees={employees}
            selectedTeam={selectedTeam}
            dateRange={dateRange}
          />
        </div>
      </div>

      <WorkOrderForm 
        open={isFormOpen} 
        onClose={() => setIsFormOpen(false)}
        orderToEdit={editingOrder}
        machines={machines}
        processes={processes}
        machineProcesses={machineProcesses}
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
