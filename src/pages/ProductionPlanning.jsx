import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Factory, Users, Plus, Filter, AlertTriangle } from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import WorkOrderForm from "../components/planning/WorkOrderForm";
import PlanningGantt from "../components/planning/PlanningGantt";
import ResourceForecast from "../components/planning/ResourceForecast";

export default function ProductionPlanningPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  
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
    queryFn: () => base44.entities.Machine.list(),
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders'],
    queryFn: () => base44.entities.WorkOrder.list(),
  });

  const { data: processes = [] } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.list(),
  });

  const { data: machineProcesses = [] } = useQuery({
    queryKey: ['machineProcesses'],
    queryFn: () => base44.entities.MachineProcess.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
  });

  // Derived Data
  const filteredOrders = useMemo(() => {
    return workOrders.filter(order => {
      // Filter by Machine
      if (selectedMachine !== "all" && order.machine_id !== selectedMachine) return false;
      
      // Filter by Status
      if (selectedStatus !== "all" && order.status !== selectedStatus) return false;
      
      // Filter by Date Range (Check overlap)
      const orderStart = new Date(order.start_date);
      const orderEnd = new Date(order.committed_delivery_date); // Using delivery date as end for visualization
      const rangeStart = new Date(dateRange.start);
      const rangeEnd = new Date(dateRange.end);
      
      return orderStart <= rangeEnd && orderEnd >= rangeStart;
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

  return (
    <div className="p-6 md:p-8 flex flex-col h-screen overflow-hidden">
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
          <Button onClick={handleNewOrder} className="bg-blue-600 hover:bg-blue-700">
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
        {/* Gantt View */}
        <div className="min-h-0 flex flex-col">
          <PlanningGantt 
            orders={filteredOrders} 
            machines={machines}
            processes={processes}
            dateRange={dateRange}
            onEditOrder={handleEditOrder}
          />
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
    </div>
  );
}