import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import PlannerHeader from './PlannerHeader';
import PlanningTimeline from './PlanningTimeline';
import ActivityInspector from './ActivityInspector';
import LineStations3D from './LineStations3D';
import ArticleScopeSelector from './ArticleScopeSelector';
import PlanSettingsPanel from './PlanSettingsPanel';
import { useArticlesCatalog, useMachinesCatalog } from './useArticleProcessCatalog';
import { exportPlanJson } from './plannerJson';
import { activityId } from './plannerTime';

const BLANK = {
  tipo: 'Plantilla',
  nombre: '',
  codigo: '',
  descripcion: '',
  room_layout_id: '',
  room_layout_name: '',
  process_id: '',
  process_name: '',
  order_reference: '',
  product_name: '',
  quantity: 0,
  hito_fecha: '',
  source_plan_id: '',
  source_plan_name: '',
  familias: [],
  linked_articles: [],
  hito_nombre: 'Inicio de producción',
  actividades: [],
  status: 'Borrador',
  version: 1,
  notes: '',
};

const toIso = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
};

export default function ArticleProcessPlanEditor({
  planId,
  layouts = [],
  templates = [],
  onBack,
  onSaved,
}) {
  const isNew = !planId;
  const qc = useQueryClient();
  const [data, setData] = useState(BLANK);
  const [loaded, setLoaded] = useState(isNew);
  const [tab, setTab] = useState('cronograma');
  const [selectedId, setSelectedId] = useState(null);
  const [templateId, setTemplateId] = useState('');

  const { data: articles = [] } = useArticlesCatalog();
  const { data: machines = [] } = useMachinesCatalog();

  const { data: existing } = useQuery({
    queryKey: ['ArticleProcessPlan', planId],
    queryFn: () => base44.entities.ArticleProcessPlan.filter({ id: planId }),
    enabled: !isNew,
  });

  useEffect(() => {
    if (!isNew && existing?.[0] && !loaded) {
      setData({ ...BLANK, ...existing[0] });
      setLoaded(true);
    }
  }, [existing, isNew, loaded]);

  const patch = (changes) => setData((d) => ({ ...d, ...changes }));

  const actividades = data.actividades || [];
  const layout = useMemo(
    () => layouts.find((l) => l.id === data.room_layout_id),
    [layouts, data.room_layout_id]
  );
  const layoutElements = layout?.layout_elements || [];

  useEffect(() => {
    if (actividades.length && !actividades.some((a) => a.id === selectedId)) {
      setSelectedId(actividades[0].id);
    }
    if (!actividades.length && selectedId) setSelectedId(null);
  }, [actividades, selectedId]);

  const selectedIndex = actividades.findIndex((a) => a.id === selectedId);
  const selected = selectedIndex >= 0 ? actividades[selectedIndex] : null;

  const setActividades = (list) => patch({ actividades: list.map((a, i) => ({ ...a, orden: i + 1 })) });

  const updateActivity = (id, changes) => {
    setActividades(actividades.map((a) => (a.id === id ? { ...a, ...changes } : a)));
  };

  const addActivity = () => {
    const activity = {
      id: activityId(),
      orden: actividades.length + 1,
      nombre: '',
      tipo: 'Proceso',
      kind: 'process',
      fase: 'Producción',
      unidad: 'Minutos',
      estacion_element_id: '',
      estacion_nombre: '',
      maquina_id: '',
      maquina_nombre: '',
      duracion_minutos: 30,
      offset_minutos: 0,
      responsable: '',
      notas: '',
    };
    setActividades([...actividades, activity]);
    setSelectedId(activity.id);
  };

  const duplicateActivity = (id) => {
    const index = actividades.findIndex((a) => a.id === id);
    if (index < 0) return;
    const copy = { ...actividades[index], id: activityId() };
    const next = [...actividades];
    next.splice(index + 1, 0, copy);
    setActividades(next);
    setSelectedId(copy.id);
  };

  const removeActivity = (id) => {
    const index = actividades.findIndex((a) => a.id === id);
    if (index < 0) return;
    const next = actividades.filter((a) => a.id !== id);
    setActividades(next);
    setSelectedId(next[Math.min(index, next.length - 1)]?.id || null);
  };

  const moveActivity = (id, direction) => {
    const index = actividades.findIndex((a) => a.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= actividades.length) return;
    const next = [...actividades];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setActividades(next);
  };

  const applyTemplate = () => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) {
      toast.error('Selecciona una plantilla');
      return;
    }
    const copied = (template.actividades || []).map((a) => ({ ...a, id: activityId() }));
    patch({
      actividades: copied.map((a, i) => ({ ...a, orden: i + 1 })),
      room_layout_id: data.room_layout_id || template.room_layout_id || '',
      room_layout_name: data.room_layout_name || template.room_layout_name || '',
      process_id: data.process_id || template.process_id || '',
      process_name: data.process_name || template.process_name || '',
      hito_nombre: template.hito_nombre || data.hito_nombre,
      source_plan_id: template.id,
      source_plan_name: template.nombre,
    });
    setSelectedId(copied[0]?.id || null);
    toast.success(`Plantilla «${template.nombre}» aplicada`);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      isNew
        ? base44.entities.ArticleProcessPlan.create(payload)
        : base44.entities.ArticleProcessPlan.update(planId, payload),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['ArticleProcessPlan'] });
      toast.success('Plan guardado');
      if (isNew && saved?.id) onSaved?.(saved.id);
    },
  });

  const handleSave = () => {
    if (!data.nombre.trim()) {
      toast.error(data.tipo === 'Orden' ? 'Indica la referencia de la orden' : 'La plantilla necesita un nombre');
      return;
    }
    saveMutation.mutate({
      tipo: data.tipo || 'Plantilla',
      nombre: data.nombre,
      codigo: data.codigo || '',
      descripcion: data.descripcion || '',
      room_layout_id: data.room_layout_id || '',
      room_layout_name: data.room_layout_name || '',
      process_id: data.process_id || '',
      process_name: data.process_name || '',
      order_reference: data.order_reference || '',
      product_name: data.product_name || '',
      quantity: Number(data.quantity) || 0,
      hito_fecha: toIso(data.hito_fecha),
      source_plan_id: data.source_plan_id || '',
      source_plan_name: data.source_plan_name || '',
      familias: data.familias || [],
      linked_articles: data.linked_articles || [],
      hito_nombre: data.hito_nombre || 'Inicio de producción',
      actividades: actividades.map((a, i) => ({ ...a, orden: i + 1 })),
      status: data.status || 'Borrador',
      version: Number(data.version) || 1,
      notes: data.notes || '',
    });
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-400">
        Cargando plan...
      </div>
    );
  }

  const plannerColumns = (primary, secondary) => (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-3 items-start">
      <div className="space-y-3 min-w-0">
        {primary}
        {secondary}
      </div>
      <div className="xl:sticky xl:top-0 min-w-0">
        <ActivityInspector
          activity={selected}
          index={selectedIndex}
          total={actividades.length}
          hitoFecha={data.hito_fecha}
          machines={machines}
          layoutElements={layoutElements}
          onChange={(changes) => updateActivity(selectedId, changes)}
          onDuplicate={() => duplicateActivity(selectedId)}
          onDelete={() => removeActivity(selectedId)}
          onMove={(dir) => moveActivity(selectedId, dir)}
          onAdd={addActivity}
        />
      </div>
    </div>
  );

  const timeline = (
    <PlanningTimeline
      actividades={actividades}
      hitoFecha={data.hito_fecha}
      hitoNombre={data.hito_nombre || 'Inicio de producción'}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onAdd={addActivity}
    />
  );

  const linePanel = (
    <LineStations3D
      layout={layout}
      actividades={actividades}
      selectedId={selectedId}
      onSelectActivity={setSelectedId}
    />
  );

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-background overflow-hidden">
      <PlannerHeader
        data={data}
        patch={patch}
        layouts={layouts}
        tab={tab}
        setTab={setTab}
        saving={saveMutation.isPending}
        onBack={onBack}
        onSave={handleSave}
        onExport={() => exportPlanJson({ ...data, actividades })}
      />

      <div className="p-3">
        {tab === 'cronograma' && plannerColumns(timeline, linePanel)}

        {tab === 'linea' && plannerColumns(linePanel, timeline)}

        {tab === 'articulos' && (
          <ArticleScopeSelector
            articles={articles}
            linkedArticles={data.linked_articles || []}
            familias={data.familias || []}
            onChange={patch}
          />
        )}

        {tab === 'ajustes' && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-3 items-start">
            <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-3">
              <PlanSettingsPanel data={data} onChange={patch} />
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-3 space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Aplicar plantilla
              </h3>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full h-8 text-xs border border-input rounded-md px-2 bg-background text-foreground"
              >
                <option value="">Selecciona una plantilla</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs"
                onClick={applyTemplate}
                disabled={!templateId}
              >
                Copiar actividades
              </Button>
              <p className="text-[10px] text-slate-400">
                Sustituye las actividades actuales por las de la plantilla.
              </p>
              {data.source_plan_name && (
                <p className="text-[10px] text-slate-500">
                  Origen: {data.source_plan_name}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}