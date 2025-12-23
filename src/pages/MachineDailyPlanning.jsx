import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Factory, 
  Calendar, 
  Save, 
  CheckCircle2, 
  Trash2, 
  AlertCircle,
  ArrowLeft,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ProtectedPage from "../components/roles/ProtectedPage";
import Breadcrumbs from "../components/common/Breadcrumbs";
import EmployeeAvailabilityPanel from "../components/availability/EmployeeAvailabilityPanel";
import MachinePlanningSelector from "../components/planning/MachinePlanningSelector";
import ViabilityTrafficLight from "../components/planning/ViabilityTrafficLight";

export default function MachineDailyPlanningPage() {
  return (
    <ProtectedPage module="planning" action="create">
      <MachineDailyPlanningContent />
    </ProtectedPage>
  );
}

function MachineDailyPlanningContent() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTurno, setSelectedTurno] = useState("Mañana");
  const [selectedTeam, setSelectedTeam] = useState("team_1");
  const [planningData, setPlanningData] = useState({
    maquinas_planificadas: [],
    notas: "",
    estado: "Borrador"
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
  });

  const { data: absences = [] } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-fecha_inicio', 500),
  });

  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
  });

  const { data: processes = [] } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.filter({ activo: true }),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
  });

  const { data: existingPlannings = [] } = useQuery({
    queryKey: ['dailyMachinePlannings', selectedDate, selectedTurno],
    queryFn: () => base44.entities.DailyMachinePlanning.filter({
      fecha: selectedDate,
      turno: selectedTurno
    }),
  });

  const savePlanningMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.DailyMachinePlanning.create(data);
    },
    onSuccess: () => {
      toast.success("Planning guardado correctamente");
      queryClient.invalidateQueries({ queryKey: ['dailyMachinePlannings'] });
      setPlanningData({ maquinas_planificadas: [], notas: "", estado: "Borrador" });
    },
    onError: (error) => {
      toast.error("Error al guardar: " + error.message);
    }
  });

  // Calcular disponibilidad
  const availability = useMemo(() => {
    const fabricacionEmployees = employees.filter(emp => 
      emp.departamento === "FABRICACION" &&
      emp.estado_empleado === "Alta" &&
      emp.incluir_en_planning === true &&
      ["Responsable de Línea", "Segunda de Línea", "Operaria/o de Línea"].includes(emp.puesto)
    );

    const selectedDateObj = new Date(selectedDate);
    const ausenciasConfirmadas = absences.filter(abs => {
      if (abs.estado_aprobacion !== "Aprobada") return false;
      const inicio = new Date(abs.fecha_inicio);
      const fin = abs.fecha_fin ? new Date(abs.fecha_fin) : null;
      
      if (abs.fecha_fin_desconocida) return selectedDateObj >= inicio;
      return fin && selectedDateObj >= inicio && selectedDateObj <= fin;
    });

    const empleadosAusentesIds = new Set(ausenciasConfirmadas.map(a => a.employee_id));
    const ausentes = fabricacionEmployees.filter(emp => empleadosAusentesIds.has(emp.id)).length;
    const disponibles = fabricacionEmployees.length - ausentes;

    return {
      total: fabricacionEmployees.length,
      ausentes,
      disponibles
    };
  }, [employees, absences, selectedDate]);

  const totalRequeridos = useMemo(() => {
    return planningData.maquinas_planificadas.reduce((sum, m) => sum + (m.operadores_requeridos || 0), 0);
  }, [planningData.maquinas_planificadas]);

  const estadoViabilidad = useMemo(() => {
    const MARGEN = 2;
    const margen = availability.disponibles - totalRequeridos;
    
    if (totalRequeridos === 0) return "VERDE";
    if (margen >= MARGEN) return "VERDE";
    if (margen >= 0) return "AMARILLO";
    return "ROJO";
  }, [totalRequeridos, availability.disponibles]);

  const handleAddMachine = (machineData) => {
    setPlanningData(prev => ({
      ...prev,
      maquinas_planificadas: [...prev.maquinas_planificadas, machineData]
    }));
    toast.success(`${machineData.machine_nombre} añadida al planning`);
  };

  const handleRemoveMachine = (index) => {
    setPlanningData(prev => ({
      ...prev,
      maquinas_planificadas: prev.maquinas_planificadas.filter((_, i) => i !== index)
    }));
  };

  const handleSave = (confirmar = false) => {
    const planningToSave = {
      fecha: selectedDate,
      turno: selectedTurno,
      team_key: selectedTeam,
      maquinas_planificadas: planningData.maquinas_planificadas,
      total_empleados_requeridos: totalRequeridos,
      total_empleados_disponibles: availability.disponibles,
      empleados_fabricacion_total: availability.total,
      empleados_ausentes: availability.ausentes,
      estado_viabilidad: estadoViabilidad,
      margen_empleados: availability.disponibles - totalRequeridos,
      notas: planningData.notas,
      creado_por: currentUser?.email,
      creado_por_nombre: currentUser?.full_name,
      estado: confirmar ? "Confirmado" : "Borrador",
      confirmado_por: confirmar ? currentUser?.email : null,
      fecha_confirmacion: confirmar ? new Date().toISOString() : null
    };

    savePlanningMutation.mutate(planningToSave);
  };

  const alreadySelectedIds = planningData.maquinas_planificadas.map(m => m.machine_id);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs items={[
          { label: "Planificación", url: createPageUrl("DailyPlanning") },
          { label: "Planning de Máquinas" }
        ]} />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <Factory className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
            Planificación Diaria de Máquinas
          </h1>
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-1">
            Planifica qué máquinas arrancar según disponibilidad de personal
          </p>
        </div>

        {/* Filtros */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Turno</Label>
                <Select value={selectedTurno} onValueChange={setSelectedTurno}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mañana">Mañana</SelectItem>
                    <SelectItem value="Tarde">Tarde</SelectItem>
                    <SelectItem value="Noche">Noche</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Equipo</Label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.team_key} value={team.team_key}>
                        {team.team_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Planning Info */}
        <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100 space-y-1 flex-1">
                <p><strong>📅 Fecha:</strong> {format(new Date(selectedDate), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</p>
                <p><strong>⏰ Turno:</strong> {selectedTurno}</p>
                <p><strong>👥 Equipo:</strong> {teams.find(t => t.team_key === selectedTeam)?.team_name || selectedTeam}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Panel de disponibilidad */}
          <div className="lg:col-span-2">
            <EmployeeAvailabilityPanel
              employees={employees}
              absences={absences}
              selectedDate={selectedDate}
            />
          </div>

          {/* Semáforo */}
          <div>
            <ViabilityTrafficLight
              totalRequeridos={totalRequeridos}
              totalDisponibles={availability.disponibles}
            />
          </div>
        </div>

        {/* Selector de Máquinas */}
        <div className="mb-6">
          <MachinePlanningSelector
            machines={machines}
            processes={processes}
            onAddMachine={handleAddMachine}
            alreadySelectedIds={alreadySelectedIds}
          />
        </div>

        {/* Máquinas Planificadas */}
        <Card className="mb-6 shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between">
              <span>Máquinas Planificadas ({planningData.maquinas_planificadas.length})</span>
              <Badge className="bg-purple-600 text-lg px-4">
                Total: {totalRequeridos} operadores
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {planningData.maquinas_planificadas.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 dark:text-slate-400">
                  No hay máquinas planificadas. Usa el selector arriba para añadir.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {planningData.maquinas_planificadas.map((maq, index) => (
                  <Card key={index} className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-blue-600 text-white font-mono">
                              #{index + 1}
                            </Badge>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100">
                              {maq.machine_nombre}
                            </h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              ({maq.machine_codigo})
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-600 dark:text-slate-400">Proceso:</span>
                              <Badge variant="outline">{maq.process_nombre}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-600 dark:text-slate-400">Operadores:</span>
                              <Badge className="bg-purple-600 text-white">
                                {maq.operadores_requeridos}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMachine(index)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notas */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Notas y Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={planningData.notas}
              onChange={(e) => setPlanningData({...planningData, notas: e.target.value})}
              placeholder="Añade notas sobre esta planificación (ej: consideraciones especiales, ajustes necesarios...)"
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={planningData.maquinas_planificadas.length === 0 || savePlanningMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar Borrador
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={
              planningData.maquinas_planificadas.length === 0 || 
              estadoViabilidad === "ROJO" ||
              savePlanningMutation.isPending
            }
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Confirmar Planning
          </Button>
        </div>

        {estadoViabilidad === "ROJO" && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200 font-semibold">
              ⚠️ No se puede confirmar: la planificación es inviable. Reduce el número de máquinas o verifica las ausencias.
            </p>
          </div>
        )}

        {/* Plannings existentes */}
        {existingPlannings.length > 0 && (
          <Card className="mt-6 bg-slate-50 dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-600" />
                Planificaciones Guardadas para esta Fecha/Turno
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {existingPlannings.map(plan => (
                  <div key={plan.id} className="p-3 bg-white dark:bg-slate-700 rounded border">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge className={
                          plan.estado === "Confirmado" ? "bg-green-600" :
                          plan.estado === "Borrador" ? "bg-slate-500" :
                          "bg-blue-600"
                        }>
                          {plan.estado}
                        </Badge>
                        <p className="text-sm mt-2">
                          {plan.maquinas_planificadas?.length || 0} máquinas | {plan.total_empleados_requeridos} operadores
                        </p>
                        <p className="text-xs text-slate-500">
                          Por: {plan.creado_por_nombre} - {format(new Date(plan.created_date), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                      <Badge variant="outline" className={
                        plan.estado_viabilidad === "VERDE" ? "bg-green-50 text-green-700" :
                        plan.estado_viabilidad === "AMARILLO" ? "bg-yellow-50 text-yellow-700" :
                        "bg-red-50 text-red-700"
                      }>
                        {plan.estado_viabilidad}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}