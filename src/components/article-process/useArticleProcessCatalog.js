import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getMachineAlias } from '@/utils/machineAlias';

export function useArticlesCatalog() {
  return useQuery({
    queryKey: ['Article', 'catalog', 'article-process'],
    queryFn: async () => {
      const PAGE = 5000;
      let all = [];
      let skip = 0;
      let batch;
      do {
        batch = await base44.entities.Article.list('code', PAGE, skip);
        all = all.concat(batch || []);
        skip += PAGE;
      } while (batch && batch.length === PAGE);
      return all;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMachinesCatalog() {
  return useQuery({
    queryKey: ['MachineMasterDatabase', 'catalog', 'article-process'],
    queryFn: async () => {
      const list = await base44.entities.MachineMasterDatabase.list(undefined, 500);
      return (list || [])
        .map(m => ({ id: m.id, nombre: getMachineAlias(m) }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function getArticleFamily(article) {
  return (article?.type || '').trim() || 'Sin familia';
}