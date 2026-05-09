import { useCallback, useMemo, useState } from 'react';

/**
 * Hook para virtualización y filtrado de listas grandes (500+ registros)
 * Combina búsqueda, paginación virtual y ordenamiento
 */
export function useVirtualList(items = [], options = {}) {
  const {
    searchFields = [],
    initialPageSize = 50,
    sortKey = null,
    sortDir = 'asc',
  } = options;

  const [search, setSearch] = useState('');
  const [pageSize] = useState(initialPageSize);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState({ key: sortKey, dir: sortDir });

  const filtered = useMemo(() => {
    let result = items;

    if (search.trim() && searchFields.length > 0) {
      const q = search.toLowerCase();
      result = result.filter(item =>
        searchFields.some(field => {
          const val = item[field];
          return val && String(val).toLowerCase().includes(q);
        })
      );
    }

    if (sort.key) {
      result = [...result].sort((a, b) => {
        const av = a[sort.key] ?? '';
        const bv = b[sort.key] ?? '';
        const cmp = String(av).localeCompare(String(bv), 'es', { numeric: true });
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [items, search, searchFields, sort]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize]
  );

  const toggleSort = useCallback((key) => {
    setSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
    setPage(0);
  }, []);

  const handleSearch = useCallback((val) => {
    setSearch(val);
    setPage(0);
  }, []);

  return {
    search,
    setSearch: handleSearch,
    filtered,
    paginated,
    page,
    setPage,
    totalPages,
    pageSize,
    totalCount: filtered.length,
    originalCount: items.length,
    sort,
    toggleSort,
  };
}