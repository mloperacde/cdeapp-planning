import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar, CheckCircle, Clock, AlertTriangle, Play, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { es } from "date-fns/locale";

export default function GmaoMaintenancePlans({ machine }) {
  const [expandedType, setExpandedType] = useState(null);
  const [executingPlanId, setExecutingPlanId] = useState(null);
  const queryClient = useQueryClient();

  const { data: maintenanceTypes = [] } = useQuery({
    queryKey: ['maintenance-types'],
    queryFn: () => base44.entities.MaintenanceType.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: machinePlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['gmao-plans', machine.id],
    queryFn: async () => {
      const allPlans = await base44.entities.MaintenancePlan.list(undefined, 200);
      return allPlans.filter(p => p.machine_id === machine.id);
    },
    staleTime: 5 * 60 * 1000,
  });

  const executePlanMutation = useMutation({
    mutationFn: (plan_id) => base44.functions.invoke('triggerMaintenanceExecution', { plan_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmao-plans', machine.id] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
      setExecutingPlanId(null);
    },
  });

  // Tipos asignados a esta máquina
  const assignedTypes = maintenanceTypes.filter(mt =>
    mt.machine_ids && mt.machine_ids.includes(machine.id) && mt.activo !== false
  );

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
    const proximaDate = new Date(plan.proxima_fecha);
    const dias = differenceInDays(proximaDate, new Date());
    if (isPast(proximaDate)) return { label: 'VENCIDO', color: 'bg-red-100 text-red-700', icon: AlertTriangle };
    if (dias <= 7) return { label: 'PRÓXIMO', color: 'bg-orange-100 text-orange-700', icon: Clock };
    return { label: 'Activo', color: 'bg-green-100 text-green-700', icon: CheckCircle };
  };

  if (plansLoading) {
    return <div className="text-center py-8 text-slate-400 text-sm">Cargando planes...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tipos de Mantenimiento Asignados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Planes de Mantenimiento
            </div>
            <Badge variant="outline">{assignedTypes.length} asignado(s)</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignedTypes.length === 0 ? (
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <AlertCircle className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <p className="text-sm text-slate-600">
                No hay planes de mantenimiento asignados. Configúralos en la sección de Tipos.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignedTypes.map((type) => {
                const tareas = getTareas(type);
                const isExpanded = expandedType === type.id;
                const relatedPlan = machinePlans.find(p => p.maintenance_type_id === type.id)
                  || machinePlans.find(p => p.nombre_plan?.toLowerCase().includes(type.nombre?.toLowerCase().split(' ')[0]));
                const planStatus = getPlanStatus(relatedPlan);
                const StatusIcon = planStatus?.icon;
                const isOverdue = relatedPlan && isPast(new Date(relatedPlan.proxima_fecha));

                return (
                  <div
                    key={type.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isOverdue
                        ? 'bg-red-50 border-red-300 dark:bg-red-900/20'
                        : 'bg-white dark:bg-slate-800 border-green-300 dark:border-green-900'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{type.nombre}</h4>
                        {type.descripcion && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{type.descripcion}</p>
                        )}
                      </div>
                      {planStatus && (
                        <Badge className={planStatus.color + ' ml-2 flex-shrink-0'}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {planStatus.label}
                        </Badge>
                      )}
                    </div>

                    {/* Info de ejecución */}
                    {relatedPlan && (
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3 bg-slate-50 dark:bg-slate-700/50 p-2 rounded">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block">Periodicidad</span>
                          <p className="font-semibold">{relatedPlan.periodicidad || '—'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block">Intervalo</span>
                          <p className="font-semibold">{relatedPlan.dias_intervalo ? `${relatedPlan.dias_intervalo}d` : '—'}</p>
                        </div>
                        {relatedPlan.ultima_ejecucion && (
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 block">Último</span>
                            <p className="font-semibold">
                              {format(new Date(relatedPlan.ultima_ejecucion), 'dd/MM/yy', { locale: es })}
                            </p>
                          </div>
                        )}
                        {relatedPlan.proxima_fecha && (
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 block">Próximo</span>
                            <p className={`font-semibold ${isOverdue ? 'text-red-600' : ''}`}>
                              {format(new Date(relatedPlan.proxima_fecha), 'dd/MM/yy', { locale: es })}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tareas */}
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {tareas.length} tarea(s)
                      </Badge>
                      {tareas.length > 0 && (
                        <button
                          onClick={() => setExpandedType(isExpanded ? null : type.id)}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {isExpanded ? <><ChevronUp className="w-3 h-3" /> Ocultar</> : <><ChevronDown className="w-3 h-3" /> Ver tareas</>}
                        </button>
                      )}
                    </div>

                    {isExpanded && tareas.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2 mb-3">
                        {tareas.map((tarea, idx) => (
                          <div key={idx} className="text-xs">
                            <div className="flex items-start gap-2">
                              <span className="text-blue-600 font-bold mt-0.5">{idx + 1}.</span>
                              <div className="flex-1">
                                <p className="font-semibold">{tarea.nombre}</p>
                                {tarea.subtareas.length > 0 && (
                                  <ul className="mt-1 space-y-0.5 pl-2">
                                    {tarea.subtareas.map((st, sidx) => (
                                      <li key={sidx} className="flex items-start gap-1 text-slate-600 dark:text-slate-400">
                                        <span className="text-slate-400">•</span>
                                        <span>{st.titulo}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              {tarea.duracion_minutos > 0 && (
                                <span className="text-slate-400 flex-shrink-0">{tarea.duracion_minutos}min</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {relatedPlan && (
                      <Button
                        onClick={() => {
                          setExecutingPlanId(relatedPlan.id);
                          executePlanMutation.mutate(relatedPlan.id);
                        }}
                        size="sm"
                        variant="outline"
                        className="w-full gap-2 text-green-600 border-green-300 hover:bg-green-50"
                        disabled={executingPlanId === relatedPlan.id}
                      >
                        <Play className="w-3 h-3" />
                        {executingPlanId === relatedPlan.id ? 'Ejecutando...' : 'Ejecutar Mantenimiento'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}