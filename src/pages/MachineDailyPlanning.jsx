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
import Breadcrumbs from "../components/common/Breadcrumbs";
import EmployeeAvailabilityPanel from "../components/availability/EmployeeAvailabilityPanel";
import MachinePlanningSelector from "../components/planning/MachinePlanningSelector";
import ViabilityTrafficLight from "../components/planning/ViabilityTrafficLight";
import AvailabilityDebugPanel from "../components/planning/AvailabilityDebugPanel";

export default function MachineDailyPlanningPage() {
  return <MachineDailyPlanningContent />;
}

function MachineDailyPlanningContent() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTeam, setSelectedTeam] = useState("team_1");
  const [planningData, setPlanningData] = useState({
    maquinas_planificadas: [],
    notas: "",
    estado: "Borrador"
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDraftOptions, setShowDraftOptions] = useState(false);

  const queryClient = useQueryClient();

  // Turno automático basado en equipo
  const turnoParaEquipo = useMemo(() => {
    const config = {
      team_1: "Mañana",
      team_2: "Tarde",
      team_3: "Noche"
    };
    return config[selectedTeam] || "Mañana";
  }, [selectedTeam]);

  // Cargar borrador al inicio
  React.useEffect(() => {
    const draftKey = `planning_draft_${selectedDate}_${turnoParaEquipo}_${selectedTeam}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setShowDraftOptions(true);
      } catch (e) {
        console.error('Error parsing draft:', e);
      }
    }
  }, [selectedDate, turnoParaEquipo, selectedTeam]);

  // Auto-guardar borrador cada 2 minutos
  React.useEffect(() => {
    if (planningData.maquinas_planificadas.length === 0) return;

    const interval = setInterval(() => {
      const draftKey = `planning_draft_${selectedDate}_${turnoParaEquipo}_${selectedTeam}`;
      localStorage.setItem(draftKey, JSON.stringify({
        ...planningData,
        timestamp: new Date().toISOString()
      }));
      toast.success("Borrador guardado automáticamente", { duration: 2000 });
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [planningData, selectedDate, turnoParaEquipo, selectedTeam]);

  // Guardar borrador al salir
  React.useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && planningData.maquinas_planificadas.length > 0) {
        const draftKey = `planning_draft_${selectedDate}_${turnoParaEquipo}_${selectedTeam}`;
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
  }, [hasUnsavedChanges, planningData, selectedDate, turnoParaEquipo, selectedTeam]);

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
    queryKey: ['dailyMachinePlannings', selectedDate, turnoParaEquipo],
    queryFn: () => base44.entities.DailyMachinePlanning.filter({
      fecha: selectedDate,
      turno: turnoParaEquipo
    }),
  });

  // DEBUG: Ver procesos y máquinas
  React.useEffect(() => {
    if (processes.length > 0 && machines.length > 0) {
      console.log('=== DEBUG PROCESOS Y MÁQUINAS ===');
      console.log('Procesos activos:', processes.length);
      console.log('Máquinas:', machines.length);
      
      // Verificar un proceso de ejemplo
      const procesoEjemplo = processes[0];
      if (procesoEjemplo) {
        console.log('Proceso ejemplo:', {
          nombre: procesoEjemplo.proceso_nombre,
          maquinas_asignadas: procesoEjemplo.maquinas_asignadas,
          tipo: typeof procesoEjemplo.maquinas_asignadas,
          esArray: Array.isArray(procesoEjemplo.maquinas_asignadas)
        });
      }
      
      // Verificar una máquina de ejemplo
      const maquinaEjemplo = machines[0];
      if (maquinaEjemplo) {
        console.log('Máquina ejemplo:', {
          nombre: maquinaEjemplo.machine_nombre,
          procesos_asignados: maquinaEjemplo.procesos_asignados,
          tipo: typeof maquinaEjemplo.procesos_asignados
        });
      }
    }
  }, [processes, machines]);

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
    const fabricacionEmployees = employees.filter(emp => {
      const isActive = emp.estado_empleado === "Alta";
      const isFabricacion = emp.departamento === "FABRICACION";
      const incluir = emp.incluir_en_planning !== false;
      
      // Filtrar por equipo
      const employeeTeamName = emp.equipo;
      if (!employeeTeamName) return false;
      
      const teamConfig = teams.find(t => t.team_name === employeeTeamName);
      if (!teamConfig) return false;
      
      return teamConfig.team_key === selectedTeam;
    });

    console.log('✅ Empleados filtrados:', {
      total: employees.length,
      filtrados: fabricacionEmployees.length,
      equipo: selectedTeam,
      nombreEquipo: teams.find(t => t.team_key === selectedTeam)?.team_name
    });

    const selectedDateObj = new Date(selectedDate + 'T00:00:00');
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
    toast.success(`${machineData.machine_nombre} añadida al planning`);
  };

  const handleRemoveMachine = (index) => {
    setPlanningData(prev => ({
      ...prev,
      maquinas_planificadas: prev.maquinas_planificadas.filter((_, i) => i !== index)
    }));
    setHasUnsavedChanges(true);
  };

  const handleLoadDraft = () => {
    const draftKey = `planning_draft_${selectedDate}_${turnoParaEquipo}_${selectedTeam}`;
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
    const draftKey = `planning_draft_${selectedDate}_${turnoParaEquipo}_${selectedTeam}`;
    localStorage.removeItem(draftKey);
    setPlanningData({ maquinas_planificadas: [], notas: "", estado: "Borrador" });
    setHasUnsavedChanges(false);
    setShowDraftOptions(false);
    toast.success("Borrador eliminado");
  };

  const handleSave = (confirmar = false) => {
    const planningToSave = {
      fecha: selectedDate,
      turno: turnoParaEquipo,
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

    if (confirmar) {
      const draftKey = `planning_draft_${selectedDate}_${turnoParaEquipo}_${selectedTeam}`;
      localStorage.removeItem(draftKey);
    }

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
                <Label>Turno Asignado</Label>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md font-medium flex items-center gap-2">
                  <Badge className="bg-blue-600">{turnoParaEquipo}</Badge>
                  <span className="text-sm">(Automático para el equipo)</span>
                </div>
                <p className="text-xs text-slate-500">
                  El equipo {teams.find(t => t.team_key === selectedTeam)?.team_name} trabaja en turno de {turnoParaEquipo}
                </p>
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

        <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100 space-y-1 flex-1">
                <p><strong>📅 Fecha:</strong> {format(new Date(selectedDate), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</p>
                <p><strong>⏰ Turno:</strong> {turnoParaEquipo}</p>
                <p><strong>👥 Equipo:</strong> {teams.find(t => t.team_key === selectedTeam)?.team_name || selectedTeam}</p>
                <p><strong>✅ Disponibles:</strong> {availability.disponibles} empleados del equipo {teams.find(t => t.team_key === selectedTeam)?.team_name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 space-y-4">
            <EmployeeAvailabilityPanel
              employees={employees}
              absences={absences}
              selectedDate={selectedDate}
            />
            {currentUser?.role === 'admin' && (
              <AvailabilityDebugPanel
                employees={employees}
                absences={absences}
                selectedDate={selectedDate}
              />
            )}
          </div>

          <div>
            <ViabilityTrafficLight
              totalRequeridos={totalRequeridos}
              totalDisponibles={availability.disponibles}
            />
          </div>
        </div>

        <div className="mb-6">
          <MachinePlanningSelector
            machines={machines}
            processes={processes}
            onAddMachine={handleAddMachine}
            alreadySelectedIds={alreadySelectedIds}
          />
        </div>

        {/* Resto del código igual... */}
        {/* ... mantén el resto de tu JSX como está ... */}
        
      </div>
    </div>
  );
}