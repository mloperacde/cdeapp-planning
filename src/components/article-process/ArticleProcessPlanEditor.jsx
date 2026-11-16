import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Download, GitBranch, Layers, ListChecks, Package, Save, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import ArticleScopeSelector from './ArticleScopeSelector';
import ActivitySequenceEditor from './ActivitySequenceEditor';
import ProcessTimelinePreview from './ProcessTimelinePreview';
import PlanLinePanel from './PlanLinePanel';
import PlanSettingsPanel from './PlanSettingsPanel';
import { useArticlesCatalog, useMachinesCatalog } from './useArticleProcessCatalog';
import { exportPlanJson } from './exportPlanJson';

const BLANK = {
  nombre: '',
  codigo: '',
  descripcion: '',
  room_layout_id: '',
  room_layout_name: '',
  process_id: '',
  process_name: '',
  familias: [],
  linked_articles: [],
  hito_nombre: 'Inicio de producción',
  actividades: [],
  status: 'Borrador',
  version: 1,
  notes: '',
};

const TABS = [
  { key: 'articulos', label: 'Artículos', icon: Package },
  { key: 'actividades', label: 'Actividades', icon: ListChecks },
  { key: 'linea', label: 'Línea de envasado', icon: Layers },
  { key: 'ajustes', label: 'Configuración', icon: Settings2 },
];

export default function ArticleProcessPlanEditor({ planId, layouts = [], onBack, onSaved }) {
  const isNew = !planId;
  const qc = useQueryClient();
  const [data, setData] = useState(BLANK);
  const [loaded, setLoaded] = useState(isNew);
  const [tab, setTab] = useState('articulos');

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

  const patch = (changes) => setData(d => ({ ...d, ...changes }));

  const saveMutation = useMutation({
    mutationFn: (payload) => isNew
      ? base44.entities.ArticleProcessPlan.create(payload)
      : base44.entities.ArticleProcessPlan.update(planId, payload),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['ArticleProcessPlan'] });
      toast.success('Diagrama guardado');
      if (isNew && saved?.id) onSaved?.(saved.id);
    },
  });

  const handleSave = () => {
    if (!data.nombre.trim()) {
      toast.error('El diagrama necesita un nombre');
      return;
    }
    const payload = {
      nombre: data.nombre,
      codigo: data.codigo || '',
      descripcion: data.descripcion || '',
      room_layout_id: data.room_layout_id || '',
      room_layout_name: data.room_layout_name || '',
      process_id: data.process_id || '',
      process_name: data.process_name || '',
      familias: data.familias || [],
      linked_articles: data.linked_articles || [],
      hito_nombre: data.hito_nombre || 'Inicio de producción',
      actividades: data.actividades || [],
      status: data.status || 'Borrador',
      version: Number(data.version) || 1,
      notes: data.notes || '',
    };
    saveMutation.mutate(payload);
  };

  const layoutElements = useMemo(
    () => layouts.find(l => l.id === data.room_layout_id)?.layout_elements || [],
    [layouts, data.room_layout_id]
  );

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-400">
        Cargando diagrama...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[70vh] bg-slate-50 dark:bg-background rounded-xl border border-slate-200 dark:border-border overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-card border-b border-slate-200 dark:border-border flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 h-8">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Button>
        <Input
          value={data.nombre}
          onChange={e => patch({ nombre: e.target.value })}
          placeholder="Nombre del diagrama de proceso..."
          className="h-8 flex-1 font-semibold border-0 bg-transparent shadow-none focus-visible:ring-0 text-base"
        />
        <span className="text-xs text-slate-400 hidden sm:block">v{data.version || 1}</span>
        <Button
          size="sm" variant="outline" className="gap-1 h-8"
          onClick={() => exportPlanJson(data)}
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">JSON</span>
        </Button>
        <Button
          size="sm" onClick={handleSave} disabled={saveMutation.isPending}
          className="gap-1 h-8 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Save className="w-4 h-4" /> {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      <div className="flex gap-0 border-b border-slate-200 dark:border-border bg-white dark:bg-card px-3 flex-shrink-0 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {tab === 'articulos' && (
          <ArticleScopeSelector
            articles={articles}
            linkedArticles={data.linked_articles || []}
            familias={data.familias || []}
            onChange={patch}
          />
        )}

        {tab === 'actividades' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            <ActivitySequenceEditor
              actividades={data.actividades || []}
              layoutElements={layoutElements}
              machines={machines}
              onChange={(actividades) => patch({ actividades })}
            />
            <div className="xl:sticky xl:top-0 space-y-3">
              <ProcessTimelinePreview
                actividades={data.actividades || []}
                hitoNombre={data.hito_nombre}
              />
              <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>
                    {(data.actividades || []).length} actividades · línea: {data.room_layout_name || 'sin asignar'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'linea' && (
          <PlanLinePanel
            layouts={layouts}
            roomLayoutId={data.room_layout_id || ''}
            actividades={data.actividades || []}
            onChange={patch}
          />
        )}

        {tab === 'ajustes' && (
          <PlanSettingsPanel data={data} onChange={patch} />
        )}
      </div>
    </div>
  );
}