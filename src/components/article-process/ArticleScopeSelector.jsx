import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, X, Package, Boxes } from 'lucide-react';
import { getArticleFamily } from './useArticleProcessCatalog';

export default function ArticleScopeSelector({ articles = [], linkedArticles = [], familias = [], onChange }) {
  const [search, setSearch] = useState('');

  const familyOptions = useMemo(() => {
    const map = new Map();
    articles.forEach(a => {
      const fam = getArticleFamily(a);
      map.set(fam, (map.get(fam) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [articles]);

  const linkedIds = useMemo(() => new Set(linkedArticles.map(a => a.article_id)), [linkedArticles]);

  const effectiveCount = useMemo(() => {
    const ids = new Set(linkedIds);
    const selected = new Set(familias);
    articles.forEach(a => { if (selected.has(getArticleFamily(a))) ids.add(a.id); });
    return ids.size;
  }, [articles, familias, linkedIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles
      .filter(a => !linkedIds.has(a.id))
      .filter(a => !q
        || (a.code || '').toLowerCase().includes(q)
        || (a.name || '').toLowerCase().includes(q)
        || (a.description || '').toLowerCase().includes(q)
        || getArticleFamily(a).toLowerCase().includes(q))
      .slice(0, 60);
  }, [articles, linkedIds, search]);

  const toggleFamily = (name) => {
    onChange({
      familias: familias.includes(name) ? familias.filter(f => f !== name) : [...familias, name],
    });
  };

  const addArticle = (art) => {
    if (linkedIds.has(art.id)) return;
    onChange({
      linked_articles: [...linkedArticles, {
        article_id: art.id,
        article_code: art.code || '',
        article_name: art.name || art.description || '',
        familia: getArticleFamily(art),
        linked_date: new Date().toISOString(),
      }],
    });
    setSearch('');
  };

  const removeArticle = (id) => {
    onChange({ linked_articles: linkedArticles.filter(a => a.article_id !== id) });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Agrupación por familia</h3>
          </div>
          <Badge variant="outline" className="text-xs">{familias.length} seleccionada(s)</Badge>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Todas las referencias de una familia usan este diagrama. Se mantiene sincronizado con el catálogo de artículos.
        </p>
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
          {familyOptions.length === 0 && <p className="text-xs text-slate-400">Sin familias en el catálogo</p>}
          {familyOptions.map(fam => {
            const active = familias.includes(fam.name);
            return (
              <button
                key={fam.name}
                onClick={() => toggleFamily(fam.name)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  active
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400'
                }`}
              >
                {fam.name} <span className={active ? 'text-blue-100' : 'text-slate-400'}>({fam.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Artículos específicos</h3>
          </div>
          <Badge variant="outline" className="text-xs">{linkedArticles.length} vinculado(s)</Badge>
        </div>

        <div className="relative mb-2">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por código, nombre o familia..."
            className="h-8 text-xs pl-8"
          />
        </div>

        <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-100 dark:border-slate-800">
          {filtered.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">No hay artículos que coincidan</p>
          )}
          {filtered.map(art => (
            <button
              key={art.id}
              onClick={() => addArticle(art)}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{art.code || 'Sin código'}</p>
                <p className="text-[11px] text-slate-400 truncate">{art.name || art.description || 'Sin descripción'}</p>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 flex-shrink-0">
                {getArticleFamily(art)}
              </span>
              <Plus className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-1.5">
          {linkedArticles.map(la => (
            <div key={la.article_id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800/30">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 truncate">{la.article_code || 'Sin código'}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{la.article_name}</p>
              </div>
              <button onClick={() => removeArticle(la.article_id)} className="text-red-400 hover:text-red-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 px-3 py-2">
        <Package className="w-4 h-4 text-slate-500" />
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Este diagrama cubre <span className="font-semibold">{effectiveCount}</span> artículo(s) del catálogo.
        </p>
      </div>
    </div>
  );
}