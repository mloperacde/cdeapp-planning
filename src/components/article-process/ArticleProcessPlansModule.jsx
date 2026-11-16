import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarClock, LayoutTemplate, Loader2, Plus, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';
import ArticleProcessPlanCard from './ArticleProcessPlanCard';
import ArticleProcessPlanEditor from './ArticleProcessPlanEditor';
import OrderScheduleDialog from './OrderScheduleDialog';
import { useArticlesCatalog, getArticleFamily } from './useArticleProcessCatalog';
import { exportPlanJson, parsePlanJson } from './plannerJson';
import { activityId } from './plannerTime';

const PLAN_FIELDS = [
  'tipo', 'nombre', 'codigo', 'descripcion', 'room_layout_id', 'room_layout_name',
  'process_id', 'process_name', 'order_reference', 'product_name', 'quantity',
  'hito_fecha', 'source_plan_id', 'source_plan_name', 'familias', 'linked_articles',
  'hito_nombre', 'actividades', 'status', 'version', 'notes',
];

const MODES = [
  { key: 'plantillas', label: 'Plantillas', icon: LayoutTemplate },
  { key: 'ordenes', label: 'Órdenes', icon: CalendarClock },
];

function pickFields(plan) {
  return PLAN_FIELDS.reduce((acc, key) => {
    acc[key] = plan[key];
    return acc;
  }, {});
}

