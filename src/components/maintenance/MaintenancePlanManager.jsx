import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Play, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, Settings, Save, X, CalendarPlus } from 'lucide-react';
import { getMachineAlias } from '@/utils/machineAlias';
import { format, differenceInDays, isPast, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const PERIODICIDADES = {
  'Diaria': 1,
  'Semanal': 7,
  'Quincenal': 15,
  'Mensual': 30,
  'Trimestral': 90,
  'Semestral': 180,
  'Anual': 365,
};

export default function MaintenancePlanManager({ machine }) {
  const [expandedType, setExpandedType] = useState(null);
  const [executingPlanId, setExecutingPlanId] = useState(null);
  const [configuringTypeId, setConfiguringTypeId] = useState(null);
  const [configForm, setConfigForm] = useState({});
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

  // Invalida todos los queries relevantes para sincronizar todas las pestañas
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
    queryClient.invalidateQueries({ queryKey: ['maintenance-types'] });
    queryClient.invalidateQueries({ queryKey: ['maintenances'] });
    queryClient.invalidateQueries({ queryKey: ['machine-plans-calendar'] });
    queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] });
  };

  // Ejecución INMEDIATA → crea orden "En Proceso"
  const executePlanMutation = useMutation({
    mutationFn: (plan_id) => base44.functions.invoke('triggerMaintenanceExecution', { plan_id, immediate: true }),
    onSuccess: (res) => {
      invalidateAll();
      setExecutingPlanId(null);
      toast.success('Mantenimiento iniciado', { description: 'Orden de trabajo creada con estado "En Proceso"' });
    },
    onError: (err) => {
      setExecutingPlanId(null);
      toast.error('Error al ejecutar mantenimiento');
    },
  });

  // Programación FUTURA → crea orden "Programado" usando la proxima_fecha
  const schedulePlanMutation = useMutation({
    mutationFn: (plan_id) => base44.functions.invoke('triggerMaintenanceExecution', { plan_id, immediate: false }),
    onSuccess: () => {
      invalidateAll();
      toast.success('Orden programada', { description: 'Se ha generado una orden de trabajo pendiente' });
    },
    onError: () => toast.error('Error al programar orden'),
  });

  const savePlanConfigMutation = useMutation({
    mutationFn: async ({ type, relatedPlan, form }) => {
      const diasIntervalo = PERIODICIDADES[form.periodicidad] || parseInt(form.dias_intervalo) || 30;
      const ultimaEjecucion = form.ultima_ejecucion ? new Date(form.ultima_ejecucion) : new Date();
      const proximaFecha = addDays(ultimaEjecucion, diasIntervalo);
      const data = {
        periodicidad: form.periodicidad,
        dias_intervalo: diasIntervalo,
        ultima_ejecucion: ultimaEjecucion.toISOString(),
        proxima_fecha: proximaFecha.toISOString().split('T')[0],
      };
      if (relatedPlan) {
        return base44.entities.MaintenancePlan.update(relatedPlan.id, data);
      } else {
        return base44.entities.MaintenancePlan.create({
          maintenance_type_id: type.id,
          machine_id: machine.id,
          machine_name: machine.nombre || getMachineAlias(machine),
          nombre_plan: type.nombre,
          tipo: 'Preventivo',
          activo: true,
          ...data,
        });
      }
    },
    onSuccess: () => {
      invalidateAll();
      setConfiguringTypeId(null);
      setConfigForm({});
      toast.success('Configuración guardada', { description: 'El calendario y todas las secciones han sido actualizados' });
    },
    onError: () => toast.error('Error al guardar configuración'),
  });

  const openConfig = (type, relatedPlan) => {
    setConfiguringTypeId(type.id);
    setConfigForm({
      periodicidad: relatedPlan?.periodicidad || 'Mensual',
      dias_intervalo: relatedPlan?.dias_intervalo || 30,
      ultima_ejecucion: relatedPlan?.ultima_ejecucion
        ? new Date(relatedPlan.ultima_ejecucion).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    });
  };

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
            // Buscar plan relacionado: primero por maintenance_type_id, luego por nombre
            const relatedPlan = machinePlans.find(p => p.maintenance_type_id === type.id)
              || machinePlans.find(p => p.nombre_plan?.toLowerCase().includes(type.nombre?.toLowerCase().split(' ')[0]));
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
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {planStatus && (
                          <Badge className={planStatus.color + ' text-xs'}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {planStatus.label}
                          </Badge>
                        )}
                        <button
                          onClick={() => configuringTypeId === type.id ? setConfiguringTypeId(null) : openConfig(type, relatedPlan)}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700"
                          title="Configurar periodicidad"
                        >
                          {configuringTypeId === type.id ? <X className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Panel de configuración */}
                    {configuringTypeId === type.id && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-3">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Configurar plan de mantenimiento</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Periodicidad</Label>
                            <Select
                              value={configForm.periodicidad}
                              onValueChange={(v) => setConfigForm(f => ({
                                ...f,
                                periodicidad: v,
                                dias_intervalo: PERIODICIDADES[v] || f.dias_intervalo
                              }))}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.keys(PERIODICIDADES).map(p => (
                                  <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Intervalo (días)</Label>
                            <Input
                              type="number"
                              min="1"
                              className="h-7 text-xs"
                              value={configForm.dias_intervalo}
                              onChange={(e) => setConfigForm(f => ({ ...f, dias_intervalo: parseInt(e.target.value) || 30 }))}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Fecha última intervención</Label>
                          <Input
                            type="date"
                            className="h-7 text-xs"
                            value={configForm.ultima_ejecucion}
                            onChange={(e) => setConfigForm(f => ({ ...f, ultima_ejecucion: e.target.value }))}
                          />
                        </div>
                        <Button
                          size="sm"
                          className="w-full h-7 text-xs gap-1"
                          onClick={() => savePlanConfigMutation.mutate({ type, relatedPlan, form: configForm })}
                          disabled={savePlanConfigMutation.isPending}
                        >
                          <Save className="w-3 h-3" />
                          {savePlanConfigMutation.isPending ? 'Guardando...' : 'Guardar configuración'}
                        </Button>
                      </div>
                    )}

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

                    {/* Acciones si hay plan */}
                    {relatedPlan && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setExecutingPlanId(relatedPlan.id);
                            executePlanMutation.mutate(relatedPlan.id);
                          }}
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1.5 h-8 text-xs text-green-700 border-green-300 hover:bg-green-50"
                          disabled={executingPlanId === relatedPlan.id || executePlanMutation.isPending}
                          title="Ejecutar ahora: crea orden de trabajo inmediata"
                        >
                          <Play className="w-3 h-3" />
                          {executingPlanId === relatedPlan.id ? 'Ejecutando...' : 'Ejecutar ahora'}
                        </Button>
                        <Button
                          onClick={() => schedulePlanMutation.mutate(relatedPlan.id)}
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1.5 h-8 text-xs text-blue-700 border-blue-300 hover:bg-blue-50"
                          disabled={schedulePlanMutation.isPending}
                          title="Programar: crea orden pendiente para la fecha prevista"
                        >
                          <CalendarPlus className="w-3 h-3" />
                          {schedulePlanMutation.isPending ? 'Programando...' : 'Programar'}
                        </Button>
                      </div>
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