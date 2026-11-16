import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GitBranch, Plus, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ArticleProcessPlanCard from './ArticleProcessPlanCard';
import ArticleProcessPlanEditor from './ArticleProcessPlanEditor';
import { useArticlesCatalog, getArticleFamily } from './useArticleProcessCatalog';
import { exportPlanJson } from './exportPlanJson';

const PLAN_FIELDS = [
  'nombre', 'codigo', 'descripcion', 'room_layout_id', 'room_layout_name',
  'process_id', 'process_name', 'familias', 'linked_articles', 'hito_nombre',
  'actividades', 'status', 'version', 'notes',
];

function pickFields(plan) {
  return PLAN_FIELDS.reduce((acc, key) => {
    acc[key] = plan[key];
    return acc;
  }, {});
}

export default function ArticleProcessPlansModule({ layouts = [] }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [lineFilter, setLineFilter] = useState('all');
  const [familyFilter, setFamilyFilter] = useState('all');

  const { data: articles = [] } = useArticlesCatalog();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['ArticleProcessPlan'],
    queryFn: () => base44.entities.ArticleProcessPlan.list('-updated_date'),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => base44.entities.ArticleProcessPlan.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ArticleProcessPlan'] });
      toast.success('Diagrama duplicado');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ArticleProcessPlan.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ArticleProcessPlan'] });
      toast.success('Diagrama eliminado');
    },
  });

  const articleCount = (plan) => {
    const ids = new Set((plan.linked_articles || []).map(a => a.article_id));
    const families = new Set(plan.familias || []);
    if (families.size) {
      articles.forEach(a => { if (families.has(getArticleFamily(a))) ids.add(a.id); });
    }
    return ids.size;
  };

  const familyOptions = useMemo(() => {
    const set = new Set();
    plans.forEach(p => (p.familias || []).forEach(f => set.add(f)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [plans]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plans.filter(plan => {
      const matchesSearch = !q
        || (plan.nombre || '').toLowerCase().includes(q)
        || (plan.codigo || '').toLowerCase().includes(q)
        || (plan.room_layout_name || '').toLowerCase().includes(q)
        || (plan.linked_articles || []).some(a => (a.article_code || '').toLowerCase().includes(q));
      const matchesLine = lineFilter === 'all' || plan.room_layout_id === lineFilter;
      const matchesFamily = familyFilter === 'all' || (plan.familias || []).includes(familyFilter);
      return matchesSearch && matchesLine && matchesFamily;
    });
  }, [plans, search, lineFilter, familyFilter]);

  if (editing !== null) {
    return (
      <ArticleProcessPlanEditor
        key={editing}
        planId={editing === 'new' ? null : editing}
        layouts={layouts}
        onBack={() => setEditing(null)}
        onSaved={(id) => setEditing(id)}
      />
    );
  }

  const handleDuplicate = (plan) => {
    createMutation.mutate({
      ...pickFields(plan),
      nombre: `${plan.nombre} (copia)`,
      status: 'Borrador',
      version: 1,
    });
  };

  const handleDelete = (plan) => {
    if (window.confirm(`¿Eliminar el diagrama "${plan.nombre}"?`)) {
      deleteMutation.mutate(plan.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Diagramas de proceso por artículo</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Un diagrama por artículo o familia según la línea de envasado. Guardado en la base de datos y visible desde cualquier dispositivo.
          </p>
        </div>
        <Button onClick={() => setEditing('new')} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white h-9">
          <Plus className="w-4 h-4" /> Nuevo diagrama
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, código, línea o artículo..."
            className="h-9 text-sm pl-8"
          />
        </div>
        <select
          value={lineFilter}
          onChange={e => setLineFilter(e.target.value)}
          className="h-9 text-sm border border-input rounded-md px-3 bg-background min-w-[200px]"
        >
          <option value="all">Todas las líneas</option>
          {layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select
          value={familyFilter}
          onChange={e => setFamilyFilter(e.target.value)}
          className="h-9 text-sm border border-input rounded-md px-3 bg-background min-w-[180px]"
        >
          <option value="all">Todas las familias</option>
          {familyOptions.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando diagramas...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 border border-dashed border-slate-200 dark:border-border rounded-xl">
          <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-sm">No hay diagramas de proceso por artículo</p>
          <p className="text-xs mt-1">
            {plans.length === 0
              ? 'Crea el primer diagrama y asígnalo a una línea de envasado'
              : 'Ningún diagrama coincide con los filtros aplicados'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(plan => (
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
    </div>
  );
}