export default function ArticleProcessPlansModule({ layouts = [] }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState('plantillas');
  const [editing, setEditing] = useState(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [lineFilter, setLineFilter] = useState('all');
  const [familyFilter, setFamilyFilter] = useState('all');
  const fileRef = useRef(null);

  const { data: articles = [] } = useArticlesCatalog();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['ArticleProcessPlan'],
    queryFn: () => base44.entities.ArticleProcessPlan.list('-updated_date'),
  });

  const templates = useMemo(
    () => plans.filter((p) => (p.tipo || 'Plantilla') === 'Plantilla'),
    [plans]
  );
  const orders = useMemo(() => plans.filter((p) => p.tipo === 'Orden'), [plans]);
  const list = mode === 'ordenes' ? orders : templates;

  const duplicateMutation = useMutation({
    mutationFn: (payload) => base44.entities.ArticleProcessPlan.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ArticleProcessPlan'] });
      toast.success('Plan duplicado');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ArticleProcessPlan.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ArticleProcessPlan'] });
      toast.success('Plan eliminado');
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: (form) => {
      const template = templates.find((t) => t.id === form.source_plan_id);
      return base44.entities.ArticleProcessPlan.create({
        tipo: 'Orden',
        nombre: `${form.order_reference}${form.product_name ? ` · ${form.product_name}` : ''}`,
        codigo: form.order_reference,
        order_reference: form.order_reference,
        product_name: form.product_name || '',
        quantity: Number(form.quantity) || 0,
        hito_fecha: form.hito_fecha ? new Date(form.hito_fecha).toISOString() : '',
        room_layout_id: template?.room_layout_id || '',
        room_layout_name: template?.room_layout_name || '',
        source_plan_id: template?.id || '',
        source_plan_name: template?.nombre || '',
        process_id: template?.process_id || '',
        process_name: template?.process_name || '',
        familias: template?.familias || [],
        linked_articles: template?.linked_articles || [],
        hito_nombre: template?.hito_nombre || 'Inicio de producción',
        actividades: (template?.actividades || []).map((a, i) => ({ ...a, id: activityId(), orden: i + 1 })),
        status: 'Borrador',
        version: 1,
        notes: '',
      });
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['ArticleProcessPlan'] });
      toast.success('Cronograma creado');
      setOrderOpen(false);
      setMode('ordenes');
      if (created?.id) setEditing(created.id);
    },
  });

  const articleCount = (plan) => {
    const ids = new Set((plan.linked_articles || []).map((a) => a.article_id));
    const families = new Set(plan.familias || []);
    if (families.size) {
      articles.forEach((a) => {
        if (families.has(getArticleFamily(a))) ids.add(a.id);
      });
    }
    return ids.size;
  };

  const familyOptions = useMemo(() => {
    const set = new Set();
    list.forEach((p) => (p.familias || []).forEach((f) => set.add(f)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((plan) => {
      const matchesSearch = !q
        || (plan.nombre || '').toLowerCase().includes(q)
        || (plan.codigo || '').toLowerCase().includes(q)
        || (plan.order_reference || '').toLowerCase().includes(q)
        || (plan.product_name || '').toLowerCase().includes(q)
        || (plan.room_layout_name || '').toLowerCase().includes(q)
        || (plan.linked_articles || []).some((a) => (a.article_code || '').toLowerCase().includes(q));
      const matchesLine = lineFilter === 'all' || plan.room_layout_id === lineFilter;
      const matchesFamily = familyFilter === 'all' || (plan.familias || []).includes(familyFilter);
      return matchesSearch && matchesLine && matchesFamily;
    });
  }, [list, search, lineFilter, familyFilter]);

  const handleDuplicate = (plan) => {
    duplicateMutation.mutate({
      ...pickFields(plan),
      nombre: `${plan.nombre} (copia)`,
      order_reference: plan.tipo === 'Orden' ? `${plan.order_reference} (copia)` : plan.order_reference,
      status: 'Borrador',
      version: 1,
    });
  };

  const handleDelete = (plan) => {
    if (window.confirm(`¿Eliminar «${plan.nombre}»?`)) deleteMutation.mutate(plan.id);
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = parsePlanJson(JSON.parse(await file.text()));
      if (payload.room_layout_name) {
        const match = layouts.find((l) => l.name === payload.room_layout_name);
        if (match) {
          payload.room_layout_id = match.id;
        }
      }
      const created = await base44.entities.ArticleProcessPlan.create(payload);
      qc.invalidateQueries({ queryKey: ['ArticleProcessPlan'] });
      toast.success('Plan importado');
      setMode(payload.tipo === 'Orden' ? 'ordenes' : 'plantillas');
      setEditing(created.id);
    } catch (error) {
      toast.error(error?.message || 'No se pudo importar el archivo JSON');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (editing !== null) {
    return (
      <ArticleProcessPlanEditor
        key={editing}
        planId={editing === 'new' ? null : editing}
        layouts={layouts}
        templates={templates}
        onBack={() => setEditing(null)}
        onSaved={(id) => setEditing(id)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Planificador de envasado
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Plantillas por artículo o familia y cronogramas de órdenes relativos al hito de inicio de producción.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImport} className="hidden" />
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4" /> Importar
          </Button>
          {mode === 'ordenes' ? (
            <Button onClick={() => setOrderOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white h-9">
              <Plus className="w-4 h-4" /> Nueva orden
            </Button>
          ) : (
            <Button onClick={() => setEditing('new')} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white h-9">
              <Plus className="w-4 h-4" /> Nueva plantilla
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-border overflow-x-auto">
        {MODES.map((m) => {
          const Icon = m.icon;
          const count = m.key === 'ordenes' ? orders.length : templates.length;
          return (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                mode === m.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {m.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={mode === 'ordenes' ? 'Buscar por OT, producto o línea...' : 'Buscar por nombre, código, línea o artículo...'}
            className="h-9 text-sm pl-8"
          />
        </div>
        <select
          value={lineFilter}
          onChange={(e) => setLineFilter(e.target.value)}
          className="h-9 text-sm border border-input rounded-md px-3 bg-background min-w-[180px]"
        >
          <option value="all">Todas las líneas</option>
          {layouts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        {mode === 'plantillas' && (
          <select
            value={familyFilter}
            onChange={(e) => setFamilyFilter(e.target.value)}
            className="h-9 text-sm border border-input rounded-md px-3 bg-background min-w-[170px]"
          >
            <option value="all">Todas las familias</option>
            {familyOptions.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando planes...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 border border-dashed border-slate-200 dark:border-border rounded-xl">
          {mode === 'ordenes'
            ? <CalendarClock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            : <LayoutTemplate className="w-10 h-10 mx-auto mb-3 opacity-30" />}
          <p className="font-medium text-sm">
            {mode === 'ordenes' ? 'No hay cronogramas de órdenes' : 'No hay plantillas de proceso'}
          </p>
          <p className="text-xs mt-1">
            {list.length === 0
              ? mode === 'ordenes'
                ? 'Crea una orden indicando OT, producto, cantidad y fecha de inicio'
                : 'Crea la primera plantilla y asígnala a una línea de envasado'
              : 'Ningún plan coincide con los filtros aplicados'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((plan) => (
            <ArticleProcessPlanCard
              key={plan.id}
              plan={plan}
              articleCount={articleCount(plan)}
              onEdit={() => setEditing(plan.id)}
              onDuplicate={() => handleDuplicate(plan)}
              onDelete={() => handleDelete(plan)}
              onExport={() => exportPlanJson(plan)}
            />
          ))}
        </div>
      )}

      <OrderScheduleDialog
        open={orderOpen}
        onOpenChange={setOrderOpen}
        templates={templates}
        onCreate={(form) => createOrderMutation.mutate(form)}
        isPending={createOrderMutation.isPending}
      />
    </div>
  );
}