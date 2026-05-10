import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Play, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { getMachineAlias } from '@/utils/machineAlias';
import { format, differenceInDays, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MaintenancePlanManager({ machine }) {
  const [expandedType, setExpandedType] = useState(null);
  const [executingPlanId, setExecutingPlanId] = useState(null);
  const queryClient = useQueryClient();

  const { data: maintenanceTypes = [] } = useQuery({
    queryKey: ['maintenance-types'],
    queryFn: () => base44.entities.MaintenanceType.list(),
    staleTime: 10 * 60 * 1000,
  });

  // Planes para obtener datos de última/próxima ejecución
  const { data: allPlans = [] } = useQuery({
    queryKey: ['maintenance-plans'],
    queryFn: () => base44.entities.MaintenancePlan.list(undefined, 200),
    staleTime: 5 * 60 * 1000,
  });

  const executePlanMutation = useMutation({
    mutationFn: (plan_id) => base44.functions.invoke('triggerMaintenanceExecution', { plan_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
      setExecutingPlanId(null);
    },
  });

  if (!machine) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Selecciona una máquina para ver sus planes
      </div>
    );
  }

  // Tipos de mantenimiento asignados a esta máquina
  const assignedTypes = maintenanceTypes.filter(mt =>
    mt.machine_ids && mt.machine_ids.includes(machine.id) && mt.activo !== false
  );

  // Planes actuales de esta máquina (para info de ejecución)
  const machinePlans = allPlans.filter(p => p.machine_id === machine.id);

  // Obtener tareas válidas de un tipo
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

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Cabecera */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
        <h3 className="font-semibold text-sm">{getMachineAlias(machine)}</h3>
        <p className="text-xs text-slate-500">
          {assignedTypes.length} plan(es) de mantenimiento asignado(s)
        </p>
      </div>

      {/* Lista de tipos de mantenimiento asignados */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {assignedTypes.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">Sin planes asignados</p>
            <p className="text-xs mt-1">Asigna tipos de mantenimiento en el gestor de Tipos</p>
          </div>
        ) : (
          assignedTypes.map((type) => {
            const tareas = getTareas(type);
            const isExpanded = expandedType === type.id;
            // Buscar plan relacionado (por nombre del tipo)
            const relatedPlan = machinePlans.find(p =>
              p.nombre_plan?.toLowerCase().includes(type.nombre?.toLowerCase().split(' ')[0])
            ) || machinePlans[0];
            const planStatus = getPlanStatus(relatedPlan);
            const StatusIcon = planStatus?.icon;

            return (
              <Card key={type.id} className="border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Cabecera del tipo */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{type.nombre}</h4>
                        {type.descripcion && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{type.descripcion}</p>
                        )}
                      </div>
                      {planStatus && (
                        <Badge className={planStatus.color + ' text-xs flex-shrink-0'}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {planStatus.label}
                        </Badge>
                      )}
                    </div>

                    {/* Info de ejecución si hay plan relacionado */}
                    {relatedPlan && (
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 rounded p-2">
                        <div>
                          <p className="text-slate-500">Periodicidad</p>
                          <p className="font-medium">{relatedPlan.periodicidad || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Intervalo</p>
                          <p className="font-medium">{relatedPlan.dias_intervalo ? `${relatedPlan.dias_intervalo}d` : '—'}</p>
                        </div>
                        {relatedPlan.ultima_ejecucion && (
                          <div>
                            <p className="text-slate-500">Último</p>
                            <p className="font-medium">
                              {format(new Date(relatedPlan.ultima_ejecucion), 'dd/MM/yy', { locale: es })}
                            </p>
                          </div>
                        )}
                        {relatedPlan.proxima_fecha && (
                          <div>
                            <p className="text-slate-500">Próximo</p>
                            <p className={`font-medium ${isPast(new Date(relatedPlan.proxima_fecha)) ? 'text-red-600' : ''}`}>
                              {format(new Date(relatedPlan.proxima_fecha), 'dd/MM/yy', { locale: es })}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Resumen de tareas */}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {tareas.length} tarea(s)
                      </Badge>
                      {tareas.length > 0 && (
                        <button
                          onClick={() => setExpandedType(isExpanded ? null : type.id)}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {isExpanded ? (
                            <><ChevronUp className="w-3 h-3" /> Ocultar</>
                          ) : (
                            <><ChevronDown className="w-3 h-3" /> Ver tareas</>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Tareas expandidas */}
                    {isExpanded && tareas.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        {tareas.map((tarea, idx) => (
                          <div key={idx} className="text-xs">
                            <div className="flex items-start gap-2">
                              <span className="text-blue-600 font-bold mt-0.5">{idx + 1}.</span>
                              <div className="flex-1">
                                <p className="font-semibold">{tarea.nombre}</p>
                                {tarea.observaciones && (
                                  <p className="text-slate-500 mt-0.5">{tarea.observaciones}</p>
                                )}
                                {tarea.subtareas.length > 0 && (
                                  <ul className="mt-1 space-y-0.5 pl-2">
                                    {tarea.subtareas.map((st, sidx) => (
                                      <li key={sidx} className="flex items-start gap-1 text-slate-600 dark:text-slate-400">
                                        <span className="text-slate-400">•</span>
                                        <span>{st.titulo}</span>
                                        {st.herramientas && (
                                          <span className="text-slate-400 ml-1">({st.herramientas})</span>
                                        )}
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

                    {/* Ejecutar si hay plan */}
                    {relatedPlan && (
                      <Button
                        onClick={() => {
                          setExecutingPlanId(relatedPlan.id);
                          executePlanMutation.mutate(relatedPlan.id);
                        }}
                        size="sm"
                        variant="outline"
                        className="w-full gap-2 h-8 text-green-600 border-green-300 hover:bg-green-50"
                        disabled={executingPlanId === relatedPlan.id}
                      >
                        <Play className="w-3 h-3" />
                        {executingPlanId === relatedPlan.id ? 'Ejecutando...' : 'Ejecutar Mantenimiento'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}