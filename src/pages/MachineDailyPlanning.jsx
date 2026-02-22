import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Factory, Calendar, Save, CheckCircle2, Trash2, AlertCircle, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { getMachineAlias } from "@/utils/machineAlias";
import { useAppData } from "../components/data/DataProvider";
import MachinePlanningSelector from "../components/planning/MachinePlanningSelector";
import ViabilityTrafficLight from "../components/planning/ViabilityTrafficLight";
import EmployeeAvailabilityPanel from "../components/availability/EmployeeAvailabilityPanel";

export default function MachineDailyPlanningPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTurno, setSelectedTurno] = useState("Mañana");
  const [selectedTeam, setSelectedTeam] = useState("team_1");
  const [planningData, setPlanningData] = useState({
    maquinas_planificadas: [],
    notas: "",
    estado: "Borrador"
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDraftOptions, setShowDraftOptions] = useState(false);

  const queryClient = useQueryClient();

  // Cargar borrador al inicio
  useEffect(() => {
    const draftKey = `planning_draft_${selectedDate}_${selectedTurno}_${selectedTeam}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        JSON.parse(savedDraft);
        setShowDraftOptions(true);
        // No cargamos automáticamente, mostramos opción
      } catch (e) {
        console.error('Error parsing draft:', e);
      }
    }
  }, [selectedDate, selectedTurno, selectedTeam]);

  // Auto-guardar borrador cada 2 minutos
  useEffect(() => {
    if (planningData.maquinas_planificadas.length === 0) return;

    const interval = setInterval(() => {
      const draftKey = `planning_draft_${selectedDate}_${selectedTurno}_${selectedTeam}`;
      localStorage.setItem(draftKey, JSON.stringify({
        ...planningData,
        timestamp: new Date().toISOString()
      }));
      toast.success("Borrador guardado automáticamente", { duration: 2000 });
    }, 2 * 60 * 1000); // 2 minutos

    return () => clearInterval(interval);
  }, [planningData, selectedDate, selectedTurno, selectedTeam]);

  // Guardar borrador al salir
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && planningData.maquinas_planificadas.length > 0) {
        const draftKey = `planning_draft_${selectedDate}_${selectedTurno}_${selectedTeam}`;
        localStorage.setItem(draftKey, JSON.stringify({
          ...planningData,
          timestamp: new Date().toISOString()
        }));
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, planningData, selectedDate, selectedTurno, selectedTeam]);

  const { user: currentUser, employees = [], absences = [], machines = [], processes = [], teams = [] } = useAppData();

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
      setHasUnsavedChanges(false);
    },
    onError: (error) => {
      toast.error("Error al guardar: " + error.message);
    }
  });

  // Calcular disponibilidad
  const availability = useMemo(() => {
    console.log('🔍 Calculando disponibilidad:', { 
      totalEmployees: employees.length, 
      fecha: selectedDate,
      team: selectedTeam
    });

    // FILTRAR POR EQUIPO (incluyendo fijos por turno) Y DEPARTAMENTO
    const fabricacionEmployees = employees.filter(emp => {
      const isActive = emp.estado_empleado === "Alta";
      const d = (emp.departamento || "").toString().trim().toUpperCase();
      const isFabricacion = d === "PRODUCCIÓN" || d === "PRODUCCION";
      const incluir = emp.incluir_en_planning !== false;
      const teamName = teams.find(t => t.team_key === selectedTeam)?.team_name;
      const isTeamEmployee = !selectedTeam || emp.equipo === teamName;
      const turno = (selectedTurno || "").toString().toLowerCase();
      const isMorningShift = turno.includes("mañana") || turno.includes("t1");
      const isAfternoonShift = turno.includes("tarde") || turno.includes("t2");
      const includeByFixed = 
        (isMorningShift && emp.tipo_turno === "Fijo Mañana") ||
        (isAfternoonShift && emp.tipo_turno === "Fijo Tarde");
      const matchesTeam = isTeamEmployee || includeByFixed;
      
      return isActive && isFabricacion && incluir && matchesTeam;
    });

    console.log('👷 Empleados PRODUCCIÓN del equipo seleccionado:', fabricacionEmployees.length);

    const selectedDateObj = new Date(selectedDate + 'T00:00:00');
    const ausenciasConfirmadas = absences.filter(abs => {
      if (abs.estado_aprobacion !== "Aprobada") return false;
      const inicio = new Date(abs.fecha_inicio);
      const fin = abs.fecha_fin ? new Date(abs.fecha_fin) : null;
      
      if (abs.fecha_fin_desconocida) return selectedDateObj >= inicio;
      return fin && selectedDateObj >= inicio && selectedDateObj <= fin;
    });

    console.log('🚫 Ausencias ese día:', ausenciasConfirmadas.length);

    const empleadosAusentesIds = new Set(ausenciasConfirmadas.map(a => a.employee_id));
    const ausentes = fabricacionEmployees.filter(emp => empleadosAusentesIds.has(emp.id)).length;
    const disponibles = fabricacionEmployees.length - ausentes;

    console.log('✅ Disponibles del equipo:', disponibles, '/', fabricacionEmployees.length);

    return {
      total: fabricacionEmployees.length,
      ausentes,
      disponibles
    };
  }, [employees, absences, selectedDate, selectedTeam, teams]);

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
    setHasUnsavedChanges(true);
    toast.success(`${machineData.alias || machineData.machine_nombre} añadida al planning`);
  };

  const handleRemoveMachine = (index) => {
    setPlanningData(prev => ({
      ...prev,
      maquinas_planificadas: prev.maquinas_planificadas.filter((_, i) => i !== index)
    }));
    setHasUnsavedChanges(true);
  };

  const handleLoadDraft = () => {
    const draftKey = `planning_draft_${selectedDate}_${selectedTurno}_${selectedTeam}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      const draft = JSON.parse(savedDraft);
      setPlanningData({
        maquinas_planificadas: draft.maquinas_planificadas || [],
        notas: draft.notas || "",
        estado: "Borrador"
      });
      setHasUnsavedChanges(true);
      setShowDraftOptions(false);
      toast.success("Borrador cargado");
    }
  };

  const handleDeleteDraft = () => {
    const draftKey = `planning_draft_${selectedDate}_${selectedTurno}_${selectedTeam}`;
    localStorage.removeItem(draftKey);
    setPlanningData({ maquinas_planificadas: [], notas: "", estado: "Borrador" });
    setHasUnsavedChanges(false);
    setShowDraftOptions(false);
    toast.success("Borrador eliminado");
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

    // Si se confirma, eliminar borrador local
    if (confirmar) {
      const draftKey = `planning_draft_${selectedDate}_${selectedTurno}_${selectedTeam}`;
      localStorage.removeItem(draftKey);
    }

    savePlanningMutation.mutate(planningToSave);
  };

  const alreadySelectedIds = planningData.maquinas_planificadas.map(m => m.machine_id);

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Standard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Factory className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Planificación Diaria de Máquinas
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Planifica qué máquinas arrancar según disponibilidad de personal
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            {/* Actions if any */}
        </div>
      </div>

      <div className="flex flex-col gap-6">

        {/* Opciones de borrador */}
        {showDraftOptions && (
          <Card className="mb-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span className="font-semibold text-amber-900 dark:text-amber-100">
                    Borrador encontrado para esta fecha/turno/equipo
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleLoadDraft}
                    className="bg-white hover:bg-amber-50"
                  >
                    Continuar Borrador
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDraftOptions(false)}
                    className="bg-white hover:bg-slate-50"
                  >
                    Comenzar Nuevo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                <p><strong>✅ Disponibles:</strong> {availability.disponibles} empleados del equipo {teams.find(t => t.team_key === selectedTeam)?.team_name}</p>
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
                              {getMachineAlias({
                                nombre: maq.machine_nombre,
                                codigo: maq.machine_codigo,
                                ubicacion: maq.machine_ubicacion
                              })}
                            </h3>
                          </div>
                          <div className="space-y-2">
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
                            {maq.observaciones && (
                              <div className="text-xs text-slate-600 dark:text-slate-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-200 dark:border-amber-700">
                                <strong>📝 Observaciones:</strong> {maq.observaciones}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
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
              onChange={(e) => {
                setPlanningData({...planningData, notas: e.target.value});
                setHasUnsavedChanges(true);
              }}
              placeholder="Añade notas sobre esta planificación (ej: consideraciones especiales, ajustes necesarios...)"
              rows={3}
            />
            {hasUnsavedChanges && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Tienes cambios sin guardar
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-3 justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleDeleteDraft}
            disabled={planningData.maquinas_planificadas.length === 0}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar Borrador
          </Button>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={planningData.maquinas_planificadas.length === 0 || savePlanningMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Borrador
            </Button>
            <Button
              type="button"
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
