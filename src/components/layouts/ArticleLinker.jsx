import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, X, Search, Link2, Package } from 'lucide-react';

export default function ArticleLinker({ linkedArticles = [], onChange }) {
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const { data: articles = [] } = useQuery({
    queryKey: ['Article', 'all'],
    queryFn: () => base44.entities.Article.list(),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return articles.slice(0, 50);
    const q = search.toLowerCase();
    return articles.filter(a =>
      (a.code || '').toLowerCase().includes(q) ||
      (a.name || '').toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q)
    ).slice(0, 50);
  }, [articles, search]);

  const linkedIds = new Set(linkedArticles.map(la => la.article_id));

  const addArticle = (art) => {
    if (linkedIds.has(art.id)) return;
    onChange([...linkedArticles, {
      article_id: art.id,
      article_code: art.code || '',
      article_description: art.name || art.description || '',
      linked_date: new Date().toISOString(),
    }]);
    setSearch('');
    setShowSearch(false);
  };

  const removeArticle = (id) => {
    onChange(linkedArticles.filter(la => la.article_id !== id));
  };

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Artículos vinculados ({linkedArticles.length})
          </span>
        </div>
        <button onClick={() => setShowSearch(s => !s)}
          className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"
          title="Añadir artículo">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-[10px] text-slate-400 leading-tight">
        Define qué artículos se producen con este layout. Permite variar la configuración según el artículo.
      </p>

      {showSearch && (
        <div className="space-y-1.5 border border-slate-200 dark:border-slate-600 rounded-lg p-1.5 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-1">
            <Search className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por código o descripción..."
              className="flex-1 text-xs bg-transparent border-0 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
              autoFocus
            />
            <button onClick={() => { setShowSearch(false); setSearch(''); }}
              className="text-slate-400 hover:text-slate-600">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filtered.length === 0 && (
              <p className="text-[10px] text-slate-400 text-center py-2">No se encontraron artículos</p>
            )}
            {filtered.map(art => (
              <button key={art.id} onClick={() => addArticle(art)}
                disabled={linkedIds.has(art.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <Package className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                    {art.code || 'Sin código'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {art.name || art.description || 'Sin descripción'}
                  </p>
                </div>
                {!linkedIds.has(art.id) && <Plus className="w-3 h-3 text-blue-500 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {linkedArticles.length === 0 && !showSearch && (
          <div className="text-center py-3 border border-dashed border-slate-200 dark:border-slate-600 rounded-lg">
            <Package className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
            <p className="text-[10px] text-slate-400">Sin artículos vinculados</p>
          </div>
        )}
        {linkedArticles.map(la => (
          <div key={la.article_id}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800/30">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 truncate">
                {la.article_code || 'Sin código'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {la.article_description || 'Sin descripción'}
              </p>
            </div>
            <button onClick={() => removeArticle(la.article_id)}
              className="p-0.5 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 flex-shrink-0">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}