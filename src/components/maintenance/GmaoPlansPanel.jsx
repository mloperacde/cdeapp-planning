import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertCircle, CheckCircle, Clock, AlertTriangle, Play, CalendarPlus,
  ChevronDown, ChevronUp, Settings, Save, X, Plus, Wrench
} from "lucide-react";
import { format, differenceInDays, isPast, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import AssignPlanDialog from "./AssignPlanDialog";

const PERIODICIDADES = {
  'Diaria': 1, 'Semanal': 7, 'Quincenal': 15, 'Mensual': 30,
  'Trimestral': 90, 'Semestral': 180, 'Anual': 365,
};

export default function GmaoPlansPanel({ machine }) {
  const [expandedType, setExpandedType] = useState(null);
  const [configuringTypeId, setConfiguringTypeId] = useState(null);
  const [configForm, setConfigForm] = useState({});
  const [showAssign, setShowAssign] = useState(false);
  const queryClient = useQueryClient();

  const { data: maintenanceTypes = [] } = useQuery({
    queryKey: ["maintenanceTypes"],
    queryFn: () => base44.entities.MaintenanceType.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allPlans = [] } = useQuery({
    queryKey: ["maintenance-plans"],
    queryFn: () => base44.entities.MaintenancePlan.list(undefined, 500),
    staleTime: 5 * 60 * 1000,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["maintenance-plans"] });
    queryClient.invalidateQueries({ queryKey: ["maintenanceTypes"] });
    queryClient.invalidateQueries({ queryKey: ["maintenances"] });
    queryClient.invalidateQueries({ queryKey: ["equipment-inventory"] });
  };

  const savePlanMutation = useMutation({
    mutationFn: async ({ type, relatedPlan, form }) => {
      const diasIntervalo = PERIODICIDADES[form.periodicidad] || parseInt(form.dias_intervalo) || 30;
      const ultimaEjecucion = form.ultima_ejecucion ? new Date(form.ultima_ejecucion) : new Date();
      const proximaFecha = addDays(ultimaEjecucion, diasIntervalo);
      const data = {
        periodicidad: form.periodicidad,
        dias_intervalo: diasIntervalo,
        ultima_ejecucion: ultimaEjecucion.toISOString(),
        proxima_fecha: proximaFecha.toISOString().split("T")[0],
      };
      if (relatedPlan) {
        return base44.entities.MaintenancePlan.update(relatedPlan.id, data);
      } else {
        return base44.entities.MaintenancePlan.create({
          maintenance_type_id: type.id,
          machine_id: machine.id,
          machine_name: machine.nombre,
          nombre_plan: type.nombre,
          tipo: "Preventivo",
          activo: true,
          ...data,
        });
      }
    },
    onSuccess: () => {
      invalidateAll();
      setConfiguringTypeId(null);
      setConfigForm({});
      toast.success("Configuración guardada");
    },
    onError: () => toast.error("Error al guardar"),
  });

  const executeMutation = useMutation({
    mutationFn: (plan_id) => base44.functions.invoke("triggerMaintenanceExecution", { plan_id, immediate: true }),
    onSuccess: () => { invalidateAll(); toast.success("Orden de trabajo generada"); },
    onError: () => toast.error("Error al ejecutar"),
  });

  const scheduleMutation = useMutation({
    mutationFn: (plan_id) => base44.functions.invoke("triggerMaintenanceExecution", { plan_id, immediate: false }),
    onSuccess: () => { invalidateAll(); toast.success("Orden programada"); },
    onError: () => toast.error("Error al programar"),
  });

  if (!machine) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
        <Wrench className="w-10 h-10 opacity-20" />
        <p className="text-sm">Selecciona un equipo</p>
      </div>
    );
  }

  const assignedTypes = maintenanceTypes.filter(mt =>
    mt.machine_ids?.includes(machine.id) && mt.activo !== false
  );
  const machinePlans = allPlans.filter(p => p.machine_id === machine.id);

  const getTareas = (type) => {
    const tareas = [];
    for (let i = 1; i <= 6; i++) {
      const t = type[`tarea_${i}`];
      if (t?.nombre) {
        const subtareas = [];
        for (let j = 1; j <= 8; j++) {
          const st = t[`subtarea_${j}`];
          if (st?.titulo) subtareas.push(st);
        }
        tareas.push({ ...t, subtareas });
      }
    }
    return tareas;
  };

  const getPlanStatus = (plan) => {
    if (!plan?.proxima_fecha) return null;
    const dias = differenceInDays(new Date(plan.proxima_fecha), new Date());
    if (isPast(new Date(plan.proxima_fecha))) return { label: "VENCIDO", color: "bg-red-100 text-red-700", icon: AlertTriangle };
    if (dias <= 7) return { label: "PRÓXIMO", color: "bg-orange-100 text-orange-700", icon: Clock };
    return { label: "Activo", color: "bg-green-100 text-green-700", icon: CheckCircle };
  };

  const openConfig = (type, relatedPlan) => {
    setConfiguringTypeId(type.id);
    setConfigForm({
      periodicidad: relatedPlan?.periodicidad || "Mensual",
      dias_intervalo: relatedPlan?.dias_intervalo || 30,
      ultima_ejecucion: relatedPlan?.ultima_ejecucion
        ? new Date(relatedPlan.ultima_ejecucion).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    });
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{machine.nombre}</p>
          <p className="text-[10px] text-slate-400">{assignedTypes.length} plan(es) asignado(s)</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
          onClick={() => setShowAssign(true)}
        >
          <Plus className="w-3 h-3" />
          Asignar
        </Button>
      </div>

      {/* Plans list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {assignedTypes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
            <AlertCircle className="w-8 h-8 opacity-30" />
            <p className="text-xs text-center">Sin planes asignados.<br />Usa el botón "Asignar" para añadir.</p>
          </div>
        ) : assignedTypes.map(type => {
          const tareas = getTareas(type);
          const isExpanded = expandedType === type.id;
          const relatedPlan = machinePlans.find(p => p.maintenance_type_id === type.id)
            || machinePlans.find(p => p.nombre_plan?.toLowerCase().includes(type.nombre?.toLowerCase().split(" ")[0]));
          const planStatus = getPlanStatus(relatedPlan);
          const StatusIcon = planStatus?.icon;
          const isConfiguring = configuringTypeId === type.id;

          return (
            <Card key={type.id} className={`border ${relatedPlan && isPast(new Date(relatedPlan.proxima_fecha || "2099")) ? "border-red-300 bg-red-50/50" : "border-slate-200"}`}>
              <CardContent className="p-3 space-y-2">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{type.nombre}</p>
                    {type.descripcion && <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{type.descripcion}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {planStatus && (
                      <Badge className={`${planStatus.color} text-[10px] px-1.5 py-0 flex items-center gap-0.5`}>
                        <StatusIcon className="w-2.5 h-2.5" />
                        {planStatus.label}
                      </Badge>
                    )}
                    <button
                      onClick={() => isConfiguring ? setConfiguringTypeId(null) : openConfig(type, relatedPlan)}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
                    >
                      {isConfiguring ? <X className="w-3 h-3" /> : <Settings className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Config panel */}
                {isConfiguring && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-2.5 space-y-2">
                    <p className="text-[10px] font-semibold text-blue-700">Configurar periodicidad</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <Label className="text-[10px]">Periodicidad</Label>
                        <Select
                          value={configForm.periodicidad}
                          onValueChange={v => setConfigForm(f => ({ ...f, periodicidad: v, dias_intervalo: PERIODICIDADES[v] || f.dias_intervalo }))}
                        >
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.keys(PERIODICIDADES).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px]">Última intervención</Label>
                        <Input
                          type="date"
                          className="h-7 text-xs"
                          value={configForm.ultima_ejecucion}
                          onChange={e => setConfigForm(f => ({ ...f, ultima_ejecucion: e.target.value }))}
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full h-7 text-xs gap-1"
                      onClick={() => savePlanMutation.mutate({ type, relatedPlan, form: configForm })}
                      disabled={savePlanMutation.isPending}
                    >
                      <Save className="w-3 h-3" />
                      {savePlanMutation.isPending ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                )}

                {/* Plan info */}
                {relatedPlan && (
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-slate-50 dark:bg-slate-800/50 rounded p-2">
                    <div><span className="text-slate-400">Periodicidad</span><p className="font-medium">{relatedPlan.periodicidad || "—"}</p></div>
                    <div><span className="text-slate-400">Intervalo</span><p className="font-medium">{relatedPlan.dias_intervalo ? `${relatedPlan.dias_intervalo}d` : "—"}</p></div>
                    {relatedPlan.ultima_ejecucion && (
                      <div><span className="text-slate-400">Último</span><p className="font-medium">{format(new Date(relatedPlan.ultima_ejecucion), "dd/MM/yy", { locale: es })}</p></div>
                    )}
                    {relatedPlan.proxima_fecha && (
                      <div>
                        <span className="text-slate-400">Próximo</span>
                        <p className={`font-medium ${isPast(new Date(relatedPlan.proxima_fecha)) ? "text-red-600" : ""}`}>
                          {format(new Date(relatedPlan.proxima_fecha), "dd/MM/yy", { locale: es })}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tasks toggle */}
                {tareas.length > 0 && (
                  <div>
                    <button
                      onClick={() => setExpandedType(isExpanded ? null : type.id)}
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      {isExpanded ? <><ChevronUp className="w-3 h-3" />Ocultar tareas</> : <><ChevronDown className="w-3 h-3" />{tareas.length} tarea(s)</>}
                    </button>
                    {isExpanded && (
                      <div className="mt-1.5 space-y-1 border-t border-slate-100 pt-1.5">
                        {tareas.map((tarea, idx) => (
                          <div key={idx} className="text-[10px] flex items-start gap-1.5">
                            <span className="text-blue-500 font-bold flex-shrink-0">{idx + 1}.</span>
                            <div>
                              <p className="font-medium">{tarea.nombre}</p>
                              {tarea.subtareas.length > 0 && (
                                <ul className="mt-0.5 space-y-0.5 pl-2">
                                  {tarea.subtareas.map((st, si) => (
                                    <li key={si} className="text-slate-500">• {st.titulo}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            {tarea.duracion_minutos > 0 && <span className="ml-auto text-slate-400 flex-shrink-0">{tarea.duracion_minutos}min</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {relatedPlan && (
                  <div className="flex gap-1.5 pt-1 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-[10px] gap-1 text-green-700 border-green-300 hover:bg-green-50"
                      onClick={() => executeMutation.mutate(relatedPlan.id)}
                      disabled={executeMutation.isPending}
                    >
                      <Play className="w-3 h-3" />Ejecutar ahora
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-[10px] gap-1 text-blue-700 border-blue-300 hover:bg-blue-50"
                      onClick={() => scheduleMutation.mutate(relatedPlan.id)}
                      disabled={scheduleMutation.isPending}
                    >
                      <CalendarPlus className="w-3 h-3" />Programar
                    </Button>
                  </div>
                )}

                {/* No plan yet — quick create */}
                {!relatedPlan && !isConfiguring && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full h-7 text-[10px] text-blue-600 hover:bg-blue-50"
                    onClick={() => openConfig(type, null)}
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Configurar calendario
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showAssign && (
        <AssignPlanDialog
          equipment={machine}
          onClose={() => setShowAssign(false)}
        />
      )}
    </div>
  );
}